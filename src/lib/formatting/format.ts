const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "Unavailable";
  return currencyFormatter.format(numeric);
}

export function formatPercent(value: string | number, fractionDigits = 2): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "Unavailable";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(fractionDigits)}%`;
}

export function formatCompactNumber(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "Unavailable";
  return compactFormatter.format(numeric);
}

export function formatCryptoQuantity(value: string | number, decimals = 8): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "Unavailable";
  if (numeric === 0) return "0";
  if (Math.abs(numeric) < 0.0001) return numeric.toExponential(4);
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatTimestamp(epochMs: number): string {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return "Unavailable";
  return new Date(epochMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
