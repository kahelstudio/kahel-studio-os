-- Upgrade the existing expense register into the canonical studio cost ledger.
-- Amounts are integer Philippine centavos. Approvals remain in approval_requests;
-- expense reviews record posting/correction state without duplicating that ledger.

create table public.expense_reference_counters (
  reference_year integer primary key check (reference_year between 2020 and 9999),
  last_number integer not null check (last_number > 0)
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 100),
  reporting_group text not null default 'Operating expenses' check (length(btrim(reporting_group)) between 2 and 100),
  active boolean not null default true,
  requires_project boolean not null default false,
  receipt_threshold_centavos integer check (receipt_threshold_centavos is null or receipt_threshold_centavos >= 0),
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index expense_categories_name_unique on public.expense_categories (lower(name));

insert into public.expense_categories (name, reporting_group) values
  ('Software and subscriptions', 'Technology'), ('Equipment', 'Equipment'),
  ('Equipment repair', 'Equipment'), ('Studio supplies', 'Operations'),
  ('Printing', 'Operations'), ('Utilities', 'Occupancy'), ('Rent', 'Occupancy'),
  ('Transport and fuel', 'Production'), ('Meals during approved production', 'Production'),
  ('Freelancers and contractors', 'People'), ('Marketing', 'Sales and marketing'),
  ('Internet and communications', 'Technology'), ('Government fees and permits', 'Compliance'),
  ('Professional services', 'Professional services'), ('Insurance', 'Occupancy'),
  ('Training', 'People'), ('Miscellaneous', 'Operating expenses')
on conflict do nothing;

create table public.expense_payment_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (length(btrim(name)) between 2 and 100),
  method text not null check (method in ('cash','bank_transfer','e_wallet','card','owner_advance','staff_personal','other')),
  source_type text not null default 'studio_account' check (source_type in ('studio_account','owner','staff','other')),
  active boolean not null default true,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.expense_payment_sources (code, name, method, source_type) values
  ('cash', 'Cash', 'cash', 'studio_account'),
  ('security_bank', 'Security Bank', 'bank_transfer', 'studio_account'),
  ('bpi', 'BPI', 'bank_transfer', 'studio_account'),
  ('bdo', 'BDO', 'bank_transfer', 'studio_account'),
  ('gcash', 'GCash', 'e_wallet', 'studio_account'),
  ('maya', 'Maya', 'e_wallet', 'studio_account'),
  ('gotyme', 'GoTyme', 'bank_transfer', 'studio_account'),
  ('tonik', 'Tonik', 'bank_transfer', 'studio_account'),
  ('owner_advance', 'Owner advance', 'owner_advance', 'owner'),
  ('staff_personal', 'Staff personal funds', 'staff_personal', 'staff'),
  ('other', 'Other configured account', 'other', 'other')
on conflict do nothing;

alter table public.expenses
  add column vendor_name_snapshot text,
  add column category_id uuid references public.expense_categories(id) on delete restrict,
  add column subtotal_amount_centavos integer,
  add column tax_amount_centavos integer not null default 0,
  add column total_amount_centavos integer,
  add column currency text not null default 'PHP',
  add column payment_source_id uuid references public.expense_payment_sources(id) on delete restrict,
  add column payment_method text,
  add column paid_by_type text not null default 'studio_account',
  add column paid_by_user_id uuid references public.staff_profiles(user_id) on delete restrict,
  add column payment_date date,
  add column transaction_reference text,
  add column status text not null default 'approved',
  add column receipt_status text not null default 'missing',
  add column receipt_exception_reason text,
  add column internal_note text,
  add column invoice_number text,
  add column receipt_number text,
  add column approval_request_id uuid references public.approval_requests(id) on delete restrict,
  add column recurring_template_id uuid,
  add column reimbursement_state text not null default 'not_applicable',
  add column owner_funded boolean not null default false,
  add column duplicate_of uuid references public.expenses(id) on delete restrict,
  add column duplicate_suspected boolean not null default false,
  add column create_idempotency_key uuid,
  add column request_fingerprint text,
  add column submitted_by uuid references public.staff_profiles(user_id) on delete restrict,
  add column submitted_at timestamptz,
  add column approved_by uuid references public.staff_profiles(user_id) on delete restrict,
  add column approved_at timestamptz,
  add column payment_recorded_at timestamptz,
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now(),
  add column voided_at timestamptz,
  add constraint expenses_status_check check (status in ('draft','submitted','needs_review','changes_requested','approved','scheduled_for_payment','paid','rejected','voided')) not valid,
  add constraint expenses_receipt_status_check check (receipt_status in ('missing','attached','under_review','verified','invalid','not_required')) not valid,
  add constraint expenses_paid_by_type_check check (paid_by_type in ('studio_account','owner','staff','other')) not valid,
  add constraint expenses_reimbursement_state_check check (reimbursement_state in ('not_applicable','pending','approved','scheduled','paid','rejected')) not valid,
  add constraint expenses_currency_check check (currency ~ '^[A-Z]{3}$') not valid,
  add constraint expenses_amounts_check check (subtotal_amount_centavos > 0 and tax_amount_centavos >= 0 and total_amount_centavos = subtotal_amount_centavos + tax_amount_centavos) not valid,
  add constraint expenses_receipt_exception_check check (receipt_status <> 'missing' or receipt_exception_reason is not null or status = 'draft') not valid;

update public.expenses set
  vendor_name_snapshot = coalesce(nullif(btrim(description), ''), 'Historical expense'),
  subtotal_amount_centavos = amount_php,
  total_amount_centavos = amount_php,
  payment_date = expense_date,
  submitted_by = created_by,
  submitted_at = created_at,
  approved_by = created_by,
  approved_at = created_at,
  receipt_status = 'not_required',
  category_id = (select id from public.expense_categories where name = 'Miscellaneous' limit 1)
where total_amount_centavos is null;

alter table public.expenses
  alter column vendor_name_snapshot set not null,
  alter column category_id set not null,
  alter column subtotal_amount_centavos set not null,
  alter column total_amount_centavos set not null;
alter table public.expenses validate constraint expenses_status_check;
alter table public.expenses validate constraint expenses_receipt_status_check;
alter table public.expenses validate constraint expenses_paid_by_type_check;
alter table public.expenses validate constraint expenses_reimbursement_state_check;
alter table public.expenses validate constraint expenses_currency_check;
alter table public.expenses validate constraint expenses_amounts_check;
alter table public.expenses validate constraint expenses_receipt_exception_check;

