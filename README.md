# AutoRank (RankForge)

Dashboard for running an automated **rank-and-rent** local SEO business: find niche + city
opportunities, build and deploy lead-gen sites, track rankings, capture leads, and rent the sites
to local businesses. See **[GOALS.md](./GOALS.md)** for the vision, architecture and roadmap.

## Stack
- Vite + React 18 + TypeScript, Tailwind + shadcn/ui
- Supabase (auth, Postgres with RLS, Edge Functions)
- [treg.to](https://treg.to/docs) for live Google keyword volume / CPC and SERP data, called only from
  the `treg-proxy` edge function so the API token never reaches the browser
- Vitest + Testing Library, GitHub Actions CI

## Getting started
```bash
npm ci
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for app + node configs |
| `npm test` | Vitest (jsdom) |
| `npm run build` | Production build |

CI (`.github/workflows/ci.yml`) runs install, lint (zero warnings), typecheck, test and build, plus `deno lint`/`deno check` for edge functions. Database tests run every migration in [PGlite](https://pglite.dev) (in-memory Postgres) with a small Supabase stub, so RLS is tested without Docker.

## Client portal
Owners generate a link per property in **Client Portal**. Links look like `https://<your-app>/portal/<token>`, expire after 90 days, are stored only as hashes, and can be revoked. The SPA host must rewrite all paths to `index.html` (`public/_redirects` for Netlify, `vercel.json` for Vercel are included).

## Environment variables
Frontend (public, `VITE_` prefix):

| Var | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

If unset, `src/lib/supabase.ts` falls back to the existing project values so current deploys keep
working. Set them explicitly in every environment, then delete the fallbacks.

Edge function secrets (server only):

| Secret | Notes |
| --- | --- |
| `TREG_API_KEY` | treg.to org token (sent as `X-Treg-Token`) |
| `TREG_MAX_COST_USD` | optional per-call spend cap, default `0.25` |
| `TREG_DAILY_BUDGET_USD` | optional per-user rolling 24h cap, default `2`. Enforced atomically: each call reserves `TREG_MAX_COST_USD` up front (`rr_treg_reserve`) and settles the real cost after. Invalid values fail closed. All treg-calling functions need `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase) to write the ledger. |

## Supabase backend
Schema lives in `supabase/migrations/` (base tables + RLS, client portal tokens, and later phases).
Every `rr_*` row has a `user_id` and owner-only RLS; the client also filters by `user_id`.

```bash
supabase link --project-ref your-project-ref
supabase db diff          # review what would change on the live project first
supabase db push          # apply migrations
```

`rr_seed_starter()` gives a new account five sample opportunities (no fake properties or revenue).
Migrations are tested in CI by `supabase/tests/*.test.ts`, which run them in PGlite.

### Edge functions
| Function | Purpose | Secrets |
| --- | --- | --- |
| `treg-proxy` | allow-listed treg calls from the UI | `TREG_API_KEY` |
| `discovery-scan` | batch niche × city scoring (volume, CPC, SERP weakness) | `TREG_API_KEY` |
| `domain-check` | .com availability via public RDAP | none |
| `rank-check` | daily Google position per deployed site, alerts | `TREG_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected) |
| `lead-capture` | public form endpoint for deployed sites (no JWT) | optional `RESEND_API_KEY`, `LEAD_FROM_EMAIL` |
| `twilio-voice` | Twilio voice webhook: log + forward calls (no JWT) | `TWILIO_AUTH_TOKEN`, `PUBLIC_FUNCTIONS_URL` |
| `billing-checkout` | Stripe Checkout link to rent a property monthly | `STRIPE_SECRET_KEY`, `APP_URL` |
| `stripe-webhook` | subscription lifecycle → property status/MRR (no JWT) | `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` |
| `portal-billing` | client billing portal from a portal link (no JWT) | `STRIPE_SECRET_KEY`, `APP_URL` |
| `site-deploy` | generate the static lead-gen site and deploy to Vercel | `VERCEL_TOKEN`, optional `VERCEL_TEAM_ID` |

Deploy all with `supabase functions deploy` (shared code lives in `supabase/functions/_shared`).

### Stripe
Create a webhook endpoint at `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook` for
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and
`invoice.payment_failed`, then set its signing secret as `STRIPE_WEBHOOK_SECRET`. Enable the
Customer Portal in Stripe settings for `portal-billing`. Use test-mode keys first.

### Scheduling rank checks
Enable the `pg_cron` and `pg_net` extensions, store the cron secret in Vault, then:
```sql
select vault.create_secret('your-cron-secret', 'cron_secret');
select cron.schedule('autorank-rank-check', '0 9 * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/rank-check',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$$);
```
Use the same value for the `CRON_SECRET` function secret.

### Deploying the treg proxy
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set TREG_API_KEY=your-treg-token   # replace with your real token
supabase functions deploy treg-proxy
```
The function (`supabase/functions/treg-proxy/index.ts`) requires a signed-in user, only allows the
endpoint ids the app uses, forwards `POST https://treg.to/call/<endpoint>` with `X-Treg-Token`,
tags each call with `X-Treg-Meta: customer=<user id>`, caps spend with `X-Treg-Route-Max-Cost`, logs
usage to `rr_treg_usage`, and returns `{ data, callId, costMicro, servedBy }`.

Get a treg token: `curl -fsSL https://treg.to/install.sh | sh && treg login`, or sign in at
https://treg.to and create an org token. treg calls are prepaid and billed per call.
