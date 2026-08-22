-- Central operational and financial approval workflows. All mutations are performed
-- through service-role-only functions so role checks and audit writes are atomic.

create table public.approval_reference_counters (
  reference_year integer primary key check (reference_year between 2020 and 9999),
  last_number integer not null check (last_number > 0)
);

create table public.approval_workflow_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  request_type text not null check (length(btrim(request_type)) between 1 and 80),
  min_amount_php integer check (min_amount_php is null or min_amount_php >= 0),
  max_amount_php integer check (max_amount_php is null or max_amount_php >= 0),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 10),
  bulk_approval_allowed boolean not null default false,
  bulk_amount_limit_php integer check (bulk_amount_limit_php is null or bulk_amount_limit_php >= 0),
  allow_self_super_admin boolean not null default false,
  priority integer not null default 100,
  active boolean not null default true,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_workflow_amount_range_check check (max_amount_php is null or min_amount_php is null or max_amount_php >= min_amount_php)
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^APR-[0-9]{4}-[0-9]{4,}$'),
  request_type text not null check (length(btrim(request_type)) between 1 and 80),
  subject text not null check (length(btrim(subject)) between 2 and 255),
  description text not null check (length(btrim(description)) between 2 and 4000),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'pending_approval', 'returned_for_changes', 'approved', 'rejected', 'cancelled', 'withdrawn')),
  fulfillment_status text check (fulfillment_status is null or fulfillment_status in ('not_released', 'partially_released', 'released', 'awaiting_liquidation', 'liquidation_submitted', 'liquidated', 'awaiting_payment', 'paid')),
  requester_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  current_approver_id uuid references public.staff_profiles(user_id) on delete set null,
  workflow_rule_id uuid references public.approval_workflow_rules(id) on delete restrict,
  source_module text not null check (length(btrim(source_module)) between 1 and 40),
  source_record_id uuid,
  source_reference text check (source_reference is null or length(source_reference) <= 100),
  project_id uuid references public.projects(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  employee_id uuid references public.payroll_employees(id) on delete restrict,
  amount_php integer check (amount_php is null or amount_php >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  required_by date,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  notes_to_approver text check (notes_to_approver is null or length(notes_to_approver) <= 2000),
  idempotency_key uuid not null,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (requester_id, idempotency_key),
  constraint approval_request_status_dates_check check (
    (status <> 'approved' or approved_at is not null) and
    (status <> 'rejected' or rejected_at is not null) and
    (status <> 'withdrawn' or withdrawn_at is not null)
  )
);

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  step_number smallint not null check (step_number between 1 and 10),
  approver_user_id uuid references public.staff_profiles(user_id) on delete restrict,
  approver_role public.staff_role,
  status text not null check (status in ('queued', 'pending', 'approved', 'rejected', 'returned', 'skipped')),
  decision text check (decision is null or decision in ('approved', 'rejected', 'returned', 'override_approved', 'override_rejected')),
  comment text check (comment is null or length(comment) <= 2000),
  acted_by uuid references public.staff_profiles(user_id) on delete restrict,
  acted_at timestamptz,
  due_at timestamptz,
  delegated_from uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (request_id, step_number),
  constraint approval_step_approver_check check (approver_user_id is not null or approver_role is not null),
  constraint approval_step_decision_check check ((acted_at is null and acted_by is null and decision is null) or (acted_at is not null and acted_by is not null and decision is not null))
);

create table public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  author_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  body text not null check (length(btrim(body)) between 1 and 2000),
  visibility text not null default 'participants' check (visibility in ('participants', 'approvers', 'internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  label text check (label is null or length(label) <= 255),
  uploaded_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (request_id, media_asset_id)
);

create table public.approval_financial_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  event_type text not null check (event_type in ('release', 'payment', 'balance_return', 'reimbursement')),
  amount_php integer not null check (amount_php > 0),
  payment_method text not null check (length(btrim(payment_method)) between 1 and 80),
  transaction_reference text not null check (length(btrim(transaction_reference)) between 1 and 120),
  recorded_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  occurred_at timestamptz not null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  unique (request_id, event_type, transaction_reference)
);

