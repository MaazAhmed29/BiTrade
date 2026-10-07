<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BiTrade Agent Instructions

## 1. Project Identity

Project name: BiTrade
Project type: AI Trading Workstation and Paper Trading Simulator
Primary framework: Next.js with TypeScript and the App Router
Database and authentication: Supabase
Hosting target: Vercel Hobby plan
Development agent: OpenCode using the user's available Nemotron 3 Ultra setup
Initial infrastructure budget: $0

BiTrade is a browser based paper trading workstation for cryptocurrency market data. Users create an account, receive a fake starting balance of $10,000, monitor 15 fixed cryptocurrencies using public market data, study charts and portfolio performance, and interact with an AI chatbot that can answer questions and prepare simulated buy or sell actions.

BiTrade must never execute real cryptocurrency trades, connect to a user's exchange account, request exchange trading credentials, hold real cryptocurrency, or move real money.

The application is a simulation and educational software project. All executed orders are internal BiTrade paper trades.

## 2. Non Negotiable Design Rules

Follow these rules throughout the project.

1. Do not use gradients anywhere in the UI.
2. Do not use emoji anywhere in the application, UI, source code comments, database seed data, system prompts, error messages, documentation, or user facing copy.
3. Do not use the em dash character U+2014 anywhere. Use commas, parentheses, colons, or separate sentences instead.
4. Do not add cryptocurrency assets beyond the fixed 15 asset list unless explicitly instructed later.
5. Do not dynamically replace the fixed 15 assets with the current market ranking.
6. Do not use CoinGecko for asset ranking or market data in the initial version.
7. Do not use Massive in the initial version.
8. Do not use real exchange trading APIs.
9. Do not add real wallet functionality.
10. Do not add deposits, withdrawals, payment processing, leverage, margin, futures, options, borrowing, or liquidation systems.
11. Do not generate random fake market prices when the public market data provider is unavailable.
12. Do not let the AI execute a paper trade without explicit user approval.
13. Do not trust AI generated quantities, symbols, balances, or prices. The server must validate all trade parameters.
14. Never expose Supabase service role secrets or any private API secret in browser code.
15. Keep secrets in environment variables and make the application fail safely when required secrets are missing.
16. Do not over engineer the first version. Build the smallest robust system that satisfies this specification.
17. Do not rewrite working parts of the application just to change architecture during later phases.
18. Keep all prices and monetary calculations precise. Avoid unsafe floating point calculations for financial state where an exact decimal representation is required.
19. Make the interface feel like a real premium trading workstation without copying any specific existing product.
20. Do not claim that market data is exchange grade or guaranteed real time. Display the source and latest update timestamp appropriately.

## 3. Fixed Supported Assets

BiTrade contains exactly these 15 cryptocurrencies:

1. Bitcoin, symbol BTC
2. Ethereum, symbol ETH
3. Tether, symbol USDT
4. BNB, symbol BNB
5. Solana, symbol SOL
6. XRP, symbol XRP
7. USD Coin, symbol USDC
8. Dogecoin, symbol DOGE
9. Cardano, symbol ADA
10. Avalanche, symbol AVAX
11. TRON, symbol TRX
12. Chainlink, symbol LINK
13. Toncoin, symbol TON
14. Shiba Inu, symbol SHIB
15. Polkadot, symbol DOT

The application must maintain a single typed asset registry as the source of truth.

Suggested configuration shape:

```ts
export const SUPPORTED_ASSETS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', pair: 'USDTUSDT' },
  { id: 'bnb', symbol: 'BNB', name: 'BNB', pair: 'BNBUSDT' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', pair: 'XRPUSDT' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', pair: 'USDCUSDT' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', pair: 'ADAUSDT' },
  { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSDT' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', pair: 'TRXUSDT' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', pair: 'LINKUSDT' },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', pair: 'TONUSDT' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', pair: 'SHIBUSDT' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', pair: 'DOTUSDT' },
] as const;
```

Important: `USDTUSDT` is not a valid exchange pair because USDT is itself the quote currency. Tether must therefore have a special market data strategy rather than blindly subscribing to an invalid pair. For the first implementation, treat USDT as a stable reference asset with a USD value of approximately 1.00 and show clearly that its reference value is a stable dollar approximation rather than inventing a nonexistent trading pair.

Likewise, verify at development time that every other configured pair is currently available from the selected public market data source. Keep pair mapping separate from display metadata so the asset registry can be adjusted without touching the rest of the application.

## 4. Core Product Experience

The main experience should feel like a trading workstation rather than a generic dashboard.

The authenticated user should be able to:

