import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssetById } from "@/config/assets";
import { QUOTE_STALE_AFTER_MS } from "@/config/market";
import { createMarketDataProvider } from "@/lib/market-data/binance";
import { roundQuantity, type TradeRequest } from "@/lib/trading/validation";

export const STALE_PRICE_ERROR =
  "Price data is stale. Trading is temporarily disabled until a fresh market price is available.";
export const UNAVAILABLE_ERROR = "Market data is temporarily unavailable.";

export type TradePayload = {
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

export type TradeExecutionResult =
  | { kind: "unknown-asset" }
  | { kind: "no-pair" }
  | { kind: "unavailable" }
  | { kind: "stale" }
  | { kind: "quantity-too-small" }
  | { kind: "rejected"; reason: string; tradeId: string; cashBalance: string }
  | { kind: "duplicate"; payload: TradePayload }
  | { kind: "conflict" }
  | { kind: "filled"; payload: TradePayload }
  | { kind: "error" };

type RpcRow = {
  trade_id: string;
  trade_status: string;
  trade_rejection_reason: string | null;
  resulting_cash: string;
  resulting_quantity: string;
};

function roundNotional(value: number): number {
  return Number(value.toFixed(8));
}

export async function executeTrade(
  supabase: SupabaseClient,
  request: TradeRequest,
  source: "manual" | "ai",
): Promise<TradeExecutionResult> {
  const asset = getAssetById(request.assetId);
  if (!asset) return { kind: "unknown-asset" };
  if (!asset.pair) return { kind: "no-pair" };

  let quote;
  try {
    [quote] = await createMarketDataProvider().getSnapshot([asset.id]);
  } catch {
    return { kind: "unavailable" };
  }

  if (!quote || quote.priceUsd === "") return { kind: "unavailable" };

  const isFresh = quote.status === "live" && Date.now() - quote.receivedAt <= QUOTE_STALE_AFTER_MS;
  const price = Number(quote.priceUsd);
  if (!isFresh || !Number.isFinite(price) || price <= 0) return { kind: "stale" };

  let quantity: number;
  if (request.mode === "usd") {
    quantity = roundQuantity(Number(request.amountUsd) / price);
  } else {
    quantity = Number(request.quantity);
  }
  if (!Number.isFinite(quantity) || quantity <= 0) return { kind: "quantity-too-small" };

  const { data, error } = await supabase.rpc("execute_paper_trade", {
    p_asset_id: asset.id,
    p_side: request.side,
    p_quantity: quantity,
    p_execution_price: price,
    p_source: source,
    p_execution_token: request.executionToken,
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
        .eq("execution_token", request.executionToken)
        .maybeSingle();
      if (existing) {
        const { data: account } = await supabase
          .from("paper_accounts")
          .select("cash_balance")
          .maybeSingle<{ cash_balance: string }>();
        return {
          kind: "duplicate",
          payload: {
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
          },
        };
      }
      return { kind: "conflict" };
    }
    if (String(error.message ?? "").includes("not authenticated")) {
      return { kind: "error" };
    }
    console.error("execute_paper_trade failed:", error.message);
    return { kind: "error" };
  }

  const rows = Array.isArray(data) ? (data as RpcRow[]) : [];
  const row = rows[0];
  if (!row) return { kind: "error" };

  const notional = roundNotional(quantity * price);
  const cashChange = request.side === "buy" ? -notional : notional;

  if (row.trade_status === "rejected") {
    return {
      kind: "rejected",
      reason: row.trade_rejection_reason ?? "Trade rejected.",
      tradeId: row.trade_id,
      cashBalance: row.resulting_cash,
    };
  }

  return {
    kind: "filled",
    payload: {
      trade: {
        id: row.trade_id,
        assetId: asset.id,
        side: request.side,
        quantity: String(quantity),
        executionPrice: quote.priceUsd,
        notionalValue: String(notional),
        cashChange: String(cashChange),
        source,
        status: "filled",
        rejectionReason: null,
      },
      cashBalance: row.resulting_cash,
      holdingQuantity: row.resulting_quantity,
    },
  };
}
