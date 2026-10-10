-- Offer hourly booking starts by default. Mini Sessions are the sole service
-- that exposes half-hour starts.
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
  slot_interval_minutes integer;
begin
  select * into selected_service from public.services
  where id = requested_service_id and active;
  if not found then raise exception 'service unavailable' using errcode = 'P0002'; end if;
  effective_duration_minutes := coalesce(requested_duration_minutes, selected_service.duration_minutes);
  if effective_duration_minutes < selected_service.duration_minutes
    or effective_duration_minutes > selected_service.duration_minutes + 480 then
    raise exception 'invalid requested duration' using errcode = '22023';
  end if;
  slot_interval_minutes := case
    when lower(selected_service.code) in ('mini', 'mini-session')
      or lower(selected_service.name) = 'mini session' then 30
    else 60
  end;

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
      make_interval(mins => slot_interval_minutes)
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
    'slot_interval_minutes', slot_interval_minutes,
    'prep_buffer_minutes', selected_service.prep_buffer_minutes,
    'cleanup_buffer_minutes', selected_service.cleanup_buffer_minutes,
    'server_time', server_time,
    'refresh_after_seconds', 30,
    'slots', slots
  );
end;
$$;

comment on function public.get_booking_availability(uuid,date,uuid,integer) is
  'Returns safe public availability using hourly starts, except Mini Sessions which use half-hour starts.';
