import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPPORTED_ASSETS } from "@/config/assets";
import { AssetChartPanel } from "@/features/charts/asset-chart-panel";
import { AssetStats } from "@/features/markets/asset-stats";
import { TradePanel } from "@/features/trading/trade-panel";

function resolveAsset(key: string) {
  const normalized = key.toLowerCase();
  return SUPPORTED_ASSETS.find(
    (asset) => asset.id === normalized || asset.symbol.toLowerCase() === normalized,
  );
}

export default async function AssetDetailPage({ params }: { params: Promise<{ asset: string }> }) {
  const { asset: assetKey } = await params;
  const asset = resolveAsset(assetKey);
  if (!asset) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <Link
        href="/markets"
        className="text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
      >
        Back to markets
      </Link>
      <AssetStats assetId={asset.id} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssetChartPanel assetId={asset.id} />
        </div>
        <div className="flex flex-col gap-4">
          <TradePanel assetId={asset.id} />
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">AI assistant</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Ask about {asset.name}, your portfolio, or request a paper trade with your approval.
            </p>
            <Link
              href="/dashboard#assistant"
              className="mt-3 inline-block rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            >
              Open assistant
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
