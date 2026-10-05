import Link from "next/link";
import { getAssetById } from "@/config/assets";
import { AssetBadge } from "@/components/asset-badge";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatCryptoQuantity, formatPercent } from "@/lib/formatting/format";
import { loadPortfolioValuation, listTrades } from "@/lib/trading/portfolio";
import { getAiConfig } from "@/lib/ai/config";
import { MarketOverview } from "@/features/markets/market-overview";
import { DashboardChart } from "@/features/charts/dashboard-chart";
import { AssistantPanel } from "@/features/ai/assistant-panel";

function pnlClass(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "text-[var(--color-text-muted)]";
  return numeric > 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
}

function StatCard({
  label,
  value,
  valueClassName = "",
  footnote,
  footnoteClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
  footnote?: string;
  footnoteClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${valueClassName}`}>{value}</p>
      {footnote ? <p className={`mt-1 text-xs ${footnoteClassName}`}>{footnote}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const portfolio = await loadPortfolioValuation(supabase);
  const recentTrades = portfolio ? await listTrades(supabase, { limit: 5 }) : [];
  const aiAvailable = getAiConfig() !== null;
  const displayName = (user.email ?? "Trader").split("@")[0] || "Trader";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h1 className="text-xl font-semibold tracking-tight">Welcome back, {displayName}</h1>
            <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
              Your demo trading account is ready. Explore the market, track your portfolio and
              request your next paper trade.
            </p>
            <div className="mt-4 inline-flex flex-col gap-1 rounded-lg border border-[var(--color-accent)]/50 bg-[var(--color-background)] px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Demo Balance
              </p>
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-2xl font-semibold">
                  {formatCurrency(portfolio?.initialBalance ?? "10000")}
                </p>
                <span className="text-xs text-[var(--color-text-faint)]">starting balance</span>
              </div>
              <p className="text-xs text-[var(--color-text-faint)]">
                Granted once. Current cash: {formatCurrency(portfolio?.cashBalance ?? "0")}
              </p>
            </div>
          </section>

          {!portfolio ? (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <p className="text-sm font-medium">Account unavailable</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Your paper account could not be loaded. Make sure the Supabase migrations have been
                applied, then reload this page.
              </p>
            </div>
          ) : (
            <>
              {portfolio.valuationStatus !== "ok" ? (
                <div className="rounded-lg border border-[var(--color-negative)] px-4 py-3 text-sm text-[var(--color-negative)]">
                  Market price data is stale or unavailable for{" "}
                  {[...portfolio.unavailableAssetIds, ...portfolio.staleAssetIds].join(", ")}. Those
                  assets are excluded from the valuation instead of being counted as zero.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total portfolio value"
                  value={formatCurrency(portfolio.totalValue)}
                />
                <StatCard
                  label="Cash balance"
                  value={formatCurrency(portfolio.cashBalance)}
                  footnote={`Starting balance ${formatCurrency(portfolio.initialBalance)}, granted once.`}
                  footnoteClassName="text-[var(--color-text-faint)]"
                />
                <StatCard
                  label="Total profit and loss"
                  value={formatCurrency(portfolio.profitLoss)}
                  valueClassName={pnlClass(portfolio.profitLoss)}
                  footnote={`${formatPercent(Number(portfolio.returnPercent))} return`}
                  footnoteClassName={pnlClass(portfolio.returnPercent)}
                />
                <StatCard
                  label="Unrealized profit and loss"
                  value={formatCurrency(portfolio.unrealizedPnl)}
                  valueClassName={pnlClass(portfolio.unrealizedPnl)}
                  footnote={`Realized: ${formatCurrency(portfolio.realizedPnl)}`}
                  footnoteClassName="text-[var(--color-text-faint)]"
                />
              </div>

              <MarketOverview showViewAll />

              {portfolio.holdings.length > 0 ? (
                <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                    <h2 className="text-base font-semibold">Holdings</h2>
                    <Link
                      href="/portfolio"
                      className="text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
                    >
                      View portfolio
                    </Link>
                  </div>
                  <ul className="divide-y divide-[var(--color-border)]">
                    {portfolio.holdings.map((holding) => {
                      const asset = getAssetById(holding.assetId);
                      return (
                        <li
                          key={holding.assetId}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <Link
                            href={`/markets/${holding.assetId}`}
                            className="flex items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                          >
                            {asset ? <AssetBadge asset={asset} size="sm" /> : null}
                            <span className="text-sm font-medium">
                              {asset?.name ?? holding.assetId}
                            </span>
                            <span className="text-xs text-[var(--color-text-faint)]">
                              {formatCryptoQuantity(holding.quantity)} {asset?.symbol}
                            </span>
                          </Link>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-mono text-[var(--color-text-muted)]">
                              {holding.marketValue
                                ? formatCurrency(holding.marketValue)
                                : "Unavailable"}
                            </span>
                            <span className={`font-mono ${pnlClass(holding.unrealizedPnl ?? "0")}`}>
                              {holding.unrealizedPnl
                                ? formatCurrency(holding.unrealizedPnl)
                                : "Unavailable"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <DashboardChart />

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h2 className="text-base font-semibold">Recent Activity</h2>
              <Link
                href="/history"
                className="text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
              >
                View history
              </Link>
            </div>
            {recentTrades.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--color-text-muted)]">
                No trades yet. Your executed paper trades will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {recentTrades.map((trade) => {
                  const asset = getAssetById(trade.assetId);
                  const isBuy = trade.side === "buy";
                  return (
                    <li key={trade.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                          isBuy ? "bg-[var(--color-positive)]" : "bg-[var(--color-negative)]"
                        }`}
                      >
                        {isBuy ? "B" : "S"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {isBuy ? "Bought " : "Sold "}
                          {formatCryptoQuantity(trade.quantity)} {asset?.symbol ?? trade.assetId}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-faint)]">
                          {new Date(trade.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {trade.source === "ai" ? " · AI" : ""}
                          {trade.status === "rejected" ? (
                            <span className="text-[var(--color-negative)]"> · Rejected</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-[var(--color-text-muted)]">
                        {formatCurrency(trade.notionalValue)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <AssistantPanel available={aiAvailable} />
        </div>
      </div>
    </div>
  );
}
