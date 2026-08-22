begin;
create extension if not exists pgtap with schema extensions;
select plan(119);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('52000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reservation-staff@kahel.test', '', now(), now()),
  ('52000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reservation-customer@kahel.test', '', now(), now());
insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings)
values ('52000000-0000-4000-8000-000000000001', 'staff', 'Reservation Staff', true);
insert into public.clients (id, external_ref, name)
values ('52100000-0000-4000-8000-000000000001', 'RESERVATION-TEST', 'Reservation Test');
insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name)
values ('52200000-0000-4000-8000-000000000001', '52100000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000002', 'reservation-customer@kahel.test', 'Reservation', 'Customer');

insert into public.services (id, code, name, duration_minutes, prep_buffer_minutes,
  cleanup_buffer_minutes, minimum_notice_minutes, maximum_advance_days, default_resource_id)
values
  ('52300000-0000-4000-8000-000000000001', 'reservation-test-studio', 'Reservation Test Studio', 60, 0, 0, 0, 3650, '51000000-0000-4000-8000-000000000001'),
  ('52300000-0000-4000-8000-000000000002', 'reservation-test-buffered', 'Reservation Test Buffered', 60, 15, 15, 0, 3650, '51000000-0000-4000-8000-000000000001'),
  ('52300000-0000-4000-8000-000000000003', 'reservation-test-event', 'Reservation Test Event', 60, 0, 0, 0, 3650, '51000000-0000-4000-8000-000000000002');

select is((select duration_minutes from public.services where code = 'debut'), 480,
  'Debut is explicitly a full-day event service');
select is((select duration_minutes from public.services where code = 'anniversary-celebration'), 480,
  'Anniversary Celebration is explicitly a full-day event service');

create temporary table reservation_test_times as
select d as test_date,
  (d + time '09:00') at time zone 'Asia/Manila' as at_0900,
  (d + time '09:30') at time zone 'Asia/Manila' as at_0930,
  (d + time '10:00') at time zone 'Asia/Manila' as at_1000,
  (d + time '11:00') at time zone 'Asia/Manila' as at_1100,
  (d + time '13:00') at time zone 'Asia/Manila' as at_1300,
  (d + time '14:00') at time zone 'Asia/Manila' as at_1400
from (
  select ((now() at time zone 'Asia/Manila')::date + offset_value)::date d
  from generate_series(10, 16) offset_value
  where extract(isodow from ((now() at time zone 'Asia/Manila')::date + offset_value)) = 1
  order by offset_value limit 1
) selected;
grant select on reservation_test_times to public;

set local role service_role;
select lives_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L, 'hold-shape-base', repeat('a',64), repeat('1',64))$$,
  (select at_0900 from reservation_test_times)), 'base hold is acquired');
select throws_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L, 'hold-shape-partial', repeat('b',64), repeat('2',64))$$,
  (select at_0930 from reservation_test_times)), '23P01', 'requested time is no longer available', 'partial overlap is rejected');
select throws_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000002', %L, 'hold-shape-containing', repeat('c',64), repeat('3',64))$$,
  (select at_0900 - interval '15 minutes' from reservation_test_times)), '23P01', 'requested time is no longer available', 'containing overlap is rejected');
select throws_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L, 'hold-shape-equal', repeat('d',64), repeat('4',64))$$,
  (select at_0900 from reservation_test_times)), '23P01', 'requested time is no longer available', 'equal overlap is rejected');
select lives_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L, 'hold-adjacent', repeat('e',64), repeat('5',64))$$,
  (select at_1000 from reservation_test_times)), 'adjacent ranges without buffers do not overlap');
select throws_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000002', %L, 'hold-buffer-collision', repeat('f',64), repeat('6',64))$$,
  (select at_1100 from reservation_test_times)), '23P01', 'requested time is no longer available', 'prep buffer collides with prior adjacent booking');
select lives_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000003', %L, 'hold-other-resource', repeat('0',64), repeat('7',64))$$,
  (select at_0900 from reservation_test_times)), 'same interval on another resource is allowed');

select is(
  (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', (select at_1300 from reservation_test_times),
    'hold-idempotent', repeat('1',64), repeat('8',64))->>'idempotent_replay')::boolean,
  false, 'first idempotent hold is new');
reset role;
create temporary table idempotent_expiry as
select expires_at from public.booking_reservations where idempotency_key = 'hold-idempotent';
grant select on idempotent_expiry to service_role;
set local role service_role;
select is(
  (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', (select at_1300 from reservation_test_times),
    'hold-idempotent', repeat('1',64), repeat('8',64))->>'idempotent_replay')::boolean,
  true, 'same key and fingerprint replays');
select is((public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
    (select at_1300 from reservation_test_times), 'hold-idempotent', repeat('1',64), repeat('8',64))->>'expires_at')::timestamptz,
  (select expires_at from idempotent_expiry), 'idempotent replay does not extend expiry');
select throws_ok($$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  (select at_1300 from reservation_test_times), 'hold-idempotent', repeat('2',64), repeat('8',64))$$,
  '22023', 'idempotency key was already used with a different request', 'changed fingerprint is rejected');

reset role;
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where idempotency_key = 'hold-idempotent';
set local role service_role;
select is(public.expire_booking_holds(), 1, 'expiry explicitly transitions the due hold');
reset role;
select is((select status from public.booking_reservations where idempotency_key = 'hold-idempotent'), 'expired', 'expired hold no longer blocks');
set local role service_role;
select lives_ok(format($$create temporary table hold_after_expiry as
  select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L,
    'hold-after-expiry', repeat('3',64), repeat('9',64))->>'reservation_id')::uuid as id$$,
  (select at_1300 from reservation_test_times)), 'expired interval can be reused');

