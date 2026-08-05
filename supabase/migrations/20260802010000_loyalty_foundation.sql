-- Canonical Kahel loyalty foundation. Monetary amounts are integer PHP centavos.

create type public.staff_role as enum ('super_admin', 'admin', 'staff');
create type public.booking_attendance as enum ('expected', 'attended', 'no_show');
create type public.booking_kind as enum ('standard', 'test', 'internal', 'complimentary', 'reward');
create type public.loyalty_reward_status as enum ('available', 'reserved', 'redeemed', 'cancelled');
create type public.loyalty_eligibility_state as enum ('ineligible', 'counted', 'reversed');
create type public.loyalty_email_status as enum ('pending', 'processing', 'sent', 'failed');

alter table public.clients
  add column external_ref text,
  add column primary_contact_profile_id uuid;

update public.clients
set external_ref = 'KAHEL-' || upper(replace(id::text, '-', ''))
where external_ref is null;

alter table public.clients
  alter column external_ref set not null,
  add constraint clients_external_ref_format_check
    check (length(btrim(external_ref)) between 1 and 100),
  add constraint clients_external_ref_key unique (external_ref),
  add constraint clients_primary_contact_fkey
    foreign key (primary_contact_profile_id, id)
    references public.client_profiles(id, client_id) on delete restrict;

create unique index clients_primary_contact_profile_key
  on public.clients(primary_contact_profile_id) where primary_contact_profile_id is not null;

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.staff_role not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  active boolean not null default true,
  can_manage_bookings boolean not null default false,
  can_manage_loyalty boolean not null default false,
  can_manage_rewards boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_role_permissions_check check (
    role = 'staff' or (can_manage_bookings and can_manage_loyalty and can_manage_rewards)
  )
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.services (id, code, name)
values ('10000000-0000-4000-8000-000000000001', 'solo-session', 'Solo Session')
on conflict (code) do update set name = excluded.name, active = true;

insert into public.services (id, code, name)
values (
  '10000000-0000-4000-8000-000000000002',
  'complimentary-solo-session',
  'Complimentary Solo Session'
)
on conflict (code) do update set name = excluded.name, active = true;

insert into public.services (code, name, active)
select 'legacy-' || substr(md5(b.service_type), 1, 24), b.service_type, true
from public.bookings b
where not exists (
  select 1 from public.services s where s.name = b.service_type
)
group by b.service_type
on conflict (code) do nothing;

alter table public.bookings
  add column service_id uuid references public.services(id) on delete restrict,
  add column completed_at timestamptz,
  add column attendance public.booking_attendance not null default 'expected',
  add column kind public.booking_kind not null default 'standard',
  add column refunded_amount_php integer not null default 0 check (refunded_amount_php >= 0),
  add column duplicate_of uuid references public.bookings(id) on delete restrict,
  add column loyalty_exclusion_reason text,
  add column loyalty_excluded_by uuid references auth.users(id) on delete restrict,
  add column loyalty_excluded_at timestamptz,
  add column reward_id uuid,
  add constraint bookings_refund_check check (refunded_amount_php <= paid_amount_php),
  add constraint bookings_duplicate_check check (duplicate_of is null or duplicate_of <> id),
  add constraint bookings_loyalty_exclusion_check check (
    (loyalty_exclusion_reason is null and loyalty_excluded_by is null and loyalty_excluded_at is null)
    or
    (length(btrim(loyalty_exclusion_reason)) > 0 and loyalty_excluded_by is not null and loyalty_excluded_at is not null)
  ),
  add constraint bookings_reward_kind_check check (
    (kind = 'reward' and reward_id is not null) or (kind <> 'reward' and reward_id is null)
  );

update public.bookings b
set service_id = s.id
from public.services s
where b.service_id is null
  and (s.name = b.service_type or s.code = 'legacy-' || substr(md5(b.service_type), 1, 24));

alter table public.bookings alter column service_id set not null;

update public.bookings
set completed_at = service_date::timestamp at time zone 'Asia/Manila'
where status = 'completed' and completed_at is null;

alter table public.bookings drop constraint bookings_status_check;
update public.bookings set status = 'inquiry' where status = 'pending';
update public.bookings set status = 'progress' where status = 'in_progress';
alter table public.bookings
  alter column status set default 'inquiry',
  add constraint bookings_status_check
    check (status in ('inquiry', 'quoted', 'confirmed', 'progress', 'completed', 'cancelled'));

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  launch_date date not null,
  active boolean not null default false,
  threshold integer not null check (threshold > 0),
  reward_service_id uuid not null references public.services(id) on delete restrict,
  expires_after interval,
  retroactive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_after is null or expires_after > interval '0 seconds')
);

create table public.loyalty_program_services (
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  eligible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (program_id, service_id)
);

