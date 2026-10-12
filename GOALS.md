# AutoRank — Source of Truth

> This file is the single source of truth for what we are building and why. Every PR should
> tick boxes here or add tasks. Keep tasks small (≤ 1 day), each with acceptance criteria.

## 1. Vision
A mostly hands-off **rank-and-rent** business: software finds profitable local niches, builds and
ranks lead-gen websites for them, routes the leads to local businesses, and bills those businesses
monthly to "rent" the site. The operator approves decisions; the system does the work.

## 2. Business model
1. **Find** a niche + city with real search demand, high CPC (commercial intent) and weak competition
   (e.g. "garage door repair Charlotte NC").
2. **Build** a fast, localized, SEO-optimized site on a matching domain.
3. **Rank** it in Google organic + Maps (content, schema, citations, internal links, backlinks).
4. **Capture** leads (call tracking numbers + forms).
5. **Prove** value: forward leads free/trial to a local business.
6. **Rent**: the business pays a flat monthly fee (or per-lead) for exclusive leads.
7. **Retain/scale**: monitor rank + lead flow, re-rent if a tenant churns, repeat in new markets.

Unit economics target per site: build cost < $150, time-to-rank < 6 months, rent $500–$2,000/mo.

## 3. System architecture
```
React dashboard (Vite)  ──►  Supabase (Auth, Postgres+RLS, Storage)
        │                         │
        └─► Edge Functions ───────┼─► treg.to (keyword volume, CPC, SERP, Maps)
              treg-proxy          ├─► Site builder/deployer (Vercel/Netlify/Cloudflare) [planned]
              scheduler (cron)    ├─► Call tracking (Twilio) + forms [planned]
              billing webhooks    └─► Stripe (subscriptions, invoices)          [planned]
```
- **Frontend**: portfolio, discovery, builder wizard, SEO monitor, leads, client portal, revenue.
- **Data**: `rr_properties`, `rr_opportunities`, `rr_leads`, `rr_treg_usage` (+ planned `rr_clients`,
  `rr_rank_checks`, `rr_invoices`, `rr_jobs`). All rows owned by `user_id`, enforced by RLS.
- **Secrets** live only in Edge Function env (TREG_API_KEY, Stripe, Twilio, deploy tokens).

## 4. Automation pipeline
| Stage | Input → Output | Automation |
| --- | --- | --- |
| A. Discover | niche list × city list → scored opportunities | treg keyword volume/CPC + SERP competition, `scoreOpportunity` |
| B. Validate | opportunity → go/no-go | SERP + Maps weakness check, domain availability |
| C. Build | approved opp → site repo/content | templated site + AI localized content, schema |
| D. Deploy | site → live URL on domain | Vercel/Netlify API, DNS, SSL |
| E. Rank | live site → positions | scheduled rank checks (treg SERP), content/citation tasks |
| F. Capture | traffic → leads | tracking numbers, forms → `rr_leads` |
| G. Rent | leads → paying client | outreach to local businesses, client portal |
| H. Bill | client → MRR | Stripe subscriptions, dunning |
| I. Monitor | everything → alerts | health score, rank drops, lead drops, churn |

## 5. Success metrics
- Opportunities scored / week; % passing validation
- Sites live; median days to top-10 / top-3
- Leads per site per month; lead → client conversion
- Rented sites; MRR; churn; treg + hosting cost per site
- Engineering: CI green, test coverage on core logic, zero RLS gaps