create table public.expense_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete restrict,
  allocation_type text not null check (allocation_type in ('studio_overhead','project','booking','inventory_asset','maintenance','owner_advance','staff_reimbursement')),
  project_id uuid references public.projects(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  maintenance_record_id uuid references public.maintenance_records(id) on delete restrict,
  amount_centavos integer not null check (amount_centavos > 0),
  created_by uuid references public.staff_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint expense_allocation_destination_check check (
    (allocation_type = 'studio_overhead' and project_id is null and booking_id is null and equipment_id is null and maintenance_record_id is null) or
    (allocation_type = 'project' and project_id is not null) or
    (allocation_type = 'booking' and booking_id is not null) or
    (allocation_type = 'inventory_asset' and equipment_id is not null) or
    (allocation_type = 'maintenance' and maintenance_record_id is not null) or
    allocation_type in ('owner_advance','staff_reimbursement')
  )
);
create unique index expense_allocations_unique_destination on public.expense_allocations
  (expense_id, allocation_type, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(equipment_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(maintenance_record_id, '00000000-0000-0000-0000-000000000000'::uuid));

insert into public.expense_allocations (expense_id, allocation_type, amount_centavos, created_by)
select id, 'studio_overhead', total_amount_centavos, created_by from public.expenses
where not exists (select 1 from public.expense_allocations a where a.expense_id = expenses.id);

create table public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete restrict,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  document_type text not null check (document_type in ('receipt','supplier_invoice','proof_of_payment','warranty','purchase_order','supporting_document')),
  verification_status text not null default 'attached' check (verification_status in ('attached','under_review','verified','invalid')),
  uploaded_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.staff_profiles(user_id) on delete restrict,
  unique (expense_id, media_asset_id)
);