create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  program_id uuid not null references public.loyalty_programs(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  threshold integer not null check (threshold > 0),
  service_id uuid not null references public.services(id) on delete restrict,
  status public.loyalty_reward_status not null default 'available',
  issued_at timestamptz not null default now(),
  reserved_at timestamptz,
  redeemed_at timestamptz,
  voided_at timestamptz,
  expires_at timestamptz,
  review_required boolean not null default false,
  review_reason text,
  updated_at timestamptz not null default now(),
  unique (client_id, program_id, sequence),
  unique (id, client_id),
  check ((not review_required and review_reason is null) or (review_required and length(btrim(review_reason)) > 0)),
  check (
    (status = 'available' and reserved_at is null and redeemed_at is null and voided_at is null)
    or (status = 'reserved' and reserved_at is not null and redeemed_at is null and voided_at is null)
    or (status = 'redeemed' and reserved_at is not null and redeemed_at is not null and voided_at is null)
    or (status = 'cancelled' and voided_at is not null and redeemed_at is null)
  )
);

alter table public.bookings
  add constraint bookings_reward_client_fkey foreign key (reward_id, client_id)
    references public.loyalty_rewards(id, client_id) on delete restrict;

create unique index bookings_reward_id_key on public.bookings(reward_id) where reward_id is not null;

create table public.loyalty_booking_eligibility (
  booking_id uuid references public.bookings(id) on delete restrict,
  program_id uuid not null references public.loyalty_programs(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  state public.loyalty_eligibility_state not null,
  contribution smallint not null check (contribution in (0, 1)),
  reason_code text not null check (length(btrim(reason_code)) between 1 and 100),
  evaluated_at timestamptz not null default now(),
  primary key (booking_id, program_id)
);

create table public.loyalty_booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  program_id uuid not null references public.loyalty_programs(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  event_key text not null unique check (length(btrim(event_key)) between 1 and 250),
  event_type text not null check (event_type in ('counted', 'reversed', 'adjustment')),
  delta integer not null check (delta <> 0),
  reason_code text not null check (length(btrim(reason_code)) between 1 and 100),
  created_at timestamptz not null default now(),
  check (
    (event_type = 'counted' and booking_id is not null and delta = 1)
    or (event_type = 'reversed' and booking_id is not null and delta = -1)
    or (event_type = 'adjustment' and booking_id is null)
  )
);

create table public.loyalty_email_outbox (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null unique references public.loyalty_rewards(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  template_key text not null default 'loyalty_reward_issued' check (length(btrim(template_key)) > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.loyalty_email_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'sent' or sent_at is not null)
);

create table public.loyalty_terms_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs(id) on delete restrict,
  version integer not null check (version > 0),
  effective_at timestamptz not null,
  body text not null check (length(btrim(body)) > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, version),
  check (published_at is null or published_at <= effective_at)
);

create table public.loyalty_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null check (length(btrim(action)) between 1 and 120),
  entity_type text not null check (length(btrim(entity_type)) between 1 and 120),
  entity_id uuid not null,
  reason text not null check (length(btrim(reason)) > 0),
  previous_data jsonb not null check (jsonb_typeof(previous_data) = 'object'),
  new_data jsonb not null check (jsonb_typeof(new_data) = 'object'),
  created_at timestamptz not null default now()
);

create index bookings_service_id_idx on public.bookings(service_id);
create index bookings_loyalty_reconcile_idx on public.bookings(client_id, status, service_date);
create index loyalty_rewards_client_idx on public.loyalty_rewards(client_id, issued_at desc);
create index loyalty_eligibility_client_idx on public.loyalty_booking_eligibility(client_id, program_id, state);
create index loyalty_events_client_idx on public.loyalty_booking_events(client_id, program_id, id);
create index loyalty_outbox_pending_idx on public.loyalty_email_outbox(available_at) where status in ('pending', 'failed');
create index loyalty_audit_entity_idx on public.loyalty_audit_log(entity_type, entity_id, created_at desc);

insert into public.loyalty_programs (
  id, code, name, launch_date, active, threshold, reward_service_id, expires_after, retroactive
) values (
  '20000000-0000-4000-8000-000000000001', 'kahel-loyalty', 'Kahel Loyalty',
  date '2026-09-01', true, 8, '10000000-0000-4000-8000-000000000002', null, false
)
on conflict (code) do update set
  name = excluded.name,
  launch_date = excluded.launch_date,
  active = excluded.active,
  threshold = excluded.threshold,
  reward_service_id = excluded.reward_service_id,
  expires_after = excluded.expires_after,
  retroactive = excluded.retroactive;

insert into public.loyalty_program_services (program_id, service_id, eligible)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', true
)
on conflict (program_id, service_id) do update set eligible = excluded.eligible;

-- Legal/policy review must publish the customer-facing terms before launch.
insert into public.loyalty_terms_versions (program_id, version, effective_at, body, published_at)
values (
  '20000000-0000-4000-8000-000000000001', 1,
  timestamptz '2026-09-01 00:00:00+08',
  'Draft: Kahel Loyalty launch-date-only terms require legal and policy approval.', null
)
on conflict (program_id, version) do nothing;

create or replace function public.loyalty_is_staff(required_permission text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = auth.uid() and sp.active
      and (
        sp.role in ('super_admin', 'admin')
        or required_permission is null
        or (required_permission = 'bookings' and sp.can_manage_bookings)
        or (required_permission = 'loyalty' and sp.can_manage_loyalty)
        or (required_permission = 'rewards' and sp.can_manage_rewards)
      )
  );