create table public.approval_liquidation_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  expense_date date not null,
  category text not null check (length(btrim(category)) between 1 and 80),
  description text not null check (length(btrim(description)) between 1 and 500),
  amount_php integer not null check (amount_php > 0),
  receipt_media_asset_id uuid references public.media_assets(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.approval_audit_log (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.approval_requests(id) on delete restrict,
  actor_id uuid references public.staff_profiles(user_id) on delete restrict,
  action text not null check (length(btrim(action)) between 1 and 80),
  previous_state jsonb not null default '{}'::jsonb check (jsonb_typeof(previous_state) = 'object'),
  new_state jsonb not null default '{}'::jsonb check (jsonb_typeof(new_state) = 'object'),
  comment text check (comment is null or length(comment) <= 2000),
  approval_step_id uuid references public.approval_steps(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  request_id uuid references public.approval_requests(id) on delete cascade,
  event_key text not null unique check (length(event_key) between 1 and 255),
  kind text not null check (length(kind) between 1 and 80),
  title text not null check (length(btrim(title)) between 1 and 255),
  body text not null check (length(btrim(body)) between 1 and 1000),
  href text not null check (href like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index approval_requests_requester_idx on public.approval_requests (requester_id, created_at desc) where archived_at is null;
create index approval_requests_status_due_idx on public.approval_requests (status, required_by, priority, submitted_at) where archived_at is null;
create index approval_requests_type_idx on public.approval_requests (request_type, created_at desc) where archived_at is null;
create index approval_requests_project_idx on public.approval_requests (project_id) where project_id is not null;
create index approval_requests_employee_idx on public.approval_requests (employee_id) where employee_id is not null;
create index approval_steps_pending_role_idx on public.approval_steps (approver_role, due_at) where status = 'pending';
create index approval_steps_pending_user_idx on public.approval_steps (approver_user_id, due_at) where status = 'pending';
create index approval_audit_request_idx on public.approval_audit_log (request_id, created_at);
create index staff_notifications_recipient_idx on public.staff_notifications (recipient_id, read_at, created_at desc);
create index approval_financial_events_request_idx on public.approval_financial_events (request_id, occurred_at);

create trigger approval_workflow_rules_updated_at before update on public.approval_workflow_rules for each row execute function public.set_customer_updated_at();
create trigger approval_requests_updated_at before update on public.approval_requests for each row execute function public.set_customer_updated_at();
create trigger approval_comments_updated_at before update on public.approval_comments for each row execute function public.set_customer_updated_at();

create or replace function public.prevent_approval_immutable_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Approval history is immutable';
end
$$;

create trigger approval_audit_immutable before update or delete on public.approval_audit_log for each row execute function public.prevent_approval_immutable_mutation();
create trigger approval_financial_events_immutable before update or delete on public.approval_financial_events for each row execute function public.prevent_approval_immutable_mutation();

create or replace function public.audit_approval_attachment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.approval_audit_log (request_id, actor_id, action, metadata)
  values (new.request_id, new.uploaded_by, 'attachment_added', jsonb_build_object('media_asset_id', new.media_asset_id));
  return new;
end
$$;
create trigger approval_attachment_audit after insert on public.approval_attachments for each row execute function public.audit_approval_attachment();

insert into public.approval_workflow_rules (name, request_type, min_amount_php, max_amount_php, steps, bulk_approval_allowed, bulk_amount_limit_php, priority) values
  ('Attendance review', 'attendance_correction', null, null, '[{"role":"admin","due_hours":24}]', true, null, 10),
  ('Missed clock review', 'missed_clock', null, null, '[{"role":"admin","due_hours":24}]', true, null, 10),
  ('Leave review', 'leave_request', null, null, '[{"role":"admin","due_hours":48}]', true, null, 10),
  ('Schedule review', 'schedule_adjustment', null, null, '[{"role":"admin","due_hours":24}]', true, null, 10),
  ('Shift swap review', 'shift_swap', null, null, '[{"role":"admin","due_hours":24}]', true, null, 10),
  ('Overtime exception', 'exceptional_overtime', null, null, '[{"role":"admin","due_hours":12},{"role":"super_admin","due_hours":12}]', false, null, 10),
  ('Project budget review', 'project_budget', null, null, '[{"role":"super_admin","due_hours":24}]', false, null, 10),
  ('Project operational review', 'scope_change', null, null, '[{"role":"admin","due_hours":24}]', false, null, 10),
  ('Project deadline review', 'deadline_extension', null, null, '[{"role":"admin","due_hours":24}]', false, null, 10),
  ('Low-value purchase', 'purchase_*', 0, 4999999, '[{"role":"admin","due_hours":24}]', true, 1000000, 20),
  ('High-value purchase', 'purchase_*', 5000000, null, '[{"role":"super_admin","due_hours":24}]', false, null, 10),
  ('Cash advance review', 'cash_advance', null, null, '[{"role":"admin","due_hours":24},{"role":"super_admin","due_hours":24}]', false, null, 10),
  ('Liquidation review', 'cash_advance_liquidation', 0, 4999999, '[{"role":"admin","due_hours":48}]', false, null, 10),
  ('High-value liquidation review', 'cash_advance_liquidation', 5000000, null, '[{"role":"super_admin","due_hours":48}]', false, null, 5),
  ('Sensitive financial review', 'client_refund', null, null, '[{"role":"super_admin","due_hours":24}]', false, null, 10),
  ('Payroll adjustment review', 'payroll_adjustment', null, null, '[{"role":"super_admin","due_hours":24}]', false, null, 10),
  ('Default operational review', '*', null, null, '[{"role":"admin","due_hours":48}]', false, null, 1000);

create or replace function public.approval_next_reference()
returns text language plpgsql security definer set search_path = '' as $$
declare
  requested_year integer := extract(year from timezone('Asia/Manila', now()))::integer;
  requested_number integer;
begin
  insert into public.approval_reference_counters (reference_year, last_number)
  values (requested_year, 1)
  on conflict (reference_year) do update set last_number = public.approval_reference_counters.last_number + 1
  returning last_number into requested_number;
  return 'APR-' || requested_year::text || '-' || lpad(requested_number::text, 4, '0');
end
$$;

create or replace function public.approval_select_rule(requested_type text, requested_amount integer)
returns uuid language sql stable security definer set search_path = '' as $$
  select id
  from public.approval_workflow_rules
  where active
    and (request_type = requested_type or request_type = '*' or (right(request_type, 1) = '*' and requested_type like left(request_type, -1) || '%'))
    and (min_amount_php is null or coalesce(requested_amount, 0) >= min_amount_php)
    and (max_amount_php is null or coalesce(requested_amount, 0) <= max_amount_php)
  order by case when request_type = requested_type then 0 when request_type <> '*' then 1 else 2 end, priority, created_at
  limit 1
$$;

create or replace function public.approval_create_request(
  requested_requester_id uuid,
  requested_idempotency_key uuid,
  requested_request_type text,
  requested_subject text,
  requested_description text,
  requested_priority text,
  requested_source_module text,
  requested_details jsonb,
  requested_submit boolean,
  requested_required_by date default null,
  requested_amount_php integer default null,
  requested_currency text default 'PHP',
  requested_project_id uuid default null,
  requested_booking_id uuid default null,
  requested_client_id uuid default null,
  requested_employee_id uuid default null,
  requested_source_record_id uuid default null,
  requested_source_reference text default null,
  requested_notes text default null
)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare
  created_request public.approval_requests;
  chosen_rule public.approval_workflow_rules;
  step_value jsonb;
  step_index integer := 0;
  step_role public.staff_role;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_requester_id and active) then
    raise exception using errcode = '42501', message = 'Active staff access is required.';
  end if;
  if requested_details is null or jsonb_typeof(requested_details) <> 'object' then raise exception 'Request details must be an object.'; end if;

  if requested_submit then
    select * into chosen_rule from public.approval_workflow_rules where id = public.approval_select_rule(requested_request_type, requested_amount_php);
    if chosen_rule.id is null then raise exception 'No active approval workflow is configured for this request.'; end if;
  end if;

  insert into public.approval_requests (
    reference, request_type, subject, description, priority, status, fulfillment_status,
    requester_id, workflow_rule_id, source_module, source_record_id, source_reference,
    project_id, booking_id, client_id, employee_id, amount_php, currency, required_by,
    details, notes_to_approver, idempotency_key, submitted_at
  ) values (
    public.approval_next_reference(), requested_request_type, btrim(requested_subject), btrim(requested_description), requested_priority,
    case when requested_submit then 'pending_approval' else 'draft' end,
    case when requested_request_type = 'cash_advance_liquidation' then 'liquidation_submitted' when requested_amount_php is not null then case when requested_request_type = 'cash_advance' then 'not_released' else 'awaiting_payment' end else null end,
    requested_requester_id, chosen_rule.id, requested_source_module, requested_source_record_id, nullif(btrim(requested_source_reference), ''),
    requested_project_id, requested_booking_id, requested_client_id, requested_employee_id, requested_amount_php, requested_currency,
    requested_required_by, requested_details, nullif(btrim(requested_notes), ''), requested_idempotency_key,
    case when requested_submit then now() else null end
  ) returning * into created_request;

  if requested_submit and requested_request_type = 'cash_advance_liquidation' then
    if not exists (select 1 from public.approval_requests where id = requested_source_record_id and request_type = 'cash_advance' and status = 'approved' and fulfillment_status in ('released', 'awaiting_liquidation', 'liquidation_submitted')) then raise exception 'The original cash advance is not available for liquidation.'; end if;
    update public.approval_requests set fulfillment_status = 'liquidation_submitted' where id = requested_source_record_id;
  end if;

  if requested_submit then
    for step_value in select value from jsonb_array_elements(chosen_rule.steps) loop
      step_index := step_index + 1;
      step_role := (step_value->>'role')::public.staff_role;
      insert into public.approval_steps (request_id, step_number, approver_role, status, due_at)
      values (created_request.id, step_index, step_role, case when step_index = 1 then 'pending' else 'queued' end,
        now() + make_interval(hours => greatest(coalesce((step_value->>'due_hours')::integer, 48), 1)));
    end loop;
  end if;

  insert into public.approval_audit_log (request_id, actor_id, action, new_state)
  values (created_request.id, requested_requester_id, case when requested_submit then 'submitted' else 'draft_created' end, to_jsonb(created_request));

  if requested_submit then
    insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
    select sp.user_id, created_request.id, 'approval:submitted:' || created_request.id || ':' || sp.user_id,
      'approval_assigned', 'Approval assigned', created_request.reference || ' requires your review.', '/approvals?request=' || created_request.id
    from public.staff_profiles sp
    where sp.active and sp.role = (select approver_role from public.approval_steps where request_id = created_request.id and step_number = 1)
    on conflict (event_key) do nothing;
  end if;
  return created_request;
exception
  when unique_violation then
    select * into created_request from public.approval_requests where requester_id = requested_requester_id and idempotency_key = requested_idempotency_key;
    if created_request.id is not null then return created_request; end if;
    raise;
end
$$;

create or replace function public.approval_submit_request(requested_request_id uuid, requested_actor_id uuid, requested_comment text default null)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare
  current_request public.approval_requests;
  previous_request jsonb;
  chosen_rule public.approval_workflow_rules;
  step_value jsonb;
  step_index integer := 0;
  first_step_number integer;
begin
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.id is null then raise exception 'Approval request not found.'; end if;
  if current_request.requester_id <> requested_actor_id then raise exception using errcode = '42501', message = 'Only the requester can submit this request.'; end if;
  if current_request.status not in ('draft', 'returned_for_changes') then raise exception using errcode = '40001', message = 'This request is no longer available for submission.'; end if;
  previous_request := to_jsonb(current_request);
  select * into chosen_rule from public.approval_workflow_rules where id = public.approval_select_rule(current_request.request_type, current_request.amount_php);
  if chosen_rule.id is null then raise exception 'No active approval workflow is configured for this request.'; end if;

  update public.approval_steps set status = 'skipped' where request_id = current_request.id and status = 'queued';
  select coalesce(max(step_number), 0) into step_index from public.approval_steps where request_id = current_request.id;
  first_step_number := step_index + 1;
  for step_value in select value from jsonb_array_elements(chosen_rule.steps) loop
    step_index := step_index + 1;
    insert into public.approval_steps (request_id, step_number, approver_role, status, due_at)
    values (current_request.id, step_index, (step_value->>'role')::public.staff_role, case when step_index = 1 then 'pending' else 'queued' end,
      now() + make_interval(hours => greatest(coalesce((step_value->>'due_hours')::integer, 48), 1)));
  end loop;
  update public.approval_requests set status = 'pending_approval', workflow_rule_id = chosen_rule.id, submitted_at = now(), rejected_at = null
  where id = current_request.id returning * into current_request;
  if current_request.request_type = 'cash_advance_liquidation' then
    if not exists (select 1 from public.approval_requests where id = current_request.source_record_id and request_type = 'cash_advance' and status = 'approved' and fulfillment_status in ('released', 'awaiting_liquidation', 'liquidation_submitted')) then raise exception 'The original cash advance is not available for liquidation.'; end if;
    update public.approval_requests set fulfillment_status = 'liquidation_submitted' where id = current_request.source_record_id;
  end if;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment)
  values (current_request.id, requested_actor_id, case when previous_request->>'status' = 'returned_for_changes' then 'resubmitted' else 'submitted' end, previous_request, to_jsonb(current_request), requested_comment);
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  select sp.user_id, current_request.id, 'approval:resubmitted:' || current_request.id || ':' || extract(epoch from current_request.submitted_at)::bigint || ':' || sp.user_id,
    'approval_assigned', 'Approval assigned', current_request.reference || ' requires your review.', '/approvals?request=' || current_request.id
  from public.staff_profiles sp where sp.active and sp.role = (select approver_role from public.approval_steps where request_id = current_request.id and step_number = first_step_number)
  on conflict (event_key) do nothing;
  return current_request;
end
$$;

create or replace function public.approval_refresh_cash_advance_liquidation(requested_advance_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare released_amount bigint; spent_amount bigint; returned_amount bigint; reimbursed_amount bigint; next_status text;
begin
  select coalesce(sum(amount_php), 0) into released_amount from public.approval_financial_events where request_id = requested_advance_id and event_type = 'release';
  select amount_php into spent_amount from public.approval_requests where source_record_id = requested_advance_id and request_type = 'cash_advance_liquidation' and status = 'approved' order by approved_at desc limit 1;
  if spent_amount is null then update public.approval_requests set fulfillment_status = 'liquidation_submitted' where id = requested_advance_id; return 'liquidation_submitted'; end if;
  select coalesce(sum(amount_php), 0) into returned_amount from public.approval_financial_events where request_id = requested_advance_id and event_type = 'balance_return';
  select coalesce(sum(amount_php), 0) into reimbursed_amount from public.approval_financial_events where request_id = requested_advance_id and event_type = 'reimbursement';
  next_status := case when returned_amount >= greatest(released_amount - spent_amount, 0) and reimbursed_amount >= greatest(spent_amount - released_amount, 0) then 'liquidated' else 'liquidation_submitted' end;
  update public.approval_requests set fulfillment_status = next_status where id = requested_advance_id;
  return next_status;
end
$$;

create or replace function public.approval_update_request(requested_request_id uuid, requested_actor_id uuid, requested_subject text, requested_description text, requested_priority text, requested_details jsonb, requested_required_by date default null, requested_amount_php integer default null, requested_notes text default null, requested_submit boolean default false)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.approval_requests; previous_request jsonb;
begin
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.id is null then raise exception 'Approval request not found.'; end if;
  if current_request.requester_id <> requested_actor_id or current_request.status not in ('draft', 'returned_for_changes') then raise exception using errcode = '42501', message = 'This request cannot be edited.'; end if;
  if requested_details is null or jsonb_typeof(requested_details) <> 'object' then raise exception 'Request details must be an object.'; end if;
  previous_request := to_jsonb(current_request);
  update public.approval_requests set subject = btrim(requested_subject), description = btrim(requested_description), priority = requested_priority,
    details = requested_details, required_by = requested_required_by, amount_php = requested_amount_php, notes_to_approver = nullif(btrim(requested_notes), '')
  where id = current_request.id returning * into current_request;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state)
  values (current_request.id, requested_actor_id, 'edited', previous_request, to_jsonb(current_request));
  if requested_submit then return public.approval_submit_request(current_request.id, requested_actor_id, null); end if;
  return current_request;
end
$$;

create or replace function public.approval_decide_request(requested_request_id uuid, requested_actor_id uuid, requested_action text, requested_comment text default null)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare
  current_request public.approval_requests;
  active_step public.approval_steps;
  next_step public.approval_steps;
  actor_role public.staff_role;
  chosen_rule public.approval_workflow_rules;
  previous_request jsonb;
  decision_value text;
begin
  if requested_action not in ('approve', 'reject', 'return', 'request_document', 'override_approve', 'override_reject') then raise exception 'Unsupported approval decision.'; end if;
  if requested_action in ('reject', 'return', 'request_document', 'override_approve', 'override_reject') and length(btrim(coalesce(requested_comment, ''))) = 0 then raise exception 'A reason is required for this decision.'; end if;
  select role into actor_role from public.staff_profiles where user_id = requested_actor_id and active;
  if actor_role is null then raise exception using errcode = '42501', message = 'Active staff access is required.'; end if;
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.id is null then raise exception 'Approval request not found.'; end if;
  if current_request.status <> 'pending_approval' then raise exception using errcode = '40001', message = 'This request was already decided or is no longer pending.'; end if;
  select * into active_step from public.approval_steps where request_id = requested_request_id and status = 'pending' order by step_number limit 1 for update;
  if active_step.id is null then raise exception using errcode = '40001', message = 'The active approval step is no longer available.'; end if;
  if requested_action like 'override_%' then
    if actor_role <> 'super_admin' then raise exception using errcode = '42501', message = 'Super Admin access is required for an override.'; end if;
  elsif active_step.approver_user_id is distinct from requested_actor_id and (active_step.approver_user_id is not null or active_step.approver_role is distinct from actor_role) then
    raise exception using errcode = '42501', message = 'This approval step is not assigned to you.';
  end if;
  select * into chosen_rule from public.approval_workflow_rules where id = current_request.workflow_rule_id;
  if current_request.amount_php is not null and current_request.requester_id = requested_actor_id and not (actor_role = 'super_admin' and chosen_rule.allow_self_super_admin) then
    raise exception using errcode = '42501', message = 'You cannot approve your own financial request.';
  end if;
  previous_request := to_jsonb(current_request);
  decision_value := case requested_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'return' then 'returned' when 'request_document' then 'returned' when 'override_approve' then 'override_approved' else 'override_rejected' end;
  update public.approval_steps set status = case when requested_action in ('approve', 'override_approve') then 'approved' when requested_action in ('reject', 'override_reject') then 'rejected' else 'returned' end,
    decision = decision_value, comment = nullif(btrim(requested_comment), ''), acted_by = requested_actor_id, acted_at = now()
  where id = active_step.id;

  if requested_action in ('reject', 'override_reject') then
    update public.approval_requests set status = 'rejected', rejected_at = now(), completed_at = now() where id = current_request.id returning * into current_request;
  elsif requested_action in ('return', 'request_document') then
    update public.approval_requests set status = 'returned_for_changes' where id = current_request.id returning * into current_request;
  else
    select * into next_step from public.approval_steps where request_id = current_request.id and status = 'queued' order by step_number limit 1 for update;
    if next_step.id is null then
      update public.approval_requests set status = 'approved', approved_at = now(), completed_at = now() where id = current_request.id returning * into current_request;
      if current_request.request_type = 'payroll_adjustment' and current_request.source_module = 'payroll' and current_request.source_record_id is not null then
        update public.payroll_adjustments set status = 'approved', approved_at = now(), approved_by = requested_actor_id where id = current_request.source_record_id and status = 'pending';
      end if;
      if current_request.request_type = 'cash_advance_liquidation' and current_request.source_record_id is not null then perform public.approval_refresh_cash_advance_liquidation(current_request.source_record_id); end if;
      if current_request.amount_php is not null then
        insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
        select sp.user_id, current_request.id, 'approval:fulfillment:' || current_request.id || ':' || sp.user_id,
          'approval_fulfillment', 'Approved funds require action', current_request.reference || ' is approved and requires release or payment.', '/approvals?request=' || current_request.id
        from public.staff_profiles sp where sp.active and sp.role in ('admin', 'super_admin')
        on conflict (event_key) do nothing;
      end if;
    else
      update public.approval_steps set status = 'pending' where id = next_step.id;
      update public.approval_requests set current_approver_id = next_step.approver_user_id where id = current_request.id returning * into current_request;
      insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
      select sp.user_id, current_request.id, 'approval:step:' || next_step.id || ':' || sp.user_id, 'approval_assigned', 'Approval assigned', current_request.reference || ' requires your review.', '/approvals?request=' || current_request.id
      from public.staff_profiles sp where sp.active and (sp.user_id = next_step.approver_user_id or (next_step.approver_user_id is null and sp.role = next_step.approver_role))
      on conflict (event_key) do nothing;
    end if;
  end if;

  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment, approval_step_id)
  values (current_request.id, requested_actor_id, requested_action, previous_request, to_jsonb(current_request), nullif(btrim(requested_comment), ''), active_step.id);
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  values (current_request.requester_id, current_request.id, 'approval:decision:' || active_step.id, 'approval_decision', 'Request updated', current_request.reference || ' is now ' || replace(current_request.status, '_', ' ') || '.', '/approvals?tab=my-requests&request=' || current_request.id)
  on conflict (event_key) do nothing;
  return current_request;
end
$$;

create or replace function public.approval_add_comment(requested_request_id uuid, requested_actor_id uuid, requested_body text, requested_visibility text default 'participants')
returns public.approval_comments language plpgsql security definer set search_path = '' as $$
declare created_comment public.approval_comments; actor_role public.staff_role;
begin
  select role into actor_role from public.staff_profiles where user_id = requested_actor_id and active;
  if actor_role is null then raise exception using errcode = '42501', message = 'Active staff access is required.'; end if;
  if requested_visibility not in ('participants', 'approvers', 'internal') then raise exception 'Choose a valid comment visibility.'; end if;
  if requested_visibility = 'internal' and actor_role <> 'super_admin' then raise exception using errcode = '42501', message = 'Only Super Admin can add internal notes.'; end if;
  if not exists (
    select 1 from public.approval_requests r where r.id = requested_request_id and (
      r.requester_id = requested_actor_id or actor_role = 'super_admin' or (actor_role = 'admin' and r.amount_php is null)
      or exists (select 1 from public.approval_steps s where s.request_id = r.id and (s.approver_user_id = requested_actor_id or (s.approver_user_id is null and s.approver_role = actor_role)))
    )
  ) then raise exception using errcode = '42501', message = 'You cannot comment on this request.'; end if;
  insert into public.approval_comments (request_id, author_id, body, visibility)
  values (requested_request_id, requested_actor_id, btrim(requested_body), requested_visibility) returning * into created_comment;
  insert into public.approval_audit_log (request_id, actor_id, action, comment, metadata)
  values (requested_request_id, requested_actor_id, 'comment_added', btrim(requested_body), jsonb_build_object('visibility', requested_visibility));
  return created_comment;
end
$$;

create or replace function public.approval_reassign_step(requested_request_id uuid, requested_actor_id uuid, requested_target_id uuid, requested_comment text, requested_delegate boolean default false)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.approval_requests; active_step public.approval_steps; actor_role public.staff_role; target_role public.staff_role; previous_step jsonb;
begin
  if length(btrim(coalesce(requested_comment, ''))) = 0 then raise exception 'A reason is required for reassignment.'; end if;
  select role into actor_role from public.staff_profiles where user_id = requested_actor_id and active;
  select role into target_role from public.staff_profiles where user_id = requested_target_id and active;
  if actor_role is null or target_role is null then raise exception 'Choose an active staff member.'; end if;
  select * into current_request from public.approval_requests where id = requested_request_id and status = 'pending_approval' for update;
  select * into active_step from public.approval_steps where request_id = requested_request_id and status = 'pending' order by step_number limit 1 for update;
  if current_request.id is null or active_step.id is null then raise exception using errcode = '40001', message = 'The active approval step is no longer available.'; end if;
  if actor_role <> 'super_admin' and active_step.approver_user_id is distinct from requested_actor_id and (active_step.approver_user_id is not null or active_step.approver_role is distinct from actor_role) then raise exception using errcode = '42501', message = 'This approval step is not assigned to you.'; end if;
  if target_role = 'staff' then raise exception using errcode = '42501', message = 'Approval decisions can only be reassigned to an authorized Admin.'; end if;
  previous_step := to_jsonb(active_step);
  update public.approval_steps set approver_user_id = requested_target_id, approver_role = target_role, delegated_from = case when requested_delegate then requested_actor_id else delegated_from end where id = active_step.id;
  update public.approval_requests set current_approver_id = requested_target_id where id = current_request.id returning * into current_request;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment, approval_step_id)
  values (current_request.id, requested_actor_id, case when requested_delegate then 'delegated' else 'reassigned' end, previous_step, jsonb_build_object('approver_user_id', requested_target_id, 'approver_role', target_role), btrim(requested_comment), active_step.id);
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  values (requested_target_id, current_request.id, 'approval:assignment:' || active_step.id || ':' || requested_target_id, 'approval_assigned', 'Approval assigned', current_request.reference || ' requires your review.', '/approvals?request=' || current_request.id)
  on conflict (event_key) do nothing;
  return current_request;
