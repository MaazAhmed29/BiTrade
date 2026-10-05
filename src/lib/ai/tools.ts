import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPPORTED_ASSETS, getAssetById } from "@/config/assets";
import { ALL_ASSET_IDS, createMarketDataProvider } from "@/lib/market-data/binance";
import { loadPortfolioValuation, listTrades } from "@/lib/trading/portfolio";
import { createProposal, resolveProposalAsset, type TradeProposal } from "@/lib/ai/proposals";
import type { AIToolDefinition } from "@/lib/ai/types";

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    name: "get_market_quote",
    description: "Get the current market price and 24 hour stats for one supported asset.",
    parameters: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset id from the supported list, for example bitcoin.",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "get_market_quotes",
    description: "Get current market prices and 24 hour stats for all supported assets.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_user_portfolio",
    description:
      "Get the signed in user's paper portfolio: cash balance, holdings, totals, and profit and loss.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_user_balance",
    description: "Get the signed in user's paper cash balance.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_user_holdings",
    description: "Get the signed in user's paper holdings with quantities and valuations.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_trade_history",
    description: "Get the signed in user's most recent paper trades, newest first.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "How many trades to return, from 1 to 20. Default 10.",
        },
      },
    },
  },
  {
    name: "create_trade_proposal",
    description:
      "Create a paper trade proposal for the user to approve or reject. This never executes a trade by itself.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["buy", "sell"], description: "buy or sell." },
        assetId: {
          type: "string",
          description: "Asset id from the supported list, for example bitcoin.",
        },
        amountType: {
          type: "string",
          enum: ["quote", "base"],
          description: "quote for a dollar amount, base for a coin quantity (for example 0.2 ETH).",
        },
        amount: {
          type: "string",
          description: "Positive decimal amount as a string, for example 50 or 0.2.",
        },
      },
      required: ["action", "assetId", "amountType", "amount"],
    },
  },
];

export type AiToolContext = {
  supabase: SupabaseClient;
  userId: string;
};

export type AiToolExecution = {
  result: Record<string, unknown>;
  proposal?: TradeProposal;
};

function quoteView(quote: {
  assetId: string;
  symbol: string;
  priceUsd: string;
  change24hPercent: string | null;
  high24hUsd: string | null;
  low24hUsd: string | null;
  volume24hUsd: string | null;
  status: string;
  receivedAt: number;
}) {
  const asset = getAssetById(quote.assetId);
  return {
    assetId: quote.assetId,
    name: asset?.name ?? quote.assetId,
    symbol: quote.symbol,
    priceUsd: quote.priceUsd,
    change24hPercent: quote.change24hPercent,
    high24hUsd: quote.high24hUsd,
    low24hUsd: quote.low24hUsd,
    volume24hUsd: quote.volume24hUsd,
    status: quote.status,
    receivedAt: quote.receivedAt,
  };
}

export async function executeAiTool(
  rawName: string,
  args: Record<string, unknown>,
  ctx: AiToolContext,
): Promise<AiToolExecution> {
  const name = rawName.startsWith("default_api:") ? rawName.slice("default_api:".length) : rawName;

  if (name === "get_market_quotes") {
    try {
      const quotes = await createMarketDataProvider().getSnapshot(ALL_ASSET_IDS);
      return { result: { quotes: quotes.map(quoteView) } };
    } catch {
      return { result: { error: "Market data is temporarily unavailable." } };
    }
  }

  if (name === "get_market_quote") {
    const asset = resolveProposalAsset(args.assetId);
    if (!asset) {
      return { result: { error: "Unknown asset. Use an id from the supported asset list." } };
    }
    try {
      const [quote] = await createMarketDataProvider().getSnapshot([asset.id]);
      if (!quote || quote.priceUsd === "") {
        return { result: { error: "Market data is temporarily unavailable for this asset." } };
      }
      return { result: { quote: quoteView(quote) } };
    } catch {
      return { result: { error: "Market data is temporarily unavailable." } };
    }
  }

  if (name === "get_user_portfolio") {
    const portfolio = await loadPortfolioValuation(ctx.supabase);
    if (!portfolio) {
      return { result: { error: "The paper account could not be loaded." } };
    }
    return {
      result: {
        portfolio: {
          cashBalance: portfolio.cashBalance,
          marketValue: portfolio.marketValue,
          totalValue: portfolio.totalValue,
          unrealizedPnl: portfolio.unrealizedPnl,
          realizedPnl: portfolio.realizedPnl,
          profitLoss: portfolio.profitLoss,
          returnPercent: portfolio.returnPercent,
          valuationStatus: portfolio.valuationStatus,
          holdings: portfolio.holdings.map((holding) => ({
            assetId: holding.assetId,
            symbol: getAssetById(holding.assetId)?.symbol ?? holding.assetId,
            quantity: holding.quantity,
            averageEntryPrice: holding.averageEntryPrice,
            marketValue: holding.marketValue,
            unrealizedPnl: holding.unrealizedPnl,
            status: holding.status,
          })),
        },
      },
    };
  }

  if (name === "get_user_balance") {
    const portfolio = await loadPortfolioValuation(ctx.supabase);
    if (!portfolio) {
      return { result: { error: "The paper account could not be loaded." } };
    }
    return {
      result: { cashBalance: portfolio.cashBalance, initialBalance: portfolio.initialBalance },
    };
  }

  if (name === "get_user_holdings") {
    const portfolio = await loadPortfolioValuation(ctx.supabase);
    if (!portfolio) {
      return { result: { error: "The paper account could not be loaded." } };
    }
    return {
      result: {
        holdings: portfolio.holdings.map((holding) => ({
          assetId: holding.assetId,
          symbol: getAssetById(holding.assetId)?.symbol ?? holding.assetId,
          quantity: holding.quantity,
          averageEntryPrice: holding.averageEntryPrice,
          marketValue: holding.marketValue,
          unrealizedPnl: holding.unrealizedPnl,
          status: holding.status,
        })),
      },
    };
  }

  if (name === "get_trade_history") {
    const rawLimit = Number(args.limit ?? 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 20) : 10;
    const trades = await listTrades(ctx.supabase, { limit });
    return {
      result: {
        trades: trades.map((trade) => ({
          assetId: trade.assetId,
          symbol: getAssetById(trade.assetId)?.symbol ?? trade.assetId,
          side: trade.side,
          quantity: trade.quantity,
          executionPrice: trade.executionPrice,
          notionalValue: trade.notionalValue,
          source: trade.source,
          status: trade.status,
          rejectionReason: trade.rejectionReason,
          createdAt: trade.createdAt,
        })),
      },
    };
  }

  if (name === "create_trade_proposal") {
    const created = await createProposal(ctx.supabase, ctx.userId, {
      action: String(args.action ?? ""),
      assetId: String(args.assetId ?? ""),
      amountType: String(args.amountType ?? ""),
      amount: typeof args.amount === "number" ? String(args.amount) : String(args.amount ?? ""),
    });
    if (!created.ok) return { result: { error: created.error } };
    return { result: { proposal: created.proposal }, proposal: created.proposal };
  }

  return { result: { error: `Unknown tool: ${name}` } };
}

export const SUPPORTED_ASSET_IDS_FOR_PROMPT = SUPPORTED_ASSETS.map((asset) => asset.id);
