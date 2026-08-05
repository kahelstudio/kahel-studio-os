-- Customer ownership is rooted in client_profiles.user_id. Customer-facing access
-- is read-only except for the explicitly granted profile fields and new messages.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (length(btrim(email)) between 3 and 320 and position('@' in email) > 1),
  normalized_email text generated always as (lower(btrim(email))) stored,
  first_name text not null check (length(btrim(first_name)) between 1 and 100),
  last_name text not null check (length(btrim(last_name)) between 1 and 100),
  mobile text check (mobile is null or length(btrim(mobile)) between 7 and 32),
  status text not null default 'active' check (status in ('invited', 'active', 'disabled')),
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_normalized_email_key unique (normalized_email),
  constraint client_profiles_id_client_id_key unique (id, client_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  client_profile_id uuid not null,
  idempotency_key text not null check (length(btrim(idempotency_key)) between 8 and 200),
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  reference text not null check (length(btrim(reference)) between 1 and 64),
  service_type text not null check (length(btrim(service_type)) between 1 and 120),
  service_date date not null,
  service_time time not null,
  location text not null check (length(btrim(location)) between 1 and 500),
  payment_type text not null check (length(btrim(payment_type)) between 1 and 50),
  currency text not null default 'PHP' check (currency = 'PHP'),
  subtotal_amount_php integer not null check (subtotal_amount_php >= 0),
  total_amount_php integer not null check (total_amount_php >= 0),
  paid_amount_php integer not null default 0 check (paid_amount_php >= 0 and paid_amount_php <= total_amount_php),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'partially_paid', 'failed', 'refunded')),
  paymongo_checkout_session_id text,
  paymongo_checkout_url text,
  paymongo_payment_intent_id text,
  paymongo_checkout_expires_at timestamptz,
  checkout_creation_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint bookings_idempotency_key_key unique (idempotency_key),
  constraint bookings_reference_key unique (reference),
  constraint bookings_id_client_id_key unique (id, client_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  booking_id uuid,
  reference text not null check (length(btrim(reference)) between 1 and 64),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text,
  status text not null default 'planned' check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
  starts_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint projects_reference_key unique (reference),
  constraint projects_id_client_id_key unique (id, client_id),
  constraint projects_completion_check check (completed_at is null or status in ('completed', 'archived'))
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid,
  reference text not null check (length(btrim(reference)) between 1 and 64),
  currency text not null default 'PHP' check (currency = 'PHP'),
  subtotal_amount_php integer not null check (subtotal_amount_php >= 0),
  tax_amount_php integer not null default 0 check (tax_amount_php >= 0),
  total_amount_php integer not null check (total_amount_php >= 0),
  paid_amount_php integer not null default 0 check (paid_amount_php >= 0 and paid_amount_php <= total_amount_php),
  status text not null default 'draft' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'void', 'overdue')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint invoices_reference_key unique (reference),
  constraint invoices_amounts_check check (total_amount_php = subtotal_amount_php + tax_amount_php),
  constraint invoices_dates_check check (due_at is null or issued_at is null or due_at >= issued_at)
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galleries_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint galleries_client_slug_key unique (client_id, slug),
  constraint galleries_publish_check check ((not published and published_at is null) or (published and published_at is not null))
);

create table if not exists public.gallery_assets (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null check (length(btrim(storage_path)) between 1 and 1024),
  asset_type text not null check (asset_type in ('image', 'video', 'document')),
  title text,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_assets_gallery_storage_key unique (gallery_id, storage_path)
);

create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  sender_profile_id uuid,
  project_id uuid,
  sender text not null,
  body text not null check (length(btrim(body)) between 1 and 10000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_messages_sender_client_fkey foreign key (sender_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint customer_messages_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint customer_messages_sender_check check (
    sender in ('customer', 'staff', 'system') and
    ((sender = 'customer' and sender_profile_id is not null) or sender <> 'customer')
  )
);

create table if not exists public.customer_audit_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  client_profile_id uuid,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_type text not null check (actor_type in ('customer', 'staff', 'service', 'system')),
  action text not null check (length(btrim(action)) between 1 and 120),
  entity_type text not null check (length(btrim(entity_type)) between 1 and 120),
  entity_id uuid,
  request_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint customer_audit_log_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict
);

