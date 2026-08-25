begin;
create extension if not exists pgtap with schema extensions;
select plan(29);
-- The local seed includes DEMO messages. Truncate transactionally so scalar and
-- count assertions below remain isolated; rollback restores the seed afterward.
truncate table public.transactional_message_attempts, public.transactional_message_events, public.transactional_messages;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('a5000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'email-staff@kahel.test', '', now(), now()),
  ('a5000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'email-customer@kahel.test', '', now(), now());
insert into public.staff_profiles (
  user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards
)
values ('a5000000-0000-4000-8000-000000000001', 'admin', 'Email Test Admin', true, true, true);
insert into public.clients (id, external_ref, name)
values ('b5000000-0000-4000-8000-000000000001', 'EMAIL-CLIENT', 'Email Client');
insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name)
values ('c5000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002', 'email-customer@kahel.test', 'Email', 'Customer');

set local role service_role;
insert into public.email_templates (id, template_key, name, audience)
values ('d5000000-0000-4000-8000-000000000001', 'test-receipt', 'Test receipt', 'customer');
insert into public.email_template_versions (
  id, template_id, version, subject_template, html_template, variable_schema,
  contains_secure_content, change_note, published_at
) values (
  'e5000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000001', 1,
  'Receipt {{ reference }}', '<p>Receipt</p>', '{"reference":{"type":"string"}}',
  true, 'Initial tested version', now()
);

select has_table('public', 'email_templates', 'email templates table exists');
select has_table('public', 'email_template_versions', 'email template versions table exists');
select has_table('public', 'transactional_messages', 'transactional messages table exists');
select has_table('public', 'transactional_message_attempts', 'attempt ledger exists');
select has_table('public', 'transactional_message_events', 'provider event ledger exists');
select col_is_pk('public', 'transactional_messages', 'id', 'messages have a primary key');
select ok((select relrowsecurity from pg_class where oid = 'public.transactional_messages'::regclass), 'message RLS is enabled');
select ok(not has_function_privilege('authenticated', 'public.transactional_email_enqueue(jsonb)', 'EXECUTE'), 'browser cannot execute enqueue');

create function pg_temp.email_enqueue_request()
returns jsonb language sql as $$ select jsonb_build_object(
  'template_version_id', 'e5000000-0000-4000-8000-000000000001',
  'environment', 'staging', 'provider', 'resend', 'logical_idempotency_key', 'receipt:EMAIL-001',
  'client_id', 'b5000000-0000-4000-8000-000000000001',
  'recipient_profile_id', 'c5000000-0000-4000-8000-000000000001',
  'recipient_user_id', 'a5000000-0000-4000-8000-000000000002',
  'recipient_email', 'email-customer@kahel.test', 'recipient_name', 'Email Customer',
  'recipient_snapshot', jsonb_build_object('email', 'email-customer@kahel.test', 'name', 'Email Customer'),
  'sender_email', 'hello@kahelstudio.com', 'sender_name', 'Kahel Studio',
  'trigger_key', 'payment.receipt', 'source', 'system', 'render_context', '{"reference":"EMAIL-001"}'::jsonb,
  'rendered_subject', 'Receipt EMAIL-001', 'rendered_html', '<p>Receipt EMAIL-001</p>',
  'contains_secure_content', true, 'content_redacted', true,
  'render_context_redacted', true, 'redacted_fields', jsonb_build_array('payment_url')
) $$;
select public.transactional_email_enqueue(pg_temp.email_enqueue_request());
select public.transactional_email_enqueue(pg_temp.email_enqueue_request());
select is((select count(*)::integer from public.transactional_messages), 1, 'exact logical enqueue retry is idempotent');
select throws_ok($$select public.transactional_email_enqueue(jsonb_build_object(
  'template_version_id', 'e5000000-0000-4000-8000-000000000001',
  'environment', 'staging', 'provider', 'resend', 'logical_idempotency_key', 'receipt:EMAIL-001',
  'client_id', 'b5000000-0000-4000-8000-000000000001',
  'recipient_profile_id', 'c5000000-0000-4000-8000-000000000001',
  'recipient_email', 'different@kahel.test', 'recipient_snapshot', '{}'::jsonb,
  'sender_email', 'hello@kahelstudio.com', 'trigger_key', 'payment.receipt', 'source', 'system',
  'rendered_subject', 'Duplicate', 'rendered_text', 'Duplicate'
))$$, '22023', 'idempotency key was reused with a different request', 'conflicting logical idempotency reuse is rejected');
select ok((select content_redacted and render_context_redacted and redacted_fields = array['payment_url']
  from public.transactional_messages), 'secure-content redaction state is explicit');

select public.transactional_email_claim('email-worker-1', 'staging', 'resend', interval '5 minutes');
select ok((select status = 'processing' and attempt_count = 1 and claim_token is not null
  from public.transactional_messages), 'claim uses a lease token and increments attempts');
select is((select (public.transactional_email_claim('email-worker-2', 'staging', 'resend')).id), null,
  'skip-locked claim does not double claim processing work');
select throws_ok($$select public.transactional_email_finish(
  (select id from public.transactional_messages), gen_random_uuid(), 'provider_accepted', 'provider-message-1'
)$$, '55000', 'claim is missing, stale, or expired', 'stale claim token cannot finish');
select public.transactional_email_finish(
  (select id from public.transactional_messages),
  (select claim_token from public.transactional_messages), 'provider_accepted', 'provider-message-1'
);
select ok((select status = 'provider_accepted' and accepted_at is not null and delivered_at is null
  from public.transactional_messages), 'provider acceptance is not delivery');
select is((select count(*)::integer from public.transactional_message_attempts), 1, 'finish appends one immutable attempt');

select public.transactional_email_record_provider_event(
  'staging', 'resend', 'event-delivered-1', 'email.delivered', 'delivered', now(),
  null, 'provider-message-1', '{"type":"email.delivered"}', true
);
select is((select status from public.transactional_messages), 'delivered', 'delivered event promotes accepted message');
select public.transactional_email_record_provider_event(
  'staging', 'resend', 'event-accepted-late', 'email.sent', 'sent', now() - interval '1 minute',
  null, 'provider-message-1', '{}', false
);
select is((select status from public.transactional_messages), 'delivered', 'late lower-rank event cannot regress delivery');
select public.transactional_email_record_provider_event(
  'staging', 'resend', 'event-delivered-1', 'email.delivered', 'delivered', now(),
  null, 'provider-message-1', '{}', false
);
select is((select count(*)::integer from public.transactional_message_events), 2, 'duplicate provider event is idempotent');

select throws_ok($$select public.transactional_email_prepare_manual_resend(
  (select id from public.transactional_messages where resend_sequence = 0), 'Customer requested another copy'
)$$, '55000', 'message is not eligible for manual resend', 'delivered secure messages cannot be manually resent');
update public.transactional_messages set
  status = 'failed', retry_eligible = true, contains_secure_content = false,
  content_redacted = false, render_context_redacted = false, redacted_fields = '{}',
  delivered_at = null, failed_at = now()
where resend_sequence = 0;
select public.transactional_email_prepare_manual_resend(
  (select id from public.transactional_messages where resend_sequence = 0), 'Retry transient provider failure'
);
select ok((select count(*) = 2 and max(resend_sequence) = 1
  and bool_or(parent_message_id is not null and status = 'queued')
  from public.transactional_messages), 'manual resend preserves logical identity with a new sequence');

reset role;
select throws_ok($$update public.email_template_versions set change_note = 'tampered'$$,
  '55000', 'transactional email versions, attempts, and events are append-only', 'template versions are append-only');
select throws_ok($$delete from public.transactional_message_attempts$$,
  '55000', 'transactional email versions, attempts, and events are append-only', 'attempts are append-only');
select throws_ok($$update public.transactional_message_events set event_type = 'tampered'$$,
  '55000', 'transactional email versions, attempts, and events are append-only', 'events are append-only');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.transactional_messages), 0, 'customer cannot read own transactional messages');
select ok(not has_table_privilege('authenticated', 'public.transactional_messages', 'INSERT'), 'customer has no message mutation grant');
select throws_ok($$select public.transactional_email_prepare_manual_resend(
  '00000000-0000-0000-0000-000000000000', 'not allowed'
)$$, '42501', null, 'customer cannot call resend RPC');

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.transactional_messages), 2, 'staff can read transactional messages through staff helper');
select ok(not has_table_privilege('authenticated', 'public.transactional_messages', 'UPDATE'), 'staff browser cannot directly mutate messages');

select * from finish();
rollback;
