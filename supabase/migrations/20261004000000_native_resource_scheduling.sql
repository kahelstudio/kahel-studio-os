-- Phase 4B: native multi-resource scheduling (studio, photographers, videographers, equipment, rentals).
--
-- Additive and backward compatible:
--   * Services WITHOUT resource requirements behave exactly as before (one default resource; the legacy code paths
--     are preserved verbatim).
--   * Services WITH requirements reserve every required resource atomically. The first requirement ("anchor") is the
--     booking's resource_id and owns the canonical reservation row; every additional required resource gets a
--     *component* reservation row (parent_reservation_id → anchor) in the same table, so the existing GiST exclusion
--     constraint protects all of them. Component rows mirror their anchor's lifecycle through a trigger, so every
--     existing function that moves/expires/releases/activates the anchor keeps working unchanged.
--   * Resource locks are always taken in ascending resource-id order (no lock-order deadlocks).
-- No existing booking, hold, reference or reservation is modified by this migration.

-- ── 1. resource types (lookup table instead of a hard-coded check) ─────────────────────────────────────────────────
create table public.booking_resource_types (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$' and length(code) <= 50),
  name text not null check (length(btrim(name)) between 1 and 100),
  is_person boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
insert into public.booking_resource_types (code, name, is_person, sort_order) values
  ('space', 'Studio / space', false, 10),          -- legacy type, used by Main Studio (= STUDIO)
  ('team', 'Team', true, 20),                      -- legacy type, used by Event Team
  ('photographer', 'Photographer', true, 30),
  ('videographer', 'Videographer', true, 40),
  ('drone_operator', 'Drone operator', true, 50),
  ('camera', 'Camera', false, 60),
  ('equipment', 'Equipment', false, 70),
  ('rental_item', 'Rental item', false, 80);
comment on table public.booking_resource_types is
  'Bookable resource types. New types are rows, not schema changes. ''space'' is the STUDIO type (legacy code kept).';

alter table public.booking_resources drop constraint booking_resources_type_check;
alter table public.booking_resources
  add constraint booking_resources_type_fkey foreign key (type) references public.booking_resource_types(code) on delete restrict,
  add column staff_user_id uuid references public.staff_profiles(user_id) on delete set null,
  add column public_selectable boolean not null default false,
  add column sort_order integer not null default 100;
create unique index booking_resources_staff_type_key on public.booking_resources (staff_user_id, type) where staff_user_id is not null;
create index booking_resources_type_idx on public.booking_resources (type, sort_order, code) where active;
comment on column public.booking_resources.staff_user_id is 'Optional link to the staff member this resource represents (no staff data is copied).';
comment on column public.booking_resources.public_selectable is 'Customers may choose this resource by name when a service requirement allows selection.';

-- ── 2. service resource requirements ───────────────────────────────────────────────────────────────────────────────
create table public.service_resource_requirements (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  selection_mode text not null check (selection_mode in ('fixed', 'any_available')),
  resource_id uuid references public.booking_resources(id) on delete restrict,
  resource_type text references public.booking_resource_types(code) on delete restrict,
  customer_selectable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, position),
  check (
    (selection_mode = 'fixed' and resource_id is not null and resource_type is null and not customer_selectable)
    or (selection_mode = 'any_available' and resource_id is null and resource_type is not null)
  )
);
comment on table public.service_resource_requirements is
  'Resources a service needs. Position 1 is the anchor (becomes bookings.resource_id). FIXED = a specific resource; '
  'ANY_AVAILABLE = one resource of a type (deterministic assignment); customer_selectable = USER SELECTED allowed. '
  'Services without rows keep the legacy single default_resource_id behaviour.';

-- ── 3. component reservations + leave/manual-block metadata ────────────────────────────────────────────────────────
alter table public.booking_reservations
  add column parent_reservation_id uuid references public.booking_reservations(id) on delete restrict,
  add column requirement_position smallint check (requirement_position is null or requirement_position between 1 and 20),
  add column selection_locked boolean not null default false,
  add constraint booking_reservations_component_check check (parent_reservation_id is null or booking_id is null);
create index booking_reservations_parent_idx on public.booking_reservations (parent_reservation_id) where parent_reservation_id is not null;
comment on column public.booking_reservations.parent_reservation_id is
  'Component reservation of a multi-resource booking/hold; mirrors the anchor (parent) lifecycle.';
comment on column public.booking_reservations.selection_locked is
  'Resource was explicitly chosen (customer/staff); rescheduling never swaps it automatically.';

alter table public.booking_resource_blackouts
  add column kind text not null default 'manual' check (kind in ('manual', 'leave', 'closure', 'maintenance')),
  add column external_source text check (external_source is null or length(btrim(external_source)) between 1 and 50),
  add column external_ref text check (external_ref is null or length(btrim(external_ref)) between 1 and 200);
create unique index booking_resource_blackouts_external_key
  on public.booking_resource_blackouts (external_source, external_ref) where external_source is not null;
comment on column public.booking_resource_blackouts.external_ref is
  'Idempotency key for projected blocks, e.g. external_source=orangehrm, external_ref=<leave request id> (STAFF_LEAVE_APPROVED).';

-- ── 4. availability primitives ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.booking_resource_unavailable_reason(
  requested_resource_id uuid, requested_starts_at timestamptz, requested_ends_at timestamptz,
  requested_blocked_start timestamptz, requested_blocked_end timestamptz, requested_ignore_family uuid default null
)
returns text language plpgsql stable security definer set search_path = '' as $$
declare selected_resource public.booking_resources%rowtype; local_date date; blackout_kind text;
begin
  select * into selected_resource from public.booking_resources where id = requested_resource_id;
  if not found or not selected_resource.active then return 'inactive'; end if;
  local_date := (requested_starts_at at time zone selected_resource.timezone)::date;
  if (requested_ends_at at time zone selected_resource.timezone)::date <> local_date
    or not exists (
      select 1 from public.booking_resource_weekly_hours hours
      where hours.resource_id = selected_resource.id and hours.active
        and hours.iso_day_of_week = extract(isodow from local_date)::smallint
        and (requested_starts_at at time zone selected_resource.timezone)::time >= hours.opens_at
        and (requested_ends_at at time zone selected_resource.timezone)::time <= hours.closes_at
    ) then
    return 'outside_hours';
  end if;
  select blackout.kind into blackout_kind from public.booking_resource_blackouts blackout
  where blackout.resource_id = selected_resource.id and blackout.active
    and blackout.blocked_range && tstzrange(requested_blocked_start, requested_blocked_end, '[)')
  limit 1;
  if found then return case when blackout_kind = 'leave' then 'leave' else 'blocked' end; end if;
  if exists (
    select 1 from public.booking_reservations r
    where r.resource_id = selected_resource.id
      and (r.status = 'booked' or (r.status = 'held' and r.expires_at > clock_timestamp()))
      and r.blocked_range && tstzrange(requested_blocked_start, requested_blocked_end, '[)')
      and (requested_ignore_family is null
        or (r.id <> requested_ignore_family and r.parent_reservation_id is distinct from requested_ignore_family))
  ) then
    return 'reserved';
  end if;
  return null;