1. Sign up.
2. Log in.
3. Log out.
4. View their paper account with a starting balance of exactly $10,000.
5. See current cash balance, holdings, total portfolio value, unrealized profit and loss, realized profit and loss, and total return.
6. Browse the fixed 15 assets.
7. Search or filter the 15 assets only.
8. Open a detailed asset view.
9. View a responsive price chart.
10. View key market information available from the public data provider.
11. Buy an asset using paper money.
12. Sell an asset using paper holdings.
13. Review open and completed paper orders.
14. View transaction history.
15. View portfolio allocation.
16. Ask the AI chatbot questions about supported market data, portfolio state, trade history, and BiTrade features.
17. Ask the AI to prepare a paper buy or sell action.
18. Review a clear confirmation card before execution.
19. Explicitly approve or reject the proposed action.
20. See the result immediately after a successful paper trade.

## 5. Market Data System

### 5.1 Source of Truth

Use Binance public cryptocurrency market data for the initial implementation. Use it only for reading market information. Do not use Binance authenticated endpoints and do not request API keys for trading.

The current official Binance Spot documentation provides public WebSocket market streams for individual symbols and combined streams. Use the public stream for live market events and use public market data REST endpoints for historical candle data and initial synchronization.

Relevant official documentation to consult while implementing:

https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints

### 5.2 What "real time every 30 to 40 seconds" means

Do not fabricate price movement every 30 to 40 seconds.

Real cryptocurrency prices move continuously in the external market.

BiTrade should receive the latest market price continuously through the public market data stream when available. The application should visibly refresh and reconcile the dashboard quote state approximately every 35 seconds so the user's workstation feels stable and intentional rather than updating every tiny tick.

Use this model:

```text
Public market data
       |
       v
Live client market feed
       |
       +------------------------------+
       |                              |
       v                              v
Latest price state              Chart state
       |                              |
       v                              v
Dashboard refresh              Candle updates
around every 35 sec             as data arrives
```

The exact 35 second value should be stored as a configuration constant such as `MARKET_REFRESH_INTERVAL_MS = 35000`, not scattered throughout the codebase.

A refresh does not mean the source market is changing only every 35 seconds. It means BiTrade deliberately revalidates and commits the latest displayed quote state on that cadence.

### 5.3 Initial synchronization

When the dashboard loads:

1. Load the fixed asset registry.
2. Request the latest market state for all supported tradable pairs using efficient public endpoints.
3. Normalize the provider response into a common internal type.
4. Render the initial values.
5. Open the public market WebSocket for supported pairs.
6. Reconcile WebSocket values with the latest REST snapshot.
7. Show a visible last updated timestamp.

Do not block the whole dashboard indefinitely because one asset failed. Each asset should have its own status such as `live`, `stale`, or `unavailable`.

### 5.4 WebSocket strategy

Prefer one combined public WebSocket connection for the required streams rather than fifteen independent connections when practical.

Use the appropriate individual symbol trade or ticker streams, or an appropriate combined stream, depending on which fields the UI requires.

The market data adapter must handle:

1. Connection startup.
2. Initial subscription.
3. Incoming messages.
4. JSON parsing failures.
5. Unknown symbols.
6. Disconnections.
7. Automatic reconnection with exponential backoff.
8. Duplicate event protection when necessary.
9. Stale data detection.
10. Clean shutdown.
11. Browser tab visibility changes.
12. A fresh REST resynchronization after a prolonged disconnect.

Binance documents WebSocket connection lifetime and connection limits. Do not create an uncontrolled reconnect loop.

### 5.5 Do not use a persistent WebSocket server on Vercel

Do not try to create a permanently running Node WebSocket server inside a normal Vercel serverless deployment.

For the first version, the browser should connect directly to the public market data stream for read only market data. Next.js server routes should be used for server side validation, paper trading, authentication, AI tool execution, and historical market data requests where appropriate.

### 5.6 Historical charts

Charts must be based on actual public market data, not generated data.

Use historical OHLC or candlestick data from the public market data source.

Support useful intervals such as:

1. 1 minute
2. 5 minute
3. 15 minute
4. 1 hour
1. 4 hour
2. 1 day

Choose a sensible default such as 1 hour or 4 hours depending on the selected asset.

The agent should use a proper financial charting library suitable for candlestick data if one is available and compatible with the project. Do not fake candles with random values.

The chart should include:

1. Candlesticks.
2. Time axis.
3. Price axis.
4. Current price marker.
5. Crosshair.
6. Responsive resizing.
7. Loading state.
8. Error state.
9. Empty state.
10. Selected interval controls.
11. Optional volume if the library and data source support it cleanly.

The chart must not become unusable on smaller screens.

### 5.7 Market quote model

Normalize all provider responses into a type similar to:

```ts
export type MarketQuote = {
  assetId: string;
  symbol: string;
  pair: string | null;
  priceUsd: string;
  change24hPercent: string | null;
  high24hUsd: string | null;
  low24hUsd: string | null;
  volume24hUsd: string | null;
  marketTimestamp: number;
  receivedAt: number;
  source: 'binance';
  status: 'live' | 'stale' | 'unavailable';
};
```

