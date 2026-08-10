-- Fictional, deterministic sample data for local development and staging only.
-- Production deployments never run this file. Reserved example.com addresses and
-- DEMO-prefixed references make these rows easy to identify and safe to rerun.

begin;

insert into public.clients (id, name, status, external_ref, account_type, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'Maya and Luis Santos', 'active', 'DEMO-CLIENT-001', 'consumer', now() - interval '14 months'),
  ('d0000000-0000-4000-8000-000000000002', 'Northstar Coffee Roasters', 'active', 'DEMO-CLIENT-002', 'corporate', now() - interval '9 months'),
  ('d0000000-0000-4000-8000-000000000003', 'Arielle Mendoza', 'active', 'DEMO-CLIENT-003', 'consumer', now() - interval '5 months'),
  ('d0000000-0000-4000-8000-000000000004', 'Harbor & Pine Events', 'inactive', 'DEMO-CLIENT-004', 'corporate', now() - interval '11 months')
on conflict (id) do update set
  name = excluded.name, status = excluded.status, external_ref = excluded.external_ref,
  account_type = excluded.account_type, updated_at = now();

insert into public.client_profiles (id, client_id, email, first_name, last_name, mobile, status, email_verified_at, created_at) values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'maya.santos@example.com', 'Maya', 'Santos', '+63 917 000 0101', 'active', now() - interval '14 months', now() - interval '14 months'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'luis.santos@example.com', 'Luis', 'Santos', '+63 917 000 0102', 'active', now() - interval '12 months', now() - interval '12 months'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'hello@northstar.example.com', 'Nico', 'Reyes', '+63 917 000 0201', 'active', now() - interval '9 months', now() - interval '9 months'),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'arielle.mendoza@example.com', 'Arielle', 'Mendoza', '+63 917 000 0301', 'active', now() - interval '5 months', now() - interval '5 months')
on conflict (id) do update set
  email = excluded.email, first_name = excluded.first_name, last_name = excluded.last_name,
  mobile = excluded.mobile, status = excluded.status, updated_at = now();

update public.clients set primary_contact_profile_id = case id
  when 'd0000000-0000-4000-8000-000000000001' then 'd1000000-0000-4000-8000-000000000001'::uuid
  when 'd0000000-0000-4000-8000-000000000002' then 'd1000000-0000-4000-8000-000000000003'::uuid
  when 'd0000000-0000-4000-8000-000000000003' then 'd1000000-0000-4000-8000-000000000004'::uuid
