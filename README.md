# BiTrade

BiTrade is a browser based AI powered paper trading workstation for cryptocurrency market data. Users create an account, receive a one time demo balance of $10,000, monitor 15 fixed cryptocurrencies using public market data, study charts and portfolio performance, and interact with an AI assistant that can answer questions and prepare simulated buy or sell actions.

## Paper trading only

BiTrade never executes real cryptocurrency trades, never connects to a user exchange account, never requests exchange trading credentials, never holds real cryptocurrency, and never moves real money. Every executed order is an internal BiTrade paper trade recorded in Supabase. The project is a simulation and educational software product.

## Technology stack

1. Next.js (App Router, TypeScript, React)
2. Tailwind CSS
3. Supabase (PostgreSQL, Auth, Row Level Security)
4. Binance public market data (REST and WebSocket, read only)
5. Deployed on Vercel Hobby

## Local development setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Run `npm run dev` and open `http://localhost:3000`.

Available scripts:

```text
npm run dev            start the development server
npm run build          create a production build
npm run start          serve the production build
npm run lint           run ESLint
npm run typecheck      run the TypeScript compiler check
npm run format         format files with Prettier
npm run check:rules    verify no emoji, no em dash, and no gradients in source
```

## Supabase setup

1. Create a free project at supabase.com.
2. In the SQL Editor, run the migrations in order:
   1. `supabase/migrations/0001_init_auth_and_paper_tables.sql`
   2. `supabase/migrations/0002_grants.sql`
   3. `supabase/migrations/0003_execute_paper_trade.sql`
   4. `supabase/migrations/0004_ai_action_log_policies.sql`
3. For local development, disable email confirmation: Authentication, Providers, Email, uncheck "Confirm email". Re-enable it before production.
4. Copy the Project URL and publishable key from Settings, API into `.env.local`.

The schema contains `profiles`, `paper_accounts`, `holdings`, `trades`, and `ai_action_logs`. A database trigger creates the profile and the one time $10,000 paper account at signup, and Row Level Security keeps every user's rows private.

Test commands:

```text
npm run test:rls      verifies account initialization and user data isolation
npm run test:auth     verifies signup, login, protected routes, and redirects
npm run test:market   verifies market snapshots, candles, and WebSocket data
npm run test:charts   verifies candle data and page rendering
npm run test:trading  verifies paper trade execution, validation, and history
npm run test:ai       verifies the AI chat, proposals, and approval flow
```

All test commands except `test:rls` expect `npm run dev` to be running on port 3000.

## Environment variables

See `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

The service role key and all AI credentials are server side only and must never be shipped to the browser. The application fails safely when required secrets are missing.

## Market data source

BiTrade reads Binance public market data only. It uses public REST endpoints for the initial snapshot and historical candles, and a public combined WebSocket stream for live quotes. No Binance API key is required or used for trading.

The dashboard revalidates its displayed quote state about every 35 seconds while the live stream continues to deliver ticks in the background. Each asset carries its own `live`, `stale`, or `unavailable` status, and the latest update timestamp is always visible.

## How paper trades are executed

Trades are submitted to `POST /api/trade`, which fetches a fresh Binance price on the server, validates the request schema, and converts the requested dollar amount or quantity using that trusted price. The client supplied price is never accepted.

Execution then happens in a single PostgreSQL function (`execute_paper_trade`) that locks the paper account row, revalidates cash and holdings, and updates cash, holdings, and the trade record in one atomic transaction. Every request carries a unique execution token, so a duplicate submission can never execute twice. Validation failures are stored as `rejected` trade rows with their reason, which is what the history page shows.

Rejected orders, insufficient cash, insufficient holdings, stale or unavailable prices, unknown assets, and non positive quantities all fail safely without changing balances.

## How the AI action approval works

The assistant runs on a Gemini model through a server side provider adapter, configured with `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` in `.env.local`. All credentials stay server side. When no provider is configured the API returns a clear setup message and the rest of the app keeps working without the AI.

For questions, the model calls read only tools (market quotes, portfolio, balance, holdings, history) that run with the signed in user's own database session, so it always answers from current server state and cannot reach another user's data.

For trade requests, the model can only call `create_trade_proposal`, which validates the inputs, prices the order against a fresh Binance quote, and stores a pending proposal in `ai_action_logs`. Nothing is executed at that point. The proposal card shows the amount, estimated quantity, and reference price with a 90 second expiry, and the user must explicitly approve or reject it.

Approval revalidates everything server side: the proposal status and expiry, a fresh price, and then the same atomic `execute_paper_trade` function used by manual trades, with the proposal ID as the execution token so a proposal can never execute twice. Rejections, expirations, and failed approvals are recorded on the proposal row. The AI has no tool that can move money, and prompt injection attempts cannot bypass the approval flow.

## Workstation interface

The signed in app uses a persistent left sidebar (Home, Markets, Portfolio, History, Settings) with a mobile drawer, and a top bar with coin search, the live market data indicator, and an account menu with sign out. The dashboard shows a welcome card with the demo balance, account summary cards, the top 15 cryptocurrency table with sparklines and trade links, holdings, the selected asset chart, recent activity, and the AI assistant. Asset detail pages combine the price chart, stats, the trade panel, and a link into the assistant. The Settings page shows account, paper account, market data, and AI configuration state.

## Deploying to Vercel

Pending Phase 7. The target is the Vercel Hobby plan with no paid services.

## Known limitations

1. Paper trading only. No real orders, wallets, deposits, or withdrawals.
2. Market data is public Binance data and is not guaranteed real time or exchange grade.
3. The supported asset list is fixed at 15 cryptocurrencies.
4. Initial deployment budget is $0, so only free tiers are used.