Store exact financial values as strings or decimal compatible values when possible. Convert to numbers only for presentation or chart libraries when safe.

Never use `toFixed()` as the main source of financial truth.

## 6. Paper Trading Engine

This is one of the most important parts of BiTrade.

The trading engine is completely simulated.

### 6.1 Starting account

Every newly created BiTrade user gets exactly:

```text
Starting cash: $10,000.00
Initial holdings: none
Total starting equity: $10,000.00
```

Do not give the user a new $10,000 account every time they refresh or log in.

Create the paper account exactly once after successful signup or on the first authenticated onboarding transaction.

### 6.2 Trade execution

Support paper market style buy and sell orders.

Minimum buy validation:

1. User is authenticated.
2. Asset is in the fixed registry.
3. Action is `buy`.
4. Quantity or quote amount is positive.
5. Requested amount is within sensible application limits.
6. User has enough available paper cash.
7. A fresh market price exists.
8. Market data is not stale beyond the configured maximum age.
9. Server recalculates the execution value from the current trusted market price.
10. The client supplied price is never trusted.

Minimum sell validation:

1. User is authenticated.
2. Asset is in the fixed registry.
3. Action is `sell`.
4. Quantity is positive.
5. User owns enough paper quantity.
6. A fresh market price exists.
7. Server calculates proceeds from the trusted market price.

Do not allow the AI or client to submit an arbitrary execution price.

### 6.3 Fees

For the first version, use zero simulated trading fees unless a future product decision explicitly adds them.

If fees are added later, place the fee model behind one typed configuration and apply it consistently to every trade.

### 6.4 Order model

Every completed paper trade should have:

```ts
{
  id,
  userId,
  assetId,
  side,
  quantity,
  executionPrice,
  notionalValue,
  fee,
  totalCashChange,
  executedAt,
  source,
  status,
}
```

Recommended `source` values:

```text
manual
ai
```

Recommended `status` values:

```text
filled
rejected
```

The database should retain the order record even when an order is rejected if the event is useful for audit history. Store the rejection reason when practical.

### 6.5 Atomic trade execution

A trade must update all related financial state atomically.

Do not do this in multiple independent browser requests:

```text
update cash
then update holding
then insert trade
```

That can create inconsistent accounts.

Prefer a server side database transaction or PostgreSQL function/RPC that performs validation and updates in one atomic operation.

The server should calculate:

```text
newCash = oldCash + or - tradeValue
newQuantity = oldQuantity + or - tradeQuantity
```

The trade record and portfolio update should succeed together or fail together.

### 6.6 Portfolio value

Calculate:

```text
portfolioMarketValue = sum(holding.quantity * latestMarketPrice)
portfolioTotalValue = availableCash + portfolioMarketValue
profitLoss = portfolioTotalValue - 10000
returnPercent = profitLoss / 10000 * 100
```

Use decimal safe arithmetic.

If market data for an asset is stale or unavailable, do not silently treat it as zero. Flag that part of the portfolio as using stale or unavailable valuation data.

## 7. Database Design

Use Supabase PostgreSQL.

Recommended tables:

### `profiles`

Purpose: public application profile information linked to Supabase Auth.

Suggested fields:

```text
id uuid primary key references auth.users(id) on delete cascade
username text unique
created_at timestamptz
updated_at timestamptz
```

### `paper_accounts`

One row per user.

Suggested fields:

```text
id uuid primary key
user_id uuid unique references auth.users(id) on delete cascade
initial_balance numeric not null default 10000
cash_balance numeric not null default 10000
created_at timestamptz
updated_at timestamptz
```

### `holdings`

One row per user and asset.

Suggested fields:

```text
id uuid primary key
user_id uuid references auth.users(id) on delete cascade
asset_id text not null
quantity numeric not null default 0
average_entry_price numeric not null default 0
realized_pnl numeric not null default 0
updated_at timestamptz
unique(user_id, asset_id)
```

### `trades`

Suggested fields:

```text
id uuid primary key
user_id uuid references auth.users(id) on delete cascade
asset_id text not null
side text not null
quantity numeric not null
execution_price numeric not null
notional_value numeric not null
fee numeric not null default 0
cash_change numeric not null
source text not null
status text not null
rejection_reason text
created_at timestamptz
```

### `ai_action_logs`

Purpose: audit AI generated actions without storing unnecessary private model output.

Suggested fields:

```text
id uuid primary key
user_id uuid references auth.users(id) on delete cascade
action_type text not null
asset_id text
side text
quantity numeric
quote_amount numeric
status text not null
user_approved boolean not null default false
created_at timestamptz
executed_trade_id uuid references trades(id)
metadata jsonb
```

Keep `metadata` minimal and safe. Do not store API secrets or unnecessary private conversations.

