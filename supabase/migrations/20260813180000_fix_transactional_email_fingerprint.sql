do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.transactional_email_enqueue(jsonb)'::regprocedure)
  into definition;

  definition := replace(
    definition,
    'sha256(requested::text::bytea)',
    'sha256(convert_to(requested::text, ''UTF8''))'
  );

  if definition not like '%sha256(convert_to(requested::text, ''UTF8''))%' then
    raise exception 'transactional_email_enqueue fingerprint expression was not found';
  end if;

  execute definition;
end;
$$;
