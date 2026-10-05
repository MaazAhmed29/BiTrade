import { ASSETS_BY_SYMBOL, getTradablePairs } from "@/config/assets";
import {
  BINANCE_WS_BASE_URL,
  MARKET_DATA_SOURCE,
  WS_RECONNECT_BASE_DELAY_MS,
  WS_RECONNECT_MAX_DELAY_MS,
} from "@/config/market";
import type { MarketQuote } from "@/types/market";

export type FeedConnectionStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";

export type MarketFeedOptions = {
  onQuote: (quote: MarketQuote) => void;
  onStatusChange: (status: FeedConnectionStatus) => void;
  onReconnect: () => void;
};

type BinanceTickerMessage = {
  stream?: string;
  data?: {
    e?: string;
    E?: number;
    s?: string;
    c?: string;
    P?: string;
    h?: string;
    l?: string;
    q?: string;
  };
};

function buildStreamUrl(): string {
  const streams = getTradablePairs()
    .map((pair) => `${pair.toLowerCase()}@ticker`)
    .join("/");
  return `${BINANCE_WS_BASE_URL}/stream?streams=${streams}`;
}

export class MarketFeed {
  private readonly options: MarketFeedOptions;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private stopped = true;
  private paused = false;
  private hadConnection = false;
  private readonly lastEventAt = new Map<string, number>();
  private readonly handleVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      this.pause();
    } else if (this.stopped === false) {
      this.resume();
    }
  };

  constructor(options: MarketFeedOptions) {
    this.options = options;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.paused = false;
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.paused = false;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    this.clearReconnectTimer();
    this.closeSocket();
    this.options.onStatusChange("closed");
  }

  private pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.clearReconnectTimer();
    this.closeSocket();
    this.options.onStatusChange("closed");
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.attempt = 0;
    this.connect();
  }

  private closeSocket(): void {
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // The socket may already be closed.
      }
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private connect(): void {
    if (this.stopped || this.paused) return;
    this.clearReconnectTimer();
    this.closeSocket();
    this.options.onStatusChange(this.hadConnection ? "reconnecting" : "connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(buildStreamUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      if (this.stopped || this.paused || this.ws !== socket) {
        socket.close();
        return;
      }
      const wasReconnect = this.hadConnection;
      this.hadConnection = true;
      this.attempt = 0;
      this.options.onStatusChange("open");
      if (wasReconnect) this.options.onReconnect();
    };

    socket.onmessage = (event) => this.handleMessage(event);

    socket.onerror = () => {
      // The close event follows and handles reconnection.
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      if (!this.stopped && !this.paused) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.paused || this.reconnectTimer) return;
    const backoff = Math.min(
      WS_RECONNECT_BASE_DELAY_MS * 2 ** this.attempt,
      WS_RECONNECT_MAX_DELAY_MS,
    );
    this.attempt += 1;
    const delay = backoff + Math.floor(Math.random() * 1_000);
    this.options.onStatusChange("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(event: MessageEvent): void {
    let message: BinanceTickerMessage;
    try {
      message = JSON.parse(String(event.data)) as BinanceTickerMessage;
    } catch {
      return;
    }

    const data = message.data;
    if (!data?.s || !data.c) return;

    const asset = ASSETS_BY_SYMBOL.get(data.s);
    if (!asset || !asset.pair) return;

    const eventAt = Number(data.E);
    const receivedAt = Date.now();
    const previous = this.lastEventAt.get(asset.id) ?? 0;
    if (Number.isFinite(eventAt) && eventAt > 0) {
      if (eventAt <= previous) return;
      this.lastEventAt.set(asset.id, eventAt);
    }

    this.options.onQuote({
      assetId: asset.id,
      symbol: asset.symbol,
      pair: asset.pair,
      priceUsd: data.c,
      change24hPercent: data.P ?? null,
      high24hUsd: data.h ?? null,
      low24hUsd: data.l ?? null,
      volume24hUsd: data.q ?? null,
      marketTimestamp: Number.isFinite(eventAt) && eventAt > 0 ? eventAt : receivedAt,
      receivedAt,
      source: MARKET_DATA_SOURCE,
      status: "live",
    });
  }
}
