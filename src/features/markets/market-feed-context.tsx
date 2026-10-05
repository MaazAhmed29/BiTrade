"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MARKET_REFRESH_INTERVAL_MS } from "@/config/market";
import { requestSnapshot } from "@/lib/market-data/api";
import { MarketFeed, type FeedConnectionStatus } from "@/lib/market-data/ws";
import type { MarketQuote } from "@/types/market";

type MarketFeedContextValue = {
  quotes: Record<string, MarketQuote>;
  connection: FeedConnectionStatus;
  lastUpdatedAt: number | null;
  initialLoading: boolean;
  error: string | null;
  now: number;
  refresh: () => void;
};

const MarketFeedContext = createContext<MarketFeedContextValue | null>(null);

export function MarketFeedProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [connection, setConnection] = useState<FeedConnectionStatus>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const pendingRef = useRef<Map<string, MarketQuote>>(new Map());

  const loadSnapshot = useCallback(async () => {
    try {
      const fresh = await requestSnapshot();
      setQuotes((prev) => {
        const next = { ...prev };
        for (const quote of fresh) next[quote.assetId] = quote;
        for (const [assetId, quote] of pendingRef.current) {
          if (quote.receivedAt > (next[assetId]?.receivedAt ?? 0)) next[assetId] = quote;
        }
        return next;
      });
      pendingRef.current.clear();
      setError(null);
      setLastUpdatedAt(Date.now());
    } catch (snapshotError) {
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "Market data is temporarily unavailable.",
      );
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const commitPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.size === 0) return;
    const updates = Object.fromEntries(pending);
    pending.clear();
    setQuotes((prev) => ({ ...prev, ...updates }));
    setLastUpdatedAt(Date.now());
  }, []);

  useEffect(() => {
    void loadSnapshot();

    const pending = pendingRef.current;
    const feed = new MarketFeed({
      onQuote: (quote) => {
        pending.set(quote.assetId, quote);
      },
      onStatusChange: setConnection,
      onReconnect: () => {
        void loadSnapshot();
      },
    });
    feed.start();

    const timer = setInterval(() => {
      commitPending();
      setNow(Date.now());
    }, MARKET_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      feed.stop();
      pending.clear();
    };
  }, [commitPending, loadSnapshot]);

  const refresh = useCallback(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const value = useMemo<MarketFeedContextValue>(
    () => ({ quotes, connection, lastUpdatedAt, initialLoading, error, now, refresh }),
    [quotes, connection, lastUpdatedAt, initialLoading, error, now, refresh],
  );

  return <MarketFeedContext.Provider value={value}>{children}</MarketFeedContext.Provider>;
}

export function useMarketFeed(): MarketFeedContextValue {
  const context = useContext(MarketFeedContext);
  if (!context) {
    throw new Error("useMarketFeed must be used inside a MarketFeedProvider.");
  }
  return context;
}
