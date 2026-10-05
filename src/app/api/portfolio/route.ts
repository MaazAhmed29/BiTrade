import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPortfolioValuation } from "@/lib/trading/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = await createClient();
  let portfolio = await loadPortfolioValuation(supabase);

  if (!portfolio) {
    await supabase.rpc("initialize_paper_account");
    portfolio = await loadPortfolioValuation(supabase);
  }
  if (!portfolio) {
    return NextResponse.json({ error: "Paper account unavailable." }, { status: 500 });
  }

  return NextResponse.json({ portfolio }, { headers: { "Cache-Control": "private, no-store" } });
}