$$;

create or replace function public.prevent_loyalty_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'loyalty ledger and audit records are append-only' using errcode = '55000';
end;
$$;

create trigger loyalty_events_append_only before update or delete on public.loyalty_booking_events
for each row execute function public.prevent_loyalty_ledger_mutation();
create trigger loyalty_audit_append_only before update or delete on public.loyalty_audit_log
for each row execute function public.prevent_loyalty_ledger_mutation();

create or replace function public.set_booking_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger set_booking_completed_at
before insert or update of status, completed_at on public.bookings
for each row execute function public.set_booking_completed_at();

create or replace function public.loyalty_reconcile_booking(requested_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings%rowtype;
  p public.loyalty_programs%rowtype;
  old_contribution smallint;
  new_contribution smallint;
  new_state public.loyalty_eligibility_state;
  reason_code text;
  points integer;
  target_sequence integer;
  seq integer;
  inserted_reward_id uuid;
  reward_row public.loyalty_rewards%rowtype;
begin
  select * into b from public.bookings where id = requested_booking_id;
  if not found then return; end if;

  -- Serializes point totals and reward issuance for this client.
  perform 1 from public.clients where id = b.client_id for update;

  -- Existing counted bookings remain reversible even if issuance is later paused.
  for p in
    select * from public.loyalty_programs lp
    where lp.active or exists (
      select 1 from public.loyalty_booking_eligibility existing
      where existing.booking_id = b.id and existing.program_id = lp.id
    )
    order by lp.id
  loop
    select contribution into old_contribution
    from public.loyalty_booking_eligibility
    where booking_id = b.id and program_id = p.id;
    old_contribution := coalesce(old_contribution, 0);

    reason_code := case
      when b.status <> 'completed' then 'not_completed'
      when (b.completed_at at time zone 'Asia/Manila')::date < p.launch_date then 'before_launch'
      when b.kind <> 'standard' then 'non_standard_booking'
      when b.duplicate_of is not null then 'duplicate_booking'
      when b.loyalty_excluded_at is not null then 'admin_excluded'
      when b.total_amount_php <= 0 or b.paid_amount_php <= 0 then 'not_paid'
      when b.refunded_amount_php >= b.paid_amount_php then 'fully_refunded'
      when not exists (
        select 1 from public.loyalty_program_services ps
        where ps.program_id = p.id and ps.service_id = b.service_id and ps.eligible
      ) then 'service_ineligible'
      else 'eligible'
    end;
    new_contribution := case when reason_code = 'eligible' then 1 else 0 end;
    new_state := case
      when new_contribution = 1 then 'counted'::public.loyalty_eligibility_state
      when old_contribution = 1 then 'reversed'::public.loyalty_eligibility_state
      else 'ineligible'::public.loyalty_eligibility_state
    end;

    insert into public.loyalty_booking_eligibility
      (booking_id, program_id, client_id, state, contribution, reason_code, evaluated_at)
    values (b.id, p.id, b.client_id, new_state, new_contribution, reason_code, now())
    on conflict (booking_id, program_id) do update set
      client_id = excluded.client_id, state = excluded.state,
      contribution = excluded.contribution, reason_code = excluded.reason_code,
      evaluated_at = excluded.evaluated_at;

    if old_contribution = 0 and new_contribution = 1 then
      insert into public.loyalty_booking_events
        (booking_id, program_id, client_id, event_key, event_type, delta, reason_code)
      values (
        b.id, p.id, b.client_id,
        b.id || ':' || p.id || ':counted:' ||
          coalesce((select count(*)::text from public.loyalty_booking_events e
                    where e.booking_id = b.id and e.program_id = p.id and e.event_type = 'counted'), '0'),
        'counted', 1, reason_code
      );
    elsif old_contribution = 1 and new_contribution = 0 then
      insert into public.loyalty_booking_events
        (booking_id, program_id, client_id, event_key, event_type, delta, reason_code)
      values (
        b.id, p.id, b.client_id,
        b.id || ':' || p.id || ':reversed:' ||
          coalesce((select count(*)::text from public.loyalty_booking_events e
                    where e.booking_id = b.id and e.program_id = p.id and e.event_type = 'reversed'), '0'),
        'reversed', -1, reason_code
      );

      update public.loyalty_rewards
      set review_required = true,
          review_reason = 'A qualifying booking was reversed; reward is preserved for staff review.',
          updated_at = now()
      where client_id = b.client_id and program_id = p.id and status <> 'cancelled';

      insert into public.loyalty_audit_log
        (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
      values (
        null, 'booking.loyalty_reversed', 'booking', b.id, reason_code,
        jsonb_build_object('contribution', old_contribution, 'state', 'counted'),
        jsonb_build_object('contribution', new_contribution, 'state', new_state,
                           'rewards_preserved', true, 'staff_review_required', true)
      );
    end if;

    select coalesce(sum(delta), 0)::integer into points
    from public.loyalty_booking_events
    where client_id = b.client_id and program_id = p.id;
    target_sequence := greatest(points, 0) / p.threshold;

    if target_sequence > 0 then
      for seq in 1..target_sequence loop
        inserted_reward_id := null;
        insert into public.loyalty_rewards
          (client_id, program_id, sequence, threshold, service_id, expires_at)
        values (
          b.client_id, p.id, seq, p.threshold, p.reward_service_id,
          case when p.expires_after is null then null else now() + p.expires_after end
        )
        on conflict (client_id, program_id, sequence) do nothing
        returning id into inserted_reward_id;

        if inserted_reward_id is not null then
          select * into reward_row from public.loyalty_rewards where id = inserted_reward_id;
          insert into public.loyalty_email_outbox (reward_id, client_id, payload)
          values (
            reward_row.id, reward_row.client_id,
            jsonb_build_object('reward_id', reward_row.id, 'sequence', reward_row.sequence,
                               'service_id', reward_row.service_id)
          ) on conflict (reward_id) do nothing;
        end if;
      end loop;
    end if;
  end loop;

  if b.reward_id is not null then
    if b.status = 'cancelled' or b.attendance = 'no_show' then
      update public.loyalty_rewards
      set review_required = true,
          review_reason = 'Reward booking was cancelled or marked no-show; staff decision required.',
          updated_at = now()
      where id = b.reward_id;
    elsif b.status = 'completed' then
      update public.loyalty_rewards
      set status = 'redeemed', redeemed_at = coalesce(redeemed_at, now()), updated_at = now()
      where id = b.reward_id and status = 'reserved';
    end if;
  end if;
end;
$$;

create or replace function public.loyalty_booking_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.loyalty_reconcile_booking(new.id);
  return new;
end;
$$;

create trigger loyalty_reconcile_booking_after_change
after insert or update of client_id, service_id, service_date, completed_at, status, attendance, kind,
  total_amount_php, paid_amount_php, refunded_amount_php, duplicate_of,
  loyalty_exclusion_reason, loyalty_excluded_by, loyalty_excluded_at, reward_id
on public.bookings for each row execute function public.loyalty_booking_changed();

create or replace function public.loyalty_set_booking_exclusion(
  requested_booking_id uuid, excluded boolean, reason text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare previous_row public.bookings%rowtype; result public.bookings%rowtype; actor uuid := auth.uid();
begin
  if not public.loyalty_is_staff('loyalty') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  select * into previous_row from public.bookings where id = requested_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  update public.bookings set
    loyalty_exclusion_reason = case when excluded then btrim(reason) else null end,
    loyalty_excluded_by = case when excluded then actor else null end,
    loyalty_excluded_at = case when excluded then now() else null end
  where id = requested_booking_id returning * into result;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, case when excluded then 'booking.excluded' else 'booking.exclusion_removed' end,
          'booking', result.id, btrim(reason), to_jsonb(previous_row), to_jsonb(result));
  return result;
end;
$$;

create or replace function public.loyalty_reserve_reward(
  requested_reward_id uuid, requested_booking_id uuid, reason text
)
returns public.loyalty_rewards
language plpgsql security definer set search_path = '' as $$
declare previous_row public.loyalty_rewards%rowtype; result public.loyalty_rewards%rowtype; b public.bookings%rowtype; actor uuid := auth.uid();
begin
  if not public.loyalty_is_staff('rewards') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  select * into previous_row from public.loyalty_rewards where id = requested_reward_id for update;
  select * into b from public.bookings where id = requested_booking_id for update;
  if previous_row.id is null or b.id is null then raise exception 'reward or booking not found' using errcode = 'P0002'; end if;
  if previous_row.status <> 'available' or b.client_id <> previous_row.client_id
     or b.service_id <> previous_row.service_id or b.status not in ('quoted', 'confirmed')
     or b.kind <> 'standard' or b.reward_id is not null then
    raise exception 'reward requires an approved matching solo booking' using errcode = '22023';
  end if;
  update public.loyalty_rewards set status = 'reserved', reserved_at = now(), updated_at = now()
  where id = requested_reward_id returning * into result;
  update public.bookings set reward_id = result.id, kind = 'reward' where id = b.id;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'reward.reserved', 'reward', result.id, btrim(reason),
          to_jsonb(previous_row), to_jsonb(result) || jsonb_build_object('booking_id', b.id));
  return result;
end;
$$;

create or replace function public.loyalty_transition_reward(
  requested_reward_id uuid, requested_status public.loyalty_reward_status, reason text
)
returns public.loyalty_rewards
language plpgsql security definer set search_path = '' as $$
declare previous_row public.loyalty_rewards%rowtype; result public.loyalty_rewards%rowtype; actor uuid := auth.uid();
begin
  if not public.loyalty_is_staff('rewards') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  select * into previous_row from public.loyalty_rewards where id = requested_reward_id for update;
  if not found then raise exception 'reward not found' using errcode = 'P0002'; end if;
  if not ((previous_row.status = 'available' and requested_status = 'cancelled')
       or (previous_row.status = 'reserved' and requested_status in ('available', 'redeemed', 'cancelled'))
       or (previous_row.status = 'cancelled' and requested_status = 'available')) then
    raise exception 'invalid reward transition' using errcode = '22023';
  end if;
  if previous_row.status = 'reserved' and requested_status in ('available', 'cancelled') then
    update public.bookings set reward_id = null, kind = 'standard'
    where reward_id = previous_row.id and status <> 'completed';
  end if;
  update public.loyalty_rewards set
    status = requested_status,
    reserved_at = case when requested_status = 'available' then null when requested_status = 'redeemed' then coalesce(reserved_at, now()) else reserved_at end,
    redeemed_at = case when requested_status = 'redeemed' then now() else null end,
    voided_at = case when requested_status = 'cancelled' then now() else null end,
    review_required = false, review_reason = null, updated_at = now()
  where id = requested_reward_id returning * into result;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'reward.transitioned', 'reward', result.id, btrim(reason), to_jsonb(previous_row), to_jsonb(result));
  return result;
