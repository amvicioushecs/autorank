-- Phase 6: clients (renters) and Stripe billing.
create table if not exists public.rr_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  email text,
  phone text,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists rr_clients_user_email_uq on public.rr_clients(user_id, lower(email)) where email is not null;

alter table public.rr_properties add column if not exists client_id uuid references public.rr_clients(id) on delete set null;
alter table public.rr_properties add column if not exists stripe_subscription_id text;
alter table public.rr_properties add column if not exists billing_status text;

-- Processed Stripe events (idempotency). Server-only: RLS on, no policies.
create table if not exists public.rr_billing_events (
  stripe_event_id text primary key,
  type text not null,
  user_id uuid,
  property_id uuid,
  received_at timestamptz not null default now()
);
alter table public.rr_billing_events enable row level security;
revoke all on public.rr_billing_events from anon, authenticated;

alter table public.rr_clients enable row level security;
drop policy if exists rr_clients_owner on public.rr_clients;
create policy rr_clients_owner on public.rr_clients for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.rr_clients from anon;
grant select, insert, update, delete on public.rr_clients to authenticated;

-- Portal view now also returns billing status and rent.
create or replace function public.rr_portal_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tok rr_portal_tokens%rowtype;
  v_prop rr_properties%rowtype;
  v_leads jsonb;
begin
  if p_token is null or length(p_token) < 32 then return null; end if;
  select * into v_tok from rr_portal_tokens
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  select * into v_prop from rr_properties where id = v_tok.property_id and user_id = v_tok.user_id;
  if not found then return null; end if;
  update rr_portal_tokens set last_used_at = now() where id = v_tok.id;
  select coalesce(jsonb_agg(l order by l.created_at desc), '[]'::jsonb) into v_leads from (
    select id, name, service, value, quality, status, channel, created_at
      from rr_leads
     where user_id = v_tok.user_id and (property_id = v_prop.id or (property_id is null and property = v_prop.domain))
     order by created_at desc limit 50
  ) l;
  return jsonb_build_object(
    'property', jsonb_build_object(
      'domain', v_prop.domain, 'niche', v_prop.niche, 'city', v_prop.city, 'client', v_prop.client,
      'rankPosition', v_prop.rank_position, 'monthlyLeads', v_prop.monthly_leads, 'trend', v_prop.trend,
      'mrr', v_prop.mrr, 'billingStatus', v_prop.billing_status,
      'hasBilling', v_prop.client_id is not null and exists (select 1 from rr_clients c where c.id = v_prop.client_id and c.stripe_customer_id is not null)),
    'leads', v_leads,
    'expiresAt', v_tok.expires_at
  );
end $$;
revoke all on function public.rr_portal_view(text) from public;
grant execute on function public.rr_portal_view(text) to anon, authenticated;

-- Server-side helper for the portal-billing function: token -> Stripe customer (service role only).
create or replace function public.rr_portal_customer(p_token text)
returns text
language sql
security definer
set search_path = public
as $$
  select c.stripe_customer_id
    from rr_portal_tokens t
    join rr_properties p on p.id = t.property_id and p.user_id = t.user_id
    join rr_clients c on c.id = p.client_id and c.user_id = t.user_id
   where t.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and t.revoked_at is null and t.expires_at > now()
$$;
revoke all on function public.rr_portal_customer(text) from public, anon, authenticated;
grant execute on function public.rr_portal_customer(text) to service_role;
