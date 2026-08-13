-- Canonical transactional email history. Rendered content and recipient details
-- are snapshotted so later template/contact edits cannot rewrite what was sent.

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique check (template_key ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  audience text not null check (audience in ('customer', 'internal')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.email_templates(id) on delete restrict,
  version integer not null check (version > 0),
  subject_template text not null check (length(btrim(subject_template)) between 1 and 998),
  html_template text check (html_template is null or length(btrim(html_template)) > 0),
  text_template text check (text_template is null or length(btrim(text_template)) > 0),
  variable_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(variable_schema) = 'object'),
  contains_secure_content boolean not null default false,
  change_note text not null check (length(btrim(change_note)) between 1 and 1000),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version),
  check (html_template is not null or text_template is not null),
  check (published_at is null or published_at >= created_at)
);

create table public.transactional_messages (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.email_template_versions(id) on delete restrict,
  environment text not null check (environment in ('development', 'staging', 'production')),
  provider text not null check (provider ~ '^[a-z0-9][a-z0-9_-]{0,49}$'),
  logical_idempotency_key text not null check (length(btrim(logical_idempotency_key)) between 8 and 250),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  resend_sequence integer not null default 0 check (resend_sequence >= 0),
  parent_message_id uuid references public.transactional_messages(id) on delete restrict,
  status text not null default 'queued' check (status in (
    'queued', 'processing', 'provider_accepted', 'sent', 'deferred', 'delivered', 'failed',
    'bounced', 'complained', 'cancelled', 'suppressed'
  )),
  client_id uuid references public.clients(id) on delete restrict,
  recipient_profile_id uuid,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null check (
    recipient_email = lower(btrim(recipient_email))
    and length(recipient_email) between 3 and 320 and position('@' in recipient_email) > 1
  ),
  recipient_name text check (recipient_name is null or length(btrim(recipient_name)) between 1 and 200),
  recipient_snapshot jsonb not null check (jsonb_typeof(recipient_snapshot) = 'object'),
  sender_email text not null check (
    sender_email = lower(btrim(sender_email))
    and length(sender_email) between 3 and 320 and position('@' in sender_email) > 1
  ),
  sender_name text check (sender_name is null or length(btrim(sender_name)) between 1 and 200),
  reply_to_email text check (
    reply_to_email is null or (
      reply_to_email = lower(btrim(reply_to_email))
      and length(reply_to_email) between 3 and 320 and position('@' in reply_to_email) > 1
    )
  ),
  trigger_key text not null check (length(btrim(trigger_key)) between 1 and 120),
  source text not null check (source in ('system', 'schedule', 'staff', 'webhook', 'migration')),
  source_reference text check (source_reference is null or length(btrim(source_reference)) between 1 and 250),
  booking_id uuid,
  invoice_id uuid,
  payment_id uuid,
  project_id uuid,
  gallery_id uuid,
  loyalty_reward_id uuid,
  related_type text check (related_type is null or related_type ~ '^[a-z][a-z0-9_.-]{0,119}$'),
  related_id uuid,
  render_context jsonb not null default '{}'::jsonb check (jsonb_typeof(render_context) = 'object'),
  rendered_subject text not null check (length(btrim(rendered_subject)) between 1 and 998),
  rendered_html text,
  rendered_text text,
  contains_secure_content boolean not null default false,
  content_redacted boolean not null default false,
  render_context_redacted boolean not null default false,
  redacted_fields text[] not null default '{}',
  retry_eligible boolean not null default true,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  attempt_count integer not null default 0 check (attempt_count between 0 and max_attempts),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claimed_by text,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  queued_at timestamptz not null default now(),
  accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactional_messages_logical_key unique (environment, logical_idempotency_key, resend_sequence),
  constraint transactional_messages_profile_client_fkey foreign key (recipient_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint transactional_messages_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint transactional_messages_invoice_client_fkey foreign key (invoice_id, client_id)
    references public.invoices(id, client_id) on delete restrict,
  constraint transactional_messages_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict,
  constraint transactional_messages_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint transactional_messages_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete restrict,
  constraint transactional_messages_reward_client_fkey foreign key (loyalty_reward_id, client_id)
    references public.loyalty_rewards(id, client_id) on delete restrict,
  constraint transactional_messages_body_check check (rendered_html is not null or rendered_text is not null),
  constraint transactional_messages_related_check check ((related_type is null) = (related_id is null)),
  constraint transactional_messages_client_check check (
    client_id is not null or (
      recipient_profile_id is null and booking_id is null and invoice_id is null and payment_id is null
      and project_id is null and gallery_id is null and loyalty_reward_id is null
    )
  ),
  constraint transactional_messages_redaction_check check (
    not content_redacted or contains_secure_content
  ),
  constraint transactional_messages_claim_check check (
    (status = 'processing' and claim_token is not null and claimed_by is not null
      and claimed_at is not null and claim_expires_at > claimed_at)
    or (status <> 'processing' and claim_token is null and claimed_by is null
      and claimed_at is null and claim_expires_at is null)
  ),
  constraint transactional_messages_status_dates_check check (
    (status = 'queued' and accepted_at is null and sent_at is null and delivered_at is null and failed_at is null and cancelled_at is null)
    or (status = 'processing' and delivered_at is null and cancelled_at is null)
    or (status in ('provider_accepted', 'deferred') and accepted_at is not null and delivered_at is null and cancelled_at is null)
    or (status = 'sent' and accepted_at is not null and sent_at is not null and delivered_at is null and cancelled_at is null)
    or (status = 'delivered' and accepted_at is not null and delivered_at is not null and cancelled_at is null)
    or (status in ('failed', 'bounced', 'complained', 'suppressed') and failed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  ),
  check (resend_sequence = 0 or parent_message_id is not null),
  check (last_error_code is null or length(last_error_code) <= 120),
  check (last_error_message is null or length(last_error_message) <= 4000)
);

create table public.transactional_message_attempts (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.transactional_messages(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  provider text not null check (length(btrim(provider)) between 1 and 50),
  worker_id text not null check (length(btrim(worker_id)) between 1 and 200),
  outcome text not null check (outcome in ('provider_accepted', 'failed')),
  provider_message_id text,
  error_code text,
  error_message text,
  retryable boolean not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  response_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(response_metadata) = 'object'),
  response_metadata_redacted boolean not null default false,
  unique (message_id, attempt_number),
  check (finished_at >= started_at),
  check ((outcome = 'provider_accepted' and provider_message_id is not null and error_message is null)
    or (outcome = 'failed' and error_message is not null))
);

create table public.transactional_message_events (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.transactional_messages(id) on delete restrict,
  environment text not null check (environment in ('development', 'staging', 'production')),
  provider text not null check (length(btrim(provider)) between 1 and 50),
  provider_event_id text,
  provider_message_id text,
  event_type text not null check (length(btrim(event_type)) between 1 and 120),
  mapped_status text check (mapped_status is null or mapped_status in (
    'provider_accepted', 'sent', 'deferred', 'delivered', 'failed', 'bounced', 'complained', 'suppressed'
  )),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  payload_redacted boolean not null default false
);

create index email_template_versions_lookup_idx
  on public.email_template_versions(template_id, published_at desc, version desc);
create index transactional_messages_claim_idx
  on public.transactional_messages(environment, provider, next_attempt_at, queued_at)
  where status in ('queued', 'failed') and retry_eligible;
create index transactional_messages_client_idx
  on public.transactional_messages(client_id, created_at desc) where client_id is not null;
create index transactional_messages_booking_idx
  on public.transactional_messages(booking_id, created_at desc) where booking_id is not null;
create unique index transactional_messages_provider_message_key
  on public.transactional_messages(environment, provider, provider_message_id)
  where provider_message_id is not null;
create index transactional_message_attempts_message_idx
  on public.transactional_message_attempts(message_id, attempt_number desc);
create index transactional_message_events_message_idx
  on public.transactional_message_events(message_id, occurred_at, id);
create unique index transactional_message_events_provider_event_key
  on public.transactional_message_events(environment, provider, provider_event_id)
  where provider_event_id is not null;

create or replace function public.prevent_transactional_email_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'transactional email versions, attempts, and events are append-only' using errcode = '55000';
end;
$$;

create trigger email_template_versions_append_only before update or delete on public.email_template_versions
for each row execute function public.prevent_transactional_email_history_mutation();
create trigger transactional_message_attempts_append_only before update or delete on public.transactional_message_attempts
for each row execute function public.prevent_transactional_email_history_mutation();
create trigger transactional_message_events_append_only before update or delete on public.transactional_message_events
for each row execute function public.prevent_transactional_email_history_mutation();

create or replace function public.transactional_email_status_rank(candidate text)
returns integer language sql immutable set search_path = '' as $$
  select case candidate
    when 'provider_accepted' then 10 when 'sent' then 20 when 'deferred' then 30
    when 'failed' then 40 when 'delivered' then 50 when 'bounced' then 60
    when 'suppressed' then 70 when 'complained' then 80
    else 0 end;
$$;

create or replace function public.transactional_email_enqueue(requested jsonb)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare
  result public.transactional_messages%rowtype;
  requested_version public.email_template_versions%rowtype;
  fingerprint text;
begin
  if jsonb_typeof(requested) <> 'object' then
    raise exception 'request must be an object' using errcode = '22023';
  end if;
  if coalesce(nullif(requested->>'initial_status', ''), 'queued') not in ('queued', 'provider_accepted') then
    raise exception 'invalid initial status' using errcode = '22023';
  end if;
  select * into requested_version from public.email_template_versions
  where id = (requested->>'template_version_id')::uuid and published_at is not null;
  if not found or not exists (
    select 1 from public.email_templates where id = requested_version.template_id and active
  ) then
    raise exception 'published active template version not found' using errcode = '22023';
  end if;
  fingerprint := encode(sha256(requested::text::bytea), 'hex');

  insert into public.transactional_messages (
    template_version_id, environment, provider, logical_idempotency_key, request_fingerprint,
    client_id, recipient_profile_id, recipient_user_id, recipient_email, recipient_name,
    recipient_snapshot, sender_email, sender_name, reply_to_email, trigger_key, source,
    source_reference, booking_id, invoice_id, payment_id, project_id, gallery_id,
    loyalty_reward_id, related_type, related_id, render_context, rendered_subject,
    rendered_html, rendered_text, contains_secure_content, content_redacted,
    render_context_redacted, redacted_fields, max_attempts, next_attempt_at,
    status, retry_eligible, accepted_at
  ) values (
    requested_version.id, requested->>'environment', requested->>'provider',
    requested->>'logical_idempotency_key', fingerprint, nullif(requested->>'client_id', '')::uuid,
    nullif(requested->>'recipient_profile_id', '')::uuid,
    nullif(requested->>'recipient_user_id', '')::uuid, lower(btrim(requested->>'recipient_email')),
    nullif(btrim(requested->>'recipient_name'), ''), coalesce(requested->'recipient_snapshot', '{}'::jsonb),
    lower(btrim(requested->>'sender_email')), nullif(btrim(requested->>'sender_name'), ''),
    nullif(lower(btrim(requested->>'reply_to_email')), ''), requested->>'trigger_key',
    requested->>'source', nullif(btrim(requested->>'source_reference'), ''),
    nullif(requested->>'booking_id', '')::uuid, nullif(requested->>'invoice_id', '')::uuid,
    nullif(requested->>'payment_id', '')::uuid, nullif(requested->>'project_id', '')::uuid,
    nullif(requested->>'gallery_id', '')::uuid, nullif(requested->>'loyalty_reward_id', '')::uuid,
    nullif(btrim(requested->>'related_type'), ''), nullif(requested->>'related_id', '')::uuid,
    coalesce(requested->'render_context', '{}'::jsonb), requested->>'rendered_subject',
    nullif(requested->>'rendered_html', ''), nullif(requested->>'rendered_text', ''),
    requested_version.contains_secure_content
      or coalesce((requested->>'contains_secure_content')::boolean, false),
    coalesce((requested->>'content_redacted')::boolean, false),
    coalesce((requested->>'render_context_redacted')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(requested->'redacted_fields')), '{}'),
    coalesce((requested->>'max_attempts')::integer, 5),
    coalesce((requested->>'next_attempt_at')::timestamptz, now()),
    coalesce(nullif(requested->>'initial_status', ''), 'queued'),
    coalesce(nullif(requested->>'initial_status', ''), 'queued') = 'queued',
    case when requested->>'initial_status' = 'provider_accepted' then now() end
  )
  on conflict (environment, logical_idempotency_key, resend_sequence) do nothing
  returning * into result;

  if not found then
    select * into result from public.transactional_messages
    where environment = requested->>'environment'
      and logical_idempotency_key = requested->>'logical_idempotency_key'
      and resend_sequence = 0;
    if result.request_fingerprint <> fingerprint then
      raise exception 'idempotency key was reused with a different request' using errcode = '22023';
    end if;
  end if;
  return result;
end;
$$;

create or replace function public.transactional_email_claim(
  requested_worker_id text,
  requested_environment text default null,
  requested_provider text default null,
  requested_lease interval default interval '5 minutes',
  requested_message_id uuid default null
)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare result public.transactional_messages%rowtype;
begin
  if length(btrim(coalesce(requested_worker_id, ''))) = 0
    or requested_lease <= interval '0 seconds' or requested_lease > interval '30 minutes' then
    raise exception 'invalid claim request' using errcode = '22023';
  end if;

  select * into result from public.transactional_messages
  where (
      (status in ('queued', 'failed') and retry_eligible and next_attempt_at <= now())
      or (status = 'processing' and claim_expires_at <= now())
    )
    and attempt_count < max_attempts and next_attempt_at <= now()
    and (requested_environment is null or environment = requested_environment)
    and (requested_provider is null or provider = requested_provider)
    and (requested_message_id is null or id = requested_message_id)
  order by next_attempt_at, queued_at, id for update skip locked limit 1;
  if not found then return null; end if;

  update public.transactional_messages set
    status = 'processing', attempt_count = attempt_count + 1,
    claim_token = gen_random_uuid(), claimed_by = btrim(requested_worker_id),
    claimed_at = now(), claim_expires_at = now() + requested_lease,
    failed_at = null, last_error_code = null, last_error_message = null, updated_at = now()
  where id = result.id returning * into result;
  return result;
end;
$$;

create or replace function public.transactional_email_finish(
  requested_message_id uuid,
  requested_claim_token uuid,
  requested_outcome text,
  requested_provider_message_id text default null,
  requested_error_code text default null,
  requested_error_message text default null,
  requested_retryable boolean default false,
  requested_next_attempt_at timestamptz default null,
  requested_response_metadata jsonb default '{}'::jsonb,
  requested_response_metadata_redacted boolean default false
)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare current_message public.transactional_messages%rowtype;
begin
  select * into current_message from public.transactional_messages
  where id = requested_message_id for update;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;
  if current_message.status <> 'processing' or current_message.claim_token <> requested_claim_token
    or current_message.claim_expires_at < now() then
    raise exception 'claim is missing, stale, or expired' using errcode = '55000';
  end if;
  if requested_outcome not in ('provider_accepted', 'failed') then
    raise exception 'invalid attempt outcome' using errcode = '22023';
  end if;
  if requested_outcome = 'provider_accepted' and length(btrim(coalesce(requested_provider_message_id, ''))) = 0 then
    raise exception 'provider accepted attempts require provider message id' using errcode = '22023';
  end if;
  if requested_outcome = 'failed' and length(btrim(coalesce(requested_error_message, ''))) = 0 then
    raise exception 'failed attempts require an error message' using errcode = '22023';
  end if;

  insert into public.transactional_message_attempts (
    message_id, attempt_number, provider, worker_id, outcome, provider_message_id,
    error_code, error_message, retryable, started_at, duration_ms,
    response_metadata, response_metadata_redacted
  ) values (
    current_message.id, current_message.attempt_count, current_message.provider,
    current_message.claimed_by, requested_outcome, nullif(btrim(requested_provider_message_id), ''),
    nullif(btrim(requested_error_code), ''),
    case when requested_outcome = 'failed' then left(btrim(requested_error_message), 4000) end,
    requested_outcome = 'failed' and requested_retryable
      and current_message.attempt_count < current_message.max_attempts,
    current_message.claimed_at,
    greatest(0, floor(extract(epoch from (now() - current_message.claimed_at)) * 1000)::integer),
    coalesce(requested_response_metadata, '{}'::jsonb), requested_response_metadata_redacted
  );

  update public.transactional_messages set
    status = requested_outcome,
    provider_message_id = case when requested_outcome = 'provider_accepted' then btrim(requested_provider_message_id) else provider_message_id end,
    retry_eligible = requested_outcome = 'failed' and requested_retryable and attempt_count < max_attempts,
    next_attempt_at = case when requested_outcome = 'failed' and requested_retryable and attempt_count < max_attempts
      then coalesce(requested_next_attempt_at, now() + least(interval '1 hour', interval '1 minute' * power(2, least(attempt_count, 6))))
      else next_attempt_at end,
    accepted_at = case when requested_outcome = 'provider_accepted' then now() else accepted_at end,
    failed_at = case when requested_outcome = 'failed' then now() else null end,
    last_error_code = case when requested_outcome = 'failed' then left(nullif(btrim(requested_error_code), ''), 120) end,
    last_error_message = case when requested_outcome = 'failed' then left(btrim(requested_error_message), 4000) end,
    claim_token = null, claimed_by = null, claimed_at = null, claim_expires_at = null,
    updated_at = now()
  where id = current_message.id returning * into current_message;
  return current_message;
end;
$$;

create or replace function public.transactional_email_record_provider_event(
  requested_environment text,
  requested_provider text,
  requested_provider_event_id text,
  requested_event_type text,
  requested_mapped_status text,
  requested_occurred_at timestamptz,
  requested_message_id uuid default null,
  requested_provider_message_id text default null,
  requested_payload jsonb default '{}'::jsonb,
  requested_payload_redacted boolean default false
)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare current_message public.transactional_messages%rowtype; inserted_event_id bigint;
begin
  if requested_mapped_status not in ('provider_accepted', 'sent', 'deferred', 'delivered', 'failed', 'bounced', 'complained', 'suppressed')
    or length(btrim(coalesce(requested_provider_event_id, ''))) = 0 then
    raise exception 'invalid provider event' using errcode = '22023';
  end if;

  if requested_message_id is not null then
    select * into current_message from public.transactional_messages
    where id = requested_message_id and environment = requested_environment
      and provider = requested_provider for update;
  else
    select * into current_message from public.transactional_messages
    where environment = requested_environment and provider = requested_provider
      and provider_message_id = requested_provider_message_id for update;
  end if;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;

  insert into public.transactional_message_events (
    message_id, environment, provider, provider_event_id, provider_message_id,
    event_type, mapped_status, occurred_at, payload, payload_redacted
  ) values (
    current_message.id, requested_environment, requested_provider, btrim(requested_provider_event_id),
    coalesce(nullif(btrim(requested_provider_message_id), ''), current_message.provider_message_id),
    requested_event_type, requested_mapped_status, requested_occurred_at,
    coalesce(requested_payload, '{}'::jsonb), requested_payload_redacted
  ) on conflict (environment, provider, provider_event_id) where provider_event_id is not null do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then return current_message; end if;

  -- Provider outcomes only promote rank. Arrival order cannot regress delivery.
  if public.transactional_email_status_rank(requested_mapped_status)
      > public.transactional_email_status_rank(current_message.status) then
    update public.transactional_messages set
      status = requested_mapped_status,
      provider_message_id = coalesce(provider_message_id, nullif(btrim(requested_provider_message_id), '')),
      accepted_at = case when requested_mapped_status in ('provider_accepted', 'sent', 'deferred', 'delivered')
        then coalesce(accepted_at, requested_occurred_at) else accepted_at end,
      sent_at = case when requested_mapped_status in ('sent', 'delivered') then coalesce(sent_at, requested_occurred_at) else sent_at end,
      delivered_at = case when requested_mapped_status = 'delivered' then requested_occurred_at else delivered_at end,
      failed_at = case when requested_mapped_status in ('failed', 'bounced', 'complained', 'suppressed')
        then requested_occurred_at else failed_at end,
      retry_eligible = false,
      claim_token = null, claimed_by = null, claimed_at = null, claim_expires_at = null,
      updated_at = now()
    where id = current_message.id returning * into current_message;
  end if;
  return current_message;
end;
$$;

create or replace function public.transactional_email_prepare_manual_resend(
  requested_message_id uuid,
  requested_reason text,
  requested_next_attempt_at timestamptz default now()
)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare original public.transactional_messages%rowtype; result public.transactional_messages%rowtype; next_sequence integer;
begin
  if length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'resend reason is required' using errcode = '22023';
  end if;
  select * into original from public.transactional_messages where id = requested_message_id for update;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;
  if original.status <> 'failed' or not original.retry_eligible or original.contains_secure_content then
    raise exception 'message is not eligible for manual resend' using errcode = '55000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(original.environment || ':' || original.logical_idempotency_key, 0));
  update public.transactional_messages set retry_eligible = false, updated_at = now()
  where id = original.id;
  select coalesce(max(resend_sequence), 0) + 1 into next_sequence
  from public.transactional_messages where environment = original.environment
    and logical_idempotency_key = original.logical_idempotency_key;

  insert into public.transactional_messages (
    template_version_id, environment, provider, logical_idempotency_key, request_fingerprint, resend_sequence,
    parent_message_id, client_id, recipient_profile_id, recipient_user_id, recipient_email,
    recipient_name, recipient_snapshot, sender_email, sender_name, reply_to_email, trigger_key,
    source, source_reference, booking_id, invoice_id, payment_id, project_id, gallery_id,
    loyalty_reward_id, related_type, related_id, render_context, rendered_subject, rendered_html,
    rendered_text, contains_secure_content, content_redacted, render_context_redacted,
    redacted_fields, max_attempts, next_attempt_at
  ) select
    template_version_id, environment, provider, logical_idempotency_key, request_fingerprint, next_sequence,
    original.id, client_id, recipient_profile_id, recipient_user_id, recipient_email,
    recipient_name, recipient_snapshot, sender_email, sender_name, reply_to_email, trigger_key,
    'staff', left('manual-resend: ' || btrim(requested_reason), 250), booking_id, invoice_id,
    payment_id, project_id, gallery_id, loyalty_reward_id, related_type, related_id,
    render_context, rendered_subject, rendered_html, rendered_text, contains_secure_content,
    content_redacted, render_context_redacted, redacted_fields, max_attempts,
    requested_next_attempt_at
  from public.transactional_messages where id = original.id
  returning * into result;
  return result;
end;
$$;

alter table public.email_templates enable row level security;
alter table public.email_template_versions enable row level security;
alter table public.transactional_messages enable row level security;
alter table public.transactional_message_attempts enable row level security;
alter table public.transactional_message_events enable row level security;

create policy email_templates_staff_read on public.email_templates
for select to authenticated using (public.loyalty_is_staff());
create policy email_template_versions_staff_read on public.email_template_versions
for select to authenticated using (public.loyalty_is_staff());
create policy transactional_messages_staff_read on public.transactional_messages
for select to authenticated using (
  exists (
    select 1 from public.staff_profiles staff
    where staff.user_id = auth.uid() and staff.active and (
      staff.role in ('admin', 'super_admin')
      or (staff.can_manage_bookings and (client_id is not null or booking_id is not null or invoice_id is not null or payment_id is not null))
      or (staff.can_manage_galleries and (project_id is not null or gallery_id is not null))
      or (staff.can_manage_loyalty and loyalty_reward_id is not null)
    )
  )
);
create policy transactional_message_attempts_staff_read on public.transactional_message_attempts
for select to authenticated using (exists (select 1 from public.transactional_messages message where message.id = message_id));
create policy transactional_message_events_staff_read on public.transactional_message_events
for select to authenticated using (exists (select 1 from public.transactional_messages message where message.id = message_id));

revoke all on table public.email_templates, public.email_template_versions,
  public.transactional_messages, public.transactional_message_attempts,
  public.transactional_message_events from anon, authenticated;
grant select on table public.email_templates, public.email_template_versions,
  public.transactional_messages, public.transactional_message_attempts,
  public.transactional_message_events to authenticated;
grant all on table public.email_templates, public.email_template_versions,
  public.transactional_messages, public.transactional_message_attempts,
  public.transactional_message_events to service_role;
grant usage, select on sequence public.transactional_message_attempts_id_seq,
  public.transactional_message_events_id_seq to service_role;

revoke all on function public.prevent_transactional_email_history_mutation(),
  public.transactional_email_status_rank(text), public.transactional_email_enqueue(jsonb),
  public.transactional_email_claim(text, text, text, interval, uuid),
  public.transactional_email_finish(uuid, uuid, text, text, text, text, boolean, timestamptz, jsonb, boolean),
  public.transactional_email_record_provider_event(text, text, text, text, text, timestamptz, uuid, text, jsonb, boolean),
  public.transactional_email_prepare_manual_resend(uuid, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.transactional_email_enqueue(jsonb),
  public.transactional_email_claim(text, text, text, interval, uuid),
  public.transactional_email_finish(uuid, uuid, text, text, text, text, boolean, timestamptz, jsonb, boolean),
  public.transactional_email_record_provider_event(text, text, text, text, text, timestamptz, uuid, text, jsonb, boolean),
  public.transactional_email_prepare_manual_resend(uuid, text, timestamptz)
  to service_role;

comment on table public.transactional_messages is 'Canonical mutable projection and immutable rendered/recipient snapshot for one logical transactional email send.';
comment on column public.transactional_messages.logical_idempotency_key is 'Stable business-operation key; resend_sequence distinguishes explicit operator resends.';
comment on column public.transactional_messages.status is 'queued -> processing -> provider_accepted (API receipt, not delivery) -> sent -> delivered; deferred/failed may occur, while bounced/complained/suppressed are terminal promotions.';
comment on column public.transactional_messages.content_redacted is 'True only when secure rendered content was replaced before persistence.';
comment on table public.transactional_message_attempts is 'Append-only completed provider API attempts. Claims are represented on transactional_messages until completion.';
comment on table public.transactional_message_events is 'Append-only provider webhook facts; mapped status promotion is rank-monotonic and duplicate-safe.';
