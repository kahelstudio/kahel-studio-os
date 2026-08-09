-- public.rls_auto_enable() is a remote-only object: it exists on both hosted
-- projects but was never committed as a migration, so a local stack does not
-- have it. Every statement below is therefore guarded on its presence.
--
-- The function returns event_trigger, so PostgREST cannot actually invoke it
-- over /rest/v1/rpc. The default grants still hand EXECUTE to PUBLIC, anon and
-- authenticated, which the Supabase advisor flags on a SECURITY DEFINER
-- function. None of the API roles have any reason to hold it.

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke all on function public.rls_auto_enable() from anon';
    execute 'revoke all on function public.rls_auto_enable() from authenticated';
  end if;
end
$$;