### Optional `portfolio_snapshots`

Add only if a clean historical equity graph requires persistent snapshots. Do not create this table in Phase 1 unless needed.

If added, it can store periodic user portfolio valuations to render an equity curve.

## 8. Supabase Security

Use Supabase Auth for authentication.

Use Row Level Security on every user owned table exposed to the application. Supabase documentation recommends combining Auth with RLS and configuring grants and policies for every exposed table.

Every user owned row must be scoped by authenticated user ID.

A user must never be able to read or modify another user's:

1. Profile data intended to be private.
2. Paper account.
3. Holdings.
4. Trades.
5. AI action logs.
6. Portfolio snapshots.

Never send the Supabase service role key to the browser.

Use a server side Supabase client when privileged operations are required.

Create migrations rather than manually changing production tables with undocumented SQL.

Add database tests for RLS if practical. At minimum test that:

1. User A can read User A data.
2. User A cannot read User B data.
3. User A cannot update User B data.
4. Signed out users cannot access private account data.

## 9. Authentication

Implement email and password authentication first.

Required flows:

1. Signup.
2. Login.
3. Logout.
4. Persistent session.
5. Protected dashboard routes.
6. Redirect unauthenticated users to login.
7. Redirect authenticated users away from login/signup when appropriate.
8. Friendly authentication errors.
9. Loading states.

Use the current recommended Supabase SSR approach for Next.js rather than inventing an older authentication pattern.

Never store raw passwords yourself.

## 10. Next.js Architecture

Next.js is both the frontend and backend framework for this project.

Use:

```text
Next.js
React
TypeScript
App Router
Server Components where appropriate
Client Components only when interactivity is required
Route Handlers for API style endpoints
Supabase SSR integration
```

Suggested route structure:

```text
app/
  page.tsx
  login/page.tsx
  signup/page.tsx
  dashboard/page.tsx
  markets/page.tsx
  trade/page.tsx
  portfolio/page.tsx
  history/page.tsx
  settings/page.tsx
  api/
    market/
      snapshot/route.ts
      candles/route.ts
    portfolio/route.ts
    trade/route.ts
    ai/
      chat/route.ts
      action/route.ts
```

The exact structure can be changed when implementation reveals a better organization, but keep boundaries clear.

## 11. Recommended Code Organization

Create clear modules rather than placing all logic inside page components.

Suggested structure:

```text
src/
  components/
  features/
    auth/
    markets/
    charts/
    trading/
    portfolio/
    ai/
  lib/
    supabase/
    market-data/
    trading/
    ai/
    validation/
    formatting/
  types/
  config/
  hooks/
```

Market data should be behind an adapter interface such as:

```ts
interface MarketDataProvider {
  getSnapshot(assetIds: string[]): Promise<MarketQuote[]>;
  getCandles(assetId: string, interval: string, limit: number): Promise<Candle[]>;
}
```

The live WebSocket client should also be isolated behind a dedicated hook or market feed module.

This makes the provider replaceable later without rewriting the trading system.

## 12. Market Data Normalization

Never let Binance response formats spread throughout the UI.

Create a normalization layer:

```text
provider response
      |
      v
normalizer
      |
      v
internal MarketQuote type
      |
      +------> dashboard
      +------> asset detail
      +------> portfolio valuation
      +------> AI tools
```

All downstream systems should use the normalized internal model.

## 13. User Interface

The visual direction should be premium, clean, dense enough for trading, but not confusing.

Do not imitate a specific existing trading platform.

Avoid generic AI generated dashboard aesthetics.

### 13.1 Visual system

Use:

1. Dark primary interface.
2. Strong contrast.
3. Clear typography hierarchy.
4. Restrained borders.
5. Subtle shadows where useful.
6. Solid colors.
7. Clean cards.
8. Compact financial data presentation.
9. Consistent spacing.
10. Clear positive, negative, and neutral market states.

Do not use gradients.

Do not use excessive glassmorphism.

Do not use oversized decorative text.

Do not use random decorative blobs.

Do not add visual effects that reduce chart readability.

### 13.2 Main Dashboard

The main dashboard should contain:

1. Account summary.
2. Total portfolio value.
3. Cash balance.
4. Total unrealized P and L.
5. Total return percentage.
6. Market overview for the 15 assets.
7. Selected asset chart.
8. Holdings summary.
9. Recent trades.
10. AI assistant panel.
11. Market update indicator.

### 13.3 Market table or cards

Each asset should show:

1. Name.
2. Symbol.
3. Current price.
4. 24 hour percentage change.
5. 24 hour high.
6. 24 hour low.
7. Volume when available.
8. Data status.
9. Last updated time.

Use compact formatting, for example:

```text
BTC   $123,456.78
      +2.14%
```

But do not hardcode example numbers into the live UI.

