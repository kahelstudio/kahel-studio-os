begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('81000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'register-opener@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'register-reviewer@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'register-super@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'refund-customer@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('81000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'refund-other@kahel.test', '', now(), '{}', '{}', now(), now());

insert into public.staff_profiles (
  user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards
) values
  ('81000000-0000-4000-8000-000000000001', 'admin', 'Register Opener', true, true, true),
  ('81000000-0000-4000-8000-000000000002', 'admin', 'Register Reviewer', true, true, true),
  ('81000000-0000-4000-8000-000000000003', 'super_admin', 'Refund Super Admin', true, true, true);

insert into public.clients (id, external_ref, name) values
  ('82000000-0000-4000-8000-000000000001', 'REGISTER-CLIENT-A', 'Register Customer A'),
  ('82000000-0000-4000-8000-000000000002', 'REGISTER-CLIENT-B', 'Register Customer B');

insert into public.client_profiles (
  id, client_id, user_id, email, first_name, last_name, status, email_verified_at
) values
  ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004', 'refund-customer@kahel.test', 'Refund', 'Customer', 'active', now()),
  ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000005', 'refund-other@kahel.test', 'Other', 'Customer', 'active', now());

update public.clients c set primary_contact_profile_id = p.id
from public.client_profiles p where p.client_id = c.id
  and c.id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000002');

insert into public.products (id, sku, name, category, price, stock, swatch) values
  ('84000000-0000-4000-8000-000000000001', 'REFUND-ADDON', 'Refund Test Add-on', 'Prints', 10.00, 10, '#123456');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, paid_amount_php, status, payment_status
) values
  ('85000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'register-refund-exact', repeat('1', 64), 'REGISTER-EXACT', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-12-01', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'confirmed', 'unpaid'),
  ('85000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'register-refund-addon', repeat('2', 64), 'REGISTER-ADDON', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-12-02', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'confirmed', 'unpaid'),
  ('85000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'register-paymongo', repeat('3', 64), 'REGISTER-PAYMONGO', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-12-03', '09:00', 'Studio', 'deposit', 10000, 10000, 0, 'confirmed', 'unpaid'),
  ('85000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 'register-unapproved', repeat('4', 64), 'REGISTER-UNAPPROVED', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-12-04', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'confirmed', 'unpaid');

grant select on public.payments, public.cash_transactions, public.bookings, public.invoices,
  public.payment_events, public.approval_requests, public.approval_financial_events to service_role;
grant update on public.cash_register_session_events, public.payment_refunds to service_role;
grant insert on public.approval_financial_events to service_role;

set local role service_role;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"service_role"}', true);

select public.open_cash_register('20000000-0000-4000-8000-000000000002', 5000, '81000000-0000-4000-8000-000000000001', 'Opening float');
select is((select count(*)::integer from public.cash_register_sessions where register_id = '20000000-0000-4000-8000-000000000002' and status = 'open'), 1, 'one active register session opens');
select is((select count(*)::integer from public.cash_register_session_events where event_type = 'opened'), 1, 'opening appends one immutable session history event');
select throws_ok(
  $$select public.open_cash_register('20000000-0000-4000-8000-000000000002', 5000, '81000000-0000-4000-8000-000000000002', null)$$,
  '23505', null, 'a register cannot have a second active session'
);

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where status = 'open' and register_id = '20000000-0000-4000-8000-000000000002'),
  '85000000-0000-4000-8000-000000000001', 10000, 'register-cash-exact-1', '[]', true,
  'Exact cash payment', true, '81000000-0000-4000-8000-000000000001', 12000, '2026-08-13 09:00:00+08'
);
select ok((
  select e.amount_centavos = 10000 and c.amount_centavos = 10000 and c.cash_received_centavos = 12000 and c.change_centavos = 2000
  from public.payments p join public.cash_transactions c on c.payment_id = p.id
  join public.cash_register_events e on e.payment_id = p.id and e.event_type = 'payment_received'
  where p.idempotency_key = 'register-cash-exact-1'
), 'register records retained cash, not tender');
select ok((
  select c.register_session_id = e.register_session_id
  from public.payments p join public.cash_transactions c on c.payment_id = p.id
  join public.cash_register_events e on e.payment_id = p.id and e.event_type = 'payment_received'
  where p.idempotency_key = 'register-cash-exact-1'
), 'cash transaction and retained amount event link to the same session');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where status = 'open' and register_id = '20000000-0000-4000-8000-000000000002'),
  '85000000-0000-4000-8000-000000000001', 10000, 'register-cash-exact-1', '[]', true,
  'Exact cash payment', true, '81000000-0000-4000-8000-000000000001', 12000, '2026-08-13 09:00:00+08'
);
select is((select count(*)::integer from public.cash_register_events e join public.payments p on p.id = e.payment_id where p.idempotency_key = 'register-cash-exact-1'), 1, 'duplicate payment retry creates no duplicate register event');

