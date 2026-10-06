import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

async function getCandles(query) {
  const response = await fetch(`${baseUrl}/api/market/candles?${query}`, {
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

function isPositiveString(value) {
  return (
    typeof value === "string" && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0
  );
}

function candleShapeOk(candle) {
  return (
    Number.isFinite(candle.openTime) &&
    candle.openTime > 0 &&
    Number.isFinite(candle.closeTime) &&
    candle.closeTime > candle.openTime &&
    isPositiveString(candle.open) &&
    isPositiveString(candle.high) &&
    isPositiveString(candle.low) &&
    isPositiveString(candle.close) &&
    isPositiveString(candle.volume)
  );
}

function ohlcConsistent(candle) {
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  return high >= Math.max(open, close) && low <= Math.min(open, close) && low > 0 && high >= low;
}

async function main() {
  console.log(`Target: ${baseUrl}\n`);

  const basic = await getCandles("asset=BTC&interval=1h&limit=5");
  check("Candles respond with 200", basic.status === 200, `status=${basic.status}`);
  const candles = Array.isArray(basic.body?.candles) ? basic.body.candles : null;
  check(
    "Candles returned as an array",
    Array.isArray(candles),
    `type=${typeof basic.body?.candles}`,
  );

  if (candles) {
    check("Requested 5 candles returned", candles.length === 5, `count=${candles.length}`);
    check("Every candle has a valid OHLCV shape", candles.every(candleShapeOk));
    check(
      "Every candle has consistent OHLC bounds",
      candles.every(ohlcConsistent),
      JSON.stringify(candles.find((c) => !ohlcConsistent(c))),
    );

    const ascending = candles.every(
      (candle, index) => index === 0 || candle.openTime > candles[index - 1].openTime,
    );
    check("Candle open times ascend strictly", ascending);

    const hourlySpacing = candles
      .slice(1)
      .every((candle, index) => candle.openTime - candles[index].openTime === 3_600_000);
    check("Hourly candles are spaced exactly 1 hour apart", hourlySpacing);
  }

  check(
    "Candles endpoint sets a cacheable Cache-Control header",
    String(basic.headers.get("cache-control") ?? "").includes("s-maxage=30"),
    `cache-control=${basic.headers.get("cache-control")}`,
  );

  const byId = await getCandles("asset=bitcoin&interval=1h&limit=3");
  check(
    "Asset id works as well as symbol",
    byId.status === 200 && byId.body?.candles?.length === 3,
  );

  for (const interval of ["1m", "5m", "15m", "1h", "4h", "1d", "1w"]) {
    const result = await getCandles(`asset=ETH&interval=${interval}&limit=3`);
    check(
      `Interval ${interval} returns candles`,
      result.status === 200 &&
        Array.isArray(result.body?.candles) &&
        result.body.candles.length === 3,
      `status=${result.status} count=${result.body?.candles?.length}`,
    );
  }

  const badInterval = await getCandles("asset=BTC&interval=2h&limit=3");
  check(
    "Unsupported interval rejected with 400",
    badInterval.status === 400,
    `status=${badInterval.status}`,
  );

  const missingAsset = await getCandles("interval=1h&limit=3");
  check(
    "Missing asset rejected with 400",
    missingAsset.status === 400,
    `status=${missingAsset.status}`,
  );

  const unknownAsset = await getCandles("asset=not-a-coin&interval=1h&limit=3");
  check(
    "Unknown asset rejected with 400",
    unknownAsset.status === 400,
    `status=${unknownAsset.status}`,
  );

  const tether = await getCandles("asset=USDT&interval=1h&limit=3");
  check(
    "USDT rejected with a clear no-pair reason",
    tether.status === 400 && String(tether.body?.error ?? "").includes("no market pair"),
    `status=${tether.status} error=${tether.body?.error}`,
  );

  const badLimit = await getCandles("asset=BTC&interval=1h&limit=abc");
  check(
    "Non-numeric limit rejected with 400",
    badLimit.status === 400,
    `status=${badLimit.status}`,
  );

  const hugeLimit = await getCandles("asset=BTC&interval=1h&limit=99999");
  check(
    "Oversized limit is clamped to 500 candles",
    hugeLimit.status === 200 &&
      Array.isArray(hugeLimit.body?.candles) &&
      hugeLimit.body.candles.length === 500,
    `status=${hugeLimit.status} count=${hugeLimit.body?.candles?.length}`,
  );

  const fresh = await getCandles("asset=ETH&interval=1m&limit=3");
  if (fresh.status === 200 && Array.isArray(fresh.body?.candles) && fresh.body.candles.length > 0) {
    const last = fresh.body.candles[fresh.body.candles.length - 1];
    const ageMs = Date.now() - last.openTime;
    check(
      "Latest 1 minute candle is current (not historical filler)",
      ageMs < 120_000,
      `ageMs=${ageMs}`,
    );
  } else {
    check(
      "Latest 1 minute candle is current (not historical filler)",
      false,
      `status=${fresh.status}`,
    );
  }

  const snapshotResponse = await fetch(`${baseUrl}/api/market/snapshot?assets=bitcoin`, {
    signal: AbortSignal.timeout(15_000),
  });
  const snapshotBody = await snapshotResponse.json();
  const snapshotPrice = Number(snapshotBody?.quotes?.[0]?.priceUsd);
  const liveCandles = await getCandles("asset=BTC&interval=1m&limit=1");
  const lastClose = Number(liveCandles.body?.candles?.[0]?.close);
  check(
    "Chart candle close matches the live snapshot price within 1%",
    Number.isFinite(snapshotPrice) &&
      Number.isFinite(lastClose) &&
      snapshotPrice > 0 &&
      Math.abs(lastClose - snapshotPrice) / snapshotPrice < 0.01,
    `snapshot=${snapshotPrice} close=${lastClose}`,
  );

  const shib = await getCandles("asset=SHIB&interval=1d&limit=5");
  check(
    "SHIB returns sub-cent candles with full precision",
    shib.status === 200 &&
      Array.isArray(shib.body?.candles) &&
      shib.body.candles.length === 5 &&
      shib.body.candles.every((c) => Number(c.close) > 0 && Number(c.close) < 1),
    `status=${shib.status}`,
  );

  const doge = await getCandles("asset=DOGE&interval=1h&limit=3");
  check(
    "DOGE returns low priced candles",
    doge.status === 200 &&
      Array.isArray(doge.body?.candles) &&
      doge.body.candles.every((c) => Number(c.close) > 0 && Number(c.close) < 100),
    `status=${doge.status}`,
  );

  const markerCheck = await getCandles("asset=SOL&interval=4h&limit=10");
  if (markerCheck.status === 200 && Array.isArray(markerCheck.body?.candles)) {
    const spacing = markerCheck.body.candles
      .slice(1)
      .every((c, i) => c.openTime - markerCheck.body.candles[i].openTime === 14_400_000);
    check("4 hour candles are spaced exactly 4 hours apart", spacing);
  } else {
    check("4 hour candles are spaced exactly 4 hours apart", false, `status=${markerCheck.status}`);
  }

  async function pageRedirects(path) {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return { status: response.status, location: response.headers.get("location") };
  }

  const marketsPage = await pageRedirects("/markets");
  check(
    "Signed out: /markets redirects to /login",
    marketsPage.status >= 300 &&
      marketsPage.status < 400 &&
      (marketsPage.location ?? "").startsWith("/login"),
    `status=${marketsPage.status} location=${marketsPage.location}`,
  );

  const detailPage = await pageRedirects("/markets/bitcoin");
  check(
    "Signed out: /markets/bitcoin redirects to /login",
    detailPage.status >= 300 &&
      detailPage.status < 400 &&
      (detailPage.location ?? "").startsWith("/login"),
    `status=${detailPage.status} location=${detailPage.location}`,
  );

  if (!supabaseUrl || !publishableKey) {
    check(
      "Signed in page checks",
      false,
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
    finish();
    return;
  }

  const supabase = createClient(supabaseUrl, publishableKey);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: "auth-flow-test@example.com",
    password: "Auth-Flow-Test-Passw0rd!",
  });
  check(
    "Signed in for page checks",
    !signInError && Boolean(signInData.session),
    signInError?.message,
  );
  if (signInError || !signInData.session) {
    finish();
    return;
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const encoded = Buffer.from(JSON.stringify(signInData.session), "utf8").toString("base64url");
  const cookieHeader = `sb-${projectRef}-auth-token=base64-${encoded}`;

  async function fetchPage(path) {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(15_000),
    });
    return { status: response.status, body: await response.text() };
  }

  const dashboard = await fetchPage("/dashboard");
  check(
    "Signed in: dashboard renders with the selected asset chart",
    dashboard.status === 200 &&
      dashboard.body.includes("Chart range") &&
      dashboard.body.includes("Charting Bitcoin"),
    `status=${dashboard.status}`,
  );
  check(
    "Signed in: dashboard shows the market overview",
    dashboard.body.includes("Top 15 Cryptocurrencies"),
    "market overview heading not found",
  );

  const markets = await fetchPage("/markets");
  check(
    "Signed in: /markets renders the market table",
    markets.status === 200 && markets.body.includes("Top 15 Cryptocurrencies"),
    `status=${markets.status}`,
  );

  const bitcoin = await fetchPage("/markets/bitcoin");
  check(
    "Signed in: /markets/bitcoin renders stats and chart",
    bitcoin.status === 200 &&
      bitcoin.body.includes("Back to markets") &&
      bitcoin.body.includes("Price chart") &&
      bitcoin.body.includes("Bitcoin"),
    `status=${bitcoin.status}`,
  );

  const bySymbol = await fetchPage("/markets/BTC");
  check(
    "Signed in: asset symbol resolves on the detail route",
    bySymbol.status === 200 && bySymbol.body.includes("Price chart"),
    `status=${bySymbol.status}`,
  );

  const tetherPage = await fetchPage("/markets/tether");
  check(
    "Signed in: Tether detail explains the stable reference value",
    tetherPage.status === 200 && tetherPage.body.includes("stable reference value"),
    `status=${tetherPage.status}`,
  );

  const missing = await fetchPage("/markets/definitely-not-an-asset");
  check("Signed in: unknown asset returns 404", missing.status === 404, `status=${missing.status}`);

  await supabase.auth.signOut();
  finish();

  function finish() {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch((error) => {
  console.error(`Chart verification crashed: ${error?.message ?? error}`);
  process.exit(1);
});
