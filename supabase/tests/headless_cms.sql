begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('a1000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cms-staff@test.local', '', now(), now()),
  ('a1000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cms-customer@test.local', '', now(), now());

insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards)
values ('a1000000-0000-4000-8000-00000000000a', 'admin', 'CMS Staff', true, true, true);

insert into public.website_posts (id, slug, title, excerpt, body, cover_image_r2_key, status)
values
  ('b1000000-0000-4000-8000-000000000001', 'published-post', 'Published Post', 'Visible excerpt', 'Visible body', 'website/posts/published-cover.jpg', 'published'),
  ('b1000000-0000-4000-8000-000000000002', 'draft-post', 'Draft Post', 'Hidden excerpt', 'Hidden body', 'website/posts/draft-cover.jpg', 'draft'),
  ('b1000000-0000-4000-8000-000000000003', 'flow-post', 'Flow Post', null, '', null, 'draft');

insert into public.website_collections (id, slug, title, status)
values
  ('b2000000-0000-4000-8000-000000000001', 'published-collection', 'Published Collection', 'published'),
  ('b2000000-0000-4000-8000-000000000002', 'draft-collection', 'Draft Collection', 'draft');

insert into public.website_collection_images (id, collection_id, image_r2_key, alt_text, sort_order)
values
  ('b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'website/collections/published/one.jpg', 'One', 0),
  ('b3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', 'website/collections/published/two.jpg', 'Two', 1),
  ('b3000000-0000-4000-8000-000000000003', 'b2000000-0000-4000-8000-000000000002', 'website/collections/draft/hidden.jpg', 'Hidden', 0);

insert into public.website_services (id, slug, title, summary, status)
values
  ('b4000000-0000-4000-8000-000000000001', 'published-service', 'Published Service', 'Visible summary', 'published'),
  ('b4000000-0000-4000-8000-000000000002', 'draft-service', 'Draft Service', 'Hidden summary', 'draft');

insert into public.website_pages (id, slug, title, body, status)
values
  ('b5000000-0000-4000-8000-000000000001', 'published-page', 'Published Page', 'Visible page', 'published'),
  ('b5000000-0000-4000-8000-000000000002', 'draft-page', 'Draft Page', 'Hidden page', 'draft');

-- published_at stamping ----------------------------------------

select ok((select published_at is null from public.website_posts where slug = 'draft-post'), 'draft insert leaves published_at null');
select ok((select published_at is not null from public.website_posts where slug = 'published-post'), 'published insert auto-stamps published_at');

create temp table cms_test_stamps (label text primary key, stamped_at timestamptz not null);

update public.website_posts set status = 'published' where slug = 'flow-post';
select ok((select published_at is not null from public.website_posts where slug = 'flow-post'), 'draft to published transition stamps published_at');
insert into cms_test_stamps values ('flow-first', (select published_at from public.website_posts where slug = 'flow-post'));

update public.website_posts set title = 'Flow Post Updated' where slug = 'flow-post';
select is(
  (select published_at from public.website_posts where slug = 'flow-post'),
  (select stamped_at from cms_test_stamps where label = 'flow-first'),
  'saving a published row keeps the original stamp'
);

update public.website_posts set status = 'draft' where slug = 'flow-post';
select is(
  (select published_at from public.website_posts where slug = 'flow-post'),
  (select stamped_at from cms_test_stamps where label = 'flow-first'),
  'returning to draft retains the stamp'
);

update public.website_posts set status = 'published' where slug = 'flow-post';
select is(
  (select published_at from public.website_posts where slug = 'flow-post'),
  (select stamped_at from cms_test_stamps where label = 'flow-first'),
  'republishing keeps the first stamp'
);

delete from public.website_posts where slug = 'flow-post';

-- anon: published only ------------------------------------------

set local role anon;

select is((select count(*)::integer from public.website_posts), 1, 'anon reads published posts only');
select is((select count(*)::integer from public.website_posts where slug = 'draft-post'), 0, 'anon cannot read a draft post');
select is((select count(*)::integer from public.website_collections), 1, 'anon reads published collections only');
select is((select count(*)::integer from public.website_collection_images), 2, 'anon reads images of published collections only');
select is((select count(*)::integer from public.website_collection_images where collection_id = 'b2000000-0000-4000-8000-000000000002'), 0, 'anon cannot read images of a draft collection');
select is((select count(*)::integer from public.website_services), 1, 'anon reads published services only');
select is((select count(*)::integer from public.website_pages), 1, 'anon reads published pages only');
select throws_ok($$insert into public.website_posts (slug, title) values ('anon-write', 'Nope')$$, '42501', null, 'anon cannot insert content');
select throws_ok($$update public.website_posts set title = 'Tampered'$$, '42501', null, 'anon cannot update content');

reset role;

-- authenticated non-staff (e.g. a customer): published only -----

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::integer from public.website_posts), 1, 'non-staff authenticated reads published posts only');
select throws_ok($$insert into public.website_posts (slug, title) values ('customer-write', 'Nope')$$, '42501', null, 'non-staff authenticated cannot insert content');

-- staff: full access ----------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::integer from public.website_posts), 2, 'staff reads draft and published posts');
select is((select count(*)::integer from public.website_collection_images), 3, 'staff reads images of draft collections');
select lives_ok($$insert into public.website_posts (slug, title) values ('staff-post', 'Staff Post')$$, 'staff can insert content');
select lives_ok($$update public.website_posts set status = 'published' where slug = 'staff-post'$$, 'staff can publish content');
select ok((select published_at is not null from public.website_posts where slug = 'staff-post'), 'staff publish is stamped');
select lives_ok($$delete from public.website_posts where slug = 'staff-post'$$, 'staff can delete content');

reset role;
select * from finish();
rollback;
