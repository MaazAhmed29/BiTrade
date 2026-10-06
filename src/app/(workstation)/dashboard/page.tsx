import Link from "next/link";
import { getAssetById } from "@/config/assets";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatCryptoQuantity, formatPercent } from "@/lib/formatting/format";
import { loadPortfolioValuation, listTrades } from "@/lib/trading/portfolio";
import { getAiConfig } from "@/lib/ai/config";
import { MarketOverview } from "@/features/markets/market-overview";
import { DashboardChart } from "@/features/charts/dashboard-chart";
import { SelectedAssetProvider } from "@/features/charts/selected-asset-context";
import { AssistantPanel } from "@/features/ai/assistant-panel";

function BannerArtwork() {
  return (
    <div className="hidden w-64 shrink-0 md:block lg:w-80">
      <svg
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M6 172 L48 154 L86 162 L128 126 L168 138 L214 92 L256 100 L306 44"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.55"
        />
        <circle cx="296" cy="156" r="30" fill="#151d2e" />
        <circle cx="170" cy="156" r="38" fill="#4f5fd1" />
        <circle cx="170" cy="156" r="31" fill="#627eea" />
        <text
          x="170"
          y="170"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="38"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          Ξ
        </text>
        <circle cx="246" cy="84" r="48" fill="#cf7009" />
        <circle cx="246" cy="84" r="40" fill="#f7931a" />
        <text
          x="246"
          y="102"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="54"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          ₿
        </text>
      </svg>
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

  const initialBalance = Number(portfolio?.initialBalance ?? "10000");
  const rawTotalValue = portfolio ? Number(portfolio.totalValue) : initialBalance;
  const totalValue = Number.isFinite(rawTotalValue) ? rawTotalValue : initialBalance;
  const returnPercent =
    Number.isFinite(initialBalance) && initialBalance > 0
      ? ((totalValue - initialBalance) / initialBalance) * 100
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <SelectedAssetProvider>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="flex items-stretch gap-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold tracking-tight">
                    Welcome back, {displayName}
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
                    Your demo trading account is ready. Explore the market, track your portfolio and
                    make your next move.
                  </p>
                  <div className="mt-4 inline-flex flex-col gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] px-5 py-4">
                    <p className="text-xs text-[var(--color-text-faint)]">Demo Balance</p>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-2xl font-semibold">
                        {formatCurrency(portfolio?.initialBalance ?? "10000")}
                      </p>
                      <span className="rounded-full bg-[var(--color-positive)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-positive)]">
                        {formatPercent(returnPercent)} today
                      </span>
                    </div>
                  </div>
                </div>
                <BannerArtwork />
              </div>
            </section>

            {!portfolio ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <p className="text-sm font-medium">Account unavailable</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Your paper account could not be loaded. Make sure the Supabase migrations have
                  been applied, then reload this page.
                </p>
              </div>
            ) : (
              <>
                {portfolio.valuationStatus !== "ok" ? (
                  <div className="rounded-lg border border-[var(--color-negative)] px-4 py-3 text-sm text-[var(--color-negative)]">
                    Market price data is stale or unavailable for{" "}
                    {[...portfolio.unavailableAssetIds, ...portfolio.staleAssetIds].join(", ")}.
                    Those assets are excluded from the valuation instead of being counted as zero.
                  </div>
                ) : null}

                <MarketOverview showViewAll />
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
      </SelectedAssetProvider>
    </div>
  );
}
