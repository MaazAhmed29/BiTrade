import { SectionHeading } from "./section-heading";

const stats = [
  { value: "$10,000", label: "Starting paper balance, credited once" },
  { value: "15", label: "Fixed top crypto assets to study" },
  { value: "$0", label: "Cost to start, no card required" },
  { value: "100%", label: "Simulated trades, zero real money" },
] as const;

export function AboutSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              title="What is BiTrade?"
              description="A paper trading workstation for learning, not a real exchange."
            />
            <div className="mt-6 space-y-4 text-left text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              <p>
                BiTrade is a browser based simulator for cryptocurrency markets. You create an
                account, receive a simulated $10,000 balance, and work with the same kind of data
                real traders watch: live prices, candlestick charts and 24 hour stats for 15 fixed
                cryptocurrencies, read from public Binance market streams.
              </p>
              <p>
                You place paper buy and sell orders, track your portfolio and review your trade
                history, while an AI assistant answers questions and prepares trade proposals.
                Nothing is ever executed until you approve it, and no real money, exchange account
                or wallet is involved at any point.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
              >
                <p className="font-mono text-3xl font-semibold text-[#3b82f6]">{stat.value}</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