select throws_ok($$
  select public.collect_cash_payment(
    '85000000-0000-4000-8000-000000000004', 'none', 'staff', 'cash', 10000,
    'direct-old-cash-0001', '[]', false, null, true,
    '81000000-0000-4000-8000-000000000001', 10000, now()
  )
$$, '42501', null, 'direct legacy cash collection is not executable by service role');
select throws_ok($$
  select public.prepare_payment_collection(
    '85000000-0000-4000-8000-000000000004', 'none', 'staff', 'cash', 10000,
    'direct-cash-prepare-1', '[]', false, null, true, '81000000-0000-4000-8000-000000000001'
  )
$$, '42501', 'cash preparation requires the register collection workflow', 'cash preparation requires the register workflow');

select public.record_manual_cash_event(
  (select id from public.cash_register_sessions where status = 'open' and register_id = '20000000-0000-4000-8000-000000000002'),
  'manual_cash_in', 500, '81000000-0000-4000-8000-000000000003', 'Petty cash returned', 'register-manual-in-1'
);
select public.record_manual_cash_event(
  (select id from public.cash_register_sessions where status = 'open' and register_id = '20000000-0000-4000-8000-000000000002'),
  'manual_cash_in', 500, '81000000-0000-4000-8000-000000000003', 'Petty cash returned', 'register-manual-in-1'
);
select is((select count(*)::integer from public.cash_register_events where idempotency_key = 'register-manual-in-1'), 1, 'duplicate manual movement retry creates no duplicate event');
select public.submit_cash_register_close(
  (select id from public.cash_register_sessions where status = 'open' and register_id = '20000000-0000-4000-8000-000000000002'),
  15400, '81000000-0000-4000-8000-000000000001', 'Counted at close'
);
select ok((
  select status = 'pending_review' and expected_amount_centavos = 15500
    and counted_amount_centavos = 15400 and variance_centavos = -100
  from public.cash_register_sessions where register_id = '20000000-0000-4000-8000-000000000002'
), 'close freezes expected, count, and variance');
select throws_ok($$
  select public.record_manual_cash_event(
    (select id from public.cash_register_sessions where status = 'pending_review'), 'manual_cash_in', 100,
    '81000000-0000-4000-8000-000000000003', 'Late movement rejected', 'register-late-move-1'
  )
$$, 'P0002', 'open register session not found', 'movements reject a pending-review session');
select throws_ok($$
  select public.review_cash_register_close(
    (select id from public.cash_register_sessions where status = 'pending_review'),
    '81000000-0000-4000-8000-000000000001', true, 'Self review'
  )
$$, '42501', 'the opener cannot review their own close', 'opener cannot review their own close');
select public.review_cash_register_close(
  (select id from public.cash_register_sessions where status = 'pending_review'),
  '81000000-0000-4000-8000-000000000002', true, 'Independent review'
);
select ok((
  select status = 'closed' and reviewed_by = '81000000-0000-4000-8000-000000000002'
    and reviewed_at is not null and closed_at is not null
  from public.cash_register_sessions where register_id = '20000000-0000-4000-8000-000000000002'
), 'a separate admin reviews and closes the session');
select is((
  select count(*)::integer from public.cash_register_session_events
  where register_session_id = (select id from public.cash_register_sessions where status = 'closed')
), 3, 'session history retains open, close submission, and approval events');
select throws_ok($$
  select public.record_manual_cash_event(
    (select id from public.cash_register_sessions where status = 'closed'), 'manual_cash_out', 100,
    '81000000-0000-4000-8000-000000000003', 'Closed movement rejected', 'register-closed-move-1'
  )
$$, 'P0002', 'open register session not found', 'movements reject a closed session');
select throws_ok($$update public.cash_register_session_events set note = 'rewritten' where event_type = 'opened'$$, '55000', 'cash_register_session_events records are append-only', 'session history is immutable');

