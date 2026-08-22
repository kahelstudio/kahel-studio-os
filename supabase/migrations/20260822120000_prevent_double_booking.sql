-- Canonical resource reservations. Bookings remain the customer/financial record;
-- this migration adds resource-scoped interval ownership without replacing them.

create extension if not exists btree_gist with schema extensions;

create table public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  type text not null check (type in ('space', 'team')),
  timezone text not null default 'Asia/Manila' check (length(btrim(timezone)) between 1 and 100),
  capacity integer not null default 1 check (capacity = 1),
  active boolean not null default true,
  hold_minutes integer not null default 10 check (hold_minutes between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.booking_resources (id, code, name, type) values
  ('51000000-0000-4000-8000-000000000001', 'main-studio', 'Main Studio', 'space'),
  ('51000000-0000-4000-8000-000000000002', 'event-team', 'Event Team', 'team')
on conflict (code) do update set
  name = excluded.name, type = excluded.type, active = true;

alter table public.services
  add column duration_minutes integer not null default 60 check (duration_minutes > 0),
  add column prep_buffer_minutes integer not null default 0 check (prep_buffer_minutes >= 0),
  add column cleanup_buffer_minutes integer not null default 0 check (cleanup_buffer_minutes >= 0),
  add column minimum_notice_minutes integer not null default 0 check (minimum_notice_minutes >= 0),
  add column maximum_advance_days integer not null default 365 check (maximum_advance_days > 0),
  add column default_resource_id uuid references public.booking_resources(id) on delete restrict;

-- Unknown legacy services use one hour in the main studio. This is deliberately
-- conservative: it preserves single-resource safety without inventing products.
update public.services
set default_resource_id = '51000000-0000-4000-8000-000000000001',
    duration_minutes = 60;

-- Canonical studio packages and known code aliases. Additional Hour is an add-on,
-- not a persisted service, and is intentionally not inferred here.
update public.services
set duration_minutes = case
      when lower(code) in ('mini', 'mini-session') or lower(name) = 'mini session' then 30
      else 60
    end,
    default_resource_id = '51000000-0000-4000-8000-000000000001'
where lower(code) in (
    'theme', 'theme-session', 'express', 'express-session', 'group', 'group-session',
    'duo', 'duo-session', 'solo', 'solo-session', 'complimentary-solo-session',
    'mini', 'mini-session', 'studio-rental', 'blocked', 'power-interruption', 'other'
  )
  or lower(name) in (
    'theme', 'theme session', 'express', 'express session', 'group', 'group session',
    'duo', 'duo session', 'solo', 'solo session', 'complimentary solo',
    'complimentary solo session', 'mini', 'mini session', 'studio rental',
    'blocked', 'power interruption', 'other'
  );

-- Named event packages are half-day unless their persisted name/code explicitly
-- says full-day. Studio Rental and pseudo blockers stay on main-studio so they
-- continue to protect the physical studio; event work uses the independent team.
update public.services
set duration_minutes = case
      when lower(code) in ('debut', 'anniversary-celebration')
        or lower(name) in ('debut', 'anniversary celebration')
        or lower(name) like '%full day%' or lower(name) like '%full-day%'
        or lower(code) like '%full-day%' then 480
      else 240
    end,
    default_resource_id = '51000000-0000-4000-8000-000000000002'
where lower(code) in (
    'baby-shower', 'engagement-party', 'birthday', 'christening', 'debut',
    'anniversary-celebration'
  )
  or lower(name) in (
    'baby shower', 'engagement party', 'birthday', 'christening', 'debut',
    'anniversary celebration'
  )
  or lower(name) like '%half day%'
  or lower(name) like '%half-day%'
  or lower(name) like '%full day%'
  or lower(name) like '%full-day%'
  or lower(code) like '%half-day%'
  or lower(code) like '%full-day%';

alter table public.services alter column default_resource_id set not null;

create table public.booking_resource_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.booking_resources(id) on delete restrict,
  iso_day_of_week smallint not null check (iso_day_of_week between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at),
  unique (resource_id, iso_day_of_week, opens_at, closes_at)
);

insert into public.booking_resource_weekly_hours
  (resource_id, iso_day_of_week, opens_at, closes_at)
select '51000000-0000-4000-8000-000000000001'::uuid, day_number, time '08:00', time '17:00'
from generate_series(1, 6) as days(day_number)
union all
select '51000000-0000-4000-8000-000000000002'::uuid, day_number, time '00:00', time '23:59:59.999999'
from generate_series(1, 7) as days(day_number)
on conflict do nothing;

