import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/formatting/format";

type PaperAccountRow = {
  account_id: string;
  cash: string;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("initialize_paper_account");
  const account =
    !error && Array.isArray(data) ? (data[0] as PaperAccountRow | undefined) : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your paper trading account. Everything here is simulated with no real money.
        </p>
      </div>

      {error || !account ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm font-medium">Account unavailable</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Your paper account could not be loaded. Make sure the Supabase migrations have been
            applied, then reload this page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
              Cash balance
            </p>
            <p className="mt-2 font-mono text-2xl">{formatCurrency(account.cash)}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
              Starting balance
            </p>
            <p className="mt-2 font-mono text-2xl">{formatCurrency(10000)}</p>
            <p className="mt-2 text-xs text-[var(--color-text-faint)]">
              Granted once when the account was created.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:col-span-2">
            <p className="text-sm text-[var(--color-text-muted)]">
              Signed in as {user.email}. Market data, charts, and paper trading arrive in the next
              phases.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