end;
$$;

create or replace function public.loyalty_issue_manual_reward(
  requested_client_id uuid, reason text
)
returns public.loyalty_rewards
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  p public.loyalty_programs%rowtype;
  result public.loyalty_rewards%rowtype;
  next_sequence integer;
begin
  if not public.loyalty_is_staff('rewards') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  perform 1 from public.clients where id = requested_client_id for update;
  if not found then raise exception 'client not found' using errcode = 'P0002'; end if;
  select * into p from public.loyalty_programs where code = 'kahel-loyalty';
  select coalesce(max(sequence), 0) + 1 into next_sequence
  from public.loyalty_rewards where client_id = requested_client_id and program_id = p.id;
  insert into public.loyalty_rewards (client_id, program_id, sequence, threshold, service_id, expires_at)
  values (requested_client_id, p.id, next_sequence, p.threshold, p.reward_service_id, null)
  returning * into result;
  insert into public.loyalty_email_outbox (reward_id, client_id, payload)
  values (result.id, result.client_id, jsonb_build_object('reward_id', result.id, 'sequence', result.sequence));
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'reward.manually_issued', 'reward', result.id, btrim(reason), '{}'::jsonb, to_jsonb(result));
  return result;
end;
$$;

create or replace function public.loyalty_correct_progress(
  requested_client_id uuid, requested_eligible_count integer, reason text
)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  p public.loyalty_programs%rowtype;
  previous_count integer;
  difference integer;
  target_sequence integer;
  seq integer;
  inserted_reward_id uuid;
