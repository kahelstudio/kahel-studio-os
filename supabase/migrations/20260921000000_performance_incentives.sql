-- Performance & Incentives module
-- Adds daily_rate_centavos + employment_type to payroll_employees, and creates
-- all tables for the performance/incentive cycle workflow.
-- Safe and reversible: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.

-- ─── 1. Extend payroll_employees ─────────────────────────────────────────────

alter table public.payroll_employees
  add column if not exists daily_rate_centavos bigint not null default 0
    check (daily_rate_centavos >= 0),
  add column if not exists employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'freelance', 'probationary'));

comment on column public.payroll_employees.daily_rate_centavos is
  'Contractual daily rate in centavos (e.g. ₱700/day = 70000). Used for incentive top-up calculations.';

-- ─── 2. Performance policies ─────────────────────────────────────────────────

create table if not exists public.performance_policies (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null default 1,
  monthly_target_centavos bigint not null default 32000000   -- ₱320,000
    check (monthly_target_centavos > 0),
  incentive_ceiling_centavos bigint not null default 100000  -- ₱1,000/day
    check (incentive_ceiling_centavos > 0),
  score_full_tier numeric(5, 2) not null default 80.00
    check (score_full_tier between 0 and 100),
  score_half_tier numeric(5, 2) not null default 70.00
    check (score_half_tier between 0 and 100 and score_half_tier < score_full_tier),
  qualifying_day_definition text not null default 'regular_workday',
  eligible_payment_methods text[] not null
    default '{cash,digital,card,gcash,paymaya,qrph,billease}',
  excluded_booking_kinds text[] not null
    default '{test,internal}',
  is_active boolean not null default true,
  effective_from date not null default current_date,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active policy at a time
create unique index if not exists performance_policies_active_idx
  on public.performance_policies (is_active) where is_active = true;

-- ─── 3. Performance policy versions (immutable history) ──────────────────────

create table if not exists public.performance_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.performance_policies(id) on delete restrict,
  version_number integer not null,
  snapshot jsonb not null,
  change_note text,
  effective_from date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (policy_id, version_number)
);

-- ─── 4. Performance cycles (one per calendar month) ──────────────────────────

create table if not exists public.performance_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_month date not null,     -- First day of the month: 2026-09-01
  label text not null,           -- "September 2026"
  policy_snapshot_id uuid references public.performance_policy_versions(id) on delete restrict,
  target_centavos bigint not null default 32000000 check (target_centavos > 0),
  collected_sales_centavos bigint not null default 0 check (collected_sales_centavos >= 0),
  eligible_sales_centavos bigint not null default 0 check (eligible_sales_centavos >= 0),
  sales_target_met boolean generated always as
    (eligible_sales_centavos >= target_centavos) stored,
  status text not null default 'draft' check (status in (
    'draft', 'in_progress', 'submitted', 'under_review',
    'approved', 'locked', 'sent_to_payroll', 'paid'
  )),
  review_opened_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  payroll_released_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_month)
);

-- ─── 5. Employee scorecards (one per employee per cycle) ─────────────────────

create table if not exists public.employee_scorecards (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.performance_cycles(id) on delete restrict,
  employee_id uuid not null references public.payroll_employees(id) on delete restrict,

  -- Snapshots at time of calculation
  daily_rate_snapshot_centavos bigint not null check (daily_rate_snapshot_centavos >= 0),
  employment_type_snapshot text not null,
  employee_name_snapshot text not null,
  employee_role_snapshot text not null,

  qualifying_days integer not null default 0 check (qualifying_days >= 0),

  -- Category scores (null = not yet scored)
  score_leads_sales numeric(5, 2) check (score_leads_sales between 0 and 100),
  score_responsibilities numeric(5, 2) check (score_responsibilities between 0 and 100),
  score_quality_delivery numeric(5, 2) check (score_quality_delivery between 0 and 100),
  score_attendance numeric(5, 2) check (score_attendance between 0 and 100),
  score_teamwork numeric(5, 2) check (score_teamwork between 0 and 100),

  -- Category weights (from policy, snapshotted here)
  weight_leads_sales numeric(4, 2) not null default 0.35,
  weight_responsibilities numeric(4, 2) not null default 0.30,
  weight_quality_delivery numeric(4, 2) not null default 0.20,
  weight_attendance numeric(4, 2) not null default 0.10,
  weight_teamwork numeric(4, 2) not null default 0.05,

  -- Computed final score (null until all categories scored)
  final_score numeric(5, 2) generated always as (
    case when
      score_leads_sales is not null and score_responsibilities is not null and
      score_quality_delivery is not null and score_attendance is not null and
      score_teamwork is not null
    then round(
      score_leads_sales    * 0.35 +
      score_responsibilities * 0.30 +
      score_quality_delivery * 0.20 +
      score_attendance     * 0.10 +
      score_teamwork       * 0.05,
      2
    )
    else null end
  ) stored,

  -- Attribution
  attributed_sales_centavos bigint not null default 0 check (attributed_sales_centavos >= 0),
  qualified_leads_count integer not null default 0 check (qualified_leads_count >= 0),

  -- Review state
  status text not null default 'draft' check (status in (
    'draft', 'in_progress', 'submitted', 'approved', 'locked'
  )),
  reviewer_comments text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,

  -- Manual score flag (requires justification)
  has_manual_scores boolean not null default false,
  manual_score_reason text,

  -- Employee acknowledgment
  acknowledged_at timestamptz,
  acknowledged_by_employee boolean not null default false,
  employee_dispute_note text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, employee_id)
);

