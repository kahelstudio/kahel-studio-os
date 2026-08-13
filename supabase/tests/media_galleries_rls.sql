begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gallery-a@test.local', '', now(), now()),
  ('91000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gallery-b@test.local', '', now(), now()),
  ('91000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gallery-staff@test.local', '', now(), now());

insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards)
values ('91000000-0000-4000-8000-000000000003', 'admin', 'Gallery Staff', true, true, true);

insert into public.clients (id, external_ref, name) values
  ('92000000-0000-4000-8000-000000000001', 'GALLERY-CLIENT-A', 'Gallery Client A'),
  ('92000000-0000-4000-8000-000000000002', 'GALLERY-CLIENT-B', 'Gallery Client B');
insert into public.client_profiles (id, client_id, user_id, email, first_name, last_name) values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'gallery-a@test.local', 'Gallery', 'A'),
  ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'gallery-b@test.local', 'Gallery', 'B');

insert into public.bookings (
  id, client_id, client_profile_id, idempotency_key, request_fingerprint, reference, service_type, service_id,
  service_date, service_time, location, payment_type, subtotal_amount_php, total_amount_php
) values
  ('94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 'gallery-booking-a', repeat('a', 64), 'GALLERY-BOOKING-A', 'Solo', '10000000-0000-4000-8000-000000000001', '2026-10-01', '09:00', 'Studio', 'cash', 100000, 100000),
  ('94000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000002', 'gallery-booking-b', repeat('b', 64), 'GALLERY-BOOKING-B', 'Solo', '10000000-0000-4000-8000-000000000001', '2026-10-02', '09:00', 'Studio', 'cash', 100000, 100000);
insert into public.projects (id, client_id, booking_id, reference, title) values
  ('95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'GALLERY-PROJECT-A', 'Project A'),
  ('95000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000002', 'GALLERY-PROJECT-B', 'Project B');

insert into public.media_assets (
  id, client_id, project_id, private_r2_key, cloudflare_image_id,
  original_filename, mime_type, byte_size, width, height, aspect_ratio, status, visibility
) values
  ('96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'private/client-a/approved.jpg', 'cf-a-approved', 'approved.jpg', 'image/jpeg', 1000, 100, 100, 1, 'ready', 'gallery'),
  ('96000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'private/client-a/hidden.jpg', 'cf-a-hidden', 'hidden.jpg', 'image/jpeg', 1000, 100, 100, 1, 'ready', 'gallery'),
  ('96000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', 'private/client-b/approved.jpg', 'cf-b-approved', 'approved-b.jpg', 'image/jpeg', 1000, 100, 100, 1, 'ready', 'gallery');

insert into public.galleries (
  id, client_id, project_id, booking_id, slug, title, status,
  favorites_enabled, selections_enabled, expires_at
) values
  ('97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'client-a-published', 'Client A Published', 'published', true, true, now() + interval '7 days'),
  ('97000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'client-a-draft', 'Client A Draft', 'draft', true, true, null),
  ('97000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000002', 'client-b-published', 'Client B Published', 'published', true, true, now() + interval '7 days');

insert into public.gallery_assets (
  id, gallery_id, client_id, media_asset_id, storage_path, asset_type,
  visibility, approval_status, sort_order
) values
  ('98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', 'legacy/client-a/approved.jpg', 'image', 'gallery', 'approved', 0),
  ('98000000-0000-4000-8000-000000000002', '97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000002', 'legacy/client-a/hidden.jpg', 'image', 'hidden', 'approved', 1),
  ('98000000-0000-4000-8000-000000000003', '97000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000002', '96000000-0000-4000-8000-000000000003', 'legacy/client-b/approved.jpg', 'image', 'gallery', 'approved', 0);

insert into public.gallery_activity (gallery_id, client_id, event_type)
values ('97000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'gallery.published');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.galleries), 1, 'Customer A sees only their published non-expired gallery');
select is((select count(*)::integer from public.galleries where id = '97000000-0000-4000-8000-000000000002'), 0, 'Customer A cannot see their unpublished gallery');
select is((select count(*)::integer from public.galleries where id = '97000000-0000-4000-8000-000000000003'), 0, 'Customer A cannot see Customer B gallery');
select is((select count(id)::integer from public.gallery_assets), 1, 'Customer A sees only approved visible assets');
select is((select count(id)::integer from public.gallery_assets where id = '98000000-0000-4000-8000-000000000002'), 0, 'hidden asset is denied');
select is((select count(id)::integer from public.media_assets), 1, 'Customer A sees safe metadata only for delivered media');
select lives_ok($$insert into public.gallery_favorites (gallery_id, gallery_asset_id, client_id, client_profile_id) values ('97000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001')$$, 'Customer A can favorite an enabled visible asset');
select is((select count(*)::integer from public.gallery_favorites), 1, 'Customer A reads their exact-profile favorite');
select throws_ok($$insert into public.gallery_favorites (gallery_id, gallery_asset_id, client_id, client_profile_id) values ('97000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001')$$, '23505', null, 'duplicate favorite is rejected');
select throws_ok($$select private_r2_key from public.media_assets$$, '42501', null, 'Customer A cannot read private R2 keys');
select throws_ok($$select cloudflare_image_id from public.media_assets$$, '42501', null, 'Customer A cannot read Cloudflare image identifiers');
select throws_ok($$select storage_path from public.gallery_assets$$, '42501', null, 'legacy storage paths are not browser-readable');
select throws_ok($$update public.galleries set title = 'Changed' where id = '97000000-0000-4000-8000-000000000001'$$, '42501', null, 'customer cannot mutate gallery configuration');
select lives_ok($$insert into public.gallery_selections (gallery_id, gallery_asset_id, client_id, client_profile_id, note) values ('97000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 'Retouch lightly')$$, 'Customer A can select an enabled visible asset');
select is((select count(*)::integer from public.gallery_selections), 1, 'Customer A reads only their selection');
select lives_ok($$update public.gallery_selections set submission_status = 'submitted' where gallery_asset_id = '98000000-0000-4000-8000-000000000001'$$, 'Customer A can formally submit their selection');
select ok((select submitted_at is not null from public.gallery_selections where gallery_asset_id = '98000000-0000-4000-8000-000000000001'), 'submission records its server timestamp');
select ok(not has_table_privilege('authenticated', 'public.media_processing_jobs', 'SELECT'), 'processing jobs have no authenticated direct access');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.gallery_favorites), 0, 'Customer B cannot read Customer A favorites');
select is((select count(*)::integer from public.gallery_selections), 0, 'Customer B cannot read Customer A selections');
select throws_ok($$insert into public.gallery_favorites (gallery_id, gallery_asset_id, client_id, client_profile_id) values ('97000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001')$$, '42501', null, 'Customer B cannot mutate Customer A favorites');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.galleries where id in ('97000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000002', '97000000-0000-4000-8000-000000000003')), 3, 'staff can read published and unpublished galleries');
select throws_ok($$insert into public.galleries (client_id, project_id, slug, title) values ('92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'staff-direct-write', 'Not Allowed')$$, '42501', null, 'staff browser role cannot directly write galleries');

reset role;
select throws_ok($$update public.gallery_activity set event_type = 'tampered'$$, '55000', null, 'gallery activity cannot be updated even by privileged SQL');
select throws_ok($$delete from public.gallery_activity$$, '55000', null, 'gallery activity cannot be deleted even by privileged SQL');

select * from finish();
rollback;