end
$$;

create or replace function public.approval_bulk_approve(requested_request_ids uuid[], requested_actor_id uuid, requested_comment text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare baseline_type text; baseline_step smallint; baseline_role public.staff_role; candidate record; approved_count integer := 0;
begin
  if not (coalesce(array_length(requested_request_ids, 1), 0) between 1 and 50) then raise exception 'Select between 1 and 50 requests.'; end if;
  for candidate in
    select r.id, r.request_type, r.amount_php, s.step_number, s.approver_role, w.bulk_approval_allowed, w.bulk_amount_limit_php
    from public.approval_requests r
    join public.approval_steps s on s.request_id = r.id and s.status = 'pending'
    join public.approval_workflow_rules w on w.id = r.workflow_rule_id
    where r.id = any(requested_request_ids)
    order by r.id for update of r, s
  loop
    if not candidate.bulk_approval_allowed or (candidate.amount_php is not null and (candidate.bulk_amount_limit_php is null or candidate.amount_php > candidate.bulk_amount_limit_php)) then raise exception 'One or more selected requests require individual review.'; end if;
    if baseline_type is null then baseline_type := candidate.request_type; baseline_step := candidate.step_number; baseline_role := candidate.approver_role;
    elsif candidate.request_type <> baseline_type or candidate.step_number <> baseline_step or candidate.approver_role is distinct from baseline_role then raise exception 'Bulk requests must share a type, step, and approver.'; end if;
    perform public.approval_decide_request(candidate.id, requested_actor_id, 'approve', requested_comment);
    approved_count := approved_count + 1;
  end loop;
  if approved_count <> array_length(requested_request_ids, 1) then raise exception 'One or more selected requests are unavailable.'; end if;
  return approved_count;
end
$$;

create or replace function public.approval_withdraw_request(requested_request_id uuid, requested_actor_id uuid, requested_comment text default null)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.approval_requests; previous_request jsonb;
begin
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.id is null then raise exception 'Approval request not found.'; end if;
  if current_request.requester_id <> requested_actor_id or current_request.status not in ('draft', 'submitted', 'pending_approval', 'returned_for_changes') then raise exception using errcode = '42501', message = 'This request cannot be withdrawn.'; end if;
  if current_request.status in ('submitted', 'pending_approval') and length(btrim(coalesce(requested_comment, ''))) = 0 then raise exception 'A reason is required after review has begun.'; end if;
  previous_request := to_jsonb(current_request);
  update public.approval_steps set status = 'skipped' where request_id = current_request.id and status in ('pending', 'queued');
  update public.approval_requests set status = 'withdrawn', withdrawn_at = now(), completed_at = now() where id = current_request.id returning * into current_request;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment) values (current_request.id, requested_actor_id, 'withdrawn', previous_request, to_jsonb(current_request), nullif(btrim(requested_comment), ''));
  return current_request;
