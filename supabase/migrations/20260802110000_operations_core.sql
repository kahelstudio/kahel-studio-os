-- --------------------------------------------------------------------
-- Operations core: Products, POS, Inventory, Maintenance, Marketing,
-- Quotations, Glitches, Feedback, Tasks, Shifts, Compliance,
-- Recruitment, Performance, Payroll, Website, Staff audit log.
-- --------------------------------------------------------------------

-- || POS – Products & Sales || --------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null check (length(btrim(sku)) between 1 and 32),
  name text not null check (length(btrim(name)) between 1 and 255),
  category text not null check (category in ('Prints', 'Frames', 'Albums', 'Media')),
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  swatch text not null check (swatch ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (length(btrim(reference)) between 1 and 64),
  client_id uuid references public.clients(id) on delete set null,
  method text not null check (method in ('Cash', 'GCash', 'Maya', 'Bank transfer', 'Card')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),
  currency text not null default 'PHP',
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null
);

create table public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null check (length(btrim(description)) between 1 and 500),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  total_price numeric(10, 2) not null check (total_price >= 0)
);

create table public.pos_catalogs (
  id uuid primary key default gen_random_uuid(),
  catalog_key text unique not null check (length(btrim(catalog_key)) between 1 and 48),
  title text not null check (length(btrim(title)) between 1 and 255),
  subtitle text,
  unit_label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pos_catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.pos_catalogs(id) on delete cascade,
  code text not null check (length(btrim(code)) between 1 and 48),
  name text not null check (length(btrim(name)) between 1 and 255),
  detail text,
  price numeric(10, 2) not null check (price >= 0),
  quantity_info text,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (catalog_id, code)
);

-- || Inventory – Equipment || ---------------------------------------

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  serial text unique not null check (length(btrim(serial)) between 1 and 64),
  name text not null check (length(btrim(name)) between 1 and 255),
  category text not null check (length(btrim(category)) between 1 and 64),
  status text not null default 'available' check (status in ('available', 'out', 'maint')),
  note text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment_checkouts (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  checked_out_by uuid references auth.users(id) on delete set null,
  purpose text not null check (length(btrim(purpose)) between 1 and 500),
  checked_out_at timestamptz not null default now(),
  expected_return_at timestamptz,
  returned_at timestamptz,
  condition_on_return text
);

-- || Maintenance || -------------------------------------------------

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  task text not null check (length(btrim(task)) between 1 and 500),
  asset_label text not null check (length(btrim(asset_label)) between 1 and 128),
  maintenance_type text not null check (maintenance_type in ('Preventive', 'Repair', 'Cleaning', 'Inspection', 'Replace')),
  issue text,
  assignee text not null check (length(btrim(assignee)) between 1 and 255),
  next_due date,
  recurrence text,
  estimated_cost numeric(10, 2) check (estimated_cost >= 0),
  warranty text,
  status text not null default 'reported' check (status in ('reported', 'inspect', 'scheduled', 'inrepair', 'awaiting', 'completed', 'unrepairable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- || Marketing – Campaigns || ---------------------------------------

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 255),
  channel text not null check (length(btrim(channel)) between 1 and 255),
  spend numeric(10, 2) not null default 0 check (spend >= 0),
  bookings_attributed integer not null default 0 check (bookings_attributed >= 0),
  status text not null default 'scheduled' check (status in ('live', 'scheduled', 'ended', 'draft')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- || Quotations || --------------------------------------------------

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (length(btrim(reference)) between 1 and 64),
  client_id uuid references public.clients(id) on delete set null,
  service_type text not null check (length(btrim(service_type)) between 1 and 255),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'expired', 'declined')),
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- || Glitches (Bug Tracker) || --------------------------------------

