import { NextResponse } from "next/server";
import { isSupportedAssetId } from "@/config/assets";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { listTrades } from "@/lib/trading/portfolio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const rawLimit = searchParams.get("limit") ?? "50";
  if (!/^\d+$/.test(rawLimit)) {
    return NextResponse.json({ error: "Limit must be a positive integer." }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(rawLimit), 1), 200);

  const rawAsset = searchParams.get("asset");
  if (rawAsset !== null && !isSupportedAssetId(rawAsset)) {
    return NextResponse.json({ error: "Unknown asset requested." }, { status: 400 });
  }

  const supabase = await createClient();
  const trades = await listTrades(supabase, { limit, assetId: rawAsset ?? undefined });

  return NextResponse.json({ trades }, { headers: { "Cache-Control": "private, no-store" } });
}