end;
$$;

-- Deterministic resolution of every requirement (position order; ANY_AVAILABLE picks the first free resource by
-- sort_order, code). Rows with resource_id NULL are unsatisfied, with the reason of the last candidate examined.
create or replace function public.resolve_service_resources(
  requested_service_id uuid, requested_starts_at timestamptz, requested_ends_at timestamptz,
  requested_blocked_start timestamptz, requested_blocked_end timestamptz,
  requested_selections jsonb default null, requested_ignore_family uuid default null
)
returns table (requirement_position smallint, resolved_resource_id uuid, selection_mode text, explicitly_selected boolean, unavailable_reason text)
language plpgsql stable security definer set search_path = '' as $$
declare
  requirement public.service_resource_requirements%rowtype;
  chosen uuid[] := array[]::uuid[];
  candidate record;
  reason text;
  selected_id uuid;
begin
  for requirement in select * from public.service_resource_requirements where service_id = requested_service_id order by position loop
    requirement_position := requirement.position; selection_mode := requirement.selection_mode;
    resolved_resource_id := null; unavailable_reason := null; explicitly_selected := false;
    selected_id := nullif(requested_selections ->> requirement.position::text, '')::uuid;
    if requirement.selection_mode = 'fixed' then
      reason := case when requirement.resource_id = any(chosen) then 'duplicate' else public.booking_resource_unavailable_reason(
        requirement.resource_id, requested_starts_at, requested_ends_at, requested_blocked_start, requested_blocked_end, requested_ignore_family) end;
      if reason is null then resolved_resource_id := requirement.resource_id; else unavailable_reason := reason; end if;
    elsif selected_id is not null then
      explicitly_selected := true;
      if not exists (select 1 from public.booking_resources where id = selected_id and type = requirement.resource_type and active) then
        unavailable_reason := 'invalid_selection';
      else
        reason := case when selected_id = any(chosen) then 'duplicate' else public.booking_resource_unavailable_reason(
          selected_id, requested_starts_at, requested_ends_at, requested_blocked_start, requested_blocked_end, requested_ignore_family) end;
        if reason is null then resolved_resource_id := selected_id; else unavailable_reason := reason; end if;
      end if;
    else
      unavailable_reason := 'no_' || requirement.resource_type;
      for candidate in select id from public.booking_resources
        where type = requirement.resource_type and active and not (id = any(chosen)) order by sort_order, code loop
        reason := public.booking_resource_unavailable_reason(
          candidate.id, requested_starts_at, requested_ends_at, requested_blocked_start, requested_blocked_end, requested_ignore_family);
        if reason is null then resolved_resource_id := candidate.id; unavailable_reason := null; exit; end if;
        if unavailable_reason like 'no\_%' or reason <> 'outside_hours' then unavailable_reason := reason; end if;
      end loop;
    end if;
    if resolved_resource_id is not null then chosen := chosen || resolved_resource_id; end if;
    return next;
  end loop;
end;
$$;

-- All resources that could serve the service (fixed + every active resource of each required type), sorted —
-- the deterministic lock set for multi-resource acquisition.
create or replace function public.service_resource_lock_set(requested_service_id uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct id order by id), array[]::uuid[]) from (
    select r.resource_id as id from public.service_resource_requirements r where r.service_id = requested_service_id and r.selection_mode = 'fixed'
    union
    select b.id from public.service_resource_requirements r join public.booking_resources b on b.type = r.resource_type and b.active
    where r.service_id = requested_service_id and r.selection_mode = 'any_available'
  ) ids;
$$;

create or replace function public.lock_booking_resources(requested_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare resource_id uuid;
begin
  foreach resource_id in array (select coalesce(array_agg(distinct id order by id), array[]::uuid[]) from unnest(requested_ids) id) loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(resource_id::text, 0));
  end loop;
end;
$$;

create or replace function public.service_has_resource_requirements(requested_service_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.service_resource_requirements where service_id = requested_service_id);
$$;

-- Is this resource a valid anchor (requirement position 1) for the service?
create or replace function public.service_allows_anchor_resource(requested_service_id uuid, requested_resource_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.service_resource_requirements r
    left join public.booking_resources b on b.id = requested_resource_id
    where r.service_id = requested_service_id and r.position = (select min(position) from public.service_resource_requirements where service_id = requested_service_id)
      and ((r.selection_mode = 'fixed' and r.resource_id = requested_resource_id)
        or (r.selection_mode = 'any_available' and b.type = r.resource_type and b.active))
  );
$$;

