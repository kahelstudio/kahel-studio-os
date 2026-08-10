-- Expand the existing operations glitch log into an auditable incident tracker.

alter table public.glitches drop constraint glitches_reference_check;
alter table public.glitches drop constraint glitches_title_check;
alter table public.glitches drop constraint glitches_area_check;
alter table public.glitches drop constraint glitches_reporter_check;
alter table public.glitches drop constraint glitches_severity_check;
alter table public.glitches drop constraint glitches_status_check;

alter table public.glitches rename column area to location_or_system;
alter table public.glitches rename column reporter to reporter_name;
alter table public.glitches rename column reported_at to created_at;
alter table public.glitches rename column created_by to reported_by;

alter table public.glitches
  add column description text,
  add column category text,
  add column operations_blocked boolean not null default false,
  add column workaround text,
  add column resolution_summary text,
  add column assigned_to uuid references auth.users(id) on delete set null,
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column booking_id uuid references public.bookings(id) on delete set null,
  add column project_id uuid references public.projects(id) on delete set null,
  add column client_id uuid references public.clients(id) on delete set null,
  add column linked_task_id uuid references public.tasks(id) on delete set null,
  add column observed_at timestamptz,
  add column updated_at timestamptz,
  add column closed_at timestamptz,
  add column archived_at timestamptz;

update public.glitches
set description = title,
    category = 'Other',
    observed_at = created_at,
    updated_at = created_at,
    resolution_summary = case when status in ('fixed', 'closed') then 'Resolved before activity tracking was enabled.' else null end,
    resolved_at = case when status in ('fixed', 'closed') then coalesce(resolved_at, created_at) else resolved_at end,
    closed_at = case when status = 'closed' then coalesce(resolved_at, created_at) else null end,
    status = case status
      when 'open' then 'Open'
      when 'progress' then 'In Progress'
      when 'fixed' then 'Resolved'
      when 'closed' then 'Closed'
      else status
    end;

alter table public.glitches
  alter column description set not null,
  alter column category set not null,
  alter column observed_at set not null,
  alter column observed_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now(),
  alter column location_or_system drop not null,
  alter column reporter_name drop not null;

alter table public.glitches
  add constraint glitches_reference_check check (reference ~ '^GL-[0-9]{4}-[0-9]{4}$' or reference ~ '^(DEMO-G-|GL-[0-9]{6}-)[A-Z0-9-]+$'),
  add constraint glitches_title_check check (length(btrim(title)) between 3 and 500),
  add constraint glitches_description_check check (length(btrim(description)) between 5 and 5000),
  add constraint glitches_category_check check (category in ('System', 'Booking', 'Payment', 'Equipment', 'Files', 'Internet', 'Power', 'Facility', 'Client Concern', 'Workflow', 'Other')),
  add constraint glitches_location_check check (location_or_system is null or length(btrim(location_or_system)) between 1 and 255),
  add constraint glitches_reporter_name_check check (reporter_name is null or length(btrim(reporter_name)) between 1 and 255),
  add constraint glitches_severity_check check (severity in ('Low', 'Medium', 'High', 'Critical')),
  add constraint glitches_status_check check (status in ('Open', 'In Progress', 'Waiting', 'Resolved', 'Closed')),
  add constraint glitches_resolution_check check (status not in ('Resolved', 'Closed') or (resolution_summary is not null and resolved_at is not null)),
  add constraint glitches_closed_check check (status <> 'Closed' or closed_at is not null);

create table public.glitch_reference_counters (
  reference_year integer primary key check (reference_year between 2020 and 9999),
  last_value integer not null check (last_value between 0 and 9999)
);

insert into public.glitch_reference_counters(reference_year, last_value)
select matched[1]::integer, max(matched[2]::integer)
from public.glitches,
     lateral regexp_match(reference, '^GL-([0-9]{4})-([0-9]{4})$') matched
where matched[1] is not null and matched[2] is not null
group by matched[1]
on conflict (reference_year) do update set last_value = greatest(public.glitch_reference_counters.last_value, excluded.last_value);

create function public.next_glitch_reference()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year integer := extract(year from timezone('Asia/Manila', now()))::integer;
  next_value integer;
begin
  insert into public.glitch_reference_counters(reference_year, last_value)
  values (current_year, 1)
  on conflict (reference_year) do update
    set last_value = public.glitch_reference_counters.last_value + 1
  returning last_value into next_value;
  if next_value > 9999 then raise exception 'Annual glitch reference capacity exhausted'; end if;
  return 'GL-' || current_year::text || '-' || lpad(next_value::text, 4, '0');
end;
$$;

alter table public.glitches alter column reference set default public.next_glitch_reference();

create table public.glitch_activity (
  id bigint generated always as identity primary key,
  glitch_id uuid not null references public.glitches(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated', 'assigned', 'status_changed', 'internal_update', 'attachment_added', 'task_linked', 'resolved', 'reopened', 'closed', 'archived')),
  message text not null check (length(btrim(message)) between 1 and 2000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.glitch_attachments (
  id uuid primary key default gen_random_uuid(),
  glitch_id uuid not null references public.glitches(id) on delete cascade,
  storage_path text unique not null check (length(btrim(storage_path)) between 1 and 500),
  filename text not null check (length(btrim(filename)) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into storage.buckets(id, name, public)
values ('glitch-attachments', 'glitch-attachments', false)
on conflict (id) do update set public = false;

create trigger glitches_set_updated_at before update on public.glitches
for each row execute function public.set_customer_updated_at();

create function public.prevent_glitch_activity_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'glitch activity is append-only'; end;
$$;

create trigger glitch_activity_append_only before update or delete on public.glitch_activity
for each row execute function public.prevent_glitch_activity_mutation();

drop index if exists public.idx_glitches_status;
create index idx_glitches_status_created on public.glitches(status, created_at desc) where archived_at is null;
create index idx_glitches_severity_created on public.glitches(severity, created_at desc) where archived_at is null;
create index idx_glitches_reported_by on public.glitches(reported_by, created_at desc) where archived_at is null;
create index idx_glitches_assigned_to on public.glitches(assigned_to, created_at desc) where archived_at is null;
create index idx_glitch_activity_glitch on public.glitch_activity(glitch_id, created_at desc);
create index idx_glitch_attachments_glitch on public.glitch_attachments(glitch_id, created_at);

alter table public.glitch_reference_counters enable row level security;
alter table public.glitch_activity enable row level security;
alter table public.glitch_attachments enable row level security;
revoke all on public.glitch_reference_counters, public.glitch_activity, public.glitch_attachments from anon, authenticated;
revoke all on function public.next_glitch_reference() from public, anon, authenticated;
grant execute on function public.next_glitch_reference() to service_role;
