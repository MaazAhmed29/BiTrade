import { MarketOverview } from "@/features/markets/market-overview";

export default function MarketsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Markets</h1>
      <MarketOverview />
    </div>
  );
}
