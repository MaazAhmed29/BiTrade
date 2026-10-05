"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { SUPPORTED_ASSETS } from "@/config/assets";
import { SearchIcon } from "@/components/icons";
import { formatPercent, formatUsdPrice } from "@/lib/formatting/format";
import { useMarketFeed } from "@/features/markets/market-feed-context";

export function SearchBox() {
  const router = useRouter();
  const { quotes } = useMarketFeed();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return SUPPORTED_ASSETS.filter(
      (asset) =>
        asset.name.toLowerCase().includes(normalized) ||
        asset.symbol.toLowerCase().includes(normalized),
    ).slice(0, 6);
  }, [query]);

  function navigate(assetId: string) {
    setQuery("");
    setOpen(false);
    router.push(`/markets/${assetId}`);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (matches[0]) {
      navigate(matches[0].id);
    } else {
      setOpen(false);
      router.push("/markets");
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <form role="search" onSubmit={handleSubmit}>
        <label htmlFor="global-search" className="sr-only">
          Search coins
        </label>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 transition focus-within:border-[var(--color-accent)]">
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--color-text-faint)]" />
          <input
            id="global-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search coins (e.g. Bitcoin, Ethereum)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-faint)]"
          />
        </div>
      </form>

      {open && matches.length > 0 ? (
        <ul
          id="global-search-results"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-lg"
        >
          {matches.map((asset) => {
            const quote = quotes[asset.id];
            const change = quote?.change24hPercent;
            const changeNumeric = change !== null && change !== undefined ? Number(change) : NaN;
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => navigate(asset.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium">{asset.name}</span>
                    <span className="text-xs text-[var(--color-text-faint)]">{asset.symbol}</span>
                  </span>
                  <span className="flex items-baseline gap-2 font-mono text-xs">
                    {quote?.priceUsd ? (
                      <span>{formatUsdPrice(quote.priceUsd, asset.displayDecimals)}</span>
                    ) : null}
                    {Number.isFinite(changeNumeric) ? (
                      <span
                        className={
                          changeNumeric >= 0
                            ? "text-[var(--color-positive)]"
                            : "text-[var(--color-negative)]"
                        }
                      >
                        {formatPercent(changeNumeric)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
