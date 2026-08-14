create or replace function public.transactional_email_claim_api(requested jsonb)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare
  result public.transactional_messages%rowtype;
  worker_id text := requested->>'worker_id';
  requested_lease interval := coalesce((requested->>'lease')::interval, interval '5 minutes');
begin
  if length(btrim(coalesce(worker_id, ''))) = 0
    or requested_lease <= interval '0 seconds' or requested_lease > interval '30 minutes' then
    raise exception 'invalid claim request' using errcode = '22023';
  end if;

  select * into result from public.transactional_messages
  where (
      (status in ('queued', 'failed') and retry_eligible and next_attempt_at <= now())
      or (status = 'processing' and claim_expires_at <= now())
    )
    and attempt_count < max_attempts and next_attempt_at <= now()
    and (nullif(requested->>'environment', '') is null or environment = requested->>'environment')
    and (nullif(requested->>'provider', '') is null or provider = requested->>'provider')
    and (nullif(requested->>'message_id', '') is null or id = (requested->>'message_id')::uuid)
  order by next_attempt_at, queued_at, id for update skip locked limit 1;
  if not found then return null; end if;

  update public.transactional_messages set
    status = 'processing', attempt_count = attempt_count + 1,
    claim_token = gen_random_uuid(), claimed_by = btrim(worker_id),
    claimed_at = now(), claim_expires_at = now() + requested_lease,
    failed_at = null, last_error_code = null, last_error_message = null, updated_at = now()
  where id = result.id returning * into result;
  return result;
end;
$$;

create or replace function public.transactional_email_finish_api(requested jsonb)
returns public.transactional_messages
language plpgsql security definer set search_path = '' as $$
declare
  current_message public.transactional_messages%rowtype;
  outcome text := requested->>'outcome';
  retryable boolean := coalesce((requested->>'retryable')::boolean, false);
begin
  select * into current_message from public.transactional_messages
  where id = (requested->>'message_id')::uuid for update;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;
  if current_message.status <> 'processing'
    or current_message.claim_token <> (requested->>'claim_token')::uuid
    or current_message.claim_expires_at < now() then
    raise exception 'claim is missing, stale, or expired' using errcode = '55000';
  end if;
  if outcome not in ('provider_accepted', 'failed') then
    raise exception 'invalid attempt outcome' using errcode = '22023';
  end if;
  if outcome = 'provider_accepted' and length(btrim(coalesce(requested->>'provider_message_id', ''))) = 0 then
    raise exception 'provider accepted attempts require provider message id' using errcode = '22023';
  end if;
  if outcome = 'failed' and length(btrim(coalesce(requested->>'error_message', ''))) = 0 then
    raise exception 'failed attempts require an error message' using errcode = '22023';
  end if;

  insert into public.transactional_message_attempts (
    message_id, attempt_number, provider, worker_id, outcome, provider_message_id,
    error_code, error_message, retryable, started_at, duration_ms,
    response_metadata, response_metadata_redacted
  ) values (
    current_message.id, current_message.attempt_count, current_message.provider,
    current_message.claimed_by, outcome, nullif(btrim(requested->>'provider_message_id'), ''),
    nullif(btrim(requested->>'error_code'), ''),
    case when outcome = 'failed' then left(btrim(requested->>'error_message'), 4000) end,
    outcome = 'failed' and retryable and current_message.attempt_count < current_message.max_attempts,
    current_message.claimed_at,
    greatest(0, floor(extract(epoch from (now() - current_message.claimed_at)) * 1000)::integer),
    coalesce(requested->'response_metadata', '{}'::jsonb),
    coalesce((requested->>'response_metadata_redacted')::boolean, false)
  );

  update public.transactional_messages set
    status = outcome,
    provider_message_id = case when outcome = 'provider_accepted' then btrim(requested->>'provider_message_id') else provider_message_id end,
    retry_eligible = outcome = 'failed' and retryable and attempt_count < max_attempts,
    next_attempt_at = case when outcome = 'failed' and retryable and attempt_count < max_attempts
      then coalesce(nullif(requested->>'next_attempt_at', '')::timestamptz, now() + least(interval '1 hour', interval '1 minute' * power(2, least(attempt_count, 6))))
      else next_attempt_at end,
    accepted_at = case when outcome = 'provider_accepted' then now() else accepted_at end,
    failed_at = case when outcome = 'failed' then now() else null end,
    last_error_code = case when outcome = 'failed' then left(nullif(btrim(requested->>'error_code'), ''), 120) end,
    last_error_message = case when outcome = 'failed' then left(btrim(requested->>'error_message'), 4000) end,
    claim_token = null, claimed_by = null, claimed_at = null, claim_expires_at = null,
    updated_at = now()
  where id = current_message.id returning * into current_message;
  return current_message;
end;
$$;

revoke all on function public.transactional_email_claim_api(jsonb),
  public.transactional_email_finish_api(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.transactional_email_claim_api(jsonb),
  public.transactional_email_finish_api(jsonb) to service_role;

notify pgrst, 'reload schema';
