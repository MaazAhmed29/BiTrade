import { requireUser } from "@/lib/supabase/auth";
import { MarketFeedProvider } from "@/features/markets/market-feed-context";
import { MarketStatusIndicator } from "@/features/markets/market-status-indicator";
import { SearchBox } from "@/components/search-box";
import { MobileBrand, SidebarNav } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";

export default async function WorkstationLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <MarketFeedProvider>
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
              <MobileBrand />
              <SearchBox />
              <div className="ml-auto flex items-center gap-3 sm:gap-4">
                <div className="hidden md:block">
                  <MarketStatusIndicator />
                </div>
                <UserMenu email={user.email ?? "user@bitrade.app"} />
              </div>
            </div>
          </header>
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </MarketFeedProvider>
  );
}