select public.open_cash_register('20000000-0000-4000-8000-000000000002', 5000, '81000000-0000-4000-8000-000000000001', 'Refund shift');
select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where status = 'open'),
  '85000000-0000-4000-8000-000000000002', 10000, 'register-cash-addon-1',
  '[{"product_id":"84000000-0000-4000-8000-000000000001","quantity":1}]', false,
  null, true, '81000000-0000-4000-8000-000000000001', 11000, '2026-08-13 10:00:00+08'
);
select public.prepare_payment_collection(
  '85000000-0000-4000-8000-000000000003', 'paymongo', 'staff', 'digital', 10000,
  'register-paymongo-001', '[]', false, null, true, '81000000-0000-4000-8000-000000000001'
);
select public.mark_paymongo_checkout(
  (select id from public.payments where idempotency_key = 'register-paymongo-001'),
  'cs_register_paymongo_1', 'https://checkout.test/register', '2026-08-13 11:00:00+08', 'pi_register_paymongo_1'
);
select public.confirm_paymongo_payment(
  'evt_register_paymongo_1', 'cs_register_paymongo_1',
  (select id from public.payments where idempotency_key = 'register-paymongo-001'),
  'pay_register_paymongo_1', 'pi_register_paymongo_1', 10000,
  '2026-08-13 10:30:00+08', '2026-08-13 10:31:00+08', 'gcash', null, null, '{}'
);
select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where status = 'open'),
  '85000000-0000-4000-8000-000000000004', 10000, 'register-unapproved-1', '[]', false,
  null, true, '81000000-0000-4000-8000-000000000001', 10000, '2026-08-13 10:15:00+08'
);

