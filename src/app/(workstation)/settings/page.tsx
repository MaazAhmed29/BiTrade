import { getAiConfig } from "@/lib/ai/config";
import { MARKET_DATA_SOURCE } from "@/config/market";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadPortfolioValuation } from "@/lib/trading/portfolio";
import { formatCurrency } from "@/lib/formatting/format";
import { logout } from "@/features/auth/actions";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <h2 className="border-b border-[var(--color-border)] px-4 py-3 text-base font-semibold">
        {title}
      </h2>
      <dl className="divide-y divide-[var(--color-border)]">{children}</dl>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const portfolio = await loadPortfolioValuation(supabase);
  const aiConfig = getAiConfig();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Account and workspace information. BiTrade is a paper trading simulator with no real money
        or exchange connections.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="Account">
          <Row label="Email" value={user.email ?? "Unknown"} />
          <Row label="Signed in with" value="Email and password" />
        </Section>

        <Section title="Paper trading account">
          <Row
            label="Starting balance"
            value={formatCurrency(portfolio?.initialBalance ?? "10000")}
          />
          <Row
            label="Current cash"
            value={portfolio ? formatCurrency(portfolio.cashBalance) : "Unavailable"}
          />
          <Row
            label="Account state"
            value={portfolio?.holdings.length ? "Active" : "No holdings yet"}
          />
        </Section>

        <Section title="Market data">
          <Row label="Source" value={`Binance public market data (${MARKET_DATA_SOURCE})`} />
          <Row label="API key required" value="No" />
          <Row label="Refresh cadence" value="About every 35 seconds" />
        </Section>

        <Section title="AI assistant">
          <Row label="Status" value={aiConfig ? "Configured" : "Not configured"} />
          <Row label="Provider" value={aiConfig ? aiConfig.provider : "Unavailable"} />
          <Row label="Model" value={aiConfig ? aiConfig.model : "Unavailable"} />
        </Section>

        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="text-base font-semibold">Session</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Sign out of this workstation on the current device.
          </p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
