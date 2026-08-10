begin;

drop trigger if exists glitch_activity_append_only on public.glitch_activity;
drop function if exists public.prevent_glitch_activity_mutation();
drop trigger if exists glitches_set_updated_at on public.glitches;
drop table if exists public.glitch_attachments;
drop table if exists public.glitch_activity;

delete from storage.objects where bucket_id = 'glitch-attachments';
delete from storage.buckets where id = 'glitch-attachments';

alter table public.glitches alter column reference drop default;
drop function if exists public.next_glitch_reference();
drop table if exists public.glitch_reference_counters;

drop index if exists public.idx_glitches_status_created;
drop index if exists public.idx_glitches_severity_created;
drop index if exists public.idx_glitches_reported_by;
drop index if exists public.idx_glitches_assigned_to;

alter table public.glitches
  drop constraint if exists glitches_reference_check,
  drop constraint if exists glitches_title_check,
  drop constraint if exists glitches_description_check,
  drop constraint if exists glitches_category_check,
  drop constraint if exists glitches_location_check,
  drop constraint if exists glitches_reporter_name_check,
  drop constraint if exists glitches_severity_check,
  drop constraint if exists glitches_status_check,
  drop constraint if exists glitches_resolution_check,
  drop constraint if exists glitches_closed_check;

update public.glitches set
  status = case status when 'Open' then 'open' when 'In Progress' then 'progress' when 'Waiting' then 'progress' when 'Resolved' then 'fixed' when 'Closed' then 'closed' end,
  severity = case severity when 'Critical' then 'High' else severity end,
  location_or_system = coalesce(nullif(btrim(location_or_system), ''), 'Other'),
  reporter_name = coalesce(nullif(btrim(reporter_name), ''), 'Unknown');

alter table public.glitches
  drop column description,
  drop column category,
  drop column operations_blocked,
  drop column workaround,
  drop column resolution_summary,
  drop column assigned_to,
  drop column resolved_by,
  drop column booking_id,
  drop column project_id,
  drop column client_id,
  drop column linked_task_id,
  drop column observed_at,
  drop column updated_at,
  drop column closed_at,
  drop column archived_at;

alter table public.glitches rename column location_or_system to area;
alter table public.glitches rename column reporter_name to reporter;
alter table public.glitches rename column created_at to reported_at;
alter table public.glitches rename column reported_by to created_by;

alter table public.glitches
  alter column area set not null,
  alter column reporter set not null,
  add constraint glitches_reference_check check (length(btrim(reference)) between 1 and 16),
  add constraint glitches_title_check check (length(btrim(title)) between 1 and 500),
  add constraint glitches_area_check check (length(btrim(area)) between 1 and 255),
  add constraint glitches_reporter_check check (length(btrim(reporter)) between 1 and 255),
  add constraint glitches_severity_check check (severity in ('High', 'Medium', 'Low')),
  add constraint glitches_status_check check (status in ('open', 'progress', 'fixed', 'closed'));

create index idx_glitches_status on public.glitches(status);

commit;
