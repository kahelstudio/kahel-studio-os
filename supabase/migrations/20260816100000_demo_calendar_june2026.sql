-- Demo data: June 2026 calendar bookings (safe to re-run)

-- ── Services ─────────────────────────────────────────────────────────────────
insert into public.services (code, name, active) values
  ('mini-session',            'Mini Session',            true),
  ('solo',                    'Solo',                    true),
  ('express',                 'Express',                 true),
  ('group',                   'Group',                   true),
  ('theme',                   'Theme',                   true),
  ('duo',                     'Duo',                     true),
  ('birthday',                'Birthday',                true),
  ('debut',                   'Debut',                   true),
  ('christening',             'Christening',             true),
  ('engagement-party',        'Engagement Party',        true),
  ('anniversary-celebration', 'Anniversary Celebration', true),
  ('studio-rental',           'Studio Rental',           true),
  ('power-interruption',      'Power Interruption',      true),
  ('blocked',                 'Blocked',                 true),
  ('other',                   'Other',                   true)
on conflict (code) do update set name = excluded.name, active = true;

-- ── Demo clients ─────────────────────────────────────────────────────────────
-- external_ref is required: 'KAHEL-' || UPPER(id without dashes)
insert into public.clients (id, name, external_ref)
select v.id::uuid, v.name, 'KAHEL-' || upper(replace(v.id, '-', ''))
from (values
  ('dc000100-0000-4000-8000-000000000000', 'Internal'),
  ('dc000101-0000-4000-8000-000000000000', 'Krave Beauty PH'),
  ('dc000102-0000-4000-8000-000000000000', 'Bea Santos'),
  ('dc000103-0000-4000-8000-000000000000', 'Indie Film Co.'),
  ('dc000104-0000-4000-8000-000000000000', 'Metro Magazine'),
  ('dc000105-0000-4000-8000-000000000000', 'Collabera PH'),
  ('dc000106-0000-4000-8000-000000000000', 'Nico & Ella Tan'),
  ('dc000107-0000-4000-8000-000000000000', 'Claire Aquino'),
  ('dc000108-0000-4000-8000-000000000000', 'Cruz Family'),
  ('dc000109-0000-4000-8000-000000000000', 'Mika Villanueva'),
  ('dc000110-0000-4000-8000-000000000000', 'Haraya Crafts'),
  ('dc000111-0000-4000-8000-000000000000', 'PLDT Enterprise'),
  ('dc000112-0000-4000-8000-000000000000', 'Skyline Productions'),
  ('dc000113-0000-4000-8000-000000000000', 'Bautista Family'),
  ('dc000114-0000-4000-8000-000000000000', 'Lena Soriano'),
  ('dc000115-0000-4000-8000-000000000000', 'Likhaan Apparel'),
  ('dc000116-0000-4000-8000-000000000000', 'Sip & Grind Coffee'),
  ('dc000117-0000-4000-8000-000000000000', 'Ramos Family'),
  ('dc000118-0000-4000-8000-000000000000', 'Shopee Seller — Bella'),
  ('dc000119-0000-4000-8000-000000000000', 'DLSU Batch 2006'),
  ('dc000120-0000-4000-8000-000000000000', 'Ateneo Graduates'),
  ('dc000121-0000-4000-8000-000000000000', 'Ramon & Teresa Lim'),
  ('dc000122-0000-4000-8000-000000000000', 'Paolo & Ana Reyes'),
  ('dc000123-0000-4000-8000-000000000000', 'Film School PH'),
  ('dc000124-0000-4000-8000-000000000000', 'Hungry House PH'),
  ('dc000125-0000-4000-8000-000000000000', 'Ayala Property Mgmt'),
  ('dc000126-0000-4000-8000-000000000000', 'The Brief PH'),
  ('dc000127-0000-4000-8000-000000000000', 'Lato Manila'),
  ('dc000128-0000-4000-8000-000000000000', 'PSF Athletics'),
  ('dc000129-0000-4000-8000-000000000000', 'De Leon Family'),
  ('dc000130-0000-4000-8000-000000000000', 'Sofia Ramos'),
  ('dc000131-0000-4000-8000-000000000000', 'Podcast Network PH'),
  ('dc000132-0000-4000-8000-000000000000', 'Bench PH'),
  ('dc000133-0000-4000-8000-000000000000', 'Tristan & Maya Lim'),
  ('dc000134-0000-4000-8000-000000000000', 'Sound Republic Events'),
  ('dc000135-0000-4000-8000-000000000000', 'Anonymous')
) as v(id, name)
on conflict (id) do nothing;