create table public.expense_reviews (
  id bigint generated always as identity primary key,
  expense_id uuid not null references public.expenses(id) on delete restrict,
  actor_id uuid references public.staff_profiles(user_id) on delete restrict,
  action text not null check (length(btrim(action)) between 2 and 80),
  previous_status text,
  new_status text,
  reason text check (reason is null or length(btrim(reason)) between 2 and 2000),
  previous_data jsonb not null default '{}'::jsonb check (jsonb_typeof(previous_data) = 'object'),
  new_data jsonb not null default '{}'::jsonb check (jsonb_typeof(new_data) = 'object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.reimbursement_claims (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null unique references public.expenses(id) on delete restrict,
  staff_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  approval_request_id uuid unique references public.approval_requests(id) on delete restrict,
  requested_amount_centavos integer not null check (requested_amount_centavos > 0),
  approved_amount_centavos integer check (approved_amount_centavos is null or approved_amount_centavos > 0),
  payout_status text not null default 'pending' check (payout_status in ('pending','approved','scheduled','paid','rejected','voided')),
  requested_payout_method text,
  financial_event_id uuid unique references public.approval_financial_events(id) on delete restrict,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.owner_advances (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null unique references public.expenses(id) on delete restrict,
  funder_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  amount_advanced_centavos integer not null check (amount_advanced_centavos > 0),
  amount_repaid_centavos integer not null default 0 check (amount_repaid_centavos >= 0),
  status text not null default 'outstanding' check (status in ('outstanding','partially_repaid','repaid','disputed','voided')),
  funded_at date not null,
  created_at timestamptz not null default now(),
  constraint owner_advance_balance_check check (amount_repaid_centavos <= amount_advanced_centavos)
);

create table public.owner_advance_repayments (
  id uuid primary key default gen_random_uuid(),
  owner_advance_id uuid not null references public.owner_advances(id) on delete restrict,
  payment_source_id uuid not null references public.expense_payment_sources(id) on delete restrict,
  amount_centavos integer not null check (amount_centavos > 0),
  transaction_reference text not null check (length(btrim(transaction_reference)) between 2 and 120),
  idempotency_key uuid not null unique,
  paid_at timestamptz not null,
  recorded_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (owner_advance_id, transaction_reference)
);

create table public.recurring_expense_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_name_snapshot text not null check (length(btrim(vendor_name_snapshot)) between 2 and 255),
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  expected_amount_centavos integer not null check (expected_amount_centavos > 0),
  frequency text not null check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_due_date date not null,
  payment_source_id uuid references public.expense_payment_sources(id) on delete restrict,
  default_allocation jsonb not null default '[{"allocationType":"studio_overhead","amountPercent":100}]'::jsonb check (jsonb_typeof(default_allocation) = 'array'),
  receipt_required boolean not null default true,
  state text not null default 'active' check (state in ('active','paused','ended','attention_required')),
  start_date date not null,
  end_date date,
  reminder_days smallint not null default 3 check (reminder_days between 0 and 90),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_expense_dates_check check (end_date is null or end_date >= start_date)
);
alter table public.expenses add constraint expenses_recurring_template_fk foreign key (recurring_template_id) references public.recurring_expense_templates(id) on delete restrict;
create unique index expenses_recurring_instance_unique on public.expenses (recurring_template_id, expense_date) where recurring_template_id is not null and status <> 'voided';

create index expenses_status_date_idx on public.expenses (status, expense_date desc);
create unique index expenses_create_idempotency_unique on public.expenses (created_by, create_idempotency_key) where create_idempotency_key is not null;
create index expenses_category_idx on public.expenses (category_id, expense_date desc);
create index expenses_submitter_idx on public.expenses (submitted_by, created_at desc);
create index expenses_payment_source_idx on public.expenses (payment_source_id, expense_date desc);
create index expenses_search_idx on public.expenses using gin (to_tsvector('simple', coalesce(vendor_name_snapshot,'') || ' ' || reference || ' ' || description || ' ' || coalesce(receipt_number,'') || ' ' || coalesce(invoice_number,'')));
create index expense_allocations_project_idx on public.expense_allocations (project_id, expense_id) where project_id is not null;
create index expense_reviews_expense_idx on public.expense_reviews (expense_id, created_at);
create index owner_advances_status_idx on public.owner_advances (status, funded_at);
create index recurring_expense_due_idx on public.recurring_expense_templates (state, next_due_date);

create trigger expense_categories_updated_at before update on public.expense_categories for each row execute function public.set_customer_updated_at();
create trigger expense_payment_sources_updated_at before update on public.expense_payment_sources for each row execute function public.set_customer_updated_at();
create trigger reimbursement_claims_updated_at before update on public.reimbursement_claims for each row execute function public.set_customer_updated_at();
create trigger recurring_expenses_updated_at before update on public.recurring_expense_templates for each row execute function public.set_customer_updated_at();

create or replace function public.expense_next_reference()
returns text language plpgsql security definer set search_path = '' as $$
declare
  requested_year integer := extract(year from timezone('Asia/Manila', now()))::integer;
  requested_number integer;
begin
  insert into public.expense_reference_counters (reference_year, last_number) values (requested_year, 1)
  on conflict (reference_year) do update set last_number = public.expense_reference_counters.last_number + 1
  returning last_number into requested_number;
  return format('EXP-%s-%s', requested_year, lpad(requested_number::text, 4, '0'));
end
$$;

create or replace function public.prevent_expense_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Expense history is immutable';
end
$$;
create trigger expense_reviews_immutable before update or delete on public.expense_reviews for each row execute function public.prevent_expense_history_mutation();
create trigger owner_advance_repayments_immutable before update or delete on public.owner_advance_repayments for each row execute function public.prevent_expense_history_mutation();

create or replace function public.protect_approved_expense()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.expense_controlled_mutation', true) <> 'on' and old.status in ('approved','scheduled_for_payment','paid','voided') and
    (new.total_amount_centavos, new.subtotal_amount_centavos, new.tax_amount_centavos, new.expense_date, new.category_id, new.vendor_name_snapshot, new.status)
    is distinct from
    (old.total_amount_centavos, old.subtotal_amount_centavos, old.tax_amount_centavos, old.expense_date, old.category_id, old.vendor_name_snapshot, old.status) then
    raise exception 'Approved financial values require a controlled correction';
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end
$$;
create trigger expenses_protected_update before update on public.expenses for each row execute function public.protect_approved_expense();

create or replace function public.expense_create(
  requested_actor_id uuid, requested_idempotency_key uuid, requested_vendor text,
  requested_category_id uuid, requested_description text, requested_date date,
  requested_subtotal_centavos integer, requested_tax_centavos integer,
  requested_payment_source_id uuid, requested_paid_by_type text,
  requested_paid_by_user_id uuid, requested_receipt_status text,
  requested_receipt_exception text, requested_internal_note text,
  requested_invoice_number text, requested_receipt_number text,
  requested_allocations jsonb, requested_submit boolean,
  requested_reimbursable boolean, requested_owner_funded boolean,
  requested_approval_request_id uuid default null
) returns public.expenses language plpgsql security definer set search_path = '' as $$
declare
  created public.expenses;
  linked_approval public.approval_requests;
  total integer;
  allocation jsonb;
  allocation_sum bigint;
  source public.expense_payment_sources;
  existing public.expenses;
  fingerprint text;
  requested_category public.expense_categories;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active) then raise exception 'Unauthorized expense actor' using errcode = '42501'; end if;
  if requested_subtotal_centavos <= 0 or requested_tax_centavos < 0 then raise exception 'Expense amount must be greater than zero'; end if;
  total := requested_subtotal_centavos + requested_tax_centavos;
  fingerprint := encode(sha256(convert_to(jsonb_build_object(
    'vendor', btrim(requested_vendor), 'category', requested_category_id, 'description', btrim(requested_description),
    'date', requested_date, 'subtotal', requested_subtotal_centavos, 'tax', requested_tax_centavos,
    'payment_source', requested_payment_source_id, 'paid_by_type', requested_paid_by_type,
    'paid_by', requested_paid_by_user_id, 'allocations', requested_allocations,
    'reimbursable', requested_reimbursable, 'owner_funded', requested_owner_funded
  )::text, 'utf8')), 'hex');
  if jsonb_typeof(requested_allocations) <> 'array' or jsonb_array_length(requested_allocations) = 0 then raise exception 'At least one allocation is required'; end if;
  select coalesce(sum((item->>'amountCentavos')::bigint), 0) into allocation_sum from jsonb_array_elements(requested_allocations) item;
  if allocation_sum <> total then raise exception 'Allocations must equal the expense total'; end if;
  select * into source from public.expense_payment_sources where id = requested_payment_source_id and active;
  if requested_payment_source_id is not null and source.id is null then raise exception 'Payment source is unavailable'; end if;
  select * into requested_category from public.expense_categories where id = requested_category_id and active;
  if requested_category.id is null then raise exception 'Expense category is unavailable'; end if;
  if requested_category.requires_project and not exists (select 1 from jsonb_array_elements(requested_allocations) item where item->>'allocationType' = 'project' and nullif(item->>'projectId','') is not null) then raise exception 'This category requires project allocation'; end if;
  if requested_paid_by_type = 'owner' and (source.source_type <> 'owner' or requested_paid_by_user_id is null or not exists (select 1 from public.staff_profiles where user_id = requested_paid_by_user_id and active and role = 'super_admin')) then raise exception 'Owner-funded expenses require the configured owner source and owner'; end if;
  if requested_paid_by_type = 'staff' and (source.source_type <> 'staff' or requested_paid_by_user_id is null) then raise exception 'Staff reimbursements require the personal-funds source and staff member'; end if;
  if requested_paid_by_type = 'studio_account' and source.id is not null and source.source_type <> 'studio_account' then raise exception 'Studio expenses require a studio payment source'; end if;
  select * into existing from public.expenses where created_by = requested_actor_id and create_idempotency_key = requested_idempotency_key;
  if existing.id is not null then
    if existing.request_fingerprint <> fingerprint then raise exception 'Submission key was reused with different expense details' using errcode = '40001'; end if;
    return existing;
  end if;
  if requested_reimbursable and requested_approval_request_id is not null then
    if not exists (select 1 from public.approval_requests where id = requested_approval_request_id and requester_id = requested_actor_id and request_type = 'expense_reimbursement' and amount_php = total and currency = 'PHP' and source_record_id is null) then raise exception 'The reimbursement approval request does not match this expense'; end if;
  end if;
  if requested_reimbursable and requested_approval_request_id is null then
    linked_approval := public.approval_create_request(
      requested_actor_id, requested_idempotency_key, 'expense_reimbursement',
      'Reimbursement: ' || btrim(requested_vendor), btrim(requested_description),
      'normal', 'expenses',
      jsonb_build_object('expenseDate', requested_date, 'vendor', btrim(requested_vendor), 'expenseCategory', (select name from public.expense_categories where id = requested_category_id), 'paymentMethod', coalesce(source.name, 'Personal funds')),
      requested_submit, requested_date, total, 'PHP',
      (select nullif(item->>'projectId','')::uuid from jsonb_array_elements(requested_allocations) item where item->>'projectId' is not null limit 1),
      (select nullif(item->>'bookingId','')::uuid from jsonb_array_elements(requested_allocations) item where item->>'bookingId' is not null limit 1),
      null, null, null, null, requested_internal_note
    );
    requested_approval_request_id := linked_approval.id;
  end if;
  insert into public.expenses (
    reference, vendor_name_snapshot, category_id, category, description, expense_date,
    subtotal_amount_centavos, tax_amount_centavos, total_amount_centavos, amount_php,
    payment_source_id, payment_method, paid_by_type, paid_by_user_id, payment_date,
    status, receipt_status, receipt_exception_reason, internal_note, invoice_number,
    receipt_number, approval_request_id, reimbursement_state, owner_funded,
    submitted_by, submitted_at, created_by, create_idempotency_key, request_fingerprint
  ) values (
    public.expense_next_reference(), btrim(requested_vendor), requested_category_id,
    (select name from public.expense_categories where id = requested_category_id and active),
    btrim(requested_description), requested_date, requested_subtotal_centavos,
    requested_tax_centavos, total, total, requested_payment_source_id, source.method,
    requested_paid_by_type, requested_paid_by_user_id,
    case when requested_paid_by_type in ('studio_account','owner','staff') then requested_date else null end,
    case when requested_submit then 'needs_review' else 'draft' end,
    requested_receipt_status, nullif(btrim(requested_receipt_exception), ''),
    nullif(btrim(requested_internal_note), ''), nullif(btrim(requested_invoice_number), ''),
    nullif(btrim(requested_receipt_number), ''), requested_approval_request_id,
    case when requested_reimbursable then 'pending' else 'not_applicable' end,
    requested_owner_funded,
    case when requested_submit then requested_actor_id else null end,
    case when requested_submit then now() else null end, requested_actor_id, requested_idempotency_key, fingerprint
  ) returning * into created;
  if created.category is null then raise exception 'Expense category is unavailable'; end if;
  for allocation in select value from jsonb_array_elements(requested_allocations) loop
    insert into public.expense_allocations (expense_id, allocation_type, project_id, booking_id, equipment_id, maintenance_record_id, amount_centavos, created_by)
    values (created.id, allocation->>'allocationType', nullif(allocation->>'projectId','')::uuid, nullif(allocation->>'bookingId','')::uuid, nullif(allocation->>'equipmentId','')::uuid, nullif(allocation->>'maintenanceRecordId','')::uuid, (allocation->>'amountCentavos')::integer, requested_actor_id);
  end loop;
  if requested_reimbursable then
    insert into public.reimbursement_claims (expense_id, staff_id, approval_request_id, requested_amount_centavos, requested_payout_method)
    values (created.id, coalesce(requested_paid_by_user_id, requested_actor_id), requested_approval_request_id, total, source.name);
  end if;
  if requested_reimbursable and linked_approval.id is not null then
    update public.approval_requests set source_record_id = created.id, source_reference = created.reference where id = linked_approval.id;
  end if;
  if requested_owner_funded then
    if requested_paid_by_user_id is null then raise exception 'Owner funder is required'; end if;
    insert into public.owner_advances (expense_id, funder_id, amount_advanced_centavos, funded_at) values (created.id, requested_paid_by_user_id, total, requested_date);
  end if;
  if exists (
    select 1 from public.expenses other
    where other.id <> created.id and other.status not in ('rejected','voided') and other.duplicate_of is null
      and lower(other.vendor_name_snapshot) = lower(created.vendor_name_snapshot)
      and other.expense_date between created.expense_date - 3 and created.expense_date + 3
      and other.total_amount_centavos = created.total_amount_centavos
      and (created.invoice_number is null or other.invoice_number = created.invoice_number)
      and (created.receipt_number is null or other.receipt_number = created.receipt_number)
  ) then
    update public.expenses set duplicate_suspected = true where id = created.id;
    insert into public.expense_reviews (expense_id, actor_id, action, metadata) values (created.id, requested_actor_id, 'duplicate_warning_raised', jsonb_build_object('vendor', created.vendor_name_snapshot, 'date', created.expense_date, 'amount_centavos', created.total_amount_centavos));
    select * into created from public.expenses where id = created.id;
  end if;
  insert into public.expense_reviews (expense_id, actor_id, action, previous_status, new_status, new_data, metadata)
  values (created.id, requested_actor_id, 'created', null, created.status, jsonb_build_object('total_centavos', total), jsonb_build_object('idempotency_key', requested_idempotency_key));
  if requested_submit then insert into public.expense_reviews (expense_id, actor_id, action, previous_status, new_status) values (created.id, requested_actor_id, 'submitted', 'draft', 'needs_review'); end if;
  return created;
