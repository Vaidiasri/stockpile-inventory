# Stockpile - Inventory Management System

A CRUD inventory management system built with Next.js 16 (App Router) and Neon
Postgres. Products, categories, stock movements, JWT auth and role-based access
behind a documented REST API.

> Build status: authentication and the database layer are complete and verified.
> Products, categories, stock and dashboard are in progress.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, Route Handlers as the REST API |
| Database | Neon Postgres (serverless WebSocket driver) |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Auth | JWT (HS256, `jose`) in an httpOnly cookie, `bcryptjs` hashing |
| Validation | Zod schemas shared by the API and the forms |
| UI | Tailwind CSS v4, shadcn/ui, `sonner` toasts, dark mode via `next-themes` |
| Tests | Vitest |

## Architecture

All business logic lives in `src/lib/services/`. Route handlers under
`src/app/api/` are thin: parse with Zod, call a service, let `withErrors` map
failures to HTTP. Server Components call the same services directly rather than
fetching the app's own API over HTTP, so there is one implementation of every
rule and no self-request hop.

```text
UI (Server Components read, client forms write)
        |                         |
        | direct call             | fetch()
        |                         v
        |              src/app/api/**/route.ts   (validate -> service -> status)
        v                         v
        src/lib/services/*   <- all business logic
                  v
        Drizzle ORM -> Neon Postgres
```

`src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) only routes
visitors: anonymous users hitting a protected page get sent to `/login`.
Authorisation is enforced inside every handler with `requireUser()` /
`requireAdmin()`, so a proxy bypass cannot expose data.

## Setup

Requires Node.js 20+ (developed on 24) and a Neon account.

### Install dependencies

```bash
npm install
```

### Create a Neon database

Either use the dashboard at <https://console.neon.tech> and copy the **pooled**
connection string (its host contains `-pooler`), or use the CLI:

```bash
npx neonctl auth                                  # opens a browser
npx neonctl projects create --name stockpile
npx neonctl connection-string --pooled
```

### Configure the environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` to the pooled connection string, then generate a signing key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put that in `JWT_SECRET`. The app validates both at boot and fails with a named
error rather than a driver exception if either is missing or too short.

### Create the schema and seed it

```bash
npm run db:migrate
npm run db:seed
```

### Run it

```bash
npm run dev
```

Open <http://localhost:3000>. The seed creates two accounts, both with the
password `Password123!`:

| Email | Role |
| --- | --- |
| `admin@stockpile.dev` | admin (can delete products and categories) |
| `staff@stockpile.dev` | staff |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run verify` | Typecheck, lint, tests and build - the one command that proves the tree is sound |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests - offline, no database needed |
| `npm run test:db` | Integration tests against the real database (schema guarantees) |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed sample data (idempotent - skips if users exist) |
| `npm run db:studio` | Drizzle Studio |

## Database design

Four tables: `users`, `categories`, `products`, `inventory_transactions`.
Three rules are enforced by Postgres rather than application code:

- **`products.status` is a generated column**, derived from `quantity` and
  `low_stock_threshold`. It cannot drift from the quantity no matter which code
  path writes stock, and it stays indexable so status filters and the dashboard
  counts are index scans.
- **`CHECK (quantity >= 0)`** plus atomic `quantity = quantity + delta` updates
  prevent negative inventory. A read-modify-write guard in application code
  would let two concurrent stock-outs both pass a stale check.
- **Unique indexes on `products.sku`, `categories.name` and `users.email`** are
  the uniqueness check. A pre-flight `SELECT` would be slower *and* racy;
  instead the Postgres error code is mapped to a 409 naming the offending field.

The one deliberate denormalisation: `inventory_transactions` snapshots the
product's SKU and name, so an audit trail stays readable after a product is
deleted.

These are the claims that `npm run test:db` checks against a real database,
including the boundary cases (a decrement landing exactly on zero, a zero
threshold at zero stock) and the fact that `status` rejects a direct write.

## Testing

Two suites, split by what they need:

- `npm test` - unit tests for token signing, validation and HTTP error mapping.
  No database, so it runs anywhere including CI.
- `npm run test:db` - integration tests for the guarantees Postgres enforces.
  Mocking these would only prove the mock agrees with itself. Fixtures are
  namespaced (`ITEST-` SKUs) and cleaned up afterwards.

The error-mapping tests deliberately use Drizzle's real error shape: Drizzle
wraps driver errors and puts the SQLSTATE on `cause`, so a fixture built as a
bare `{ code }` object would let the mapping pass in tests while returning 500
in production.

## API

| Method | Route | Notes |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Creates a user, signs them in |
| `POST` | `/api/auth/login` | Sets the session cookie |
| `POST` | `/api/auth/logout` | Clears it |
| `GET` | `/api/auth/me` | Current user; 401 when anonymous |

Success responses are `{ "data": ... }`; list endpoints add `{ "meta": ... }`.
Errors are `{ "error": { "message", "code", "fields"? } }`, where `fields` maps
a form field to its message.

## Assumptions and trade-offs

- **One shared company-wide inventory**, not an inventory per user. Roles
  (`admin` / `staff`) gate destructive actions. An inventory system describes a
  business's stock, not a user's private list.
- **Money is `numeric(12,2)`**, returned as a string, so no binary rounding
  error accumulates. The UI formats it for display.
- **Product search is `ILIKE '%term%'`**, a sequential scan. Correct and simple
  at this size; the upgrade path (a `pg_trgm` GIN index) is noted in
  `src/db/schema.ts` rather than built speculatively.
- **Deleting a category is blocked** while products reference it
  (`ON DELETE RESTRICT`), returning a 409 rather than silently orphaning or
  deleting stock.
- **No Docker.** Neon is hosted, so a Dockerfile nobody runs would be dead
  weight. Deployment target is Vercel + Neon.
