import type { SupportedAsset } from "@/config/assets";

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
} as const;

export function AssetBadge({
  asset,
  size = "md",
}: {
  asset: Pick<SupportedAsset, "symbol" | "color" | "name">;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: asset.color }}
    >
      {asset.symbol.slice(0, 1)}
    </span>
  );
}
