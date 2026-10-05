"use client";

import { useMarketFeed } from "@/features/markets/market-feed-context";
import { formatTimestamp } from "@/lib/formatting/format";

const connectionLabels: Record<string, string> = {
  idle: "Connecting to market data",
  connecting: "Connecting to market data",
  open: "Live Market Data",
  reconnecting: "Reconnecting to market data",
  closed: "Market data paused",
};

export function MarketStatusIndicator() {
  const { connection, lastUpdatedAt, error, initialLoading } = useMarketFeed();

  const dotColor =
    connection === "open"
      ? "bg-[var(--color-positive)]"
      : connection === "reconnecting"
        ? "bg-[var(--color-negative)]"
        : "bg-[var(--color-text-faint)]";

  const title =
    error && !initialLoading
      ? "Market data is temporarily unavailable."
      : connectionLabels[connection];

  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
        <span className="text-xs font-medium text-[var(--color-foreground)]">{title}</span>
      </div>
      <span className="text-[11px] text-[var(--color-text-faint)]">
        {lastUpdatedAt
          ? `Last updated: ${formatTimestamp(lastUpdatedAt)}`
          : "Waiting for first update"}
      </span>
    </div>
  );
}
