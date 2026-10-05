import { NextResponse } from "next/server";
import { claimProposalUpdate, loadProposal, type ProposalRow } from "@/lib/ai/proposals";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { executeTrade, STALE_PRICE_ERROR, UNAVAILABLE_ERROR } from "@/lib/trading/execute";
import { parseTradeRequest } from "@/lib/trading/validation";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActionBody = {
  proposalId: string;
  decision: string;
};

function parseActionBody(body: unknown): { ok: true; value: ActionBody } | { ok: false } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false };
  const record = body as Record<string, unknown>;
  if (typeof record.proposalId !== "string" || !UUID_PATTERN.test(record.proposalId)) {
    return { ok: false };
  }
  if (record.decision !== "approve" && record.decision !== "reject") return { ok: false };
  return {
    ok: true,
    value: { proposalId: record.proposalId.toLowerCase(), decision: record.decision },
  };
}

function proposalMetadata(row: ProposalRow) {
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return null;
  return meta;
}

function alreadyProcessedResponse(row: ProposalRow) {
  return NextResponse.json(
    {
      error: "This proposal has already been processed.",
      status: row.status,
      executedTradeId: row.executed_trade_id,
    },
    { status: 409 },
  );
}

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

  const parsed = parseActionBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "proposalId must be a UUID and decision must be approve or reject." },
      { status: 400 },
    );
  }
  const { proposalId, decision } = parsed.value;

  const supabase = await createClient();
  const row = await loadProposal(supabase, proposalId);
  if (!row) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  if (row.status !== "pending") {
    return alreadyProcessedResponse(row);
  }

  if (decision === "reject") {
    const claimed = await claimProposalUpdate(supabase, proposalId, ["pending"], {
      status: "rejected",
      metadata: { ...proposalMetadata(row), rejectedAt: Date.now() },
    });
    if (!claimed) {
      const current = await loadProposal(supabase, proposalId);
      if (current) return alreadyProcessedResponse(current);
    }
    return NextResponse.json({ proposalId, status: "rejected" });
  }

  const metadata = proposalMetadata(row);
  if (!metadata || typeof metadata.expiresAt !== "number") {
    await claimProposalUpdate(supabase, proposalId, ["pending"], { status: "expired" });
    return NextResponse.json({ error: "This proposal has expired." }, { status: 422 });
  }
  if (metadata.expiresAt <= Date.now()) {
    await claimProposalUpdate(supabase, proposalId, ["pending"], { status: "expired" });
    return NextResponse.json(
      { error: "This proposal has expired. Ask for a new proposal.", status: "expired" },
      { status: 422 },
    );
  }

  const tradeRequest = parseTradeRequest({
    assetId: row.asset_id,
    side: row.side,
    mode: metadata.amountType === "base" ? "quantity" : "usd",
    ...(metadata.amountType === "base"
      ? { quantity: String(metadata.amount) }
      : { amountUsd: String(metadata.amount) }),
    executionToken: proposalId,
  });
  if (!tradeRequest.ok) {
    await claimProposalUpdate(supabase, proposalId, ["pending"], {
      status: "failed",
      metadata: { ...metadata, failureReason: tradeRequest.error, failedAt: Date.now() },
    });
    return NextResponse.json({ error: tradeRequest.error, status: "failed" }, { status: 422 });
  }

  const result = await executeTrade(supabase, tradeRequest.value, "ai");

  switch (result.kind) {
    case "unknown-asset":
    case "no-pair":
      return NextResponse.json({ error: "Unknown asset requested." }, { status: 400 });
    case "unavailable":
      return NextResponse.json({ error: UNAVAILABLE_ERROR }, { status: 503 });
    case "stale":
      return NextResponse.json({ error: STALE_PRICE_ERROR }, { status: 503 });
    case "quantity-too-small":
      return NextResponse.json(
        { error: "Quantity is too small to trade at this price." },
        { status: 400 },
      );
    case "rejected": {
      await claimProposalUpdate(supabase, proposalId, ["pending"], {
        status: "failed",
        user_approved: true,
        executed_trade_id: result.tradeId,
        metadata: {
          ...metadata,
          userApprovedAt: Date.now(),
          failureReason: result.reason,
        },
      });
      return NextResponse.json(
        { error: result.reason, status: "failed", cashBalance: result.cashBalance },
        { status: 422 },
      );
    }
    case "duplicate": {
      await claimProposalUpdate(supabase, proposalId, ["pending"], {
        status: "executed",
        user_approved: true,
        executed_trade_id: result.payload.trade.id,
        metadata: {
          ...metadata,
          userApprovedAt: Date.now(),
          executionPrice: result.payload.trade.executionPrice,
          executedAt: Date.now(),
        },
      });
      return NextResponse.json({
        proposalId,
        status: "executed",
        ...result.payload,
      });
    }
    case "conflict":
      return NextResponse.json({ error: "This proposal was already executed." }, { status: 409 });
    case "error":
      return NextResponse.json({ error: "Trade could not be executed." }, { status: 500 });
    case "filled": {
      const claimed = await claimProposalUpdate(supabase, proposalId, ["pending"], {
        status: "executed",
        user_approved: true,
        executed_trade_id: result.payload.trade.id,
        metadata: {
          ...metadata,
          userApprovedAt: Date.now(),
          executionPrice: result.payload.trade.executionPrice,
          executedAt: Date.now(),
          cashBalance: result.payload.cashBalance,
        },
      });
      if (!claimed) {
        const current = await loadProposal(supabase, proposalId);
        if (current && current.status !== "executed") {
          return alreadyProcessedResponse(current);
        }
      }
      return NextResponse.json({
        proposalId,
        status: "executed",
        ...result.payload,
      });
    }
  }
}
