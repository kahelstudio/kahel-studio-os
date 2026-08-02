begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.com', '', now(), '{}', '{}', now(), now());

insert into public.clients (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Customer A'),
  ('10000000-0000-0000-0000-000000000002', 'Customer B');
insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name, status, email_verified_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a@example.com', 'Customer', 'A', 'active', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'b@example.com', 'Customer', 'B', 'active', now());
insert into public.bookings (client_id, client_profile_id, idempotency_key, reference, service_type, service_date, service_time, location, payment_type, subtotal_amount_php, total_amount_php) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'booking-a-unique', 'KS-A', 'Solo', '2026-12-01', '09:00', 'Studio', 'deposit', 150000, 150000),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'booking-b-unique', 'KS-B', 'Solo', '2026-12-02', '09:00', 'Studio', 'deposit', 150000, 150000);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.clients), 1, 'customer reads only own client');
select is((select count(*)::integer from public.client_profiles), 1, 'customer reads only own profile');
select is((select count(*)::integer from public.bookings), 1, 'customer reads only own booking');
select is((select reference from public.bookings limit 1), 'KS-A', 'changing a booking URL cannot expose another owner');
select throws_ok($$update public.bookings set total_amount_php = 1 where reference = 'KS-A'$$, '42501', null, 'customer cannot change booking price');
select throws_ok($$update public.bookings set payment_status = 'paid' where reference = 'KS-A'$$, '42501', null, 'customer cannot mark payment paid');
select throws_ok($$update public.bookings set client_id = '10000000-0000-0000-0000-000000000002' where reference = 'KS-A'$$, '42501', null, 'customer cannot change booking ownership');
select throws_ok($$update public.client_profiles set email = 'other@example.com' where id = '20000000-0000-0000-0000-000000000001'$$, '42501', null, 'customer cannot change verified email');
select lives_ok($$update public.client_profiles set first_name = 'Ana' where id = '20000000-0000-0000-0000-000000000001'$$, 'customer can update allowlisted profile fields');
select is((select count(*)::integer from public.customer_audit_log), 0, 'customer cannot read audit logs');
select * from finish();
rollback;
