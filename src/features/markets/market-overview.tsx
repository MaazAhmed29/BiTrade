"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SUPPORTED_ASSETS } from "@/config/assets";
import { MARKET_DATA_SOURCE } from "@/config/market";
import { AssetBadge } from "@/components/asset-badge";
import { useMarketFeed } from "@/features/markets/market-feed-context";
import { quoteStatus } from "@/features/markets/quote-status";
import { Sparkline } from "@/features/markets/sparkline";
import {
  formatCompactNumber,
  formatPercent,
  formatTimestamp,
  formatUsdPrice,
} from "@/lib/formatting/format";
import type { MarketQuoteStatus } from "@/types/market";

const statusStyles: Record<MarketQuoteStatus, { dot: string; label: string }> = {
  live: { dot: "bg-[var(--color-positive)]", label: "Live" },
  stale: { dot: "bg-[var(--color-negative)]", label: "Stale" },
  unavailable: { dot: "bg-[var(--color-text-faint)]", label: "Unavailable" },
};

function PriceCell({ priceUsd, decimals }: { priceUsd: string; decimals: number }) {
  if (!priceUsd)
    return <span className="font-mono text-sm text-[var(--color-text-faint)]">Unavailable</span>;
  return <span className="font-mono text-sm">{formatUsdPrice(priceUsd, decimals)}</span>;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="border-t border-[var(--color-border)]">
          <td colSpan={10} className="px-3 py-3">
            <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-raised)]" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function MarketOverview({ showViewAll = false }: { showViewAll?: boolean }) {
  const { quotes, initialLoading, error, now, refresh } = useMarketFeed();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return SUPPORTED_ASSETS.filter((asset) => {
      if (!normalized) return true;
      return (
        asset.name.toLowerCase().includes(normalized) ||
        asset.symbol.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  const hasQuotes = Object.keys(quotes).length > 0;

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Top 15 Cryptocurrencies</h2>
          <p className="text-xs text-[var(--color-text-faint)]">
            Source: Binance public market data ({MARKET_DATA_SOURCE})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="market-search" className="sr-only">
            Search assets
          </label>
          <input
            id="market-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets"
            className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-1.5 text-sm outline-none transition focus:border-[var(--color-accent)] sm:w-56"
          />
          {showViewAll ? (
            <Link
              href="/markets"
              className="shrink-0 text-sm font-medium text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              View All
            </Link>
          ) : null}
        </div>
      </div>

      {error && !initialLoading ? (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-sm text-[var(--color-negative)]">
            Market data is temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-[var(--color-border-strong)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
              <th scope="col" className="px-3 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Price
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                24h Change
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                24h High
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                24h Low
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                24h Volume
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                7D Chart
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {initialLoading && !hasQuotes ? <SkeletonRows /> : null}
            {rows.map((asset, index) => {
              const quote = quotes[asset.id];
              const status = quoteStatus(quote, asset, now);
              const change = quote?.change24hPercent;
              const changeNumeric = change !== null && change !== undefined ? Number(change) : NaN;
              const changeClass =
                !Number.isFinite(changeNumeric) || changeNumeric === 0
                  ? "text-[var(--color-text-muted)]"
                  : changeNumeric > 0
                    ? "text-[var(--color-positive)]"
                    : "text-[var(--color-negative)]";

              return (
                <tr
                  key={asset.id}
                  className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]"
                >
                  <td className="px-3 py-2.5 text-xs text-[var(--color-text-faint)]">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/markets/${asset.id}`}
                      className="flex items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      <AssetBadge asset={asset} size="sm" />
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-medium transition group-hover:text-[var(--color-accent)]">
                          {asset.name}
                        </span>
                        <span className="text-xs text-[var(--color-text-faint)]">
                          {asset.symbol}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <PriceCell
                        priceUsd={quote?.priceUsd ?? ""}
                        decimals={asset.displayDecimals}
                      />
                      {asset.stableReference ? (
                        <span
                          className="text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]"
                          title="Stable dollar approximation. Tether has no separate USD market pair, so BiTrade shows an approximate reference value of 1.00 dollar."
                        >
                          ref
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 font-mono text-sm ${changeClass}`}>
                    {Number.isFinite(changeNumeric) ? formatPercent(changeNumeric) : "Unavailable"}
                  </td>
                  <td className="hidden px-3 py-2.5 font-mono text-sm md:table-cell">
                    {quote?.high24hUsd
                      ? formatUsdPrice(quote.high24hUsd, asset.displayDecimals)
                      : "Unavailable"}
                  </td>
                  <td className="hidden px-3 py-2.5 font-mono text-sm md:table-cell">
                    {quote?.low24hUsd
                      ? formatUsdPrice(quote.low24hUsd, asset.displayDecimals)
                      : "Unavailable"}
                  </td>
                  <td className="hidden px-3 py-2.5 font-mono text-sm text-[var(--color-text-muted)] lg:table-cell">
                    {quote?.volume24hUsd ? formatCompactNumber(quote.volume24hUsd) : "Unavailable"}
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <Sparkline assetId={asset.id} stableReference={asset.stableReference} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusStyles[status].dot}`}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {statusStyles[status].label}
                      </span>
                      {quote ? (
                        <span className="hidden text-[11px] text-[var(--color-text-faint)] xl:inline">
                          {formatTimestamp(quote.receivedAt)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/markets/${asset.id}`}
                      className="inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <p className="text-xs text-[var(--color-text-faint)]">
          USDT shows a stable reference value of approximately $1.00 instead of a market pair,
          because Tether is itself the quote currency. All other prices come from live Binance
          public market data. Prices are refreshed about every 35 seconds.
        </p>
      </div>
    </section>
  );
}
