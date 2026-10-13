-- Phase 5: lead capture, call tracking and forwarding.
alter table public.rr_leads add column if not exists property_id uuid references public.rr_properties(id) on delete set null;
alter table public.rr_leads add column if not exists phone text;
alter table public.rr_leads add column if not exists email text;
alter table public.rr_leads add column if not exists message text;
alter table public.rr_leads add column if not exists forwarded_at timestamptz;
create index if not exists rr_leads_property_idx on public.rr_leads(property_id, created_at desc);

-- Where leads for a property go once it is rented (or for a trial).
alter table public.rr_properties add column if not exists forward_email text;
alter table public.rr_properties add column if not exists forward_phone text;
create unique index if not exists rr_properties_phone_uq on public.rr_properties(phone) where phone is not null;

-- Keep monthly_leads in sync with real leads (current calendar month).
create or replace function public.rr_refresh_monthly_leads() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prop uuid := coalesce(new.property_id, old.property_id);
begin
  if v_prop is not null then
    update rr_properties p set monthly_leads = (
      select count(*) from rr_leads l
       where l.property_id = v_prop and l.created_at >= date_trunc('month', now())
    ) where p.id = v_prop;
  end if;
  return null;
end $$;
drop trigger if exists rr_leads_monthly on public.rr_leads;
create trigger rr_leads_monthly after insert or delete or update of property_id on public.rr_leads
  for each row execute function public.rr_refresh_monthly_leads();