create table public.booking_resource_blackouts (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.booking_resources(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_range tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

comment on table public.booking_resource_blackouts is
  'Normalized closures, including optional recurring-date lunch closures materialized by operations. No lunch is seeded so existing 12:00-13:00 usability is preserved.';

alter table public.bookings
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column timezone text,
  add column resource_id uuid references public.booking_resources(id) on delete restrict,
  add column duration_minutes_snapshot integer check (duration_minutes_snapshot is null or duration_minutes_snapshot > 0),
  add column prep_buffer_minutes_snapshot integer check (prep_buffer_minutes_snapshot is null or prep_buffer_minutes_snapshot >= 0),
  add column cleanup_buffer_minutes_snapshot integer check (cleanup_buffer_minutes_snapshot is null or cleanup_buffer_minutes_snapshot >= 0),
  add column reservation_hold_id uuid,
  add column reservation_owner_token_hash text,
  add column cancellation_reason text,
  add column cancellation_actor_id uuid references auth.users(id) on delete set null,
  add column cancelled_at timestamptz,
  add constraint bookings_schedule_interval_check check (ends_at is null or starts_at is null or ends_at > starts_at);

-- Existing cancellations predate structured cancellation metadata.
update public.bookings
set cancellation_reason = 'Legacy cancellation',
    cancelled_at = coalesce(updated_at, created_at)
where status = 'cancelled' and cancelled_at is null;

alter table public.bookings
  add constraint bookings_cancellation_metadata_check check (
    (status <> 'cancelled')
    or (cancelled_at is not null and length(btrim(coalesce(cancellation_reason, ''))) > 0)
  );

update public.bookings b
set timezone = r.timezone,
    resource_id = s.default_resource_id,
    duration_minutes_snapshot = s.duration_minutes,
    prep_buffer_minutes_snapshot = s.prep_buffer_minutes,
    cleanup_buffer_minutes_snapshot = s.cleanup_buffer_minutes,
    starts_at = (b.service_date + b.service_time) at time zone r.timezone,
    ends_at = ((b.service_date + b.service_time) at time zone r.timezone)
      + make_interval(mins => s.duration_minutes)
from public.services s
join public.booking_resources r on r.id = s.default_resource_id
where s.id = b.service_id;

alter table public.bookings
  alter column starts_at set not null,
  alter column ends_at set not null,
  alter column timezone set not null,
  alter column resource_id set not null,
  alter column duration_minutes_snapshot set not null,
  alter column prep_buffer_minutes_snapshot set not null,
  alter column cleanup_buffer_minutes_snapshot set not null;

create table public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  service_id uuid not null references public.services(id) on delete restrict,
  resource_id uuid not null references public.booking_resources(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_starts_at timestamptz not null,
  blocked_ends_at timestamptz not null,
  blocked_range tstzrange generated always as (tstzrange(blocked_starts_at, blocked_ends_at, '[)')) stored,
  type text not null check (type in ('hold', 'booking', 'blackout')),
  status text not null check (status in ('held', 'booked', 'released', 'expired')),
  expires_at timestamptz,
  idempotency_key text,
  request_fingerprint text,
  owner_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  constraint booking_reservations_booking_fkey foreign key (booking_id)
    references public.bookings(id) on delete restrict deferrable initially deferred,
  constraint booking_reservations_booking_key unique (booking_id),
  constraint booking_reservations_idempotency_key unique (idempotency_key),
  constraint booking_reservations_interval_check check (
    ends_at > starts_at and blocked_ends_at > blocked_starts_at
    and blocked_starts_at <= starts_at and blocked_ends_at >= ends_at
  ),
  constraint booking_reservations_hold_check check (
    (status = 'held' and type = 'hold' and expires_at is not null
      and idempotency_key is not null and request_fingerprint is not null and owner_token_hash is not null)
    or status <> 'held'
  ),
  constraint booking_reservations_release_check check (
    (status in ('released', 'expired') and released_at is not null)
    or (status in ('held', 'booked') and released_at is null)
  )
);

alter table public.bookings
  add constraint bookings_reservation_hold_fkey foreign key (reservation_hold_id)
    references public.booking_reservations(id) on delete restrict deferrable initially deferred;

create index booking_reservations_resource_time_idx
  on public.booking_reservations using gist (resource_id, blocked_range);
create index booking_reservations_expiry_idx
  on public.booking_reservations (expires_at) where expires_at is not null and status in ('held', 'booked');
create index booking_reservations_booking_idx
  on public.booking_reservations (booking_id) where booking_id is not null;
create index booking_blackouts_resource_time_idx
  on public.booking_resource_blackouts using gist (resource_id, blocked_range) where active;
create index booking_hours_resource_day_idx
  on public.booking_resource_weekly_hours (resource_id, iso_day_of_week) where active;

-- Enable reservation RLS before backfill. Its booking FK is intentionally
-- deferred so BEFORE INSERT booking triggers can reserve the new booking ID.
alter table public.booking_reservations enable row level security;

create table public.booking_schedule_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  old_schedule jsonb not null check (jsonb_typeof(old_schedule) = 'object'),
  new_schedule jsonb not null check (jsonb_typeof(new_schedule) = 'object'),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.booking_reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.booking_reservations(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict deferrable initially deferred,
  event_type text not null check (length(btrim(event_type)) between 1 and 100),
  previous_data jsonb not null check (jsonb_typeof(previous_data) = 'object'),
  new_data jsonb not null check (jsonb_typeof(new_data) = 'object'),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.provider_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (length(btrim(provider)) between 1 and 50),
  event_id text not null check (length(btrim(event_id)) between 1 and 255),
  event_type text not null check (length(btrim(event_type)) between 1 and 150),
  request_fingerprint text not null check (length(request_fingerprint) between 32 and 128),
  safe_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, event_id),
  check ((status = 'processed' and processed_at is not null) or status <> 'processed')
);

create index booking_schedule_history_booking_idx
  on public.booking_schedule_history (booking_id, id desc);
create index booking_reservation_events_reservation_idx
  on public.booking_reservation_events (reservation_id, id desc);
create index provider_webhook_inbox_pending_idx
  on public.provider_webhook_inbox (next_attempt_at, received_at)
  where status in ('pending', 'failed');

-- Abort before creating canonical rows if active future bookings already conflict.
-- No booking is changed, deleted, cancelled, or silently reassigned.
do $$
declare conflict_detail text;
begin
  select string_agg(a.reference || ' overlaps ' || b.reference, '; ' order by a.reference, b.reference)
  into conflict_detail
  from public.bookings a
  join public.bookings b on a.id < b.id and a.resource_id = b.resource_id
    and tstzrange(
      a.starts_at - make_interval(mins => a.prep_buffer_minutes_snapshot),
      a.ends_at + make_interval(mins => a.cleanup_buffer_minutes_snapshot), '[)'
    ) && tstzrange(
      b.starts_at - make_interval(mins => b.prep_buffer_minutes_snapshot),
      b.ends_at + make_interval(mins => b.cleanup_buffer_minutes_snapshot), '[)'
    )
  where a.status in ('inquiry', 'quoted', 'confirmed', 'progress')
    and b.status in ('inquiry', 'quoted', 'confirmed', 'progress')
    and a.ends_at > clock_timestamp() and b.ends_at > clock_timestamp();

  if conflict_detail is not null then
    raise exception 'canonical reservation migration blocked by overlapping active future bookings: %', conflict_detail
      using errcode = '23P01', hint = 'Resolve the listed booking schedules before re-running this migration; no bookings were modified.';
  end if;
end;
$$;

alter table public.booking_reservations
  add constraint booking_reservations_exclusive_resource
  exclude using gist (resource_id with =, blocked_range with &&)
  where (status in ('held', 'booked'));

insert into public.booking_reservations (
  id, booking_id, service_id, resource_id, starts_at, ends_at,
  blocked_starts_at, blocked_ends_at, type, status, created_at, updated_at
)
select b.id, b.id, b.service_id, b.resource_id, b.starts_at, b.ends_at,
  b.starts_at - make_interval(mins => b.prep_buffer_minutes_snapshot),
  b.ends_at + make_interval(mins => b.cleanup_buffer_minutes_snapshot),
  'booking', 'booked', b.created_at, clock_timestamp()
from public.bookings b
where b.status in ('inquiry', 'quoted', 'confirmed', 'progress')
  and b.ends_at > clock_timestamp();

create or replace function public.prevent_booking_reservation_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'booking reservation audit records are append-only' using errcode = '55000';
end;
$$;

create trigger booking_schedule_history_immutable
before update or delete on public.booking_schedule_history
for each row execute function public.prevent_booking_reservation_audit_mutation();
create trigger booking_reservation_events_immutable
before update or delete on public.booking_reservation_events
for each row execute function public.prevent_booking_reservation_audit_mutation();

create or replace function public.audit_booking_reservation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.booking_reservation_events (
    reservation_id, booking_id, event_type, previous_data, new_data, actor_user_id
  ) values (
    new.id, new.booking_id,
    case when tg_op = 'INSERT' then 'reservation.created'
         when old.status <> new.status then 'reservation.' || new.status
         when old.blocked_range <> new.blocked_range then 'reservation.rescheduled'
         when old.booking_id is distinct from new.booking_id then 'reservation.linked'
         else 'reservation.updated' end,
    case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) - 'owner_token_hash' - 'request_fingerprint' - 'idempotency_key' end,
    to_jsonb(new) - 'owner_token_hash' - 'request_fingerprint' - 'idempotency_key', auth.uid()
  );
  return new;
end;
$$;

create trigger audit_booking_reservation_change
after insert or update on public.booking_reservations
for each row execute function public.audit_booking_reservation_change();

create or replace function public.expire_booking_holds(requested_limit integer default 500)
returns integer
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if requested_limit not between 1 and 5000 then
    raise exception 'invalid expiry batch size' using errcode = '22023';
  end if;
  with due as (
    select id from public.booking_reservations
    where status = 'held' and expires_at <= clock_timestamp()
    order by expires_at for update skip locked limit requested_limit
  )
  update public.booking_reservations r
  set status = 'expired', released_at = clock_timestamp(), updated_at = clock_timestamp()
  from due where r.id = due.id;
  get diagnostics changed = row_count;

  -- Provider checkout sessions can remain payable without an expires_at value.
  -- Booked reservations are released only by a definitive provider failure or
  -- an explicit staff reconciliation, never by an application-side timer.
  return changed;
end;
$$;

create or replace function public.get_booking_availability(
  requested_service_id uuid,
  requested_date date,
  requested_resource_id uuid default null,
  requested_duration_minutes integer default null
)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_service public.services%rowtype;
  selected_resource public.booking_resources%rowtype;
  server_time timestamptz := clock_timestamp();
  slots jsonb;
  effective_duration_minutes integer;
