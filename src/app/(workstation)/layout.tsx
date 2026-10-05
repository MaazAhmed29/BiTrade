import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { logout } from "@/features/auth/actions";
import { MarketFeedProvider } from "@/features/markets/market-feed-context";
import { MarketStatusIndicator } from "@/features/markets/market-status-indicator";

export default async function WorkstationLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <MarketFeedProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
                BiTrade
              </Link>
              <nav className="flex items-center gap-4" aria-label="Primary">
                <Link
                  href="/dashboard"
                  className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
                >
                  Dashboard
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <MarketStatusIndicator />
              <span className="hidden text-xs text-[var(--color-text-faint)] sm:inline">
                {user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </MarketFeedProvider>
  );
}
