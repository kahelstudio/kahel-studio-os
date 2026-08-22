-- Promo codes table for staff-managed discounts
create type public.promo_code_type as enum ('percentage', 'fixed_amount', 'free_addon');
create type public.promo_code_status as enum ('active', 'inactive', 'expired', 'exhausted');

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(btrim(code)) between 3 and 32),
  label text not null check (length(btrim(label)) between 1 and 100),
  description text check (description is null or length(btrim(description)) between 1 and 500),
  type public.promo_code_type not null,
  value numeric not null check (value > 0),
  currency text default 'PHP',
  status public.promo_code_status not null default 'active',
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  max_uses_per_customer integer check (max_uses_per_customer is null or max_uses_per_customer > 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  applicable_services uuid[] default '{}',
  excluded_services uuid[] default '{}',
  minimum_booking_amount integer check (minimum_booking_amount is null or minimum_booking_amount >= 0),
  maximum_discount_amount integer check (maximum_discount_amount is null or maximum_discount_amount > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promo_codes_code_idx on public.promo_codes(code);
create index promo_codes_status_valid_idx on public.promo_codes(status, valid_from, valid_until) where status = 'active';
create index promo_codes_created_by_idx on public.promo_codes(created_by, created_at desc);

-- Promo code usage tracking
create table public.promo_code_usages (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  discount_amount integer not null check (discount_amount >= 0),
  used_at timestamptz not null default now(),
  unique (promo_code_id, booking_id)
);

create index promo_code_usages_promo_code_idx on public.promo_code_usages(promo_code_id, used_at desc);
create index promo_code_usages_client_idx on public.promo_code_usages(client_id, used_at desc);
create index promo_code_usages_booking_idx on public.promo_code_usages(booking_id);

-- Append-only trigger
create or replace function public.prevent_promo_code_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'promo code records are append-only' using errcode = '55000';
  end if;
  if old.status in ('expired', 'exhausted') and new.status is distinct from old.status then
    raise exception 'promo code terminal state is immutable' using errcode = '55000';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger prevent_promo_code_mutation
before update or delete on public.promo_codes
for each row execute function public.prevent_promo_code_mutation();

create or replace function public.prevent_promo_usage_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'promo code usage records are append-only' using errcode = '55000';
end;
$$;

create trigger prevent_promo_usage_mutation
before update or delete on public.promo_code_usages
for each row execute function public.prevent_promo_usage_mutation();

-- RLS
alter table public.promo_codes enable row level security;
alter table public.promo_code_usages enable row level security;

create policy promo_codes_customer_read on public.promo_codes for select to authenticated using (
  status = 'active' and valid_from <= now() and (valid_until is null or valid_until >= now())
);
create policy promo_codes_staff_read on public.promo_codes for select to authenticated using (
  public.booking_terms_is_staff()
);
create policy promo_code_usages_customer_read on public.promo_code_usages for select to authenticated using (
  public.customer_owns_client(client_id)
);
create policy promo_code_usages_staff_read on public.promo_code_usages for select to authenticated using (
  public.booking_terms_is_staff()
);

revoke all on table public.promo_codes, public.promo_code_usages from anon, authenticated, service_role;
grant select on table public.promo_codes, public.promo_code_usages to authenticated, service_role;
grant insert, update on table public.promo_codes to service_role;
grant insert on table public.promo_code_usages to service_role;

-- RPCs for staff management
create or replace function public.promo_code_create(
  requested_code text,
  requested_label text,
  requested_description text,
  requested_type public.promo_code_type,
  requested_value numeric,
  requested_actor_user_id uuid,
  requested_currency text default 'PHP',
  requested_usage_limit integer default null,
  requested_max_uses_per_customer integer default null,
  requested_valid_until timestamptz default null,
  requested_applicable_services uuid[] default '{}',
  requested_excluded_services uuid[] default '{}',
  requested_minimum_booking_amount integer default null,
  requested_maximum_discount_amount integer default null
)
returns public.promo_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  result public.promo_codes%rowtype;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if length(btrim(coalesce(requested_code, ''))) < 3 then raise exception 'code must be at least 3 characters' using errcode = '22023'; end if;
  if length(btrim(coalesce(requested_label, ''))) = 0 then raise exception 'label is required' using errcode = '22023'; end if;
  if requested_value <= 0 then raise exception 'value must be positive' using errcode = '22023'; end if;
  if requested_usage_limit is not null and requested_usage_limit <= 0 then raise exception 'usage_limit must be positive' using errcode = '22023'; end if;
  if requested_max_uses_per_customer is not null and requested_max_uses_per_customer <= 0 then raise exception 'max_uses_per_customer must be positive' using errcode = '22023'; end if;

  insert into public.promo_codes (
    code, label, description, type, value, currency, usage_limit, max_uses_per_customer,
    valid_until, applicable_services, excluded_services, minimum_booking_amount, maximum_discount_amount,
    created_by
  ) values (
    upper(btrim(requested_code)), btrim(requested_label), nullif(btrim(requested_description), ''),
    requested_type, requested_value, requested_currency, requested_usage_limit, requested_max_uses_per_customer,
    requested_valid_until, requested_applicable_services, requested_excluded_services,
    requested_minimum_booking_amount, requested_maximum_discount_amount, requested_actor_user_id
  ) returning * into result;

  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Created promo code', 'promo_codes',
    'promo_code', result.id, jsonb_build_object('code', result.code, 'label', result.label, 'type', result.type, 'value', result.value));
  return result;
end;
$$;

create or replace function public.promo_code_update(
  requested_id uuid,
  requested_label text,
  requested_description text,
  requested_type public.promo_code_type,
  requested_value numeric,
  requested_currency text,
  requested_usage_limit integer,
  requested_max_uses_per_customer integer,
  requested_valid_until timestamptz,
  requested_applicable_services uuid[],
  requested_excluded_services uuid[],
  requested_minimum_booking_amount integer,
  requested_maximum_discount_amount integer,
  requested_status public.promo_code_status,
  requested_actor_user_id uuid
)
returns public.promo_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  previous_row public.promo_codes%rowtype;
  result public.promo_codes%rowtype;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;

  select * into previous_row from public.promo_codes where id = requested_id for update;
  if not found then raise exception 'promo code not found' using errcode = 'P0002'; end if;
  if previous_row.status in ('expired', 'exhausted') then raise exception 'cannot update exhausted or expired promo code' using errcode = '55000'; end if;

  update public.promo_codes set
    label = btrim(requested_label),
    description = nullif(btrim(requested_description), ''),
    type = requested_type,
    value = requested_value,
    currency = requested_currency,
    usage_limit = requested_usage_limit,
    max_uses_per_customer = requested_max_uses_per_customer,
    valid_until = requested_valid_until,
    applicable_services = requested_applicable_services,
    excluded_services = requested_excluded_services,
    minimum_booking_amount = requested_minimum_booking_amount,
    maximum_discount_amount = requested_maximum_discount_amount,
    status = requested_status
  where id = requested_id returning * into result;

  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Updated promo code', 'promo_codes',
    'promo_code', result.id, jsonb_build_object('changes', jsonb_build_object(
      'label', previous_row.label, 'new_label', result.label,
      'value', previous_row.value, 'new_value', result.value,
      'status', previous_row.status, 'new_status', result.status
    )));
  return result;