begin
  select * into selected_service from public.services
  where id = requested_service_id and active;
  if not found then raise exception 'service unavailable' using errcode = 'P0002'; end if;
  effective_duration_minutes := coalesce(requested_duration_minutes, selected_service.duration_minutes);
  if effective_duration_minutes < selected_service.duration_minutes
    or effective_duration_minutes > selected_service.duration_minutes + 480 then
    raise exception 'invalid requested duration' using errcode = '22023';
  end if;

  select * into selected_resource from public.booking_resources
  where id = coalesce(requested_resource_id, selected_service.default_resource_id) and active;
  if not found then raise exception 'resource unavailable' using errcode = 'P0002'; end if;
  if selected_resource.id <> selected_service.default_resource_id then
    raise exception 'resource is not configured for this service' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'starts_at', candidate.starts_at,
    'ends_at', candidate.ends_at,
    'available', not exists (
      select 1 from public.booking_reservations r
      where r.resource_id = selected_resource.id
        and (r.status = 'booked' or (r.status = 'held' and r.expires_at > server_time))
        and r.blocked_range && tstzrange(candidate.blocked_starts_at, candidate.blocked_ends_at, '[)')
    ) and not exists (
      select 1 from public.booking_resource_blackouts blackout
      where blackout.resource_id = selected_resource.id and blackout.active
        and blackout.blocked_range && tstzrange(candidate.blocked_starts_at, candidate.blocked_ends_at, '[)')
    ) and candidate.starts_at >= server_time + make_interval(mins => selected_service.minimum_notice_minutes)
      and requested_date <= (server_time at time zone selected_resource.timezone)::date + selected_service.maximum_advance_days,
    'unavailable_reason', case
      when candidate.starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes) then 'minimum_notice'
      when requested_date > (server_time at time zone selected_resource.timezone)::date + selected_service.maximum_advance_days then 'maximum_advance'
      when exists (select 1 from public.booking_resource_blackouts blackout where blackout.resource_id = selected_resource.id and blackout.active and blackout.blocked_range && tstzrange(candidate.blocked_starts_at, candidate.blocked_ends_at, '[)')) then 'blackout'
      when exists (select 1 from public.booking_reservations r where r.resource_id = selected_resource.id and (r.status = 'booked' or (r.status = 'held' and r.expires_at > server_time)) and r.blocked_range && tstzrange(candidate.blocked_starts_at, candidate.blocked_ends_at, '[)')) then 'reserved'
      else null end
  ) order by candidate.starts_at), '[]'::jsonb)
  into slots
  from (
    select local_start at time zone selected_resource.timezone as starts_at,
      (local_start at time zone selected_resource.timezone) + make_interval(mins => effective_duration_minutes) as ends_at,
      (local_start at time zone selected_resource.timezone) - make_interval(mins => selected_service.prep_buffer_minutes) as blocked_starts_at,
      (local_start at time zone selected_resource.timezone) + make_interval(mins => effective_duration_minutes + selected_service.cleanup_buffer_minutes) as blocked_ends_at
    from public.booking_resource_weekly_hours hours
    cross join lateral generate_series(
      requested_date + hours.opens_at,
      requested_date + hours.closes_at - make_interval(mins => effective_duration_minutes),
      interval '30 minutes'
    ) local_start
    where hours.resource_id = selected_resource.id and hours.active
      and hours.iso_day_of_week = extract(isodow from requested_date)::smallint
  ) candidate;

  return jsonb_build_object(
    'service_id', selected_service.id,
    'resource', jsonb_build_object('id', selected_resource.id, 'code', selected_resource.code, 'name', selected_resource.name),
    'date', requested_date,
    'timezone', selected_resource.timezone,
    'duration_minutes', effective_duration_minutes,
    'prep_buffer_minutes', selected_service.prep_buffer_minutes,
    'cleanup_buffer_minutes', selected_service.cleanup_buffer_minutes,
    'server_time', server_time,
    'refresh_after_seconds', 30,
    'slots', slots
  );
end;
$$;

