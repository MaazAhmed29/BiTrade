import { QUOTE_STALE_AFTER_MS } from "@/config/market";
import type { SupportedAsset } from "@/config/assets";
import type { MarketQuote, MarketQuoteStatus } from "@/types/market";

export function quoteStatus(
  quote: MarketQuote | undefined,
  asset: SupportedAsset | undefined,
  now: number,
): MarketQuoteStatus {
  if (!quote || quote.priceUsd === "") return "unavailable";
  if (asset?.stableReference) return "live";
  if (now - quote.receivedAt <= QUOTE_STALE_AFTER_MS) return "live";
  return "stale";
}
