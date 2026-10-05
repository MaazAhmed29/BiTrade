"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssetById } from "@/config/assets";
import { formatCryptoQuantity, formatCurrency, formatUsdPrice } from "@/lib/formatting/format";

export type AssistantProposal = {
  proposalId: string;
  action: "buy" | "sell";
  assetId: string;
  symbol: string;
  amountType: "quote" | "base";
  amount: string;
  marketPrice: string;
  estimatedQuantity: string;
  estimatedNotional: string;
  createdAt: number;
  expiresAt: number;
};

type ProposalState = {
  proposal: AssistantProposal;
  status: "pending" | "working" | "executed" | "rejected" | "expired" | "failed" | "processed";
  execution?: {
    quantity: string;
    executionPrice: string;
    notionalValue: string;
    cashBalance: string;
  };
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals: ProposalState[];
};

function assetLabel(proposal: AssistantProposal): string {
  const asset = getAssetById(proposal.assetId);
  return asset ? `${asset.name}, ${asset.symbol}` : proposal.assetId;
}

function amountLabel(proposal: AssistantProposal): string {
  return proposal.amountType === "quote"
    ? formatCurrency(proposal.amount)
    : `${formatCryptoQuantity(proposal.amount)} ${proposal.symbol}`;
}

function ProposalCard({
  state,
  now,
  onDecide,
}: {
  state: ProposalState;
  now: number;
  onDecide: (proposalId: string, decision: "approve" | "reject") => void;
}) {
  const { proposal, status } = state;
  const secondsLeft = Math.max(0, Math.ceil((proposal.expiresAt - now) / 1000));
  const isExpired = status === "pending" && secondsLeft === 0;
  const busy = status === "working";

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-background)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
        Trade proposal
      </p>

      {status === "executed" && state.execution ? (
        <>
          <p className="mt-2 text-sm font-semibold">Paper trade completed</p>
          <p className="mt-1 text-sm font-medium">
            {proposal.action === "buy" ? "BUY" : "SELL"} {proposal.symbol}
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Quantity</dt>
              <dd className="font-mono">
                {formatCryptoQuantity(state.execution.quantity)} {proposal.symbol}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Execution price</dt>
              <dd className="font-mono">
                {formatUsdPrice(
                  state.execution.executionPrice,
                  getAssetById(proposal.assetId)?.displayDecimals ?? 2,
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Total value</dt>
              <dd className="font-mono">{formatCurrency(state.execution.notionalValue)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Remaining cash</dt>
              <dd className="font-mono">{formatCurrency(state.execution.cashBalance)}</dd>
            </div>
          </dl>
        </>
      ) : status === "rejected" ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Proposal rejected. No trade was created.
        </p>
      ) : status === "expired" ? (
        <p className="mt-2 text-sm text-[var(--color-negative)]">
          This proposal has expired. Ask for a new proposal.
        </p>
      ) : (
        <>
          <p
            className={`mt-2 text-lg font-semibold ${proposal.action === "buy" ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
          >
            {proposal.action === "buy" ? "BUY" : "SELL"}
          </p>
          <p className="text-sm">{assetLabel(proposal)}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Amount</dt>
              <dd className="font-mono">{amountLabel(proposal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Estimated quantity</dt>
              <dd className="font-mono">
                {formatCryptoQuantity(proposal.estimatedQuantity)} {proposal.symbol}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Reference price</dt>
              <dd className="font-mono">
                {formatUsdPrice(
                  proposal.marketPrice,
                  getAssetById(proposal.assetId)?.displayDecimals ?? 2,
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--color-text-faint)]">
            This is a paper trade using your BiTrade balance.
            {status === "pending" && !isExpired ? ` Expires in ${secondsLeft}s.` : ""}
          </p>

          {state.error ? (
            <p className="mt-3 rounded-md border border-[var(--color-negative)] px-3 py-2 text-xs text-[var(--color-negative)]">
              {state.error}
            </p>
          ) : null}

          {status === "processed" ? (
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              {state.error ?? "This proposal was already processed."}
            </p>
          ) : null}

          {status === "pending" || status === "working" || status === "failed" ? (
            isExpired ? (
              <p className="mt-3 text-xs text-[var(--color-negative)]">
                This proposal has expired. Ask for a new proposal.
              </p>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy || isExpired}
                  onClick={() => onDecide(proposal.proposalId, "approve")}
                  className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {busy ? "Working..." : isExpired ? "Expired" : "Approve trade"}
                </button>
                <button
                  type="button"
                  disabled={busy || isExpired}
                  onClick={() => onDecide(proposal.proposalId, "reject")}
                  className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-foreground)] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

export function AssistantPanel({ available = true }: { available?: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasPending = messages.some((message) =>
    message.proposals.some((proposal) => proposal.status === "pending"),
  );

  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  function updateProposal(
    proposalId: string,
    patch: Partial<ProposalState> & { status: ProposalState["status"] },
  ) {
    setMessages((current) =>
      current.map((message) => ({
        ...message,
        proposals: message.proposals.map((state) =>
          state.proposal.proposalId === proposalId ? { ...state, ...patch } : state,
        ),
      })),
    );
  }

  async function decide(proposalId: string, decision: "approve" | "reject") {
    updateProposal(proposalId, { status: "working", error: undefined });
    try {
      const response = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        status?: string;
        trade?: {
          quantity: string;
          executionPrice: string;
          notionalValue: string;
        };
        cashBalance?: string;
      } | null;

      if (response.ok && payload?.status === "executed" && payload.trade) {
        updateProposal(proposalId, {
          status: "executed",
          execution: {
            quantity: payload.trade.quantity,
            executionPrice: payload.trade.executionPrice,
            notionalValue: payload.trade.notionalValue,
            cashBalance: payload.cashBalance ?? "0.00",
          },
        });
        router.refresh();
        return;
      }
      if (response.ok && payload?.status === "rejected") {
        updateProposal(proposalId, { status: "rejected" });
        return;
      }
      if (response.status === 409) {
        updateProposal(proposalId, {
          status: payload?.status === "executed" ? "executed" : "processed",
          error: payload?.error ?? "This proposal was already processed.",
        });
        return;
      }
      if (response.status === 422 && payload?.status === "expired") {
        updateProposal(proposalId, { status: "expired" });
        return;
      }
      if (response.status === 422) {
        updateProposal(proposalId, {
          status: "failed",
          error: payload?.error ?? "Trade rejected.",
        });
        router.refresh();
        return;
      }
      updateProposal(proposalId, {
        status: "pending",
        error: payload?.error ?? "The request failed. Try again.",
      });
    } catch {
      updateProposal(proposalId, {
        status: "pending",
        error: "The request failed. Check your connection and try again.",
      });
    }
  }

  async function send() {
    const text = input.trim();
    if (text.length === 0 || busy) return;

    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const userId = `m-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: text, proposals: [] },
    ]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(-20) }),
      });
      const payload = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
        proposals?: AssistantProposal[];
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "AI assistant is temporarily unavailable.");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: payload?.reply ?? "I could not complete that request.",
          proposals: (payload?.proposals ?? []).map((proposal) => ({
            proposal,
            status: "pending",
          })),
        },
      ]);
    } catch {
      setError("AI assistant is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="assistant"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">AI assistant</h2>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                available ? "bg-[var(--color-positive)]" : "bg-[var(--color-text-faint)]"
              }`}
            />
            {available ? "Online" : "Unavailable"}
          </span>
        </div>
        <span className="hidden text-xs text-[var(--color-text-faint)] sm:inline">
          Paper trades only. You approve every trade.
        </span>
      </div>

      {available ? null : (
        <p className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          The AI provider is not configured on this deployment. Add AI credentials in the server
          environment to enable the assistant.
        </p>
      )}

      <div className="mt-3 flex max-h-96 min-h-48 flex-col gap-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Ask about prices, your portfolio, or request a paper trade such as &quot;Buy $50 of
            Bitcoin&quot;.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white"
                    : "max-w-[95%] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.proposals.map((state) => (
                  <ProposalCard
                    key={state.proposal.proposalId}
                    state={state}
                    now={now}
                    onDecide={decide}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {busy ? <p className="text-sm text-[var(--color-text-faint)]">Thinking...</p> : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-[var(--color-negative)] px-3 py-2 text-xs text-[var(--color-negative)]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <div className="flex flex-1 items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 focus-within:border-[var(--color-accent)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Ask a question or request a paper trade"
            aria-label="Message the AI assistant"
            className="w-full resize-none bg-transparent py-2 text-sm outline-none placeholder:text-[var(--color-text-faint)]"
          />
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || input.trim().length === 0}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
