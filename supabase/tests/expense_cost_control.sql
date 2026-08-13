begin;
select plan(22);

select has_table('public', 'expense_categories', 'expense categories exist');
select has_table('public', 'expense_allocations', 'expense allocations exist');
select has_table('public', 'expense_attachments', 'expense attachments exist');
select has_table('public', 'expense_reviews', 'expense reviews exist');
select has_table('public', 'reimbursement_claims', 'reimbursements exist');
select has_table('public', 'owner_advances', 'owner advances exist');
select has_table('public', 'owner_advance_repayments', 'owner repayment history exists');
select has_table('public', 'recurring_expense_templates', 'recurring templates exist');
select ok((select relrowsecurity from pg_class where oid = 'public.expenses'::regclass), 'expenses retain RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.expense_allocations'::regclass), 'allocations use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.expense_attachments'::regclass), 'attachments use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.reimbursement_claims'::regclass), 'claims use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.owner_advances'::regclass), 'owner advances use RLS');
select function_privs_are('public', 'expense_create', array['uuid','uuid','text','uuid','text','date','integer','integer','uuid','text','uuid','text','text','text','text','text','jsonb','boolean','boolean','boolean','uuid'], 'authenticated', array[]::text[], 'authenticated cannot execute expense creation directly');
select function_privs_are('public', 'expense_transition', array['uuid','uuid','integer','text','text'], 'authenticated', array[]::text[], 'authenticated cannot transition expenses directly');
select function_privs_are('public', 'owner_advance_record_repayment', array['uuid','uuid','uuid','integer','text','timestamp with time zone','uuid'], 'authenticated', array[]::text[], 'authenticated cannot repay owner advances directly');
select function_privs_are('public', 'expense_schedule_reimbursement', array['uuid','uuid','integer'], 'authenticated', array[]::text[], 'authenticated cannot schedule reimbursements directly');
select function_privs_are('public', 'expense_record_reimbursement_payment', array['uuid','uuid','integer','uuid','text','timestamp with time zone','uuid'], 'authenticated', array[]::text[], 'authenticated cannot pay reimbursements directly');
select function_privs_are('public', 'expense_resolve_duplicate', array['uuid','uuid','integer','text','uuid','text'], 'authenticated', array[]::text[], 'authenticated cannot resolve duplicates directly');
select function_privs_are('public', 'recurring_expense_create', array['uuid','text','uuid','integer','text','date','uuid','jsonb','boolean','date','date','smallint'], 'authenticated', array[]::text[], 'authenticated cannot create recurring templates directly');
select function_privs_are('public', 'recurring_expense_generate', array['uuid','uuid'], 'authenticated', array[]::text[], 'authenticated cannot generate recurring expenses directly');
select function_privs_are('public', 'expense_update_draft', array['uuid','uuid','integer','text','uuid','text','date','integer','integer','text','text','text','jsonb','boolean'], 'authenticated', array[]::text[], 'authenticated cannot correct expenses directly');

select * from finish();
rollback;
