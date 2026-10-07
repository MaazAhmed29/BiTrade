import Link from "next/link";
import { LogoMark } from "@/components/icons";

const productLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

const accountLinks = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Create free account" },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto w-full px-4 py-12 sm:px-6 lg:px-16 xl:px-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <LogoMark className="h-7 w-7" />
              <span className="font-display text-lg tracking-wide">BiTrade</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
              An AI powered cryptocurrency paper trading workstation. Practice with live public
              market data and a simulated $10,000 balance.
            </p>
          </div>

          <nav aria-label="Footer product">
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer account">
            <h3 className="text-sm font-semibold">Account</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {accountLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            BiTrade is a paper trading simulation. No real money is ever involved. Market data from
            public Binance streams.
          </p>
          <p>&copy; 2026 BiTrade</p>
        </div>
      </div>
    </footer>
  );
}