create or replace function public.acquire_booking_hold(
  requested_service_id uuid,
  requested_starts_at timestamptz,
  requested_idempotency_key text,
  requested_fingerprint text,
  requested_owner_token_hash text,
  requested_resource_id uuid default null,
  requested_hold_minutes integer default null,
  requested_duration_minutes integer default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  selected_service public.services%rowtype;
  selected_resource public.booking_resources%rowtype;
  existing public.booking_reservations%rowtype;
  result public.booking_reservations%rowtype;
  server_time timestamptz := clock_timestamp();
  selected_ends_at timestamptz;
  selected_blocked_start timestamptz;
  selected_blocked_end timestamptz;
  local_date date;
  local_start time;
  local_end time;
  hold_minutes integer;
  effective_duration_minutes integer;
begin
  if length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
    or length(coalesce(requested_fingerprint, '')) not between 32 and 128
    or length(coalesce(requested_owner_token_hash, '')) not between 32 and 128 then
    raise exception 'invalid hold credentials' using errcode = '22023';
  end if;

  select * into selected_service from public.services where id = requested_service_id and active;
  if not found then raise exception 'service unavailable' using errcode = 'P0002'; end if;
  effective_duration_minutes := coalesce(requested_duration_minutes, selected_service.duration_minutes);
  if effective_duration_minutes < selected_service.duration_minutes
    or effective_duration_minutes > selected_service.duration_minutes + 480 then
    raise exception 'invalid requested duration' using errcode = '22023';
  end if;

  perform public.expire_booking_holds(500);
  select * into existing from public.booking_reservations
  where idempotency_key = btrim(requested_idempotency_key) for update;
  if found then
    if existing.request_fingerprint <> requested_fingerprint
      or existing.owner_token_hash <> requested_owner_token_hash
      or (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer <> effective_duration_minutes then
      raise exception 'idempotency key was already used with a different request' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'reservation_id', existing.id, 'status', existing.status,
      'starts_at', existing.starts_at, 'ends_at', existing.ends_at,
      'duration_minutes', (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer,
      'expires_at', existing.expires_at, 'server_time', server_time, 'idempotent_replay', true
    );
  end if;

  select * into selected_resource from public.booking_resources
  where id = coalesce(requested_resource_id, selected_service.default_resource_id) and active;
  if not found then raise exception 'resource unavailable' using errcode = 'P0002'; end if;
  if selected_resource.id <> selected_service.default_resource_id then
    raise exception 'resource is not configured for this service' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(selected_resource.id::text, 0));

  hold_minutes := least(coalesce(requested_hold_minutes, selected_resource.hold_minutes), selected_resource.hold_minutes, 10);
  if hold_minutes < 1 then raise exception 'invalid hold duration' using errcode = '22023'; end if;

  selected_ends_at := requested_starts_at + make_interval(mins => effective_duration_minutes);
  selected_blocked_start := requested_starts_at - make_interval(mins => selected_service.prep_buffer_minutes);
  selected_blocked_end := selected_ends_at + make_interval(mins => selected_service.cleanup_buffer_minutes);
  local_date := (requested_starts_at at time zone selected_resource.timezone)::date;
  local_start := (requested_starts_at at time zone selected_resource.timezone)::time;
  local_end := (selected_ends_at at time zone selected_resource.timezone)::time;

  if requested_starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes) then
    raise exception 'requested time violates minimum notice' using errcode = '22023';
  end if;
  if local_date > (server_time at time zone selected_resource.timezone)::date + selected_service.maximum_advance_days then
    raise exception 'requested time exceeds maximum advance window' using errcode = '22023';
  end if;
  if (selected_ends_at at time zone selected_resource.timezone)::date <> local_date
    or not exists (
      select 1 from public.booking_resource_weekly_hours hours
      where hours.resource_id = selected_resource.id and hours.active
        and hours.iso_day_of_week = extract(isodow from local_date)::smallint
        and local_start >= hours.opens_at and local_end <= hours.closes_at
    ) then
    raise exception 'requested time is outside resource business hours' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.booking_resource_blackouts blackout
    where blackout.resource_id = selected_resource.id and blackout.active
      and blackout.blocked_range && tstzrange(selected_blocked_start, selected_blocked_end, '[)')
  ) then
    raise exception 'requested time overlaps a resource blackout' using errcode = '23P01';
  end if;

  begin
    insert into public.booking_reservations (
      service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at,
      type, status, expires_at, idempotency_key, request_fingerprint, owner_token_hash
    ) values (
      selected_service.id, selected_resource.id, requested_starts_at, selected_ends_at,
      selected_blocked_start, selected_blocked_end, 'hold', 'held', server_time + make_interval(mins => hold_minutes),
      btrim(requested_idempotency_key), requested_fingerprint, requested_owner_token_hash
    ) returning * into result;
  exception when exclusion_violation then
    select * into existing from public.booking_reservations
    where idempotency_key = btrim(requested_idempotency_key);
    if found and existing.request_fingerprint = requested_fingerprint
      and existing.owner_token_hash = requested_owner_token_hash
      and (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer = effective_duration_minutes then
      return jsonb_build_object(
        'reservation_id', existing.id, 'status', existing.status,
        'starts_at', existing.starts_at, 'ends_at', existing.ends_at,
        'duration_minutes', (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer,
        'expires_at', existing.expires_at, 'server_time', server_time, 'idempotent_replay', true
      );
    end if;
    raise exception 'requested time is no longer available' using errcode = '23P01';
  when unique_violation then
    select * into existing from public.booking_reservations
    where idempotency_key = btrim(requested_idempotency_key);
    if not found or existing.request_fingerprint <> requested_fingerprint
      or existing.owner_token_hash <> requested_owner_token_hash
      or (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer <> effective_duration_minutes then
      raise exception 'idempotency key was already used with a different request' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'reservation_id', existing.id, 'status', existing.status,
      'starts_at', existing.starts_at, 'ends_at', existing.ends_at,
      'duration_minutes', (extract(epoch from existing.ends_at - existing.starts_at) / 60)::integer,
      'expires_at', existing.expires_at, 'server_time', server_time, 'idempotent_replay', true
    );
  end;

  return jsonb_build_object(
    'reservation_id', result.id, 'status', result.status,
    'starts_at', result.starts_at, 'ends_at', result.ends_at,
    'duration_minutes', effective_duration_minutes,
    'expires_at', result.expires_at, 'server_time', server_time, 'idempotent_replay', false
  );
end;
$$;

create or replace function public.release_booking_hold(
  requested_reservation_id uuid,
  requested_owner_token_hash text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.booking_reservations%rowtype;
begin
  select * into result from public.booking_reservations
  where id = requested_reservation_id for update;
  if not found or result.owner_token_hash is distinct from requested_owner_token_hash then
    raise exception 'hold not found' using errcode = 'P0002';
  end if;
  if result.booking_id is not null then raise exception 'linked hold cannot be released directly' using errcode = '22023'; end if;
  if result.status = 'held' then
    update public.booking_reservations set status = 'released', released_at = clock_timestamp(), updated_at = clock_timestamp()
    where id = result.id returning * into result;
  end if;
  return jsonb_build_object('reservation_id', result.id, 'status', result.status, 'server_time', clock_timestamp());
end;
$$;

create or replace function public.sync_booking_reservation()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  selected_service public.services%rowtype;
  selected_resource public.booking_resources%rowtype;
  current_reservation public.booking_reservations%rowtype;
  attached_hold public.booking_reservations%rowtype;
  schedule_changed boolean;
  target_status text;
  target_type text;
  actor uuid := auth.uid();
  server_time timestamptz := clock_timestamp();
  local_date date;
  local_start time;
  local_end time;
begin
  perform public.expire_booking_holds(500);
  select * into selected_service from public.services where id = new.service_id;
  if not found then
    raise exception 'booking service is unavailable' using errcode = '22023';
  end if;
  if not selected_service.active then
    if tg_op = 'INSERT' then
      raise exception 'booking service is unavailable' using errcode = '22023';
    elsif new.service_id is distinct from old.service_id then
      raise exception 'booking service is unavailable' using errcode = '22023';
    end if;
  end if;

  if tg_op = 'INSERT' then
    schedule_changed := true;
  else
    schedule_changed := new.service_id is distinct from old.service_id
      or new.service_date is distinct from old.service_date
      or new.service_time is distinct from old.service_time
      or new.starts_at is distinct from old.starts_at
      or new.resource_id is distinct from old.resource_id
      or new.duration_minutes_snapshot is distinct from old.duration_minutes_snapshot;
  end if;

  if tg_op = 'INSERT' or schedule_changed then
    new.resource_id := coalesce(new.resource_id, selected_service.default_resource_id);
    if new.resource_id <> selected_service.default_resource_id then
      raise exception 'resource is not configured for this service' using errcode = '22023';
    end if;
    select * into selected_resource from public.booking_resources where id = new.resource_id and active;
    if not found then raise exception 'booking resource is unavailable' using errcode = '22023'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(selected_resource.id::text, 0));
    new.timezone := selected_resource.timezone;
    if new.duration_minutes_snapshot is null then
      new.duration_minutes_snapshot := selected_service.duration_minutes;
    elsif new.duration_minutes_snapshot < selected_service.duration_minutes
      or new.duration_minutes_snapshot > selected_service.duration_minutes + 480 then
      raise exception 'invalid booking duration' using errcode = '22023';
    end if;
    new.prep_buffer_minutes_snapshot := selected_service.prep_buffer_minutes;
    new.cleanup_buffer_minutes_snapshot := selected_service.cleanup_buffer_minutes;
    if new.starts_at is null or (tg_op = 'UPDATE' and
      (new.service_date is distinct from old.service_date or new.service_time is distinct from old.service_time)
      and new.starts_at is not distinct from old.starts_at) then
      new.starts_at := (new.service_date + new.service_time) at time zone new.timezone;
    else
      new.service_date := (new.starts_at at time zone new.timezone)::date;
      new.service_time := (new.starts_at at time zone new.timezone)::time;
    end if;
    new.ends_at := new.starts_at + make_interval(mins => new.duration_minutes_snapshot);
  end if;

  -- Only a new or changed active schedule is checked against current operating
  -- policy. Status-only writes retain their original accepted schedule.
  if schedule_changed and new.status in ('inquiry', 'quoted', 'confirmed', 'progress') then
    local_date := (new.starts_at at time zone new.timezone)::date;
    local_start := (new.starts_at at time zone new.timezone)::time;
    local_end := (new.ends_at at time zone new.timezone)::time;

    if new.starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes)
      or local_date > (server_time at time zone new.timezone)::date + selected_service.maximum_advance_days
      or (new.ends_at at time zone new.timezone)::date <> local_date
      or not exists (
        select 1 from public.booking_resource_weekly_hours hours
        where hours.resource_id = new.resource_id and hours.active
          and hours.iso_day_of_week = extract(isodow from local_date)::smallint
          and local_start >= hours.opens_at and local_end <= hours.closes_at
      ) then
      raise exception 'booking schedule is not allowed' using errcode = '22023';
    end if;

    if exists (
      select 1 from public.booking_resource_blackouts blackout
      where blackout.resource_id = new.resource_id and blackout.active
        and blackout.blocked_range && tstzrange(
          new.starts_at - make_interval(mins => new.prep_buffer_minutes_snapshot),
          new.ends_at + make_interval(mins => new.cleanup_buffer_minutes_snapshot), '[)'
        )
    ) then
      raise exception 'booking schedule is unavailable' using errcode = '23P01';
    end if;
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, clock_timestamp());
    new.cancellation_actor_id := coalesce(new.cancellation_actor_id, actor);
    new.cancellation_reason := coalesce(nullif(btrim(new.cancellation_reason), ''), 'Booking cancelled');
  elsif tg_op = 'UPDATE' and old.status = 'cancelled' then
    new.cancelled_at := null; new.cancellation_actor_id := null; new.cancellation_reason := null;
  end if;

  if new.reservation_hold_id is not null and new.reservation_owner_token_hash is not null then
    select * into attached_hold from public.booking_reservations
    where id = new.reservation_hold_id for update;
    if not found or attached_hold.status <> 'held' or attached_hold.expires_at <= clock_timestamp()
      or attached_hold.owner_token_hash is distinct from new.reservation_owner_token_hash
      or attached_hold.service_id <> new.service_id or attached_hold.resource_id <> new.resource_id
      or attached_hold.starts_at <> new.starts_at or attached_hold.ends_at <> new.ends_at then
      raise exception 'reservation hold is expired, owned by another request, or does not match the booking' using errcode = '23P01';
    end if;
    if attached_hold.booking_id is not null and attached_hold.booking_id <> new.id then
      raise exception 'reservation hold is already linked to another booking' using errcode = '23505';
    end if;
    select * into current_reservation from public.booking_reservations where booking_id = new.id for update;
    if found and current_reservation.id <> attached_hold.id then
      update public.booking_reservations set status = 'released', released_at = clock_timestamp(), updated_at = clock_timestamp()
      where id = current_reservation.id and status in ('held', 'booked');
    end if;
    update public.booking_reservations
    set booking_id = new.id,
        type = case
          when new.status in ('cancelled', 'completed') or new.payment_type = 'cash'
            or new.payment_type = 'loyalty_reward'
            or new.status in ('confirmed', 'progress') then 'booking'
          else 'hold' end,
        status = case
          when new.status in ('cancelled', 'completed') then 'released'
          when new.payment_type = 'cash' or new.payment_type = 'loyalty_reward'
            or new.status in ('confirmed', 'progress') then 'booked'
          else 'held' end,
        expires_at = case
          when new.payment_type <> 'cash' and new.payment_type <> 'loyalty_reward'
            and new.status in ('inquiry', 'quoted') then expires_at
          else null end,
        released_at = case when new.status in ('cancelled', 'completed') then clock_timestamp() else null end,
        updated_at = clock_timestamp()
    where id = attached_hold.id;
    new.reservation_owner_token_hash := null;
    return new;
  end if;

  new.reservation_owner_token_hash := null;
  select * into current_reservation from public.booking_reservations where booking_id = new.id for update;
  target_status := case when new.status in ('cancelled', 'completed') then 'released' else 'booked' end;
  target_type := 'booking';

  if found then
    if current_reservation.status = 'expired' and new.reservation_hold_id = current_reservation.id then
      if new.status = 'confirmed' and new.payment_status in ('paid', 'partially_paid') then
        target_status := 'booked';
      elsif new.status in ('inquiry', 'quoted', 'confirmed', 'progress') then
        raise exception 'linked reservation hold expired before booking activation' using errcode = '23P01';
      end if;
    end if;
    if current_reservation.status = 'held'
      and (new.payment_type = 'cash' or new.payment_type = 'loyalty_reward'
        or new.status in ('confirmed', 'progress')) then
      if current_reservation.expires_at <= clock_timestamp() then
        raise exception 'linked reservation hold expired before booking confirmation' using errcode = '23P01';
      end if;
      target_status := 'booked';
    elsif current_reservation.status = 'held' and new.status in ('inquiry', 'quoted') then
      target_status := 'held'; target_type := 'hold';
    end if;
    update public.booking_reservations
    set service_id = new.service_id, resource_id = new.resource_id,
        starts_at = new.starts_at, ends_at = new.ends_at,
        blocked_starts_at = new.starts_at - make_interval(mins => new.prep_buffer_minutes_snapshot),
        blocked_ends_at = new.ends_at + make_interval(mins => new.cleanup_buffer_minutes_snapshot),
        type = target_type, status = target_status,
        expires_at = case when target_status = 'held' then expires_at else null end,
        released_at = case when target_status = 'released' then clock_timestamp() else null end,
        updated_at = clock_timestamp()
    where id = current_reservation.id;
  else
    insert into public.booking_reservations (
      booking_id, service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at,
      type, status, released_at
    ) values (
      new.id, new.service_id, new.resource_id, new.starts_at, new.ends_at,
      new.starts_at - make_interval(mins => new.prep_buffer_minutes_snapshot),
      new.ends_at + make_interval(mins => new.cleanup_buffer_minutes_snapshot),
      target_type, target_status, case when target_status = 'released' then clock_timestamp() else null end
    );
  end if;
  return new;