-- ── Client profiles ───────────────────────────────────────────────────────────
insert into public.client_profiles (id, client_id, email, first_name, last_name) values
  ('dc000200-0000-4000-8000-000000000000', 'dc000100-0000-4000-8000-000000000000', 'demo+internal@kahel.studio.demo',       'Kahel',    'Internal'),
  ('dc000201-0000-4000-8000-000000000000', 'dc000101-0000-4000-8000-000000000000', 'demo+krave@kahel.studio.demo',          'Krave',    'Beauty PH'),
  ('dc000202-0000-4000-8000-000000000000', 'dc000102-0000-4000-8000-000000000000', 'demo+bea@kahel.studio.demo',            'Bea',      'Santos'),
  ('dc000203-0000-4000-8000-000000000000', 'dc000103-0000-4000-8000-000000000000', 'demo+indie@kahel.studio.demo',          'Indie',    'Film Co'),
  ('dc000204-0000-4000-8000-000000000000', 'dc000104-0000-4000-8000-000000000000', 'demo+metro@kahel.studio.demo',          'Metro',    'Magazine'),
  ('dc000205-0000-4000-8000-000000000000', 'dc000105-0000-4000-8000-000000000000', 'demo+collabera@kahel.studio.demo',      'Collabera','PH'),
  ('dc000206-0000-4000-8000-000000000000', 'dc000106-0000-4000-8000-000000000000', 'demo+nico-ella@kahel.studio.demo',      'Nico',     'Ella Tan'),
  ('dc000207-0000-4000-8000-000000000000', 'dc000107-0000-4000-8000-000000000000', 'demo+claire@kahel.studio.demo',         'Claire',   'Aquino'),
  ('dc000208-0000-4000-8000-000000000000', 'dc000108-0000-4000-8000-000000000000', 'demo+cruz@kahel.studio.demo',           'Cruz',     'Family'),
  ('dc000209-0000-4000-8000-000000000000', 'dc000109-0000-4000-8000-000000000000', 'demo+mika@kahel.studio.demo',           'Mika',     'Villanueva'),
  ('dc000210-0000-4000-8000-000000000000', 'dc000110-0000-4000-8000-000000000000', 'demo+haraya@kahel.studio.demo',         'Haraya',   'Crafts'),
  ('dc000211-0000-4000-8000-000000000000', 'dc000111-0000-4000-8000-000000000000', 'demo+pldt@kahel.studio.demo',           'PLDT',     'Enterprise'),
  ('dc000212-0000-4000-8000-000000000000', 'dc000112-0000-4000-8000-000000000000', 'demo+skyline@kahel.studio.demo',        'Skyline',  'Productions'),
  ('dc000213-0000-4000-8000-000000000000', 'dc000113-0000-4000-8000-000000000000', 'demo+bautista@kahel.studio.demo',       'Bautista', 'Family'),
  ('dc000214-0000-4000-8000-000000000000', 'dc000114-0000-4000-8000-000000000000', 'demo+lena@kahel.studio.demo',           'Lena',     'Soriano'),
  ('dc000215-0000-4000-8000-000000000000', 'dc000115-0000-4000-8000-000000000000', 'demo+likhaan@kahel.studio.demo',        'Likhaan',  'Apparel'),
  ('dc000216-0000-4000-8000-000000000000', 'dc000116-0000-4000-8000-000000000000', 'demo+sip-grind@kahel.studio.demo',      'Sip',      'Grind Coffee'),
  ('dc000217-0000-4000-8000-000000000000', 'dc000117-0000-4000-8000-000000000000', 'demo+ramos@kahel.studio.demo',          'Ramos',    'Family'),
  ('dc000218-0000-4000-8000-000000000000', 'dc000118-0000-4000-8000-000000000000', 'demo+shopee-bella@kahel.studio.demo',   'Shopee',   'Seller Bella'),
  ('dc000219-0000-4000-8000-000000000000', 'dc000119-0000-4000-8000-000000000000', 'demo+dlsu@kahel.studio.demo',           'DLSU',     'Batch 2006'),
  ('dc000220-0000-4000-8000-000000000000', 'dc000120-0000-4000-8000-000000000000', 'demo+ateneo@kahel.studio.demo',         'Ateneo',   'Graduates'),
  ('dc000221-0000-4000-8000-000000000000', 'dc000121-0000-4000-8000-000000000000', 'demo+ramon-teresa@kahel.studio.demo',   'Ramon',    'Teresa Lim'),
  ('dc000222-0000-4000-8000-000000000000', 'dc000122-0000-4000-8000-000000000000', 'demo+paolo-ana@kahel.studio.demo',      'Paolo',    'Ana Reyes'),
  ('dc000223-0000-4000-8000-000000000000', 'dc000123-0000-4000-8000-000000000000', 'demo+film-school@kahel.studio.demo',    'Film',     'School PH'),
  ('dc000224-0000-4000-8000-000000000000', 'dc000124-0000-4000-8000-000000000000', 'demo+hungry-house@kahel.studio.demo',   'Hungry',   'House PH'),
  ('dc000225-0000-4000-8000-000000000000', 'dc000125-0000-4000-8000-000000000000', 'demo+ayala@kahel.studio.demo',          'Ayala',    'Property'),
  ('dc000226-0000-4000-8000-000000000000', 'dc000126-0000-4000-8000-000000000000', 'demo+the-brief@kahel.studio.demo',      'The',      'Brief PH'),
  ('dc000227-0000-4000-8000-000000000000', 'dc000127-0000-4000-8000-000000000000', 'demo+lato-manila@kahel.studio.demo',    'Lato',     'Manila'),
  ('dc000228-0000-4000-8000-000000000000', 'dc000128-0000-4000-8000-000000000000', 'demo+psf@kahel.studio.demo',            'PSF',      'Athletics'),
  ('dc000229-0000-4000-8000-000000000000', 'dc000129-0000-4000-8000-000000000000', 'demo+de-leon@kahel.studio.demo',        'De Leon',  'Family'),
  ('dc000230-0000-4000-8000-000000000000', 'dc000130-0000-4000-8000-000000000000', 'demo+sofia-ramos@kahel.studio.demo',    'Sofia',    'Ramos'),
  ('dc000231-0000-4000-8000-000000000000', 'dc000131-0000-4000-8000-000000000000', 'demo+podcast@kahel.studio.demo',        'Podcast',  'Network PH'),
  ('dc000232-0000-4000-8000-000000000000', 'dc000132-0000-4000-8000-000000000000', 'demo+bench@kahel.studio.demo',          'Bench',    'PH'),
  ('dc000233-0000-4000-8000-000000000000', 'dc000133-0000-4000-8000-000000000000', 'demo+tristan-maya@kahel.studio.demo',   'Tristan',  'Maya Lim'),
  ('dc000234-0000-4000-8000-000000000000', 'dc000134-0000-4000-8000-000000000000', 'demo+sound-republic@kahel.studio.demo', 'Sound',    'Republic Events'),
  ('dc000235-0000-4000-8000-000000000000', 'dc000135-0000-4000-8000-000000000000', 'demo+anonymous@kahel.studio.demo',      'Anonymous','Client')
