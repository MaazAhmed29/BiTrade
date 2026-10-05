const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

function skip(name, detail = "") {
  skipped += 1;
  console.log(`SKIP  ${name}${detail ? ` (${detail})` : ""}`);
}

function isPositiveNumber(value) {
  return (
    typeof value === "string" && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0
  );
}

function isSignedNumber(value) {
  return typeof value === "string" && value !== "" && Number.isFinite(Number(value));
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, headers: response.headers, body };
}

async function main() {
  console.log(`Target: ${baseUrl}\n`);

  const snapshot = await getJson("/api/market/snapshot");
  check("Snapshot responds with 200", snapshot.status === 200, `status=${snapshot.status}`);

  const quotes = Array.isArray(snapshot.body?.quotes) ? snapshot.body.quotes : null;
  check(
    "Snapshot returns a quotes array",
    Array.isArray(quotes),
    `type=${typeof snapshot.body?.quotes}`,
  );

  if (quotes) {
    check("Snapshot returns 15 quotes", quotes.length === 15, `count=${quotes.length}`);

    const ids = quotes.map((quote) => quote?.assetId);
    check(
      "Every quote has a known assetId",
      ids.every((id) => typeof id === "string" && id.length > 0),
      JSON.stringify(ids),
    );
    check("Asset ids are unique", new Set(ids).size === ids.length);

    const byId = new Map(quotes.map((quote) => [quote.assetId, quote]));
    const tether = byId.get("tether");
    check(
      "USDT uses the stable reference value 1.00",
      tether?.priceUsd === "1.00",
      `priceUsd=${tether?.priceUsd}`,
    );

    const marketQuotes = quotes.filter((quote) => quote?.assetId !== "tether");
    check(
      "All market quotes have a positive price",
      marketQuotes.every((quote) => isPositiveNumber(quote.priceUsd)),
      JSON.stringify(
        marketQuotes.filter((q) => !isPositiveNumber(q.priceUsd)).map((q) => q.assetId),
      ),
    );
    check(
      "No quote shows a fabricated 0 price",
      quotes.every((quote) => quote.priceUsd !== "0" && quote.priceUsd !== "0.00"),
    );
    check(
      "All market quotes have 24h high, low, and volume",
      marketQuotes.every(
        (quote) =>
          isPositiveNumber(quote.high24hUsd) &&
          isPositiveNumber(quote.low24hUsd) &&
          isPositiveNumber(quote.volume24hUsd),
      ),
    );
    check(
      "24h high is not below 24h low",
      marketQuotes.every((quote) => Number(quote.high24hUsd) >= Number(quote.low24hUsd)),
    );
    check(
      "Price sits between 24h low and 24h high",
      marketQuotes.every((quote) => {
        const price = Number(quote.priceUsd);
        return price >= Number(quote.low24hUsd) && price <= Number(quote.high24hUsd);
      }),
    );
    check(
      "24h change is a number in percent units",
      marketQuotes.every(
        (quote) =>
          isSignedNumber(quote.change24hPercent) && Math.abs(Number(quote.change24hPercent)) < 100,
      ),
      JSON.stringify(
        marketQuotes
          .filter((q) => Math.abs(Number(q.change24hPercent)) >= 100)
          .map((q) => q.assetId),
      ),
    );
    check(
      "Quotes are marked live with source binance",
      quotes.every((quote) => quote.status === "live" && quote.source === "binance"),
    );
    const receivedAt = Math.max(...quotes.map((quote) => Number(quote.receivedAt)));
    check(
      "Quotes were received recently",
      Number.isFinite(receivedAt) && Date.now() - receivedAt < 60_000,
      `ageMs=${Date.now() - receivedAt}`,
    );
    check(
      "Market timestamps are present",
      quotes.every(
        (quote) =>
          Number.isFinite(Number(quote.marketTimestamp)) && Number(quote.marketTimestamp) > 0,
      ),
    );
  }

  check(
    "Snapshot sets a cacheable Cache-Control header",
    String(snapshot.headers.get("cache-control") ?? "").includes("s-maxage"),
    `cache-control=${snapshot.headers.get("cache-control")}`,
  );

  const partial = await getJson("/api/market/snapshot?assets=bitcoin,ethereum");
  check(
    "Asset filter returns only requested quotes",
    partial.status === 200 &&
      Array.isArray(partial.body?.quotes) &&
      partial.body.quotes.length === 2 &&
      partial.body.quotes.every((quote) => ["bitcoin", "ethereum"].includes(quote.assetId)),
    `status=${partial.status} count=${partial.body?.quotes?.length}`,
  );

  const invalid = await getJson("/api/market/snapshot?assets=bitcoin,not-an-asset");
  check("Unknown asset is rejected with 400", invalid.status === 400, `status=${invalid.status}`);

  const empty = await getJson("/api/market/snapshot?assets=");
  check("Empty asset list is rejected with 400", empty.status === 400, `status=${empty.status}`);

  try {
    const klines = await fetch(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=3",
      { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } },
    );
    const rows = await klines.json();
    check("Binance klines respond with 200", klines.status === 200, `status=${klines.status}`);
    check(
      "Klines return 3 hourly candles with OHLC fields",
      Array.isArray(rows) &&
        rows.length === 3 &&
        rows.every(
          (row) =>
            Number.isFinite(Number(row[0])) &&
            isPositiveNumber(row[1]) &&
            isPositiveNumber(row[2]) &&
            isPositiveNumber(row[3]) &&
            isPositiveNumber(row[4]),
        ),
    );
  } catch (error) {
    check("Binance klines request succeeded", false, String(error));
  }

  if (typeof WebSocket === "undefined") {
    skip("Combined ticker WebSocket stream", "WebSocket global unavailable in this Node runtime");
  } else {
    await new Promise((resolve) => {
      const streams = [
        "btcusdt@ticker",
        "ethusdt@ticker",
        "solusdt@ticker",
        "xrpusdt@ticker",
        "dogeusdt@ticker",
      ].join("/");
      let settled = false;
      const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      const finish = (name, ok, detail = "") => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          socket.close();
        } catch {
          // Socket may already be closed.
        }
        check(name, ok, detail);
        resolve();
      };
      const timer = setTimeout(
        () => finish("Combined ticker WebSocket delivers updates", false, "timed out after 15s"),
        15_000,
      );
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const data = message?.data;
        if (!data?.s || !data.c) return;
        finish(
          "Combined ticker WebSocket delivers updates",
          typeof data.E === "number" && isPositiveNumber(data.c) && isSignedNumber(data.P),
          `symbol=${data.s}`,
        );
      };
      socket.onerror = () =>
        finish("Combined ticker WebSocket delivers updates", false, "socket error");
    });
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`Market verification crashed: ${error?.message ?? error}`);
  process.exit(1);
});