begin
  if not public.loyalty_is_staff('loyalty') then raise exception 'forbidden' using errcode = '42501'; end if;
  if requested_eligible_count < 0 then raise exception 'eligible count cannot be negative' using errcode = '22023'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  perform 1 from public.clients where id = requested_client_id for update;
  if not found then raise exception 'client not found' using errcode = 'P0002'; end if;
  select * into p from public.loyalty_programs where code = 'kahel-loyalty';
  select coalesce(sum(delta), 0)::integer into previous_count
  from public.loyalty_booking_events where client_id = requested_client_id and program_id = p.id;
  difference := requested_eligible_count - previous_count;
  if difference <> 0 then
    insert into public.loyalty_booking_events
      (booking_id, program_id, client_id, event_key, event_type, delta, reason_code)
    values (null, p.id, requested_client_id, 'adjustment:' || gen_random_uuid(), 'adjustment', difference, 'staff_correction');
  end if;
  if difference < 0 then
    update public.loyalty_rewards set review_required = true,
      review_reason = 'Progress was corrected downward; reward is preserved for staff review.', updated_at = now()
    where client_id = requested_client_id and program_id = p.id and status <> 'cancelled';
  end if;
  target_sequence := requested_eligible_count / p.threshold;
  if target_sequence > 0 then
    for seq in 1..target_sequence loop
      inserted_reward_id := null;
      insert into public.loyalty_rewards (client_id, program_id, sequence, threshold, service_id, expires_at)
      values (requested_client_id, p.id, seq, p.threshold, p.reward_service_id, null)
      on conflict (client_id, program_id, sequence) do nothing returning id into inserted_reward_id;
      if inserted_reward_id is not null then
        insert into public.loyalty_email_outbox (reward_id, client_id, payload)
        values (inserted_reward_id, requested_client_id, jsonb_build_object('reward_id', inserted_reward_id, 'sequence', seq))
        on conflict (reward_id) do nothing;
      end if;
    end loop;
  end if;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'progress.corrected', 'client', requested_client_id, btrim(reason),
    jsonb_build_object('eligible_count', previous_count), jsonb_build_object('eligible_count', requested_eligible_count));
  return requested_eligible_count;
end;
$$;