end
$$;

create or replace function public.approval_archive_request(requested_request_id uuid, requested_actor_id uuid, requested_comment text)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.approval_requests; previous_request jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role = 'super_admin') then raise exception using errcode = '42501', message = 'Super Admin access is required.'; end if;
  if length(btrim(coalesce(requested_comment, ''))) = 0 then raise exception 'A reason is required to archive a request.'; end if;
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.status not in ('approved', 'rejected', 'cancelled', 'withdrawn') or current_request.archived_at is not null then raise exception 'Only completed requests can be archived.'; end if;
  previous_request := to_jsonb(current_request);
  update public.approval_requests set archived_at = now() where id = current_request.id returning * into current_request;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment) values (current_request.id, requested_actor_id, 'archived', previous_request, to_jsonb(current_request), btrim(requested_comment));
  return current_request;
end
$$;

create or replace function public.approval_update_workflow_rule(requested_rule_id uuid, requested_actor_id uuid, requested_min_amount_php integer, requested_max_amount_php integer, requested_bulk_allowed boolean, requested_bulk_limit_php integer, requested_active boolean)
returns public.approval_workflow_rules language plpgsql security definer set search_path = '' as $$
declare current_rule public.approval_workflow_rules; previous_rule jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role = 'super_admin') then raise exception using errcode = '42501', message = 'Super Admin access is required.'; end if;
  select * into current_rule from public.approval_workflow_rules where id = requested_rule_id for update;
  if current_rule.id is null then raise exception 'Workflow rule not found.'; end if;
  if requested_min_amount_php < 0 or requested_max_amount_php < 0 or (requested_min_amount_php is not null and requested_max_amount_php is not null and requested_max_amount_php < requested_min_amount_php) then raise exception 'Workflow amount range is invalid.'; end if;
  previous_rule := to_jsonb(current_rule);
  update public.approval_workflow_rules set min_amount_php = requested_min_amount_php, max_amount_php = requested_max_amount_php,
    bulk_approval_allowed = requested_bulk_allowed, bulk_amount_limit_php = case when requested_bulk_allowed then requested_bulk_limit_php else null end, active = requested_active
  where id = current_rule.id returning * into current_rule;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  select requested_actor_id, display_name, 'Updated approval workflow rule', 'security', 'approval_workflow_rule', current_rule.id, jsonb_build_object('previous', previous_rule, 'new', to_jsonb(current_rule))
  from public.staff_profiles where user_id = requested_actor_id;
  return current_rule;