### 13.4 Asset detail page

Show:

1. Asset name and symbol.
2. Current price.
3. 24 hour change.
4. High and low.
5. Volume.
6. Candlestick chart.
7. Time interval selector.
8. Buy panel.
9. Sell panel.
10. User's current holdings.
11. Estimated order value.
12. AI assistant entry point.

### 13.5 Trade panel

Allow the user to enter either:

1. Dollar amount.
2. Asset quantity.

Then calculate the other value from the trusted latest market price.

Show before confirmation:

```text
Action
Asset
Current market price
Quantity
Estimated total
Available cash or holdings
Source of price
Last market update
```

Then require confirmation.

## 14. AI Chatbot

The AI assistant is a central product feature.

It must support natural conversation and safe structured actions.

The AI can answer questions such as:

```text
What is the current BTC price?
How much BTC do I own?
What was my last trade?
How much cash do I have?
What is my current portfolio value?
Explain what market cap means.
Explain the difference between a market order and a limit order.
```

The assistant can also handle requests such as:

```text
Buy $500 of Bitcoin.
Sell 0.2 ETH.
Buy $100 of SOL.
```

However, the AI must never directly execute the trade.

## 15. AI Tool Architecture

Treat the AI as a planner and interface, not as the authority over financial state.

Give the model narrow tools such as:

```text
get_market_quote
get_market_quotes
get_asset_candles
get_user_portfolio
get_user_balance
get_user_holdings
get_trade_history
create_trade_proposal
```

Do not give the AI a tool named `execute_any_trade` without an explicit server side approval flow.

The only execution endpoint should require a valid approved action that the server generated and stored.

Recommended flow:

```text
User message
     |
     v
AI model
     |
     v
Structured trade proposal
     |
     v
Server validation
     |
     v
Confirmation shown to user
     |
     +---------- Reject ----------> End
     |
     v
User explicitly approves
     |
     v
Server validates again
     |
     v
Atomic paper trade execution
     |
     v
Supabase transaction
     |
     v
Updated portfolio
```

## 16. Trade Proposal Schema

Use a strict schema similar to:

```ts
export type TradeProposal = {
  proposalId: string;
  action: 'buy' | 'sell';
  assetId: string;
  symbol: string;
  amountType: 'quote' | 'base';
  amount: string;
  marketPrice: string;
  estimatedQuantity: string;
  estimatedNotional: string;
  createdAt: number;
  expiresAt: number;
};
```

The proposal should expire quickly, for example after 60 to 120 seconds.

When the user clicks Approve, the server must fetch or validate a fresh price and calculate execution values again.

Never execute a stale AI estimate as if it were guaranteed current.

## 17. AI Confirmation UX

A trade proposal should look clearly different from ordinary chat text.

Example UI:

```text
Trade proposal

BUY
Bitcoin, BTC

Amount: $500.00
Estimated quantity: 0.00 BTC
Reference price: $0.00

This is a paper trade using your BiTrade balance.

[Approve trade] [Reject]
```

The exact numeric values must come from live validated state.

After execution, show:

```text
Paper trade completed

BUY BTC
Quantity
Execution price
Total value
Remaining cash
```

## 18. AI Security Rules

The AI must not:

1. Change a user's starting balance.
2. Change ownership without a trade execution event.
3. Invent market prices.
4. Invent holdings.
5. Invent trade history.
6. Bypass server validation.
7. Execute a rejected proposal.
8. Execute an expired proposal.
9. Execute a trade after the user session has expired.
10. Access another user's information.

The backend is the authority for account state.

When information is unavailable, the assistant must say that it is unavailable rather than making up a value.

## 19. AI Provider Integration

Do not hardcode the project to one paid AI provider.

Create an AI provider interface such as:

```ts
interface AIProvider {
  chat(input: AIChatInput): Promise<AIChatResult>;
}
```

The user plans to use OpenCode with Nemotron 3 Ultra for development. Do not confuse the development coding model with the production inference provider for the deployed chatbot.

The deployed chatbot must use whichever inference endpoint the user has legitimately available at $0. Do not silently introduce a paid API dependency.

Put provider specific code behind an adapter and keep all AI environment variables server side.

If a production inference provider is not configured, the application should show a clear setup message in development and should not pretend that the AI is functioning.

The paper trading engine must remain fully functional without the AI.

## 20. Chatbot Context

The AI should receive only the information needed for each request.

For portfolio questions, provide current server validated data.

For market questions, retrieve current market data rather than relying on stale model knowledge.

For trade requests, create a structured proposal using current server validated data.

Do not dump the entire database into the prompt.

Keep system prompts concise enough to reduce unnecessary token usage.

## 21. API Routes

Implement only the endpoints needed by the application.

Suggested routes:

