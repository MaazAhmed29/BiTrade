import { BotIcon, ShieldIcon, TrendUpIcon } from "@/components/icons";
import { SectionHeading } from "./section-heading";

const features = [
  {
    icon: TrendUpIcon,
    title: "Live market data",
    description: "Get real time price updates and accurate charts for 15 top cryptocurrencies.",
  },
  {
    icon: ShieldIcon,
    title: "Risk-free paper trading",
    description: "Trade with a simulated $10,000 balance and learn without any financial risk.",
  },
  {
    icon: BotIcon,
    title: "AI trading assistant",
    description:
      "Ask questions, get market insights, and let the AI propose trades for your approval.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-16 xl:px-20">
        <SectionHeading
          title="Everything you need to practice smarter"
          description="Powerful tools, real market data and an AI assistant, all in one place."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition hover:border-[var(--color-border-strong)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[#3b82f6]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
