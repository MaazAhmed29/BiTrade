import { SUPPORTED_ASSETS } from "@/config/assets";
import { SectionHeading } from "./section-heading";

export function SupportedAssetsSection() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="15 assets, one workstation"
          description="The supported market stays fixed so you can focus on learning instead of chasing the latest trend."
        />
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SUPPORTED_ASSETS.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: asset.color }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{asset.symbol}</span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">
                  {asset.name}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
