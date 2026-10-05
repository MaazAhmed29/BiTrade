import { NextResponse } from "next/server";
import { getAssetById } from "@/config/assets";
import { QUOTE_STALE_AFTER_MS } from "@/config/market";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createMarketDataProvider } from "@/lib/market-data/binance";
import { parseTradeRequest, roundQuantity } from "@/lib/trading/validation";

export const dynamic = "force-dynamic";

type RpcRow = {
  trade_id: string;
  trade_status: string;
  trade_rejection_reason: string | null;
  resulting_cash: string;
  resulting_quantity: string;
};

type TradeResponse = {
  trade: {
    id: string;
    assetId: string;
    side: string;
    quantity: string;
    executionPrice: string;
    notionalValue: string;
    cashChange: string;
    source: string;
    status: string;
    rejectionReason: string | null;
  };
  cashBalance: string;
  holdingQuantity: string;
  alreadyExecuted?: boolean;
};

const STALE_PRICE_ERROR =
  "Price data is stale. Trading is temporarily disabled until a fresh market price is available.";
const UNAVAILABLE_ERROR = "Market data is temporarily unavailable.";

function roundNotional(value: number): number {
  return Number(value.toFixed(8));
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseTradeRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const tradeRequest = parsed.value;

  const asset = getAssetById(tradeRequest.assetId);
  if (!asset) {
    return NextResponse.json({ error: "Unknown asset requested." }, { status: 400 });
  }
  if (!asset.pair) {
    return NextResponse.json(
      { error: "This asset has no market pair for a trade price." },
      { status: 400 },
    );
  }

  let quote;
  try {
    [quote] = await createMarketDataProvider().getSnapshot([asset.id]);
  } catch {
    return NextResponse.json({ error: UNAVAILABLE_ERROR }, { status: 503 });
  }

  if (!quote || quote.priceUsd === "") {
    return NextResponse.json({ error: UNAVAILABLE_ERROR }, { status: 503 });
  }

  const isFresh = quote.status === "live" && Date.now() - quote.receivedAt <= QUOTE_STALE_AFTER_MS;
  const price = Number(quote.priceUsd);
  if (!isFresh || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: STALE_PRICE_ERROR }, { status: 503 });
  }

  let quantity: number;
  if (tradeRequest.mode === "usd") {
    quantity = roundQuantity(Number(tradeRequest.amountUsd) / price);
  } else {
    quantity = Number(tradeRequest.quantity);
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "Quantity is too small to trade at this price." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("execute_paper_trade", {
    p_asset_id: asset.id,
    p_side: tradeRequest.side,
    p_quantity: quantity,
    p_execution_price: price,
    p_source: "manual",
    p_execution_token: tradeRequest.executionToken,
  });

  if (error) {
    const isDuplicate =
      error.code === "23505" || String(error.message ?? "").includes("duplicate key");
    if (isDuplicate) {
      const { data: existing } = await supabase
        .from("trades")
        .select(
          "id, asset_id, side, quantity, execution_price, notional_value, cash_change, source, status, rejection_reason",
        )
        .eq("execution_token", tradeRequest.executionToken)
        .maybeSingle();
      if (existing) {
        const { data: account } = await supabase
          .from("paper_accounts")
          .select("cash_balance")
          .maybeSingle<{ cash_balance: string }>();
        return NextResponse.json({
          trade: {
            id: existing.id,
            assetId: existing.asset_id,
            side: existing.side,
            quantity: existing.quantity,
            executionPrice: existing.execution_price,
            notionalValue: existing.notional_value,
            cashChange: existing.cash_change,
            source: existing.source,
            status: existing.status,
            rejectionReason: existing.rejection_reason,
          },
          cashBalance: account?.cash_balance ?? "0.00",
          holdingQuantity: "0",
          alreadyExecuted: true,
        } satisfies TradeResponse);
      }
      return NextResponse.json({ error: "This order was already executed." }, { status: 409 });
    }
    if (String(error.message ?? "").includes("not authenticated")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    console.error("execute_paper_trade failed:", error.message);
    return NextResponse.json({ error: "Trade could not be executed." }, { status: 500 });
  }

  const rows = Array.isArray(data) ? (data as RpcRow[]) : [];
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Trade could not be executed." }, { status: 500 });
  }

  const notional = roundNotional(quantity * price);
  const cashChange = tradeRequest.side === "buy" ? -notional : notional;

  if (row.trade_status === "rejected") {
    return NextResponse.json(
      {
        error: row.trade_rejection_reason ?? "Trade rejected.",
        tradeId: row.trade_id,
        cashBalance: row.resulting_cash,
        status: "rejected",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    trade: {
      id: row.trade_id,
      assetId: asset.id,
      side: tradeRequest.side,
      quantity: String(quantity),
      executionPrice: quote.priceUsd,
      notionalValue: String(notional),
      cashChange: String(cashChange),
      source: "manual",
      status: "filled",
      rejectionReason: null,
    },
    cashBalance: row.resulting_cash,
    holdingQuantity: row.resulting_quantity,
  } satisfies TradeResponse);
}