end
$$;

create or replace function public.approval_record_financial_event(requested_request_id uuid, requested_actor_id uuid, requested_event_type text, requested_amount_php integer, requested_payment_method text, requested_transaction_reference text, requested_occurred_at timestamptz, requested_notes text default null)
returns public.approval_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.approval_requests; actor_role public.staff_role; previous_request jsonb; total_recorded bigint;
begin
  select role into actor_role from public.staff_profiles where user_id = requested_actor_id and active;
  if actor_role not in ('admin', 'super_admin') then raise exception using errcode = '42501', message = 'Financial recording permission is required.'; end if;
  select * into current_request from public.approval_requests where id = requested_request_id for update;
  if current_request.status <> 'approved' or current_request.amount_php is null then raise exception 'Only approved financial requests can be fulfilled.'; end if;
  previous_request := to_jsonb(current_request);
  insert into public.approval_financial_events (request_id, event_type, amount_php, payment_method, transaction_reference, recorded_by, occurred_at, notes)
  values (current_request.id, requested_event_type, requested_amount_php, btrim(requested_payment_method), btrim(requested_transaction_reference), requested_actor_id, requested_occurred_at, nullif(btrim(requested_notes), ''));
  select coalesce(sum(amount_php), 0) into total_recorded from public.approval_financial_events where request_id = current_request.id and event_type = requested_event_type;
  update public.approval_requests set fulfillment_status = case
    when requested_event_type = 'payment' and total_recorded >= amount_php then 'paid'
    when requested_event_type = 'payment' then 'awaiting_payment'
    when requested_event_type = 'release' and total_recorded >= amount_php and request_type = 'cash_advance' then 'awaiting_liquidation'
    when requested_event_type = 'release' and total_recorded >= amount_php then 'released'
    when requested_event_type = 'release' then 'partially_released'
    else fulfillment_status end
  where id = current_request.id returning * into current_request;
  if requested_event_type in ('balance_return', 'reimbursement') and current_request.request_type = 'cash_advance' then perform public.approval_refresh_cash_advance_liquidation(current_request.id); select * into current_request from public.approval_requests where id = current_request.id; end if;
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment, metadata)
  values (current_request.id, requested_actor_id, requested_event_type, previous_request, to_jsonb(current_request), nullif(btrim(requested_notes), ''), jsonb_build_object('amount_php', requested_amount_php, 'transaction_reference', requested_transaction_reference));
  return current_request;