create temporary table releasable_hold as
select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  (select at_1400 from reservation_test_times), 'hold-release-owned', repeat('4',64), repeat('a',64))->>'reservation_id')::uuid as id;
select is((public.release_booking_hold(
  (select id from releasable_hold), repeat('a',64))->>'status'),
  'released', 'owner can release an unlinked hold');
select throws_ok($$select public.release_booking_hold(
  (select id from hold_after_expiry), repeat('wrong',8))$$,
  'P0002', 'hold not found', 'wrong owner cannot release a hold');

reset role;
create temporary table stale_availability_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 14 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-stale-availability', repeat('d',64), repeat('d',64)
)->>'reservation_id')::uuid as id;
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from stale_availability_hold);
select ok((
  select (slot->>'available')::boolean
  from jsonb_array_elements(public.get_booking_availability(
    '52300000-0000-4000-8000-000000000001', (select test_date + 14 from reservation_test_times)
  )->'slots') slot
  where (slot->>'starts_at')::timestamptz =
    (((select test_date + 14 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila')
), 'timestamp-expired untransitioned hold does not appear unavailable');

create temporary table payment_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 7 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-payment-linked', repeat('8',64), repeat('b',64)
)->>'reservation_id')::uuid as id;
create temporary table payment_hold_expiry as
select expires_at from public.booking_reservations where id = (select id from payment_hold);
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status, reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000010', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-payment-hold', repeat('9',64), 'RES-PAYMENT-HOLD',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 7 from reservation_test_times), time '09:00', 'Studio', 'deposit', 10000, 10000,
  'inquiry', 'pending', (select id from payment_hold), repeat('b',64)
);
select is((select status from public.booking_reservations where id = (select id from payment_hold)),
  'held', 'online-payment inquiry preserves held status');
select is((select expires_at from public.booking_reservations where id = (select id from payment_hold)),
  (select expires_at from payment_hold_expiry), 'linking a payment hold does not extend expiry');
update public.bookings set status = 'confirmed' where id = '52400000-0000-4000-8000-000000000010';
select ok((select status = 'booked' and expires_at is null from public.booking_reservations
  where id = (select id from payment_hold)), 'confirmation converts the live hold to booked');

create temporary table cash_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 7 from reservation_test_times) + time '13:00') at time zone 'Asia/Manila',
  'hold-cash-linked', repeat('e',64), repeat('e',64)
)->>'reservation_id')::uuid as id;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000012', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-cash-hold', repeat('c',64), 'RES-CASH-HOLD',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 7 from reservation_test_times), time '13:00', 'Studio', 'cash', 10000, 10000,
  'inquiry', (select id from cash_hold), repeat('e',64)
);
select ok((select status = 'booked' and type = 'booking' and expires_at is null
  from public.booking_reservations where id = (select id from cash_hold)),
  'cash inquiry atomically converts its hold to booked');

create temporary table checkout_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 14 from reservation_test_times) + time '11:00') at time zone 'Asia/Manila',
  'hold-checkout-lifetime', repeat('f',64), repeat('f',64)
)->>'reservation_id')::uuid as id;
select lives_ok($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status, reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000029', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-checkout-lifetime', repeat('f',64), 'RES-CHECKOUT',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 14 from reservation_test_times), time '11:00', 'Studio', 'full', 10000, 10000,
  'inquiry', 'pending', (select id from checkout_hold), repeat('f',64)
)$$, 'online booking draft consumes its owned hold');
select lives_ok($$select public.activate_booking_checkout(
  '52400000-0000-4000-8000-000000000029', 'cs_reservation_test', 'https://checkout.test/session',
  (select created_at + interval '20 minutes' from public.booking_reservations where id = (select id from checkout_hold)))$$,
  'checkout activation succeeds while the hold is live and within its cap');
select is((select status from public.booking_reservations where id = (select id from checkout_hold)),
  'booked', 'pending checkout is protected for the provider checkout lifetime');
select is((public.release_failed_booking_checkout(
  '52400000-0000-4000-8000-000000000029', 'cs_reservation_test', 'failed')->>'released')::boolean,
  true, 'verified checkout failure releases the reservation');
select lives_ok(format(
  $$select public.acquire_booking_hold('52300000-0000-4000-8000-000000000001', %L,
    'hold-after-checkout-failure', repeat('0',64), repeat('0',64))$$,
  (((select test_date + 14 from reservation_test_times) + time '11:00') at time zone 'Asia/Manila')),
  'failed checkout interval can be reserved again');

