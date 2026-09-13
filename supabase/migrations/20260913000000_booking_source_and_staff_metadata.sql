-- Unified booking system: source tracking and staff metadata
-- Adds booking_source, created_by_user_id, and internal_notes to the bookings table.
-- Backfills existing records using PayMongo presence as a heuristic.

alter table public.bookings
  add column if not exists booking_source text not null default 'staff'
    check (booking_source in ('website', 'staff', 'walk_in', 'phone', 'messenger', 'instagram')),
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists internal_notes text
    check (internal_notes is null or length(btrim(internal_notes)) > 0);

-- Backfill: bookings that went through PayMongo checkout came from the public website
update public.bookings
  set booking_source = 'website'
  where paymongo_checkout_session_id is not null
    and booking_source = 'staff';

create index if not exists bookings_source_date_idx
  on public.bookings(booking_source, service_date desc);

create index if not exists bookings_created_by_idx
  on public.bookings(created_by_user_id)
  where created_by_user_id is not null;

comment on column public.bookings.booking_source is
  'Origin of this booking: website (self-service), staff (dashboard), walk_in, phone, messenger, or instagram.';
comment on column public.bookings.created_by_user_id is
  'Staff user who created this booking. NULL for website/self-service bookings.';
comment on column public.bookings.internal_notes is
  'Staff-only notes not visible to the customer.';