on conflict (id) do nothing;

-- ── Bookings: June 2026 ───────────────────────────────────────────────────────
-- Columns: id, client_id, client_profile_id, idempotency_key, request_fingerprint,
--          reference, service_type, service_id, service_date, service_time,
--          location, payment_type, subtotal_amount_php, total_amount_php,
--          paid_amount_php, status, payment_status

insert into public.bookings
  (id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference,
   service_type, service_id, service_date, service_time, location,
   payment_type, subtotal_amount_php, total_amount_php, paid_amount_php, status, payment_status)
select
  b.id::uuid, b.cid::uuid, b.pid::uuid, b.ikey, md5('a'||b.ref)||md5('b'||b.ref), b.ref,
  b.stype, s.id, b.sdate::date, b.stime::time, b.loc,
  'full', b.amt::integer, b.amt::integer, b.amt::integer, 'confirmed', 'paid'
from (values
  -- Jun 1
  ('dc030001-0000-4000-8000-000000000000','dc000101-0000-4000-8000-000000000000','dc000201-0000-4000-8000-000000000000','demo-cal-dc001','KS-2026-DC01','Mini Session',       '2026-06-01','09:00','Kahel Studio',  99900),
  ('dc030002-0000-4000-8000-000000000000','dc000100-0000-4000-8000-000000000000','dc000200-0000-4000-8000-000000000000','demo-cal-dc002','KS-2026-DC02','Other',              '2026-06-01','14:00','Kahel Studio',  0),
  -- Jun 2
  ('dc030003-0000-4000-8000-000000000000','dc000102-0000-4000-8000-000000000000','dc000202-0000-4000-8000-000000000000','demo-cal-dc003','KS-2026-DC03','Birthday',           '2026-06-02','10:00','Kahel Studio',  700000),
  -- Jun 3
  ('dc030004-0000-4000-8000-000000000000','dc000103-0000-4000-8000-000000000000','dc000203-0000-4000-8000-000000000000','demo-cal-dc004','KS-2026-DC04','Studio Rental',      '2026-06-03','09:00','Kahel Studio',  500000),
  ('dc030005-0000-4000-8000-000000000000','dc000104-0000-4000-8000-000000000000','dc000204-0000-4000-8000-000000000000','demo-cal-dc005','KS-2026-DC05','Express',            '2026-06-03','13:00','Kahel Studio',  250000),
  -- Jun 4
  ('dc030006-0000-4000-8000-000000000000','dc000105-0000-4000-8000-000000000000','dc000205-0000-4000-8000-000000000000','demo-cal-dc006','KS-2026-DC06','Group',              '2026-06-04','10:00','Kahel Studio',  219900),
  ('dc030007-0000-4000-8000-000000000000','dc000106-0000-4000-8000-000000000000','dc000206-0000-4000-8000-000000000000','demo-cal-dc007','KS-2026-DC07','Other',              '2026-06-04','15:00','Kahel Studio',  0),
  -- Jun 5
  ('dc030008-0000-4000-8000-000000000000','dc000107-0000-4000-8000-000000000000','dc000207-0000-4000-8000-000000000000','demo-cal-dc008','KS-2026-DC08','Solo',               '2026-06-05','09:00','Kahel Studio',  150000),
  -- Jun 6
  ('dc030009-0000-4000-8000-000000000000','dc000106-0000-4000-8000-000000000000','dc000206-0000-4000-8000-000000000000','demo-cal-dc009','KS-2026-DC09','Engagement Party',   '2026-06-06','09:00','Nico & Ella Venue', 600000),
  -- Jun 7
  ('dc030010-0000-4000-8000-000000000000','dc000108-0000-4000-8000-000000000000','dc000208-0000-4000-8000-000000000000','demo-cal-dc010','KS-2026-DC10','Christening',        '2026-06-07','10:00','Cruz Residence', 800000),
  -- Jun 8
  ('dc030011-0000-4000-8000-000000000000','dc000109-0000-4000-8000-000000000000','dc000209-0000-4000-8000-000000000000','demo-cal-dc011','KS-2026-DC11','Theme',              '2026-06-08','10:00','Kahel Studio',  300000),
  ('dc030012-0000-4000-8000-000000000000','dc000110-0000-4000-8000-000000000000','dc000210-0000-4000-8000-000000000000','demo-cal-dc012','KS-2026-DC12','Express',            '2026-06-08','14:00','Kahel Studio',  250000),
  -- Jun 9
  ('dc030013-0000-4000-8000-000000000000','dc000111-0000-4000-8000-000000000000','dc000211-0000-4000-8000-000000000000','demo-cal-dc013','KS-2026-DC13','Anniversary Celebration','2026-06-09','09:00','PLDT Venue', 1000000),
  ('dc030014-0000-4000-8000-000000000000','dc000112-0000-4000-8000-000000000000','dc000212-0000-4000-8000-000000000000','demo-cal-dc014','KS-2026-DC14','Studio Rental',      '2026-06-09','14:00','Kahel Studio',  500000),
  -- Jun 10
  ('dc030015-0000-4000-8000-000000000000','dc000113-0000-4000-8000-000000000000','dc000213-0000-4000-8000-000000000000','demo-cal-dc015','KS-2026-DC15','Group',              '2026-06-10','09:00','Kahel Studio',  219900),
  ('dc030016-0000-4000-8000-000000000000','dc000114-0000-4000-8000-000000000000','dc000214-0000-4000-8000-000000000000','demo-cal-dc016','KS-2026-DC16','Other',              '2026-06-10','14:00','Kahel Studio',  0),
  -- Jun 11
  ('dc030017-0000-4000-8000-000000000000','dc000115-0000-4000-8000-000000000000','dc000215-0000-4000-8000-000000000000','demo-cal-dc017','KS-2026-DC17','Mini Session',       '2026-06-11','10:00','Kahel Studio',  99900),
  ('dc030018-0000-4000-8000-000000000000','dc000116-0000-4000-8000-000000000000','dc000216-0000-4000-8000-000000000000','demo-cal-dc018','KS-2026-DC18','Other',              '2026-06-11','15:00','Kahel Studio',  0),
  -- Jun 12: Independence Day — no bookings
  -- Jun 13
  ('dc030019-0000-4000-8000-000000000000','dc000117-0000-4000-8000-000000000000','dc000217-0000-4000-8000-000000000000','demo-cal-dc019','KS-2026-DC19','Group',              '2026-06-13','10:00','Kahel Studio',  219900),
  ('dc030020-0000-4000-8000-000000000000','dc000118-0000-4000-8000-000000000000','dc000218-0000-4000-8000-000000000000','demo-cal-dc020','KS-2026-DC20','Mini Session',       '2026-06-13','14:00','Kahel Studio',  99900),
  -- Jun 14
  ('dc030021-0000-4000-8000-000000000000','dc000119-0000-4000-8000-000000000000','dc000219-0000-4000-8000-000000000000','demo-cal-dc021','KS-2026-DC21','Debut',              '2026-06-14','09:00','DLSU Venue',    1000000),
  -- Jun 15 (Blocked)
  ('dc030022-0000-4000-8000-000000000000','dc000100-0000-4000-8000-000000000000','dc000200-0000-4000-8000-000000000000','demo-cal-dc022','KS-2026-DC22','Blocked',            '2026-06-15','09:00','Kahel Studio',  0),
  -- Jun 16
  ('dc030023-0000-4000-8000-000000000000','dc000120-0000-4000-8000-000000000000','dc000220-0000-4000-8000-000000000000','demo-cal-dc023','KS-2026-DC23','Express',            '2026-06-16','09:00','Kahel Studio',  250000),
  ('dc030024-0000-4000-8000-000000000000','dc000121-0000-4000-8000-000000000000','dc000221-0000-4000-8000-000000000000','demo-cal-dc024','KS-2026-DC24','Solo',               '2026-06-16','14:00','Kahel Studio',  150000),
  -- Jun 17
  ('dc030025-0000-4000-8000-000000000000','dc000122-0000-4000-8000-000000000000','dc000222-0000-4000-8000-000000000000','demo-cal-dc025','KS-2026-DC25','Engagement Party',   '2026-06-17','09:00','Reyes Venue',   600000),
  ('dc030026-0000-4000-8000-000000000000','dc000123-0000-4000-8000-000000000000','dc000223-0000-4000-8000-000000000000','demo-cal-dc026','KS-2026-DC26','Studio Rental',      '2026-06-17','14:00','Kahel Studio',  500000),
  -- Jun 18
  ('dc030027-0000-4000-8000-000000000000','dc000124-0000-4000-8000-000000000000','dc000224-0000-4000-8000-000000000000','demo-cal-dc027','KS-2026-DC27','Theme',              '2026-06-18','10:00','Kahel Studio',  300000),
  ('dc030028-0000-4000-8000-000000000000','dc000100-0000-4000-8000-000000000000','dc000200-0000-4000-8000-000000000000','demo-cal-dc028','KS-2026-DC28','Other',              '2026-06-18','15:00','Kahel Studio',  0),
  -- Jun 19
  ('dc030029-0000-4000-8000-000000000000','dc000125-0000-4000-8000-000000000000','dc000225-0000-4000-8000-000000000000','demo-cal-dc029','KS-2026-DC29','Mini Session',       '2026-06-19','09:00','Kahel Studio',  99900),
  ('dc030030-0000-4000-8000-000000000000','dc000126-0000-4000-8000-000000000000','dc000226-0000-4000-8000-000000000000','demo-cal-dc030','KS-2026-DC30','Other',              '2026-06-19','14:00','Kahel Studio',  0),
  -- Jun 20
  ('dc030031-0000-4000-8000-000000000000','dc000127-0000-4000-8000-000000000000','dc000227-0000-4000-8000-000000000000','demo-cal-dc031','KS-2026-DC31','Group',              '2026-06-20','10:00','Kahel Studio',  219900),
  ('dc030032-0000-4000-8000-000000000000','dc000100-0000-4000-8000-000000000000','dc000200-0000-4000-8000-000000000000','demo-cal-dc032','KS-2026-DC32','Power Interruption', '2026-06-20','15:00','Kahel Studio',  0),
  -- Jun 21
  ('dc030033-0000-4000-8000-000000000000','dc000128-0000-4000-8000-000000000000','dc000228-0000-4000-8000-000000000000','demo-cal-dc033','KS-2026-DC33','Anniversary Celebration','2026-06-21','09:00','PSF Venue', 1000000),
  -- Jun 22
  ('dc030034-0000-4000-8000-000000000000','dc000129-0000-4000-8000-000000000000','dc000229-0000-4000-8000-000000000000','demo-cal-dc034','KS-2026-DC34','Mini Session',       '2026-06-22','09:00','Kahel Studio',  99900),
  -- Jun 23
  ('dc030035-0000-4000-8000-000000000000','dc000130-0000-4000-8000-000000000000','dc000230-0000-4000-8000-000000000000','demo-cal-dc035','KS-2026-DC35','Solo',               '2026-06-23','09:00','Kahel Studio',  150000),
  -- Jun 24
  ('dc030036-0000-4000-8000-000000000000','dc000131-0000-4000-8000-000000000000','dc000231-0000-4000-8000-000000000000','demo-cal-dc036','KS-2026-DC36','Studio Rental',      '2026-06-24','09:00','Kahel Studio',  500000),
  -- Jun 25
  ('dc030037-0000-4000-8000-000000000000','dc000132-0000-4000-8000-000000000000','dc000232-0000-4000-8000-000000000000','demo-cal-dc037','KS-2026-DC37','Group',              '2026-06-25','10:00','Kahel Studio',  219900),
  -- Jun 26
  ('dc030038-0000-4000-8000-000000000000','dc000133-0000-4000-8000-000000000000','dc000233-0000-4000-8000-000000000000','demo-cal-dc038','KS-2026-DC38','Mini Session',       '2026-06-26','09:00','Kahel Studio',  99900),
  -- Jun 27
  ('dc030039-0000-4000-8000-000000000000','dc000134-0000-4000-8000-000000000000','dc000234-0000-4000-8000-000000000000','demo-cal-dc039','KS-2026-DC39','Anniversary Celebration','2026-06-27','10:00','SR Venue',  1000000),
  -- Jun 28
  ('dc030040-0000-4000-8000-000000000000','dc000135-0000-4000-8000-000000000000','dc000235-0000-4000-8000-000000000000','demo-cal-dc040','KS-2026-DC40','Express',            '2026-06-28','10:00','Kahel Studio',  250000)
) as b(id, cid, pid, ikey, ref, stype, sdate, stime, loc, amt)
join public.services s on s.code = (
  case b.stype
    when 'Mini Session'            then 'mini-session'
    when 'Solo'                    then 'solo'
    when 'Express'                 then 'express'
    when 'Group'                   then 'group'
    when 'Theme'                   then 'theme'
    when 'Duo'                     then 'duo'
    when 'Birthday'                then 'birthday'
    when 'Debut'                   then 'debut'
    when 'Christening'             then 'christening'
    when 'Engagement Party'        then 'engagement-party'
    when 'Anniversary Celebration' then 'anniversary-celebration'
    when 'Studio Rental'           then 'studio-rental'
    when 'Power Interruption'      then 'power-interruption'
    when 'Blocked'                 then 'blocked'
    else                                'other'
  end
)
on conflict (id) do nothing;