end
$$;

create or replace function public.approval_can_view(requested_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.approval_requests r
    join public.staff_profiles viewer on viewer.user_id = auth.uid() and viewer.active
    where r.id = requested_request_id and (
      r.requester_id = viewer.user_id or viewer.role = 'super_admin'
      or exists (select 1 from public.approval_steps s where s.request_id = r.id and (s.approver_user_id = viewer.user_id or (s.approver_user_id is null and s.approver_role = viewer.role)))
      or (viewer.role = 'admin' and r.amount_php is null)
    )
  )
$$;

create or replace function public.approval_enqueue_due_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer; event_count integer;
begin
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  select sp.user_id, r.id,
    'approval:' || case when s.due_at < now() then 'overdue:' else 'due-soon:' end || s.id || ':' || sp.user_id,
    case when s.due_at < now() then 'approval_overdue' else 'approval_due' end,
    case when s.due_at < now() then 'Approval overdue' else 'Approval due soon' end,
    r.reference || case when s.due_at < now() then ' is overdue.' else ' is due within 24 hours.' end,
    '/approvals?request=' || r.id
  from public.approval_steps s
  join public.approval_requests r on r.id = s.request_id and r.status = 'pending_approval'
  join public.staff_profiles sp on sp.active and (sp.user_id = s.approver_user_id or (s.approver_user_id is null and sp.role = s.approver_role))
  where s.status = 'pending' and s.due_at < now() + interval '24 hours'
  on conflict (event_key) do nothing;
  get diagnostics inserted_count = row_count;
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  select sp.user_id, r.id, 'approval:urgent-overdue:' || r.id || ':' || sp.user_id, 'approval_escalation', 'Urgent approval overdue', r.reference || ' is urgent and overdue.', '/approvals?request=' || r.id
  from public.approval_requests r join public.staff_profiles sp on sp.active and sp.role in ('admin', 'super_admin')
  where r.status = 'pending_approval' and r.priority = 'urgent' and r.required_by < timezone('Asia/Manila', now())::date
  on conflict (event_key) do nothing;
  get diagnostics event_count = row_count;
  inserted_count := inserted_count + event_count;
  insert into public.staff_notifications (recipient_id, request_id, event_key, kind, title, body, href)
  select r.requester_id, r.id, 'approval:liquidation-due:' || r.id, 'liquidation_due', 'Cash advance liquidation due soon', r.reference || ' is nearing its liquidation deadline.', '/approvals?tab=my-requests&request=' || r.id
  from public.approval_requests r
  where r.request_type = 'cash_advance' and r.fulfillment_status = 'awaiting_liquidation'
    and r.details->>'expectedLiquidationDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and to_date(r.details->>'expectedLiquidationDate', 'YYYY-MM-DD') between timezone('Asia/Manila', now())::date and timezone('Asia/Manila', now())::date + 3
  on conflict (event_key) do nothing;
  get diagnostics event_count = row_count;
  inserted_count := inserted_count + event_count;
  return inserted_count;