create temporary table expiring_linked_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 7 from reservation_test_times) + time '11:00') at time zone 'Asia/Manila',
  'hold-payment-expiring', repeat('a',64), repeat('c',64)
)->>'reservation_id')::uuid as id;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000011', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-expired-hold', repeat('b',64), 'RES-EXPIRED-HOLD',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 7 from reservation_test_times), time '11:00', 'Studio', 'paymongo', 10000, 10000,
  'inquiry', (select id from expiring_linked_hold), repeat('c',64)
);
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from expiring_linked_hold);
select is(public.expire_booking_holds(), 1, 'linked payment hold is explicitly expired');
select throws_ok($$update public.bookings set status = 'confirmed'
  where id = '52400000-0000-4000-8000-000000000011'$$,
  '23P01', 'linked reservation hold expired before booking activation', 'expired linked hold cannot confirm');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000013', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-direct-inquiry', repeat('d',64), 'RES-DIRECT-INQUIRY',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 7 from reservation_test_times), time '16:00', 'Studio', 'full', 10000, 10000, 'inquiry'
);
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000013'),
  'booked', 'direct staff or reward inquiry without a hold is atomically protected');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000001', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-cancellation-test', repeat('5',64), 'RES-CANCEL',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date from reservation_test_times), time '16:00', 'Studio', 'cash', 10000, 10000, 'confirmed'
);
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000001'),
  'booked', 'confirmed booking creates a booked reservation');
update public.bookings set status = 'cancelled', cancellation_reason = 'Customer request'
where id = '52400000-0000-4000-8000-000000000001';
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000001'),
  'released', 'cancellation releases without deleting the booking');
select ok((select cancelled_at is not null and cancellation_reason = 'Customer request' from public.bookings
  where id = '52400000-0000-4000-8000-000000000001'), 'cancellation metadata is retained');
update public.bookings set status = 'confirmed' where id = '52400000-0000-4000-8000-000000000001';
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000001'),
  'booked', 'reopening reacquires the interval');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000002', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-reschedule-blocker', repeat('6',64), 'RES-BLOCKER',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 1 from reservation_test_times), time '10:00', 'Studio', 'cash', 10000, 10000, 'confirmed'
), (
  '52400000-0000-4000-8000-000000000003', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-reschedule-source', repeat('7',64), 'RES-SOURCE',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 1 from reservation_test_times), time '12:00', 'Studio', 'cash', 10000, 10000, 'confirmed'
);
select throws_ok($$update public.bookings set service_time = time '10:30'
  where id = '52400000-0000-4000-8000-000000000003'$$,
  '23P01', 'booking schedule conflicts with an existing reservation', 'conflicting reschedule fails atomically');
select is((select service_time from public.bookings where id = '52400000-0000-4000-8000-000000000003'),
  time '12:00', 'failed reschedule leaves booking schedule unchanged');
select is((select starts_at from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000003'),
  ((select test_date + 1 from reservation_test_times) + time '12:00') at time zone 'Asia/Manila',
  'failed reschedule leaves reservation unchanged');
update public.bookings set service_time = time '13:00'
where id = '52400000-0000-4000-8000-000000000003';
select ok((select count(*) >= 2 from public.booking_schedule_history
  where booking_id = '52400000-0000-4000-8000-000000000003'), 'successful reschedule appends history');

select throws_ok(format($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000020', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-before-hours', repeat('1',64), 'RES-BEFORE-HOURS',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001', %L, time '07:00',
  'Studio', 'cash', 10000, 10000, 'inquiry'
)$$, (select test_date + 21 from reservation_test_times)),
  '22023', 'booking schedule is not allowed', 'active booking outside business hours is rejected');

insert into public.booking_resource_blackouts (resource_id, starts_at, ends_at, reason)
values (
  '51000000-0000-4000-8000-000000000001',
  ((select test_date + 21 from reservation_test_times) + time '14:00') at time zone 'Asia/Manila',
  ((select test_date + 21 from reservation_test_times) + time '15:00') at time zone 'Asia/Manila',
  'pgTAP blackout'
);
select throws_ok(format($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000021', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-blackout-test', repeat('2',64), 'RES-BLACKOUT',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001', %L, time '14:00',
  'Studio', 'cash', 10000, 10000, 'inquiry'
)$$, (select test_date + 21 from reservation_test_times)),
  '23P01', 'booking schedule is unavailable', 'active booking overlapping a blackout is rejected');

update public.services set minimum_notice_minutes = 100000
where id = '52300000-0000-4000-8000-000000000001';
select throws_ok(format($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000022', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-notice-test', repeat('3',64), 'RES-NOTICE',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001', %L, time '15:00',
  'Studio', 'cash', 10000, 10000, 'inquiry'
)$$, (select test_date + 21 from reservation_test_times)),
  '22023', 'booking schedule is not allowed', 'active booking violating minimum notice is rejected');
update public.services set minimum_notice_minutes = 0
where id = '52300000-0000-4000-8000-000000000001';

select throws_ok(format($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000023', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-advance-test', repeat('4',64), 'RES-ADVANCE',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001', %L, time '10:00',
  'Studio', 'cash', 10000, 10000, 'inquiry'
)$$, ((now() at time zone 'Asia/Manila')::date + 3651)),
  '22023', 'booking schedule is not allowed', 'active booking beyond maximum advance is rejected');

select lives_ok($$select public.reschedule_booking(
  'RES-SOURCE', (select test_date + 1 from reservation_test_times), time '14:00',
  '51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001',
  'Client requested a later slot'
)$$, 'service role reschedules through the canonical booking trigger');
select ok((select service_time = time '14:00' from public.bookings where reference = 'RES-SOURCE'),
  'reschedule RPC updates the legacy-compatible schedule');
select ok((select actor_user_id = '52000000-0000-4000-8000-000000000001'
  and reason = 'Client requested a later slot' from public.booking_schedule_history
  where booking_id = '52400000-0000-4000-8000-000000000003' order by id desc limit 1),
  'reschedule history uses the RPC actor and reason');