-- ── 5. availability that answers "is the SERVICE bookable", not "is a clock time open" ────────────────────────────
create or replace function public.get_service_availability(
  requested_service_id uuid, requested_date date, requested_duration_minutes integer default null,
  requested_selections jsonb default null, requested_include_internal boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_service public.services%rowtype;
  anchor_resource public.booking_resources%rowtype;
  server_time timestamptz := clock_timestamp();
  effective_duration integer;
  slot_interval integer;
  candidate record;
  slots jsonb := '[]'::jsonb;
  requirements jsonb;
  resolution record;
  available boolean;
  reason text;
  assignments jsonb;
  options jsonb;
  in_hours boolean;
begin
  select * into selected_service from public.services where id = requested_service_id and active;
  if not found then raise exception 'service unavailable' using errcode = 'P0002'; end if;
  if not public.service_has_resource_requirements(selected_service.id) then
    return public.get_booking_availability(requested_service_id, requested_date, null, requested_duration_minutes)
      || jsonb_build_object('requirements', '[]'::jsonb);
  end if;
  effective_duration := coalesce(requested_duration_minutes, selected_service.duration_minutes);
  if effective_duration < selected_service.duration_minutes or effective_duration > selected_service.duration_minutes + 480 then
    raise exception 'invalid requested duration' using errcode = '22023';
  end if;
  slot_interval := case when lower(selected_service.code) in ('mini', 'mini-session') or lower(selected_service.name) = 'mini session' then 30 else 60 end;
  select * into anchor_resource from public.booking_resources where id = selected_service.default_resource_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'position', r.position, 'mode', r.selection_mode, 'type', coalesce(r.resource_type, fixed.type),
    'type_name', t.name, 'customer_selectable', r.customer_selectable,
    'resource', case when r.selection_mode = 'fixed' and (requested_include_internal or fixed.public_selectable or t.code = 'space')
      then jsonb_build_object('id', fixed.id, 'name', fixed.name) else null end
  ) order by r.position), '[]'::jsonb)
  into requirements
  from public.service_resource_requirements r
  left join public.booking_resources fixed on fixed.id = r.resource_id
  join public.booking_resource_types t on t.code = coalesce(r.resource_type, fixed.type)
  where r.service_id = selected_service.id;

  for candidate in
    select local_ts at time zone anchor_resource.timezone as starts_at
    from generate_series(requested_date::timestamp, requested_date::timestamp + interval '1 day' - make_interval(mins => effective_duration),
      make_interval(mins => slot_interval)) local_ts
    where effective_duration < 1440
  loop
    available := true; reason := null; assignments := '[]'::jsonb; options := '[]'::jsonb; in_hours := true;
    for resolution in select * from public.resolve_service_resources(
        selected_service.id, candidate.starts_at, candidate.starts_at + make_interval(mins => effective_duration),
        candidate.starts_at - make_interval(mins => selected_service.prep_buffer_minutes),
        candidate.starts_at + make_interval(mins => effective_duration + selected_service.cleanup_buffer_minutes),
        requested_selections, null) loop
      if resolution.resolved_resource_id is null then
        available := false;
        reason := coalesce(reason, resolution.unavailable_reason);
        if resolution.unavailable_reason in ('outside_hours', 'inactive') then in_hours := false; end if;
      else
        assignments := assignments || jsonb_build_object('position', resolution.requirement_position,
          'resource_id', case when requested_include_internal then resolution.resolved_resource_id end);
      end if;
    end loop;
    continue when not in_hours;  -- only list times that fall inside the required resources' working hours
    if available and candidate.starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes) then
      available := false; reason := 'minimum_notice';
    end if;
    if requested_date > (server_time at time zone anchor_resource.timezone)::date + selected_service.maximum_advance_days then
      available := false; reason := 'maximum_advance';
    end if;
    -- free choices per customer-selectable requirement (public resources only unless internal)
    if available then
      select coalesce(jsonb_agg(jsonb_build_object('position', r.position, 'resources', (
        select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.sort_order, b.code), '[]'::jsonb)
        from public.booking_resources b
        where b.type = r.resource_type and b.active and (requested_include_internal or b.public_selectable)
          and public.booking_resource_unavailable_reason(b.id, candidate.starts_at, candidate.starts_at + make_interval(mins => effective_duration),
            candidate.starts_at - make_interval(mins => selected_service.prep_buffer_minutes),
            candidate.starts_at + make_interval(mins => effective_duration + selected_service.cleanup_buffer_minutes), null) is null
      )) order by r.position), '[]'::jsonb)
      into options
      from public.service_resource_requirements r
      where r.service_id = selected_service.id and r.selection_mode = 'any_available' and (r.customer_selectable or requested_include_internal);
    end if;
    slots := slots || jsonb_build_object(
      'starts_at', candidate.starts_at, 'ends_at', candidate.starts_at + make_interval(mins => effective_duration),
      'available', available, 'unavailable_reason', case when available then null else reason end,
      'options', options, 'assignments', case when requested_include_internal then assignments else null end);
  end loop;

  return jsonb_build_object(
    'service_id', selected_service.id,
    'resource', jsonb_build_object('id', anchor_resource.id, 'code', anchor_resource.code, 'name', anchor_resource.name),
    'date', requested_date, 'timezone', anchor_resource.timezone, 'duration_minutes', effective_duration,
    'prep_buffer_minutes', selected_service.prep_buffer_minutes, 'cleanup_buffer_minutes', selected_service.cleanup_buffer_minutes,
    'server_time', server_time, 'refresh_after_seconds', 30, 'requirements', requirements, 'slots', slots);
end;
$$;