end
where id in (
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003'
);

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
  service_type, service_id, service_date, service_time, location, payment_type,
  subtotal_amount_php, total_amount_php, paid_amount_php, status, payment_status,
  completed_at, attendance, created_at
) values
  ('d2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'demo-booking-001', repeat('1', 64), 'DEMO-BKG-001', 'Solo', (select id from public.services where code = 'solo-session'), current_date, '09:00', 'Kahel Studio, Quezon City', 'deposit', 650000, 650000, 325000, 'confirmed', 'partially_paid', null, 'expected', now() - interval '12 days'),
  ('d2000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'demo-booking-002', repeat('2', 64), 'DEMO-BKG-002', 'Group', (select id from public.services where code = 'group-session'), current_date, '14:30', 'Northstar Flagship, Makati', 'full', 1800000, 1800000, 1800000, 'confirmed', 'paid', null, 'expected', now() - interval '20 days'),
  ('d2000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000004', 'demo-booking-003', repeat('3', 64), 'DEMO-BKG-003', 'Theme', (select id from public.services where code = 'theme-session'), current_date + 5, '11:00', 'Kahel Studio, Quezon City', 'deposit', 950000, 950000, 475000, 'quoted', 'partially_paid', null, 'expected', now() - interval '3 days'),
  ('d2000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'demo-booking-004', repeat('4', 64), 'DEMO-BKG-004', 'Anniversary Celebration', (select id from public.services where code = 'anniversary-celebration'), current_date - 16, '16:00', 'The Glass Garden, Pasig', 'full', 2850000, 2850000, 2850000, 'completed', 'paid', (current_date - 16)::timestamp + time '19:00', 'attended', now() - interval '40 days'),
  ('d2000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'demo-booking-005', repeat('5', 64), 'DEMO-BKG-005', 'Express', (select id from public.services where code = 'express-session'), current_date - 2, '10:00', 'Kahel Studio, Quezon City', 'full', 450000, 450000, 0, 'progress', 'unpaid', null, 'expected', now() - interval '8 days'),
  ('d2000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000004', 'demo-booking-006', repeat('6', 64), 'DEMO-BKG-006', 'Birthday', (select id from public.services where code = 'birthday'), current_date + 21, '15:00', 'Blue Leaf Cosmopolitan, Quezon City', 'deposit', 2200000, 2200000, 0, 'inquiry', 'unpaid', null, 'expected', now() - interval '1 day')
on conflict (id) do update set
  service_date = excluded.service_date, service_time = excluded.service_time, location = excluded.location,
  subtotal_amount_php = excluded.subtotal_amount_php, total_amount_php = excluded.total_amount_php,
  paid_amount_php = excluded.paid_amount_php, status = excluded.status,
  payment_status = excluded.payment_status, completed_at = excluded.completed_at,
  attendance = excluded.attendance, updated_at = now();

insert into public.projects (id, client_id, booking_id, reference, title, description, status, starts_at, completed_at, created_at) values
  ('d3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'DEMO-PRJ-001', 'Santos family portraits', 'Warm studio portraits with two wardrobe sets.', 'active', current_date::timestamp + time '09:00', null, now() - interval '12 days'),
  ('d3000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'DEMO-PRJ-002', 'Northstar seasonal campaign', 'Product and team imagery for the rainy-season menu.', 'active', current_date::timestamp + time '14:30', null, now() - interval '20 days'),
  ('d3000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000004', 'DEMO-PRJ-003', 'Santos anniversary story', 'Event coverage and a 30-page keepsake album.', 'completed', (current_date - 16)::timestamp + time '16:00', (current_date - 10)::timestamp, now() - interval '40 days'),
  ('d3000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'DEMO-PRJ-004', 'Arielle editorial portraits', 'Concept development and mood-board review.', 'planned', (current_date + 5)::timestamp + time '11:00', null, now() - interval '3 days')
on conflict (id) do update set
  title = excluded.title, description = excluded.description, status = excluded.status,
  starts_at = excluded.starts_at, completed_at = excluded.completed_at, updated_at = now();

insert into public.invoices (id, client_id, project_id, reference, subtotal_amount_php, tax_amount_php, total_amount_php, paid_amount_php, status, issued_at, due_at, paid_at, created_at) values
  ('d4000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'DEMO-INV-001', 580357, 69643, 650000, 325000, 'partially_paid', now() - interval '12 days', now() + interval '2 days', null, now() - interval '12 days'),
  ('d4000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002', 'DEMO-INV-002', 1607143, 192857, 1800000, 1800000, 'paid', now() - interval '20 days', now() - interval '6 days', now() - interval '8 days', now() - interval '20 days'),
  ('d4000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-000000000004', 'DEMO-INV-003', 848214, 101786, 950000, 0, 'issued', now() - interval '3 days', now() + interval '11 days', null, now() - interval '3 days'),
  ('d4000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000003', 'DEMO-INV-004', 2544643, 305357, 2850000, 2000000, 'overdue', now() - interval '36 days', now() - interval '22 days', null, now() - interval '36 days')
on conflict (id) do update set
  paid_amount_php = excluded.paid_amount_php, status = excluded.status,
  issued_at = excluded.issued_at, due_at = excluded.due_at, paid_at = excluded.paid_at, updated_at = now();

insert into public.customer_messages (id, client_id, sender_profile_id, project_id, sender, body, read_at, created_at) values
  ('d5000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'customer', 'Could we include one setup with our dog? We can arrive fifteen minutes early.', null, now() - interval '6 hours'),
  ('d5000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', null, 'd3000000-0000-4000-8000-000000000002', 'staff', 'The revised shot list is ready for approval. We included the packaging close-ups.', now() - interval '1 day', now() - interval '2 days')
on conflict (id) do update set body = excluded.body, read_at = excluded.read_at;

insert into public.galleries (
  id, client_id, project_id, booking_id, slug, title, description, status,
  access_rule, downloads_enabled, favorites_enabled, selections_enabled,
  watermark_enabled, expires_at, session_date, created_at
) values (
  'd5100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000003',
  'd2000000-0000-4000-8000-000000000004',
  'demo-santos-anniversary',
  'Santos Anniversary Highlights',
  'A curated preview awaiting the final album selection.',
  'published', 'client_profiles', true, true, true, true,
  now() + interval '60 days', current_date - 16, now() - interval '10 days'
)
on conflict (id) do update set
  title = excluded.title, description = excluded.description, status = excluded.status,
  expires_at = excluded.expires_at, updated_at = now();

insert into public.products (id, sku, name, category, price, stock, swatch) values
  ('d6000000-0000-4000-8000-000000000001', 'DEMO-PRT-8X10', 'Fine Art Print 8x10', 'Prints', 850, 24, '#D9C7A7'),
  ('d6000000-0000-4000-8000-000000000002', 'DEMO-FRM-A4-OAK', 'Oak Gallery Frame A4', 'Frames', 1850, 8, '#A9794F'),
  ('d6000000-0000-4000-8000-000000000003', 'DEMO-ALB-30', 'Linen Story Album 30-page', 'Albums', 6800, 5, '#9A8C7A'),
  ('d6000000-0000-4000-8000-000000000004', 'DEMO-USB-32', 'Walnut USB Drive 32GB', 'Media', 1200, 15, '#5D4037')
on conflict (id) do update set name = excluded.name, price = excluded.price, stock = excluded.stock, active = true, updated_at = now();

insert into public.pos_sales (id, reference, client_id, method, subtotal, total, recorded_at) values
  ('d6100000-0000-4000-8000-000000000001', 'DEMO-SALE-001', 'd0000000-0000-4000-8000-000000000001', 'GCash', 3550, 3550, now() - interval '2 days'),
  ('d6100000-0000-4000-8000-000000000002', 'DEMO-SALE-002', null, 'Card', 6800, 6800, now() - interval '6 days')
on conflict (id) do update set method = excluded.method, subtotal = excluded.subtotal, total = excluded.total, recorded_at = excluded.recorded_at;

insert into public.pos_sale_items (id, sale_id, product_id, description, unit_price, quantity, total_price) values
  ('d6200000-0000-4000-8000-000000000001', 'd6100000-0000-4000-8000-000000000001', 'd6000000-0000-4000-8000-000000000001', 'Fine Art Print 8x10', 850, 2, 1700),
  ('d6200000-0000-4000-8000-000000000002', 'd6100000-0000-4000-8000-000000000001', 'd6000000-0000-4000-8000-000000000002', 'Oak Gallery Frame A4', 1850, 1, 1850),
  ('d6200000-0000-4000-8000-000000000003', 'd6100000-0000-4000-8000-000000000002', 'd6000000-0000-4000-8000-000000000003', 'Linen Story Album 30-page', 6800, 1, 6800)
on conflict (id) do update set quantity = excluded.quantity, total_price = excluded.total_price;

insert into public.equipment (id, serial, name, category, status, note, location) values
  ('d7000000-0000-4000-8000-000000000001', 'DEMO-CAM-001', 'Canon EOS R5', 'Camera', 'out', 'Primary event body', 'Checked out'),
  ('d7000000-0000-4000-8000-000000000002', 'DEMO-LNS-001', 'RF 24-70mm f/2.8L', 'Lens', 'available', 'Recently calibrated', 'Equipment cabinet A'),
  ('d7000000-0000-4000-8000-000000000003', 'DEMO-LGT-001', 'Profoto B10X Plus', 'Lighting', 'maint', 'Battery inspection due', 'Repair shelf'),
  ('d7000000-0000-4000-8000-000000000004', 'DEMO-AUD-001', 'Rode Wireless PRO', 'Audio', 'available', null, 'Equipment cabinet B')
on conflict (id) do update set status = excluded.status, note = excluded.note, location = excluded.location, updated_at = now();

insert into public.equipment_checkouts (id, equipment_id, purpose, checked_out_at, expected_return_at) values
  ('d7100000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'Northstar seasonal campaign', now() - interval '4 hours', now() + interval '7 hours')
on conflict (id) do update set purpose = excluded.purpose, checked_out_at = excluded.checked_out_at, expected_return_at = excluded.expected_return_at;

insert into public.maintenance_records (id, task, asset_label, maintenance_type, issue, assignee, next_due, recurrence, estimated_cost, warranty, status) values
  ('d7200000-0000-4000-8000-000000000001', 'Inspect battery contacts and run full discharge test', 'DEMO-LGT-001', 'Inspection', 'Battery reports inconsistent charge level', 'Paolo Cruz', current_date + 2, 'Quarterly', 1800, 'Covered through Dec 2026', 'scheduled'),
  ('d7200000-0000-4000-8000-000000000002', 'Clean camera sensors and verify autofocus', 'DEMO-CAM-001', 'Cleaning', null, 'Inez Flores', current_date + 30, 'Monthly', 1200, null, 'reported')
on conflict (id) do update set next_due = excluded.next_due, estimated_cost = excluded.estimated_cost, status = excluded.status, updated_at = now();

insert into public.marketing_campaigns (id, name, channel, spend, bookings_attributed, status, starts_at, ends_at) values
  ('d8000000-0000-4000-8000-000000000001', 'Rainy Day Studio Stories', 'Instagram and Facebook', 18500, 9, 'live', now() - interval '18 days', now() + interval '12 days'),
  ('d8000000-0000-4000-8000-000000000002', 'Holiday Mini Sessions', 'Email and Instagram', 0, 0, 'scheduled', now() + interval '45 days', now() + interval '75 days'),
  ('d8000000-0000-4000-8000-000000000003', 'Mother''s Day Keepsakes', 'Instagram', 32000, 21, 'ended', now() - interval '110 days', now() - interval '75 days')
on conflict (id) do update set spend = excluded.spend, bookings_attributed = excluded.bookings_attributed, status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at;

insert into public.quotations (id, reference, client_id, service_type, total, status, valid_until, notes, created_at) values
  ('d8100000-0000-4000-8000-000000000001', 'DEMO-QT-001', 'd0000000-0000-4000-8000-000000000003', 'Theme Session', 9500, 'sent', current_date + 11, 'Includes two styled sets and ten edited images.', now() - interval '3 days'),
  ('d8100000-0000-4000-8000-000000000002', 'DEMO-QT-002', 'd0000000-0000-4000-8000-000000000002', 'Quarterly Brand Content', 42000, 'draft', current_date + 18, 'Three half-day shoots across one quarter.', now() - interval '1 day')
on conflict (id) do update set total = excluded.total, status = excluded.status, valid_until = excluded.valid_until, notes = excluded.notes, updated_at = now();

insert into public.tasks (id, title, description, column_status, priority, category, assignee, due_date, linked_ref, sort_order) values
  ('d8200000-0000-4000-8000-000000000001', 'Confirm wardrobe palette with Maya', 'Send the neutral and terracotta palette before the session.', 'doing', 'High', 'Client', 'Sofia Lim', current_date, 'DEMO-BKG-001', 1),
  ('d8200000-0000-4000-8000-000000000002', 'Back up Northstar RAW files', 'Create local and cloud working copies after ingestion.', 'todo', 'High', 'Post-production', 'Paolo Cruz', current_date + 1, 'DEMO-PRJ-002', 2),
  ('d8200000-0000-4000-8000-000000000003', 'Review anniversary album proof', 'Check image order, names, and print-safe margins.', 'blocked', 'Med', 'Delivery', 'Inez Flores', current_date - 1, 'DEMO-PRJ-003', 3),
  ('d8200000-0000-4000-8000-000000000004', 'Publish September mini-session slots', null, 'done', 'Low', 'Marketing', 'Sofia Lim', current_date - 3, null, 4)
on conflict (id) do update set column_status = excluded.column_status, priority = excluded.priority, assignee = excluded.assignee, due_date = excluded.due_date, updated_at = now();

insert into public.glitches (id, reference, title, description, category, location_or_system, reporter_name, severity, status, observed_at, created_at) values
  ('d8300000-0000-4000-8000-000000000001', 'DEMO-G-001', 'Calendar retains previous month after browser back', 'The booking calendar returns to the previous month after browser navigation.', 'Booking', 'Booking calendar', 'Sofia Lim', 'Medium', 'In Progress', now() - interval '3 days', now() - interval '3 days'),
  ('d8300000-0000-4000-8000-000000000002', 'DEMO-G-002', 'Long client names wrap over balance badge', 'Long CRM account names overlap the balance indicator at tablet widths.', 'System', 'CRM accounts', 'Paolo Cruz', 'Low', 'Open', now() - interval '9 days', now() - interval '9 days')
on conflict (id) do update set title = excluded.title, description = excluded.description, category = excluded.category, location_or_system = excluded.location_or_system, severity = excluded.severity, status = excluded.status, observed_at = excluded.observed_at;

insert into public.feedback_reports (id, iid, title, summary, app, kind, status, priority, submitted_at, checked) values
  ('d8400000-0000-4000-8000-000000000001', 'DEMO-F-001', 'Show remaining balance in booking list', 'A balance column would reduce trips into booking details.', 'Bookings', 'Idea', 'Triaged', 'Normal', now() - interval '6 days', true),
  ('d8400000-0000-4000-8000-000000000002', 'DEMO-F-002', 'Equipment return date is difficult to scan', 'Use relative dates for items due today or overdue.', 'Inventory', 'Idea', 'Submitted', 'Low', now() - interval '2 days', false)
on conflict (id) do update set status = excluded.status, priority = excluded.priority, checked = excluded.checked;

insert into public.shifts (id, day_of_week, initials, name, role, time_description, location, week_start) values
  ('d8500000-0000-4000-8000-000000000001', 1, 'SL', 'Sofia Lim', 'Studio manager', '09:00–18:00', 'studio', date_trunc('week', current_date)::date),
  ('d8500000-0000-4000-8000-000000000002', 2, 'PC', 'Paolo Cruz', 'Photographer', '08:00–17:00', 'location', date_trunc('week', current_date)::date),
  ('d8500000-0000-4000-8000-000000000003', 3, 'IF', 'Inez Flores', 'Editor', '10:00–19:00', 'studio', date_trunc('week', current_date)::date),
  ('d8500000-0000-4000-8000-000000000004', 5, 'SL', 'Sofia Lim', 'Studio manager', '09:00–18:00', 'studio', date_trunc('week', current_date)::date)
on conflict (id) do update set week_start = excluded.week_start, time_description = excluded.time_description, location = excluded.location;

insert into public.compliance_records (id, requirement, category, agency, reference_number, frequency, responsible_person, estimated_cost, actual_cost, status, expires_on) values
  ('d8600000-0000-4000-8000-000000000001', 'Barangay business clearance', 'Business permit', 'Barangay Office', 'DEMO-BC-2026', 'Annual', 'Sofia Lim', '₱1,200', '₱1,150', 'compliant', current_date + 145),
  ('d8600000-0000-4000-8000-000000000002', 'Fire safety inspection certificate', 'Safety', 'Bureau of Fire Protection', 'DEMO-FSIC-2026', 'Annual', 'Paolo Cruz', '₱2,500', null, 'duesoon', current_date + 28),
  ('d8600000-0000-4000-8000-000000000003', 'Data privacy registration review', 'Privacy', 'National Privacy Commission', null, 'Annual', 'Inez Flores', null, null, 'review', current_date + 62)
on conflict (id) do update set status = excluded.status, expires_on = excluded.expires_on, updated_at = now();

insert into public.recruitment_roles (id, title, type, applicant_count, is_open, description) values
  ('d8700000-0000-4000-8000-000000000001', 'Studio Assistant', 'Part-time', 14, true, 'Support set preparation, client arrival, and equipment organization.'),
  ('d8700000-0000-4000-8000-000000000002', 'Photo Editor', 'Freelance', 7, true, 'Edit portrait sessions to the Kahel color and finish standards.')
on conflict (id) do update set applicant_count = excluded.applicant_count, is_open = excluded.is_open, updated_at = now();

insert into public.recruitment_candidates (id, role_id, initials, name, role_applied, notes, source, stage) values
  ('d8710000-0000-4000-8000-000000000001', 'd8700000-0000-4000-8000-000000000001', 'JR', 'Jamie Rivera', 'Studio Assistant', 'Strong customer-service background; available weekends.', 'Instagram', 'interview'),
  ('d8710000-0000-4000-8000-000000000002', 'd8700000-0000-4000-8000-000000000002', 'TA', 'Taylor Aquino', 'Photo Editor', 'Portfolio shows consistent skin tones and clean masking.', 'Referral', 'screening'),
  ('d8710000-0000-4000-8000-000000000003', 'd8700000-0000-4000-8000-000000000001', 'CM', 'Casey Mercado', 'Studio Assistant', 'Photography student with weekday availability.', 'Job board', 'applied')
on conflict (id) do update set notes = excluded.notes, source = excluded.source, stage = excluded.stage, updated_at = now();

insert into public.performance_goals (id, label, owner, progress_pct, detail) values
  ('d8800000-0000-4000-8000-000000000001', 'Deliver proofs within five business days', 'Studio team', 82, 'Current rolling average is 5.4 business days.'),
  ('d8800000-0000-4000-8000-000000000002', 'Reduce equipment checkout exceptions', 'Paolo Cruz', 65, 'Add end-of-day return reminders and cabinet labels.'),
  ('d8800000-0000-4000-8000-000000000003', 'Reach 30% repeat-booking rate', 'Sofia Lim', 73, 'Follow up after delivery and feature loyalty progress.')
on conflict (id) do update set progress_pct = excluded.progress_pct, detail = excluded.detail, updated_at = now();

insert into public.payroll_employees (id, initials, name, role, employee_ref, base_salary, status, hired_at) values
  ('d9000000-0000-4000-8000-000000000001', 'SL', 'Sofia Lim', 'Studio manager', 'DEMO-EMP-001', 42000, 'active', current_date - 820),
  ('d9000000-0000-4000-8000-000000000002', 'PC', 'Paolo Cruz', 'Photographer', 'DEMO-EMP-002', 38000, 'active', current_date - 640),
  ('d9000000-0000-4000-8000-000000000003', 'IF', 'Inez Flores', 'Photo editor', 'DEMO-EMP-003', 34000, 'active', current_date - 410)
on conflict (id) do update set role = excluded.role, base_salary = excluded.base_salary, status = excluded.status, hired_at = excluded.hired_at, updated_at = now();

insert into public.payroll_runs (id, reference, period_label, period_start, period_end, payment_date, employee_count, prepared_by, gross_total, deductions_total, employer_share, net_total, steps_done, status, created_at) values
  ('d9100000-0000-4000-8000-000000000001', 'DEMO-PAY-001', to_char(current_date, 'FMMonth YYYY') || ' first half', date_trunc('month', current_date)::date, date_trunc('month', current_date)::date + 14, date_trunc('month', current_date)::date + 14, 3, 'Sofia Lim', 57000, 6350, 4950, 50650, 6, 'pending', now() - interval '2 days'),
  ('d9100000-0000-4000-8000-000000000002', 'DEMO-PAY-002', to_char(current_date - interval '1 month', 'FMMonth YYYY') || ' second half', (date_trunc('month', current_date) - interval '1 month')::date + 15, date_trunc('month', current_date)::date - 1, date_trunc('month', current_date)::date, 3, 'Sofia Lim', 57000, 6350, 4950, 50650, 9, 'paid', now() - interval '18 days')
on conflict (id) do update set period_label = excluded.period_label, period_start = excluded.period_start, period_end = excluded.period_end, payment_date = excluded.payment_date, steps_done = excluded.steps_done, status = excluded.status, updated_at = now();

insert into public.payroll_payslips (id, run_id, employee_id, initials, name, role, basic_pay, overtime_pay, gross_pay, sss_ee, philhealth_ee, pagibig_ee, withholding_tax, other_deductions, net_pay) values
  ('d9200000-0000-4000-8000-000000000001', 'd9100000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001', 'SL', 'Sofia Lim', 'Studio manager', 21000, 750, 21750, 900, 500, 100, 1250, 0, 19000),
  ('d9200000-0000-4000-8000-000000000002', 'd9100000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000002', 'PC', 'Paolo Cruz', 'Photographer', 19000, 1250, 20250, 850, 475, 100, 925, 0, 17900),
  ('d9200000-0000-4000-8000-000000000003', 'd9100000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000003', 'IF', 'Inez Flores', 'Photo editor', 17000, 0, 17000, 750, 425, 100, 325, 0, 15400)
on conflict (id) do update set basic_pay = excluded.basic_pay, overtime_pay = excluded.overtime_pay, gross_pay = excluded.gross_pay, net_pay = excluded.net_pay;

commit;
