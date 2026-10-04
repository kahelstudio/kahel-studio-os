-- Manual rollback for 20261004000000_native_resource_scheduling.sql (LOCAL / reviewed use only).
-- Precondition: no service has resource requirements in use and no component reservations must be kept
-- (component rows and non-legacy resources are removed). Legacy bookings/holds are untouched.
-- Restores the four replaced functions to their exact pre-Phase-4 definitions (dumped from the database).
begin;
drop trigger if exists mirror_booking_reservation_components on public.booking_reservations;
delete from public.booking_reservations where parent_reservation_id is not null;
CREATE OR REPLACE FUNCTION public.acquire_booking_hold(requested_service_id uuid, requested_starts_at timestamp with time zone, requested_idempotency_key text, requested_fingerprint text, requested_owner_token_hash text, requested_resource_id uuid DEFAULT NULL::uuid, requested_hold_minutes integer DEFAULT NULL::integer, requested_duration_minutes integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;
CREATE OR REPLACE FUNCTION public.sync_booking_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;
CREATE OR REPLACE FUNCTION public.expire_booking_holds(requested_limit integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  return changed;
end;
$function$

;
CREATE OR REPLACE FUNCTION public.get_booking_calendar_reservations(requested_starts_at timestamp with time zone, requested_ends_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;
drop function if exists public.get_public_service_availability(uuid, date, integer, jsonb);
drop function if exists public.get_service_availability(uuid, date, integer, jsonb, boolean);
drop function if exists public.acquire_booking_hold_with_resources(uuid, timestamptz, text, text, text, uuid, integer, integer, jsonb);
drop function if exists public.mirror_booking_reservation_components();
drop function if exists public.reserve_booking_components(uuid);
drop function if exists public.reassign_booking_resource(uuid, smallint, uuid, uuid, text);
drop function if exists public.get_booking_resource_assignments(uuid);
drop function if exists public.get_booking_resource_options(uuid);
drop function if exists public.get_resource_directory();
drop function if exists public.get_resource_calendar(timestamptz, timestamptz, uuid[]);
drop function if exists public.upsert_booking_resource(uuid, text, text, text, uuid, boolean, boolean, integer, uuid);
drop function if exists public.set_booking_resource_weekly_hours(uuid, jsonb, uuid);
drop function if exists public.add_booking_resource_block(uuid, timestamptz, timestamptz, text, text, uuid, text, text);
drop function if exists public.remove_booking_resource_block(uuid, uuid);
drop function if exists public.set_service_resource_requirements(uuid, jsonb, uuid);
drop function if exists public.resolve_service_resources(uuid, timestamptz, timestamptz, timestamptz, timestamptz, jsonb, uuid);
drop function if exists public.booking_resource_unavailable_reason(uuid, timestamptz, timestamptz, timestamptz, timestamptz, uuid);
drop function if exists public.service_allows_anchor_resource(uuid, uuid);
drop function if exists public.service_has_resource_requirements(uuid);
drop function if exists public.lock_booking_resources(uuid[]);
drop function if exists public.service_resource_lock_set(uuid);
drop table if exists public.service_resource_requirements;
alter table public.booking_reservations drop constraint if exists booking_reservations_component_check,
  drop column if exists selection_locked, drop column if exists requirement_position, drop column if exists parent_reservation_id;
drop index if exists public.booking_resource_blackouts_external_key;
alter table public.booking_resource_blackouts drop column if exists external_ref, drop column if exists external_source, drop column if exists kind;
drop index if exists public.booking_resources_staff_type_key;
drop index if exists public.booking_resources_type_idx;
alter table public.booking_resources drop constraint if exists booking_resources_type_fkey,
  drop column if exists sort_order, drop column if exists public_selectable, drop column if exists staff_user_id;
-- fails (by design) if non-legacy resource types are still in use: reassign or deactivate+delete those resources first
alter table public.booking_resources add constraint booking_resources_type_check check (type = any (array['space'::text, 'team'::text]));
drop table if exists public.booking_resource_types;
grant execute on function public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer), public.expire_booking_holds(integer),
  public.get_booking_calendar_reservations(timestamptz,timestamptz) to service_role;
delete from supabase_migrations.schema_migrations where version = '20261004000000';
commit;