-- ── 6. hold acquisition: legacy path verbatim, multi-resource path all-or-nothing ──────────────────────────────────
create or replace function public.acquire_booking_hold_with_resources(
  requested_service_id uuid,
  requested_starts_at timestamptz,
  requested_idempotency_key text,
  requested_fingerprint text,
  requested_owner_token_hash text,
  requested_resource_id uuid default null,
  requested_hold_minutes integer default null,
  requested_duration_minutes integer default null,
  requested_resource_selections jsonb default null
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
  resolution record;
  anchor_id uuid;
  unresolved text;
  assignments jsonb := '[]'::jsonb;
  selection_key text;
begin
  if length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
    or length(coalesce(requested_fingerprint, '')) not between 32 and 128
    or length(coalesce(requested_owner_token_hash, '')) not between 32 and 128 then
    raise exception 'invalid hold credentials' using errcode = '22023';
  end if;
  if requested_resource_selections is not null and jsonb_typeof(requested_resource_selections) <> 'object' then
    raise exception 'invalid resource selections' using errcode = '22023';
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
      'expires_at', existing.expires_at, 'server_time', server_time, 'idempotent_replay', true,
      'assignments', (select coalesce(jsonb_agg(jsonb_build_object('position', coalesce(c.requirement_position, 1), 'resource_id', c.resource_id) order by coalesce(c.requirement_position, 1)), '[]'::jsonb)
        from public.booking_reservations c where c.id = existing.id or c.parent_reservation_id = existing.id)
    );
  end if;

  if not public.service_has_resource_requirements(selected_service.id) then
    -- ── legacy single-resource path (unchanged) ──
    if requested_resource_selections is not null and requested_resource_selections <> '{}'::jsonb then
      raise exception 'service does not accept resource selections' using errcode = '22023';
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
      'expires_at', result.expires_at, 'server_time', server_time, 'idempotent_replay', false,
      'assignments', jsonb_build_array(jsonb_build_object('position', 1, 'resource_id', result.resource_id))
    );
  end if;

  -- ── multi-resource path ──
  -- Customer selections are only allowed for customer-selectable requirements and public resources.
  if requested_resource_selections is not null then
    for selection_key in select jsonb_object_keys(requested_resource_selections) loop
      if not exists (
        select 1 from public.service_resource_requirements r
        join public.booking_resources b on b.id = nullif(requested_resource_selections ->> selection_key, '')::uuid
        where r.service_id = selected_service.id and r.position::text = selection_key and r.customer_selectable
          and b.type = r.resource_type and b.active and b.public_selectable
      ) then
        raise exception 'resource selection is not allowed' using errcode = '22023';
      end if;
    end loop;
  end if;

  selected_ends_at := requested_starts_at + make_interval(mins => effective_duration_minutes);
  selected_blocked_start := requested_starts_at - make_interval(mins => selected_service.prep_buffer_minutes);
  selected_blocked_end := selected_ends_at + make_interval(mins => selected_service.cleanup_buffer_minutes);
  select * into selected_resource from public.booking_resources where id = selected_service.default_resource_id;
  if requested_starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes) then
    raise exception 'requested time violates minimum notice' using errcode = '22023';
  end if;
  if (requested_starts_at at time zone selected_resource.timezone)::date
      > (server_time at time zone selected_resource.timezone)::date + selected_service.maximum_advance_days then
    raise exception 'requested time exceeds maximum advance window' using errcode = '22023';
  end if;

  -- every candidate resource, ascending id → no lock-order deadlocks between multi-resource requests
  perform public.lock_booking_resources(public.service_resource_lock_set(selected_service.id));

  hold_minutes := 10;
  begin
    for resolution in select * from public.resolve_service_resources(selected_service.id, requested_starts_at, selected_ends_at,
        selected_blocked_start, selected_blocked_end, requested_resource_selections, null) loop
      if resolution.resolved_resource_id is null then
        unresolved := coalesce(unresolved, resolution.unavailable_reason);
        continue;
      end if;
      if anchor_id is null then
        select least(coalesce(requested_hold_minutes, b.hold_minutes), b.hold_minutes, 10) into hold_minutes
        from public.booking_resources b where b.id = resolution.resolved_resource_id;
        insert into public.booking_reservations (
          service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at, type, status, expires_at,
          idempotency_key, request_fingerprint, owner_token_hash, requirement_position, selection_locked
        ) values (
          selected_service.id, resolution.resolved_resource_id, requested_starts_at, selected_ends_at, selected_blocked_start,
          selected_blocked_end, 'hold', 'held', server_time + make_interval(mins => greatest(hold_minutes, 1)),
          btrim(requested_idempotency_key), requested_fingerprint, requested_owner_token_hash,
          resolution.requirement_position, resolution.explicitly_selected
        ) returning * into result;
        anchor_id := result.id;
      else
        insert into public.booking_reservations (
          service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at, type, status, expires_at,
          idempotency_key, request_fingerprint, owner_token_hash, parent_reservation_id, requirement_position, selection_locked
        ) values (
          selected_service.id, resolution.resolved_resource_id, requested_starts_at, selected_ends_at, selected_blocked_start,
          selected_blocked_end, 'hold', 'held', result.expires_at,
          btrim(requested_idempotency_key) || ':' || resolution.requirement_position, requested_fingerprint, requested_owner_token_hash,
          anchor_id, resolution.requirement_position, resolution.explicitly_selected
        );
      end if;
      assignments := assignments || jsonb_build_object('position', resolution.requirement_position, 'resource_id', resolution.resolved_resource_id);
    end loop;
  exception when exclusion_violation then
    raise exception 'requested time is no longer available' using errcode = '23P01';
  when unique_violation then
    raise exception 'idempotency key was already used with a different request' using errcode = '22023';
  end;
  -- outside the block on purpose (23P01 would otherwise be caught above); the whole call still rolls back atomically
  if unresolved is not null then
    raise exception 'required resource unavailable: %', unresolved using errcode = '23P01';
  end if;

  return jsonb_build_object(
    'reservation_id', result.id, 'status', result.status, 'starts_at', result.starts_at, 'ends_at', result.ends_at,
    'duration_minutes', effective_duration_minutes, 'expires_at', result.expires_at, 'server_time', server_time,
    'idempotent_replay', false, 'assignments', assignments
  );
end;
$$;

-- Existing public RPC keeps its exact signature and delegates (no resource selections).
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
returns jsonb language sql security definer set search_path = '' as $$
  select public.acquire_booking_hold_with_resources(requested_service_id, requested_starts_at, requested_idempotency_key,
    requested_fingerprint, requested_owner_token_hash, requested_resource_id, requested_hold_minutes, requested_duration_minutes, null);
$$;

-- ── 7. component reservations follow their anchor ──────────────────────────────────────────────────────────────────
create or replace function public.mirror_booking_reservation_components()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  component public.booking_reservations%rowtype;
  requirement public.service_resource_requirements%rowtype;
  replacement uuid;
  moved boolean := new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
    or new.blocked_starts_at is distinct from old.blocked_starts_at or new.blocked_ends_at is distinct from old.blocked_ends_at;
begin
  for component in select * from public.booking_reservations where parent_reservation_id = new.id order by resource_id for update loop
    replacement := component.resource_id;
    if moved and new.status in ('held', 'booked') then
      -- the schedule moved: keep the assigned resource if it is still free inside its working hours; otherwise an
      -- automatically assigned ANY_AVAILABLE resource may be swapped (never an explicitly selected one)
      if public.booking_resource_unavailable_reason(component.resource_id, new.starts_at, new.ends_at,
          new.blocked_starts_at, new.blocked_ends_at, new.id) is not null then
        select * into requirement from public.service_resource_requirements
        where service_id = new.service_id and position = component.requirement_position;
        replacement := null;
        if found and requirement.selection_mode = 'any_available' and not component.selection_locked then
          select b.id into replacement from public.booking_resources b
          where b.type = requirement.resource_type and b.active
            and not exists (select 1 from public.booking_reservations s where s.parent_reservation_id = new.id and s.resource_id = b.id and s.id <> component.id)
            and b.id <> new.resource_id
            and public.booking_resource_unavailable_reason(b.id, new.starts_at, new.ends_at, new.blocked_starts_at, new.blocked_ends_at, new.id) is null
          order by b.sort_order, b.code limit 1;
        end if;
        if replacement is null then
          raise exception 'required resource is not available for the new schedule' using errcode = '23P01';
        end if;
      end if;
    end if;
    update public.booking_reservations set
      resource_id = replacement, service_id = new.service_id,
      starts_at = new.starts_at, ends_at = new.ends_at,
      blocked_starts_at = new.blocked_starts_at, blocked_ends_at = new.blocked_ends_at,
      type = new.type, status = new.status, expires_at = new.expires_at,
      released_at = new.released_at, updated_at = clock_timestamp()
    where id = component.id;
  end loop;
  return new;
