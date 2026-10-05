"use client";

export default function WorkstationError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        This part of the workstation could not be loaded. Your paper account is unaffected. Try
        again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
        Retry
      </button>
    </div>
  );
}
