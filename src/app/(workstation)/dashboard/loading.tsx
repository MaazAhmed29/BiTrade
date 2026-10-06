export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="h-6 w-56 animate-pulse rounded bg-[var(--color-surface-raised)]" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-[var(--color-surface-raised)]" />
            <div className="mt-5 h-20 w-64 animate-pulse rounded-lg bg-[var(--color-surface-raised)]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-80 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
          <div className="h-56 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
          <div className="h-64 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
      </div>
    </div>
  );
}