```text
GET  /api/market/snapshot
GET  /api/market/candles?asset=BTC&interval=1h&limit=200
GET  /api/portfolio
GET  /api/history
POST /api/trade
POST /api/ai/chat
POST /api/ai/action
```

Every private endpoint must verify the authenticated Supabase user.

Every endpoint must validate input using a schema library or equivalent strict validation.

Do not trust arbitrary query strings, asset IDs, order sides, quantities, or prices.

## 22. API Caching

Use caching carefully for public historical market data to reduce unnecessary requests.

Do not cache personalized portfolio or trading responses across users.

Never let one user's account data enter a shared cache.

Market data can be cached for short periods where appropriate, while live client market streams remain the preferred source for current quote updates.

## 23. Error Handling

Every major feature must have a proper error state.

Market data unavailable:

```text
Market data is temporarily unavailable.
Last successful update: [time]
```

Stale price:

```text
Price data is stale.
Trading is temporarily disabled until a fresh market price is available.
```

Paper trade rejected:

Show the actual validation reason without exposing internal implementation details.

AI unavailable:

```text
AI assistant is temporarily unavailable.
You can still trade manually using paper trading.
```

Never render raw stack traces to users.

## 24. Loading States

Use skeletons and intentional loading indicators for:

1. Dashboard cards.
2. Market table.
3. Charts.
4. Portfolio.
5. Trade confirmation.
6. AI responses.
7. Authentication actions.

Avoid flickering layouts.

## 25. Responsive Design

The workstation must work on:

1. Desktop.
2. Laptop.
3. Tablet.
4. Mobile.

Desktop can use a dense three column layout where useful.

Mobile should collapse intelligently into stacked sections and bottom sheets or modal panels when appropriate.

The chart must remain usable on mobile.

## 26. Accessibility

Implement:

1. Keyboard accessible controls.
2. Visible focus states.
3. Semantic buttons.
4. Accessible form labels.
5. Sufficient text contrast.
6. Error messages associated with inputs.
7. Meaning that does not rely only on red and green colors.
8. Reduced motion support where appropriate.

## 27. Financial Display Formatting

Create central formatting utilities.

Examples:

```text
formatCurrency()
formatCryptoQuantity()
formatPercent()
formatCompactNumber()
formatTimestamp()
```

Do not duplicate formatting logic across components.

Crypto quantity precision should depend on the asset and context.

Do not round quantities prematurely in financial state.

## 28. State Management

Do not introduce a large global state solution unless the application actually needs it.

Use server data where possible.

Use local React state for highly local UI interactions.

Use a small client market store or context for live market quote state if needed.

Keep authoritative financial state on the server and database.

The client is a presentation layer and input layer, not the authority.

## 29. Preventing Race Conditions

Paper trades must handle rapid repeated requests.

Two simultaneous buy requests must not both spend the same cash balance incorrectly.

Two simultaneous sell requests must not sell the same holding twice.

Use transactional database operations and appropriate row level locking or equivalent PostgreSQL mechanisms where required.

Idempotency should be considered for trade execution requests.

Each approved trade proposal should have a unique execution token or proposal ID that cannot be executed twice.

## 30. Auditability

Record enough information to understand what happened.

For each trade, preserve:

1. User ID.
2. Asset ID.
3. Side.
4. Quantity.
5. Trusted execution price.
6. Notional value.
7. Fee.
8. Source.
9. Timestamp.
10. Status.

For AI actions, preserve proposal status and whether the user approved it.

## 31. Dashboard Performance

The dashboard should remain responsive even when the live market feed sends frequent messages.

Do not update the entire application tree on every market tick if avoidable.

Use selective state updates.

Batch or throttle expensive computations.

Do not write every WebSocket tick to Supabase.

Market data is display state, not user transaction history.

Only persist user specific trade actions and optional portfolio snapshots.

## 32. Market Data Persistence

Do not create a database table containing every live market tick.

That would waste the free database quota and is unnecessary for the product.

Historical chart data should be requested from the external market data source when required.

Only cache a small amount of data in memory or short lived server caches when helpful.

## 33. Cost Control

The entire initial deployment target is $0.

Do not add any paid service unless the user explicitly changes the budget.

Target:

```text
Vercel: Free Hobby
Supabase: Free tier
Market data: public free market data
AI: only a legitimately available free inference option
Domain: Vercel subdomain
```

Do not add analytics, email services, storage services, vector databases, background workers, Redis, paid charting products, or paid AI APIs unless they are genuinely necessary and explicitly approved.

## 34. Environment Variables

Use a `.env.example` file.

