begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ledger-staff@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ledger-a@kahel.test', '', now(), '{}', '{}', now(), now()),
  ('71000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ledger-b@kahel.test', '', now(), '{}', '{}', now(), now());

insert into public.staff_profiles (
  user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards
) values (
  '71000000-0000-4000-8000-000000000001', 'admin', 'Ledger Test Admin', true, true, true
);

insert into public.clients (id, external_ref, name) values
  ('72000000-0000-4000-8000-000000000001', 'LEDGER-CLIENT-A', 'Ledger Customer A'),
  ('72000000-0000-4000-8000-000000000002', 'LEDGER-CLIENT-B', 'Ledger Customer B');

insert into public.client_profiles (
  id, client_id, user_id, email, first_name, last_name, status, email_verified_at
) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'ledger-a@kahel.test', 'Ledger', 'Customer A', 'active', now()),
  ('73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'ledger-b@kahel.test', 'Ledger', 'Customer B', 'active', now());

update public.clients c set primary_contact_profile_id = p.id
from public.client_profiles p where p.client_id = c.id
  and c.id in ('72000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002');

insert into public.products (id, sku, name, category, price, stock, swatch) values
  ('74000000-0000-4000-8000-000000000001', 'LEDGER-PRINT', 'Ledger Test Print', 'Prints', 12.34, 10, '#123456');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, paid_amount_php, status, payment_status
) values
  ('75000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-full', repeat('1', 64), 'LEDGER-FULL', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-09', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'confirmed', 'unpaid'),
  ('75000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-partial', repeat('2', 64), 'LEDGER-PARTIAL', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-02', '09:00', 'Studio', 'cash', 20000, 20000, 0, 'confirmed', 'unpaid'),
  ('75000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-cancel', repeat('3', 64), 'LEDGER-CANCELLED', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-03', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'cancelled', 'unpaid'),
  ('75000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-paid', repeat('4', 64), 'LEDGER-PAID', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-04', '09:00', 'Studio', 'cash', 10000, 10000, 10000, 'confirmed', 'paid'),
  ('75000000-0000-4000-8000-000000000005', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-digital', repeat('5', 64), 'LEDGER-DIGITAL', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-05', '09:00', 'Studio', 'deposit', 10000, 10000, 0, 'inquiry', 'unpaid'),
  ('75000000-0000-4000-8000-000000000006', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'ledger-booking-reconcile', repeat('6', 64), 'LEDGER-RECONCILE', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-06', '09:00', 'Studio', 'deposit', 10000, 10000, 0, 'confirmed', 'unpaid'),
  ('75000000-0000-4000-8000-000000000007', '72000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000002', 'ledger-booking-other', repeat('7', 64), 'LEDGER-OTHER', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2026-11-07', '09:00', 'Studio', 'cash', 10000, 10000, 0, 'confirmed', 'unpaid');

grant update (price) on public.products to service_role;

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"service_role"}',
  true
);

select public.open_cash_register(
  '20000000-0000-4000-8000-000000000002', 0,
  '71000000-0000-4000-8000-000000000001', 'Ledger test register'
);

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000001', 10000,
  'ledger-cash-full-0001', '[]', false, 'Full cash payment', true,
  '71000000-0000-4000-8000-000000000001', 12000, '2026-08-10 10:00:00+08'
);
select ok((
  select b.paid_amount_php = 10000 and b.total_amount_php = 10000 and b.payment_status = 'paid'
    and p.status = 'paid' and p.posted_at is not null
    and exists (select 1 from public.payment_allocations a where a.payment_id = p.id and a.amount_centavos = 10000)
  from public.bookings b join public.payments p on p.booking_id = b.id
  where b.id = '75000000-0000-4000-8000-000000000001'
), 'full cash collection atomically posts payment, allocation, and booking totals');
select ok((
  select count(*) = 1 and min(r.receipt_number) = max(r.receipt_number)
    and min(r.cash_received_centavos) = 12000 and min(r.change_centavos) = 2000
    and (select count(*) from public.cash_transactions c where c.payment_id = p.id) = 1
  from public.payments p join public.receipts r on r.payment_id = p.id
  where p.idempotency_key = 'ledger-cash-full-0001' group by p.id
), 'cash collection creates one unique receipt and records change');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000001', 10000,
  'ledger-cash-full-0001', '[]', false, 'Full cash payment', true,
  '71000000-0000-4000-8000-000000000001', 12000, '2026-08-10 10:00:00+08'
);
select ok((
  select (select count(*) from public.payments where idempotency_key = 'ledger-cash-full-0001') = 1
    and (select paid_amount_php from public.bookings where id = '75000000-0000-4000-8000-000000000001') = 10000
    and (select count(*) from public.cash_transactions c join public.payments p on p.id = c.payment_id where p.idempotency_key = 'ledger-cash-full-0001') = 1
    and (select count(*) from public.receipts r join public.payments p on p.id = r.payment_id where p.idempotency_key = 'ledger-cash-full-0001') = 1
), 'duplicate cash idempotency key returns the posted payment without reposting');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000002', 5000,
  'ledger-cash-part-0001', '[]', false, null, true,
  '71000000-0000-4000-8000-000000000001', 5000, '2026-08-10 10:05:00+08'
);
select ok((
  select paid_amount_php = 5000 and total_amount_php = 20000 and payment_status = 'partially_paid'
  from public.bookings where id = '75000000-0000-4000-8000-000000000002'
), 'partial cash collection preserves the outstanding balance');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000002', 5000,
  'ledger-cash-addon-001', '[{"product_id":"74000000-0000-4000-8000-000000000001","quantity":2}]',
  false, null, true, '71000000-0000-4000-8000-000000000001', 8000, '2026-08-10 10:10:00+08'
);
select ok((
  select p.payment_purpose = 'balance_and_add_on' and p.balance_component_centavos = 5000
    and p.add_on_amount_centavos = 2468 and p.amount_centavos = 7468
    and b.total_amount_php = 22468 and b.paid_amount_php = 12468
    and product.stock = 8 and line.unit_price_centavos = 1234
    and movement.quantity_delta = -2 and movement.stock_after = 8
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  join public.payment_line_items line on line.payment_id = p.id and line.line_type = 'add_on'
  join public.products product on product.id = line.product_id
  join public.inventory_movements movement on movement.payment_line_item_id = line.id
  where p.idempotency_key = 'ledger-cash-addon-001'
), 'cash balance plus add-on posts snapshotted price, totals, and stock atomically');

