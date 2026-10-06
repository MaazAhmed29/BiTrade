"use client";

import { useState, type ReactNode } from "react";
import { getAssetById } from "@/config/assets";
import { CHART_RANGES, DEFAULT_CHART_RANGE, type ChartRangeId } from "@/config/market";
import { RangeSelector } from "./interval-selector";
import { PriceChart } from "./price-chart";

export function AssetChartPanel({
  assetId,
  title = "Price chart",
  header,
  footer,
}: {
  assetId: string;
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const [rangeId, setRangeId] = useState<ChartRangeId>(DEFAULT_CHART_RANGE);
  const range = CHART_RANGES.find((entry) => entry.id === rangeId) ?? CHART_RANGES[0];
  const asset = getAssetById(assetId);

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {header ? (
        <div className="mb-3">{header}</div>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {asset ? (
            <span className="text-xs text-[var(--color-text-faint)]">
              {asset.name} ({asset.symbol})
            </span>
          ) : null}
        </div>
      )}

      <div className="mb-3">
        <RangeSelector value={rangeId} onChange={setRangeId} />
      </div>

      {asset && asset.pair ? (
        <PriceChart assetId={assetId} interval={range.interval} limit={range.limit} />
      ) : (
        <div className="flex h-[320px] items-center justify-center px-4 sm:h-[420px]">
          <p className="max-w-md text-center text-sm text-[var(--color-text-muted)]">
            Candlestick chart data is not available for this asset because it has no separate USD
            market pair. BiTrade shows a stable reference value of approximately 1.00 dollar
            instead.
          </p>
        </div>
      )}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}
