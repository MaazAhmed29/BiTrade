import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTradeRequest } from "@/lib/trading/validation";
import { executeTrade, STALE_PRICE_ERROR, UNAVAILABLE_ERROR } from "@/lib/trading/execute";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseTradeRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await executeTrade(supabase, parsed.value, "manual");

  switch (result.kind) {
    case "unknown-asset":
      return NextResponse.json({ error: "Unknown asset requested." }, { status: 400 });
    case "no-pair":
      return NextResponse.json(
        { error: "This asset has no market pair for a trade price." },
        { status: 400 },
      );
    case "unavailable":
      return NextResponse.json({ error: UNAVAILABLE_ERROR }, { status: 503 });
    case "stale":
      return NextResponse.json({ error: STALE_PRICE_ERROR }, { status: 503 });
    case "quantity-too-small":
      return NextResponse.json(
        { error: "Quantity is too small to trade at this price." },
        { status: 400 },
      );
    case "rejected":
      return NextResponse.json(
        {
          error: result.reason,
          tradeId: result.tradeId,
          cashBalance: result.cashBalance,
          status: "rejected",
        },
        { status: 422 },
      );
    case "duplicate":
      return NextResponse.json(result.payload);
    case "conflict":
      return NextResponse.json({ error: "This order was already executed." }, { status: 409 });
    case "error":
      return NextResponse.json({ error: "Trade could not be executed." }, { status: 500 });
    case "filled":
      return NextResponse.json(result.payload);
  }
}
