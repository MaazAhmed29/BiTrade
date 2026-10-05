export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--color-surface-raised)]" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded bg-[var(--color-surface-raised)]" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        ))}
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
    </div>
  );
}
