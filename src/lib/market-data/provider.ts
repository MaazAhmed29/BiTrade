import type { Candle, MarketQuote } from "@/types/market";

export interface MarketDataProvider {
  getSnapshot(assetIds: string[]): Promise<MarketQuote[]>;
  getCandles(assetId: string, interval: string, limit: number): Promise<Candle[]>;
}