select ok((select actor_id = '52000000-0000-4000-8000-000000000001'
  and metadata->>'reason' = 'Client requested a later slot' from public.staff_audit_log
  where entity_id = '52400000-0000-4000-8000-000000000003' and event = 'Booking rescheduled'
  order by id desc limit 1), 'reschedule appends staff audit');

select lives_ok($$select public.update_booking_status(
  'RES-SOURCE', 'cancelled', '52000000-0000-4000-8000-000000000001', 'Customer cancelled after reschedule'
)$$, 'status RPC cancels through the canonical booking trigger');
select ok((select status = 'cancelled' and cancellation_reason = 'Customer cancelled after reschedule'
  and cancellation_actor_id = '52000000-0000-4000-8000-000000000001' and cancelled_at is not null
  from public.bookings where reference = 'RES-SOURCE'), 'status RPC preserves booking and cancellation metadata');
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000003'),
  'released', 'status RPC cancellation releases the reservation');
select ok((select actor_id = '52000000-0000-4000-8000-000000000001'
  and metadata->>'reason' = 'Customer cancelled after reschedule' from public.staff_audit_log
  where entity_id = '52400000-0000-4000-8000-000000000003' and event = 'Booking status updated'
  order by id desc limit 1), 'status RPC appends actor-attributed audit');
select throws_ok($$select public.update_booking_status(
  'RES-NEWER-OWNER', 'not-a-status', '52000000-0000-4000-8000-000000000001', 'Invalid test'
)$$, '22023', 'invalid booking status request', 'status RPC rejects values outside the booking status enum');

create temporary table late_success_hold as
select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  ((select test_date + 49 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-late-success', repeat('5',64), repeat('5',64))->>'reservation_id')::uuid id;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status,
  reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000030', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-late-success', repeat('5',64), 'RES-LATE-SUCCESS',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 49 from reservation_test_times), time '09:00', 'Studio', 'deposit', 10000, 10000,
  'inquiry', 'paid', (select id from late_success_hold), repeat('5',64)
);
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from late_success_hold);
do $$ begin perform public.expire_booking_holds(); end $$;
select lives_ok($$select public.update_booking_status(
  'RES-LATE-SUCCESS', 'confirmed', '52000000-0000-4000-8000-000000000001', 'Late paid webhook'
)$$, 'late paid confirmation reacquires an unassigned expired interval');
select is((select status from public.booking_reservations where id = (select id from late_success_hold)),
  'booked', 'late paid reacquisition becomes booked');

create temporary table late_conflict_hold as
select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  ((select test_date + 49 from reservation_test_times) + time '11:00') at time zone 'Asia/Manila',
  'hold-late-conflict', repeat('6',64), repeat('6',64))->>'reservation_id')::uuid id;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status,
  reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000031', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-late-conflict', repeat('6',64), 'RES-LATE-CONFLICT',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 49 from reservation_test_times), time '11:00', 'Studio', 'deposit', 10000, 10000,
  'inquiry', 'paid', (select id from late_conflict_hold), repeat('6',64)
);
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from late_conflict_hold);
do $$ begin perform public.expire_booking_holds(); end $$;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000032', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-newer-owner', repeat('7',64), 'RES-NEWER-OWNER',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 49 from reservation_test_times), time '11:00', 'Studio', 'cash', 10000, 10000, 'inquiry'
);
select throws_ok($$select public.update_booking_status(
  'RES-LATE-CONFLICT', 'confirmed', '52000000-0000-4000-8000-000000000001', 'Late conflicting webhook'
)$$, '23P01', 'booking schedule conflicts with an existing reservation',
  'late paid confirmation cannot displace a newer reservation');
select ok((select status = 'inquiry' from public.bookings where reference = 'RES-LATE-CONFLICT'),
  'failed late confirmation leaves original booking unchanged');
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000032'),
  'booked', 'newer reservation remains booked after late conflict');

select is((public.enqueue_provider_webhook_event('paymongo', 'evt-reservation-1',
  'checkout_session.payment.paid', repeat('9',64), '{"safe":true}') ->> 'status'),
  'pending', 'webhook event is durably enqueued');
select lives_ok($$select public.enqueue_provider_webhook_event('paymongo', 'evt-reservation-1',
  'checkout_session.payment.paid', repeat('9',64), '{"safe":true}')$$,
  'same webhook event and fingerprint is idempotent');
select is((select count(*)::integer from public.provider_webhook_inbox
  where provider = 'paymongo' and event_id = 'evt-reservation-1'), 1, 'webhook idempotency stores one inbox row');
select throws_ok($$select public.enqueue_provider_webhook_event('paymongo', 'evt-reservation-1',
  'checkout_session.payment.paid', repeat('0',64), '{"safe":true}')$$,
  '22023', 'provider event id was reused with different content', 'changed webhook fingerprint is rejected');
select is((public.finish_provider_webhook_event('paymongo', 'evt-reservation-1', false, 'temporary failure')->>'status'),
  'failed', 'webhook failure is durably recorded for retry');

