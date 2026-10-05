export type TradeSide = "buy" | "sell";
export type TradeInputMode = "usd" | "quantity";

export type TradeRequest = {
  assetId: string;
  side: TradeSide;
  mode: TradeInputMode;
  amountUsd?: string;
  quantity?: string;
  executionToken: string;
};

export const MIN_ORDER_USD = 1;
export const MAX_ORDER_USD = 100_000_000;
export const MAX_QUANTITY = 1_000_000_000_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITIVE_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

type ParseResult = { ok: true; value: TradeRequest } | { ok: false; error: string };

function parsePositiveDecimal(
  raw: unknown,
  label: string,
  maxValue: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !POSITIVE_DECIMAL_PATTERN.test(raw)) {
    return { ok: false, error: `${label} must be a positive decimal number.` };
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { ok: false, error: `${label} must be greater than zero.` };
  }
  if (numeric > maxValue) {
    return { ok: false, error: `${label} exceeds the maximum allowed value.` };
  }
  return { ok: true, value: raw };
}

export function parseTradeRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object." };
  }
  const record = body as Record<string, unknown>;

  if (typeof record.assetId !== "string" || record.assetId.trim().length === 0) {
    return { ok: false, error: "Asset is required." };
  }
  if (record.side !== "buy" && record.side !== "sell") {
    return { ok: false, error: "Side must be buy or sell." };
  }
  if (record.mode !== "usd" && record.mode !== "quantity") {
    return { ok: false, error: "Mode must be usd or quantity." };
  }
  if (typeof record.executionToken !== "string" || !UUID_PATTERN.test(record.executionToken)) {
    return { ok: false, error: "Execution token must be a valid UUID." };
  }

  if (record.mode === "usd") {
    const amount = parsePositiveDecimal(record.amountUsd, "Amount", MAX_ORDER_USD);
    if (!amount.ok) return { ok: false, error: amount.error };
    return {
      ok: true,
      value: {
        assetId: record.assetId.trim(),
        side: record.side,
        mode: "usd",
        amountUsd: amount.value,
        executionToken: record.executionToken.toLowerCase(),
      },
    };
  }

  const quantity = parsePositiveDecimal(record.quantity, "Quantity", MAX_QUANTITY);
  if (!quantity.ok) return { ok: false, error: quantity.error };
  return {
    ok: true,
    value: {
      assetId: record.assetId.trim(),
      side: record.side,
      mode: "quantity",
      quantity: quantity.value,
      executionToken: record.executionToken.toLowerCase(),
    },
  };
}

export function roundQuantity(value: number): number {
  return Math.floor(value * 1e12) / 1e12;
}
