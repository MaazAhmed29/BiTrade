import type { SupabaseClient } from "@supabase/supabase-js";
import { ASSETS_BY_ID, ASSETS_BY_SYMBOL } from "@/config/assets";
import { QUOTE_STALE_AFTER_MS } from "@/config/market";
import { createMarketDataProvider } from "@/lib/market-data/binance";
import {
  MAX_ORDER_USD,
  MAX_QUANTITY,
  MIN_ORDER_USD,
  roundQuantity,
} from "@/lib/trading/validation";

export const PROPOSAL_TTL_MS = 90_000;
export const PROPOSAL_ACTION_TYPE = "trade_proposal";

export type ProposalStatus = "pending" | "rejected" | "expired" | "executed" | "failed";

export type TradeProposal = {
  proposalId: string;
  action: "buy" | "sell";
  assetId: string;
  symbol: string;
  amountType: "quote" | "base";
  amount: string;
  marketPrice: string;
  estimatedQuantity: string;
  estimatedNotional: string;
  createdAt: number;
  expiresAt: number;
};

export type ProposalRow = {
  id: string;
  asset_id: string;
  side: string;
  quantity: string;
  quote_amount: string;
  status: string;
  user_approved: boolean;
  created_at: string;
  executed_trade_id: string | null;
  metadata: TradeProposal | null;
};

export type CreateProposalInput = {
  action: string;
  assetId: string;
  amountType: string;
  amount: string | number;
};

export type CreateProposalResult =
  { ok: true; proposal: TradeProposal } | { ok: false; error: string };

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export const PROPOSAL_COLUMNS =
  "id, asset_id, side, quantity, quote_amount, status, user_approved, created_at, executed_trade_id, metadata";

export function resolveProposalAsset(raw: unknown) {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().toLowerCase();
  return ASSETS_BY_ID.get(value) ?? ASSETS_BY_SYMBOL.get(value.toUpperCase());
}

export async function createProposal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProposalInput,
): Promise<CreateProposalResult> {
  if (input.action !== "buy" && input.action !== "sell") {
    return { ok: false, error: "Action must be buy or sell." };
  }
  if (input.amountType !== "quote" && input.amountType !== "base") {
    return { ok: false, error: "Amount type must be quote (dollars) or base (coin quantity)." };
  }

  const asset = resolveProposalAsset(input.assetId);
  if (!asset) {
    return { ok: false, error: "Unknown asset. Use an id from the supported asset list." };
  }
  if (!asset.pair) {
    return { ok: false, error: `${asset.name} cannot be traded because it has no market pair.` };
  }

  const amount = String(input.amount).trim();
  if (!DECIMAL_PATTERN.test(amount)) {
    return { ok: false, error: "Amount must be a positive decimal number." };
  }
  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  const maxAmount = input.amountType === "quote" ? MAX_ORDER_USD : MAX_QUANTITY;
  if (amountNumber > maxAmount) {
    return { ok: false, error: "Amount exceeds the maximum allowed value." };
  }

  let quote;
  try {
    [quote] = await createMarketDataProvider().getSnapshot([asset.id]);
  } catch {
    return { ok: false, error: "Market data is temporarily unavailable. Try again shortly." };
  }
  if (!quote || quote.priceUsd === "") {
    return { ok: false, error: "Market data is temporarily unavailable. Try again shortly." };
  }

  const price = Number(quote.priceUsd);
  const isFresh = quote.status === "live" && Date.now() - quote.receivedAt <= QUOTE_STALE_AFTER_MS;
  if (!isFresh || !Number.isFinite(price) || price <= 0) {
    return {
      ok: false,
      error:
        "Price data is stale. Trading is temporarily disabled until a fresh market price is available.",
    };
  }

  const quantity =
    input.amountType === "quote" ? roundQuantity(amountNumber / price) : amountNumber;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Amount is too small to trade at this price." };
  }

  const notional = Number((quantity * price).toFixed(8));
  if (input.amountType === "quote" && amountNumber < MIN_ORDER_USD) {
    return { ok: false, error: `Minimum order size is $${MIN_ORDER_USD}.` };
  }
  if (notional < MIN_ORDER_USD) {
    return { ok: false, error: `Minimum order size is $${MIN_ORDER_USD}.` };
  }

  const now = Date.now();
  const proposal: TradeProposal = {
    proposalId: crypto.randomUUID(),
    action: input.action,
    assetId: asset.id,
    symbol: asset.symbol,
    amountType: input.amountType,
    amount,
    marketPrice: quote.priceUsd,
    estimatedQuantity: String(quantity),
    estimatedNotional: String(notional),
    createdAt: now,
    expiresAt: now + PROPOSAL_TTL_MS,
  };

  const { error } = await supabase.from("ai_action_logs").insert({
    id: proposal.proposalId,
    user_id: userId,
    action_type: PROPOSAL_ACTION_TYPE,
    asset_id: proposal.assetId,
    side: proposal.action,
    quantity: proposal.estimatedQuantity,
    quote_amount: proposal.estimatedNotional,
    status: "pending",
    user_approved: false,
    metadata: proposal,
  });

  if (error) {
    console.error("createProposal insert failed:", error.message);
    return { ok: false, error: "Proposal could not be created right now." };
  }

  return { ok: true, proposal };
}

export async function loadProposal(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<ProposalRow | null> {
  const { data } = await supabase
    .from("ai_action_logs")
    .select(PROPOSAL_COLUMNS)
    .eq("id", proposalId)
    .eq("action_type", PROPOSAL_ACTION_TYPE)
    .maybeSingle<ProposalRow>();
  return data ?? null;
}

export async function claimProposalUpdate(
  supabase: SupabaseClient,
  proposalId: string,
  fromStatuses: ProposalStatus[],
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ai_action_logs")
    .update(patch)
    .eq("id", proposalId)
    .in("status", fromStatuses)
    .select("id");
  if (error) {
    console.error("claimProposalUpdate failed:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