create temporary table extension_hold as
select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  ((select test_date + 56 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-extension-test', repeat('8',64), repeat('8',64))->>'reservation_id')::uuid id;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status,
  reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000033', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-extension-test', repeat('8',64), 'RES-EXTENSION',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 56 from reservation_test_times), time '09:00', 'Studio', 'deposit', 10000, 10000,
  'inquiry', 'pending', (select id from extension_hold), repeat('8',64)
);
select lives_ok($$select public.extend_booking_hold_for_checkout(
  '52400000-0000-4000-8000-000000000033',
  (select created_at + interval '20 minutes' from public.booking_reservations where id = (select id from extension_hold))
)$$, 'checkout RPC extends a linked live hold forward');
select throws_ok($$select public.extend_booking_hold_for_checkout(
  '52400000-0000-4000-8000-000000000033',
  (select created_at + interval '31 minutes' from public.booking_reservations where id = (select id from extension_hold))
)$$, '22023', 'checkout hold extension is outside the allowed window', 'checkout extension is capped at thirty minutes');
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from extension_hold);
select throws_ok($$select public.extend_booking_hold_for_checkout(
  '52400000-0000-4000-8000-000000000033', clock_timestamp() + interval '1 minute'
)$$, '22023', 'active linked hold not found', 'expired hold cannot be renewed');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status, paymongo_checkout_session_id
) values (
  '52400000-0000-4000-8000-000000000034', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-legacy-expiry', repeat('a',64), 'RES-LEGACY-EXPIRY',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 63 from reservation_test_times), time '09:00', 'Studio', 'deposit', 10000, 10000,
  'inquiry', 'pending', 'cs_legacy_expiry'
);
select lives_ok($$select public.expire_legacy_paymongo_booking('cs_legacy_expiry', 'Provider checkout expired')$$,
  'legacy checkout expiry RPC completes');
select ok((select status = 'cancelled' and payment_status = 'failed' and cancelled_at is not null
  and cancellation_reason like 'PayMongo checkout failed or expired:%'
  from public.bookings where reference = 'RES-LEGACY-EXPIRY'), 'legacy expiry preserves booking with structured cancellation');
select is((select status from public.booking_reservations where booking_id = '52400000-0000-4000-8000-000000000034'),
  'released', 'legacy expiry releases the canonical reservation');
select lives_ok($$select public.expire_legacy_paymongo_booking('cs_legacy_expiry', 'Duplicate delivery')$$,
  'duplicate legacy expiry is idempotent');
select is((select count(*)::integer from public.staff_audit_log
  where entity_id = '52400000-0000-4000-8000-000000000034' and event = 'Legacy booking checkout expired'),
  1, 'duplicate legacy expiry appends no duplicate audit');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, payment_status, paymongo_checkout_session_id
) values (
  '52400000-0000-4000-8000-000000000035', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-legacy-protected', repeat('b',64), 'RES-LEGACY-PROTECTED',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 63 from reservation_test_times), time '11:00', 'Studio', 'deposit', 10000, 10000,
  'confirmed', 'paid', 'cs_legacy_protected'
);
select lives_ok($$select public.expire_legacy_paymongo_booking('cs_legacy_protected', 'Late expired event')$$,
  'legacy expiry safely accepts an event for a protected booking');
select ok((select status = 'confirmed' and payment_status = 'paid' from public.bookings
  where reference = 'RES-LEGACY-PROTECTED'), 'legacy expiry never cancels a confirmed paid booking');

insert into public.loyalty_rewards
  (id, client_id, program_id, sequence, threshold, service_id, status)
values
  ('52600000-0000-4000-8000-000000000001', '52100000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', 901, 8, '10000000-0000-4000-8000-000000000002', 'available'),
  ('52600000-0000-4000-8000-000000000002', '52100000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', 902, 8, '10000000-0000-4000-8000-000000000002', 'available'),
  ('52600000-0000-4000-8000-000000000003', '52100000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', 903, 8, '10000000-0000-4000-8000-000000000002', 'available'),
  ('52600000-0000-4000-8000-000000000004', '52100000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', 904, 8, '10000000-0000-4000-8000-000000000002', 'available');

create temporary table reward_success_hold as
select (public.acquire_booking_hold('10000000-0000-4000-8000-000000000002',
  ((select test_date + 91 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-reward-success', repeat('5',64), repeat('g',64))->>'reservation_id')::uuid id;
select lives_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000001', 'reward-hold-booking-success', 'RES-REWARD-HOLD',
  (select test_date + 91 from reservation_test_times), time '09:00', 'Studio',
  (select id from reward_success_hold), repeat('g',64)
)$$, 'reward booking atomically consumes its canonical hold');
select ok((select kind = 'reward' and reward_id = '52600000-0000-4000-8000-000000000001'
  and reservation_hold_id = (select id from reward_success_hold)
  and reservation_owner_token_hash is null from public.bookings where reference = 'RES-REWARD-HOLD'),
  'reward booking preserves loyalty linkage and consumes the owner proof');
select is((select status from public.booking_reservations where id = (select id from reward_success_hold)),
  'booked', 'loyalty reward hold converts immediately to booked');
select is((select status::text from public.loyalty_rewards where id = '52600000-0000-4000-8000-000000000001'),
  'reserved', 'successful hold conversion reserves the reward');
select is((select count(*)::integer from public.loyalty_audit_log
  where entity_id = '52600000-0000-4000-8000-000000000001' and action = 'reward.customer_reserved'),
  1, 'successful reward booking appends one loyalty audit');
select lives_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000001', 'reward-hold-booking-success', 'RES-REWARD-HOLD',
  (select test_date + 91 from reservation_test_times), time '09:00', 'Studio',
  (select id from reward_success_hold), repeat('g',64)
)$$, 'exact reward booking replay returns the existing booking');
select ok((select count(*) = 1 from public.bookings where idempotency_key = 'reward-hold-booking-success')
  and (select count(*) = 1 from public.loyalty_audit_log
    where entity_id = '52600000-0000-4000-8000-000000000001' and action = 'reward.customer_reserved'),
  'reward booking replay neither duplicates booking nor audit');
