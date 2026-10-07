import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { WorkstationPreview } from "./workstation-preview";

const trustItems = [
  "Free to start",
  "No real money required",
  "Practice with live market data",
] as const;

export function Hero() {
  return (
    <section id="top" className="scroll-mt-20">
      <div className="mx-auto grid w-full items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-16 lg:py-24 xl:px-20">
        <div>
          <span className="inline-flex rounded-full border border-[var(--color-border-strong)] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Your personal AI trading workstation
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Learn the market.
            <br />
            <span className="text-[#3b82f6]">Trade with confidence.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
            Practice with live crypto market data, build your strategies with a simulated $10,000
            balance, and use an AI assistant that proposes trades for your approval.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
            >
              Start trading for free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--color-text-muted)]">
            {trustItems.map((item, index) => (
              <span key={item} className="flex items-center gap-3">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-[var(--color-text-faint)]">
                    &bull;
                  </span>
                ) : null}
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <WorkstationPreview />
        </div>
      </div>
    </section>
  );
}