end
$$;

alter table public.approval_reference_counters enable row level security;
alter table public.approval_workflow_rules enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.approval_comments enable row level security;
alter table public.approval_attachments enable row level security;
alter table public.approval_financial_events enable row level security;
alter table public.approval_liquidation_items enable row level security;
alter table public.approval_audit_log enable row level security;
alter table public.staff_notifications enable row level security;

revoke all on public.approval_reference_counters, public.approval_workflow_rules, public.approval_requests, public.approval_steps, public.approval_comments, public.approval_attachments, public.approval_financial_events, public.approval_liquidation_items, public.approval_audit_log, public.staff_notifications from anon, authenticated;
grant select on public.approval_requests, public.approval_steps, public.approval_comments, public.approval_attachments, public.approval_financial_events, public.approval_liquidation_items, public.approval_audit_log to authenticated;
grant select on public.staff_notifications to authenticated;
grant update (read_at) on public.staff_notifications to authenticated;
grant select on public.approval_workflow_rules to authenticated;

create policy approval_requests_visible on public.approval_requests for select to authenticated using (public.approval_can_view(id));
create policy approval_steps_visible on public.approval_steps for select to authenticated using (public.approval_can_view(request_id));
create policy approval_comments_visible on public.approval_comments for select to authenticated using (public.approval_can_view(request_id));
create policy approval_attachments_visible on public.approval_attachments for select to authenticated using (public.approval_can_view(request_id));
create policy approval_financial_events_visible on public.approval_financial_events for select to authenticated using (public.approval_can_view(request_id));
create policy approval_liquidation_items_visible on public.approval_liquidation_items for select to authenticated using (public.approval_can_view(request_id));
create policy approval_audit_visible on public.approval_audit_log for select to authenticated using (public.approval_can_view(request_id));
create policy approval_workflow_rules_super_admin on public.approval_workflow_rules for select to authenticated using (exists (select 1 from public.staff_profiles where user_id = auth.uid() and active and role = 'super_admin'));
create policy staff_notifications_self_select on public.staff_notifications for select to authenticated using (recipient_id = auth.uid());
create policy staff_notifications_self_update on public.staff_notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