create table public.glitches (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (length(btrim(reference)) between 1 and 16),
  title text not null check (length(btrim(title)) between 1 and 500),
  area text not null check (length(btrim(area)) between 1 and 255),
  reporter text not null check (length(btrim(reporter)) between 1 and 255),
  severity text not null default 'Medium' check (severity in ('High', 'Medium', 'Low')),
  status text not null default 'open' check (status in ('open', 'progress', 'fixed', 'closed')),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

-- || Feedback || ----------------------------------------------------

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  iid text unique not null check (length(btrim(iid)) between 1 and 16),
  title text not null check (length(btrim(title)) between 1 and 500),
  summary text,
  app text not null check (length(btrim(app)) between 1 and 64),
  kind text not null check (kind in ('Problem', 'Idea')),
  status text not null default 'Submitted' check (status in ('Submitted', 'Triaged', 'In progress', 'Shipped')),
  priority text not null default 'Normal' check (priority in ('Urgent', 'Normal', 'Low')),
  submitted_at timestamptz not null default now(),
  submitted_by uuid references auth.users(id) on delete set null,
  checked boolean not null default false
);

-- || Tasks – Kanban Board || ----------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 500),
  description text,
  column_status text not null default 'todo' check (column_status in ('todo', 'doing', 'blocked', 'done')),
  priority text not null default 'Med' check (priority in ('High', 'Med', 'Low')),
  category text not null check (length(btrim(category)) between 1 and 64),
  assignee text check (length(btrim(assignee)) between 1 and 255),
  due_date date,
  recurrence text,
  linked_ref text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- || Shifts – Shiftboard || -----------------------------------------

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  time_description text,
  location text not null default 'studio' check (location in ('studio', 'location')),
  week_start date not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (day_of_week, initials, week_start)
);

-- || Compliance || --------------------------------------------------

create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  requirement text not null check (length(btrim(requirement)) between 1 and 500),
  category text not null check (length(btrim(category)) between 1 and 64),
  agency text not null check (length(btrim(agency)) between 1 and 255),
  reference_number text,
  frequency text not null check (length(btrim(frequency)) between 1 and 64),
  responsible_person text not null check (length(btrim(responsible_person)) between 1 and 255),
  estimated_cost text,
  actual_cost text,
  status text not null default 'duesoon' check (status in ('expired', 'action', 'duesoon', 'submitted', 'review', 'compliant', 'na')),
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- || Recruitment || -------------------------------------------------

