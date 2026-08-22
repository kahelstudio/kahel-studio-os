-- The register-aware application is deployed before this migration. Remove the
-- legacy cash entry points so all future physical cash enters an open register.
revoke all on function public.post_cash_payment(uuid, bigint, uuid, text, boolean, timestamptz) from service_role;
revoke all on function public.collect_cash_payment(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) from service_role;
