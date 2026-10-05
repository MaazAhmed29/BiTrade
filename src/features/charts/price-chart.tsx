"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { getAssetById } from "@/config/assets";
import {
  CANDLE_INTERVAL_SECONDS,
  CANDLE_REQUEST_LIMIT_DEFAULT,
  type CandleInterval,
} from "@/config/market";
import { requestCandles } from "@/lib/market-data/api";
import { formatUsdPrice } from "@/lib/formatting/format";
import { useMarketFeed } from "@/features/markets/market-feed-context";
import type { Candle } from "@/types/market";
import { CHART_COLORS } from "./chart-theme";

type ChartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; candles: Candle[] };

type CandleResult =
  { kind: "empty" } | { kind: "ready"; candles: Candle[] } | { kind: "error"; message: string };

type HoveredBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function toBarTime(candle: Candle): UTCTimestamp {
  return Math.floor(candle.openTime / 1000) as UTCTimestamp;
}

function toBar(candle: Candle) {
  return {
    time: toBarTime(candle),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

export function PriceChart({ assetId, interval }: { assetId: string; interval: CandleInterval }) {
  const asset = getAssetById(assetId);
  const decimals = asset?.displayDecimals ?? 2;
  const { quotes } = useMarketFeed();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const lastCandleRef = useRef<Candle | null>(null);

  const [result, setResult] = useState<CandleResult | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoveredBar | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const requestKey = `${assetId}|${interval}|${retryToken}`;
  const state: ChartState =
    result === null || loadedKey !== requestKey
      ? { status: "loading" }
      : result.kind === "ready"
        ? { status: "ready", candles: result.candles }
        : result.kind === "empty"
          ? { status: "empty" }
          : { status: "error", message: result.message };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
        fontFamily: "system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: CHART_COLORS.border, timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: CHART_COLORS.border },
    });

    const priceSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: false,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      priceFormat: { type: "price", precision: decimals, minMove: 10 ** -decimals },
    });
    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1,
    );

    chart.subscribeCrosshairMove((param) => {
      if (param.time === undefined) {
        setHovered(null);
        return;
      }
      const bar = param.seriesData.get(priceSeries);
      if (bar && "open" in bar && typeof bar.close === "number") {
        setHovered({
          time: Number(param.time),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        });
      } else {
        setHovered(null);
      }
    });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
      lastCandleRef.current = null;
    };
  }, [decimals]);

  useEffect(() => {
    const controller = new AbortController();

    requestCandles(assetId, interval, CANDLE_REQUEST_LIMIT_DEFAULT, controller.signal)
      .then((candles) => {
        if (controller.signal.aborted) return;
        setResult(candles.length > 0 ? { kind: "ready", candles } : { kind: "empty" });
        setLoadedKey(requestKey);
        setHovered(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          kind: "error",
          message:
            error instanceof Error ? error.message : "Market data is temporarily unavailable.",
        });
        setLoadedKey(requestKey);
        setHovered(null);
      });

    return () => {
      controller.abort();
    };
  }, [assetId, interval, requestKey]);

  const refreshPriceLine = (price: number) => {
    const series = priceSeriesRef.current;
    if (!series) return;
    if (priceLineRef.current) series.removePriceLine(priceLineRef.current);
    priceLineRef.current = series.createPriceLine({
      price,
      color: CHART_COLORS.accent,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Last",
    });
  };

  useEffect(() => {
    if (result === null || loadedKey !== requestKey || result.kind !== "ready") return;
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !priceSeries || !volumeSeries) return;

    const candles = result.candles;
    const bars = candles.map(toBar);
    priceSeries.setData(bars);
    volumeSeries.setData(
      candles.map((candle) => ({
        time: toBarTime(candle),
        value: Number(candle.volume),
        color:
          Number(candle.close) >= Number(candle.open)
            ? CHART_COLORS.volumeUp
            : CHART_COLORS.volumeDown,
      })),
    );
    lastCandleRef.current = candles[candles.length - 1];
    refreshPriceLine(bars[bars.length - 1].close);
    chart.timeScale().fitContent();
  }, [result, loadedKey, requestKey]);

  const quote = quotes[assetId];
  const quotePrice = quote && quote.priceUsd !== "" ? Number(quote.priceUsd) : null;

  useEffect(() => {
    if (result === null || loadedKey !== requestKey || result.kind !== "ready") return;
    if (quotePrice === null || !Number.isFinite(quotePrice)) return;
    const last = lastCandleRef.current;
    const priceSeries = priceSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!last || !priceSeries || !volumeSeries) return;

    const intervalSeconds = CANDLE_INTERVAL_SECONDS[interval];
    const bucket = Math.floor(Date.now() / 1000 / intervalSeconds) * intervalSeconds;
    const lastTime = Math.floor(last.openTime / 1000);
    if (lastTime !== bucket) return;

    const open = Number(last.open);
    const high = Math.max(Number(last.high), quotePrice);
    const low = Math.min(Number(last.low), quotePrice);
    priceSeries.update({ time: lastTime as UTCTimestamp, open, high, low, close: quotePrice });
    volumeSeries.update({
      time: lastTime as UTCTimestamp,
      value: Number(last.volume),
      color: quotePrice >= open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    });
    lastCandleRef.current = {
      ...last,
      high: String(high),
      low: String(low),
      close: String(quotePrice),
    };
    refreshPriceLine(quotePrice);
  }, [quotePrice, result, loadedKey, requestKey, interval]);

  const legendBar =
    hovered ??
    (state.status === "ready"
      ? (() => {
          const last = state.candles[state.candles.length - 1];
          return {
            time: Math.floor(last.openTime / 1000),
            open: Number(last.open),
            high: Number(last.high),
            low: Number(last.low),
            close: Number(last.close),
          };
        })()
      : null);

  return (
    <div className="w-full">
      <div className="flex h-6 items-center gap-3 overflow-x-auto text-xs text-[var(--color-text-muted)]">
        {legendBar ? (
          <>
            <span className="font-mono">
              {new Date(legendBar.time * 1000).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="font-mono">O {formatUsdPrice(legendBar.open, decimals)}</span>
            <span className="font-mono">H {formatUsdPrice(legendBar.high, decimals)}</span>
            <span className="font-mono">L {formatUsdPrice(legendBar.low, decimals)}</span>
            <span
              className={`font-mono ${legendBar.close >= legendBar.open ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
            >
              C {formatUsdPrice(legendBar.close, decimals)}
            </span>
          </>
        ) : (
          <span>{state.status === "loading" ? "Loading candles" : " "}</span>
        )}
      </div>

      <div className="relative h-[320px] w-full sm:h-[420px]">
        <div ref={containerRef} className="absolute inset-0" />

        {state.status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]">
            {state.status === "loading" ? (
              <div
                className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-raised)]"
                aria-label="Loading candles"
              />
            ) : null}
            {state.status === "empty" ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No candle data for this interval.
              </p>
            ) : null}
            {state.status === "error" ? (
              <div className="flex flex-col items-center gap-3 px-4 text-center">
                <p className="text-sm text-[var(--color-negative)]">{state.message}</p>
                <button
                  type="button"
                  onClick={() => setRetryToken((token) => token + 1)}
                  className="rounded-md border border-[var(--color-border-strong)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
