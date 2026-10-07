import { BotIcon, ShieldIcon, TargetIcon, TrendUpIcon } from "@/components/icons";
import { SectionHeading } from "./section-heading";

const outcomes = [
  {
    icon: TrendUpIcon,
    title: "Read charts and market data",
    description:
      "Learn to interpret candlesticks, 24 hour highs and lows, volume and price movement across intervals.",
  },
  {
    icon: TargetIcon,
    title: "Build and test strategies",
    description:
      "Place simulated buy and sell orders, then compare results in your trade history and portfolio views.",
  },
  {
    icon: ShieldIcon,
    title: "Manage risk without real money",
    description:
      "Practice position sizing and portfolio allocation with a $10,000 demo balance and zero financial risk.",
  },
  {
    icon: BotIcon,
    title: "Evaluate AI trade proposals",
    description:
      "Review every AI proposal against live data, then approve or reject it. The AI never trades on its own.",
  },
] as const;

export function LearningSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-16 xl:px-20">
        <SectionHeading
          title="What you will learn"
          description="BiTrade turns market data into hands on practice, with real consequences for your paper balance but none for your wallet."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;
            return (
              <div
                key={outcome.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[#3b82f6]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{outcome.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {outcome.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
