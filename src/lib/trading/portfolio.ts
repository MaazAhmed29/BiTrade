import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssetById } from "@/config/assets";
import { QUOTE_STALE_AFTER_MS } from "@/config/market";
import { createMarketDataProvider } from "@/lib/market-data/binance";
import type { MarketQuote } from "@/types/market";

export type HoldingStatus = "live" | "stale" | "unavailable";

export type HoldingValuation = {
  assetId: string;
  quantity: string;
  averageEntryPrice: string;
  realizedPnl: string;
  costBasis: string;
  currentPrice: string | null;
  marketValue: string | null;
  unrealizedPnl: string | null;
  status: HoldingStatus;
};

export type ValuationStatus = "ok" | "partial" | "unavailable";

export type PortfolioValuation = {
  initialBalance: string;
  cashBalance: string;
  holdings: HoldingValuation[];
  marketValue: string;
  totalValue: string;
  unrealizedPnl: string;
  realizedPnl: string;
  profitLoss: string;
  returnPercent: string;
  valuationStatus: ValuationStatus;
  unavailableAssetIds: string[];
  staleAssetIds: string[];
  pricedAt: number | null;
};

export type TradeRecord = {
  id: string;
  assetId: string;
  side: "buy" | "sell";
  quantity: string;
  executionPrice: string;
  notionalValue: string;
  fee: string;
  cashChange: string;
  source: "manual" | "ai";
  status: "filled" | "rejected";
  rejectionReason: string | null;
  executionToken: string | null;
  createdAt: string;
};

type AccountRow = { initial_balance: string; cash_balance: string };

type HoldingRow = {
  asset_id: string;
  quantity: string;
  average_entry_price: string;
  realized_pnl: string;
};

type TradeRow = {
  id: string;
  asset_id: string;
  side: string;
  quantity: string;
  execution_price: string;
  notional_value: string;
  fee: string;
  cash_change: string;
  source: string;
  status: string;
  rejection_reason: string | null;
  execution_token: string | null;
  created_at: string;
};

function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function quoteStatusFor(quote: MarketQuote, stableReference: boolean): HoldingStatus {
  if (stableReference) return "live";
  if (Date.now() - quote.receivedAt <= QUOTE_STALE_AFTER_MS) return "live";
  return "stale";
}

export async function loadPortfolioValuation(
  supabase: SupabaseClient,
): Promise<PortfolioValuation | null> {
  const { data: account, error: accountError } = await supabase
    .from("paper_accounts")
    .select("initial_balance, cash_balance")
    .maybeSingle<AccountRow>();

  if (accountError || !account) return null;

  const { data: holdingRows, error: holdingsError } = await supabase
    .from("holdings")
    .select("asset_id, quantity, average_entry_price, realized_pnl")
    .order("asset_id")
    .returns<HoldingRow[]>();

  if (holdingsError) return null;

  const rows = (holdingRows ?? []).filter((row) => Number(row.quantity) > 0);

  let quotes: Map<string, MarketQuote> | null = null;
  if (rows.length > 0) {
    try {
      const snapshot = await createMarketDataProvider().getSnapshot(
        rows.map((row) => row.asset_id),
      );
      quotes = new Map(snapshot.map((quote) => [quote.assetId, quote]));
    } catch {
      quotes = null;
    }
  }

  const unavailableAssetIds: string[] = [];
  const staleAssetIds: string[] = [];
  let marketValueTotal = 0;
  let unrealizedTotal = 0;
  let realizedTotal = 0;

  const holdings: HoldingValuation[] = rows.map((row) => {
    const asset = getAssetById(row.asset_id);
    const quantity = Number(row.quantity);
    const averageEntry = Number(row.average_entry_price);
    const costBasis = quantity * averageEntry;
    realizedTotal += Number(row.realized_pnl);

    const quote = quotes?.get(row.asset_id);
    const usable = Boolean(asset) && quote !== undefined && quote.priceUsd !== "";
    if (!usable || !asset) {
      unavailableAssetIds.push(row.asset_id);
      return {
        assetId: row.asset_id,
        quantity: row.quantity,
        averageEntryPrice: row.average_entry_price,
        realizedPnl: money(Number(row.realized_pnl)),
        costBasis: money(costBasis),
        currentPrice: null,
        marketValue: null,
        unrealizedPnl: null,
        status: "unavailable" as const,
      };
    }

    const status = quoteStatusFor(quote, asset.stableReference);
    if (status === "stale") staleAssetIds.push(row.asset_id);

    const marketValue = quantity * Number(quote.priceUsd);
    const unrealized = marketValue - costBasis;
    marketValueTotal += marketValue;
    unrealizedTotal += unrealized;

    return {
      assetId: row.asset_id,
      quantity: row.quantity,
      averageEntryPrice: row.average_entry_price,
      realizedPnl: money(Number(row.realized_pnl)),
      costBasis: money(costBasis),
      currentPrice: quote.priceUsd,
      marketValue: money(marketValue),
      unrealizedPnl: money(unrealized),
      status,
    };
  });

  const cash = Number(account.cash_balance);
  const initial = Number(account.initial_balance);
  const totalValue = cash + marketValueTotal;
  const profitLoss = totalValue - initial;
  const returnPercent = initial > 0 ? (profitLoss / initial) * 100 : 0;

  let valuationStatus: ValuationStatus = "ok";
  if (holdings.length > 0 && unavailableAssetIds.length === holdings.length) {
    valuationStatus = "unavailable";
  } else if (unavailableAssetIds.length > 0 || staleAssetIds.length > 0) {
    valuationStatus = "partial";
  }

  return {
    initialBalance: money(initial),
    cashBalance: money(cash),
    holdings,
    marketValue: money(marketValueTotal),
    totalValue: money(totalValue),
    unrealizedPnl: money(unrealizedTotal),
    realizedPnl: money(realizedTotal),
    profitLoss: money(profitLoss),
    returnPercent: money(returnPercent),
    valuationStatus,
    unavailableAssetIds,
    staleAssetIds,
    pricedAt: quotes && quotes.size > 0 ? Date.now() : null,
  };
}

export async function listTrades(
  supabase: SupabaseClient,
  options: { limit: number; assetId?: string },
): Promise<TradeRecord[]> {
  let query = supabase
    .from("trades")
    .select(
      "id, asset_id, side, quantity, execution_price, notional_value, fee, cash_change, source, status, rejection_reason, execution_token, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.assetId) query = query.eq("asset_id", options.assetId);

  const { data, error } = await query.returns<TradeRow[]>();
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    side: row.side === "sell" ? "sell" : "buy",
    quantity: row.quantity,
    executionPrice: row.execution_price,
    notionalValue: row.notional_value,
    fee: row.fee,
    cashChange: row.cash_change,
    source: row.source === "ai" ? "ai" : "manual",
    status: row.status === "rejected" ? "rejected" : "filled",
    rejectionReason: row.rejection_reason,
    executionToken: row.execution_token,
    createdAt: row.created_at,
  }));
}