exception
  when unique_violation then
    select * into existing from public.expenses where created_by = requested_actor_id and create_idempotency_key = requested_idempotency_key;
    if existing.id is not null and existing.request_fingerprint = fingerprint then return existing; end if;
    if existing.id is not null then raise exception 'Submission key was reused with different expense details' using errcode = '40001'; end if;
    raise;
end
$$;

create or replace function public.expense_transition(
  requested_expense_id uuid, requested_actor_id uuid, requested_expected_version integer,
  requested_action text, requested_reason text default null
) returns public.expenses language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses; next_status text; previous_status text; actor_role public.staff_role;
begin
  select * into current_expense from public.expenses where id = requested_expense_id for update;
  if current_expense.id is null then raise exception 'Expense not found'; end if;
  if current_expense.version <> requested_expected_version then raise exception 'Expense changed before this action completed' using errcode = '40001'; end if;
  previous_status := current_expense.status;
  select role into actor_role from public.staff_profiles where user_id = requested_actor_id and active;
  if actor_role is null then raise exception 'Unauthorized expense actor' using errcode = '42501'; end if;
  if requested_action = 'submit' and current_expense.status in ('draft','changes_requested') and current_expense.created_by = requested_actor_id then next_status := 'needs_review';
  elsif requested_action in ('approve','request_changes','reject') and current_expense.status in ('submitted','needs_review') and actor_role in ('admin','super_admin') then
    if current_expense.submitted_by = requested_actor_id then raise exception 'You cannot approve your own expense' using errcode = '42501'; end if;
    if requested_action = 'approve' and current_expense.reimbursement_state <> 'not_applicable' and not exists (select 1 from public.approval_requests where id = current_expense.approval_request_id and status = 'approved' and request_type = 'expense_reimbursement' and amount_php = current_expense.total_amount_centavos) then raise exception 'The linked reimbursement approval must be approved first'; end if;
    if requested_action = 'approve' and current_expense.duplicate_suspected then raise exception 'Resolve the duplicate warning before approval'; end if;
    if requested_action = 'approve' and (select coalesce(sum(amount_centavos),0) from public.expense_allocations where expense_id = current_expense.id) <> current_expense.total_amount_centavos then raise exception 'Allocations must equal the expense total'; end if;
    if requested_action = 'approve' and current_expense.receipt_status = 'invalid' then raise exception 'An invalid receipt cannot be approved'; end if;
    next_status := case requested_action when 'approve' then 'approved' when 'request_changes' then 'changes_requested' else 'rejected' end;
  elsif requested_action = 'void' and actor_role = 'super_admin' and current_expense.status in ('draft','submitted','needs_review','changes_requested','approved','rejected')
    and not exists (select 1 from public.reimbursement_claims where expense_id = current_expense.id and payout_status in ('scheduled','paid'))
    and not exists (select 1 from public.owner_advances where expense_id = current_expense.id and amount_repaid_centavos > 0)
    then next_status := 'voided';
  else raise exception 'This expense action is not allowed' using errcode = '42501'; end if;
  if requested_action in ('request_changes','reject','void') and length(btrim(coalesce(requested_reason,''))) < 2 then raise exception 'A reason is required'; end if;
  perform set_config('app.expense_controlled_mutation', 'on', true);
  update public.expenses set status = next_status,
    submitted_by = case when requested_action = 'submit' then requested_actor_id else submitted_by end,
    submitted_at = case when requested_action = 'submit' then now() else submitted_at end,
    approved_by = case when requested_action = 'approve' then requested_actor_id else approved_by end,
    approved_at = case when requested_action = 'approve' then now() else approved_at end,
    voided_at = case when requested_action = 'void' then now() else voided_at end,
    reimbursement_state = case when requested_action = 'approve' and reimbursement_state = 'pending' then 'approved' when requested_action = 'reject' and reimbursement_state <> 'not_applicable' then 'rejected' else reimbursement_state end
  where id = requested_expense_id returning * into current_expense;
  update public.reimbursement_claims set payout_status = case when requested_action = 'approve' then 'approved' else 'rejected' end,
    approved_amount_centavos = case when requested_action = 'approve' then requested_amount_centavos else approved_amount_centavos end
  where expense_id = requested_expense_id and requested_action in ('approve','reject');
  if requested_action = 'void' then
    update public.reimbursement_claims set payout_status = 'voided' where expense_id = requested_expense_id and payout_status not in ('scheduled','paid');
    update public.owner_advances set status = 'voided' where expense_id = requested_expense_id and amount_repaid_centavos = 0;
  end if;
  insert into public.expense_reviews (expense_id, actor_id, action, previous_status, new_status, reason)
  values (requested_expense_id, requested_actor_id, requested_action, previous_status, next_status, nullif(btrim(requested_reason),''));
  return current_expense;