revoke all on function public.approval_next_reference(), public.approval_select_rule(text, integer), public.approval_refresh_cash_advance_liquidation(uuid), public.approval_create_request(uuid, uuid, text, text, text, text, text, jsonb, boolean, date, integer, text, uuid, uuid, uuid, uuid, uuid, text, text), public.approval_submit_request(uuid, uuid, text), public.approval_update_request(uuid, uuid, text, text, text, jsonb, date, integer, text, boolean), public.approval_decide_request(uuid, uuid, text, text), public.approval_add_comment(uuid, uuid, text, text), public.approval_reassign_step(uuid, uuid, uuid, text, boolean), public.approval_bulk_approve(uuid[], uuid, text), public.approval_withdraw_request(uuid, uuid, text), public.approval_archive_request(uuid, uuid, text), public.approval_update_workflow_rule(uuid, uuid, integer, integer, boolean, integer, boolean), public.approval_record_financial_event(uuid, uuid, text, integer, text, text, timestamptz, text), public.approval_enqueue_due_notifications() from public, anon, authenticated;
grant execute on function public.approval_create_request(uuid, uuid, text, text, text, text, text, jsonb, boolean, date, integer, text, uuid, uuid, uuid, uuid, uuid, text, text), public.approval_submit_request(uuid, uuid, text), public.approval_update_request(uuid, uuid, text, text, text, jsonb, date, integer, text, boolean), public.approval_decide_request(uuid, uuid, text, text), public.approval_add_comment(uuid, uuid, text, text), public.approval_reassign_step(uuid, uuid, uuid, text, boolean), public.approval_bulk_approve(uuid[], uuid, text), public.approval_withdraw_request(uuid, uuid, text), public.approval_archive_request(uuid, uuid, text), public.approval_update_workflow_rule(uuid, uuid, integer, integer, boolean, integer, boolean), public.approval_record_financial_event(uuid, uuid, text, integer, text, text, timestamptz, text), public.approval_enqueue_due_notifications() to service_role;
grant execute on function public.approval_can_view(uuid) to authenticated;
