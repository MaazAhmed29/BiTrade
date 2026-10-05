import type { MARKET_DATA_SOURCE } from "@/config/market";

export type MarketSource = typeof MARKET_DATA_SOURCE;

export type MarketQuoteStatus = "live" | "stale" | "unavailable";

export type MarketQuote = {
  assetId: string;
  symbol: string;
  pair: string | null;
  priceUsd: string;
  change24hPercent: string | null;
  high24hUsd: string | null;
  low24hUsd: string | null;
  volume24hUsd: string | null;
  marketTimestamp: number;
  receivedAt: number;
  source: MarketSource;
  status: MarketQuoteStatus;
};

export type Candle = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
};