exception when exclusion_violation then
  if sqlerrm in (
    'booking schedule is unavailable',
    'reservation hold is expired, owned by another request, or does not match the booking',
    'linked reservation hold expired before booking activation',
    'linked reservation hold expired before booking confirmation'
  ) then
    raise;
  end if;
  raise exception 'booking schedule conflicts with an existing reservation' using errcode = '23P01';
end;
$$;

create or replace function public.protect_booking_blackout()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.resource_id::text, 0));
  if new.active and exists (
    select 1 from public.booking_reservations r
    where r.resource_id = new.resource_id
      and (r.status = 'booked' or (r.status = 'held' and r.expires_at > clock_timestamp()))
      and r.blocked_range && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'blackout conflicts with an existing reservation' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger protect_booking_blackout
before insert or update of resource_id, starts_at, ends_at, active
on public.booking_resource_blackouts for each row execute function public.protect_booking_blackout();

create trigger sync_booking_reservation
before insert or update of service_id, service_date, service_time, starts_at, resource_id,
  duration_minutes_snapshot, status,
  payment_type, reservation_hold_id, reservation_owner_token_hash
on public.bookings for each row execute function public.sync_booking_reservation();

create or replace function public.audit_booking_schedule_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_schedule_history (booking_id, old_schedule, new_schedule, actor_user_id, reason)
    values (
      new.id, '{}'::jsonb,
      jsonb_build_object(
        'resource_id', new.resource_id, 'starts_at', new.starts_at, 'ends_at', new.ends_at,
        'timezone', new.timezone, 'service_date', new.service_date, 'service_time', new.service_time
      ),
      coalesce(nullif(current_setting('app.booking_schedule_actor', true), '')::uuid, auth.uid()),
      nullif(current_setting('app.booking_schedule_reason', true), '')
    );
  elsif old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at or old.resource_id is distinct from new.resource_id then
    insert into public.booking_schedule_history (booking_id, old_schedule, new_schedule, actor_user_id, reason)
    values (
      new.id,
      jsonb_build_object(
        'resource_id', old.resource_id, 'starts_at', old.starts_at, 'ends_at', old.ends_at,
        'timezone', old.timezone, 'service_date', old.service_date, 'service_time', old.service_time
      ),
      jsonb_build_object(
        'resource_id', new.resource_id, 'starts_at', new.starts_at, 'ends_at', new.ends_at,
        'timezone', new.timezone, 'service_date', new.service_date, 'service_time', new.service_time
      ),
      coalesce(nullif(current_setting('app.booking_schedule_actor', true), '')::uuid, auth.uid()),
      nullif(current_setting('app.booking_schedule_reason', true), '')
    );
  end if;
  return new;
end;
$$;

create trigger audit_booking_schedule_change
after insert or update of service_id, service_date, service_time, starts_at, resource_id
on public.bookings for each row execute function public.audit_booking_schedule_change();

create or replace function public.link_booking_hold(
  requested_booking_id uuid,
  requested_reservation_id uuid,
  requested_owner_token_hash text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.bookings%rowtype;
begin
  if not exists (
    select 1 from public.booking_reservations where id = requested_reservation_id
      and status = 'held' and expires_at > clock_timestamp()
      and owner_token_hash = requested_owner_token_hash for update
  ) then raise exception 'active owned hold not found' using errcode = 'P0002'; end if;
  update public.bookings
  set reservation_hold_id = requested_reservation_id,
      reservation_owner_token_hash = requested_owner_token_hash
  where id = requested_booking_id returning * into result;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'booking_id', result.id, 'reservation_id', result.reservation_hold_id,
    'status', result.status, 'starts_at', result.starts_at, 'ends_at', result.ends_at
  );
end;
$$;

create or replace function public.reschedule_booking(
  requested_reference text, requested_date date, requested_time time,
  requested_resource_id uuid, requested_actor_id uuid, requested_reason text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  previous_row public.bookings%rowtype;
  result public.bookings%rowtype;
  actor_name text;
  previous_actor_setting text := current_setting('app.booking_schedule_actor', true);
  previous_reason_setting text := current_setting('app.booking_schedule_reason', true);
begin
  if length(btrim(coalesce(requested_reference, ''))) = 0 or requested_date is null
    or requested_time is null or requested_resource_id is null or requested_actor_id is null
    or length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'invalid booking reschedule request' using errcode = '22023';
  end if;
  select * into previous_row from public.bookings
  where reference = btrim(requested_reference) for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;

  perform set_config('app.booking_schedule_actor', requested_actor_id::text, true);
  perform set_config('app.booking_schedule_reason', btrim(requested_reason), true);
  update public.bookings
  set service_date = requested_date, service_time = requested_time, resource_id = requested_resource_id
  where id = previous_row.id returning * into result;
  perform set_config('app.booking_schedule_actor', coalesce(previous_actor_setting, ''), true);
  perform set_config('app.booking_schedule_reason', coalesce(previous_reason_setting, ''), true);

  select display_name into actor_name from public.staff_profiles where user_id = requested_actor_id;
  insert into public.staff_audit_log
    (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce(actor_name, 'Service actor'), 'Booking rescheduled', 'data',
    'booking', result.id, jsonb_build_object('reason', btrim(requested_reason),
      'old_starts_at', previous_row.starts_at, 'new_starts_at', result.starts_at,
      'old_resource_id', previous_row.resource_id, 'new_resource_id', result.resource_id));
  return result;
end;
$$;

create or replace function public.update_booking_status(
  requested_reference text, requested_status text, requested_actor_id uuid, requested_reason text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  previous_row public.bookings%rowtype;
  result public.bookings%rowtype;
  actor_name text;
begin
  if length(btrim(coalesce(requested_reference, ''))) = 0 or requested_actor_id is null
    or length(btrim(coalesce(requested_reason, ''))) = 0
    or requested_status is null
    or requested_status not in ('inquiry', 'quoted', 'confirmed', 'progress', 'completed', 'cancelled') then
    raise exception 'invalid booking status request' using errcode = '22023';
  end if;
  select * into previous_row from public.bookings
  where reference = btrim(requested_reference) for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;

  update public.bookings
  set status = requested_status,
      cancellation_reason = case when requested_status = 'cancelled' then btrim(requested_reason) else cancellation_reason end,
      cancellation_actor_id = case when requested_status = 'cancelled' then requested_actor_id else cancellation_actor_id end,
      cancelled_at = case when requested_status = 'cancelled' then clock_timestamp() else cancelled_at end
  where id = previous_row.id returning * into result;

  select display_name into actor_name from public.staff_profiles where user_id = requested_actor_id;
  insert into public.staff_audit_log
    (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce(actor_name, 'Service actor'), 'Booking status updated', 'data',
    'booking', result.id, jsonb_build_object('reason', btrim(requested_reason),
      'old_status', previous_row.status, 'new_status', result.status));
  return result;
end;
$$;

create or replace function public.enqueue_provider_webhook_event(
  requested_provider text, requested_event_id text, requested_event_type text,
  requested_fingerprint text, requested_safe_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.provider_webhook_inbox%rowtype;
begin
  if length(btrim(coalesce(requested_provider, ''))) not between 1 and 50
    or length(btrim(coalesce(requested_event_id, ''))) not between 1 and 255
    or length(btrim(coalesce(requested_event_type, ''))) not between 1 and 150
    or length(coalesce(requested_fingerprint, '')) not between 32 and 128
    or jsonb_typeof(coalesce(requested_safe_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid provider webhook event' using errcode = '22023';
  end if;
  insert into public.provider_webhook_inbox
    (provider, event_id, event_type, request_fingerprint, safe_payload)
  values (lower(btrim(requested_provider)), btrim(requested_event_id), btrim(requested_event_type),
    requested_fingerprint, coalesce(requested_safe_payload, '{}'::jsonb))
  on conflict (provider, event_id) do nothing;
  select * into result from public.provider_webhook_inbox
  where provider = lower(btrim(requested_provider)) and event_id = btrim(requested_event_id) for update;
  if result.request_fingerprint <> requested_fingerprint then
    raise exception 'provider event id was reused with different content' using errcode = '22023';
  end if;
  return jsonb_build_object('id', result.id, 'provider', result.provider, 'event_id', result.event_id,
    'event_type', result.event_type, 'status', result.status, 'attempts', result.attempts,
    'next_attempt_at', result.next_attempt_at, 'received_at', result.received_at);
end;
$$;

create or replace function public.finish_provider_webhook_event(
  requested_provider text, requested_event_id text, requested_succeeded boolean,
  requested_last_error text default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.provider_webhook_inbox%rowtype;
begin
  if requested_succeeded is null then
    raise exception 'invalid provider webhook completion' using errcode = '22023';
  end if;
  select * into result from public.provider_webhook_inbox
  where provider = lower(btrim(requested_provider)) and event_id = btrim(requested_event_id) for update;
  if not found then raise exception 'provider webhook event not found' using errcode = 'P0002'; end if;
  if result.status = 'processed' and requested_succeeded then
    return jsonb_build_object('id', result.id, 'status', result.status, 'attempts', result.attempts,
      'processed_at', result.processed_at);
  end if;
  update public.provider_webhook_inbox
  set status = case when requested_succeeded then 'processed' else 'failed' end,
      attempts = attempts + 1,
      processed_at = case when requested_succeeded then clock_timestamp() else null end,
      next_attempt_at = case when requested_succeeded then next_attempt_at
        else clock_timestamp() + least(interval '1 hour', interval '1 minute' * power(2, least(attempts + 1, 6))) end,
      last_error = case when requested_succeeded then null else left(coalesce(requested_last_error, 'processing failed'), 2000) end,
      updated_at = clock_timestamp()
  where id = result.id returning * into result;
  return jsonb_build_object('id', result.id, 'status', result.status, 'attempts', result.attempts,
    'next_attempt_at', result.next_attempt_at, 'processed_at', result.processed_at);
end;
$$;

create or replace function public.extend_booking_hold_for_checkout(
  requested_booking_id uuid, requested_expires_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  reservation public.booking_reservations%rowtype;
  server_time timestamptz := clock_timestamp();
  maximum_expiry timestamptz;
begin
  select r.* into reservation from public.booking_reservations r
  where r.booking_id = requested_booking_id for update;
  if not found or reservation.status <> 'held' or reservation.expires_at <= server_time then
    raise exception 'active linked hold not found' using errcode = '22023';
  end if;
  maximum_expiry := reservation.created_at + interval '30 minutes';
  if requested_expires_at is null or requested_expires_at <= reservation.expires_at
    or requested_expires_at > maximum_expiry then
    raise exception 'checkout hold extension is outside the allowed window' using errcode = '22023';
  end if;
  update public.booking_reservations
  set expires_at = requested_expires_at, updated_at = server_time
  where id = reservation.id returning * into reservation;
  return jsonb_build_object('booking_id', reservation.booking_id, 'reservation_id', reservation.id,
    'status', reservation.status, 'expires_at', reservation.expires_at,
    'maximum_expires_at', maximum_expiry, 'server_time', server_time);
end;
$$;

create or replace function public.expire_legacy_paymongo_booking(
  requested_checkout_id text, requested_reason text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  previous_row public.bookings%rowtype;
  result public.bookings%rowtype;
  structured_reason text;
begin
  if length(btrim(coalesce(requested_checkout_id, ''))) = 0
    or length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'invalid legacy checkout expiry request' using errcode = '22023';
  end if;
  select * into previous_row from public.bookings
  where paymongo_checkout_session_id = btrim(requested_checkout_id) for update;
  if not found then raise exception 'booking checkout not found' using errcode = 'P0002'; end if;
  if previous_row.status = 'cancelled' then return previous_row; end if;
  if previous_row.status not in ('inquiry', 'quoted')
    or previous_row.payment_status not in ('unpaid', 'pending') then return previous_row; end if;

  structured_reason := 'PayMongo checkout failed or expired: ' || btrim(requested_reason);
  update public.bookings
  set payment_status = 'failed', status = 'cancelled', cancellation_reason = structured_reason,
      cancelled_at = clock_timestamp(), cancellation_actor_id = null
  where id = previous_row.id returning * into result;
  insert into public.staff_audit_log
    (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (null, 'PayMongo webhook', 'Legacy booking checkout expired', 'billing', 'booking', result.id,
    jsonb_build_object('checkout_id', btrim(requested_checkout_id), 'reason', btrim(requested_reason),
      'old_status', previous_row.status, 'new_status', result.status));
  return result;
end;
$$;

create or replace function public.activate_booking_checkout(
  requested_booking_id uuid,
  requested_checkout_session_id text,
  requested_checkout_url text,
  requested_checkout_expires_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare selected_booking public.bookings%rowtype;
declare selected_reservation public.booking_reservations%rowtype;
begin
  if length(btrim(coalesce(requested_checkout_session_id, ''))) > 255
    or length(btrim(coalesce(requested_checkout_url, ''))) not between 1 and 2000
    or requested_checkout_expires_at <= clock_timestamp() then
    raise exception 'invalid checkout reservation' using errcode = '22023';
  end if;

  select * into selected_booking from public.bookings where id = requested_booking_id for update;
  if not found or selected_booking.status not in ('inquiry', 'quoted')
    or selected_booking.payment_status <> 'pending' then
    raise exception 'booking cannot start checkout' using errcode = '22023';
  end if;
  select * into selected_reservation from public.booking_reservations
  where booking_id = selected_booking.id for update;
  if not found or selected_reservation.status <> 'held'
    or selected_reservation.expires_at <= clock_timestamp() then
    raise exception 'booking hold expired before checkout activation' using errcode = '23P01';
  end if;

  update public.bookings set
    paymongo_checkout_session_id = btrim(requested_checkout_session_id),
    paymongo_checkout_url = btrim(requested_checkout_url),
    paymongo_checkout_expires_at = requested_checkout_expires_at,
    checkout_creation_started_at = null,
    updated_at = clock_timestamp()
  where id = selected_booking.id;
  update public.booking_reservations set
    type = 'booking', status = 'booked', expires_at = requested_checkout_expires_at,
    updated_at = clock_timestamp()
  where id = selected_reservation.id;

  return jsonb_build_object('booking_id', selected_booking.id,
    'reservation_id', selected_reservation.id, 'expires_at', requested_checkout_expires_at);
end;
$$;

create or replace function public.get_booking_calendar_reservations(
  requested_starts_at timestamptz,
  requested_ends_at timestamptz
)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if requested_ends_at <= requested_starts_at
    or requested_ends_at - requested_starts_at > interval '370 days' then
    raise exception 'invalid calendar range' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(item order by item->>'starts_at') from (
      select jsonb_build_object(
        'id', r.id, 'kind', 'hold', 'starts_at', r.starts_at, 'ends_at', r.ends_at,
        'blocked_starts_at', r.blocked_starts_at, 'blocked_ends_at', r.blocked_ends_at,
        'expires_at', r.expires_at, 'resource_name', resource.name
      ) item
      from public.booking_reservations r
      join public.booking_resources resource on resource.id = r.resource_id
      where r.booking_id is null and r.status = 'held' and r.expires_at > clock_timestamp()
        and r.blocked_range && tstzrange(requested_starts_at, requested_ends_at, '[)')
      union all
      select jsonb_build_object(
        'id', blackout.id, 'kind', 'blackout', 'starts_at', blackout.starts_at,
        'ends_at', blackout.ends_at, 'blocked_starts_at', blackout.starts_at,
        'blocked_ends_at', blackout.ends_at, 'expires_at', null,
        'resource_name', resource.name, 'reason', blackout.reason
      ) item
      from public.booking_resource_blackouts blackout
      join public.booking_resources resource on resource.id = blackout.resource_id
      where blackout.active
        and blackout.blocked_range && tstzrange(requested_starts_at, requested_ends_at, '[)')
    ) calendar_items
  ), '[]'::jsonb);
end;
$$;

create or replace function public.loyalty_create_reward_booking_with_hold(
  requested_client_id uuid,
  requested_profile_id uuid,
  requested_reward_id uuid,
  requested_idempotency_key text,
  requested_reference text,
  requested_date date,
  requested_time time,
  requested_location text,
  requested_reservation_id uuid,
  requested_owner_token_hash text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  reward public.loyalty_rewards%rowtype;
  service_name text;
  result public.bookings%rowtype;
  existing public.bookings%rowtype;
  intent_fingerprint text;
begin
  if requested_client_id is null or requested_profile_id is null or requested_reward_id is null
    or requested_reservation_id is null or requested_date is null or requested_time is null
    or requested_date < (clock_timestamp() at time zone 'Asia/Manila')::date
    or length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
    or length(btrim(coalesce(requested_reference, ''))) not between 1 and 64
    or length(btrim(coalesce(requested_location, ''))) not between 1 and 500
    or length(coalesce(requested_owner_token_hash, '')) not between 32 and 128 then
    raise exception 'invalid reward booking details' using errcode = '22023';
  end if;

  intent_fingerprint := encode(sha256(concat_ws('|',
    requested_client_id::text, requested_profile_id::text, requested_reward_id::text,
    btrim(requested_idempotency_key), btrim(requested_reference), requested_date::text,
    requested_time::text, btrim(requested_location), requested_reservation_id::text,
    requested_owner_token_hash
  )::bytea), 'hex');

  perform pg_advisory_xact_lock(hashtextextended('loyalty-hold:' || btrim(requested_idempotency_key), 0));
  select * into existing from public.bookings
  where idempotency_key = btrim(requested_idempotency_key) for update;
  if found then
    if existing.request_fingerprint <> intent_fingerprint
      or existing.reward_id is distinct from requested_reward_id
      or existing.reservation_hold_id is distinct from requested_reservation_id then
      raise exception 'reward booking idempotency conflict' using errcode = '23505';
    end if;
    return existing;
  end if;

  perform 1 from public.client_profiles
  where id = requested_profile_id and client_id = requested_client_id and status = 'active'
  for share;
  if not found then raise exception 'customer profile not found' using errcode = 'P0002'; end if;

  select * into reward from public.loyalty_rewards
  where id = requested_reward_id and client_id = requested_client_id for update;
  if not found or reward.status <> 'available' or reward.review_required then
    raise exception 'reward is not available' using errcode = '22023';
  end if;
  select name into service_name from public.services
  where id = reward.service_id and code = 'complimentary-solo-session' and active;
  if service_name is null then raise exception 'reward service is unavailable' using errcode = '22023'; end if;

  insert into public.bookings (
    client_id, client_profile_id, idempotency_key, reference, service_type, service_id,
    service_date, service_time, location, payment_type, subtotal_amount_php,
    total_amount_php, paid_amount_php, status, payment_status, kind, reward_id,
    request_fingerprint, reservation_hold_id, reservation_owner_token_hash
  ) values (
    requested_client_id, requested_profile_id, btrim(requested_idempotency_key), btrim(requested_reference),
    service_name, reward.service_id, requested_date, requested_time, btrim(requested_location),
    'loyalty_reward', 0, 0, 0, 'inquiry', 'paid', 'reward', reward.id,
    intent_fingerprint, requested_reservation_id, requested_owner_token_hash
  ) returning * into result;

  update public.loyalty_rewards
  set status = 'reserved', reserved_at = clock_timestamp(), updated_at = clock_timestamp()
  where id = reward.id;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (null, 'reward.customer_reserved', 'reward', reward.id,
    'Customer created an eligible reward booking.', to_jsonb(reward),
    to_jsonb(reward) || jsonb_build_object('status', 'reserved', 'booking_id', result.id));
  return result;
end;
$$;

create or replace function public.create_linked_booking_pair(
  requested_studio jsonb,
  requested_event jsonb
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  studio public.bookings%rowtype;
  event_booking public.bookings%rowtype;
  studio_key text := btrim(requested_studio->>'idempotency_key');
  event_key text := btrim(requested_event->>'idempotency_key');
  studio_service_duration integer;
  event_service_duration integer;
begin
  if requested_studio is null or requested_event is null
    or jsonb_typeof(requested_studio) <> 'object' or jsonb_typeof(requested_event) <> 'object'
    or length(studio_key) not between 8 and 200 or length(event_key) not between 8 and 200
    or studio_key = event_key
    or length(coalesce(requested_studio->>'request_fingerprint', '')) <> 64
    or length(coalesce(requested_event->>'request_fingerprint', '')) <> 64
    or length(btrim(coalesce(requested_studio->>'reference', ''))) not between 1 and 64
    or length(btrim(coalesce(requested_event->>'reference', ''))) not between 1 and 64
    or length(btrim(coalesce(requested_studio->>'service_type', ''))) not between 1 and 120
    or length(btrim(coalesce(requested_event->>'service_type', ''))) not between 1 and 120
    or length(btrim(coalesce(requested_studio->>'location', ''))) not between 1 and 500
    or length(btrim(coalesce(requested_event->>'location', ''))) not between 1 and 500
    or length(btrim(coalesce(requested_studio->>'payment_type', ''))) not between 1 and 50
    or length(btrim(coalesce(requested_event->>'payment_type', ''))) not between 1 and 50
    or coalesce(requested_studio->>'client_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_event->>'client_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_studio->>'client_profile_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_event->>'client_profile_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_studio->>'service_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_event->>'service_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(requested_studio->>'service_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(requested_event->>'service_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(requested_studio->>'service_time', '') !~ '^\d{2}:\d{2}(:\d{2})?$'
    or coalesce(requested_event->>'service_time', '') !~ '^\d{2}:\d{2}(:\d{2})?$'
    or coalesce(requested_studio->>'subtotal_amount_php', '') !~ '^\d+$'
    or coalesce(requested_event->>'subtotal_amount_php', '') !~ '^\d+$'
    or coalesce(requested_studio->>'total_amount_php', '') !~ '^\d+$'
    or coalesce(requested_event->>'total_amount_php', '') !~ '^\d+$'
    or coalesce(requested_studio->>'duration_minutes_snapshot', '') !~ '^\d+$'
    or coalesce(requested_event->>'duration_minutes_snapshot', '') !~ '^\d+$' then
    raise exception 'invalid linked booking request' using errcode = '22023';
  end if;

  select duration_minutes into studio_service_duration from public.services
  where id = (requested_studio->>'service_id')::uuid and active;
  select duration_minutes into event_service_duration from public.services
  where id = (requested_event->>'service_id')::uuid and active;
  if studio_service_duration is null or event_service_duration is null
    or (requested_studio->>'duration_minutes_snapshot')::integer < studio_service_duration
    or (requested_studio->>'duration_minutes_snapshot')::integer > studio_service_duration + 480
    or (requested_event->>'duration_minutes_snapshot')::integer < event_service_duration
    or (requested_event->>'duration_minutes_snapshot')::integer > event_service_duration + 480 then
    raise exception 'invalid linked booking duration' using errcode = '22023';
  end if;

  -- Serialize exact and competing retries before checking whether either side exists.
  perform pg_advisory_xact_lock(hashtextextended(least(studio_key, event_key) || ':' || greatest(studio_key, event_key), 0));
  select * into studio from public.bookings where idempotency_key = studio_key for update;
  select * into event_booking from public.bookings where idempotency_key = event_key for update;
  if studio.id is not null or event_booking.id is not null then
    if studio.id is null or event_booking.id is null
      or studio.request_fingerprint <> requested_studio->>'request_fingerprint'
      or event_booking.request_fingerprint <> requested_event->>'request_fingerprint'
      or studio.duration_minutes_snapshot <> (requested_studio->>'duration_minutes_snapshot')::integer
      or event_booking.duration_minutes_snapshot <> (requested_event->>'duration_minutes_snapshot')::integer
      or studio.linked_booking_id is distinct from event_booking.id
      or event_booking.linked_booking_id is distinct from studio.id then
      raise exception 'linked booking idempotency conflict' using errcode = '23505';
    end if;
    return jsonb_build_object('studio_id', studio.id, 'studio_reference', studio.reference,
      'event_id', event_booking.id, 'event_reference', event_booking.reference, 'idempotent_replay', true);
  end if;

  insert into public.bookings (
    client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
    service_type, service_id, service_date, service_time, location, payment_type,
    subtotal_amount_php, total_amount_php, payment_status, duration_minutes_snapshot
  ) values (
    (requested_studio->>'client_id')::uuid, (requested_studio->>'client_profile_id')::uuid,
    studio_key, requested_studio->>'request_fingerprint', btrim(requested_studio->>'reference'),
    requested_studio->>'service_type', (requested_studio->>'service_id')::uuid,
    (requested_studio->>'service_date')::date, (requested_studio->>'service_time')::time,
    requested_studio->>'location', requested_studio->>'payment_type',
    (requested_studio->>'subtotal_amount_php')::integer, (requested_studio->>'total_amount_php')::integer,
    'pending', (requested_studio->>'duration_minutes_snapshot')::integer
  ) returning * into studio;
  insert into public.bookings (
    client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
    service_type, service_id, service_date, service_time, location, payment_type,
    subtotal_amount_php, total_amount_php, payment_status, duration_minutes_snapshot
  ) values (
    (requested_event->>'client_id')::uuid, (requested_event->>'client_profile_id')::uuid,
    event_key, requested_event->>'request_fingerprint', btrim(requested_event->>'reference'),
    requested_event->>'service_type', (requested_event->>'service_id')::uuid,
    (requested_event->>'service_date')::date, (requested_event->>'service_time')::time,
    requested_event->>'location', requested_event->>'payment_type',
    (requested_event->>'subtotal_amount_php')::integer, (requested_event->>'total_amount_php')::integer,
    'pending', (requested_event->>'duration_minutes_snapshot')::integer
  ) returning * into event_booking;
  update public.bookings set linked_booking_id = event_booking.id where id = studio.id;
  update public.bookings set linked_booking_id = studio.id where id = event_booking.id;
  return jsonb_build_object('studio_id', studio.id, 'studio_reference', studio.reference,
    'event_id', event_booking.id, 'event_reference', event_booking.reference, 'idempotent_replay', false);
end;
$$;

/* Booked reservations are released only by a definitive provider failure or expiry event, never by an application timer. */
create or replace function public.release_failed_booking_checkout(
  requested_booking_id uuid,
  requested_checkout_session_id text,
  requested_payment_status text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare selected_booking public.bookings%rowtype;
declare selected_reservation public.booking_reservations%rowtype;
begin
  if requested_payment_status not in ('failed', 'expired') then
    raise exception 'invalid checkout failure status' using errcode = '22023';
  end if;
  select * into selected_booking from public.bookings where id = requested_booking_id for update;
  if not found or selected_booking.paymongo_checkout_session_id is distinct from requested_checkout_session_id then
    raise exception 'checkout does not match booking' using errcode = 'P0002';
  end if;
  if selected_booking.payment_status in ('paid', 'partially_paid') or selected_booking.status in ('confirmed', 'progress', 'completed') then
    return jsonb_build_object('booking_id', selected_booking.id, 'released', false);
  end if;
  update public.bookings set payment_status = 'failed', updated_at = clock_timestamp()
  where id = selected_booking.id;
  select * into selected_reservation from public.booking_reservations
  where booking_id = selected_booking.id for update;
  if found and selected_reservation.status in ('held', 'booked') then
    update public.booking_reservations set status = case when requested_payment_status = 'expired' then 'expired' else 'released' end,
      released_at = clock_timestamp(), updated_at = clock_timestamp()
    where id = selected_reservation.id;
  end if;
  return jsonb_build_object('booking_id', selected_booking.id, 'released', true);
end;
$$;

alter table public.booking_resources enable row level security;
alter table public.booking_resource_weekly_hours enable row level security;
alter table public.booking_resource_blackouts enable row level security;
alter table public.booking_schedule_history enable row level security;
alter table public.booking_reservation_events enable row level security;
alter table public.provider_webhook_inbox enable row level security;

create policy booking_resources_staff_read on public.booking_resources
for select to authenticated using (public.loyalty_is_staff('bookings'));
create policy booking_hours_staff_read on public.booking_resource_weekly_hours
for select to authenticated using (public.loyalty_is_staff('bookings'));
create policy booking_blackouts_staff_read on public.booking_resource_blackouts
for select to authenticated using (public.loyalty_is_staff('bookings'));
create policy booking_reservations_staff_read on public.booking_reservations
for select to authenticated using (public.loyalty_is_staff('bookings'));
create policy booking_schedule_history_staff_read on public.booking_schedule_history
for select to authenticated using (public.loyalty_is_staff('bookings'));
create policy booking_reservation_events_staff_read on public.booking_reservation_events
for select to authenticated using (public.loyalty_is_staff('bookings'));

revoke all on table public.booking_resources, public.booking_resource_weekly_hours,
  public.booking_resource_blackouts, public.booking_reservations,
  public.booking_schedule_history, public.booking_reservation_events, public.provider_webhook_inbox
  from public, anon, authenticated, service_role;
grant select on table public.booking_resources, public.booking_resource_weekly_hours,
  public.booking_resource_blackouts, public.booking_reservations,
  public.booking_schedule_history, public.booking_reservation_events to authenticated;

revoke all on function public.prevent_booking_reservation_audit_mutation(),
  public.audit_booking_reservation_change(), public.sync_booking_reservation(),
  public.audit_booking_schedule_change(), public.protect_booking_blackout(),
  public.expire_booking_holds(integer),
  public.get_booking_availability(uuid,date,uuid,integer),
  public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer),
  public.release_booking_hold(uuid,text), public.link_booking_hold(uuid,uuid,text),
  public.activate_booking_checkout(uuid,text,text,timestamptz),
  public.release_failed_booking_checkout(uuid,text,text),
  public.get_booking_calendar_reservations(timestamptz,timestamptz),
  public.loyalty_create_reward_booking_with_hold(uuid,uuid,uuid,text,text,date,time,text,uuid,text),
  public.create_linked_booking_pair(jsonb,jsonb),
  public.reschedule_booking(text,date,time,uuid,uuid,text),
  public.update_booking_status(text,text,uuid,text),
  public.extend_booking_hold_for_checkout(uuid,timestamptz),
  public.expire_legacy_paymongo_booking(text,text),
  public.enqueue_provider_webhook_event(text,text,text,text,jsonb),
  public.finish_provider_webhook_event(text,text,boolean,text)
  from public, anon, authenticated, service_role;

grant execute on function public.get_booking_availability(uuid,date,uuid,integer)
  to anon, authenticated, service_role;
grant execute on function public.expire_booking_holds(integer),
  public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer),
  public.release_booking_hold(uuid,text), public.link_booking_hold(uuid,uuid,text),
  public.activate_booking_checkout(uuid,text,text,timestamptz),
  public.release_failed_booking_checkout(uuid,text,text),
  public.get_booking_calendar_reservations(timestamptz,timestamptz),
  public.loyalty_create_reward_booking_with_hold(uuid,uuid,uuid,text,text,date,time,text,uuid,text),
  public.create_linked_booking_pair(jsonb,jsonb),
  public.reschedule_booking(text,date,time,uuid,uuid,text),
  public.update_booking_status(text,text,uuid,text),
  public.extend_booking_hold_for_checkout(uuid,timestamptz),
  public.expire_legacy_paymongo_booking(text,text),
  public.enqueue_provider_webhook_event(text,text,text,text,jsonb),
  public.finish_provider_webhook_event(text,text,boolean,text)
  to service_role;

comment on function public.get_booking_availability(uuid,date,uuid,integer) is
  'Public safe availability JSON. Returns resource identity and slots but no booking, customer, hold owner, or idempotency data.';
comment on function public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer) is
  'Service-only idempotent hold acquisition. Expired holds are explicitly transitioned before the GiST exclusion constraint arbitrates concurrency.';
comment on column public.bookings.reservation_owner_token_hash is
  'Write-only ownership proof consumed and cleared by sync_booking_reservation; never persisted on a booking row.';