-- Called only by the trusted server after it authenticates the canonical customer.
-- Booking creation and reward reservation occur in one transaction.
create or replace function public.loyalty_create_reward_booking(
  requested_client_id uuid, requested_profile_id uuid, requested_reward_id uuid,
  requested_idempotency_key text, requested_reference text, requested_date date,
  requested_time time, requested_location text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  reward public.loyalty_rewards%rowtype;
  service_name text;
  result public.bookings%rowtype;
begin
  if length(btrim(coalesce(requested_idempotency_key, ''))) < 8
    or length(btrim(coalesce(requested_reference, ''))) = 0
    or length(btrim(coalesce(requested_location, ''))) = 0
    or requested_date < (now() at time zone 'Asia/Manila')::date then
    raise exception 'invalid reward booking details' using errcode = '22023';
  end if;
  if not exists (select 1 from public.client_profiles where id = requested_profile_id and client_id = requested_client_id and status = 'active') then
    raise exception 'customer profile not found' using errcode = 'P0002';
  end if;
  select * into reward from public.loyalty_rewards
  where id = requested_reward_id and client_id = requested_client_id for update;
  if not found or reward.status <> 'available' or reward.review_required then
    raise exception 'reward is not available' using errcode = '22023';
  end if;
  select name into service_name from public.services where id = reward.service_id and code = 'complimentary-solo-session' and active;
  if service_name is null then raise exception 'reward service is unavailable' using errcode = '22023'; end if;
  insert into public.bookings (
    client_id, client_profile_id, idempotency_key, reference, service_type, service_id,
    service_date, service_time, location, payment_type, subtotal_amount_php,
    total_amount_php, paid_amount_php, status, payment_status, kind, reward_id, request_fingerprint
  ) values (
    requested_client_id, requested_profile_id, btrim(requested_idempotency_key), btrim(requested_reference),
    service_name, reward.service_id, requested_date, requested_time, btrim(requested_location),
    'loyalty_reward', 0, 0, 0, 'inquiry', 'paid', 'reward', reward.id,
    encode(sha256((requested_idempotency_key || requested_reference)::bytea), 'hex')
  ) returning * into result;
  update public.loyalty_rewards set status = 'reserved', reserved_at = now(), updated_at = now()
  where id = reward.id;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (null, 'reward.customer_reserved', 'reward', reward.id, 'Customer created an eligible reward booking.',
    to_jsonb(reward), to_jsonb(reward) || jsonb_build_object('status', 'reserved', 'booking_id', result.id));
  return result;
end;
$$;

create or replace function public.loyalty_claim_email(requested_outbox_id uuid default null)
returns public.loyalty_email_outbox
language plpgsql security definer set search_path = '' as $$
declare result public.loyalty_email_outbox%rowtype;
begin
  select * into result from public.loyalty_email_outbox
  where (requested_outbox_id is null or id = requested_outbox_id)
    and status in ('pending', 'failed') and available_at <= now()
  order by created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.loyalty_email_outbox set status = 'processing', attempts = attempts + 1,
    processing_at = now(), last_error = null, updated_at = now()
  where id = result.id returning * into result;
  return result;
end;
$$;

create or replace function public.loyalty_finish_email(
  requested_outbox_id uuid, succeeded boolean, provider_id text default null, failure text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.loyalty_email_outbox set
    status = case when succeeded then 'sent'::public.loyalty_email_status else 'failed'::public.loyalty_email_status end,
    sent_at = case when succeeded then now() else null end,
    provider_message_id = case when succeeded then provider_id else provider_message_id end,
    last_error = case when succeeded then null else left(coalesce(failure, 'Unknown delivery failure'), 1000) end,
    available_at = case when succeeded then available_at else now() + least(interval '1 hour', interval '1 minute' * power(2, least(attempts, 6))) end,
    processing_at = null, updated_at = now()
  where id = requested_outbox_id and status = 'processing';
end;
$$;

create or replace function public.loyalty_update_booking_state(
  requested_booking_id uuid, requested_status text, requested_attendance public.booking_attendance,
  requested_refunded_amount integer, reason text
)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); previous_row public.bookings%rowtype; result public.bookings%rowtype;
begin
  if not public.loyalty_is_staff('bookings') then raise exception 'forbidden' using errcode = '42501'; end if;
  if requested_status not in ('inquiry', 'quoted', 'confirmed', 'progress', 'completed', 'cancelled')
    or requested_refunded_amount < 0 or length(btrim(coalesce(reason, ''))) = 0 then
    raise exception 'invalid booking state change' using errcode = '22023';
  end if;
  select * into previous_row from public.bookings where id = requested_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if requested_refunded_amount > previous_row.paid_amount_php then raise exception 'refund exceeds paid amount' using errcode = '22023'; end if;
  update public.bookings set status = requested_status, attendance = requested_attendance,
    refunded_amount_php = requested_refunded_amount,
    payment_status = case when requested_refunded_amount = paid_amount_php and paid_amount_php > 0 then 'refunded' else payment_status end
  where id = requested_booking_id returning * into result;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'booking.state_changed', 'booking', result.id, btrim(reason), to_jsonb(previous_row), to_jsonb(result));
  return result;
end;
$$;

