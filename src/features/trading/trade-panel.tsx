"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAssetById } from "@/config/assets";
import {
  formatCurrency,
  formatCryptoQuantity,
  formatTimestamp,
  formatUsdPrice,
} from "@/lib/formatting/format";
import { roundQuantity } from "@/lib/trading/validation";
import { useMarketFeed } from "@/features/markets/market-feed-context";
import { quoteStatus } from "@/features/markets/quote-status";
import type { TradeSide, TradeInputMode } from "@/lib/trading/validation";

const INPUT_PATTERN = /^\d*\.?\d*$/;

type PortfolioResponse = {
  portfolio: {
    cashBalance: string;
    holdings: { assetId: string; quantity: string; realizedPnl: string }[];
  };
};

type TradeSuccess = {
  id: string;
  status: string;
  side: string;
  quantity: string;
  executionPrice: string;
  notionalValue: string;
  cashBalance: string;
  holdingQuantity: string;
  alreadyExecuted?: boolean;
};

type SideTabProps = {
  side: TradeSide;
  active: boolean;
  onSelect: (side: TradeSide) => void;
};

function SideTab({ side, active, onSelect }: SideTabProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(side)}
      className={
        active
          ? side === "buy"
            ? "flex-1 rounded bg-[var(--color-positive)] px-3 py-1.5 text-sm font-semibold text-white"
            : "flex-1 rounded bg-[var(--color-negative)] px-3 py-1.5 text-sm font-semibold text-white"
          : "flex-1 rounded px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
      }
    >
      {side === "buy" ? "Buy" : "Sell"}
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--color-text-faint)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function TradePanel({ assetId }: { assetId: string }) {
  const asset = getAssetById(assetId);
  const { quotes, now } = useMarketFeed();

  const [side, setSide] = useState<TradeSide>("buy");
  const [mode, setMode] = useState<TradeInputMode>("usd");
  const [input, setInput] = useState("");
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<TradeSuccess | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse["portfolio"] | null>(null);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);

  const loadPortfolio = useCallback(() => {
    fetch("/api/portfolio", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PortfolioResponse | null) => {
        if (payload?.portfolio) setPortfolio(payload.portfolio);
      })
      .catch(() => {
        // Portfolio values stay unavailable; trading still validates server side.
      })
      .finally(() => setPortfolioLoaded(true));
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const quote = quotes[assetId];
  const status = quoteStatus(quote, asset, now);
  const price = quote && quote.priceUsd !== "" ? Number(quote.priceUsd) : null;
  const tradable = Boolean(asset?.pair) && status === "live" && price !== null && price > 0;

  const holding = portfolio?.holdings.find((entry) => entry.assetId === assetId);
  const cash = portfolio ? Number(portfolio.cashBalance) : null;
  const holdingQuantity = holding ? Number(holding.quantity) : 0;

  const inputNumber = input === "" ? NaN : Number(input);
  const inputValid = INPUT_PATTERN.test(input) && Number.isFinite(inputNumber) && inputNumber > 0;

  const estimatedQuantity =
    mode === "usd" && price && inputValid
      ? roundQuantity(inputNumber / price)
      : inputValid
        ? inputNumber
        : null;
  const estimatedTotal =
    price && inputValid ? (mode === "usd" ? inputNumber : inputNumber * price) : null;

  let clientError: string | null = null;
  if (!asset) {
    clientError = "Unknown asset requested.";
  } else if (!tradable) {
    clientError =
      status === "stale"
        ? "Price data is stale. Trading is temporarily disabled until a fresh market price is available."
        : "Market data is temporarily unavailable. Trading is temporarily disabled.";
  } else if (input === "") {
    clientError = null;
  } else if (!inputValid) {
    clientError = "Enter a positive amount with digits only.";
  } else if (mode === "usd" && inputNumber < 1) {
    clientError = "Minimum order value is 1.00 dollar.";
  } else if (estimatedQuantity !== null && estimatedQuantity <= 0) {
    clientError = "Quantity is too small to trade at this price.";
  } else if (side === "buy" && cash !== null && estimatedTotal !== null && estimatedTotal > cash) {
    clientError = "Insufficient paper cash for this order.";
  } else if (side === "sell" && estimatedQuantity !== null && holdingQuantity < estimatedQuantity) {
    clientError = "Insufficient holdings for this sale.";
  }

  const canReview =
    step === "edit" && input !== "" && inputValid && clientError === null && !submitting;

  function resetForm() {
    setInput("");
    setStep("edit");
    setError(null);
    setSuccess(null);
  }

  async function confirmTrade() {
    if (!asset || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      assetId: asset.id,
      side,
      mode,
      executionToken: crypto.randomUUID(),
    };
    if (mode === "usd") payload.amountUsd = input;
    else payload.quantity = input;

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        trade?: {
          id: string;
          status: string;
          side: string;
          quantity: string;
          executionPrice: string;
          notionalValue: string;
        };
        cashBalance?: string;
        holdingQuantity?: string;
        alreadyExecuted?: boolean;
      } | null;

      if (response.ok && body?.trade) {
        setSuccess({
          id: body.trade.id,
          status: body.trade.status,
          side: body.trade.side,
          quantity: body.trade.quantity,
          executionPrice: body.trade.executionPrice,
          notionalValue: body.trade.notionalValue,
          cashBalance: body.cashBalance ?? "0.00",
          holdingQuantity: body.holdingQuantity ?? "0",
          alreadyExecuted: body.alreadyExecuted,
        });
        loadPortfolio();
        return;
      }

      setError(body?.error ?? "Trade could not be executed.");
      setStep("edit");
    } catch {
      setError("Trade could not be executed. Check your connection and try again.");
      setStep("edit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!asset) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-negative)]">Unknown asset requested.</p>
      </section>
    );
  }

  if (success) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-base font-semibold">
          {success.side === "buy" ? "Buy order filled" : "Sell order filled"}
        </h2>
        <div className="mt-3">
          <SummaryRow label="Asset">
            {asset.name} ({asset.symbol})
          </SummaryRow>
          <SummaryRow label="Quantity">{formatCryptoQuantity(success.quantity)}</SummaryRow>
          <SummaryRow label="Execution price">
            <span className="font-mono">
              {formatUsdPrice(success.executionPrice, asset.displayDecimals)}
            </span>
          </SummaryRow>
          <SummaryRow label="Total">
            <span className="font-mono">{formatCurrency(success.notionalValue)}</span>
          </SummaryRow>
          <SummaryRow label="Cash balance">
            <span className="font-mono">{formatCurrency(success.cashBalance)}</span>
          </SummaryRow>
          <SummaryRow label="Holding">
            <span className="font-mono">
              {formatCryptoQuantity(success.holdingQuantity)} {asset.symbol}
            </span>
          </SummaryRow>
        </div>
        {success.alreadyExecuted ? (
          <p className="mt-2 text-xs text-[var(--color-text-faint)]">
            This order was already executed. The result above is the original trade.
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Trade again
          </button>
          <Link
            href="/portfolio"
            className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
          >
            View portfolio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Paper trade</h2>
        <span className="text-xs text-[var(--color-text-faint)]">Simulated, no real money</span>
      </div>

      <div className="mt-3 flex gap-2">
        <SideTab side="buy" active={side === "buy"} onSelect={setSide} />
        <SideTab side="sell" active={side === "sell"} onSelect={setSide} />
      </div>

      {step === "edit" ? (
        <>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              aria-pressed={mode === "usd"}
              onClick={() => setMode("usd")}
              className={
                mode === "usd"
                  ? "rounded bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)]"
                  : "rounded px-3 py-1 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
              }
            >
              USD amount
            </button>
            <button
              type="button"
              aria-pressed={mode === "quantity"}
              onClick={() => setMode("quantity")}
              className={
                mode === "quantity"
                  ? "rounded bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)]"
                  : "rounded px-3 py-1 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)]"
              }
            >
              Quantity
            </button>
          </div>

          <label
            htmlFor="trade-input"
            className="mt-3 block text-xs text-[var(--color-text-faint)]"
          >
            {mode === "usd" ? "Amount in dollars" : `Amount in ${asset.symbol}`}
          </label>
          <div className="mt-1 flex items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 focus-within:border-[var(--color-accent)]">
            {mode === "usd" ? (
              <span className="text-sm text-[var(--color-text-faint)]">$</span>
            ) : null}
            <input
              id="trade-input"
              inputMode="decimal"
              autoComplete="off"
              value={input}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "" || INPUT_PATTERN.test(value)) setInput(value);
              }}
              placeholder={mode === "usd" ? "50" : "0.01"}
              className="w-full bg-transparent py-2 pl-1 font-mono text-sm outline-none"
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
            {price !== null ? (
              <p>
                Market price:{" "}
                <span className="font-mono text-[var(--color-foreground)]">
                  {formatUsdPrice(price, asset.displayDecimals)}
                </span>
              </p>
            ) : (
              <p>Market price: Unavailable</p>
            )}
            {inputValid && estimatedQuantity !== null ? (
              <p>
                {mode === "usd" ? "Estimated quantity: " : "Estimated total: "}
                <span className="font-mono text-[var(--color-foreground)]">
                  {mode === "usd"
                    ? `${formatCryptoQuantity(estimatedQuantity)} ${asset.symbol}`
                    : formatCurrency(estimatedTotal ?? 0)}
                </span>
              </p>
            ) : null}
            <p>
              {side === "buy" ? "Available cash: " : "Your holding: "}
              <span className="font-mono text-[var(--color-foreground)]">
                {!portfolioLoaded
                  ? "Loading"
                  : side === "buy"
                    ? formatCurrency(cash ?? 0)
                    : `${formatCryptoQuantity(holdingQuantity)} ${asset.symbol}`}
              </span>
            </p>
            <p className="text-[var(--color-text-faint)]">
              Price source: Binance public market data. Last update:{" "}
              {quote ? formatTimestamp(quote.receivedAt) : "Unavailable"}
            </p>
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-[var(--color-negative)] px-3 py-2 text-xs text-[var(--color-negative)]">
              {error}
            </p>
          ) : null}
          {clientError && input !== "" ? (
            <p className="mt-3 text-xs text-[var(--color-negative)]">{clientError}</p>
          ) : null}

          <button
            type="button"
            disabled={!canReview}
            onClick={() => setStep("review")}
            className="mt-4 w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review order
          </button>
        </>
      ) : (
        <>
          <div className="mt-3 divide-y divide-[var(--color-border)]">
            <SummaryRow label="Action">
              {side === "buy" ? "Buy" : "Sell"} {asset.name}
            </SummaryRow>
            <SummaryRow label="Asset">
              {asset.name} ({asset.symbol})
            </SummaryRow>
            <SummaryRow label="Current market price">
              <span className="font-mono">
                {price !== null ? formatUsdPrice(price, asset.displayDecimals) : "Unavailable"}
              </span>
            </SummaryRow>
            <SummaryRow label="Quantity">
              <span className="font-mono">
                {estimatedQuantity !== null
                  ? `${formatCryptoQuantity(estimatedQuantity)} ${asset.symbol}`
                  : "Unavailable"}
              </span>
            </SummaryRow>
            <SummaryRow label="Estimated total">
              <span className="font-mono">{formatCurrency(estimatedTotal ?? 0)}</span>
            </SummaryRow>
            <SummaryRow label={side === "buy" ? "Available cash" : "Your holding"}>
              <span className="font-mono">
                {side === "buy"
                  ? formatCurrency(cash ?? 0)
                  : `${formatCryptoQuantity(holdingQuantity)} ${asset.symbol}`}
              </span>
            </SummaryRow>
            <SummaryRow label="Price source">Binance public market data</SummaryRow>
            <SummaryRow label="Last market update">
              {quote ? formatTimestamp(quote.receivedAt) : "Unavailable"}
            </SummaryRow>
            <SummaryRow label="Fee">0.00 (no fees in this version)</SummaryRow>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep("edit")}
              className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || !tradable}
              onClick={confirmTrade}
              className={
                side === "buy"
                  ? "flex-1 rounded-md bg-[var(--color-positive)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  : "flex-1 rounded-md bg-[var(--color-negative)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {submitting
                ? "Submitting"
                : `Confirm ${side === "buy" ? "buy" : "sell"} of ${asset.symbol}`}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-faint)]">
            The server recalculates the price and validates your balance before executing. Client
            prices are never trusted.
          </p>
        </>
      )}
    </section>
  );
}