end
$$;

create or replace function public.owner_advance_record_repayment(
  requested_owner_advance_id uuid, requested_actor_id uuid, requested_payment_source_id uuid,
  requested_amount_centavos integer, requested_transaction_reference text,
  requested_paid_at timestamptz, requested_idempotency_key uuid
) returns public.owner_advances language plpgsql security definer set search_path = '' as $$
declare advance public.owner_advances; existing public.owner_advance_repayments; source public.expense_payment_sources;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Only authorized staff may record owner repayments' using errcode = '42501'; end if;
  select * into existing from public.owner_advance_repayments where idempotency_key = requested_idempotency_key;
  select * into advance from public.owner_advances where id = requested_owner_advance_id for update;
  if advance.id is null then raise exception 'Owner advance not found'; end if;
  if existing.id is not null then
    if existing.owner_advance_id <> requested_owner_advance_id or existing.amount_centavos <> requested_amount_centavos or existing.payment_source_id <> requested_payment_source_id or existing.transaction_reference <> btrim(requested_transaction_reference) then raise exception 'Repayment key was reused with different details' using errcode = '40001'; end if;
    return advance;
  end if;
  select * into source from public.expense_payment_sources where id = requested_payment_source_id and active and source_type = 'studio_account';
  if source.id is null then raise exception 'Choose an active studio payment source'; end if;
  if advance.status not in ('outstanding','partially_repaid') then raise exception 'This owner advance cannot be repaid'; end if;
  if requested_amount_centavos <= 0 or requested_amount_centavos > advance.amount_advanced_centavos - advance.amount_repaid_centavos then raise exception 'Repayment exceeds the outstanding owner advance'; end if;
  insert into public.owner_advance_repayments (owner_advance_id, payment_source_id, amount_centavos, transaction_reference, idempotency_key, paid_at, recorded_by)
  values (advance.id, requested_payment_source_id, requested_amount_centavos, btrim(requested_transaction_reference), requested_idempotency_key, requested_paid_at, requested_actor_id);
  update public.owner_advances set amount_repaid_centavos = amount_repaid_centavos + requested_amount_centavos,
    status = case when amount_repaid_centavos + requested_amount_centavos = amount_advanced_centavos then 'repaid' else 'partially_repaid' end
  where id = advance.id returning * into advance;
  insert into public.expense_reviews (expense_id, actor_id, action, metadata) values (advance.expense_id, requested_actor_id, case when advance.status = 'repaid' then 'owner_advance_repaid' else 'owner_advance_partially_repaid' end, jsonb_build_object('amount_centavos', requested_amount_centavos, 'owner_advance_id', advance.id));
  return advance;
end
$$;

create or replace function public.expense_schedule_reimbursement(requested_expense_id uuid, requested_actor_id uuid, requested_expected_version integer)
returns public.expenses language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses; claim public.reimbursement_claims;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Financial recording permission is required' using errcode = '42501'; end if;
  select * into current_expense from public.expenses where id = requested_expense_id for update;
  select * into claim from public.reimbursement_claims where expense_id = requested_expense_id for update;
  if current_expense.version <> requested_expected_version then raise exception 'Expense changed before this action completed' using errcode = '40001'; end if;
  if current_expense.status <> 'approved' or current_expense.reimbursement_state <> 'approved' or claim.payout_status <> 'approved' then raise exception 'Only approved reimbursements can be scheduled'; end if;
  perform set_config('app.expense_controlled_mutation', 'on', true);
  update public.expenses set status = 'scheduled_for_payment', reimbursement_state = 'scheduled' where id = current_expense.id returning * into current_expense;
  update public.reimbursement_claims set payout_status = 'scheduled' where id = claim.id;
  insert into public.expense_reviews (expense_id, actor_id, action, previous_status, new_status) values (current_expense.id, requested_actor_id, 'reimbursement_scheduled', 'approved', 'scheduled_for_payment');
  return current_expense;
end
$$;

