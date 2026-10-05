"use client";

import { getAssetById } from "@/config/assets";
import { AssetBadge } from "@/components/asset-badge";
import { useMarketFeed } from "@/features/markets/market-feed-context";
import { quoteStatus } from "@/features/markets/quote-status";
import {
  formatCompactNumber,
  formatPercent,
  formatTimestamp,
  formatUsdPrice,
} from "@/lib/formatting/format";

const statusLabels = {
  live: "Live",
  stale: "Stale",
  unavailable: "Unavailable",
} as const;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-xs text-[var(--color-text-faint)]">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

export function AssetStats({ assetId }: { assetId: string }) {
  const asset = getAssetById(assetId);
  const { quotes, now, lastUpdatedAt } = useMarketFeed();
  if (!asset) return null;

  const quote = quotes[assetId];
  const status = quoteStatus(quote, asset, now);
  const change =
    quote?.change24hPercent !== null && quote?.change24hPercent !== undefined
      ? Number(quote.change24hPercent)
      : NaN;
  const changeClass =
    !Number.isFinite(change) || change === 0
      ? "text-[var(--color-text-muted)]"
      : change > 0
        ? "text-[var(--color-positive)]"
        : "text-[var(--color-negative)]";

  const priceText = quote?.priceUsd
    ? formatUsdPrice(quote.priceUsd, asset.displayDecimals)
    : "Unavailable";

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AssetBadge asset={asset} />
          <div>
            <h1 className="text-lg font-semibold">{asset.name}</h1>
            <p className="text-xs text-[var(--color-text-faint)]">{asset.symbol}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-2xl font-semibold">{priceText}</p>
          <p className={`font-mono text-sm ${changeClass}`}>
            {Number.isFinite(change) ? `24h ${formatPercent(change)}` : "24h Unavailable"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="24h High">
          {quote?.high24hUsd ? (
            <span className="font-mono">
              {formatUsdPrice(quote.high24hUsd, asset.displayDecimals)}
            </span>
          ) : (
            "Unavailable"
          )}
        </Stat>
        <Stat label="24h Low">
          {quote?.low24hUsd ? (
            <span className="font-mono">
              {formatUsdPrice(quote.low24hUsd, asset.displayDecimals)}
            </span>
          ) : (
            "Unavailable"
          )}
        </Stat>
        <Stat label="24h Volume">
          {quote?.volume24hUsd ? (
            <span className="font-mono">{formatCompactNumber(quote.volume24hUsd)}</span>
          ) : (
            "Unavailable"
          )}
        </Stat>
        <Stat label="Data status">
          <span className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "live"
                  ? "bg-[var(--color-positive)]"
                  : status === "stale"
                    ? "bg-[var(--color-negative)]"
                    : "bg-[var(--color-text-faint)]"
              }`}
              aria-hidden="true"
            />
            <span className="text-[var(--color-text-muted)]">{statusLabels[status]}</span>
            {lastUpdatedAt ? (
              <span className="text-[11px] text-[var(--color-text-faint)]">
                {formatTimestamp(quote?.receivedAt ?? lastUpdatedAt)}
              </span>
            ) : null}
          </span>
        </Stat>
      </div>

      {asset.stableReference ? (
        <p className="mt-3 text-xs text-[var(--color-text-faint)]">
          USDT shows a stable reference value of approximately $1.00 instead of a market pair,
          because Tether is itself the quote currency.
        </p>
      ) : null}
    </div>
  );
}