-- ─── 6. Incentive calculations (computed record per employee per cycle) ───────

create table if not exists public.incentive_calculations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.performance_cycles(id) on delete restrict,
  scorecard_id uuid not null references public.employee_scorecards(id) on delete restrict,
  employee_id uuid not null references public.payroll_employees(id) on delete restrict,

  -- Input snapshots
  daily_rate_centavos bigint not null,
  ceiling_centavos bigint not null default 100000,
  qualifying_days integer not null,
  final_score numeric(5, 2),
  sales_target_met boolean not null default false,

  -- Results (all in centavos)
  performance_multiplier numeric(4, 2) not null default 0
    check (performance_multiplier between 0 and 1),
  daily_top_up_centavos bigint not null default 0 check (daily_top_up_centavos >= 0),
  base_pay_centavos bigint not null default 0 check (base_pay_centavos >= 0),
  incentive_centavos bigint not null default 0 check (incentive_centavos >= 0),
  total_earned_centavos bigint not null default 0 check (total_earned_centavos >= 0),

  -- Human-readable tier
  tier_label text,
  is_eligible boolean not null default false,

  -- Payroll integration
  locked boolean not null default false,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  payroll_adjustment_id uuid references public.payroll_adjustments(id) on delete set null,

  calculated_at timestamptz not null default now(),
  calculated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, employee_id)
);

-- ─── 7. Sales attributions ───────────────────────────────────────────────────