## 6. Roadmap (micro-tasks)
Legend: `[x]` done · `[ ]` todo. **(PR #foundation)** = completed by the `senior-eng/foundation` PR.

### Phase 0 — Foundation & correctness
- [x] 0.1 Regenerate lockfile so `npm ci` works. *AC: `npm ci` succeeds clean.* (PR #foundation)
- [x] 0.2 Supabase config from `VITE_SUPABASE_URL/ANON_KEY` + `.env.example`. *AC: app points at any project via env.* (PR #foundation)
- [x] 0.3 Explicit `user_id` filters on every read/write in `rrApi.ts`/`tregApi.ts`. *AC: tests assert filters.* (PR #foundation)
- [x] 0.4 Safe `deployOpportunity`: create property first, then mark deployed, roll back on failure. *AC: tests for success/failure/rollback.* (PR #foundation)
- [x] 0.5 Memoize RRDataContext actions + guard BuilderWizard against double save. *AC: stable identities test.* (PR #foundation)
- [x] 0.6 Sparkline hook order fix. *AC: render empty→data→empty without error.* (PR #foundation)
- [x] 0.7 `assignClient` unassign → `ranking` in UI and DB. *AC: test.* (PR #foundation)
- [x] 0.8 Surface load/sign-out errors via toast + `error` state. *AC: test.* (PR #foundation)
- [x] 0.9 Lint errors → 0. (PR #foundation; 12 warnings remain)
- [x] 0.10 Vitest + Testing Library + `npm test`; GitHub Actions CI. (PR #foundation)
- [x] 0.11 `treg-proxy` edge function in repo. (PR #foundation)
- [x] 0.12 Real README + this GOALS.md. (PR #foundation)
- [ ] 0.13 Remove the hard-coded Supabase fallback once env vars are set in all deploys.
- [ ] 0.14 Remove unused deps (Stripe until billing, etc.) and duplicate toast hook; fix 12 lint warnings.
- [ ] 0.15 Replace fake client-portal link with a real route.

### Phase 1 — Backend in source control
- [ ] 1.1 Dump current schema into `supabase/migrations/` (tables, RLS, `rr_seed_starter`). *AC: `supabase db reset` reproduces the app.*
- [ ] 1.2 RLS test: user A cannot read/write user B rows. *AC: SQL/pgTAP or integration test in CI.*
- [ ] 1.3 Deploy `treg-proxy` with `TREG_API_KEY`; verify a live keyword call end-to-end. *AC: LiveMarketScan returns rows; usage row logged.*
- [ ] 1.4 Generate typed DB client (`supabase gen types`) and drop `any` row types.

### Phase 2 — Discovery automation
- [ ] 2.1 Niche + city seed lists table. *AC: CRUD in UI.*
- [ ] 2.2 Batch scan job: niche×city → treg volume/CPC → upsert opportunities. *AC: scheduled function, cost capped per run.*
- [ ] 2.3 Competition check via `treg.google.serp.organic` + `serp.maps` (count of directories/weak sites in top 10). *AC: score includes SERP weakness.*
- [ ] 2.4 Domain availability check. *AC: suggestion shows available/taken.*

### Phase 3 — Build & deploy sites
- [ ] 3.1 Static site template (Astro/Next) with LocalBusiness schema, service + city pages.
- [ ] 3.2 Content generation job (localized pages) stored per property.
- [ ] 3.3 Deploy via Vercel/Netlify API; store live URL; DNS/SSL. *AC: BuilderWizard actually deploys.*
- [ ] 3.4 Make BuilderWizard steps call real jobs instead of timers.

### Phase 4 — Rank tracking
- [ ] 4.1 `rr_rank_checks` table + daily cron via treg SERP. *AC: trend sparkline uses real data.*
- [ ] 4.2 Rank-drop alerts. 
- [ ] 4.3 Health score from real signals (rank, indexation, uptime).

### Phase 5 — Leads
- [ ] 5.1 Form endpoint → `rr_leads`. 
- [ ] 5.2 Call tracking numbers (Twilio) per property, call logs → leads.
- [ ] 5.3 Lead forwarding to the renting client (email/SMS).

### Phase 6 — Clients, renting & billing
- [ ] 6.1 `rr_clients` table and client assignment by id (not free text).
- [ ] 6.2 Stripe subscription per rented property; webhooks update MRR/status.
- [ ] 6.3 Client portal (magic link): their leads, calls, invoices.
- [ ] 6.4 Outreach pipeline to find/pitch local businesses for unrented sites.

### Phase 7 — Ops
- [ ] 7.1 Error monitoring + structured logs for edge functions.
- [ ] 7.2 Cost dashboard (treg, hosting) per property vs. revenue.
- [ ] 7.3 E2E smoke test (Playwright) in CI against a preview.
