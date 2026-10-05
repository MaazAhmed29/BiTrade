import type { MarketQuote } from "@/types/market";

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
