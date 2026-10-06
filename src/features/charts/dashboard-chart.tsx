"use client";

import { AssetBadge } from "@/components/asset-badge";
import { getAssetById, SUPPORTED_ASSETS } from "@/config/assets";
import { useMarketFeed } from "@/features/markets/market-feed-context";
import { formatCompactNumber, formatPercent, formatUsdPrice } from "@/lib/formatting/format";
import { AssetChartPanel } from "./asset-chart-panel";
import { useSelectedAsset } from "./selected-asset-context";

function nextAssetId(currentId: string): string {
  const index = SUPPORTED_ASSETS.findIndex((asset) => asset.id === currentId);
  const safeIndex = index < 0 ? 0 : index;
  return SUPPORTED_ASSETS[(safeIndex + 1) % SUPPORTED_ASSETS.length].id;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-mono text-xs text-[var(--color-foreground)]">{value}</dd>
    </div>
  );
}

export function DashboardChart() {
  const selected = useSelectedAsset();
  const assetId = selected?.assetId ?? "bitcoin";
  const setAssetId = selected?.setAssetId ?? (() => {});

  const asset = getAssetById(assetId);
  const { quotes } = useMarketFeed();
  const quote = quotes[assetId];

  const decimals = asset?.displayDecimals ?? 2;
  const priceText =
    quote && quote.priceUsd !== "" ? formatUsdPrice(quote.priceUsd, decimals) : "--";
  const change =
    quote && quote.change24hPercent !== null && quote.priceUsd !== ""
      ? Number(quote.change24hPercent)
      : null;
  const changeText = change !== null ? formatPercent(change) : "--";
  const changeClass =
    change === null
      ? "text-[var(--color-text-muted)]"
      : change < 0
        ? "text-[var(--color-negative)]"
        : "text-[var(--color-positive)]";

  const header = asset ? (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAssetId(nextAssetId(asset.id))}
        title="Show next coin"
        aria-label={`Charting ${asset.name}. Activate to show the next coin.`}
        className="group flex w-fit items-center gap-2.5 text-left"
      >
        <AssetBadge asset={asset} />
        <span className="text-base font-semibold transition group-hover:text-[var(--color-accent)]">
          {asset.name}
        </span>
        <span className="text-xs text-[var(--color-text-faint)]">{asset.symbol}</span>
      </button>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight">{priceText}</span>
        <span className={`text-sm font-medium ${changeClass}`}>
          {changeText}
          <span className="ml-1 text-xs font-normal text-[var(--color-text-faint)]">(24h)</span>
        </span>
      </div>
    </div>
  ) : undefined;

  const footer = asset ? (
    <dl className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
      <StatRow
        label="24h Volume"
        value={
          quote && quote.volume24hUsd !== null
            ? `$${formatCompactNumber(quote.volume24hUsd)}`
            : "--"
        }
      />
      <StatRow
        label="24h High"
        value={
          quote && quote.high24hUsd !== null ? formatUsdPrice(quote.high24hUsd, decimals) : "--"
        }
      />
      <StatRow
        label="24h Low"
        value={quote && quote.low24hUsd !== null ? formatUsdPrice(quote.low24hUsd, decimals) : "--"}
      />
    </dl>
  ) : undefined;

  return <AssetChartPanel assetId={assetId} header={header} footer={footer} />;
}
