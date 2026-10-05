import type { Candle, MarketQuote } from "@/types/market";

export async function requestSnapshot(assetIds?: string[]): Promise<MarketQuote[]> {
  const query =
    assetIds && assetIds.length > 0 ? `?assets=${encodeURIComponent(assetIds.join(","))}` : "";
  const response = await fetch(`/api/market/snapshot${query}`, { cache: "no-store" });

  if (response.status === 503) {
    throw new Error("Market data is temporarily unavailable.");
  }
  if (!response.ok) {
    throw new Error("Market snapshot request failed.");
  }

  const payload = (await response.json()) as { quotes?: unknown };
  if (!Array.isArray(payload.quotes)) {
    throw new Error("Market snapshot response was invalid.");
  }
  return payload.quotes as MarketQuote[];
}

export async function requestCandles(
  assetKey: string,
  interval: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const params = new URLSearchParams({ asset: assetKey, interval, limit: String(limit) });
  const response = await fetch(`/api/market/candles?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (response.status === 503) {
    throw new Error("Market data is temporarily unavailable.");
  }
  if (!response.ok) {
    let message = "Candle request failed.";
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string") message = payload.error;
    } catch {
      // Keep the generic message when the body is unreadable.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { candles?: unknown };
  if (!Array.isArray(payload.candles)) {
    throw new Error("Candle response was invalid.");
  }
  return payload.candles as Candle[];
}