select throws_ok($$
  select public.collect_cash_payment_with_register(
    (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
    '75000000-0000-4000-8000-000000000003', 10000,
    'ledger-cancelled-0001', '[]', false, null, true,
    '71000000-0000-4000-8000-000000000001', 10000, '2026-08-10 10:15:00+08'
  )
$$, '23514', 'cannot collect a cancelled booking', 'cancelled booking collection is rejected');
select is((select count(*)::integer from public.payments where idempotency_key = 'ledger-cancelled-0001'), 0, 'cancelled collection leaves no partial payment');

select throws_ok($$
  select public.collect_cash_payment_with_register(
    (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
    '75000000-0000-4000-8000-000000000004', 1,
    'ledger-overpaid-00001', '[]', false, null, true,
    '71000000-0000-4000-8000-000000000001', 1, '2026-08-10 10:20:00+08'
  )
$$, '23514', 'balance component exceeds unreserved outstanding balance', 'fully paid booking rejects balance overcollection');
select is((select count(*)::integer from public.payments where idempotency_key = 'ledger-overpaid-00001'), 0, 'overcollection rollback leaves no payment');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000004', 0,
  'ledger-paid-addon-001', '[{"product_id":"74000000-0000-4000-8000-000000000001","quantity":1}]',
  false, null, true, '71000000-0000-4000-8000-000000000001', 1500, '2026-08-10 10:25:00+08'
);
select ok((
  select p.payment_purpose = 'add_on' and b.total_amount_php = 11234
    and b.paid_amount_php = 11234 and b.payment_status = 'paid'
  from public.payments p join public.bookings b on b.id = p.booking_id
  where p.idempotency_key = 'ledger-paid-addon-001'
), 'fully paid booking accepts add-on-only collection');

select public.prepare_payment_collection(
  '75000000-0000-4000-8000-000000000005', 'paymongo', 'customer_checkout', 'digital', 10000,
  'ledger-digital-paid-1', '[{"product_id":"74000000-0000-4000-8000-000000000001","quantity":2}]',
  false, null, true, null
);
select ok((
  select p.status = 'pending' and p.settlement_status = 'pending'
    and b.total_amount_php = 10000 and b.paid_amount_php = 0 and product.stock = 7
    and line.unit_price_centavos = 1234 and line.total_centavos = 2468
    and not exists (select 1 from public.inventory_movements m where m.payment_line_item_id = line.id)
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  join public.payment_line_items line on line.payment_id = p.id and line.line_type = 'add_on'
  join public.products product on product.id = line.product_id
  where p.idempotency_key = 'ledger-digital-paid-1'
), 'pending PayMongo payment snapshots price without mutating totals or stock');

update public.products set price = 99.99 where id = '74000000-0000-4000-8000-000000000001';
select public.mark_paymongo_checkout(
  (select id from public.payments where idempotency_key = 'ledger-digital-paid-1'),
  'cs_ledger_paid_001', 'https://checkout.test/ledger-paid', '2026-08-10 11:30:00+08', 'pi_ledger_paid_001'
);
select ok((
  select b.payment_status = 'pending' and b.total_amount_php = 10000
    and b.paid_amount_php = 0 and product.stock = 7
  from public.bookings b cross join public.products product
  where b.id = '75000000-0000-4000-8000-000000000005'
    and product.id = '74000000-0000-4000-8000-000000000001'
), 'marking checkout changes provider metadata only, not financial totals or stock');

select public.confirm_paymongo_payment(
  'evt_ledger_paid_001', 'cs_ledger_paid_001',
  (select id from public.payments where idempotency_key = 'ledger-digital-paid-1'),
  'pay_ledger_paid_001', 'pi_ledger_paid_001', 12468,
  '2026-08-10 10:30:00+08', '2026-08-10 10:31:00+08', 'gcash',
  'Ledger verified payment', null, '{"data":{"verified":true}}'
);
select ok((
  select p.status = 'paid' and p.posted_at is not null and p.settlement_status = 'pending'
    and b.status = 'confirmed' and b.total_amount_php = 12468
    and b.paid_amount_php = 12468 and b.payment_status = 'paid'
  from public.payments p join public.bookings b on b.id = p.booking_id
  where p.idempotency_key = 'ledger-digital-paid-1'
), 'verified-equivalent PayMongo confirmation posts payment and booking once');
select ok((
  select line.unit_price_centavos = 1234 and product.price = 99.99 and product.stock = 5
    and movement.quantity_delta = -2 and movement.unit_price_centavos = 1234
  from public.payments p
  join public.payment_line_items line on line.payment_id = p.id and line.line_type = 'add_on'
  join public.products product on product.id = line.product_id
  join public.inventory_movements movement on movement.payment_line_item_id = line.id
  where p.idempotency_key = 'ledger-digital-paid-1'
), 'posting uses the product price snapshot and decrements stock once');
select is((
  select count(*)::integer from public.payment_settlements s join public.payments p on p.id = s.payment_id
  where p.idempotency_key = 'ledger-digital-paid-1' and s.status = 'pending'
), 1, 'paid status and pending settlement are represented separately');

select public.confirm_paymongo_payment(
  'evt_ledger_paid_001', 'cs_ledger_paid_001',
  (select id from public.payments where idempotency_key = 'ledger-digital-paid-1'),
  'pay_ledger_paid_001', 'pi_ledger_paid_001', 12468,
  '2026-08-10 10:30:00+08', '2026-08-10 10:31:00+08', 'gcash',
  'Ledger verified payment', null, '{"data":{"verified":true}}'
);
select ok((
  select product.stock = 5 and b.paid_amount_php = 12468
    and (select count(*) from public.inventory_movements m join public.payment_line_items l on l.id = m.payment_line_item_id where l.payment_id = p.id) = 1
    and (select count(*) from public.payment_events e where e.provider = 'paymongo' and e.provider_event_id = 'evt_ledger_paid_001') = 1
    and (select count(*) from public.receipts r where r.payment_id = p.id) = 1
  from public.payments p join public.bookings b on b.id = p.booking_id
  cross join public.products product
  where p.idempotency_key = 'ledger-digital-paid-1'
    and product.id = '74000000-0000-4000-8000-000000000001'
), 'duplicate provider event is idempotent across totals, stock, event, and receipt');

select public.prepare_payment_collection(
  '75000000-0000-4000-8000-000000000006', 'paymongo', 'customer_checkout', 'digital', 10000,
  'ledger-failed-000001', '[]', false, null, true, null
);
select public.mark_paymongo_checkout(
  (select id from public.payments where idempotency_key = 'ledger-failed-000001'),
  'cs_ledger_failed_001', 'https://checkout.test/ledger-failed', '2026-08-10 12:00:00+08', null
);
select public.fail_or_expire_provider_payment(
  'evt_ledger_failed_001', 'cs_ledger_failed_001',
  (select id from public.payments where idempotency_key = 'ledger-failed-000001'),
  'checkout_session.payment.failed', '2026-08-10 11:00:00+08', '{}'
);
select ok((
  select p.status = 'failed' and p.posted_at is null and b.paid_amount_php = 0
    and b.total_amount_php = 10000 and b.payment_status = 'pending'
  from public.payments p join public.bookings b on b.id = p.booking_id
  where p.idempotency_key = 'ledger-failed-000001'
), 'failed provider event does not count as paid or mutate totals');
select throws_ok($$
  select public.prepare_payment_collection(
    '75000000-0000-4000-8000-000000000006', 'paymongo', 'customer_checkout', 'digital', 10000,
    'ledger-blocked-00001', '[]', false, null, true, null
  )
$$, '23514', 'balance component exceeds unreserved outstanding balance', 'failed checkout keeps its balance reservation until reconciliation');
select public.reconcile_failed_provider_payment(
  (select id from public.payments where idempotency_key = 'ledger-failed-000001'),
  '71000000-0000-4000-8000-000000000001', 'Provider dashboard verified failed payment'
);
select is((select status from public.payments where idempotency_key = 'ledger-failed-000001'), 'cancelled', 'explicit reconciliation releases failed reservation');

select public.prepare_payment_collection(
  '75000000-0000-4000-8000-000000000006', 'paymongo', 'customer_checkout', 'digital', 10000,
  'ledger-expired-00001', '[]', false, null, true, null
);
select public.mark_paymongo_checkout(
  (select id from public.payments where idempotency_key = 'ledger-expired-00001'),
  'cs_ledger_expired_01', 'https://checkout.test/ledger-expired', '2026-08-10 12:30:00+08', null
);
select public.fail_or_expire_provider_payment(
  'evt_ledger_expired_01', 'cs_ledger_expired_01',
  (select id from public.payments where idempotency_key = 'ledger-expired-00001'),
  'checkout_session.expired', '2026-08-10 12:31:00+08', '{}'
);
select ok((
  select p.status = 'expired' and p.posted_at is null and b.paid_amount_php = 0 and b.total_amount_php = 10000
  from public.payments p join public.bookings b on b.id = p.booking_id
  where p.idempotency_key = 'ledger-expired-00001'
), 'expired provider event does not count as paid');
select public.reconcile_failed_provider_payment(
  (select id from public.payments where idempotency_key = 'ledger-expired-00001'),
  '71000000-0000-4000-8000-000000000001', 'Provider dashboard verified expired checkout'
);
select public.prepare_payment_collection(
  '75000000-0000-4000-8000-000000000006', 'paymongo', 'customer_checkout', 'digital', 10000,
  'ledger-released-0001', '[]', false, null, true, null
);
select ok((
  select (select status from public.payments where idempotency_key = 'ledger-expired-00001') = 'cancelled'
    and status = 'pending' and balance_component_centavos = 10000
  from public.payments where idempotency_key = 'ledger-released-0001'
), 'reconciling expiration permits a replacement reservation');

select public.update_paymongo_settlement(
  (select id from public.payments where idempotency_key = 'ledger-digital-paid-1'),
  'evt_ledger_settled_01', 'set_ledger_001', 'settled', 468, 12000,
  '2026-08-11 09:00:00+08', '2026-08-12 09:00:00+08', '2026-08-12 09:01:00+08', '{}'
);
select ok((
  select p.status = 'paid' and p.settlement_status = 'settled' and s.status = 'settled'
    and s.gross_amount_centavos = 12468 and s.net_amount_centavos = 12000
  from public.payments p join public.payment_settlements s on s.payment_id = p.id
  where p.idempotency_key = 'ledger-digital-paid-1'
), 'settlement transition does not alter collection paid status');

select public.collect_cash_payment_with_register(
  (select id from public.cash_register_sessions where opened_by = '71000000-0000-4000-8000-000000000001' and status = 'open'),
  '75000000-0000-4000-8000-000000000007', 10000,
  'ledger-other-cash-001', '[]', false, null, true,
  '71000000-0000-4000-8000-000000000001', 10000, '2026-08-10 13:00:00+08'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is((select count(*)::integer from public.customer_payments), 8, 'customer reads all own payment snapshots');
select is((select count(*)::integer from public.customer_payments where client_id = '72000000-0000-4000-8000-000000000002'), 0, 'customer cannot read another customer payment');
select is((select count(*)::integer from public.customer_receipts), 5, 'customer reads only own receipts');
select throws_ok($$insert into public.payments (id) values ('76000000-0000-4000-8000-000000000001')$$, '42501', null, 'authenticated customer cannot insert payments');
select throws_ok($$update public.payments set note = 'tampered' where idempotency_key = 'ledger-cash-full-0001'$$, '42501', null, 'authenticated customer cannot update payments');
select throws_ok($$insert into public.cash_transactions (id) values ('76000000-0000-4000-8000-000000000002')$$, '42501', null, 'authenticated customer cannot insert cash transactions');
select throws_ok($$update public.cash_transactions set note = 'tampered'$$, '42501', null, 'authenticated customer cannot update cash transactions');
select throws_ok($$
  update public.payments set status = 'refunded', refunded_amount_centavos = amount_centavos
  where idempotency_key = 'ledger-cash-full-0001'
$$, '42501', null, 'authenticated customer cannot post refunds by mutating the ledger');

select * from finish();
rollback;