create or replace function public.expense_record_reimbursement_payment(
  requested_expense_id uuid, requested_actor_id uuid, requested_expected_version integer,
  requested_payment_source_id uuid, requested_transaction_reference text,
  requested_paid_at timestamptz, requested_idempotency_key uuid
) returns public.expenses language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses; claim public.reimbursement_claims; approval public.approval_requests; source public.expense_payment_sources; event_id uuid;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Financial recording permission is required' using errcode = '42501'; end if;
  select * into current_expense from public.expenses where id = requested_expense_id for update;
  select * into claim from public.reimbursement_claims where expense_id = requested_expense_id for update;
  select * into approval from public.approval_requests where id = claim.approval_request_id for update;
  if current_expense.version <> requested_expected_version then raise exception 'Expense changed before this action completed' using errcode = '40001'; end if;
  if claim.payout_status = 'paid' then return current_expense; end if;
  if current_expense.status <> 'scheduled_for_payment' or claim.payout_status <> 'scheduled' or approval.status <> 'approved' or claim.approved_amount_centavos is null then raise exception 'Only scheduled approved reimbursements can be paid'; end if;
  if claim.approved_amount_centavos <> current_expense.total_amount_centavos or approval.amount_php <> claim.approved_amount_centavos then raise exception 'Reimbursement amounts do not match'; end if;
  select * into source from public.expense_payment_sources where id = requested_payment_source_id and active and source_type = 'studio_account';
  if source.id is null then raise exception 'Choose an active studio payment source'; end if;
  select id into event_id from public.approval_financial_events where request_id = approval.id and event_type = 'reimbursement' and transaction_reference = btrim(requested_transaction_reference);
  if event_id is null then
    insert into public.approval_financial_events (request_id,event_type,amount_php,payment_method,transaction_reference,recorded_by,occurred_at,notes)
    values (approval.id,'reimbursement',claim.approved_amount_centavos,source.name,btrim(requested_transaction_reference),requested_actor_id,requested_paid_at,'Expense reimbursement payout') returning id into event_id;
  end if;
  perform set_config('app.expense_controlled_mutation', 'on', true);
  update public.approval_requests set fulfillment_status = 'paid', completed_at = coalesce(completed_at, now()) where id = approval.id;
  update public.reimbursement_claims set payout_status = 'paid', financial_event_id = event_id, paid_at = requested_paid_at where id = claim.id;
  update public.expenses set status = 'paid', reimbursement_state = 'paid', payment_source_id = source.id, payment_method = source.method, payment_date = timezone('Asia/Manila', requested_paid_at)::date, payment_recorded_at = now(), transaction_reference = btrim(requested_transaction_reference) where id = current_expense.id returning * into current_expense;
  insert into public.approval_audit_log (request_id,actor_id,action,previous_state,new_state,metadata) values (approval.id,requested_actor_id,'reimbursement',jsonb_build_object('fulfillment_status','awaiting_payment'),jsonb_build_object('fulfillment_status','paid'),jsonb_build_object('expense_id',current_expense.id,'amount_php',claim.approved_amount_centavos,'transaction_reference',requested_transaction_reference,'idempotency_key',requested_idempotency_key));
  insert into public.expense_reviews (expense_id,actor_id,action,previous_status,new_status,metadata) values (current_expense.id,requested_actor_id,'reimbursement_paid','scheduled_for_payment','paid',jsonb_build_object('financial_event_id',event_id,'transaction_reference',requested_transaction_reference));
  return current_expense;
end
$$;

create or replace function public.expense_resolve_duplicate(
  requested_expense_id uuid, requested_actor_id uuid, requested_expected_version integer,
  requested_action text, requested_duplicate_of uuid default null, requested_reason text default null
) returns public.expenses language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses; canonical public.expenses;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Expense review permission is required' using errcode = '42501'; end if;
  select * into current_expense from public.expenses where id = requested_expense_id for update;
  if current_expense.version <> requested_expected_version then raise exception 'Expense changed before this action completed' using errcode = '40001'; end if;
  if requested_action not in ('dismiss','confirm') or length(btrim(coalesce(requested_reason,''))) < 2 then raise exception 'A duplicate resolution and reason are required'; end if;
  if requested_action = 'confirm' then
    select * into canonical from public.expenses where id = requested_duplicate_of;
    if canonical.id is null or canonical.id = current_expense.id or canonical.duplicate_of is not null then raise exception 'Choose a valid canonical expense'; end if;
    if current_expense.status in ('scheduled_for_payment','paid') or exists (select 1 from public.owner_advances where expense_id = current_expense.id and amount_repaid_centavos > 0) then raise exception 'Settled expenses require a reversal, not duplicate marking'; end if;
  end if;
  perform set_config('app.expense_controlled_mutation', 'on', true);
  update public.expenses set duplicate_suspected = false, duplicate_of = case when requested_action = 'confirm' then canonical.id else null end, status = case when requested_action = 'confirm' then 'voided' else status end, voided_at = case when requested_action = 'confirm' then now() else voided_at end where id = current_expense.id returning * into current_expense;
  insert into public.expense_reviews (expense_id,actor_id,action,reason,metadata) values (current_expense.id,requested_actor_id,case when requested_action = 'confirm' then 'duplicate_marked' else 'duplicate_dismissed' end,btrim(requested_reason),jsonb_build_object('duplicate_of',requested_duplicate_of));
  return current_expense;
end
$$;

create or replace function public.recurring_expense_create(
  requested_actor_id uuid, requested_vendor text, requested_category_id uuid,
  requested_expected_amount_centavos integer, requested_frequency text,
  requested_next_due_date date, requested_payment_source_id uuid,
  requested_default_allocation jsonb, requested_receipt_required boolean,
  requested_start_date date, requested_end_date date default null,
  requested_reminder_days smallint default 3
) returns public.recurring_expense_templates language plpgsql security definer set search_path = '' as $$
declare created public.recurring_expense_templates;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Recurring expense permission is required' using errcode = '42501'; end if;
  if requested_expected_amount_centavos <= 0 then raise exception 'Expected amount must be greater than zero'; end if;
  if requested_frequency not in ('weekly','monthly','quarterly','yearly') then raise exception 'Choose a valid recurring frequency'; end if;
  if jsonb_typeof(requested_default_allocation) <> 'array' or jsonb_array_length(requested_default_allocation) = 0 then raise exception 'A recurring allocation is required'; end if;
  insert into public.recurring_expense_templates (vendor_name_snapshot,category_id,expected_amount_centavos,frequency,next_due_date,payment_source_id,default_allocation,receipt_required,start_date,end_date,reminder_days,created_by)
  values (btrim(requested_vendor),requested_category_id,requested_expected_amount_centavos,requested_frequency,requested_next_due_date,requested_payment_source_id,requested_default_allocation,requested_receipt_required,requested_start_date,requested_end_date,requested_reminder_days,requested_actor_id)
  returning * into created;
  insert into public.staff_audit_log (actor_id,actor_name,event,event_type,entity_type,entity_id,metadata)
  select requested_actor_id,display_name,'Created recurring expense template','billing','recurring_expense_template',created.id,jsonb_build_object('vendor',created.vendor_name_snapshot,'frequency',created.frequency,'expected_amount_centavos',created.expected_amount_centavos) from public.staff_profiles where user_id = requested_actor_id;
  return created;
