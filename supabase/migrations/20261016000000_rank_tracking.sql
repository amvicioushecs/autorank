-- Phase 4: rank tracking + alerts.
create table if not exists public.rr_rank_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property_id uuid not null references public.rr_properties(id) on delete cascade,
  keyword text not null,
  position int,              -- null = not found within depth
  depth int not null default 50,
  call_id text,
  checked_at timestamptz not null default now()
);
create index if not exists rr_rank_checks_prop_idx on public.rr_rank_checks(property_id, checked_at desc);

create table if not exists public.rr_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property_id uuid references public.rr_properties(id) on delete cascade,
  kind text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists rr_alerts_user_idx on public.rr_alerts(user_id, created_at desc);

alter table public.rr_properties add column if not exists last_rank_check_at timestamptz;

do $$
declare t text;
begin
  foreach t in array array['rr_rank_checks', 'rr_alerts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_owner', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
