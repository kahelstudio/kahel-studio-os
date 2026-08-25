-- booking_id must be nullable for adjustment event_type rows,
-- which the check constraint and loyalty_correct_progress function both require.
alter table public.loyalty_booking_events
  alter column booking_id drop not null;