end
$$;

create or replace function public.recurring_expense_generate(requested_template_id uuid, requested_actor_id uuid)
returns public.expenses language plpgsql security definer set search_path = '' as $$
declare template public.recurring_expense_templates; created public.expenses; allocation jsonb; amount integer; allocated integer := 0; last_index integer; item_index integer := 0; next_date date;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role in ('admin','super_admin')) then raise exception 'Recurring expense permission is required' using errcode = '42501'; end if;
  select * into template from public.recurring_expense_templates where id = requested_template_id for update;
  if template.id is null then raise exception 'Recurring template not found'; end if;
  if template.state <> 'active' or template.end_date is not null and template.next_due_date > template.end_date then raise exception 'Recurring template is not active'; end if;
  select * into created from public.expenses where recurring_template_id = template.id and expense_date = template.next_due_date and status <> 'voided';
  if created.id is not null then return created; end if;
  insert into public.expenses (reference,vendor_name_snapshot,category_id,category,description,expense_date,subtotal_amount_centavos,tax_amount_centavos,total_amount_centavos,amount_php,currency,payment_source_id,payment_method,paid_by_type,status,receipt_status,recurring_template_id,created_by)
  select public.expense_next_reference(),template.vendor_name_snapshot,template.category_id,c.name,'Recurring ' || lower(template.frequency) || ' expense',template.next_due_date,template.expected_amount_centavos,0,template.expected_amount_centavos,template.expected_amount_centavos,'PHP',template.payment_source_id,s.method,'studio_account','draft',case when template.receipt_required then 'missing' else 'not_required' end,template.id,requested_actor_id
  from public.expense_categories c left join public.expense_payment_sources s on s.id = template.payment_source_id where c.id = template.category_id returning * into created;
  last_index := jsonb_array_length(template.default_allocation) - 1;
  for allocation in select value from jsonb_array_elements(template.default_allocation) loop
    item_index := item_index + 1;
    amount := case when item_index - 1 = last_index then template.expected_amount_centavos - allocated else floor(template.expected_amount_centavos * greatest((allocation->>'amountPercent')::numeric,0) / 100)::integer end;
    if amount <= 0 then raise exception 'Recurring allocation produced an invalid amount'; end if;
    insert into public.expense_allocations (expense_id,allocation_type,project_id,booking_id,equipment_id,maintenance_record_id,amount_centavos,created_by)
    values (created.id,allocation->>'allocationType',nullif(allocation->>'projectId','')::uuid,nullif(allocation->>'bookingId','')::uuid,nullif(allocation->>'equipmentId','')::uuid,nullif(allocation->>'maintenanceRecordId','')::uuid,amount,requested_actor_id);
    allocated := allocated + amount;
  end loop;
  if allocated <> template.expected_amount_centavos then raise exception 'Recurring allocations must equal the expected amount'; end if;
  next_date := case template.frequency when 'weekly' then template.next_due_date + 7 when 'monthly' then template.next_due_date + interval '1 month' when 'quarterly' then template.next_due_date + interval '3 months' else template.next_due_date + interval '1 year' end;
  update public.recurring_expense_templates set next_due_date = next_date, state = case when end_date is not null and next_date > end_date then 'ended' else state end where id = template.id;
  insert into public.expense_reviews (expense_id,actor_id,action,new_status,metadata) values (created.id,requested_actor_id,'recurring_instance_generated','draft',jsonb_build_object('template_id',template.id,'due_date',template.next_due_date));
  return created;
exception when unique_violation then
  select * into created from public.expenses where recurring_template_id = requested_template_id and expense_date = template.next_due_date and status <> 'voided';
  if created.id is not null then return created; end if;
  raise;
end
$$;

create or replace function public.expense_update_draft(
  requested_expense_id uuid, requested_actor_id uuid, requested_expected_version integer,
  requested_vendor text, requested_category_id uuid, requested_description text,
  requested_date date, requested_subtotal_centavos integer, requested_tax_centavos integer,
  requested_receipt_status text, requested_receipt_exception text,
  requested_internal_note text, requested_allocations jsonb, requested_submit boolean
) returns public.expenses language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses; previous_data jsonb; previous_allocations jsonb; allocation jsonb; total integer; allocation_sum bigint; next_status text;
begin
  select * into current_expense from public.expenses where id = requested_expense_id for update;
  if current_expense.id is null then raise exception 'Expense not found'; end if;
  if current_expense.created_by <> requested_actor_id then raise exception 'Only the submitter may correct this expense' using errcode = '42501'; end if;
  if current_expense.status not in ('draft','changes_requested') then raise exception 'Only drafts or returned expenses can be corrected'; end if;
  if current_expense.version <> requested_expected_version then raise exception 'Expense changed before this action completed' using errcode = '40001'; end if;
  if requested_subtotal_centavos <= 0 or requested_tax_centavos < 0 then raise exception 'Expense amount must be greater than zero'; end if;
  total := requested_subtotal_centavos + requested_tax_centavos;
  select coalesce(sum((item->>'amountCentavos')::bigint),0) into allocation_sum from jsonb_array_elements(requested_allocations) item;
  if allocation_sum <> total then raise exception 'Allocations must equal the expense total'; end if;
  if not exists (select 1 from public.expense_categories where id = requested_category_id and active) then raise exception 'Expense category is unavailable'; end if;
  if requested_submit and requested_receipt_status = 'missing' and length(btrim(coalesce(requested_receipt_exception,''))) < 2 then raise exception 'Explain why the required receipt is unavailable'; end if;
  previous_data := to_jsonb(current_expense);
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at),'[]'::jsonb) into previous_allocations from public.expense_allocations a where expense_id = current_expense.id;
  next_status := case when requested_submit then 'needs_review' else 'draft' end;
  perform set_config('app.expense_controlled_mutation','on',true);
  update public.expenses set vendor_name_snapshot = btrim(requested_vendor), category_id = requested_category_id, category = (select name from public.expense_categories where id = requested_category_id), description = btrim(requested_description), expense_date = requested_date, subtotal_amount_centavos = requested_subtotal_centavos, tax_amount_centavos = requested_tax_centavos, total_amount_centavos = total, amount_php = total, receipt_status = requested_receipt_status, receipt_exception_reason = nullif(btrim(requested_receipt_exception),''), internal_note = nullif(btrim(requested_internal_note),''), status = next_status, submitted_by = case when requested_submit then requested_actor_id else submitted_by end, submitted_at = case when requested_submit then now() else submitted_at end where id = current_expense.id returning * into current_expense;
  delete from public.expense_allocations where expense_id = current_expense.id;
  for allocation in select value from jsonb_array_elements(requested_allocations) loop
    insert into public.expense_allocations (expense_id,allocation_type,project_id,booking_id,equipment_id,maintenance_record_id,amount_centavos,created_by)
    values (current_expense.id,allocation->>'allocationType',nullif(allocation->>'projectId','')::uuid,nullif(allocation->>'bookingId','')::uuid,nullif(allocation->>'equipmentId','')::uuid,nullif(allocation->>'maintenanceRecordId','')::uuid,(allocation->>'amountCentavos')::integer,requested_actor_id);
  end loop;
  update public.reimbursement_claims set requested_amount_centavos = total, approved_amount_centavos = null, payout_status = 'pending' where expense_id = current_expense.id and payout_status = 'pending';
  update public.approval_requests set subject = 'Reimbursement: ' || current_expense.vendor_name_snapshot, description = current_expense.description, amount_php = total, status = case when requested_submit then 'pending_approval' else 'draft' end, submitted_at = case when requested_submit then now() else null end where id = current_expense.approval_request_id and status in ('draft','returned_for_changes','pending_approval');
  insert into public.expense_reviews (expense_id,actor_id,action,previous_status,new_status,previous_data,new_data,metadata) values (current_expense.id,requested_actor_id,case when requested_submit then 'corrected_and_resubmitted' else 'draft_updated' end,(previous_data->>'status'),next_status,previous_data,to_jsonb(current_expense),jsonb_build_object('previous_allocations',previous_allocations,'new_allocations',requested_allocations));
  return current_expense;
