alter function public.transactional_email_claim_api(jsonb) rename to transactional_email_claim_row;
alter function public.transactional_email_finish_api(jsonb) rename to transactional_email_finish_row;

create function public.transactional_email_claim_api(requested jsonb)
returns jsonb
language sql security definer set search_path = '' as $$
  select to_jsonb(public.transactional_email_claim_row(requested));
$$;

create function public.transactional_email_finish_api(requested jsonb)
returns jsonb
language sql security definer set search_path = '' as $$
  select to_jsonb(public.transactional_email_finish_row(requested));
$$;

revoke all on function public.transactional_email_claim_row(jsonb),
  public.transactional_email_finish_row(jsonb), public.transactional_email_claim_api(jsonb),
  public.transactional_email_finish_api(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.transactional_email_claim_row(jsonb),
  public.transactional_email_finish_row(jsonb), public.transactional_email_claim_api(jsonb),
  public.transactional_email_finish_api(jsonb) to service_role;

notify pgrst, 'reload schema';