end;
$$;

create or replace function public.promo_code_retire(
  requested_id uuid,
  requested_actor_user_id uuid
)
returns public.promo_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  result public.promo_codes%rowtype;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;

  update public.promo_codes set status = 'expired' where id = requested_id and status not in ('expired', 'exhausted') returning * into result;
  if not found then raise exception 'promo code not found or already retired' using errcode = 'P0002'; end if;

  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Retired promo code', 'promo_codes',
    'promo_code', result.id, jsonb_build_object('code', result.code));
  return result;
end;
$$;

-- Validation function for checkout
create or replace function public.validate_promo_code(
  requested_code text,
  requested_client_id uuid,
  requested_booking_amount integer,
  requested_service_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo public.promo_codes%rowtype;
  client_usage integer;
  discount_amount integer;
begin
  select * into promo from public.promo_codes
  where upper(code) = upper(btrim(requested_code)) and status = 'active'
    and valid_from <= now() and (valid_until is null or valid_until >= now());
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Invalid or expired promo code');
  end if;

  if promo.usage_limit is not null and promo.usage_count >= promo.usage_limit then
    update public.promo_codes set status = 'exhausted' where id = promo.id;
    return jsonb_build_object('valid', false, 'error', 'Promo code usage limit reached');
  end if;

  if promo.minimum_booking_amount is not null and requested_booking_amount < promo.minimum_booking_amount then
    return jsonb_build_object('valid', false, 'error', 'Booking amount does not meet minimum for this promo code');
  end if;

  if promo.applicable_services is not null and array_length(promo.applicable_services, 1) > 0 and requested_service_id is not null then
    if not (requested_service_id = any(promo.applicable_services)) then
      return jsonb_build_object('valid', false, 'error', 'Promo code not applicable to this service');
    end if;
  end if;

  if promo.excluded_services is not null and array_length(promo.excluded_services, 1) > 0 and requested_service_id is not null then
    if requested_service_id = any(promo.excluded_services) then
      return jsonb_build_object('valid', false, 'error', 'Promo code not applicable to this service');
    end if;
  end if;

  select count(*) into client_usage from public.promo_code_usages
  where promo_code_id = promo.id and client_id = requested_client_id;
  if promo.max_uses_per_customer is not null and client_usage >= promo.max_uses_per_customer then
    return jsonb_build_object('valid', false, 'error', 'You have already used this promo code the maximum number of times');
  end if;

  if promo.type = 'percentage' then
    discount_amount := greatest(0, least(
      round(requested_booking_amount * promo.value / 100),
      coalesce(promo.maximum_discount_amount, requested_booking_amount)
    ));
  elsif promo.type = 'fixed_amount' then
    discount_amount := greatest(0, least(promo.value, requested_booking_amount));
  else
    discount_amount := 0;
  end if;

  return jsonb_build_object(
    'valid', true,
    'promo_code_id', promo.id,
    'code', promo.code,
    'label', promo.label,
    'type', promo.type,
    'value', promo.value,
    'currency', promo.currency,
    'discount_amount', discount_amount
  );
end;
$$;

grant execute on function public.promo_code_create(text,text,text,public.promo_code_type,numeric,uuid,text,integer,integer,timestamptz,uuid[],uuid[],integer,integer) to service_role;
grant execute on function public.promo_code_update(uuid,text,text,public.promo_code_type,numeric,text,integer,integer,timestamptz,uuid[],uuid[],integer,integer,public.promo_code_status,uuid) to service_role;
grant execute on function public.promo_code_retire(uuid,uuid) to service_role;
grant execute on function public.validate_promo_code(text,uuid,integer,uuid) to service_role;
grant execute on function public.validate_promo_code(text,uuid,integer,uuid) to authenticated;