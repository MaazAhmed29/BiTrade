import {
  BINANCE_REST_BASE_URL,
  CANDLE_INTERVALS,
  CANDLE_REQUEST_LIMIT_DEFAULT,
  CANDLE_REQUEST_LIMIT_MAX,
  MARKET_DATA_SOURCE,
  STABLE_REFERENCE_USD,
} from "@/config/market";
import { SUPPORTED_ASSETS, getAssetById, type SupportedAsset } from "@/config/assets";
import type { Candle, MarketQuote } from "@/types/market";
import type { MarketDataProvider } from "@/lib/market-data/provider";

type BinanceTicker24hr = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
  closeTime: number;
};

type BinanceKline = [string, string, string, string, string, string, number, ...unknown[]];

const REQUEST_TIMEOUT_MS = 10_000;

async function binanceGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BINANCE_REST_BASE_URL}${path}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Binance market data request failed.");
  }
  if (!response.ok) {
    throw new Error(`Binance market data request failed with status ${response.status}.`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Binance returned an unreadable response.");
  }
}

function unavailableQuote(asset: SupportedAsset, receivedAt: number): MarketQuote {
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    pair: asset.pair,
    priceUsd: "",
    change24hPercent: null,
    high24hUsd: null,
    low24hUsd: null,
    volume24hUsd: null,
    marketTimestamp: 0,
    receivedAt,
    source: MARKET_DATA_SOURCE,
    status: "unavailable",
  };
}

function stableReferenceQuote(asset: SupportedAsset, receivedAt: number): MarketQuote {
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    pair: null,
    priceUsd: STABLE_REFERENCE_USD,
    change24hPercent: null,
    high24hUsd: null,
    low24hUsd: null,
    volume24hUsd: null,
    marketTimestamp: receivedAt,
    receivedAt,
    source: MARKET_DATA_SOURCE,
    status: "live",
  };
}

function normalizeTicker(
  asset: SupportedAsset,
  row: BinanceTicker24hr,
  receivedAt: number,
): MarketQuote {
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    pair: asset.pair,
    priceUsd: row.lastPrice,
    change24hPercent: row.priceChangePercent,
    high24hUsd: row.highPrice,
    low24hUsd: row.lowPrice,
    volume24hUsd: row.quoteVolume,
    marketTimestamp: Number.isFinite(row.closeTime) ? row.closeTime : receivedAt,
    receivedAt,
    source: MARKET_DATA_SOURCE,
    status: "live",
  };
}

function normalizeKline(row: BinanceKline): Candle {
  return {
    openTime: Number(row[0]),
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: row[5],
    closeTime: Number(row[6]),
  };
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  async getSnapshot(assetIds: string[]): Promise<MarketQuote[]> {
    const assets = assetIds
      .map((id) => getAssetById(id))
      .filter((asset): asset is SupportedAsset => Boolean(asset));

    if (assets.length === 0) {
      throw new Error("No supported assets requested.");
    }

    const receivedAt = Date.now();
    const tradable = assets.filter((asset) => asset.pair !== null);
    const quotes = new Map<string, MarketQuote>();

    if (tradable.length > 0) {
      const assetByPair = new Map(
        tradable
          .filter((asset) => asset.pair !== null)
          .map((asset) => [asset.pair as string, asset]),
      );
      const query = encodeURIComponent(JSON.stringify([...assetByPair.keys()]));
      const rows = await binanceGet<BinanceTicker24hr[]>(`/ticker/24hr?symbols=${query}`);

      for (const row of rows) {
        const asset = assetByPair.get(row.symbol);
        if (!asset) continue;
        quotes.set(asset.id, normalizeTicker(asset, row, receivedAt));
      }
    }

    for (const asset of assets) {
      if (quotes.has(asset.id)) continue;
      quotes.set(
        asset.id,
        asset.stableReference
          ? stableReferenceQuote(asset, receivedAt)
          : unavailableQuote(asset, receivedAt),
      );
    }

    return assets.map((asset) => quotes.get(asset.id) as MarketQuote);
  }

  async getCandles(assetId: string, interval: string, limit: number): Promise<Candle[]> {
    const asset = getAssetById(assetId);
    if (!asset) throw new Error("Unsupported asset.");
    if (!asset.pair) throw new Error("This asset has no market pair for candle data.");
    if (!(CANDLE_INTERVALS as readonly string[]).includes(interval)) {
      throw new Error("Unsupported candle interval.");
    }
    const safeLimit = Math.min(
      Math.max(Math.floor(limit) || CANDLE_REQUEST_LIMIT_DEFAULT, 1),
      CANDLE_REQUEST_LIMIT_MAX,
    );

    const rows = await binanceGet<BinanceKline[]>(
      `/klines?symbol=${asset.pair}&interval=${interval}&limit=${safeLimit}`,
    );

    return rows.map(normalizeKline);
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  return new BinanceMarketDataProvider();
}

export const ALL_ASSET_IDS: string[] = SUPPORTED_ASSETS.map((asset) => asset.id);