create table public.recruitment_roles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 255),
  type text not null check (length(btrim(type)) between 1 and 128),
  applicant_count integer not null default 0 check (applicant_count >= 0),
  is_open boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references public.recruitment_roles(id) on delete set null,
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role_applied text not null check (length(btrim(role_applied)) between 1 and 255),
  notes text,
  source text,
  stage text not null default 'applied' check (stage in ('applied', 'screening', 'interview', 'offer', 'hired', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_hires (
  id uuid primary key default gen_random_uuid(),
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  tasks_done integer not null default 0 check (tasks_done >= 0),
  tasks_total integer not null default 6 check (tasks_total > 0),
  status text not null default 'onboarding' check (status in ('onboarding', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_departures (
  id uuid primary key default gen_random_uuid(),
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  tasks_done integer not null default 0 check (tasks_done >= 0),
  tasks_total integer not null default 5 check (tasks_total > 0),
  status text not null default 'offboarding' check (status in ('offboarding', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- || Performance || -------------------------------------------------

create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff_profiles(user_id) on delete set null,
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  cycle text not null check (length(btrim(cycle)) between 1 and 32),
  rating numeric(3, 1) check (rating is null or rating between 0 and 5),
  status text not null default 'due' check (status in ('due', 'scheduled', 'done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(btrim(label)) between 1 and 500),
  owner text not null check (length(btrim(owner)) between 1 and 64),
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- || Payroll || -----------------------------------------------------

create table public.payroll_employees (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid unique references public.staff_profiles(user_id) on delete set null,
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  employee_ref text unique not null check (length(btrim(employee_ref)) between 1 and 16),
  base_salary numeric(10, 2) not null default 0 check (base_salary >= 0),
  sss_number text,
  tin text,
  philhealth_number text,
  pagibig_number text,
  status text not null default 'active' check (status in ('active', 'inactive', 'terminated')),
  hired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null check (length(btrim(reference)) between 1 and 32),
  period_label text not null check (length(btrim(period_label)) between 1 and 64),
  period_start date not null,
  period_end date not null,
  payment_date date not null,
  employee_count integer not null default 0 check (employee_count >= 0),
  prepared_by text not null check (length(btrim(prepared_by)) between 1 and 255),
  gross_total numeric(12, 2) not null default 0,
  deductions_total numeric(12, 2) not null default 0,
  employer_share numeric(12, 2) not null default 0,
  net_total numeric(12, 2) not null default 0,
  steps_done integer not null default 0 check (steps_done between 0 and 9),
  steps_total integer not null default 9 check (steps_total > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.payroll_payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete restrict,
  initials text not null check (length(btrim(initials)) between 1 and 4),
  name text not null check (length(btrim(name)) between 1 and 255),
  role text not null check (length(btrim(role)) between 1 and 255),
  basic_pay numeric(10, 2) not null default 0,
  overtime_pay numeric(10, 2) not null default 0,
  gross_pay numeric(10, 2) not null default 0,
  sss_ee numeric(10, 2) not null default 0,
  philhealth_ee numeric(10, 2) not null default 0,
  pagibig_ee numeric(10, 2) not null default 0,
  withholding_tax numeric(10, 2) not null default 0,
  other_deductions numeric(10, 2) not null default 0,
  net_pay numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.payroll_employees(id) on delete cascade,
  amount numeric(10, 2) not null check (amount != 0),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  effective_date date not null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.payroll_contributions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.payroll_employees(id) on delete cascade,
  period_label text not null check (length(btrim(period_label)) between 1 and 32),
  sss_amount numeric(10, 2) not null default 0,
  philhealth_amount numeric(10, 2) not null default 0,
  pagibig_amount numeric(10, 2) not null default 0,
  employer_sss numeric(10, 2) not null default 0,
  employer_philhealth numeric(10, 2) not null default 0,
  employer_pagibig numeric(10, 2) not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- || Website || -----------------------------------------------------

create table public.website_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  slot text unique not null check (length(btrim(slot)) between 1 and 16),
  title text not null check (length(btrim(title)) between 1 and 500),
  category text not null check (length(btrim(category)) between 1 and 64),
  consent_reference text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- || Staff Audit Log || ---------------------------------------------

create table public.staff_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null check (length(btrim(actor_name)) between 1 and 255),
  event text not null check (length(btrim(event)) between 1 and 500),
  event_type text not null check (event_type in ('auth', 'data', 'ok', 'warn', 'security', 'billing', 'team', 'documents', 'system')),
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------

create index idx_pos_sales_client on public.pos_sales(client_id);
create index idx_pos_sale_items_sale on public.pos_sale_items(sale_id);
create index idx_equipment_status on public.equipment(status);
create index idx_equipment_checkouts_equipment on public.equipment_checkouts(equipment_id);
create index idx_maintenance_status on public.maintenance_records(status);
create index idx_marketing_status on public.marketing_campaigns(status);
create index idx_quotations_status on public.quotations(status);
create index idx_quotations_client on public.quotations(client_id);
create index idx_glitches_status on public.glitches(status);
create index idx_feedback_status on public.feedback_reports(status);
create index idx_tasks_column on public.tasks(column_status);
create index idx_tasks_assignee on public.tasks(assignee);
create index idx_shifts_week on public.shifts(week_start);
create index idx_compliance_status on public.compliance_records(status);
create index idx_recruitment_stage on public.recruitment_candidates(stage);
create index idx_performance_status on public.performance_reviews(status);
create index idx_performance_staff on public.performance_reviews(staff_id);
create index idx_payroll_employees_staff on public.payroll_employees(staff_id);
create index idx_payroll_runs_status on public.payroll_runs(status);
create index idx_payroll_payslips_run on public.payroll_payslips(run_id);
create index idx_payroll_payslips_employee on public.payroll_payslips(employee_id);
create index idx_payroll_adjustments_employee on public.payroll_adjustments(employee_id);
create index idx_payroll_contributions_employee on public.payroll_contributions(employee_id);
create index idx_staff_audit_log_actor on public.staff_audit_log(actor_id);
create index idx_staff_audit_log_type on public.staff_audit_log(event_type);
create index idx_staff_audit_log_created on public.staff_audit_log(created_at desc);
create index idx_website_portfolio_status on public.website_portfolio_items(status);