end;
$$;

create trigger mirror_booking_reservation_components
after update of status, type, expires_at, starts_at, ends_at, blocked_starts_at, blocked_ends_at, service_id, released_at
on public.booking_reservations
for each row when (old.parent_reservation_id is null)
execute function public.mirror_booking_reservation_components();

-- Components are created for anchors inserted without a hold (staff bookings, linked pairs, loyalty, backfills).
create or replace function public.reserve_booking_components(requested_anchor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare anchor public.booking_reservations%rowtype; resolution record; unresolved text;
begin
  select * into anchor from public.booking_reservations where id = requested_anchor_id;
  if not found or anchor.status not in ('held', 'booked') then return; end if;
  if exists (select 1 from public.booking_reservations where parent_reservation_id = anchor.id) then return; end if;
  for resolution in select * from public.resolve_service_resources(anchor.service_id, anchor.starts_at, anchor.ends_at,
      anchor.blocked_starts_at, anchor.blocked_ends_at, jsonb_build_object('1', anchor.resource_id), anchor.id) loop
    if resolution.requirement_position = (select min(position) from public.service_resource_requirements where service_id = anchor.service_id) then
      continue; -- the anchor itself
    end if;
    if resolution.resolved_resource_id is null then unresolved := coalesce(unresolved, resolution.unavailable_reason); continue; end if;
    insert into public.booking_reservations (service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at,
      type, status, expires_at, idempotency_key, request_fingerprint, owner_token_hash, parent_reservation_id, requirement_position, released_at)
    values (anchor.service_id, resolution.resolved_resource_id, anchor.starts_at, anchor.ends_at, anchor.blocked_starts_at,
      anchor.blocked_ends_at, anchor.type, anchor.status, anchor.expires_at,
      case when anchor.idempotency_key is null then null else anchor.idempotency_key || ':' || resolution.requirement_position end,
      anchor.request_fingerprint, anchor.owner_token_hash, anchor.id, resolution.requirement_position, null);
  end loop;
  if unresolved is not null then
    raise exception 'required resource unavailable: %', unresolved using errcode = '23P01';
  end if;
end;
$$;

-- ── 8. booking trigger: accept any valid anchor and create components ──────────────────────────────────────────────
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
  multi_resource boolean;
  inserted_reservation uuid;
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
  multi_resource := public.service_has_resource_requirements(selected_service.id);

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
    if multi_resource then
      -- the anchor comes from the attached hold, the caller, or (staff bookings) automatic resolution below
      if new.resource_id is null and new.reservation_hold_id is not null then
        select resource_id into new.resource_id from public.booking_reservations where id = new.reservation_hold_id;
      end if;
      if new.resource_id is not null and not public.service_allows_anchor_resource(selected_service.id, new.resource_id) then
        raise exception 'resource is not configured for this service' using errcode = '22023';
      end if;
      perform public.lock_booking_resources(public.service_resource_lock_set(selected_service.id));
    else
      new.resource_id := coalesce(new.resource_id, selected_service.default_resource_id);
      if new.resource_id <> selected_service.default_resource_id then
        raise exception 'resource is not configured for this service' using errcode = '22023';
      end if;
    end if;
    new.timezone := coalesce((select timezone from public.booking_resources where id = coalesce(new.resource_id, selected_service.default_resource_id)), 'Asia/Manila');
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
    if multi_resource and new.resource_id is null then
      select resolved_resource_id into new.resource_id from public.resolve_service_resources(selected_service.id, new.starts_at, new.ends_at,
        new.starts_at - make_interval(mins => new.prep_buffer_minutes_snapshot), new.ends_at + make_interval(mins => new.cleanup_buffer_minutes_snapshot),
        null, null) order by requirement_position limit 1;
      if new.resource_id is null then
        raise exception 'booking schedule is unavailable' using errcode = '23P01';
      end if;
    end if;
    select * into selected_resource from public.booking_resources where id = new.resource_id and active;
    if not found then raise exception 'booking resource is unavailable' using errcode = '22023'; end if;
    if not multi_resource then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(selected_resource.id::text, 0));
    end if;
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
      or attached_hold.parent_reservation_id is not null
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
    if multi_resource and target_status in ('held', 'booked') then
      perform public.reserve_booking_components(current_reservation.id);  -- no-op when components exist
    end if;
  else
    insert into public.booking_reservations (
      booking_id, service_id, resource_id, starts_at, ends_at, blocked_starts_at, blocked_ends_at,
      type, status, released_at, requirement_position
    ) values (
      new.id, new.service_id, new.resource_id, new.starts_at, new.ends_at,
      new.starts_at - make_interval(mins => new.prep_buffer_minutes_snapshot),
      new.ends_at + make_interval(mins => new.cleanup_buffer_minutes_snapshot),
      target_type, target_status, case when target_status = 'released' then clock_timestamp() else null end,
      case when multi_resource then 1 end
    ) returning id into inserted_reservation;
    if multi_resource and target_status in ('held', 'booked') then
      perform public.reserve_booking_components(inserted_reservation);
    end if;
  end if;
  return new;
exception when exclusion_violation then
  if sqlerrm in (
    'booking schedule is unavailable',
    'reservation hold is expired, owned by another request, or does not match the booking',
    'linked reservation hold expired before booking activation',
    'linked reservation hold expired before booking confirmation',
    'required resource is not available for the new schedule'
  ) or sqlerrm like 'required resource unavailable:%' then
    raise;
  end if;
  raise exception 'booking schedule conflicts with an existing reservation' using errcode = '23P01';
end;
$$;

-- ── 9. expiry: anchors only (components follow through the mirror trigger) ─────────────────────────────────────────
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
    where status = 'held' and expires_at <= clock_timestamp() and parent_reservation_id is null
    order by expires_at for update skip locked limit requested_limit
  )
  update public.booking_reservations r
  set status = 'expired', released_at = clock_timestamp(), updated_at = clock_timestamp()
  from due where r.id = due.id;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- ── 10. staff: reassign a required resource on an existing booking ─────────────────────────────────────────────────
