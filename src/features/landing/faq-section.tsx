import { ChevronDownIcon } from "@/components/icons";
import { SectionHeading } from "./section-heading";

const faqs = [
  {
    question: "Is BiTrade a real exchange?",
    answer:
      "No. BiTrade is a paper trading simulator only. It never connects to an exchange account, never holds cryptocurrency and never moves real money. Every executed order is an internal BiTrade paper trade.",
  },
  {
    question: "Does it cost anything?",
    answer:
      "No. BiTrade is free to start. You receive a simulated $10,000 paper balance once when you create your account, and no credit card is required.",
  },
  {
    question: "Where does the market data come from?",
    answer:
      "Prices and charts come from public Binance market data streams, used in read only mode. The app shows the data source and the latest update timestamp so you always know how fresh the numbers are.",
  },
  {
    question: "Do I need an exchange account or wallet?",
    answer:
      "No. All you need is an email and a password. BiTrade does not request exchange credentials and has no wallet or deposit functionality.",
  },
  {
    question: "Can the AI execute trades on its own?",
    answer:
      "Never. The AI only prepares a trade proposal. The server validates every parameter, you see a confirmation card, and the trade runs only after you explicitly approve it. Rejecting or ignoring a proposal means nothing happens.",
  },
  {
    question: "What exactly is paper trading?",
    answer:
      "Paper trading means practicing with simulated money against real market prices. You learn how orders, positions and portfolio value behave without any financial risk.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Frequently asked questions"
          description="The essentials about how BiTrade works and what it costs."
        />
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] open:border-[var(--color-border-strong)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
                {faq.question}
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
