begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

create or replace function pg_temp.assert_true(condition boolean, message text)
returns text language sql as $$ select ok(condition, message); $$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('aa000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'requester@kahel.test', '', now(), now()),
  ('aa000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@kahel.test', '', now(), now()),
  ('aa000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'super@kahel.test', '', now(), now());

insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards, can_manage_galleries) values
  ('aa000000-0000-4000-8000-000000000001', 'staff', 'Test Requester', false, false, false, false),
  ('aa000000-0000-4000-8000-000000000002', 'admin', 'Test Admin', true, true, true, true),
  ('aa000000-0000-4000-8000-000000000003', 'super_admin', 'Test Super Admin', true, true, true, true);

select public.approval_create_request(
  'aa000000-0000-4000-8000-000000000001', 'ab000000-0000-4000-8000-000000000001', 'cash_advance',
  'Production travel', 'Travel cash for a confirmed production', 'urgent', 'expenses',
  '{"purpose":"Travel","expectedLiquidationDate":"2026-08-30","expenseCategory":"Transport","paymentMethod":"Bank","recipient":"Staff","estimateBreakdown":"Fare","liquidationAcknowledged":true}',
  true, date '2026-08-20', 250000, 'PHP'
);

select pg_temp.assert_true((select reference ~ '^APR-[0-9]{4}-[0-9]{4,}$' and status = 'pending_approval' from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'submission gets a safe reference and pending state');
select pg_temp.assert_true((select array_agg(approver_role::text order by step_number) = array['admin','super_admin'] from public.approval_steps where request_id = (select id from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001')), 'cash advance routes sequentially');
select pg_temp.assert_true((select count(*) = 1 from public.staff_notifications where recipient_id = 'aa000000-0000-4000-8000-000000000002'), 'first approver is notified once');

-- Repeating an idempotency key returns the original request and creates no duplicate.
select public.approval_create_request(
  'aa000000-0000-4000-8000-000000000001', 'ab000000-0000-4000-8000-000000000001', 'cash_advance',
  'Production travel', 'Travel cash for a confirmed production', 'urgent', 'expenses', '{}', true, date '2026-08-20', 250000, 'PHP'
);
select pg_temp.assert_true((select count(*) = 1 from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'duplicate submission is idempotent');

select public.approval_decide_request((select id from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'aa000000-0000-4000-8000-000000000002', 'approve', 'Reviewed');
select pg_temp.assert_true((select status = 'pending_approval' from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'first approval does not skip the second step');
select public.approval_decide_request((select id from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'aa000000-0000-4000-8000-000000000003', 'approve', 'Approved');
select pg_temp.assert_true((select status = 'approved' and approved_at is not null from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'final sequential decision approves the request');

-- A second actor cannot decide a step after the first transaction commits.
do $$
begin
  perform public.approval_decide_request((select id from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000001'), 'aa000000-0000-4000-8000-000000000003', 'approve', null);
  raise exception 'expected stale decision rejection';
exception when serialization_failure then null;
end
$$;

-- Financial maker-checker is enforced inside the transaction, not by UI state.
select public.approval_create_request(
  'aa000000-0000-4000-8000-000000000002', 'ab000000-0000-4000-8000-000000000002', 'purchase_office',
  'Office supplies', 'Monthly paper stock', 'normal', 'expenses',
  '{"item":"Paper","specification":"A4","quantity":10,"estimatedUnitCost":250,"businessPurpose":"Operations"}',
  true, null, 250000, 'PHP'
);
do $$
begin
  perform public.approval_decide_request((select id from public.approval_requests where idempotency_key = 'ab000000-0000-4000-8000-000000000002'), 'aa000000-0000-4000-8000-000000000002', 'approve', null);
  raise exception 'expected self-approval rejection';
exception when insufficient_privilege then null;
end
$$;

select pg_temp.assert_true((select count(*) >= 4 from public.approval_audit_log), 'significant workflow actions are audited');

select * from finish();
rollback;
