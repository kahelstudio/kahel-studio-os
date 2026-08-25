-- ============================================================
-- Waitlist entries — manual admin flow, no automatic matching.
-- ⚠️  REVIEW BEFORE APPLYING. Do not run without sign-off.
-- ============================================================

create type public.waitlist_time_of_day as enum ('morning', 'afternoon', 'evening', 'any');
create type public.waitlist_status      as enum ('waiting', 'notified', 'converted', 'expired', 'cancelled');

create table public.waitlist_entries (
  id                   uuid           primary key default gen_random_uuid(),
  created_at           timestamptz    not null default now(),
  name                 text           not null check (length(btrim(name)) between 2 and 200),
  email                text           not null check (email ~* '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'),
  phone                text           check (phone is null or length(btrim(phone)) between 7 and 30),
  service_id           uuid           references public.services(id) on delete set null,
  preferred_start      date           not null,
  preferred_end        date           not null,
  time_of_day          public.waitlist_time_of_day not null default 'any',
  notes                text           check (notes is null or length(btrim(notes)) <= 1000),
  status               public.waitlist_status not null default 'waiting',
  notified_at          timestamptz,
  converted_booking_id uuid           references public.bookings(id) on delete set null,
  source               text           not null default 'booking_page' check (length(source) <= 100),
  constraint waitlist_entries_date_order check (preferred_end >= preferred_start)
);

-- RLS — enable immediately so no row is accessible without a policy.
alter table public.waitlist_entries enable row level security;

-- Authenticated admins can read all entries (for dashboard view).
-- Policy intent: only staff with admin or super_admin role set in app_metadata.
create policy "waitlist_admin_select"
  on public.waitlist_entries
  for select
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'super_admin')
  );

-- Authenticated admins can update status, notified_at, converted_booking_id.
-- No policy allows changing name/email/created_at after insert.
create policy "waitlist_admin_update"
  on public.waitlist_entries
  for update
  to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'super_admin')
  )
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'super_admin')
  );

-- NO anon insert policy.
-- Public inserts must go through POST /api/waitlist, which uses the service_role
-- key server-side. The service_role bypasses RLS, so the validated endpoint is the
-- only authorised write path. Direct anon inserts are rejected.

-- Dashboard query indexes.
create index waitlist_entries_status_idx     on public.waitlist_entries (status);
create index waitlist_entries_email_idx      on public.waitlist_entries (lower(email));
create index waitlist_entries_created_at_idx on public.waitlist_entries (created_at desc);
create index waitlist_entries_preferred_idx  on public.waitlist_entries (preferred_start, preferred_end);
