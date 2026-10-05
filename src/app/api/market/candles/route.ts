import { NextResponse } from "next/server";
import { SUPPORTED_ASSETS, type SupportedAsset } from "@/config/assets";
import {
  CANDLE_INTERVALS,
  CANDLE_REQUEST_LIMIT_DEFAULT,
  CANDLE_REQUEST_LIMIT_MAX,
  DEFAULT_CANDLE_INTERVAL,
  MARKET_CANDLE_CACHE_MS,
} from "@/config/market";
import { createMarketDataProvider } from "@/lib/market-data/binance";

export const dynamic = "force-dynamic";

function resolveAsset(raw: string): SupportedAsset | undefined {
  const key = raw.trim().toLowerCase();
  return SUPPORTED_ASSETS.find((asset) => asset.id === key || asset.symbol.toLowerCase() === key);
}

function badRequest(message: string) {
  return NextResponse.json({ candles: [], error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawAsset = searchParams.get("asset");
  if (!rawAsset) return badRequest("Asset is required.");
  const asset = resolveAsset(rawAsset);
  if (!asset) return badRequest("Unknown asset requested.");
  if (!asset.pair) return badRequest("This asset has no market pair for candle data.");

  const rawInterval = searchParams.get("interval") ?? DEFAULT_CANDLE_INTERVAL;
  if (!(CANDLE_INTERVALS as readonly string[]).includes(rawInterval)) {
    return badRequest("Unsupported candle interval.");
  }

  const rawLimit = searchParams.get("limit");
  let limit = CANDLE_REQUEST_LIMIT_DEFAULT;
  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit)) return badRequest("Limit must be a positive integer.");
    limit = Math.min(Math.max(Number(rawLimit), 1), CANDLE_REQUEST_LIMIT_MAX);
  }

  try {
    const provider = createMarketDataProvider();
    const candles = await provider.getCandles(asset.id, rawInterval, limit);
    return NextResponse.json(
      { candles },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${MARKET_CANDLE_CACHE_MS / 1000}, stale-while-revalidate=60`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { candles: [], error: "Market data is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