create table if not exists public.customer_identity_resolution_cases (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  normalized_email text not null check (normalized_email = lower(btrim(normalized_email))),
  candidate_profile_ids uuid[] not null default '{}',
  reason text not null check (length(btrim(reason)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution jsonb check (resolution is null or jsonb_typeof(resolution) = 'object'),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_identity_resolution_state_check check (
    (status = 'open' and resolved_at is null and resolved_by is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null and resolved_by is not null)
  )
);

create table if not exists public.customer_auth_rate_limits (
  scope text not null check (length(btrim(scope)) between 1 and 100),
  key_hash text not null check (length(key_hash) between 32 and 128),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash),
  constraint customer_auth_rate_limits_window_check check (expires_at > window_started_at)
);

create table if not exists public.customer_password_setup_sessions (
  token_hash text primary key check (length(token_hash) = 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index if not exists client_profiles_user_id_idx on public.client_profiles(user_id) where user_id is not null;
create unique index if not exists client_profiles_user_id_key on public.client_profiles(user_id) where user_id is not null;
create index if not exists client_profiles_client_id_idx on public.client_profiles(client_id);
create index if not exists bookings_client_id_created_at_idx on public.bookings(client_id, created_at desc);
create index if not exists bookings_profile_id_idx on public.bookings(client_profile_id);
create unique index if not exists bookings_paymongo_checkout_session_key
  on public.bookings(paymongo_checkout_session_id) where paymongo_checkout_session_id is not null;
create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists projects_booking_id_idx on public.projects(booking_id) where booking_id is not null;
create index if not exists invoices_client_id_created_at_idx on public.invoices(client_id, created_at desc);
create index if not exists invoices_project_id_idx on public.invoices(project_id) where project_id is not null;
create index if not exists galleries_client_published_idx on public.galleries(client_id, published) where published;
create index if not exists galleries_project_id_idx on public.galleries(project_id);
create index if not exists gallery_assets_gallery_sort_idx on public.gallery_assets(gallery_id, sort_order, created_at);
create index if not exists customer_messages_client_created_at_idx on public.customer_messages(client_id, created_at desc);
create index if not exists customer_messages_project_id_idx on public.customer_messages(project_id) where project_id is not null;
create index if not exists customer_audit_log_client_created_at_idx on public.customer_audit_log(client_id, created_at desc);
create index if not exists customer_audit_log_entity_idx on public.customer_audit_log(entity_type, entity_id) where entity_id is not null;
create index if not exists customer_identity_resolution_open_idx
  on public.customer_identity_resolution_cases(normalized_email, created_at) where status = 'open';
create index if not exists customer_auth_rate_limits_expires_at_idx on public.customer_auth_rate_limits(expires_at);

create or replace function public.set_customer_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients', 'client_profiles', 'bookings', 'projects', 'invoices',
    'galleries', 'gallery_assets', 'customer_identity_resolution_cases'
  ] loop
    execute format('drop trigger if exists set_customer_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_customer_updated_at before update on public.%I for each row execute function public.set_customer_updated_at()',
      table_name
    );
  end loop;
end;
$$;

-- SECURITY DEFINER is limited to a caller-specific boolean and cannot reveal profiles.
create or replace function public.customer_owns_client(requested_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.client_profiles as profile
    where profile.client_id = requested_client_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  );
$$;

-- This function performs one atomic increment/reset. key_hash must be produced by
-- the trusted caller so raw email addresses, IP addresses, and tokens are not stored.
create or replace function public.consume_customer_auth_rate_limit(
  requested_scope text,
  requested_key_hash text,
  maximum_attempts integer,
  window_duration interval
)
returns table (allowed boolean, attempts integer, retry_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time timestamptz := clock_timestamp();
begin
  if length(btrim(requested_scope)) not between 1 and 100
     or length(requested_key_hash) not between 32 and 128
     or maximum_attempts < 1
     or window_duration <= interval '0 seconds'
     or window_duration > interval '1 day' then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  return query
  insert into public.customer_auth_rate_limits as limits (
    scope, key_hash, window_started_at, attempts, expires_at, updated_at
  ) values (
    btrim(requested_scope), requested_key_hash, request_time, 1,
    request_time + window_duration, request_time
  )
  on conflict (scope, key_hash) do update
  set window_started_at = case
        when limits.expires_at <= request_time then request_time
        else limits.window_started_at
      end,
      attempts = case
        when limits.expires_at <= request_time then 1
        else limits.attempts + 1
      end,
      expires_at = case
        when limits.expires_at <= request_time then request_time + window_duration
        else limits.expires_at
      end,
      updated_at = request_time
  returning limits.attempts <= maximum_attempts,
            limits.attempts,
            limits.expires_at;
end;
$$;

-- Serializes provider checkout creation for an idempotent booking. A stale claim
-- can be recovered after five minutes if a Worker terminates mid-request.
create or replace function public.claim_booking_checkout(requested_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  update public.bookings
  set checkout_creation_started_at = clock_timestamp()
  where id = requested_booking_id
    and paymongo_checkout_url is null
    and (checkout_creation_started_at is null or checkout_creation_started_at < clock_timestamp() - interval '5 minutes')
  returning id into claimed_id;
  return claimed_id is not null;
end;
$$;

create or replace function public.consume_customer_password_setup(
  requested_token_hash text,
  requested_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_hash text;
begin
  update public.customer_password_setup_sessions
  set used_at = clock_timestamp()
  where token_hash = requested_token_hash
    and user_id = requested_user_id
    and used_at is null
    and expires_at > clock_timestamp()
  returning token_hash into consumed_hash;
  return consumed_hash is not null;
end;
$$;

create or replace function public.prevent_customer_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'customer audit records are append-only' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_customer_audit_update_or_delete on public.customer_audit_log;
create trigger prevent_customer_audit_update_or_delete
before update or delete on public.customer_audit_log
for each row execute function public.prevent_customer_audit_mutation();

alter table public.clients enable row level security;
alter table public.client_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_assets enable row level security;
alter table public.customer_messages enable row level security;
alter table public.customer_audit_log enable row level security;
alter table public.customer_identity_resolution_cases enable row level security;
alter table public.customer_auth_rate_limits enable row level security;
alter table public.customer_password_setup_sessions enable row level security;

drop policy if exists clients_select_own on public.clients;
create policy clients_select_own on public.clients
for select to authenticated
using (public.customer_owns_client(id));

drop policy if exists client_profiles_select_own on public.client_profiles;
create policy client_profiles_select_own on public.client_profiles
for select to authenticated
using (user_id = auth.uid() and status = 'active');

drop policy if exists client_profiles_update_own on public.client_profiles;
create policy client_profiles_update_own on public.client_profiles
for update to authenticated
using (user_id = auth.uid() and status = 'active' and public.customer_owns_client(client_id))
with check (user_id = auth.uid() and status = 'active' and public.customer_owns_client(client_id));

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
for select to authenticated
using (public.customer_owns_client(client_id));

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
for select to authenticated
using (public.customer_owns_client(client_id));

drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
for select to authenticated
using (public.customer_owns_client(client_id));

drop policy if exists galleries_select_own_published on public.galleries;
create policy galleries_select_own_published on public.galleries
for select to authenticated
using (published and public.customer_owns_client(client_id));

drop policy if exists gallery_assets_select_through_published_gallery on public.gallery_assets;
create policy gallery_assets_select_through_published_gallery on public.gallery_assets
for select to authenticated
using (exists (
  select 1
  from public.galleries as gallery
  where gallery.id = gallery_assets.gallery_id
    and gallery.published
    and public.customer_owns_client(gallery.client_id)
));

drop policy if exists customer_messages_select_own on public.customer_messages;
create policy customer_messages_select_own on public.customer_messages
for select to authenticated
using (public.customer_owns_client(client_id));

drop policy if exists customer_messages_insert_own on public.customer_messages;
create policy customer_messages_insert_own on public.customer_messages
for insert to authenticated
with check (
  sender = 'customer'
  and public.customer_owns_client(client_id)
  and exists (
    select 1
    from public.client_profiles as profile
    where profile.id = sender_profile_id
      and profile.client_id = customer_messages.client_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  )
);

-- Supabase may grant broad table/function privileges by default. RLS is backed by
-- explicit grants so customers cannot mutate ownership, money, status, publishing,
-- invoices, audit data, identity cases, or rate-limit state.
revoke all on table public.clients from anon, authenticated;
revoke all on table public.client_profiles from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.invoices from anon, authenticated;
revoke all on table public.galleries from anon, authenticated;
revoke all on table public.gallery_assets from anon, authenticated;
revoke all on table public.customer_messages from anon, authenticated;
revoke all on table public.customer_audit_log from anon, authenticated;
revoke all on table public.customer_identity_resolution_cases from anon, authenticated;
revoke all on table public.customer_auth_rate_limits from anon, authenticated;
revoke all on table public.customer_password_setup_sessions from anon, authenticated;

grant select on table public.clients to authenticated;
grant select on table public.client_profiles to authenticated;
grant update (first_name, last_name, mobile) on table public.client_profiles to authenticated;
grant select on table public.bookings to authenticated;
grant select on table public.projects to authenticated;
grant select on table public.invoices to authenticated;
grant select on table public.galleries to authenticated;
grant select on table public.gallery_assets to authenticated;
grant select on table public.customer_messages to authenticated;
grant insert (client_id, sender_profile_id, project_id, sender, body) on table public.customer_messages to authenticated;

revoke all on function public.set_customer_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_customer_audit_mutation() from public, anon, authenticated;
revoke all on function public.customer_owns_client(uuid) from public, anon, authenticated;
grant execute on function public.customer_owns_client(uuid) to authenticated;
revoke all on function public.consume_customer_auth_rate_limit(text, text, integer, interval) from public, anon, authenticated;
grant execute on function public.consume_customer_auth_rate_limit(text, text, integer, interval) to service_role;
revoke all on function public.claim_booking_checkout(uuid) from public, anon, authenticated;
grant execute on function public.claim_booking_checkout(uuid) to service_role;
revoke all on function public.consume_customer_password_setup(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_customer_password_setup(text, uuid) to service_role;

comment on function public.customer_owns_client(uuid) is
  'RLS ownership predicate bound to auth.uid(); exposes no profile data.';
comment on function public.consume_customer_auth_rate_limit(text, text, integer, interval) is
  'Trusted service-only atomic fixed-window rate limiter. Never pass raw customer identifiers as key_hash.';
comment on table public.customer_audit_log is
  'Internal append-only security audit log. No anon or authenticated policy or grant is provided.';
comment on table public.customer_identity_resolution_cases is
  'Internal administrative queue for ambiguous or conflicting customer identity matches.';
comment on table public.customer_auth_rate_limits is
  'Internal hashed-key authentication abuse controls, accessible only through trusted service operations.';
