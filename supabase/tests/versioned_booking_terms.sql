begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('f0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'terms-admin@kahel.test', '', now(), now()),
  ('f0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'terms-a@kahel.test', '', now(), now()),
  ('f0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'terms-b@kahel.test', '', now(), now());

insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards)
values ('f0000000-0000-4000-8000-000000000001', 'admin', 'Terms Admin', true, true, true);
insert into public.clients (id, external_ref, name) values
  ('f1000000-0000-4000-8000-000000000001', 'TERMS-CLIENT-A', 'Terms Client A'),
  ('f1000000-0000-4000-8000-000000000002', 'TERMS-CLIENT-B', 'Terms Client B');
insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name) values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'terms-a@kahel.test', 'Terms', 'A'),
  ('f2000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000003', 'terms-b@kahel.test', 'Terms', 'B');

select is((select count(*)::integer from public.legal_documents where document_key = 'booking_terms'), 1, 'one stable booking terms identity is seeded');
select is((select count(*)::integer from public.legal_document_versions where legal_document_id = 'b0000000-0000-4000-8000-000000000001'), 1, 'exactly one version is seeded');
select is((select state::text from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'), 'draft', 'seeded version is an unpublished draft');
select is(jsonb_array_length((select content -> 'sections' from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001')), 31, 'draft has 31 editable sections');
select ok((select (content ->> 'disclaimer') like '%Philippine counsel%' from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'), 'draft requires Philippine counsel review');

-- Bookings created before publication retain an explicit unavailable requirement.
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php
) values
  ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001',
   'terms-booking-a-pre', repeat('a', 64), 'TERMS-A-PRE', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2027-01-01', '09:00', 'Studio', 'cash', 100000, 100000),
  ('f3000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002',
   'terms-booking-b-pre', repeat('b', 64), 'TERMS-B-PRE', 'Solo Session', '10000000-0000-4000-8000-000000000001', '2027-01-02', '09:00', 'Studio', 'cash', 100000, 100000);
select is((select status::text from public.booking_agreement_requirements where booking_id = 'f3000000-0000-4000-8000-000000000001'), 'unavailable', 'pre-publication booking requirement is unavailable');

set local role service_role;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"service_role"}', true);
select lives_ok($$select public.legal_document_transition('b1000000-0000-4000-8000-000000000001', 'under_review', 'f0000000-0000-4000-8000-000000000001', 'Ready for review')$$, 'service workflow can submit a draft');
select lives_ok($$select public.legal_document_transition('b1000000-0000-4000-8000-000000000001', 'approved', 'f0000000-0000-4000-8000-000000000001', 'Counsel test approval')$$, 'service workflow can approve a reviewed version');
select lives_ok($$select public.legal_document_publish('b1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Publish test version')$$, 'publication RPC publishes an approved version');
select is((select count(*)::integer from public.legal_document_versions where state = 'published'), 1, 'publication leaves exactly one current version');

reset role;
insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php
) values (
  'f3000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001',
  'terms-booking-a-post', repeat('c', 64), 'TERMS-A-POST', 'Solo Session', '10000000-0000-4000-8000-000000000001',
  '2027-01-03', '09:00', 'Studio', 'cash', 120000, 120000
);
select is((select status::text from public.booking_agreement_requirements where booking_id = 'f3000000-0000-4000-8000-000000000003'), 'pending', 'new booking automatically requires the current published version');

set local role service_role;
select lives_ok($$select public.accept_booking_agreement(
  'f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001', (select content_hash from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'),
  'acceptance-idempotency-a', 'checkbox', 'customer_portal', 'test', 'en-PH',
  '{"request_id":"request-a","channel":"web"}'::jsonb
)$$, 'an existing booking can accept the now-current terms');
select lives_ok($$select public.accept_booking_agreement(
  'f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001', (select content_hash from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'),
  'acceptance-idempotency-a', 'checkbox', 'customer_portal', 'test', 'en-PH',
  '{"request_id":"request-a","channel":"web"}'::jsonb
)$$, 'duplicate acceptance call is idempotent');
select is((select count(*)::integer from public.agreement_acceptances where booking_id = 'f3000000-0000-4000-8000-000000000001'), 1, 'idempotency stores one acceptance');
select is((select status::text from public.booking_agreement_requirements where booking_id = 'f3000000-0000-4000-8000-000000000001'), 'accepted', 'acceptance atomically satisfies the requirement');
select ok((select accepted_at <= clock_timestamp() and accepted_at > clock_timestamp() - interval '1 minute' from public.agreement_acceptances where booking_id = 'f3000000-0000-4000-8000-000000000001'), 'accepted_at is generated by the server');
select ok(not exists (
  select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agreement_acceptances'
  and column_name in ('ip_address', 'user_agent')
), 'IP address and user agent are not mandatory acceptance fields');

select lives_ok($$select public.record_booking_consent(
  'f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002',
  'portfolio', true, 'portfolio-consent-a', 'customer_portal', 'en-PH', '{"channel":"web"}', null, '{}'
)$$, 'optional portfolio consent is recorded separately');
select is((select count(*)::integer from public.agreement_acceptances where booking_id = 'f3000000-0000-4000-8000-000000000001'), 1, 'optional consent does not alter agreement acceptance');
select lives_ok($$select public.record_booking_consent(
  'f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002',
  'portfolio', false, 'portfolio-withdraw-a', 'customer_portal', 'en-PH', '{}',
  (select id from public.consent_records where booking_id = 'f3000000-0000-4000-8000-000000000001' and purpose = 'portfolio' and selected),
  '{"reason":"customer_request","request_id":"withdraw-a"}'
)$$, 'consent withdrawal appends a linked record');
select is((select count(*)::integer from public.consent_records where booking_id = 'f3000000-0000-4000-8000-000000000001' and purpose = 'portfolio'), 2, 'selection and withdrawal history are both preserved');
select ok((select bool_and(purpose = 'portfolio') from public.consent_records where booking_id = 'f3000000-0000-4000-8000-000000000001'), 'optional consent retains its independent purpose');

reset role;
select throws_ok($$update public.consent_records set selected = true where not selected$$, '55000', null, 'consent records are append-only');
select throws_ok($$update public.agreement_acceptances set source = 'other'$$, '55000', null, 'agreement acceptances are append-only');
select throws_ok($$update public.legal_document_versions set content = content || '{"changed":true}' where id = 'b1000000-0000-4000-8000-000000000001'$$, '55000', null, 'published content is immutable');
select throws_ok($$delete from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'$$, '55000', null, 'published version cannot be deleted');

set local role service_role;
select lives_ok($$select public.legal_document_create_version(
  'booking_terms', '{"version_label":"Test 2.0","effective_date":"2027-01-01","title":"Replacement test","summary":[],"sections":[]}',
  'f0000000-0000-4000-8000-000000000001', 'Replacement version test'
)$$, 'service workflow creates a new stable version');
select lives_ok($$select public.legal_document_transition(
  (select id from public.legal_document_versions where version_number = 2 and legal_document_id = 'b0000000-0000-4000-8000-000000000001'),
  'under_review', 'f0000000-0000-4000-8000-000000000001', 'Review replacement'
)$$, 'replacement enters review');
select lives_ok($$select public.legal_document_transition(
  (select id from public.legal_document_versions where version_number = 2 and legal_document_id = 'b0000000-0000-4000-8000-000000000001'),
  'approved', 'f0000000-0000-4000-8000-000000000001', 'Approve replacement'
)$$, 'replacement is approved');
select lives_ok($$select public.legal_document_publish(
  (select id from public.legal_document_versions where version_number = 2 and legal_document_id = 'b0000000-0000-4000-8000-000000000001'),
  'f0000000-0000-4000-8000-000000000001', 'Publish replacement'
)$$, 'replacement publication supersedes the prior current version');
select is((select count(*)::integer from public.legal_document_versions where legal_document_id = 'b0000000-0000-4000-8000-000000000001' and state = 'published'), 1, 'only one version remains current after replacement');
select is((select state::text from public.legal_document_versions where id = 'b1000000-0000-4000-8000-000000000001'), 'superseded', 'prior published version is superseded');
select ok((select acceptance.legal_document_version_id = 'b1000000-0000-4000-8000-000000000001'
  and acceptance.document_hash = version.content_hash
  from public.agreement_acceptances acceptance
  join public.legal_document_versions version on version.id = acceptance.legal_document_version_id
  where acceptance.booking_id = 'f3000000-0000-4000-8000-000000000001'), 'historical acceptance version and hash survive publication changes');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.agreement_acceptances), 1, 'customer reads own acceptance');
select is((select count(*)::integer from public.booking_agreement_requirements where client_id = 'f1000000-0000-4000-8000-000000000002'), 0, 'customer cannot read another customer requirement');
select is((select count(*)::integer from public.customer_booking_agreements), 1, 'security-invoker view respects customer ownership');
select ok(not exists (
  select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customer_booking_agreements'
  and column_name in ('evidence_metadata', 'client_snapshot', 'profile_snapshot', 'user_snapshot')
), 'customer-safe view excludes sensitive evidence snapshots');
select ok(not has_table_privilege('authenticated', 'public.agreement_acceptances', 'INSERT'), 'customers cannot insert acceptance evidence directly');
select throws_ok($$update public.booking_agreement_requirements set status = 'pending' where booking_id = 'f3000000-0000-4000-8000-000000000001'$$, '42501', null, 'customer cannot mutate agreement requirements');
select ok(not has_table_privilege('service_role', 'public.consent_records', 'INSERT'), 'service role direct consent mutation is revoked');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.booking_agreement_requirements where booking_id in (
  'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000003'
)), 3, 'active staff can read agreement requirements across customers');
select is((select count(*)::integer from public.consent_records where booking_id = 'f3000000-0000-4000-8000-000000000001'), 2, 'active staff can read complete optional consent history');

select * from finish();
rollback;