create or replace function public.loyalty_configure_program(
  requested_threshold integer, requested_reward_service_id uuid, requested_launch_date date,
  requested_retroactive boolean, requested_expires_after_days integer, requested_active boolean, reason text
)
returns public.loyalty_programs
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); previous_row public.loyalty_programs%rowtype; result public.loyalty_programs%rowtype;
begin
  if not exists (select 1 from public.staff_profiles where user_id = actor and active and role = 'super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if requested_threshold < 1 or requested_expires_after_days is not null and requested_expires_after_days < 1
    or length(btrim(coalesce(reason, ''))) = 0 then raise exception 'invalid loyalty configuration' using errcode = '22023'; end if;
  if not exists (select 1 from public.services where id = requested_reward_service_id and active) then raise exception 'reward service unavailable' using errcode = '22023'; end if;
  select * into previous_row from public.loyalty_programs where code = 'kahel-loyalty' for update;
  update public.loyalty_programs set threshold = requested_threshold,
    reward_service_id = requested_reward_service_id, launch_date = requested_launch_date,
    retroactive = requested_retroactive,
    expires_after = case when requested_expires_after_days is null then null else make_interval(days => requested_expires_after_days) end,
    active = requested_active, updated_at = now()
  where id = previous_row.id returning * into result;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'program.configured', 'loyalty_program', result.id, btrim(reason), to_jsonb(previous_row), to_jsonb(result));
  return result;
end;
$$;

create or replace function public.loyalty_set_eligible_service(
  requested_service_id uuid, requested_eligible boolean, reason text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); selected_program_id uuid; previous_value boolean;