create or replace function public.reassign_booking_resource(
  requested_booking_id uuid, requested_position smallint, requested_resource_id uuid, requested_actor_id uuid, requested_reason text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selected_booking public.bookings%rowtype;
  anchor public.booking_reservations%rowtype;
  component public.booking_reservations%rowtype;
  requirement public.service_resource_requirements%rowtype;
  reason text;
  previous_resource uuid;
  actor_name text;
begin
  -- requested_actor_id may be null only in local development with staff authentication disabled (the API enforces this)
  if length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'invalid resource reassignment request' using errcode = '22023';
  end if;
  select * into selected_booking from public.bookings where id = requested_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  select * into requirement from public.service_resource_requirements where service_id = selected_booking.service_id and position = requested_position;
  if not found then raise exception 'service has no such resource requirement' using errcode = '22023'; end if;
  if not exists (select 1 from public.booking_resources b where b.id = requested_resource_id and b.active
      and ((requirement.selection_mode = 'fixed' and b.id = requirement.resource_id) or (requirement.selection_mode = 'any_available' and b.type = requirement.resource_type))) then
    raise exception 'resource does not satisfy this requirement' using errcode = '22023';
  end if;
  perform public.lock_booking_resources(public.service_resource_lock_set(selected_booking.service_id));
  select * into anchor from public.booking_reservations where booking_id = selected_booking.id for update;
  if not found or anchor.status not in ('held', 'booked') then raise exception 'booking has no active reservation' using errcode = '22023'; end if;
  if requested_position = coalesce(anchor.requirement_position, 1) then
    previous_resource := anchor.resource_id;
    update public.bookings set resource_id = requested_resource_id where id = selected_booking.id; -- sync trigger re-validates (hours, blackouts, exclusion)
    update public.booking_reservations set selection_locked = true where id = anchor.id;
  else
    select * into component from public.booking_reservations where parent_reservation_id = anchor.id and requirement_position = requested_position for update;
    if not found then raise exception 'booking has no reservation for this requirement' using errcode = 'P0002'; end if;
    previous_resource := component.resource_id;
    reason := public.booking_resource_unavailable_reason(requested_resource_id, anchor.starts_at, anchor.ends_at, anchor.blocked_starts_at, anchor.blocked_ends_at, anchor.id);
    if requested_resource_id <> component.resource_id and reason is not null then
      raise exception 'resource is unavailable: %', reason using errcode = '23P01';
    end if;
    if exists (select 1 from public.booking_reservations s where (s.id = anchor.id or s.parent_reservation_id = anchor.id) and s.id <> component.id and s.resource_id = requested_resource_id) then
      raise exception 'resource is already assigned to this booking' using errcode = '22023';
    end if;
    update public.booking_reservations set resource_id = requested_resource_id, selection_locked = true, updated_at = clock_timestamp() where id = component.id;
  end if;
  select display_name into actor_name from public.staff_profiles where user_id = requested_actor_id;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce(actor_name, 'Service actor'), 'Booking resource reassigned', 'data', 'booking', selected_booking.id,
    jsonb_build_object('position', requested_position, 'old_resource_id', previous_resource, 'new_resource_id', requested_resource_id, 'reason', btrim(requested_reason)));
  return public.get_booking_resource_assignments(selected_booking.id);
exception when exclusion_violation then
  raise exception 'resource is unavailable: reserved' using errcode = '23P01';
end;
$$;

create or replace function public.get_booking_resource_assignments(requested_booking_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'position', coalesce(r.requirement_position, 1), 'reservation_id', r.id, 'resource_id', b.id, 'resource_name', b.name,
    'resource_type', b.type, 'status', r.status, 'selection_locked', r.selection_locked
  ) order by coalesce(r.requirement_position, 1)), '[]'::jsonb)
  from public.booking_reservations anchor
  join public.booking_reservations r on r.id = anchor.id or r.parent_reservation_id = anchor.id
  join public.booking_resources b on b.id = r.resource_id
  where anchor.booking_id = requested_booking_id;
$$;

-- ── 11. calendar: hide components from the legacy hold list; per-resource calendar ─────────────────────────────────
create or replace function public.get_booking_calendar_reservations(requested_starts_at timestamptz, requested_ends_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
      where r.booking_id is null and r.parent_reservation_id is null and r.status = 'held' and r.expires_at > clock_timestamp()
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

create or replace function public.get_resource_calendar(requested_starts_at timestamptz, requested_ends_at timestamptz, requested_resource_ids uuid[] default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if requested_ends_at <= requested_starts_at or requested_ends_at - requested_starts_at > interval '62 days' then
    raise exception 'invalid calendar range' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'resources', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name, 'type', b.type,
        'type_name', t.name, 'active', b.active, 'staff_user_id', b.staff_user_id) order by t.sort_order, b.sort_order, b.code), '[]'::jsonb)
      from public.booking_resources b join public.booking_resource_types t on t.code = b.type
      where requested_resource_ids is null or b.id = any(requested_resource_ids)),
    'items', (select coalesce(jsonb_agg(item order by item->>'starts_at'), '[]'::jsonb) from (
      select jsonb_build_object('kind', case when r.status = 'held' then 'hold' else 'booking' end,
        'reservation_id', r.id, 'resource_id', r.resource_id, 'starts_at', r.starts_at, 'ends_at', r.ends_at,
        'status', r.status, 'expires_at', r.expires_at, 'position', coalesce(r.requirement_position, 1),
        'booking_id', bk.id, 'reference', bk.reference, 'service', bk.service_type, 'client_name', c.name, 'booking_status', bk.status) item
      from public.booking_reservations r
      left join public.booking_reservations anchor on anchor.id = coalesce(r.parent_reservation_id, r.id)
      left join public.bookings bk on bk.id = anchor.booking_id
      left join public.clients c on c.id = bk.client_id
      where (r.status = 'booked' or (r.status = 'held' and r.expires_at > clock_timestamp()))
        and r.blocked_range && tstzrange(requested_starts_at, requested_ends_at, '[)')
        and (requested_resource_ids is null or r.resource_id = any(requested_resource_ids))
      union all
      select jsonb_build_object('kind', 'block', 'block_id', x.id, 'resource_id', x.resource_id, 'starts_at', x.starts_at,
        'ends_at', x.ends_at, 'block_kind', x.kind, 'reason', x.reason)
      from public.booking_resource_blackouts x
      where x.active and x.blocked_range && tstzrange(requested_starts_at, requested_ends_at, '[)')
        and (requested_resource_ids is null or x.resource_id = any(requested_resource_ids))
    ) items));
