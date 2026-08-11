alter table public.bookings
  add column if not exists deposit_verification_id text;
