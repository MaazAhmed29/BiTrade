import { SectionHeading } from "./section-heading";

const steps = [
  {
    number: "01",
    title: "Create your free account",
    description:
      "Sign up with an email and password in seconds. No exchange account, no credit card and no downloads.",
  },
  {
    number: "02",
    title: "Receive $10,000 in demo cash",
    description:
      "Your paper account is created once with a simulated $10,000 balance, ready to trade immediately.",
  },
  {
    number: "03",
    title: "Practice with live data and AI",
    description:
      "Study charts, place simulated orders and let the AI assistant propose trades that you approve or reject.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="How it works"
          description="From sign up to your first paper trade in three simple steps."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] font-mono text-sm font-semibold text-white">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
