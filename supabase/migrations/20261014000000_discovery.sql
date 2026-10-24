-- Phase 2: discovery automation.

create table if not exists public.rr_discovery_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('niche', 'city')),
  value text not null check (length(trim(value)) between 2 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists rr_discovery_seeds_uq on public.rr_discovery_seeds(user_id, kind, lower(value));

create table if not exists public.rr_scan_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  combos int not null default 0,
  inserted int not null default 0,
  cost_micro bigint not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists rr_scan_runs_user_idx on public.rr_scan_runs(user_id, started_at desc);

alter table public.rr_opportunities add column if not exists keyword text;
alter table public.rr_opportunities add column if not exists serp_weakness int;
alter table public.rr_opportunities add column if not exists source text not null default 'manual';
-- One opportunity per niche+city per user (needed for idempotent batch upserts).
-- Existing scans may have saved duplicates: keep the best-scoring (then newest) row of each combo.
delete from public.rr_opportunities o
 using (
   select id, row_number() over (partition by user_id, niche, city order by deployed desc, score desc nulls last, created_at desc) as rn
     from public.rr_opportunities
 ) d
 where o.id = d.id and d.rn > 1;
create unique index if not exists rr_opportunities_user_combo_uq on public.rr_opportunities(user_id, niche, city);

do $$
declare t text;
begin
  foreach t in array array['rr_discovery_seeds', 'rr_scan_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_owner', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
