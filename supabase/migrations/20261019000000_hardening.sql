-- Review hardening (PRs #2-#8 findings).

-- 1) Pre-existing tables may carry permissive policies with other names that would bypass
--    user_id = auth.uid(). Drop every policy on rr_* tables except the ones these migrations define.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public' and tablename like 'rr\_%'
       and policyname not in (tablename || '_owner', 'rr_treg_usage_select')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2) treg usage is a spend ledger: users may only read their rows. Writes go through the
--    service-role reserve/settle functions below so users cannot forge (e.g. negative) costs.
drop policy if exists rr_treg_usage_insert on public.rr_treg_usage;
revoke insert, update, delete, truncate on public.rr_treg_usage from authenticated, anon;
grant select on public.rr_treg_usage to authenticated;

-- Atomically reserve the worst-case cost of one call against the user's rolling 24h budget.
-- Serialised per user with an advisory lock so concurrent calls cannot overshoot.
create or replace function public.rr_treg_reserve(p_user uuid, p_endpoint text, p_amount bigint, p_budget bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_spent bigint; v_id uuid;
begin
  if p_amount < 0 or p_budget < 0 then raise exception 'invalid amount/budget'; end if;
  perform pg_advisory_xact_lock(hashtext('rr_treg_budget:' || p_user::text));
  select coalesce(sum(greatest(cost_micro, 0)), 0) into v_spent
    from rr_treg_usage where user_id = p_user and created_at > now() - interval '24 hours';
  if v_spent + p_amount > p_budget then
    raise exception 'treg_budget_exceeded spent=% budget=%', v_spent, p_budget using errcode = 'P0001';
  end if;
  insert into rr_treg_usage (user_id, endpoint, cost_micro, status)
  values (p_user, p_endpoint, p_amount, null) returning id into v_id;
  return v_id;
end $$;

-- Replace the reservation with the real cost once treg answers.
create or replace function public.rr_treg_settle(p_id uuid, p_cost bigint, p_call_id text, p_status int)
returns void
language sql
security definer
set search_path = public
as $$
  update rr_treg_usage set cost_micro = greatest(p_cost, 0), call_id = p_call_id, status = p_status where id = p_id;
$$;

revoke all on function public.rr_treg_reserve(uuid, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.rr_treg_settle(uuid, bigint, text, int) from public, anon, authenticated;
grant execute on function public.rr_treg_reserve(uuid, text, bigint, bigint) to service_role;
grant execute on function public.rr_treg_settle(uuid, bigint, text, int) to service_role;

-- 3) A lead may only point at a property owned by the same user (FK checks bypass RLS).
create or replace function public.rr_leads_check_property() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.property_id is not null and not exists (
    select 1 from rr_properties p where p.id = new.property_id and p.user_id = new.user_id
  ) then
    raise exception 'property not found' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists rr_leads_property_owner on public.rr_leads;
create trigger rr_leads_property_owner before insert or update of property_id, user_id on public.rr_leads
  for each row execute function public.rr_leads_check_property();

-- And the monthly counter only ever touches the lead owner's property.
create or replace function public.rr_refresh_monthly_leads() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prop uuid := coalesce(new.property_id, old.property_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  if v_prop is not null then
    update rr_properties p set monthly_leads = (
      select count(*) from rr_leads l
       where l.property_id = v_prop and l.user_id = v_user and l.created_at >= date_trunc('month', now())
    ) where p.id = v_prop and p.user_id = v_user;
  end if;
  if tg_op = 'UPDATE' and old.property_id is distinct from new.property_id and old.property_id is not null then
    update rr_properties p set monthly_leads = (
      select count(*) from rr_leads l
       where l.property_id = old.property_id and l.user_id = old.user_id and l.created_at >= date_trunc('month', now())
    ) where p.id = old.property_id and p.user_id = old.user_id;
  end if;
  return null;
end $$;