create table if not exists public.sales_attributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.performance_cycles(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,

  -- Staff who contributed
  lead_source_employee_id uuid references public.payroll_employees(id) on delete set null,
  followup_employee_id uuid references public.payroll_employees(id) on delete set null,
  conversion_employee_id uuid references public.payroll_employees(id) on delete set null,

  -- Amounts (centavos)
  gross_amount_centavos bigint not null default 0 check (gross_amount_centavos >= 0),
  refund_amount_centavos bigint not null default 0 check (refund_amount_centavos >= 0),
  net_eligible_centavos bigint not null default 0,

  -- Attribution percentages (each nullable; combined must = 100 when set)
  lead_attribution_pct numeric(5, 2) not null default 0
    check (lead_attribution_pct between 0 and 100),
  followup_attribution_pct numeric(5, 2) not null default 0
    check (followup_attribution_pct between 0 and 100),
  conversion_attribution_pct numeric(5, 2) not null default 0
    check (conversion_attribution_pct between 0 and 100),

  -- Metadata
  payment_date date,
  client_name text,
  service_type text,
  booking_reference text,
  is_excluded boolean not null default false,
  exclusion_reason text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 8. Performance evidence ─────────────────────────────────────────────────

create table if not exists public.performance_evidence (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.employee_scorecards(id) on delete cascade,
  cycle_id uuid not null references public.performance_cycles(id) on delete restrict,
  category text not null check (category in (
    'leads_sales', 'responsibilities', 'quality_delivery', 'attendance', 'teamwork'
  )),
  evidence_type text not null check (evidence_type in (
    'lead', 'booking', 'payment', 'project', 'task',
    'attendance', 'feedback', 'hr_record', 'manual'
  )),
  reference_id uuid,
  reference_label text,
  description text not null check (length(trim(description)) > 0),
  value_centavos bigint,
  value_numeric numeric(10, 2),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── 9. Employee acknowledgments ─────────────────────────────────────────────

create table if not exists public.employee_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.employee_scorecards(id) on delete cascade unique,
  employee_id uuid not null references public.payroll_employees(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'disputed')),
  employee_comment text,
  disputed_items text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 10. Performance adjustments (post-lock corrections) ─────────────────────

create table if not exists public.performance_adjustments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.performance_cycles(id) on delete restrict,
  scorecard_id uuid references public.employee_scorecards(id) on delete restrict,
  employee_id uuid references public.payroll_employees(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in (
    'score', 'incentive', 'qualifying_days', 'disqualification'
  )),
  original_value text,
  new_value text,
  reason text not null check (length(trim(reason)) > 0),
  hr_case_reference text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists performance_cycles_month_idx
  on public.performance_cycles(cycle_month desc);
create index if not exists employee_scorecards_cycle_idx
  on public.employee_scorecards(cycle_id);
create index if not exists employee_scorecards_employee_idx
  on public.employee_scorecards(employee_id);
create index if not exists incentive_calculations_cycle_idx
  on public.incentive_calculations(cycle_id);
create index if not exists sales_attributions_cycle_idx
  on public.sales_attributions(cycle_id);
create index if not exists sales_attributions_payment_idx
  on public.sales_attributions(payment_id) where payment_id is not null;
create index if not exists performance_evidence_scorecard_idx
  on public.performance_evidence(scorecard_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.performance_policies enable row level security;
alter table public.performance_policy_versions enable row level security;
alter table public.performance_cycles enable row level security;
alter table public.employee_scorecards enable row level security;
alter table public.incentive_calculations enable row level security;
alter table public.sales_attributions enable row level security;
alter table public.performance_evidence enable row level security;
alter table public.employee_acknowledgments enable row level security;
alter table public.performance_adjustments enable row level security;

-- Policies: service_role has full access; authenticated staff have read-only
-- access to their own data; admin/super_admin see everything.

create policy performance_policies_staff_read on public.performance_policies
  for select to authenticated using (public.loyalty_is_staff());

create policy performance_policy_versions_staff_read on public.performance_policy_versions
  for select to authenticated using (public.loyalty_is_staff());

create policy performance_cycles_staff_read on public.performance_cycles
  for select to authenticated using (public.loyalty_is_staff());

-- Scorecards: admins see all; staff see only their own (matched via payroll_employees.staff_id)
create policy employee_scorecards_admin_read on public.employee_scorecards
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

create policy employee_scorecards_own_read on public.employee_scorecards
  for select to authenticated using (
    exists (
      select 1 from public.payroll_employees pe
      join public.staff_profiles sp on sp.user_id = auth.uid()
      where pe.id = employee_scorecards.employee_id
        and pe.staff_id = auth.uid()
        and sp.active
    )
  );

-- Incentive calculations: same visibility as scorecards
create policy incentive_calculations_admin_read on public.incentive_calculations
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

create policy incentive_calculations_own_read on public.incentive_calculations
  for select to authenticated using (
    exists (
      select 1 from public.payroll_employees pe
      where pe.id = incentive_calculations.employee_id
        and pe.staff_id = auth.uid()
    )
  );

-- Sales attributions: admin/super_admin only
create policy sales_attributions_admin_read on public.sales_attributions
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

-- Evidence: admin/super_admin only
create policy performance_evidence_admin_read on public.performance_evidence
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

-- Acknowledgments: admins see all; staff see own
create policy employee_acknowledgments_admin_read on public.employee_acknowledgments
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

create policy employee_acknowledgments_own_read on public.employee_acknowledgments
  for select to authenticated using (
    exists (
      select 1 from public.payroll_employees pe
      where pe.id = employee_acknowledgments.employee_id
        and pe.staff_id = auth.uid()
    )
  );

-- Adjustments: admin/super_admin only
create policy performance_adjustments_admin_read on public.performance_adjustments
  for select to authenticated using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid() and sp.active
        and sp.role in ('admin', 'super_admin')
    )
  );

-- Service role full access (used by server actions)
grant all on table
  public.performance_policies, public.performance_policy_versions,
  public.performance_cycles, public.employee_scorecards,
  public.incentive_calculations, public.sales_attributions,
  public.performance_evidence, public.employee_acknowledgments,
  public.performance_adjustments
  to service_role;

grant select on table
  public.performance_policies, public.performance_policy_versions,
  public.performance_cycles, public.employee_scorecards,
  public.incentive_calculations, public.sales_attributions,
  public.performance_evidence, public.employee_acknowledgments,
  public.performance_adjustments
  to authenticated;

-- ─── Default policy seed ──────────────────────────────────────────────────────

insert into public.performance_policies (
  version_number, monthly_target_centavos, incentive_ceiling_centavos,
  score_full_tier, score_half_tier, qualifying_day_definition,
  eligible_payment_methods, excluded_booking_kinds, is_active, effective_from,
  change_note
) values (
  1, 32000000, 100000, 80.00, 70.00, 'regular_workday',
  '{cash,digital,card,gcash,paymaya,qrph,billease}',
  '{test,internal}', true, '2026-09-01',
  'Initial policy — ₱320,000 monthly target, ₱1,000/day incentive ceiling.'
) on conflict do nothing;
