import Link from "next/link";
import { getAssetById } from "@/config/assets";
import { AssetBadge } from "@/components/asset-badge";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatCryptoQuantity,
  formatPercent,
  formatUsdPrice,
} from "@/lib/formatting/format";
import { loadPortfolioValuation, type PortfolioValuation } from "@/lib/trading/portfolio";

function pnlClass(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "text-[var(--color-text-muted)]";
  return numeric > 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
}

function SummaryCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${valueClassName ?? ""}`}>{value}</p>
      {detail ? <div className="mt-1 text-xs text-[var(--color-text-faint)]">{detail}</div> : null}
    </div>
  );
}

function ValuationNotice({ portfolio }: { portfolio: PortfolioValuation }) {
  if (portfolio.valuationStatus === "ok") return null;
  const affected = [...portfolio.unavailableAssetIds, ...portfolio.staleAssetIds];
  const unavailable = portfolio.valuationStatus === "unavailable";
  return (
    <div className="mb-4 rounded-lg border border-[var(--color-negative)] px-4 py-3 text-sm text-[var(--color-negative)]">
      {unavailable
        ? "Price data is unavailable for every holding. Valuation is incomplete and unavailable assets are not counted as zero."
        : "Price data is stale or unavailable for some holdings. Affected values are excluded rather than counted as zero."}{" "}
      Affected assets: {affected.join(", ")}.
    </div>
  );
}

export default async function PortfolioPage() {
  await requireUser();
  const supabase = await createClient();
  const portfolio = await loadPortfolioValuation(supabase);

  if (!portfolio) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm font-medium">Portfolio unavailable</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Your paper account could not be loaded. Make sure the Supabase migrations have been
            applied, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  const returnNumeric = Number(portfolio.returnPercent);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <Link
          href="/history"
          className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
        >
          Trade history
        </Link>
      </div>

      <ValuationNotice portfolio={portfolio} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total portfolio value" value={formatCurrency(portfolio.totalValue)} />
        <SummaryCard label="Cash balance" value={formatCurrency(portfolio.cashBalance)} />
        <SummaryCard
          label="Total profit and loss"
          value={formatCurrency(portfolio.profitLoss)}
          valueClassName={pnlClass(portfolio.profitLoss)}
          detail={
            <span className={pnlClass(portfolio.returnPercent)}>
              {formatPercent(returnNumeric)} return on {formatCurrency(portfolio.initialBalance)}
            </span>
          }
        />
        <SummaryCard
          label="Unrealized profit and loss"
          value={formatCurrency(portfolio.unrealizedPnl)}
          detail={<span>Realized: {formatCurrency(portfolio.realizedPnl)}</span>}
        />
      </div>

      <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-base font-semibold">Holdings</h2>
        </div>
        {portfolio.holdings.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              You do not hold any assets yet.
            </p>
            <Link
              href="/markets"
              className="mt-2 inline-block text-sm text-[var(--color-accent)] transition hover:opacity-80"
            >
              Browse markets
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Asset
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Average entry
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Current price
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Market value
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Unrealized P and L
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Realized P and L
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((holding) => {
                  const asset = getAssetById(holding.assetId);
                  const decimals = asset?.displayDecimals ?? 2;
                  return (
                    <tr
                      key={holding.assetId}
                      className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-surface-hover)]"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/markets/${holding.assetId}`}
                          className="flex items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        >
                          {asset ? <AssetBadge asset={asset} size="sm" /> : null}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-medium">
                              {asset?.name ?? holding.assetId}
                            </span>
                            <span className="text-xs text-[var(--color-text-faint)]">
                              {asset?.symbol}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {formatCryptoQuantity(holding.quantity)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {formatUsdPrice(holding.averageEntryPrice, decimals)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {holding.currentPrice
                          ? formatUsdPrice(holding.currentPrice, decimals)
                          : holding.status === "stale"
                            ? "Stale"
                            : "Unavailable"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {holding.marketValue ? formatCurrency(holding.marketValue) : "Unavailable"}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-sm ${pnlClass(holding.unrealizedPnl ?? "0")}`}
                      >
                        {holding.unrealizedPnl
                          ? formatCurrency(holding.unrealizedPnl)
                          : "Unavailable"}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-sm ${pnlClass(holding.realizedPnl)}`}
                      >
                        {formatCurrency(holding.realizedPnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
