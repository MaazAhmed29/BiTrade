export const MARKET_DATA_SOURCE = "binance" as const;

export const BINANCE_REST_BASE_URL = "https://api.binance.com/api/v3";

export const BINANCE_WS_BASE_URL = "wss://stream.binance.com:9443";

export const MARKET_REFRESH_INTERVAL_MS = 35_000;

export const QUOTE_STALE_AFTER_MS = 60_000;

export const WS_RECONNECT_BASE_DELAY_MS = 1_000;

export const WS_RECONNECT_MAX_DELAY_MS = 30_000;

export const CANDLE_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"] as const;

export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export const CANDLE_INTERVAL_SECONDS: Record<CandleInterval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
  "1w": 604800,
};

export const DEFAULT_CANDLE_INTERVAL: CandleInterval = "1h";

export type ChartRangeId = "1D" | "7D" | "1M" | "3M" | "1Y" | "ALL";

export type ChartRange = {
  id: ChartRangeId;
  interval: CandleInterval;
  limit: number;
};

export const CHART_RANGES: readonly ChartRange[] = [
  { id: "1D", interval: "1h", limit: 24 },
  { id: "7D", interval: "4h", limit: 42 },
  { id: "1M", interval: "1d", limit: 30 },
  { id: "3M", interval: "1d", limit: 90 },
  { id: "1Y", interval: "1d", limit: 365 },
  { id: "ALL", interval: "1w", limit: 500 },
];

export const DEFAULT_CHART_RANGE: ChartRangeId = "1D";

export const CANDLE_REQUEST_LIMIT_DEFAULT = 200;

export const CANDLE_REQUEST_LIMIT_MAX = 500;

export const STABLE_REFERENCE_USD = "1.00";

export const MARKET_CANDLE_CACHE_MS = 30_000;
