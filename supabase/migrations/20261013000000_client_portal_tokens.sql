-- Secure, revocable client portal links.
-- The plaintext token is returned once on creation; only its SHA-256 hash is stored.

create table if not exists public.rr_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  property_id uuid not null references public.rr_properties(id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked_at timestamptz,
  last_used_at timestamptz
);
create index if not exists rr_portal_tokens_property_idx on public.rr_portal_tokens(property_id);

alter table public.rr_portal_tokens enable row level security;
drop policy if exists rr_portal_tokens_owner on public.rr_portal_tokens;
create policy rr_portal_tokens_owner on public.rr_portal_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant select, update, delete on public.rr_portal_tokens to authenticated;

-- Owner creates a link for one of their properties. Returns the plaintext token (shown once).
create or replace function public.rr_create_portal_token(p_property_id uuid, p_days int default 90, p_label text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if not exists (select 1 from rr_properties where id = p_property_id and user_id = v_uid) then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'p_days must be 1..365'; end if;
  -- two v4 UUIDs = 244 bits from the server's strong RNG
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into rr_portal_tokens (user_id, property_id, token_hash, label, expires_at)
  values (v_uid, p_property_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_label, now() + make_interval(days => p_days));
  return v_token;
end $$;
revoke all on function public.rr_create_portal_token(uuid, int, text) from public;
grant execute on function public.rr_create_portal_token(uuid, int, text) to authenticated;

-- Public (anon) read-only view for a valid token: property summary + its recent leads.
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
     where user_id = v_tok.user_id and property = v_prop.domain
     order by created_at desc limit 50
  ) l;

  return jsonb_build_object(
    'property', jsonb_build_object(
      'domain', v_prop.domain, 'niche', v_prop.niche, 'city', v_prop.city, 'client', v_prop.client,
      'rankPosition', v_prop.rank_position, 'monthlyLeads', v_prop.monthly_leads, 'trend', v_prop.trend),
    'leads', v_leads,
    'expiresAt', v_tok.expires_at
  );
end $$;
revoke all on function public.rr_portal_view(text) from public;
grant execute on function public.rr_portal_view(text) to anon, authenticated;
