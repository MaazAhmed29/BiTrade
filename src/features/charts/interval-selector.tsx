"use client";

import { CANDLE_INTERVALS, type CandleInterval } from "@/config/market";

export function IntervalSelector({
  value,
  onChange,
}: {
  value: CandleInterval;
  onChange: (interval: CandleInterval) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart interval"
      className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--color-border-strong)] p-1"
    >
      {CANDLE_INTERVALS.map((interval) => (
        <button
          key={interval}
          type="button"
          aria-pressed={value === interval}
          onClick={() => onChange(interval)}
          className={
            value === interval
              ? "rounded bg-[var(--color-accent)] px-2 py-1 text-xs font-medium text-white"
              : "rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
          }
        >
          {interval}
        </button>
      ))}
    </div>
  );
}
