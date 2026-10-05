import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPPORTED_ASSETS } from "@/config/assets";
import { AssetChartPanel } from "@/features/charts/asset-chart-panel";
import { AssetStats } from "@/features/markets/asset-stats";

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
      <AssetChartPanel assetId={asset.id} />
    </div>
  );
}