end;
$$;

-- ── 12. resource management (staff, called server-side after a permission check) ───────────────────────────────────
create or replace function public.upsert_booking_resource(
  requested_id uuid, requested_code text, requested_name text, requested_type text, requested_staff_user_id uuid,
  requested_public_selectable boolean, requested_active boolean, requested_sort_order integer, requested_actor_id uuid
)
returns public.booking_resources language plpgsql security definer set search_path = '' as $$
declare result public.booking_resources%rowtype;
begin
  if requested_id is null then
    insert into public.booking_resources (code, name, type, staff_user_id, public_selectable, active, sort_order)
    values (lower(btrim(requested_code)), btrim(requested_name), requested_type, requested_staff_user_id,
      coalesce(requested_public_selectable, false), coalesce(requested_active, true), coalesce(requested_sort_order, 100))
    returning * into result;
  else
    update public.booking_resources set name = btrim(requested_name), type = requested_type, staff_user_id = requested_staff_user_id,
      public_selectable = coalesce(requested_public_selectable, public_selectable), active = coalesce(requested_active, active),
      sort_order = coalesce(requested_sort_order, sort_order), updated_at = clock_timestamp()
    where id = requested_id returning * into result;
    if not found then raise exception 'resource not found' using errcode = 'P0002'; end if;
  end if;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce((select display_name from public.staff_profiles where user_id = requested_actor_id), 'Service actor'),
    case when requested_id is null then 'Booking resource created' else 'Booking resource updated' end, 'data', 'booking_resource', result.id,
    jsonb_build_object('name', result.name, 'type', result.type, 'active', result.active, 'public_selectable', result.public_selectable));
  return result;
end;
$$;

create or replace function public.set_booking_resource_weekly_hours(requested_resource_id uuid, requested_hours jsonb, requested_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(requested_hours) <> 'array' then raise exception 'invalid weekly hours' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(requested_resource_id::text, 0));
  update public.booking_resource_weekly_hours set active = false where resource_id = requested_resource_id and active;
  for item in select * from jsonb_array_elements(requested_hours) loop
    insert into public.booking_resource_weekly_hours (resource_id, iso_day_of_week, opens_at, closes_at, active)
    values (requested_resource_id, (item->>'day')::smallint, (item->>'opens')::time, (item->>'closes')::time, true)
    on conflict (resource_id, iso_day_of_week, opens_at, closes_at) do update set active = true;
  end loop;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce((select display_name from public.staff_profiles where user_id = requested_actor_id), 'Service actor'),
    'Resource working hours updated', 'data', 'booking_resource', requested_resource_id, jsonb_build_object('hours', requested_hours));
  return (select coalesce(jsonb_agg(jsonb_build_object('day', iso_day_of_week, 'opens', opens_at, 'closes', closes_at) order by iso_day_of_week, opens_at), '[]'::jsonb)
    from public.booking_resource_weekly_hours where resource_id = requested_resource_id and active);
end;
$$;

create or replace function public.add_booking_resource_block(
  requested_resource_id uuid, requested_starts_at timestamptz, requested_ends_at timestamptz, requested_kind text,
  requested_reason text, requested_actor_id uuid, requested_external_source text default null, requested_external_ref text default null
)
returns public.booking_resource_blackouts language plpgsql security definer set search_path = '' as $$
declare result public.booking_resource_blackouts%rowtype;
begin
  if requested_external_source is not null then
    select * into result from public.booking_resource_blackouts where external_source = requested_external_source and external_ref = requested_external_ref;
    if found then return result; end if;  -- idempotent projection (e.g. STAFF_LEAVE_APPROVED redelivery)
  end if;
  insert into public.booking_resource_blackouts (resource_id, starts_at, ends_at, reason, kind, created_by, external_source, external_ref)
  values (requested_resource_id, requested_starts_at, requested_ends_at, btrim(requested_reason), coalesce(requested_kind, 'manual'),
    requested_actor_id, requested_external_source, requested_external_ref)
  returning * into result;  -- protect_booking_blackout refuses blocks over existing reservations (23P01)
  return result;
end;
$$;

create or replace function public.remove_booking_resource_block(requested_block_id uuid, requested_actor_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.booking_resource_blackouts set active = false, updated_at = clock_timestamp() where id = requested_block_id;
$$;

create or replace function public.set_service_resource_requirements(requested_service_id uuid, requested_requirements jsonb, requested_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb; position_number smallint := 0;
begin
  if jsonb_typeof(requested_requirements) <> 'array' then raise exception 'invalid requirements' using errcode = '22023'; end if;
  if not exists (select 1 from public.services where id = requested_service_id) then raise exception 'service not found' using errcode = 'P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('service-requirements:' || requested_service_id::text, 0));
  delete from public.service_resource_requirements where service_id = requested_service_id;
  for item in select * from jsonb_array_elements(requested_requirements) loop
    position_number := position_number + 1;
    insert into public.service_resource_requirements (service_id, position, selection_mode, resource_id, resource_type, customer_selectable)
    values (requested_service_id, position_number, item->>'mode', nullif(item->>'resource_id', '')::uuid, nullif(item->>'resource_type', ''),
      coalesce((item->>'customer_selectable')::boolean, false));
  end loop;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, coalesce((select display_name from public.staff_profiles where user_id = requested_actor_id), 'Service actor'),
    'Service resource requirements updated', 'data', 'service', requested_service_id, jsonb_build_object('requirements', requested_requirements));
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.position), '[]'::jsonb) from public.service_resource_requirements r where r.service_id = requested_service_id);
end;
$$;

-- ── 13. privileges: tables RPC-only (as the existing booking tables), staff read through RLS ───────────────────────
alter table public.booking_resource_types enable row level security;
alter table public.service_resource_requirements enable row level security;
create policy booking_resource_types_read on public.booking_resource_types for select to authenticated using (true);
create policy service_resource_requirements_staff_read on public.service_resource_requirements for select to authenticated
  using (public.loyalty_is_staff('bookings'));
