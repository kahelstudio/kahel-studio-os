-- Never release a booked reservation on an application timer. PayMongo Hosted
-- Checkout can remain payable when it does not return an expires_at value.
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
  return changed;
end;
$$;

comment on function public.expire_booking_holds(integer) is
  'Expires only unlinked customer holds. Booked provider checkouts require a definitive provider failure or explicit reconciliation before release.';

-- Re-arm a booking whose PayMongo checkout was created (reservation flipped to
-- booked) but is now expired or abandoned, so the customer can start a fresh
-- checkout from the same slot. The original reservation row is reset to held
-- (reusing its existing interval) and the stale checkout fields are cleared.
-- This avoids recreating a conflicting reservation and keeps the slot reserved
-- without relying on a timer to release a booked reservation.
create or replace function public.reset_booking_checkout_for_retry(
  requested_booking_id uuid,
  requested_checkout_session_id text,
  requested_owner_token_hash text,
  requested_expires_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  selected_booking public.bookings%rowtype;
  selected_reservation public.booking_reservations%rowtype;
  server_time timestamptz := clock_timestamp();
begin
  if length(btrim(coalesce(requested_checkout_session_id, ''))) not between 1 and 255
    or length(coalesce(requested_owner_token_hash, '')) not between 32 and 128
    or requested_expires_at is null or requested_expires_at <= server_time
    or requested_expires_at > server_time + interval '30 minutes' then
    raise exception 'invalid checkout retry request' using errcode = '22023';
  end if;

  select * into selected_booking from public.bookings where id = requested_booking_id for update;
  if not found then
    return jsonb_build_object('reset', false, 'reason', 'booking_not_found');
  end if;
  if selected_booking.paymongo_checkout_session_id is distinct from btrim(requested_checkout_session_id) then
    return jsonb_build_object('reset', false, 'reason', 'checkout_mismatch');
  end if;
  if selected_booking.payment_status in ('paid', 'partially_paid')
    or selected_booking.status in ('confirmed', 'progress', 'completed', 'cancelled') then
    return jsonb_build_object('reset', false, 'reason', 'booking_already_confirmed');
  end if;

  select * into selected_reservation from public.booking_reservations
  where booking_id = selected_booking.id for update;
  if not found then
    return jsonb_build_object('reset', false, 'reason', 'reservation_not_found');
  end if;

  update public.booking_reservations
  set status = 'held', expires_at = requested_expires_at, released_at = null,
      owner_token_hash = btrim(requested_owner_token_hash), updated_at = server_time
  where id = selected_reservation.id;

  update public.bookings
  set paymongo_checkout_url = null,
      paymongo_checkout_session_id = null,
      paymongo_checkout_expires_at = null,
      checkout_creation_started_at = null,
      payment_status = case when payment_status = 'failed' then 'pending' else payment_status end,
      reservation_owner_token_hash = btrim(requested_owner_token_hash),
      updated_at = server_time
  where id = selected_booking.id;

  return jsonb_build_object('reset', true, 'reservation_id', selected_reservation.id, 'expires_at', requested_expires_at);
end;
$$;

grant execute on function public.reset_booking_checkout_for_retry(uuid, text, text, timestamptz) to service_role;

comment on function public.reset_booking_checkout_for_retry(uuid, text, text, timestamptz) is
  'Clears a stale or expired PayMongo checkout and returns the booking reservation to held so checkout can be re-created from the same slot.';
