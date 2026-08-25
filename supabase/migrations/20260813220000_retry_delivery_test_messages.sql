update public.transactional_messages
set next_attempt_at = now(), updated_at = now()
where id in (
  '60042503-d62d-415b-8f51-8f57d1773c3d'::uuid,
  'd52575d3-fd84-4528-bec9-f58d0132abaf'::uuid
)
  and trigger_key = 'operator.delivery_test'
  and status = 'failed'
  and retry_eligible;
