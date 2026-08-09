-- Persistence and integrity required by staff create actions.

create or replace function public.normalize_ph_mobile(value text)
returns text
language sql
immutable
strict
as $$
  select case
    when regexp_replace(value, '\D', '', 'g') ~ '^63[0-9]{10}$' then '+' || regexp_replace(value, '\D', '', 'g')
    when regexp_replace(value, '\D', '', 'g') ~ '^0[0-9]{10}$' then '+63' || substr(regexp_replace(value, '\D', '', 'g'), 2)
    when regexp_replace(value, '\D', '', 'g') ~ '^9[0-9]{9}$' then '+63' || regexp_replace(value, '\D', '', 'g')
    when length(regexp_replace(value, '\D', '', 'g')) between 8 and 15 then '+' || regexp_replace(value, '\D', '', 'g')
    else null
  end
$$;

alter table public.client_profiles
  add column if not exists normalized_mobile text generated always as (public.normalize_ph_mobile(mobile)) stored;

create index if not exists client_profiles_normalized_mobile_idx
  on public.client_profiles (normalized_mobile)
  where normalized_mobile is not null;

create index if not exists projects_booking_id_idx
  on public.projects (booking_id)
  where booking_id is not null;

create or replace function public.create_project_for_confirmed_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    return new;
  end if;
  if exists (select 1 from public.projects where booking_id = new.id) then
    return new;
  end if;
  insert into public.projects (client_id, booking_id, reference, title, description, status, starts_at)
  values (
    new.client_id,
    new.id,
    'KS-PROJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    new.service_type || ' - ' || new.reference,
    'Automatically created from confirmed booking ' || new.reference,
    'planned',
    (new.service_date::text || ' ' || new.service_time::text || '+08')::timestamptz
  )
  on conflict (reference) do nothing;
  return new;
end
$$;

drop trigger if exists booking_create_project_after_confirmation on public.bookings;
create trigger booking_create_project_after_confirmation
after insert or update of status on public.bookings
for each row execute function public.create_project_for_confirmed_booking();

insert into public.projects (client_id, booking_id, reference, title, description, status, starts_at)
select b.client_id, b.id,
  'KS-PROJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  b.service_type || ' - ' || b.reference,
  'Automatically created from confirmed booking ' || b.reference,
  'planned',
  (b.service_date::text || ' ' || b.service_time::text || '+08')::timestamptz
from public.bookings b
where b.status = 'confirmed'
  and not exists (select 1 from public.projects p where p.booking_id = b.id)
on conflict (reference) do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (length(btrim(reference)) between 1 and 64),
  category text not null check (length(btrim(category)) between 1 and 64),
  description text not null check (length(btrim(description)) between 1 and 500),
  expense_date date not null,
  amount_php integer not null check (amount_php > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 255),
  source text not null check (source in ('Finance', 'Bookings', 'Projects', 'Tasks')),
  period text not null check (length(btrim(period)) between 1 and 64),
  schedule text not null default 'Manual' check (schedule in ('Manual', 'Weekly', 'Monthly')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.saved_reports enable row level security;
revoke all on public.expenses, public.saved_reports from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products', 'pos_sales', 'pos_sale_items', 'pos_catalogs', 'pos_catalog_items',
    'equipment', 'equipment_checkouts', 'maintenance_records', 'marketing_campaigns',
    'quotations', 'glitches', 'feedback_reports', 'tasks', 'shifts', 'compliance_records',
    'recruitment_roles', 'recruitment_candidates', 'recruitment_hires', 'recruitment_departures',
    'performance_reviews', 'performance_goals', 'payroll_employees', 'payroll_runs',
    'payroll_payslips', 'payroll_adjustments', 'payroll_contributions',
    'website_portfolio_items', 'staff_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

alter table public.payroll_contributions
  add constraint payroll_contributions_nonnegative_check check (
    sss_amount >= 0 and philhealth_amount >= 0 and pagibig_amount >= 0 and
    employer_sss >= 0 and employer_philhealth >= 0 and employer_pagibig >= 0
  ) not valid,
  add constraint payroll_contributions_positive_total_check check (
    sss_amount + philhealth_amount + pagibig_amount + employer_sss + employer_philhealth + employer_pagibig > 0
  ) not valid;
