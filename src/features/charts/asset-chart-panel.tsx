"use client";

import { useState } from "react";
import { getAssetById, SUPPORTED_ASSETS } from "@/config/assets";
import { DEFAULT_CANDLE_INTERVAL, type CandleInterval } from "@/config/market";
import { IntervalSelector } from "./interval-selector";
import { PriceChart } from "./price-chart";

export function AssetChartPanel({
  assetId,
  onAssetChange,
  title = "Price chart",
}: {
  assetId: string;
  onAssetChange?: (assetId: string) => void;
  title?: string;
}) {
  const [interval, setInterval] = useState<CandleInterval>(DEFAULT_CANDLE_INTERVAL);
  const asset = getAssetById(assetId);

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {onAssetChange ? (
            <>
              <label htmlFor="chart-asset" className="sr-only">
                Select asset
              </label>
              <select
                id="chart-asset"
                value={assetId}
                onChange={(event) => onAssetChange(event.target.value)}
                className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1.5 text-sm outline-none transition focus:border-[var(--color-accent)]"
              >
                {SUPPORTED_ASSETS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.symbol})
                  </option>
                ))}
              </select>
            </>
          ) : (
            asset && (
              <span className="text-xs text-[var(--color-text-faint)]">
                {asset.name} ({asset.symbol})
              </span>
            )
          )}
        </div>
        <IntervalSelector value={interval} onChange={setInterval} />
      </div>

      {asset && asset.pair ? (
        <PriceChart assetId={assetId} interval={interval} />
      ) : (
        <div className="flex h-[320px] items-center justify-center px-4 sm:h-[420px]">
          <p className="max-w-md text-center text-sm text-[var(--color-text-muted)]">
            Candlestick chart data is not available for this asset because it has no separate USD
            market pair. BiTrade shows a stable reference value of approximately 1.00 dollar
            instead.
          </p>
        </div>
      )}
    </section>
  );
}
