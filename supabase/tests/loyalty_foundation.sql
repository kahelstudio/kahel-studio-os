begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'assertion failed: %', message; end if;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff@kahel.test', '', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@kahel.test', '', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@kahel.test', '', now(), now());

insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards)
values ('a0000000-0000-4000-8000-000000000001', 'admin', 'Test Admin', true, true, true);

insert into public.clients (id, external_ref, name) values
  ('b0000000-0000-4000-8000-000000000001', 'TEST-CLIENT-1', 'Client One'),
  ('b0000000-0000-4000-8000-000000000002', 'TEST-CLIENT-2', 'Client Two');

insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'one@kahel.test', 'Client', 'One'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'two@kahel.test', 'Client', 'Two');

update public.clients c set primary_contact_profile_id = p.id
from public.client_profiles p where p.client_id = c.id and c.id in (
  'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'
);

select pg_temp.assert_true((
  select active and threshold = 8 and launch_date = date '2026-09-01'
    and not retroactive and expires_after is null
    and reward_service_id = '10000000-0000-4000-8000-000000000002'
  from public.loyalty_programs where code = 'kahel-loyalty'
), 'seeded launch policy is canonical');
select pg_temp.assert_true((
  select name = 'Complimentary Solo Session'
  from public.services where id = '10000000-0000-4000-8000-000000000002'
), 'reward service is Complimentary Solo Session');

-- Eight qualifying completions issue exactly one reward and one email.
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, reference, service_type, service_id,
  service_date, service_time, location, payment_type, subtotal_amount_php,
  total_amount_php, paid_amount_php, status, completed_at
)
select ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
  'loyalty-test-key-' || n, 'LOYALTY-TEST-' || n, 'Solo Session',
  '10000000-0000-4000-8000-000000000001', date '2026-09-01' + n,
  time '09:00', 'Studio', 'cash', 100000, 100000, 100000, 'completed',
  timestamptz '2026-09-01 12:00:00+08' + n * interval '1 day'
from generate_series(1, 8) n;

select pg_temp.assert_true((select count(*) = 8 from public.loyalty_booking_events where client_id = 'b0000000-0000-4000-8000-000000000001' and delta = 1), 'eight bookings count once');
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_rewards where client_id = 'b0000000-0000-4000-8000-000000000001'), 'threshold 8 issues first reward');
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_email_outbox where client_id = 'b0000000-0000-4000-8000-000000000001'), 'one outbox row per reward');

-- Reconciliation is idempotent.
select public.loyalty_reconcile_booking('d0000000-0000-4000-8000-000000000008');
select public.loyalty_reconcile_booking('d0000000-0000-4000-8000-000000000008');
select pg_temp.assert_true((select count(*) = 8 from public.loyalty_booking_events where client_id = 'b0000000-0000-4000-8000-000000000001'), 'repeated reconcile adds no event');
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_email_outbox where client_id = 'b0000000-0000-4000-8000-000000000001'), 'repeated reconcile adds no email');

-- Sixteen net completions issue sequence two, once.
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, reference, service_type, service_id,
  service_date, service_time, location, payment_type, subtotal_amount_php,
  total_amount_php, paid_amount_php, status, completed_at
)
select ('d0000000-0000-4000-8001-' || lpad(n::text, 12, '0'))::uuid,
  'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
  'loyalty-test-key-next-' || n, 'LOYALTY-TEST-NEXT-' || n, 'Solo Session',
  '10000000-0000-4000-8000-000000000001', date '2026-10-01' + n,
  time '09:00', 'Studio', 'cash', 100000, 100000, 100000, 'completed',
  timestamptz '2026-10-01 12:00:00+08' + n * interval '1 day'
from generate_series(1, 8) n;
select pg_temp.assert_true((select array_agg(sequence order by sequence) = array[1,2] from public.loyalty_rewards where client_id = 'b0000000-0000-4000-8000-000000000001'), 'threshold 16 issues second reward');
select pg_temp.assert_true((select count(*) = 2 from public.loyalty_email_outbox where client_id = 'b0000000-0000-4000-8000-000000000001'), 'second reward has exactly one email');