select throws_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000001', 'reward-hold-booking-success', 'RES-REWARD-HOLD',
  (select test_date + 91 from reservation_test_times), time '09:00', 'Changed location',
  (select id from reward_success_hold), repeat('g',64)
)$$, '23505', 'reward booking idempotency conflict', 'changed reward booking intent is rejected');

create temporary table reward_expired_hold as
select (public.acquire_booking_hold('10000000-0000-4000-8000-000000000002',
  ((select test_date + 98 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-reward-expired', repeat('6',64), repeat('h',64))->>'reservation_id')::uuid id;
update public.booking_reservations set expires_at = clock_timestamp() - interval '1 second'
where id = (select id from reward_expired_hold);
do $$ begin perform public.expire_booking_holds(); end $$;
select throws_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000002', 'reward-hold-booking-expired', 'RES-REWARD-EXPIRED',
  (select test_date + 98 from reservation_test_times), time '09:00', 'Studio',
  (select id from reward_expired_hold), repeat('h',64)
)$$, '23P01', 'reservation hold is expired, owned by another request, or does not match the booking',
  'expired hold rejects reward booking atomically');
select ok((select status = 'available' from public.loyalty_rewards where id = '52600000-0000-4000-8000-000000000002')
  and not exists (select 1 from public.bookings where idempotency_key = 'reward-hold-booking-expired'),
  'expired hold rollback preserves reward availability');

create temporary table reward_wrong_owner_hold as
select (public.acquire_booking_hold('10000000-0000-4000-8000-000000000002',
  ((select test_date + 105 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-reward-owner', repeat('7',64), repeat('i',64))->>'reservation_id')::uuid id;
select throws_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000003', 'reward-hold-booking-owner', 'RES-REWARD-OWNER',
  (select test_date + 105 from reservation_test_times), time '09:00', 'Studio',
  (select id from reward_wrong_owner_hold), repeat('j',64)
)$$, '23P01', 'reservation hold is expired, owned by another request, or does not match the booking',
  'wrong hold owner rejects reward booking atomically');
select ok((select status = 'available' from public.loyalty_rewards where id = '52600000-0000-4000-8000-000000000003')
  and not exists (select 1 from public.bookings where idempotency_key = 'reward-hold-booking-owner'),
  'wrong-owner rollback preserves reward availability');

create temporary table reward_conflicting_hold as
select (public.acquire_booking_hold('52300000-0000-4000-8000-000000000001',
  ((select test_date + 112 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-reward-conflict', repeat('8',64), repeat('k',64))->>'reservation_id')::uuid id;
select throws_ok($$select public.loyalty_create_reward_booking_with_hold(
  '52100000-0000-4000-8000-000000000001', '52200000-0000-4000-8000-000000000001',
  '52600000-0000-4000-8000-000000000004', 'reward-hold-booking-conflict', 'RES-REWARD-CONFLICT',
  (select test_date + 112 from reservation_test_times), time '09:00', 'Studio',
  (select id from reward_conflicting_hold), repeat('k',64)
)$$, '23P01', 'reservation hold is expired, owned by another request, or does not match the booking',
  'mismatched service hold rejects reward booking atomically');
select ok((select status = 'available' from public.loyalty_rewards where id = '52600000-0000-4000-8000-000000000004')
  and not exists (select 1 from public.bookings where idempotency_key = 'reward-hold-booking-conflict'),
  'hold conflict rollback preserves reward availability');

select is((public.get_booking_availability(
  '52300000-0000-4000-8000-000000000001',
  (select test_date + 126 from reservation_test_times), null, 120
)->>'duration_minutes')::integer, 120, 'availability reports the effective extended duration');
create temporary table extended_duration_hold as
select (public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 126 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-extended-duration', repeat('9',64), repeat('l',64), null, null, 120
)->>'reservation_id')::uuid id;
select lives_ok($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, duration_minutes_snapshot,
  reservation_hold_id, reservation_owner_token_hash
) values (
  '52400000-0000-4000-8000-000000000060', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-extended-duration', repeat('9',64), 'RES-EXTENDED-DURATION',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 126 from reservation_test_times), time '09:00', 'Studio', 'cash', 10000, 10000,
  'inquiry', 120, (select id from extended_duration_hold), repeat('l',64)
)$$, 'booking trigger accepts and consumes a matching extended-duration hold');
select ok((select b.duration_minutes_snapshot = 120
  and extract(epoch from b.ends_at - b.starts_at) / 60 = 120
  and r.ends_at = b.ends_at and r.status = 'booked'
  from public.bookings b join public.booking_reservations r on r.booking_id = b.id
  where b.reference = 'RES-EXTENDED-DURATION'), 'canonical booking preserves the effective duration snapshot and end');
select throws_ok($$select public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 126 from reservation_test_times) + time '10:00') at time zone 'Asia/Manila',
  'hold-overlap-extended-duration', repeat('a',64), repeat('m',64)
)$$, '23P01', 'requested time is no longer available', 'extended duration blocks overlap beyond the base service end');
select throws_ok($$select public.acquire_booking_hold(
  '52300000-0000-4000-8000-000000000001',
  ((select test_date + 133 from reservation_test_times) + time '09:00') at time zone 'Asia/Manila',
  'hold-short-duration', repeat('b',64), repeat('n',64), null, null, 30
)$$, '22023', 'invalid requested duration', 'hold RPC rejects duration shorter than the service');
select throws_ok($$insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status, duration_minutes_snapshot
) values (
  '52400000-0000-4000-8000-000000000061', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'booking-short-duration', repeat('b',64), 'RES-SHORT-DURATION',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 133 from reservation_test_times), time '09:00', 'Studio', 'cash', 10000, 10000,
  'inquiry', 30
)$$, '22023', 'invalid booking duration', 'booking trigger rejects an explicit shorter duration snapshot');

create temporary table linked_booking_payloads as
select jsonb_build_object(
    'client_id', '52100000-0000-4000-8000-000000000001',
    'client_profile_id', '52200000-0000-4000-8000-000000000001',
    'idempotency_key', 'linked-studio-success', 'request_fingerprint', repeat('c',64),
    'reference', 'RES-LINK-STUDIO', 'service_type', 'Reservation Test Studio',
    'service_id', '52300000-0000-4000-8000-000000000001',
    'service_date', to_char((select test_date + 70 from reservation_test_times), 'YYYY-MM-DD'),
    'service_time', '09:00', 'location', 'Studio', 'payment_type', 'cash',
    'subtotal_amount_php', 10000, 'total_amount_php', 10000, 'duration_minutes_snapshot', 120
  ) studio,
  jsonb_build_object(
    'client_id', '52100000-0000-4000-8000-000000000001',
    'client_profile_id', '52200000-0000-4000-8000-000000000001',
    'idempotency_key', 'linked-event-success', 'request_fingerprint', repeat('d',64),
    'reference', 'RES-LINK-EVENT', 'service_type', 'Reservation Test Event',
    'service_id', '52300000-0000-4000-8000-000000000003',
    'service_date', to_char((select test_date + 70 from reservation_test_times), 'YYYY-MM-DD'),
    'service_time', '10:00', 'location', 'Event Venue', 'payment_type', 'cash',
    'subtotal_amount_php', 20000, 'total_amount_php', 20000, 'duration_minutes_snapshot', 60
  ) event_payload;
select lives_ok($$create temporary table linked_booking_result as
  select public.create_linked_booking_pair(studio, event_payload) result from linked_booking_payloads$$,
  'linked package RPC creates both bookings atomically');
select ok((select result->>'studio_reference' = 'RES-LINK-STUDIO'
  and result->>'event_reference' = 'RES-LINK-EVENT'
  and result->>'studio_id' is not null and result->>'event_id' is not null from linked_booking_result),
  'linked package RPC returns both IDs and references');
select ok((select studio.linked_booking_id = event_booking.id and event_booking.linked_booking_id = studio.id
  from public.bookings studio join public.bookings event_booking on event_booking.reference = 'RES-LINK-EVENT'
  where studio.reference = 'RES-LINK-STUDIO'), 'linked package bookings are reciprocal');
select is((select count(*)::integer from public.booking_reservations r join public.bookings b on b.id = r.booking_id
  where b.reference in ('RES-LINK-STUDIO', 'RES-LINK-EVENT') and r.status = 'booked'),
  2, 'both linked bookings receive canonical reservations');
select ok((select b.duration_minutes_snapshot = 120
  and extract(epoch from b.ends_at - b.starts_at) / 60 = 120
  and r.ends_at = b.ends_at
  from public.bookings b join public.booking_reservations r on r.booking_id = b.id
  where b.reference = 'RES-LINK-STUDIO'),
  'linked studio booking protects its Additional Hour duration');
select ok((select (public.create_linked_booking_pair(studio, event_payload)->>'idempotent_replay')::boolean
  from linked_booking_payloads), 'exact linked package replay returns the existing pair');
select throws_ok($$select public.create_linked_booking_pair(
  jsonb_set(studio, '{request_fingerprint}', to_jsonb(repeat('e',64))), event_payload
) from linked_booking_payloads$$, '23505', 'linked booking idempotency conflict',
  'changed linked package fingerprint is rejected');
select throws_ok($$select public.create_linked_booking_pair(studio - 'total_amount_php', event_payload)
  from linked_booking_payloads$$, '22023', 'invalid linked booking request',
  'linked package payload requires validated amount fields');
select throws_ok($$select public.create_linked_booking_pair(studio - 'duration_minutes_snapshot', event_payload)
  from linked_booking_payloads$$, '22023', 'invalid linked booking request',
  'linked package payload requires a duration snapshot');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000049', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'linked-one-side-existing', repeat('3',64), 'RES-LINK-ONE-SIDE',
  'Reservation Test Studio', '52300000-0000-4000-8000-000000000001',
  (select test_date + 84 from reservation_test_times), time '09:00', 'Studio', 'cash', 10000, 10000, 'inquiry'
);
select throws_ok($$select public.create_linked_booking_pair(
  jsonb_build_object(
    'client_id','52100000-0000-4000-8000-000000000001','client_profile_id','52200000-0000-4000-8000-000000000001',
    'idempotency_key','linked-one-side-existing','request_fingerprint',repeat('3',64),'reference','RES-LINK-ONE-SIDE',
    'service_type','Reservation Test Studio','service_id','52300000-0000-4000-8000-000000000001',
    'service_date',to_char((select test_date + 84 from reservation_test_times),'YYYY-MM-DD'),'service_time','09:00',
    'location','Studio','payment_type','cash','subtotal_amount_php',10000,'total_amount_php',10000,
    'duration_minutes_snapshot',60),
  jsonb_build_object(
    'client_id','52100000-0000-4000-8000-000000000001','client_profile_id','52200000-0000-4000-8000-000000000001',
    'idempotency_key','linked-one-side-new','request_fingerprint',repeat('4',64),'reference','RES-LINK-ONE-SIDE-NEW',
    'service_type','Reservation Test Event','service_id','52300000-0000-4000-8000-000000000003',
    'service_date',to_char((select test_date + 84 from reservation_test_times),'YYYY-MM-DD'),'service_time','10:00',
    'location','Event Venue','payment_type','cash','subtotal_amount_php',20000,'total_amount_php',20000,
    'duration_minutes_snapshot',60)
)$$, '23505', 'linked booking idempotency conflict', 'one-sided linked idempotency state is rejected');
select is((select count(*)::integer from public.bookings where idempotency_key = 'linked-one-side-new'), 0,
  'one-sided idempotency conflict inserts no missing counterpart');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, status
) values (
  '52400000-0000-4000-8000-000000000050', '52100000-0000-4000-8000-000000000001',
  '52200000-0000-4000-8000-000000000001', 'linked-conflict-blocker', repeat('f',64), 'RES-LINK-BLOCKER',
  'Reservation Test Event', '52300000-0000-4000-8000-000000000003',
  (select test_date + 77 from reservation_test_times), time '10:00', 'Event Venue', 'cash', 10000, 10000, 'inquiry'
);
select throws_ok($$select public.create_linked_booking_pair(
  jsonb_build_object(
    'client_id','52100000-0000-4000-8000-000000000001','client_profile_id','52200000-0000-4000-8000-000000000001',
    'idempotency_key','linked-studio-rollback','request_fingerprint',repeat('1',64),'reference','RES-LINK-ROLLBACK-STUDIO',
    'service_type','Reservation Test Studio','service_id','52300000-0000-4000-8000-000000000001',
    'service_date',to_char((select test_date + 77 from reservation_test_times),'YYYY-MM-DD'),'service_time','09:00',
    'location','Studio','payment_type','cash','subtotal_amount_php',10000,'total_amount_php',10000,
    'duration_minutes_snapshot',60),
  jsonb_build_object(
    'client_id','52100000-0000-4000-8000-000000000001','client_profile_id','52200000-0000-4000-8000-000000000001',
    'idempotency_key','linked-event-rollback','request_fingerprint',repeat('2',64),'reference','RES-LINK-ROLLBACK-EVENT',
    'service_type','Reservation Test Event','service_id','52300000-0000-4000-8000-000000000003',
    'service_date',to_char((select test_date + 77 from reservation_test_times),'YYYY-MM-DD'),'service_time','10:00',
    'location','Event Venue','payment_type','cash','subtotal_amount_php',20000,'total_amount_php',20000,
    'duration_minutes_snapshot',60)
)$$, '23P01', 'booking schedule conflicts with an existing reservation',
  'event-side interval conflict rolls back the linked package call');
