"use client";

import { CHART_RANGES, type ChartRangeId } from "@/config/market";

export function RangeSelector({
  value,
  onChange,
}: {
  value: ChartRangeId;
  onChange: (range: ChartRangeId) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="flex w-full items-center gap-1 rounded-md border border-[var(--color-border-strong)] p-1 sm:w-auto"
    >
      {CHART_RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          aria-pressed={value === range.id}
          onClick={() => onChange(range.id)}
          className={`flex-1 rounded px-2.5 py-1.5 text-xs font-medium transition sm:flex-none ${
            value === range.id
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {range.id}
        </button>
      ))}
    </div>
  );
}
