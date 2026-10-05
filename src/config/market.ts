export const MARKET_DATA_SOURCE = "binance" as const;

export const BINANCE_REST_BASE_URL = "https://api.binance.com/api/v3";

export const BINANCE_WS_BASE_URL = "wss://stream.binance.com:9443";

export const MARKET_REFRESH_INTERVAL_MS = 35_000;

export const QUOTE_STALE_AFTER_MS = 60_000;

export const WS_RECONNECT_BASE_DELAY_MS = 1_000;

export const WS_RECONNECT_MAX_DELAY_MS = 30_000;

export const CANDLE_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export const DEFAULT_CANDLE_INTERVAL: CandleInterval = "1h";

export const CANDLE_REQUEST_LIMIT_DEFAULT = 200;

export const CANDLE_REQUEST_LIMIT_MAX = 500;

export const STABLE_REFERENCE_USD = "1.00";

export const MARKET_CANDLE_CACHE_MS = 30_000;
