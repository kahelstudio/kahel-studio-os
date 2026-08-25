begin;

drop table if exists public.website_collection_images;
drop table if exists public.website_posts;
drop table if exists public.website_collections;
drop table if exists public.website_services;
drop table if exists public.website_pages;

drop function if exists public.set_updated_at();
drop function if exists public.set_content_published_at();

drop type if exists public.content_status;

commit;