-- A full refund appends -1, preserves rewards, and flags review.
update public.bookings set refunded_amount_php = paid_amount_php
where id = 'd0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_booking_events where booking_id = 'd0000000-0000-4000-8000-000000000001' and delta = -1), 'refund appends reversal');
select pg_temp.assert_true((select count(*) = 2 and bool_and(review_required) from public.loyalty_rewards where client_id = 'b0000000-0000-4000-8000-000000000001'), 'reversal preserves and flags rewards');
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_audit_log where action = 'booking.loyalty_reversed' and entity_id = 'd0000000-0000-4000-8000-000000000001'), 'reversal has immutable audit');

-- Reward bookings never count. The RPC reserves only an approved matching solo booking.
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, reference, service_type, service_id,
  service_date, service_time, location, payment_type, subtotal_amount_php,
  total_amount_php, paid_amount_php, status
) values (
  'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001', 'reward-booking-key-0001', 'REWARD-BOOKING-1',
  'Complimentary Solo Session', '10000000-0000-4000-8000-000000000002', date '2026-12-01', time '09:00',
  'Studio', 'reward', 0, 0, 0, 'confirmed'
);
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select public.loyalty_reserve_reward(
  (select id from public.loyalty_rewards where client_id = 'b0000000-0000-4000-8000-000000000001' and sequence = 1),
  'e0000000-0000-4000-8000-000000000001', 'Customer selected reward booking'
);
select pg_temp.assert_true((select contribution = 0 and reason_code = 'non_standard_booking' from public.loyalty_booking_eligibility where booking_id = 'e0000000-0000-4000-8000-000000000001'), 'reward booking excluded');
update public.bookings set attendance = 'no_show' where id = 'e0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select review_required from public.loyalty_rewards where sequence = 1 and client_id = 'b0000000-0000-4000-8000-000000000001'), 'reward no-show requires review');
update public.bookings set attendance = 'attended', status = 'completed'
where id = 'e0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select status = 'redeemed' from public.loyalty_rewards where sequence = 1 and client_id = 'b0000000-0000-4000-8000-000000000001'), 'completed linked reward booking redeems reward');

-- Manual exclusion requires an actor/reason and records full before/after audit.
select public.loyalty_set_booking_exclusion('d0000000-0000-4000-8001-000000000008', true, 'Fraud review test');
select pg_temp.assert_true((select count(*) = 1 from public.loyalty_audit_log where action = 'booking.excluded' and reason = 'Fraud review test' and actor_user_id = 'a0000000-0000-4000-8000-000000000001'), 'manual exclusion is audited');

-- Preview is read-only and launch-date-only.
select pg_temp.assert_true((select count(*) >= 1 from public.loyalty_historical_preview('20000000-0000-4000-8000-000000000001')), 'preview returns eligible clients');
select pg_temp.assert_true((select count(*) = 2 from public.loyalty_email_outbox where client_id = 'b0000000-0000-4000-8000-000000000001'), 'preview sends no email');

-- Customer RLS: own rows visible, another customer's rows hidden, no mutation grant.
reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select count(*) = 1 from public.clients where id = 'b0000000-0000-4000-8000-000000000001'), 'customer sees own client');
select pg_temp.assert_true((select count(*) = 0 from public.clients where id = 'b0000000-0000-4000-8000-000000000002'), 'customer cannot see other client');
select pg_temp.assert_true((select count(*) = 2 from public.loyalty_rewards), 'customer sees own rewards');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.loyalty_rewards', 'INSERT'), 'customer cannot insert rewards');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.bookings', 'UPDATE'), 'customer cannot mutate bookings');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.client_profiles', 'first_name', 'UPDATE'), 'customer cannot mutate profile data');

rollback;
