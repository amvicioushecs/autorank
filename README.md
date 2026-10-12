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

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, test and build on every PR.

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

## Supabase backend
The database schema is **not yet in this repo** (roadmap task 1.1). The app expects these tables,
each with a `user_id uuid` column and RLS policies `user_id = auth.uid()`:

- `rr_properties` – id, user_id, domain, niche, city, status, health, rank_position, rank_change, keywords, monthly_leads, mrr, client, trend (int[]/jsonb)
- `rr_opportunities` – id, user_id, niche, city, search_volume, competition, cpc, est_revenue, score, deployed
- `rr_leads` – id, user_id, property, niche, name, service, value, quality, status, channel, created_at
- `rr_treg_usage` – id, user_id, endpoint, cost_micro, call_id, status, created_at
- RPC `rr_seed_starter()` – seeds a starter portfolio for a new user, returns count

The client also filters every query by `user_id`, but RLS is the real security boundary.

### Deploying the treg proxy
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set TREG_API_KEY=<your treg token>
supabase functions deploy treg-proxy
```
The function (`supabase/functions/treg-proxy/index.ts`) requires a signed-in user, only allows the
endpoint ids the app uses, forwards `POST https://treg.to/call/<endpoint>` with `X-Treg-Token`,
tags each call with `X-Treg-Meta: customer=<user id>`, caps spend with `X-Treg-Route-Max-Cost`, logs
usage to `rr_treg_usage`, and returns `{ data, callId, costMicro, servedBy }`.

Get a treg token: `curl -fsSL https://treg.to/install.sh | sh && treg login`, or sign in at
https://treg.to and create an org token. treg calls are prepaid and billed per call.
