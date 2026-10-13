-- Minimal versions of the pre-existing rr_* tables (created outside source control),
-- used only until the base schema migration lands. NOT applied to real projects.
create table if not exists public.rr_properties (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, domain text not null, niche text, city text,
  status text, health int, rank_position int, rank_change int, keywords int, monthly_leads int, mrr int, client text, trend jsonb
);
create table if not exists public.rr_leads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, property text, niche text, name text, service text,
  value int, quality text, status text, channel text, created_at timestamptz default now()
);
