-- LOCAL DEVELOPMENT ONLY — never run against staging/production.
-- Newer Supabase CLI databases no longer give API roles data privileges on tables created by migrations
-- (default ACL = Dxtm). Hosted projects created earlier granted service_role SELECT/INSERT/UPDATE/DELETE by default,
-- and the application relies on that for tables it reads/writes directly (e.g. services, bookings, clients).
-- This script restores that legacy default for service_role ONLY on tables that (a) lack it and (b) are NOT
-- deliberately revoked from service_role by a migration (booking_* reservation tables, payments ledger, webhook inbox,
-- legal/agreement records, cash registers, promo codes …), so the RPC-only design of those tables stays intact.
-- Idempotent. Undo with scripts/local/restore-service-role-acl-pre-phase4.sql.
do $$
declare t record;
  deliberately_revoked text[] := array[
    'agreement_acceptances','booking_agreement_requirements','booking_reservation_events','booking_reservations',
    'booking_resource_blackouts','booking_resource_weekly_hours','booking_resources','booking_schedule_history',
    'cash_register_events','cash_register_session_events','cash_register_sessions','cash_registers','cash_transactions',
    'consent_records','customer_booking_agreements','inventory_movements','invoice_items','legal_document_versions',
    'legal_documents','locations','payment_allocations','payment_events','payment_line_items','payment_refunds',
    'payment_settlements','payments','promo_code_usages','promo_codes','provider_webhook_inbox','receipt_line_items','receipts',
    -- Phase 4B tables are RPC-only as well
    'booking_resource_types','service_resource_requirements'];
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> all (deliberately_revoked)
      and c.relname not like 'safety_test_%'
      and not (has_table_privilege('service_role', c.oid, 'SELECT') and has_table_privilege('service_role', c.oid, 'INSERT')
        and has_table_privilege('service_role', c.oid, 'UPDATE') and has_table_privilege('service_role', c.oid, 'DELETE'))
  loop
    execute format('grant select, insert, update, delete on table public.%I to service_role', t.relname);
  end loop;
end $$;