revoke all on table public.booking_resource_types, public.service_resource_requirements from public, anon, authenticated, service_role;
grant select on table public.booking_resource_types, public.service_resource_requirements to authenticated;

revoke all on function
  public.booking_resource_unavailable_reason(uuid, timestamptz, timestamptz, timestamptz, timestamptz, uuid),
  public.resolve_service_resources(uuid, timestamptz, timestamptz, timestamptz, timestamptz, jsonb, uuid),
  public.service_resource_lock_set(uuid), public.lock_booking_resources(uuid[]),
  public.service_has_resource_requirements(uuid), public.service_allows_anchor_resource(uuid, uuid),
  public.get_service_availability(uuid, date, integer, jsonb, boolean),
  public.acquire_booking_hold_with_resources(uuid, timestamptz, text, text, text, uuid, integer, integer, jsonb),
  public.mirror_booking_reservation_components(), public.reserve_booking_components(uuid),
  public.reassign_booking_resource(uuid, smallint, uuid, uuid, text), public.get_booking_resource_assignments(uuid),
  public.get_resource_calendar(timestamptz, timestamptz, uuid[]),
  public.upsert_booking_resource(uuid, text, text, text, uuid, boolean, boolean, integer, uuid),
  public.set_booking_resource_weekly_hours(uuid, jsonb, uuid),
  public.add_booking_resource_block(uuid, timestamptz, timestamptz, text, text, uuid, text, text),
  public.remove_booking_resource_block(uuid, uuid),
  public.set_service_resource_requirements(uuid, jsonb, uuid)
  from public, anon, authenticated, service_role;
-- public availability: the wrapper below only exposes public data
create or replace function public.get_public_service_availability(requested_service_id uuid, requested_date date, requested_duration_minutes integer default null, requested_selections jsonb default null)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select public.get_service_availability(requested_service_id, requested_date, requested_duration_minutes, requested_selections, false);
$$;
revoke all on function public.get_public_service_availability(uuid, date, integer, jsonb) from public;
grant execute on function public.get_public_service_availability(uuid, date, integer, jsonb) to anon, authenticated, service_role;
grant execute on function
  public.get_service_availability(uuid, date, integer, jsonb, boolean),
  public.acquire_booking_hold_with_resources(uuid, timestamptz, text, text, text, uuid, integer, integer, jsonb),
  public.reassign_booking_resource(uuid, smallint, uuid, uuid, text), public.get_booking_resource_assignments(uuid),
  public.get_resource_calendar(timestamptz, timestamptz, uuid[]),
  public.upsert_booking_resource(uuid, text, text, text, uuid, boolean, boolean, integer, uuid),
  public.set_booking_resource_weekly_hours(uuid, jsonb, uuid),
  public.add_booking_resource_block(uuid, timestamptz, timestamptz, text, text, uuid, text, text),
  public.remove_booking_resource_block(uuid, uuid),
  public.set_service_resource_requirements(uuid, jsonb, uuid)
  to service_role;
-- re-assert the original grants on replaced functions (create or replace keeps them; stated for clarity)
grant execute on function public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer),
  public.expire_booking_holds(integer), public.get_booking_calendar_reservations(timestamptz,timestamptz) to service_role;

-- ── 14. staff: candidate resources per requirement for an existing booking, with the reason each is unavailable ─────
create or replace function public.get_booking_resource_options(requested_booking_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'position', req.position, 'mode', req.selection_mode, 'type', coalesce(req.resource_type, fixed.type), 'type_name', t.name,
    'assigned_resource_id', (select r.resource_id from public.booking_reservations r where (r.id = anchor.id or r.parent_reservation_id = anchor.id) and coalesce(r.requirement_position, 1) = req.position),
    'candidates', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name,
        'unavailable_reason', public.booking_resource_unavailable_reason(b.id, anchor.starts_at, anchor.ends_at, anchor.blocked_starts_at, anchor.blocked_ends_at, anchor.id))
        order by b.sort_order, b.code), '[]'::jsonb)
      from public.booking_resources b where b.active and ((req.selection_mode = 'fixed' and b.id = req.resource_id) or (req.selection_mode = 'any_available' and b.type = req.resource_type)))
  ) order by req.position), '[]'::jsonb)
  from public.bookings bk
  join public.booking_reservations anchor on anchor.booking_id = bk.id
  join public.service_resource_requirements req on req.service_id = bk.service_id
  left join public.booking_resources fixed on fixed.id = req.resource_id
  join public.booking_resource_types t on t.code = coalesce(req.resource_type, fixed.type)
  where bk.id = requested_booking_id;
$$;
revoke all on function public.get_booking_resource_options(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_booking_resource_options(uuid) to service_role;

-- ── 15. staff: resource directory for the settings screen ──────────────────────────────────────────────────────────
create or replace function public.get_resource_directory()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'types', (select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'is_person', t.is_person) order by t.sort_order), '[]'::jsonb) from public.booking_resource_types t),
    'resources', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'code', b.code, 'name', b.name, 'type', b.type, 'active', b.active, 'public_selectable', b.public_selectable,
        'staff_user_id', b.staff_user_id, 'sort_order', b.sort_order,
        'hours', (select coalesce(jsonb_agg(jsonb_build_object('day', h.iso_day_of_week, 'opens', to_char(h.opens_at, 'HH24:MI'), 'closes', to_char(h.closes_at, 'HH24:MI')) order by h.iso_day_of_week, h.opens_at), '[]'::jsonb)
          from public.booking_resource_weekly_hours h where h.resource_id = b.id and h.active),
        'blocks', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'starts_at', x.starts_at, 'ends_at', x.ends_at, 'kind', x.kind, 'reason', x.reason, 'external_source', x.external_source) order by x.starts_at), '[]'::jsonb)
          from public.booking_resource_blackouts x where x.resource_id = b.id and x.active and x.ends_at > clock_timestamp())
      ) order by b.sort_order, b.name), '[]'::jsonb) from public.booking_resources b),
    'requirements', (select coalesce(jsonb_agg(jsonb_build_object('service_id', r.service_id, 'position', r.position, 'mode', r.selection_mode,
        'resource_id', r.resource_id, 'resource_type', r.resource_type, 'customer_selectable', r.customer_selectable) order by r.service_id, r.position), '[]'::jsonb)
      from public.service_resource_requirements r)
  );
$$;
revoke all on function public.get_resource_directory() from public, anon, authenticated, service_role;
grant execute on function public.get_resource_directory() to service_role;
