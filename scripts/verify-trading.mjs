import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Fill in .env.local first.",
  );
  process.exit(1);
}

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

function near(actual, expected, tolerance = 0.02) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function cookieFor(session) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `sb-${projectRef}-auth-token=base64-${encoded}`;
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const headers = { Accept: "application/json" };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, payload };
}

async function createUser(label) {
  const supabase = createClient(supabaseUrl, publishableKey);
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 10000)}`;
  const email = `${label}-${stamp}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: "Trade-Test-Passw0rd!",
    options: { data: { username: `t${stamp}` } },
  });
  if (error || !data.session) {
    throw new Error(`signup failed for ${label}: ${error?.message ?? "no session"}`);
  }
  return { supabase, email, cookie: cookieFor(data.session) };
}

async function main() {
  console.log(`Target: ${baseUrl}\n`);

  const anonPortfolio = await api("/api/portfolio");
  check("Signed out: /api/portfolio returns 401", anonPortfolio.status === 401);
  const anonHistory = await api("/api/history");
  check("Signed out: /api/history returns 401", anonHistory.status === 401);
  const anonTrade = await api("/api/trade", {
    method: "POST",
    body: {
      assetId: "bitcoin",
      side: "buy",
      mode: "usd",
      amountUsd: "1",
      executionToken: randomUUID(),
    },
  });
  check("Signed out: /api/trade returns 401", anonTrade.status === 401);

  const userA = await createUser("trade-test");
  check("Fresh test user created", Boolean(userA.cookie), userA.email);

  const initial = await api("/api/portfolio", { cookie: userA.cookie });
  check(
    "New account starts with exactly $10,000.00",
    initial.status === 200 && initial.payload?.portfolio?.cashBalance === "10000.00",
    `status=${initial.status} cash=${initial.payload?.portfolio?.cashBalance}`,
  );
  check(
    "New account has no holdings and zero profit",
    initial.payload?.portfolio?.holdings?.length === 0 &&
      initial.payload?.portfolio?.profitLoss === "0.00" &&
      initial.payload?.portfolio?.totalValue === "10000.00",
    JSON.stringify({
      holdings: initial.payload?.portfolio?.holdings?.length,
      profitLoss: initial.payload?.portfolio?.profitLoss,
    }),
  );

  const emptyHistory = await api("/api/history", { cookie: userA.cookie });
  check(
    "New account has no trade history",
    emptyHistory.status === 200 && emptyHistory.payload?.trades?.length === 0,
    `status=${emptyHistory.status} count=${emptyHistory.payload?.trades?.length}`,
  );

  const snapshot = await api("/api/market/snapshot?assets=bitcoin");
  const btcPrice = Number(snapshot.payload?.quotes?.[0]?.priceUsd);
  check("Market snapshot provides a BTC price", Number.isFinite(btcPrice) && btcPrice > 0);

  const buyToken = randomUUID();
  const buy = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "buy",
      mode: "usd",
      amountUsd: "50",
      executionToken: buyToken,
      price: "1",
    },
  });
  const buyTrade = buy.payload?.trade;
  check(
    "Buy $50 of BTC fills",
    buy.status === 200 && buyTrade?.status === "filled",
    `status=${buy.status} ${JSON.stringify(buy.payload)}`,
  );
  check(
    "Buy quantity matches the dollar amount at market price",
    near(Number(buyTrade?.quantity), 50 / btcPrice, 50 / btcPrice + 0.001),
    `qty=${buyTrade?.quantity} expected≈${50 / btcPrice}`,
  );
  check(
    "Client supplied price is ignored, server price used",
    Number(buyTrade?.executionPrice) > 1 &&
      Math.abs(Number(buyTrade?.executionPrice) - btcPrice) / btcPrice < 0.02,
    `executionPrice=${buyTrade?.executionPrice} market=${btcPrice}`,
  );
  const cashAfterBuy = Number(buy.payload?.cashBalance);
  check(
    "Buy reduces cash correctly",
    near(cashAfterBuy, 10000 - Number(buyTrade?.notionalValue)),
    `cash=${cashAfterBuy} notional=${buyTrade?.notionalValue}`,
  );

  const afterBuy = await api("/api/portfolio", { cookie: userA.cookie });
  const btcHolding = afterBuy.payload?.portfolio?.holdings?.find((h) => h.assetId === "bitcoin");
  check(
    "Buy increases holdings correctly",
    btcHolding && near(Number(btcHolding.quantity), Number(buyTrade?.quantity), 1e-9),
    JSON.stringify(btcHolding),
  );
  check(
    "Holding valuation is live and consistent with cash plus market value",
    btcHolding?.status === "live" &&
      near(
        Number(afterBuy.payload?.portfolio?.totalValue),
        Number(afterBuy.payload?.portfolio?.cashBalance) + Number(btcHolding.marketValue),
        0.05,
      ),
    JSON.stringify({
      status: btcHolding?.status,
      total: afterBuy.payload?.portfolio?.totalValue,
      cash: afterBuy.payload?.portfolio?.cashBalance,
      marketValue: btcHolding?.marketValue,
    }),
  );

  const tooMuch = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "buy",
      mode: "usd",
      amountUsd: "99999999",
      executionToken: randomUUID(),
    },
  });
  check(
    "Insufficient cash rejects the buy with a reason",
    tooMuch.status === 422 &&
      String(tooMuch.payload?.error ?? "").includes("Insufficient paper cash"),
    `status=${tooMuch.status} error=${tooMuch.payload?.error}`,
  );
  const cashAfterReject = await api("/api/portfolio", { cookie: userA.cookie });
  check(
    "Rejected buy does not change cash",
    near(Number(cashAfterReject.payload?.portfolio?.cashBalance), cashAfterBuy),
    `cash=${cashAfterReject.payload?.portfolio?.cashBalance} expected=${cashAfterBuy}`,
  );

  const dustBuy = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "buy",
      mode: "usd",
      amountUsd: "0.5",
      executionToken: randomUUID(),
    },
  });
  check(
    "Sub minimum order is rejected with a reason",
    dustBuy.status === 422 && String(dustBuy.payload?.error ?? "").includes("minimum"),
    `status=${dustBuy.status} error=${dustBuy.payload?.error}`,
  );

  const tinyBuy = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "buy",
      mode: "usd",
      amountUsd: "0.000000001",
      executionToken: randomUUID(),
    },
  });
  check(
    "Dust amount that rounds to zero quantity returns 400",
    tinyBuy.status === 400,
    `status=${tinyBuy.status}`,
  );

  const invalidCases = [
    ["unknown asset", { assetId: "potato", side: "buy", mode: "usd", amountUsd: "10" }],
    ["unpriceable asset USDT", { assetId: "tether", side: "buy", mode: "usd", amountUsd: "10" }],
    ["invalid side", { assetId: "bitcoin", side: "steal", mode: "usd", amountUsd: "10" }],
    ["zero amount", { assetId: "bitcoin", side: "buy", mode: "usd", amountUsd: "0" }],
    ["negative amount", { assetId: "bitcoin", side: "buy", mode: "usd", amountUsd: "-5" }],
    [
      "huge amount",
      { assetId: "bitcoin", side: "buy", mode: "usd", amountUsd: "99999999999999999999" },
    ],
    ["zero quantity", { assetId: "bitcoin", side: "buy", mode: "quantity", quantity: "0" }],
    [
      "non numeric quantity",
      { assetId: "bitcoin", side: "buy", mode: "quantity", quantity: "abc" },
    ],
    ["bad mode", { assetId: "bitcoin", side: "buy", mode: "cash", amountUsd: "10" }],
    ["missing token", { assetId: "bitcoin", side: "buy", mode: "usd", amountUsd: "10" }, true],
    [
      "bad token",
      { assetId: "bitcoin", side: "buy", mode: "usd", amountUsd: "10", executionToken: "nope" },
    ],
  ];
  for (const [label, base, keepTokenMissing] of invalidCases) {
    const body = { ...base };
    if (!keepTokenMissing && !("executionToken" in body)) body.executionToken = randomUUID();
    const result = await api("/api/trade", { method: "POST", cookie: userA.cookie, body });
    check(
      `Invalid input rejected with 400: ${label}`,
      result.status === 400,
      `status=${result.status} ${JSON.stringify(result.payload)}`,
    );
  }

  const malformed = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: "definitely not json",
  });
  check("Malformed body rejected with 400", malformed.status === 400, `status=${malformed.status}`);

  const sellWithoutHoldings = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "ethereum",
      side: "sell",
      mode: "quantity",
      quantity: "1",
      executionToken: randomUUID(),
    },
  });
  check(
    "Sell without holdings rejects with a reason",
    sellWithoutHoldings.status === 422 &&
      String(sellWithoutHoldings.payload?.error ?? "").includes("Insufficient holdings"),
    `status=${sellWithoutHoldings.status} error=${sellWithoutHoldings.payload?.error}`,
  );

  const beforeSell = await api("/api/portfolio", { cookie: userA.cookie });
  const beforeSellBtc = beforeSell.payload?.portfolio?.holdings?.find(
    (h) => h.assetId === "bitcoin",
  );
  const cashBeforeSell = Number(beforeSell.payload?.portfolio?.cashBalance);
  const heldQuantity = Number(beforeSellBtc?.quantity);
  const sellQuantity = Math.floor((heldQuantity / 2) * 1e12) / 1e12;
  const sellToken = randomUUID();
  const sell = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "sell",
      mode: "quantity",
      quantity: String(sellQuantity),
      executionToken: sellToken,
    },
  });
  const sellTrade = sell.payload?.trade;
  check(
    "Partial sell fills",
    sell.status === 200 && sellTrade?.status === "filled",
    `status=${sell.status} ${JSON.stringify(sell.payload)}`,
  );

  const afterSell = await api("/api/portfolio", { cookie: userA.cookie });
  const soldHolding = afterSell.payload?.portfolio?.holdings?.find((h) => h.assetId === "bitcoin");
  check(
    "Sell reduces holdings correctly",
    soldHolding && near(Number(soldHolding.quantity), heldQuantity - sellQuantity, 1e-9),
    `held=${soldHolding?.quantity} expected=${heldQuantity - sellQuantity}`,
  );
  check(
    "Sell increases cash correctly",
    near(
      Number(afterSell.payload?.portfolio?.cashBalance),
      cashBeforeSell + Number(sellTrade?.notionalValue),
    ),
    `cash=${afterSell.payload?.portfolio?.cashBalance} expected=${cashBeforeSell + Number(sellTrade?.notionalValue)}`,
  );
  check(
    "Partial sell keeps the average entry price",
    soldHolding &&
      near(Number(soldHolding.averageEntryPrice), Number(beforeSellBtc.averageEntryPrice), 1e-9),
    `avg=${soldHolding?.averageEntryPrice} expected=${beforeSellBtc?.averageEntryPrice}`,
  );
  check(
    "Partial sell records realized profit and loss",
    soldHolding !== undefined && Number.isFinite(Number(soldHolding?.realizedPnl)),
    `realized=${soldHolding?.realizedPnl}`,
  );

  const oversell = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "sell",
      mode: "quantity",
      quantity: "1",
      executionToken: randomUUID(),
    },
  });
  check(
    "Selling more than owned rejects",
    oversell.status === 422 &&
      String(oversell.payload?.error ?? "").includes("Insufficient holdings"),
    `status=${oversell.status}`,
  );

  const cashBeforeReplay = Number(afterSell.payload?.portfolio?.cashBalance);
  const replay = await api("/api/trade", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      assetId: "bitcoin",
      side: "sell",
      mode: "quantity",
      quantity: String(sellQuantity),
      executionToken: sellToken,
    },
  });
  check(
    "Duplicate execution token is idempotent",
    replay.status === 200 && replay.payload?.trade?.id === sellTrade?.id,
    `status=${replay.status}`,
  );

  const afterReplay = await api("/api/portfolio", { cookie: userA.cookie });
  check(
    "Replayed trade does not change balances",
    near(Number(afterReplay.payload?.portfolio?.cashBalance), cashBeforeReplay),
    `cash=${afterReplay.payload?.portfolio?.cashBalance} expected=${cashBeforeReplay}`,
  );

  const history = await api("/api/history", { cookie: userA.cookie });
  const trades = history.payload?.trades ?? [];
  check(
    "History lists all trades",
    history.status === 200 && trades.length >= 5,
    `count=${trades.length}`,
  );
  const rejectedRows = trades.filter((t) => t.status === "rejected");
  check(
    "Rejected orders are retained with reasons",
    rejectedRows.length >= 3 &&
      rejectedRows.every(
        (t) => typeof t.rejectionReason === "string" && t.rejectionReason.length > 0,
      ),
    `rejected=${rejectedRows.length}`,
  );
  check(
    "History rows carry audit fields",
    trades.every(
      (t) =>
        t.id &&
        t.assetId &&
        (t.side === "buy" || t.side === "sell") &&
        Number(t.quantity) > 0 &&
        Number(t.executionPrice) > 0 &&
        Number.isFinite(Number(t.notionalValue)) &&
        t.source === "manual" &&
        t.createdAt,
    ),
  );
  const descending = trades.every(
    (t, index) => index === 0 || new Date(t.createdAt) <= new Date(trades[index - 1].createdAt),
  );
  check("History is ordered newest first", descending);

  const filtered = await api("/api/history?asset=bitcoin", { cookie: userA.cookie });
  check(
    "History asset filter works",
    filtered.status === 200 &&
      filtered.payload?.trades?.length > 0 &&
      filtered.payload.trades.every((t) => t.assetId === "bitcoin"),
    `count=${filtered.payload?.trades?.length}`,
  );
  const badFilter = await api("/api/history?asset=potato", { cookie: userA.cookie });
  check("History rejects unknown asset filter", badFilter.status === 400);
  const badLimit = await api("/api/history?limit=abc", { cookie: userA.cookie });
  check("History rejects non numeric limit", badLimit.status === 400);

  const userB = await createUser("trade-isolation");
  const isolationPortfolio = await api("/api/portfolio", { cookie: userB.cookie });
  check(
    "Second user starts with a clean $10,000 account",
    isolationPortfolio.status === 200 &&
      isolationPortfolio.payload?.portfolio?.cashBalance === "10000.00" &&
      isolationPortfolio.payload?.portfolio?.holdings?.length === 0,
    JSON.stringify(isolationPortfolio.payload?.portfolio),
  );
  const isolationHistory = await api("/api/history", { cookie: userB.cookie });
  check(
    "Second user cannot see the first user trades",
    isolationHistory.status === 200 && isolationHistory.payload?.trades?.length === 0,
    `count=${isolationHistory.payload?.trades?.length}`,
  );

  const userC = await createUser("trade-parallel");
  const parallelResults = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      api("/api/trade", {
        method: "POST",
        cookie: userC.cookie,
        body: {
          assetId: "bitcoin",
          side: "buy",
          mode: "usd",
          amountUsd: "6000",
          executionToken: randomUUID(),
        },
      }),
    ),
  );
  const filled = parallelResults.filter((r) => r.payload?.trade?.status === "filled");
  const rejected = parallelResults.filter((r) => r.status === 422);
  check(
    "Simultaneous buys: exactly one spends the balance",
    filled.length === 1 && rejected.length === 4,
    `filled=${filled.length} rejected=${rejected.length} statuses=${parallelResults.map((r) => r.status).join(",")}`,
  );
  const parallelPortfolio = await api("/api/portfolio", { cookie: userC.cookie });
  const parallelCash = Number(parallelPortfolio.payload?.portfolio?.cashBalance);
  check(
    "Simultaneous buys leave a consistent non negative balance",
    near(parallelCash, 4000, 0.05) && parallelCash >= 0,
    `cash=${parallelCash}`,
  );
  const parallelHolding = parallelPortfolio.payload?.portfolio?.holdings?.find(
    (h) => h.assetId === "bitcoin",
  );
  check(
    "Simultaneous buys produce exactly one holding entry",
    Boolean(parallelHolding) &&
      near(Number(parallelHolding.quantity), Number(filled[0]?.payload?.trade?.quantity), 1e-9),
    JSON.stringify(parallelHolding),
  );

  const portfolioPage = await fetch(`${baseUrl}/portfolio`, {
    headers: { cookie: userA.cookie },
    signal: AbortSignal.timeout(20_000),
  });
  const portfolioHtml = await portfolioPage.text();
  check(
    "Signed in: /portfolio renders with holdings",
    portfolioPage.status === 200 && portfolioHtml.includes("Total portfolio value"),
    `status=${portfolioPage.status}`,
  );

  const historyPage = await fetch(`${baseUrl}/history`, {
    headers: { cookie: userA.cookie },
    signal: AbortSignal.timeout(20_000),
  });
  const historyHtml = await historyPage.text();
  check(
    "Signed in: /history renders the trades table",
    historyPage.status === 200 && historyHtml.includes("rejected"),
    `status=${historyPage.status}`,
  );

  await userA.supabase.auth.signOut();
  await userB.supabase.auth.signOut();
  await userC.supabase.auth.signOut();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`Trading verification crashed: ${error?.message ?? error}`);
  process.exit(1);
});
