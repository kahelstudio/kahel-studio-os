-- Backfill booking_reservations for all bookings that predate the
-- prevent_double_booking migration. The sync_booking_reservation trigger
-- handles this automatically for future writes; this seeds the existing set
-- so the calendar API can locate them via booking_reservations.

-- Released rows (cancelled/completed): no exclusion constraint applies.
insert into public.booking_reservations (
  booking_id, service_id, resource_id,
  starts_at, ends_at, blocked_starts_at, blocked_ends_at,
  type, status, released_at
)
select
  b.id, b.service_id, b.resource_id,
  b.starts_at, b.ends_at,
  b.starts_at - make_interval(mins => b.prep_buffer_minutes_snapshot),
  b.ends_at + make_interval(mins => b.cleanup_buffer_minutes_snapshot),
  'booking', 'released', clock_timestamp()
from public.bookings b
where b.status in ('cancelled', 'completed')
on conflict (booking_id) do nothing;

-- Active bookings: insert one at a time so pre-existing double-bookings in the
-- historical data don't abort the whole batch. Confirmed bookings are attempted
-- first so the strongest-status booking wins the slot.
do $$
declare
  rec record;
begin
  for rec in (
    select
      b.id, b.service_id, b.resource_id,
      b.starts_at, b.ends_at,
      b.starts_at - make_interval(mins => b.prep_buffer_minutes_snapshot) as blocked_starts_at,
      b.ends_at + make_interval(mins => b.cleanup_buffer_minutes_snapshot) as blocked_ends_at
    from public.bookings b
    where b.status not in ('cancelled', 'completed')
      and not exists (
        select 1 from public.booking_reservations r where r.booking_id = b.id
      )
    order by
      case b.status
        when 'progress'   then 1
        when 'confirmed'  then 2
        when 'quoted'     then 3
        when 'inquiry'    then 4
        else 5
      end,
      b.created_at
  ) loop
    begin
      insert into public.booking_reservations (
        booking_id, service_id, resource_id,
        starts_at, ends_at, blocked_starts_at, blocked_ends_at,
        type, status
      ) values (
        rec.id, rec.service_id, rec.resource_id,
        rec.starts_at, rec.ends_at,
        rec.blocked_starts_at, rec.blocked_ends_at,
        'booking', 'booked'
      );
    exception when exclusion_violation or unique_violation then
      null;
    end;
  end loop;
end;
$$;