select is((select count(*)::integer from public.bookings
  where idempotency_key in ('linked-studio-rollback','linked-event-rollback')), 0,
  'linked package conflict leaves neither side inserted');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select ok(not has_table_privilege('authenticated', 'public.booking_reservations', 'INSERT'), 'authenticated cannot insert reservations');
select is((select count(*)::integer from public.booking_reservations), 0, 'customer cannot read reservations');
select lives_ok($$select public.get_booking_availability('52300000-0000-4000-8000-000000000001',
  (select test_date from reservation_test_times))$$, 'public availability RPC is callable');
select ok(not has_function_privilege('authenticated',
  'public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer)', 'EXECUTE'), 'hold mutation RPC is service-only');
select ok(not has_function_privilege('authenticated',
  'public.reschedule_booking(text,date,time,uuid,uuid,text)', 'EXECUTE'), 'booking lifecycle RPCs are service-only');
select ok(not has_function_privilege('authenticated',
  'public.enqueue_provider_webhook_event(text,text,text,text,jsonb)', 'EXECUTE'), 'webhook inbox RPCs are service-only');
select ok(not has_function_privilege('authenticated',
  'public.create_linked_booking_pair(jsonb,jsonb)', 'EXECUTE'), 'linked package creation RPC is service-only');
select ok(not has_function_privilege('authenticated',
  'public.loyalty_create_reward_booking_with_hold(uuid,uuid,uuid,text,text,date,time,text,uuid,text)', 'EXECUTE'),
  'hold-aware reward booking RPC is not customer callable');
select ok(has_function_privilege('service_role',
  'public.create_linked_booking_pair(jsonb,jsonb)', 'EXECUTE'), 'service role can execute linked package creation RPC');
select ok(has_function_privilege('service_role',
  'public.loyalty_create_reward_booking_with_hold(uuid,uuid,uuid,text,text,date,time,text,uuid,text)', 'EXECUTE'),
  'service role can execute hold-aware reward booking RPC');
select ok(not has_table_privilege('authenticated', 'public.provider_webhook_inbox', 'SELECT'),
  'authenticated users cannot read the webhook inbox');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok((select count(*) > 0 from public.booking_reservations), 'authorized staff can safely read reservation records');
reset role;
select ok(not has_table_privilege('service_role', 'public.booking_reservations', 'INSERT'), 'service role has no direct reservation mutation grant');
select ok(not has_table_privilege('service_role', 'public.provider_webhook_inbox', 'INSERT'),
  'service role writes webhook inbox only through RPCs');

select * from finish();
rollback;
