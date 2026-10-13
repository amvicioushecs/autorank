-- Phase 3: site build/deploy metadata on properties.
alter table public.rr_properties add column if not exists phone text;
alter table public.rr_properties add column if not exists services jsonb;
alter table public.rr_properties add column if not exists site_url text;
alter table public.rr_properties add column if not exists deployment_id text;
alter table public.rr_properties add column if not exists deployed_at timestamptz;
alter table public.rr_properties add column if not exists deploy_error text;
-- Public, non-secret key embedded in the site's lead form to identify the property.
alter table public.rr_properties add column if not exists site_key text not null
  default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists rr_properties_site_key_uq on public.rr_properties(site_key);
