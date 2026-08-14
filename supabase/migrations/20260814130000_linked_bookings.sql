-- linked_booking_id links two bookings that form a pre-event package
-- (e.g. a studio shoot for invitations linked to the actual event booking).
-- The relationship is bidirectional: each booking stores the other's id.

ALTER TABLE bookings
  ADD COLUMN linked_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_linked_no_self CHECK (linked_booking_id <> id);