begin
  if not exists (select 1 from public.staff_profiles where user_id = actor and active and role = 'super_admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(reason, ''))) = 0 then raise exception 'reason is required' using errcode = '22023'; end if;
  select id into selected_program_id from public.loyalty_programs where code = 'kahel-loyalty';
  select eligible into previous_value from public.loyalty_program_services where program_id = selected_program_id and service_id = requested_service_id;
  insert into public.loyalty_program_services (program_id, service_id, eligible)
  values (selected_program_id, requested_service_id, requested_eligible)
  on conflict (program_id, service_id) do update set eligible = excluded.eligible;
  insert into public.loyalty_audit_log
    (actor_user_id, action, entity_type, entity_id, reason, previous_data, new_data)
  values (actor, 'program.service_eligibility_changed', 'service', requested_service_id, btrim(reason),
    jsonb_build_object('eligible', previous_value), jsonb_build_object('eligible', requested_eligible));
end;
$$;

-- Rerunnable, read-only historical preview. It deliberately does not reconcile,
-- issue rewards, or enqueue email. Launch-date-only policy remains visible here.
create or replace function public.loyalty_historical_preview(requested_program_id uuid)
returns table (
  client_id uuid, qualifying_bookings bigint, projected_rewards bigint,
  first_qualifying_date date, last_qualifying_date date
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.loyalty_is_staff('loyalty') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select b.client_id, count(*)::bigint,
         (count(*) / p.threshold)::bigint, min((b.completed_at at time zone 'Asia/Manila')::date),
         max((b.completed_at at time zone 'Asia/Manila')::date)
  from public.loyalty_programs p
  join public.bookings b on (b.completed_at at time zone 'Asia/Manila')::date >= p.launch_date
  join public.loyalty_program_services ps
    on ps.program_id = p.id and ps.service_id = b.service_id and ps.eligible
  where p.id = requested_program_id and b.status = 'completed'
    and b.kind = 'standard' and b.duplicate_of is null and b.loyalty_excluded_at is null
    and b.total_amount_php > 0 and b.paid_amount_php > 0
    and b.refunded_amount_php < b.paid_amount_php
  group by b.client_id, p.threshold;
end;
$$;

-- Idempotent operational helper: repeated runs converge because event and reward
-- uniqueness is enforced in the database. dry_run defaults to the safe preview.
create or replace function public.loyalty_reconcile_program(
  requested_program_id uuid, dry_run boolean default true
)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare booking_id uuid; processed bigint := 0;
begin
  if not public.loyalty_is_staff('loyalty') then raise exception 'forbidden' using errcode = '42501'; end if;
  if dry_run then
    select coalesce(sum(qualifying_bookings), 0) into processed
    from public.loyalty_historical_preview(requested_program_id);
    return processed;
  end if;
  for booking_id in
    select b.id from public.bookings b
    join public.loyalty_programs p on p.id = requested_program_id
    where (b.completed_at at time zone 'Asia/Manila')::date >= p.launch_date
    order by b.created_at, b.id
  loop
    perform public.loyalty_reconcile_booking(booking_id); processed := processed + 1;
  end loop;
  return processed;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'staff_profiles', 'services', 'loyalty_programs', 'loyalty_rewards', 'loyalty_email_outbox'
  ] loop
    execute format('create trigger set_customer_updated_at before update on public.%I for each row execute function public.set_customer_updated_at()', table_name);
  end loop;
end;
$$;

alter table public.staff_profiles enable row level security;
alter table public.services enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_program_services enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_booking_eligibility enable row level security;
alter table public.loyalty_booking_events enable row level security;
alter table public.loyalty_email_outbox enable row level security;
alter table public.loyalty_terms_versions enable row level security;
alter table public.loyalty_audit_log enable row level security;

-- Canonical loyalty customer access is read-only, including identity/contact data.
drop policy if exists client_profiles_update_own on public.client_profiles;
revoke update (first_name, last_name, mobile) on public.client_profiles from authenticated;

create policy clients_staff_read on public.clients for select to authenticated using (public.loyalty_is_staff());
create policy client_profiles_staff_read on public.client_profiles for select to authenticated using (public.loyalty_is_staff());
create policy bookings_staff_read on public.bookings for select to authenticated using (public.loyalty_is_staff());
create policy staff_profiles_self_read on public.staff_profiles for select to authenticated using (user_id = auth.uid());
create policy staff_profiles_admin_read on public.staff_profiles for select to authenticated using (public.loyalty_is_staff());
create policy services_authenticated_read on public.services for select to authenticated using (true);
create policy loyalty_programs_authenticated_read on public.loyalty_programs for select to authenticated using (true);
create policy loyalty_program_services_authenticated_read on public.loyalty_program_services for select to authenticated using (true);
create policy loyalty_rewards_customer_read on public.loyalty_rewards for select to authenticated using (public.customer_owns_client(client_id));
create policy loyalty_rewards_staff_read on public.loyalty_rewards for select to authenticated using (public.loyalty_is_staff());
create policy loyalty_eligibility_customer_read on public.loyalty_booking_eligibility for select to authenticated using (public.customer_owns_client(client_id));
create policy loyalty_eligibility_staff_read on public.loyalty_booking_eligibility for select to authenticated using (public.loyalty_is_staff());
create policy loyalty_events_customer_read on public.loyalty_booking_events for select to authenticated using (public.customer_owns_client(client_id));
create policy loyalty_events_staff_read on public.loyalty_booking_events for select to authenticated using (public.loyalty_is_staff());
create policy loyalty_outbox_staff_read on public.loyalty_email_outbox for select to authenticated using (public.loyalty_is_staff('loyalty'));
create policy loyalty_terms_authenticated_read on public.loyalty_terms_versions for select to authenticated using (published_at is not null or public.loyalty_is_staff());
create policy loyalty_audit_staff_read on public.loyalty_audit_log for select to authenticated using (public.loyalty_is_staff());

revoke all on table public.staff_profiles, public.services, public.loyalty_programs,
  public.loyalty_program_services, public.loyalty_rewards, public.loyalty_booking_eligibility,
  public.loyalty_booking_events, public.loyalty_email_outbox, public.loyalty_terms_versions,
  public.loyalty_audit_log from anon, authenticated;
grant select on table public.staff_profiles, public.services, public.loyalty_programs,
  public.loyalty_program_services, public.loyalty_rewards, public.loyalty_booking_eligibility,
  public.loyalty_booking_events, public.loyalty_email_outbox, public.loyalty_terms_versions,
  public.loyalty_audit_log to authenticated;

revoke all on function public.loyalty_is_staff(text), public.prevent_loyalty_ledger_mutation(),
  public.set_booking_completed_at(),
  public.loyalty_reconcile_booking(uuid), public.loyalty_booking_changed(),
  public.loyalty_set_booking_exclusion(uuid, boolean, text),
  public.loyalty_reserve_reward(uuid, uuid, text),
  public.loyalty_transition_reward(uuid, public.loyalty_reward_status, text),
  public.loyalty_issue_manual_reward(uuid, text),
  public.loyalty_correct_progress(uuid, integer, text),
  public.loyalty_create_reward_booking(uuid, uuid, uuid, text, text, date, time, text),
  public.loyalty_claim_email(uuid), public.loyalty_finish_email(uuid, boolean, text, text),
  public.loyalty_update_booking_state(uuid, text, public.booking_attendance, integer, text),
  public.loyalty_configure_program(integer, uuid, date, boolean, integer, boolean, text),
  public.loyalty_set_eligible_service(uuid, boolean, text),
  public.loyalty_historical_preview(uuid), public.loyalty_reconcile_program(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.loyalty_is_staff(text),
  public.loyalty_set_booking_exclusion(uuid, boolean, text),
  public.loyalty_reserve_reward(uuid, uuid, text),
  public.loyalty_transition_reward(uuid, public.loyalty_reward_status, text),
  public.loyalty_issue_manual_reward(uuid, text),
  public.loyalty_correct_progress(uuid, integer, text),
  public.loyalty_update_booking_state(uuid, text, public.booking_attendance, integer, text),
  public.loyalty_configure_program(integer, uuid, date, boolean, integer, boolean, text),
  public.loyalty_set_eligible_service(uuid, boolean, text),
  public.loyalty_historical_preview(uuid), public.loyalty_reconcile_program(uuid, boolean)
  to authenticated;
grant execute on function public.loyalty_reconcile_booking(uuid),
  public.loyalty_historical_preview(uuid), public.loyalty_reconcile_program(uuid, boolean),
  public.loyalty_create_reward_booking(uuid, uuid, uuid, text, text, date, time, text),
  public.loyalty_claim_email(uuid), public.loyalty_finish_email(uuid, boolean, text, text)
  to service_role;

comment on column public.bookings.attendance is 'No-show is attendance metadata, not a second booking lifecycle.';
comment on column public.loyalty_programs.retroactive is 'False means launch-date-only history; changing this requires policy/legal approval.';
comment on function public.loyalty_historical_preview(uuid) is 'Read-only, rerunnable preview; never writes ledger, rewards, or email outbox rows.';
