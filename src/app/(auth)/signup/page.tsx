import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        <div className="mb-6">
          <p className="font-display text-xl tracking-wide">BiTrade</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Create an account and start with a $10,000 paper balance.
          </p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
