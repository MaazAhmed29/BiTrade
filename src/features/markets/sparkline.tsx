"use client";

import { useEffect, useState } from "react";
import type { Candle } from "@/types/market";

const WIDTH = 72;
const HEIGHT = 24;
const PADDING = 2;

type SparklineState =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "flat"; reason: "stable" }
  | { kind: "line"; closes: number[] };

function buildPoints(closes: number[]): { points: string; trend: "up" | "down" | "flat" } {
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const stepX = closes.length > 1 ? (WIDTH - PADDING * 2) / (closes.length - 1) : 0;
  const points = closes
    .map((close, index) => {
      const x = PADDING + index * stepX;
      const y = HEIGHT - PADDING - ((close - min) / span) * (HEIGHT - PADDING * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const first = closes[0] ?? 0;
  const last = closes[closes.length - 1] ?? 0;
  const trend = last > first ? "up" : last < first ? "down" : "flat";
  return { points, trend };
}

export function Sparkline({
  assetId,
  stableReference = false,
}: {
  assetId: string;
  stableReference?: boolean;
}) {
  const [state, setState] = useState<SparklineState>(
    stableReference ? { kind: "flat", reason: "stable" } : { kind: "loading" },
  );

  useEffect(() => {
    if (stableReference) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/market/candles?asset=${encodeURIComponent(assetId)}&interval=1d&limit=8`,
        );
        if (!response.ok) throw new Error("candles unavailable");
        const payload = (await response.json()) as { candles?: Candle[] };
        const closes = (payload.candles ?? [])
          .map((candle) => Number(candle.close))
          .filter((value) => Number.isFinite(value));
        if (cancelled) return;
        if (closes.length < 2) throw new Error("not enough candles");
        setState({ kind: "line", closes });
      } catch {
        if (!cancelled) setState({ kind: "failed" });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [assetId, stableReference]);

  if (state.kind === "failed") {
    return (
      <span
        className="inline-block text-center text-[10px] text-[var(--color-text-faint)]"
        title="Trend unavailable"
      >
        -
      </span>
    );
  }

  if (state.kind === "flat") {
    return (
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <line
          x1={PADDING}
          y1={HEIGHT / 2}
          x2={WIDTH - PADDING}
          y2={HEIGHT / 2}
          stroke="var(--color-positive)"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  if (state.kind === "loading") {
    return (
      <div
        className="h-6 w-[72px] animate-pulse rounded bg-[var(--color-surface-raised)]"
        aria-hidden="true"
      />
    );
  }

  const { points, trend } = buildPoints(state.closes);
  const color =
    trend === "up"
      ? "var(--color-positive)"
      : trend === "down"
        ? "var(--color-negative)"
        : "var(--color-text-muted)";
  const label = trend === "up" ? "up" : trend === "down" ? "down" : "flat";

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`7 day price trend ${label}`}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
