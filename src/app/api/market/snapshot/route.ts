import { NextResponse } from "next/server";
import { SUPPORTED_ASSET_IDS, getAssetById, isSupportedAssetId } from "@/config/assets";
import { createMarketDataProvider } from "@/lib/market-data/binance";
import type { MarketQuote } from "@/types/market";

export const dynamic = "force-dynamic";

function unavailableFor(assetIds: string[]): MarketQuote[] {
  const receivedAt = Date.now();
  return assetIds.map((assetId) => ({
    assetId,
    symbol: getAssetById(assetId)?.symbol ?? "",
    pair: null,
    priceUsd: "",
    change24hPercent: null,
    high24hUsd: null,
    low24hUsd: null,
    volume24hUsd: null,
    marketTimestamp: 0,
    receivedAt,
    source: "binance" as const,
    status: "unavailable" as const,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawAssets = searchParams.get("assets");

  let assetIds: string[] = [...SUPPORTED_ASSET_IDS];
  if (rawAssets !== null) {
    assetIds = rawAssets
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (assetIds.length === 0 || !assetIds.every(isSupportedAssetId)) {
      return NextResponse.json({ error: "Unknown asset requested." }, { status: 400 });
    }
  }

  try {
    const provider = createMarketDataProvider();
    const quotes = await provider.getSnapshot(assetIds);
    return NextResponse.json(
      { quotes },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
          "Vercel-CDN-Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { quotes: unavailableFor(assetIds), error: "Market data is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