Possible variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
```

Do not include real secrets in the repository.

Only include the service role key when a server side privileged operation actually requires it.

Keep all sensitive variables server only.

## 35. Git and Repository Hygiene

Create a clean repository.

Recommended files:

```text
AGENTS.md
README.md
.env.example
.gitignore
package.json
next.config.ts
tsconfig.json
supabase/
src/
app/
```

Do not commit `.env.local`.

Do not commit logs containing secrets.

Do not commit test credentials.

## 36. Documentation

The project must include a README that explains:

1. What BiTrade is.
2. That it is paper trading only.
3. Technology stack.
4. Local development setup.
5. Supabase setup.
6. Environment variables.
7. Market data source.
8. How the live market feed works.
9. How paper trades are executed.
10. How the AI action approval works.
11. How to deploy to Vercel.
12. Known limitations.

Do not describe BiTrade as a real brokerage or real exchange.

## 37. Testing Strategy

Do not stop when the page visually loads.

Test each system independently.

### Authentication tests

1. Signup.
2. Login.
3. Logout.
4. Protected route access.
5. Invalid credentials.
6. Session persistence.

### Market data tests

1. Initial snapshot loads.
2. All valid pairs normalize correctly.
3. WebSocket connects.
4. WebSocket updates correct asset.
5. Reconnection works.
6. Stale data is detected.
7. Invalid provider data is rejected.
8. Historical candles render.
9. Missing asset data does not crash the whole dashboard.

### Paper trading tests

1. New account starts at $10,000.
2. Buy reduces cash correctly.
3. Buy increases holdings correctly.
4. Sell reduces holdings correctly.
5. Sell increases cash correctly.
6. Insufficient cash rejects buy.
7. Insufficient holdings rejects sell.
8. Unknown asset rejects.
9. Invalid quantity rejects.
10. Stale price rejects trading.
11. Double execution of the same proposal is prevented.
12. Simultaneous trades cannot corrupt cash or holdings.

### AI tests

1. Normal questions receive grounded answers.
2. Portfolio questions use current server state.
3. Market questions use current market data.
4. Buy request creates a proposal only.
5. Sell request creates a proposal only.
6. Rejecting a proposal creates no trade.
7. Approving a proposal executes exactly once.
8. Expired proposals cannot execute.
9. AI cannot change balances directly.
10. AI cannot access another user.

### Security tests

1. RLS isolation.
2. Unauthorized API requests.
3. Schema validation.
4. Secret exposure checks.
5. Direct attempts to alter another user's account.
6. Malicious quantities.
7. Negative amounts.
8. Extremely large amounts.
9. Invalid asset identifiers.
10. Duplicate trade requests.

## 38. Phase Based Build Process

Do not build everything in one giant generation step.

Complete each phase, test it, then continue.

### Phase 0: Repository and project foundation

Tasks:

1. Inspect the repository.
2. Confirm Node and package manager versions.
3. Initialize Next.js App Router TypeScript project if needed.
4. Install only required dependencies.
5. Configure linting and formatting.
6. Create folder structure.
7. Create environment example.
8. Create the fixed asset registry.
9. Create README foundation.
10. Verify local app starts.

Stop and verify before Phase 1.

### Phase 1: Supabase authentication and database

Tasks:

1. Connect Supabase.
2. Configure SSR auth.
3. Build signup.
4. Build login.
5. Build logout.
6. Add protected routes.
7. Create profile table.
8. Create paper_accounts table.
9. Create holdings table.
10. Create trades table.
11. Create ai_action_logs table.
12. Add migrations.
13. Add RLS policies.
14. Test user isolation.
15. Create first time account initialization.

Stop and verify authentication before Phase 2.

### Phase 2: Market data

Tasks:

1. Build the market data provider adapter.
2. Implement fixed asset pair mapping.
3. Implement public snapshot fetching.
4. Implement normalization.
5. Implement public WebSocket market feed.
6. Implement reconnection.
7. Implement stale status.
8. Implement 35 second dashboard refresh reconciliation.
9. Build market overview UI.
10. Show source and last update time.
11. Handle the special USDT display case.
12. Verify all other configured pairs.

Stop and test the market system independently.

### Phase 3: Charts

Tasks:

1. Add the selected chart library.
2. Implement historical candle API.
3. Implement candle normalization.
4. Build responsive chart component.
5. Add intervals.
6. Add current price marker.
7. Add live current candle updates where practical.
8. Add loading and error states.
9. Test BTC, ETH, SOL and several lower priced assets.

Stop and test chart correctness before building trade execution.

### Phase 4: Paper trading engine

Tasks:

1. Create trade validation schema.
2. Create secure trade service.
3. Create atomic database execution function.
4. Implement buy.
5. Implement sell.
6. Implement holdings calculations.
7. Implement average entry price.
8. Implement realized P and L.
9. Implement unrealized P and L.
10. Implement portfolio valuation.
11. Implement trade history.
12. Build trade confirmation UI.
13. Test race conditions.

Stop when manual paper trading is reliable.

### Phase 5: AI chatbot

Tasks:

1. Create AI provider adapter.
2. Create server side chat endpoint.
3. Create AI system prompt.
4. Create market query tools.
5. Create portfolio query tools.
6. Create trade proposal tool.
7. Build chat interface.
8. Build trade proposal card.
9. Build approve and reject actions.
10. Implement proposal expiration.
11. Connect approved proposal to secure paper trading service.
12. Add AI action logging.
13. Test prompt injection and tool validation boundaries.

Stop and test AI actions separately from ordinary chat.

### Phase 6: Full workstation UI

Tasks:

1. Finish dashboard layout.
2. Finish markets section.
3. Finish portfolio page.
4. Finish history page.
5. Finish asset detail pages.
6. Finish settings.
7. Responsive polish.
8. Loading states.
9. Error states.
10. Accessibility pass.
11. Visual consistency pass.

Do not introduce unnecessary features.

### Phase 7: Hardening and deployment

Tasks:

1. Run type checks.
2. Run lint.
3. Run unit tests.
4. Run integration tests.
5. Test production build locally.
6. Inspect environment variable usage.
7. Verify secrets are not exposed.
8. Verify RLS.
9. Verify paper trading cannot reach a real exchange endpoint.
10. Verify market feed reconnect logic.
11. Deploy to Vercel.
12. Configure Supabase production URL settings.
13. Test signup on production.
14. Test market data on production.
15. Test paper trades on production.
16. Test AI chatbot on production if a free inference provider is configured.
17. Update README with final setup details.

## 39. Development Rules for the AI Coding Agent

The coding agent must behave incrementally.

Before modifying a subsystem:

1. Read the relevant files.
2. Understand the current implementation.
3. Preserve working functionality.
4. Make the smallest coherent change.
5. Run relevant checks.
6. Fix errors before moving on.
7. Explain what changed in the development notes when necessary.

Do not generate a huge amount of code blindly.

Do not delete working components just because a different implementation appears cleaner.

Do not create duplicate components for the same concept.

Do not install a dependency when native browser or Next.js functionality is sufficient.

When choosing between two libraries, prefer the smaller dependency footprint and better maintenance.

## 40. Definition of Done

BiTrade is considered complete when all of the following work:

1. A new user can sign up.
2. A returning user can log in.
3. The user receives exactly $10,000 in paper cash once.
4. The dashboard shows exactly the 15 fixed supported assets.
5. Asset prices come from public market data rather than random generation.
6. Market data visibly updates around every 35 seconds and can use the live public feed when available.
7. The application clearly shows the latest market timestamp.
8. Historical charts use actual market candle data.
9. The user can buy assets with paper cash.
10. The user can sell assets they own.
11. Trade execution is validated server side.
12. Trade updates are atomic.
13. Portfolio value updates from current market prices.
14. Trade history is stored in Supabase.
15. User data is isolated with RLS.
16. The AI can answer market and portfolio questions using current data.
17. The AI can prepare buy and sell proposals.
18. The AI cannot execute a trade without explicit approval.
19. Approved AI trades execute through the same secure paper trading engine as manual trades.
20. Rejected and expired proposals cannot execute.
21. No real money or real crypto trading capability exists.
22. The UI contains no gradients.
23. The UI contains no emojis.
24. The UI and source contain no em dash character U+2014.
25. The project can deploy on the Vercel Hobby target without requiring a paid server.
26. The project documentation accurately describes all free tier limitations and the paper trading nature of the product.

## 41. Important Implementation Decisions

### Decision A: Fixed assets

Do not implement current market cap ranking. The asset list is fixed by product design.

### Decision B: Market data

Use Binance public market data for the initial implementation. Use public data only. Do not use Binance authenticated trading functionality.

### Decision C: CoinGecko

Do not add CoinGecko. It is unnecessary because the asset list is fixed.

### Decision D: Massive

Do not add Massive to the initial implementation. The project has a strict $0 requirement and the initial system does not need it.

### Decision E: Fake trading balance

The $10,000 balance is internal paper money. It is not connected to an exchange wallet.

### Decision F: AI execution

The AI proposes. The user approves. The server validates. The paper engine executes.

### Decision G: Vercel

Use normal Next.js request handling on Vercel. Do not depend on a permanently running custom server process.

### Decision H: Supabase

Use Supabase Auth and PostgreSQL with strict RLS for private user data.

## 42. Final Agent Behavior

When asked to implement BiTrade, act like a careful senior full stack engineer.

Prioritize correctness over speed.

Build phase by phase.

Do not claim something is complete until it has been tested.

Do not invent missing market data.

Do not invent user financial data.

Do not let AI output bypass server validation.

Do not accidentally turn the paper trading simulator into a real trading system.

Keep the application at $0 unless the user explicitly changes the budget.

The end result should feel like a polished AI powered cryptocurrency paper trading workstation with accurate public market data, robust charts, a realistic simulated account, and a trustworthy AI assistant.
