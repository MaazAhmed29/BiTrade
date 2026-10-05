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
import { loadPortfolioValuation, listTrades } from "@/lib/trading/portfolio";
import { MarketOverview } from "@/features/markets/market-overview";
import { DashboardChart } from "@/features/charts/dashboard-chart";
import { AssistantPanel } from "@/features/ai/assistant-panel";

function pnlClass(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "text-[var(--color-text-muted)]";
  return numeric > 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const portfolio = await loadPortfolioValuation(supabase);
  const recentTrades = portfolio ? await listTrades(supabase, { limit: 5 }) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Your paper trading account. Everything here is simulated with no real money.
          </p>
        </div>
        <span className="hidden text-xs text-[var(--color-text-faint)] sm:inline">
          Signed in as {user.email}
        </span>
      </div>

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
            <div className="mb-4 rounded-lg border border-[var(--color-negative)] px-4 py-3 text-sm text-[var(--color-negative)]">
              Market price data is stale or unavailable for{" "}
              {[...portfolio.unavailableAssetIds, ...portfolio.staleAssetIds].join(", ")}. Those
              assets are excluded from the valuation instead of being counted as zero.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Total portfolio value
              </p>
              <p className="mt-2 font-mono text-2xl">{formatCurrency(portfolio.totalValue)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Cash balance
              </p>
              <p className="mt-2 font-mono text-2xl">{formatCurrency(portfolio.cashBalance)}</p>
              <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                Starting balance {formatCurrency(portfolio.initialBalance)}, granted once.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Total profit and loss
              </p>
              <p className={`mt-2 font-mono text-2xl ${pnlClass(portfolio.profitLoss)}`}>
                {formatCurrency(portfolio.profitLoss)}
              </p>
              <p className={`mt-1 text-xs ${pnlClass(portfolio.returnPercent)}`}>
                {formatPercent(Number(portfolio.returnPercent))} return
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                Unrealized profit and loss
              </p>
              <p className={`mt-2 font-mono text-2xl ${pnlClass(portfolio.unrealizedPnl)}`}>
                {formatCurrency(portfolio.unrealizedPnl)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                Realized: {formatCurrency(portfolio.realizedPnl)}
              </p>
            </div>
          </div>

          {portfolio.holdings.length > 0 ? (
            <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
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

          {recentTrades.length > 0 ? (
            <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <h2 className="text-base font-semibold">Recent trades</h2>
                <Link
                  href="/history"
                  className="text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
                >
                  View history
                </Link>
              </div>
              <ul className="divide-y divide-[var(--color-border)]">
                {recentTrades.map((trade) => {
                  const asset = getAssetById(trade.assetId);
                  return (
                    <li key={trade.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold ${
                            trade.side === "buy"
                              ? "text-[var(--color-positive)]"
                              : "text-[var(--color-negative)]"
                          }`}
                        >
                          {trade.side === "buy" ? "BUY" : "SELL"}
                        </span>
                        <span className="text-sm">
                          {formatCryptoQuantity(trade.quantity)} {asset?.symbol ?? trade.assetId}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-text-faint)]">
                          {formatUsdPrice(trade.executionPrice, asset?.displayDecimals ?? 2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {trade.status === "rejected" ? (
                          <span className="text-[11px] text-[var(--color-negative)]">Rejected</span>
                        ) : null}
                        <span className="font-mono text-sm text-[var(--color-text-muted)]">
                          {formatCurrency(trade.notionalValue)}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-faint)]">
                          {new Date(trade.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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

      <div className="mt-6">
        <AssistantPanel />
      </div>

      <div className="mt-6">
        <MarketOverview />
      </div>

      <div className="mt-6">
        <DashboardChart />
      </div>
    </div>
  );
}
