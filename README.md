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
3. For local development, disable email confirmation: Authentication, Providers, Email, uncheck "Confirm email". Re-enable it before production.
4. Copy the Project URL and publishable key from Settings, API into `.env.local`.

The schema contains `profiles`, `paper_accounts`, `holdings`, `trades`, and `ai_action_logs`. A database trigger creates the profile and the one time $10,000 paper account at signup, and Row Level Security keeps every user's rows private.

Test commands:

```text
npm run test:rls    verifies account initialization and user data isolation
npm run test:auth   verifies signup, login, protected routes, and redirects (requires npm run dev)
```

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

Pending Phase 4. Trades will be validated and executed server side in a single atomic database operation. The client supplied price is never trusted.

## How the AI action approval works

Pending Phase 5. The AI can only create a structured trade proposal. The proposal is shown to the user for explicit approval, after which the server revalidates the price and executes through the same paper trading engine used for manual trades.

## Deploying to Vercel

Pending Phase 7. The target is the Vercel Hobby plan with no paid services.

## Known limitations

1. Paper trading only. No real orders, wallets, deposits, or withdrawals.
2. Market data is public Binance data and is not guaranteed real time or exchange grade.
3. The supported asset list is fixed at 15 cryptocurrencies.
4. Initial deployment budget is $0, so only free tiers are used.