end
$$;

create or replace function public.expense_can_view(requested_expense_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.expenses e join public.staff_profiles s on s.user_id = auth.uid() and s.active
    where e.id = requested_expense_id and (s.role in ('admin','super_admin') or e.created_by = auth.uid() or exists (select 1 from public.reimbursement_claims r where r.expense_id = e.id and r.staff_id = auth.uid()))
  )
$$;

alter table public.expense_categories enable row level security;
alter table public.expense_payment_sources enable row level security;
alter table public.expense_allocations enable row level security;
alter table public.expense_attachments enable row level security;
alter table public.expense_reviews enable row level security;
alter table public.reimbursement_claims enable row level security;
alter table public.owner_advances enable row level security;
alter table public.owner_advance_repayments enable row level security;
alter table public.recurring_expense_templates enable row level security;

revoke all on public.expense_reference_counters, public.expense_categories, public.expense_payment_sources, public.expense_allocations, public.expense_attachments, public.expense_reviews, public.reimbursement_claims, public.owner_advances, public.owner_advance_repayments, public.recurring_expense_templates from anon, authenticated;
revoke all on function public.expense_next_reference(), public.expense_create(uuid,uuid,text,uuid,text,date,integer,integer,uuid,text,uuid,text,text,text,text,text,jsonb,boolean,boolean,boolean,uuid), public.expense_transition(uuid,uuid,integer,text,text), public.owner_advance_record_repayment(uuid,uuid,uuid,integer,text,timestamptz,uuid), public.expense_schedule_reimbursement(uuid,uuid,integer), public.expense_record_reimbursement_payment(uuid,uuid,integer,uuid,text,timestamptz,uuid), public.expense_resolve_duplicate(uuid,uuid,integer,text,uuid,text), public.recurring_expense_create(uuid,text,uuid,integer,text,date,uuid,jsonb,boolean,date,date,smallint), public.recurring_expense_generate(uuid,uuid), public.expense_update_draft(uuid,uuid,integer,text,uuid,text,date,integer,integer,text,text,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.expense_create(uuid,uuid,text,uuid,text,date,integer,integer,uuid,text,uuid,text,text,text,text,text,jsonb,boolean,boolean,boolean,uuid), public.expense_transition(uuid,uuid,integer,text,text), public.owner_advance_record_repayment(uuid,uuid,uuid,integer,text,timestamptz,uuid), public.expense_schedule_reimbursement(uuid,uuid,integer), public.expense_record_reimbursement_payment(uuid,uuid,integer,uuid,text,timestamptz,uuid), public.expense_resolve_duplicate(uuid,uuid,integer,text,uuid,text), public.recurring_expense_create(uuid,text,uuid,integer,text,date,uuid,jsonb,boolean,date,date,smallint), public.recurring_expense_generate(uuid,uuid), public.expense_update_draft(uuid,uuid,integer,text,uuid,text,date,integer,integer,text,text,text,jsonb,boolean) to service_role;
grant execute on function public.expense_can_view(uuid) to authenticated;

create policy expenses_staff_select on public.expenses for select to authenticated using (public.expense_can_view(id));
create policy expense_allocations_staff_select on public.expense_allocations for select to authenticated using (public.expense_can_view(expense_id));
create policy expense_attachments_staff_select on public.expense_attachments for select to authenticated using (public.expense_can_view(expense_id));
create policy expense_reviews_staff_select on public.expense_reviews for select to authenticated using (public.expense_can_view(expense_id));
create policy reimbursement_claims_staff_select on public.reimbursement_claims for select to authenticated using (public.expense_can_view(expense_id));
create policy owner_advances_admin_select on public.owner_advances for select to authenticated using (exists (select 1 from public.staff_profiles where user_id = auth.uid() and active and role in ('admin','super_admin')));
create policy owner_repayments_admin_select on public.owner_advance_repayments for select to authenticated using (exists (select 1 from public.staff_profiles where user_id = auth.uid() and active and role in ('admin','super_admin')));

grant select on public.expenses, public.expense_allocations, public.expense_attachments, public.expense_reviews, public.reimbursement_claims, public.owner_advances, public.owner_advance_repayments to authenticated;

comment on table public.expenses is 'Canonical studio-cost ledger. Customer collections and owner funding are not revenue/negative payments here.';
comment on table public.recurring_expense_templates is 'Obligation templates only; individual generated expenses are the reportable instances.';
