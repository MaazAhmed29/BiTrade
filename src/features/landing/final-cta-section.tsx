import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export function FinalCtaSection() {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-16 xl:px-20">
        <div className="rounded-2xl bg-[var(--color-accent)] px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to practice with live markets?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Create your free account and start with a $10,000 paper balance. No card, no real money,
            no exchange connection.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-accent-hover)] transition hover:bg-[#e8ecf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-accent)]"
            >
              Create free account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
