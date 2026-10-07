import { BotIcon, ChevronDownIcon, LogoMark, SearchIcon, UserIcon } from "@/components/icons";

const WATCHLIST = [
  { name: "Bitcoin", symbol: "BTC", price: "$94,732.16", change: "+2.41%", color: "#F7931A" },
  { name: "Ethereum", symbol: "ETH", price: "$1,789.32", change: "+1.76%", color: "#627EEA" },
  { name: "Solana", symbol: "SOL", price: "$142.67", change: "+3.56%", color: "#9945FF" },
] as const;

const TIMEFRAMES = ["1D", "7D", "1M", "3M", "1Y", "ALL"] as const;

// Static illustration values (open, close, low, high). Decorative only.
const CANDLES: ReadonlyArray<readonly [number, number, number, number]> = [
  [88600, 88350, 88200, 88750],
  [88350, 88700, 88250, 88850],
  [88700, 88550, 88400, 88900],
  [88550, 89050, 88450, 89150],
  [89050, 88900, 88750, 89200],
  [88900, 89350, 88800, 89450],
  [89350, 89650, 89250, 89800],
  [89650, 89400, 89300, 89750],
  [89400, 89200, 89050, 89550],
  [89200, 89600, 89100, 89700],
  [89600, 89950, 89500, 90050],
  [89950, 89800, 89650, 90100],
  [89800, 90250, 89700, 90350],
  [90250, 90550, 90150, 90700],
  [90550, 90300, 90200, 90650],
  [90300, 90100, 89950, 90450],
  [90100, 90500, 90000, 90600],
  [90500, 90850, 90400, 90950],
  [90850, 91150, 90750, 91300],
  [91150, 90950, 90850, 91250],
  [90950, 91400, 90850, 91500],
  [91400, 91750, 91300, 91850],
  [91750, 91550, 91450, 91900],
  [91550, 91400, 91250, 91650],
  [91400, 91850, 91300, 91950],
  [91850, 92200, 91750, 92300],
  [92200, 92550, 92100, 92650],
  [92550, 92350, 92250, 92700],
  [92350, 92100, 91950, 92450],
  [92100, 92500, 92000, 92600],
  [92500, 92900, 92400, 93000],
  [92900, 93250, 92800, 93350],
  [93250, 93050, 92950, 93400],
  [93050, 93500, 92950, 93600],
  [93500, 93900, 93400, 94000],
  [93900, 94250, 93800, 94350],
  [94250, 94050, 93950, 94400],
  [94050, 94500, 93950, 94600],
  [94500, 94900, 94400, 95000],
  [94900, 95350, 94800, 95500],
];

const PLOT_LEFT = 10;
const PLOT_RIGHT = 566;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 208;
const PRICE_MIN = 88000;
const PRICE_MAX = 96000;
const Y_LABELS = [96000, 94000, 92000, 90000, 88000];
const X_LABELS = ["00:00", "06:00", "12:00", "18:00"];

function priceToY(price: number): number {
  const ratio = (price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN);
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP);
}

function CandlestickChart() {
  const slot = (PLOT_RIGHT - PLOT_LEFT) / CANDLES.length;

  return (
    <svg viewBox="0 0 640 232" className="h-auto w-full" role="presentation">
      {Y_LABELS.map((price) => (
        <g key={price}>
          <line
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={priceToY(price)}
            y2={priceToY(price)}
            stroke="#1e2839"
            strokeWidth={1}
          />
          <text
            x={PLOT_RIGHT + 10}
            y={priceToY(price) + 4}
            fill="#5a6478"
            fontSize={11}
            fontFamily="var(--font-geist-mono), monospace"
          >
            {price.toLocaleString("en-US")}
          </text>
        </g>
      ))}

      {CANDLES.map(([open, close, low, high], index) => {
        const up = close >= open;
        const color = up ? "#22c55e" : "#ef4444";
        const centerX = PLOT_LEFT + slot * index + slot / 2;
        const bodyTop = priceToY(Math.max(open, close));
        const bodyHeight = Math.max(Math.abs(priceToY(open) - priceToY(close)), 1.5);
        return (
          <g key={index}>
            <line
              x1={centerX}
              x2={centerX}
              y1={priceToY(high)}
              y2={priceToY(low)}
              stroke={color}
              strokeWidth={1.4}
            />
            <rect x={centerX - 4.5} y={bodyTop} width={9} height={bodyHeight} fill={color} rx={1} />
          </g>
        );
      })}

      {X_LABELS.map((label, index) => (
        <text
          key={label}
          x={PLOT_LEFT + ((PLOT_RIGHT - PLOT_LEFT) / X_LABELS.length) * index + 30}
          y={226}
          fill="#5a6478"
          fontSize={11}
          fontFamily="var(--font-geist-mono), monospace"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

export function WorkstationPreview() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <LogoMark className="h-5 w-5" />
        <span className="font-display text-sm tracking-wide">BiTrade</span>
        <div className="mx-1 hidden min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 sm:flex">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)]" />
          <span className="truncate text-xs text-[var(--color-text-faint)]">
            Search coins (e.g. Bitcoin, Ethereum)
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <UserIcon className="h-4 w-4" />
          <span>Guest</span>
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr]">
        <div className="hidden flex-col gap-3 border-r border-[var(--color-border)] p-4 sm:flex">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <div className="flex flex-col gap-3">
              {WATCHLIST.map((coin) => (
                <div key={coin.symbol} className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: coin.color }}
                  >
                    {coin.symbol.slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {coin.name}{" "}
                      <span className="font-normal text-[var(--color-text-faint)]">
                        {coin.symbol}
                      </span>
                    </span>
                    <span className="block font-mono text-[11px] text-[var(--color-text-muted)]">
                      {coin.price}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-[var(--color-positive)]">
                    {coin.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-[11px] text-[var(--color-text-muted)]">Demo balance</p>
            <p className="mt-1 font-mono text-xl font-semibold">$10,000.00</p>
            <span className="mt-2 inline-block rounded bg-[var(--color-positive)]/15 px-2 py-0.5 font-mono text-[11px] text-[var(--color-positive)]">
              +0.00% today
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: "#F7931A" }}
            >
              B
            </span>
            <span className="text-sm font-semibold">Bitcoin (BTC)</span>
            <div className="ml-auto flex items-center gap-1">
              {TIMEFRAMES.map((timeframe) => (
                <span
                  key={timeframe}
                  className={`rounded px-2 py-1 font-mono text-[11px] ${
                    timeframe === "1D"
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {timeframe}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-semibold sm:text-3xl">$94,732.16</span>
            <span className="font-mono text-sm text-[var(--color-positive)]">+2.41% (24h)</span>
          </div>

          <CandlestickChart />

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-accent)] text-white">
                <BotIcon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">AI Assistant</span>
              <span className="ml-auto text-[11px] text-[var(--color-text-faint)]">Now</span>
            </div>
            <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              <p>The market looks strong for BTC right now.</p>
              <p>
                I can buy $500 worth of BTC at approximately $94,732.16 (about 0.0053 BTC). Would
                you like me to approve this trade?
              </p>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <span className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-medium text-white">
                Approve trade
              </span>
              <span className="rounded border border-[var(--color-border-strong)] px-3 py-1.5 text-[11px] text-[var(--color-text-muted)]">
                Decline
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
