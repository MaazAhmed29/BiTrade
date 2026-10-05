import Link from "next/link";
import { getAssetById } from "@/config/assets";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatCryptoQuantity, formatUsdPrice } from "@/lib/formatting/format";
import { listTrades } from "@/lib/trading/portfolio";

export default async function HistoryPage() {
  await requireUser();
  const supabase = await createClient();
  const trades = await listTrades(supabase, { limit: 100 });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Every paper trade, including rejected orders and their reasons.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
        >
          Portfolio
        </Link>
      </div>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {trades.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No trades yet.</p>
            <Link
              href="/markets"
              className="mt-2 inline-block text-sm text-[var(--color-accent)] transition hover:opacity-80"
            >
              Browse markets
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Asset
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Side
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const asset = getAssetById(trade.assetId);
                  const filled = trade.status === "filled";
                  return (
                    <tr key={trade.id} className="border-t border-[var(--color-border)]">
                      <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                        {new Date(trade.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/markets/${trade.assetId}`}
                          className="text-sm font-medium transition hover:text-[var(--color-accent)]"
                        >
                          {asset?.name ?? trade.assetId}
                          <span className="ml-1.5 text-xs text-[var(--color-text-faint)]">
                            {asset?.symbol}
                          </span>
                        </Link>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-sm font-medium ${
                          trade.side === "buy"
                            ? "text-[var(--color-positive)]"
                            : "text-[var(--color-negative)]"
                        }`}
                      >
                        {trade.side === "buy" ? "Buy" : "Sell"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {formatCryptoQuantity(trade.quantity)} {asset?.symbol ?? ""}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {formatUsdPrice(trade.executionPrice, asset?.displayDecimals ?? 2)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {formatCurrency(trade.notionalValue)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              filled ? "bg-[var(--color-positive)]" : "bg-[var(--color-negative)]"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="text-xs capitalize text-[var(--color-text-muted)]">
                            {trade.status}
                          </span>
                        </span>
                        {trade.rejectionReason ? (
                          <span className="mt-0.5 block text-[11px] text-[var(--color-negative)]">
                            {trade.rejectionReason}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-text-faint)]">
                        {trade.source === "ai" ? "AI assistant" : "Manual"}
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
