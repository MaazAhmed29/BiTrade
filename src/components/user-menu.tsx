"use client";

import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import { logout } from "@/features/auth/actions";

export function UserMenu({ email }: { email: string }) {
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const displayName = email.split("@")[0] || email;

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <span className="hidden max-w-32 truncate text-sm sm:inline">{displayName}</span>
        <ChevronDownIcon className="h-4 w-4 text-[var(--color-text-faint)]" />
        <span className="sr-only">Open account menu</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-xl">
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
          Signed in as
        </p>
        <p className="mt-0.5 break-all text-sm">{email}</p>
        <div className="my-3 h-px bg-[var(--color-border)]" />
        <Link
          href="/settings"
          className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
        >
          Settings
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-negative)] transition hover:bg-[var(--color-surface-hover)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
