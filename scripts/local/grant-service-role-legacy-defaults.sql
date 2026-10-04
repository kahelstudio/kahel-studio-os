-- LOCAL DEVELOPMENT ONLY — never run against staging/production.
-- Newer Supabase CLI databases no longer give API roles data privileges on tables created by migrations
-- (default ACL = Dxtm). Hosted projects created earlier granted service_role SELECT/INSERT/UPDATE/DELETE by
-- default, and the application code relies on that (e.g. admin.from("services").select(), bookings insert).
-- This script mirrors that legacy default for service_role ONLY, on public tables that lack it.
-- It is idempotent. Restore the previous ACLs with the snapshot taken before running it (see Phase 4 docs).
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not (has_table_privilege('service_role', c.oid, 'SELECT') and has_table_privilege('service_role', c.oid, 'INSERT')
        and has_table_privilege('service_role', c.oid, 'UPDATE') and has_table_privilege('service_role', c.oid, 'DELETE'))
  loop
    execute format('grant select, insert, update, delete on table public.%I to service_role', t.relname);
  end loop;
  grant usage, select on all sequences in schema public to service_role;
end $$;
