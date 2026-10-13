-- Base schema for AutoRank (rank-and-rent). Idempotent so it can be applied to the existing
-- project, whose tables were created outside source control: `if not exists` everywhere,
-- policies dropped/recreated. Every row is owned by user_id and isolated with RLS.

-- ---------- Properties (sites) ----------
create table if not exists public.rr_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  domain text not null,
  niche text not null,
  city text not null,
  status text not null default 'building',
  health int not null default 42,
  rank_position int,
  rank_change int not null default 0,
  keywords int not null default 0,
  monthly_leads int not null default 0,
  mrr int not null default 0,
  client text,
  trend jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.rr_properties add constraint rr_properties_status_chk
    check (status in ('building', 'ranking', 'optimizing', 'leasing', 'rented'));
exception when duplicate_object then null; end $$;
create unique index if not exists rr_properties_user_domain_uq on public.rr_properties(user_id, domain);

-- ---------- Opportunities (niche x city) ----------
create table if not exists public.rr_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  niche text not null,
  city text not null,
  search_volume int not null default 0,
  competition int not null default 50,
  cpc numeric(10, 2) not null default 0,
  est_revenue int not null default 0,
  score int not null default 0,
  deployed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists rr_opportunities_user_idx on public.rr_opportunities(user_id, deployed, score desc);

-- ---------- Leads ----------
create table if not exists public.rr_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property text not null,               -- property domain
  niche text,
  name text not null,
  service text,
  value int not null default 0,
  quality text not null default 'medium',
  status text not null default 'new',
  channel text not null default 'form',
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.rr_leads add constraint rr_leads_status_chk check (status in ('new', 'verified', 'forwarded', 'flagged'));
  alter table public.rr_leads add constraint rr_leads_quality_chk check (quality in ('high', 'medium', 'low'));
  alter table public.rr_leads add constraint rr_leads_channel_chk check (channel in ('form', 'chat', 'call'));
exception when duplicate_object then null; end $$;
create index if not exists rr_leads_user_idx on public.rr_leads(user_id, created_at desc);

-- ---------- treg usage log ----------
create table if not exists public.rr_treg_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  endpoint text not null,
  cost_micro bigint not null default 0,
  call_id text,
  status int,
  created_at timestamptz not null default now()
);
create index if not exists rr_treg_usage_user_idx on public.rr_treg_usage(user_id, created_at desc);

-- ---------- updated_at ----------
create or replace function public.rr_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists rr_properties_touch on public.rr_properties;
create trigger rr_properties_touch before update on public.rr_properties
  for each row execute function public.rr_touch_updated_at();

-- ---------- RLS: owner-only ----------
do $$
declare t text;
begin
  foreach t in array array['rr_properties', 'rr_opportunities', 'rr_leads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_owner', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Usage log: users may read and append their own rows, never edit/delete (audit trail).
alter table public.rr_treg_usage enable row level security;
drop policy if exists rr_treg_usage_select on public.rr_treg_usage;
drop policy if exists rr_treg_usage_insert on public.rr_treg_usage;
create policy rr_treg_usage_select on public.rr_treg_usage for select to authenticated using (user_id = auth.uid());
create policy rr_treg_usage_insert on public.rr_treg_usage for insert to authenticated with check (user_id = auth.uid());
revoke all on public.rr_treg_usage from anon;
grant select, insert on public.rr_treg_usage to authenticated;

-- ---------- Starter data ----------
-- Gives a brand-new account a few sample opportunities to explore (no fake properties or revenue).
-- Idempotent: does nothing if the user already has any property or opportunity. Returns rows inserted.
create or replace function public.rr_seed_starter() returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if exists (select 1 from rr_properties where user_id = v_uid)
     or exists (select 1 from rr_opportunities where user_id = v_uid) then
    return 0;
  end if;
  insert into rr_opportunities (user_id, niche, city, search_volume, competition, cpc, est_revenue, score)
  values
    (v_uid, 'Garage Door Repair', 'Charlotte, NC', 4400, 22, 12.40, 2200, 92),
    (v_uid, 'Foundation Repair', 'Kansas City, MO', 2900, 19, 18.20, 2600, 91),
    (v_uid, 'Water Damage Restoration', 'Columbus, OH', 3600, 31, 28.70, 3100, 89),
    (v_uid, 'Septic Tank Service', 'Raleigh, NC', 2100, 14, 15.60, 2000, 88),
    (v_uid, 'Chimney Sweep', 'Cincinnati, OH', 1700, 11, 13.90, 1700, 86);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.rr_seed_starter() from public;
grant execute on function public.rr_seed_starter() to authenticated;
