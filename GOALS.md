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
- [ ] 0.13 Remove the hard-coded Supabase fallback once env vars are set in all deploys. *Deferred (PR #phase0): not safe until Hector confirms `VITE_SUPABASE_*` is set in every deploy target; removing it now would blank the live app.*
- [x] 0.14 Remove unused deps (Stripe, zod, hookform resolvers, date-fns, marked, highlight.js, @types/uuid); lint warnings 12 → 0 and CI now fails on any warning. (PR #phase0) *`components/ui/use-toast.ts` is the standard shadcn re-export, kept.*
- [x] 0.15 Real client portal: `/portal/:token` route, random 256-bit-ish tokens stored as SHA-256 hashes, 90-day expiry, revocable, anon read via `rr_portal_view` RPC; removed third-party CRM post of client email/phone; invite opens your own mail client. *AC: PGlite tests for token isolation/expiry/revocation.* (PR #phase0)
- [x] 0.16 Review fixes from PR #1: deploy button disabled while saving; zero-row opportunity update triggers rollback; per-user 24h treg budget (`TREG_DAILY_BUDGET_USD`); `.env.*` ignored; Deno lint + type-check for edge functions in CI. (PR #phase0)

### Phase 1 — Backend in source control
- [x] 1.1 Schema in `supabase/migrations/20261012000000_base_schema.sql`: all `rr_*` tables, constraints, indexes, owner-only RLS, append-only usage log, `rr_seed_starter`. Idempotent for the existing project. (PR #phase1) *Written from how the app uses the tables, not dumped from the live DB; diff against `supabase db diff` before pushing.*
- [x] 1.2 RLS tests in CI (PGlite): isolation for read/update/delete/insert, anon denied, append-only usage, seed idempotency. (PR #phase1)
- [ ] 1.3 Deploy `treg-proxy` with `TREG_API_KEY`; verify a live keyword call end-to-end. *AC: LiveMarketScan returns rows; usage row logged.*
- [ ] 1.4 Generate typed DB client (`supabase gen types`) and drop `any` row types. *Needs Supabase project access.*

### Phase 2 — Discovery automation
- [x] 2.1 `rr_discovery_seeds` (owner RLS, case-insensitive de-dupe) + seed manager UI in Discovery. (PR #phase2)
- [x] 2.2 `discovery-scan` edge function: niche×city → one treg volume/CPC call → SERP checks on the top N → idempotent upsert; `rr_scan_runs` log; per-user daily budget. (PR #phase2)
- [ ] 2.2b Nightly scheduled scan (pg_cron + service role, per user). *Needs owner decision on spend.*
- [x] 2.3 SERP weakness (directory share of organic top 10) folded into the score; shared scoring module used by both UI and function. (PR #phase2) *Maps pack not yet included.*
- [x] 2.4 `domain-check` edge function using the public Verisign RDAP service (no key); deploy picks the first unregistered candidate. (PR #phase2)

### Phase 3 — Build & deploy sites
- [x] 3.1 Static site generator (`_shared/site.ts`): home + per-service pages, LocalBusiness/Service JSON-LD, tel CTA, lead form with honeypot, sitemap, robots; all text escaped. (PR #phase3)
- [ ] 3.2 AI-written localized content per page. *Templated copy only for now; needs an LLM key decision.*
- [x] 3.3 `site-deploy` edge function: Vercel `POST /v13/deployments` (inline files, production) + attach custom domain; stores `site_url`/`deployment_id`/`deploy_error`. (PR #phase3) *DNS at the registrar is still manual.*
- [~] 3.4 BuilderWizard's final step now really deploys; earlier steps are still cosmetic timers. Property drawer has Build/Redeploy + tracking phone. (PR #phase3)

### Phase 4 — Rank tracking
- [x] 4.1 `rr_rank_checks` + `rank-check` edge function (user mode + cron mode via `CRON_SECRET`, per-user budget); updates rank, change, 12-point trend. (PR #phase4) *Scheduling SQL in README; must be enabled in the project.*
- [x] 4.2 `rr_alerts` for drops ≥3, falling out of top 50, entering top 3; alerts panel + 'Check rankings now' in SEO Monitor. (PR #phase4)
- [~] 4.3 Health from rank + deployed + lead flow. (PR #phase4) *Indexation/uptime not yet included.*

### Phase 5 — Leads
- [x] 5.1 `lead-capture` public function: site_key lookup, validation, honeypot, per-phone throttle, quality grading, 303 to /thanks; `monthly_leads` kept in sync by trigger. (PR #phase5)
- [x] 5.2 `twilio-voice` webhook: signature-verified, logs calls as leads, forwards to renter (or voicemail). (PR #phase5) *Buying numbers + setting the webhook is manual.*
- [x] 5.3 Email forwarding via Resend when `forward_email` + `RESEND_API_KEY` are set; routing fields in the property drawer. (PR #phase5) *SMS not yet.*

### Phase 6 — Clients, renting & billing
- [x] 6.1 `rr_clients` (owner RLS) linked from properties by `client_id`; created on checkout. (PR #phase6)
- [x] 6.2 `billing-checkout` (monthly subscription Checkout link per property) + `stripe-webhook` (signature-verified, idempotent; rented/MRR on payment, past_due alerts, churn → back to ranking). (PR #phase6)
- [x] 6.3 Portal shows leads/calls, rent and billing status; `portal-billing` opens Stripe's billing portal (invoices, card, cancel) for that client only. (PR #phase6)
- [ ] 6.4 Outreach pipeline to find/pitch local businesses for unrented sites.

### Review hardening (PR #review-hardening)
- [x] H.1 treg spend ledger is server-only; atomic per-user budget reservation; malformed budget env fails closed.
- [x] H.2 Drop stray pre-existing policies on rr_* tables so only owner-only RLS applies.
- [x] H.3 Leads can only reference the owner's own property; monthly counter scoped to owner.
- [x] H.4 Discovery migration dedupes existing niche+city duplicates before the unique index.
- [x] H.5 Twilio routing refuses ambiguous tracking-number matches.
- [x] H.6 Billing (in PR #phase6): server-only `stripe_customer_id`, literal email match, checkout idempotency + duplicate-subscription guard, Basil-compatible invoice handling.
- [ ] H.7 BuilderWizard: on site-deploy failure, stay on a retry state instead of the success screen (property is saved; deploy can be retried from the property drawer today).

### Phase 7 — Ops
- [ ] 7.1 Error monitoring + structured logs for edge functions.
- [ ] 7.2 Cost dashboard (treg, hosting) per property vs. revenue.
- [ ] 7.3 E2E smoke test (Playwright) in CI against a preview.
