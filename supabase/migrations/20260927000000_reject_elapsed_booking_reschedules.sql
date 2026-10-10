-- Reject calendar reschedules whose requested local start has already elapsed.
-- Booking resources are the source of truth for the scheduling timezone.
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
  requested_timezone text;
  requested_start timestamptz;
  previous_actor_setting text := current_setting('app.booking_schedule_actor', true);
  previous_reason_setting text := current_setting('app.booking_schedule_reason', true);
begin
  if length(btrim(coalesce(requested_reference, ''))) = 0 or requested_date is null
    or requested_time is null or requested_resource_id is null or requested_actor_id is null
    or length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'invalid booking reschedule request' using errcode = '22023';
  end if;

  select timezone into requested_timezone
  from public.booking_resources where id = requested_resource_id;
  if not found then raise exception 'booking resource not found' using errcode = 'P0002'; end if;

  requested_start := (requested_date + requested_time) at time zone requested_timezone;
  if requested_start <= clock_timestamp() then
    raise exception 'booking cannot be rescheduled to an elapsed time' using errcode = '22023';
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
