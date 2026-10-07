import Link from "next/link";
import { LogoMark } from "@/components/icons";

const sectionLinks = [
  { href: "#platform", label: "Platform" },
  { href: "/markets", label: "Markets" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

export function LandingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-lg tracking-wide">BiTrade</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Landing">
          {sectionLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          >
            Create free account
          </Link>
        </div>
      </div>
    </header>
  );
}