select public.approval_create_request(
  '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001', 'client_refund',
  'Exact cash refund', 'Refund exact cash balance', 'normal', 'payments', '{}', true, null, 10000, 'PHP',
  null, '85000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', null,
  (select id from public.payments where idempotency_key = 'register-cash-exact-1')
);
select public.approval_decide_request(
  (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000001'),
  '81000000-0000-4000-8000-000000000003', 'approve', 'Approved exact refund'
);

select throws_ok($$
  insert into public.approval_financial_events (
    request_id, event_type, amount_php, payment_method, transaction_reference, recorded_by, occurred_at
  ) values (
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000001'),
    'payment', 10000, 'cash', 'generic-bypass', '81000000-0000-4000-8000-000000000003', now()
  )
$$, '42501', 'client refund financial events must be recorded by refund_cash_payment', 'generic financial recording cannot bypass client refund fulfillment');

select public.refund_cash_payment(
  (select id from public.payments where idempotency_key = 'register-cash-exact-1'),
  (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000001'),
  10000, '81000000-0000-4000-8000-000000000003', 'register-refund-exact-1', 'Customer cancellation',
  (select id from public.cash_register_sessions where status = 'open')
);
select ok((
  select p.status = 'refunded' and p.refunded_amount_centavos = 10000
    and b.paid_amount_php = 10000 and b.refunded_amount_php = 10000 and b.payment_status = 'refunded'
    and i.paid_amount_php = 10000 and i.refunded_amount_centavos = 10000 and i.status = 'issued'
  from public.payments p join public.bookings b on b.id = p.booking_id
  join public.invoices i on i.booking_id = b.id where p.idempotency_key = 'register-cash-exact-1'
), 'exact approved balance-only cash refund updates payment, booking, and invoice');
select ok((
  select r.fulfillment_status = 'paid'
    and (select count(*) from public.approval_financial_events e where e.request_id = r.id) = 1
  from public.approval_requests r where r.idempotency_key = '86000000-0000-4000-8000-000000000001'
), 'refund atomically fulfills its approval and records one financial event');
select throws_ok($$update public.payment_refunds set reason = 'tampered' where idempotency_key = 'register-refund-exact-1'$$, '55000', 'payment_refunds records are append-only', 'refund records are immutable');
select is((select count(*)::integer from public.cash_register_events e join public.payment_refunds r on r.id = e.refund_id where r.idempotency_key = 'register-refund-exact-1' and e.event_type = 'cash_refund' and e.direction = 'out' and e.amount_centavos = 10000), 1, 'register records one cash refund out event');
select public.refund_cash_payment(
  (select id from public.payments where idempotency_key = 'register-cash-exact-1'),
  (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000001'),
  10000, '81000000-0000-4000-8000-000000000003', 'register-refund-exact-1', 'Customer cancellation',
  (select id from public.cash_register_sessions where status = 'open')
);
select ok((
  select (select count(*) from public.payment_refunds where idempotency_key = 'register-refund-exact-1') = 1
    and (select count(*) from public.cash_register_events where event_type = 'cash_refund') = 1
    and (select count(*) from public.payment_events e join public.payments p on p.id = e.payment_id where p.idempotency_key = 'register-cash-exact-1' and e.event_type = 'payment.cash_refunded') = 1
), 'duplicate refund retry is idempotent across refund and event ledgers');

select public.approval_create_request(
  '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000002', 'client_refund',
  'Add-on refund blocked', 'Attempt add-on payment refund', 'normal', 'payments', '{}', true, null, 11000, 'PHP',
  null, '85000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', null,
  (select id from public.payments where idempotency_key = 'register-cash-addon-1')
);
select public.approval_decide_request((select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000002'), '81000000-0000-4000-8000-000000000003', 'approve', 'Approved for guard test');
select throws_ok($$
  select public.refund_cash_payment(
    (select id from public.payments where idempotency_key = 'register-cash-addon-1'),
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000002'),
    11000, '81000000-0000-4000-8000-000000000003', 'refund-addon-block-1', 'Blocked add-on refund', null
  )
$$, 'P0002', 'refundable nonlegacy cash balance payment not found', 'add-on payment refund is blocked');

select public.approval_create_request(
  '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000003', 'client_refund',
  'PayMongo refund blocked', 'Attempt PayMongo cash refund', 'normal', 'payments', '{}', true, null, 10000, 'PHP',
  null, '85000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000001', null,
  (select id from public.payments where idempotency_key = 'register-paymongo-001')
);
select public.approval_decide_request((select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000003'), '81000000-0000-4000-8000-000000000003', 'approve', 'Approved for guard test');
select throws_ok($$
  select public.refund_cash_payment(
    (select id from public.payments where idempotency_key = 'register-paymongo-001'),
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000003'),
    10000, '81000000-0000-4000-8000-000000000003', 'refund-paymongo-block', 'Blocked digital refund', null
  )
$$, 'P0002', 'refundable nonlegacy cash balance payment not found', 'PayMongo payment cash refund is blocked');

reset role;
insert into public.payments (
  id, client_id, booking_id, processor, source, payment_method, payment_purpose, status,
  settlement_status, balance_component_centavos, add_on_amount_centavos, amount_centavos,
  idempotency_key, request_fingerprint, paid_at, posted_at, receipt_requested
) values (
  '87000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000004', 'none', 'legacy_import', 'cash', 'balance', 'paid',
  'not_applicable', 10000, 0, 10000, 'register-legacy-paid-1', repeat('a', 64), now(), now(), false
);
set local role service_role;
select public.approval_create_request(
  '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000004', 'client_refund',
  'Legacy refund blocked', 'Attempt imported cash refund', 'normal', 'payments', '{}', true, null, 10000, 'PHP',
  null, '85000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001', null, '87000000-0000-4000-8000-000000000001'
);
select public.approval_decide_request((select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000004'), '81000000-0000-4000-8000-000000000003', 'approve', 'Approved for guard test');
select throws_ok($$
  select public.refund_cash_payment(
    '87000000-0000-4000-8000-000000000001',
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000004'),
    10000, '81000000-0000-4000-8000-000000000003', 'refund-legacy-block-1', 'Blocked legacy refund', null
  )
$$, 'P0002', 'refundable nonlegacy cash balance payment not found', 'legacy imported cash refund is blocked');

select public.approval_create_request(
  '81000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000005', 'client_refund',
  'Pending refund blocked', 'Unapproved refund request', 'normal', 'payments', '{}', true, null, 10000, 'PHP',
  null, '85000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001', null,
  (select id from public.payments where idempotency_key = 'register-unapproved-1')
);
select throws_ok($$
  select public.refund_cash_payment(
    (select id from public.payments where idempotency_key = 'register-unapproved-1'),
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000005'),
    10000, '81000000-0000-4000-8000-000000000003', 'refund-pending-block1', 'Pending approval blocked', null
  )
$$, '23514', 'approved payment-bound client refund not found or amount differs from approval', 'unapproved refund is blocked');
select public.approval_decide_request((select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000005'), '81000000-0000-4000-8000-000000000003', 'approve', 'Approved for amount tests');
select throws_ok($$
  select public.refund_cash_payment(
    (select id from public.payments where idempotency_key = 'register-unapproved-1'),
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000005'),
    9000, '81000000-0000-4000-8000-000000000003', 'refund-wrong-amount1', 'Wrong amount blocked', null
  )
$$, '23514', 'approved payment-bound client refund not found or amount differs from approval', 'wrong refund amount is blocked');
select throws_ok($$
  select public.refund_cash_payment(
    (select id from public.payments where idempotency_key = 'register-unapproved-1'),
    (select id from public.approval_requests where idempotency_key = '86000000-0000-4000-8000-000000000005'),
    10000, '81000000-0000-4000-8000-000000000002', 'refund-admin-blocked1', 'Admin actor blocked', null
  )
$$, '42501', 'Super Admin access is required', 'unauthorized admin refund actor is blocked');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::integer from public.customer_payment_refunds), 1, 'customer reads their own refund through RLS');
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select is((select count(*)::integer from public.customer_payment_refunds), 0, 'another customer cannot read the refund');

select * from finish();
rollback;
