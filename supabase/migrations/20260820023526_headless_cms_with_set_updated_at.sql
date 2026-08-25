-- ============================================================
-- Headless CMS for kahelstudio.com
--
-- Content model for the static marketing site. The dashboard is
-- the admin layer (staff writes via service_role or staff JWT);
-- the public site build reads through the anon key, so RLS is
-- the only thing standing between drafts and the public.
--
-- Tables are prefixed `website_` because `public.services`
-- already exists (booking catalogue) and the dashboard section
-- is app/website/* reading website_portfolio_items.
--
-- Tables store R2 object keys only; images are served from the
-- public R2 custom domain, so keys are safe for anon to read.
-- ============================================================

create type public.content_status as enum ('draft', 'published');

create table public.website_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  excerpt text check (excerpt is null or length(excerpt) <= 1000),
  body text not null default '' check (length(body) <= 200000),
  cover_image_r2_key text check (
    cover_image_r2_key is null
    or (length(btrim(cover_image_r2_key)) between 1 and 1024 and cover_image_r2_key !~* '^[a-z][a-z0-9+.-]*://')
  ),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_posts_published_at_check check (status <> 'published' or published_at is not null)
);

create table public.website_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  description text check (description is null or length(description) <= 20000),
  cover_image_r2_key text check (
    cover_image_r2_key is null
    or (length(btrim(cover_image_r2_key)) between 1 and 1024 and cover_image_r2_key !~* '^[a-z][a-z0-9+.-]*://')
  ),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_collections_published_at_check check (status <> 'published' or published_at is not null)
);

create table public.website_collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.website_collections(id) on delete cascade,
  image_r2_key text not null check (
    length(btrim(image_r2_key)) between 1 and 1024 and image_r2_key !~* '^[a-z][a-z0-9+.-]*://'
  ),
  alt_text text check (alt_text is null or length(alt_text) <= 2000),
  caption text check (caption is null or length(caption) <= 10000),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  summary text check (summary is null or length(summary) <= 1000),
  body text not null default '' check (length(body) <= 200000),
  price_label text check (price_label is null or length(btrim(price_label)) <= 120),
  cover_image_r2_key text check (
    cover_image_r2_key is null
    or (length(btrim(cover_image_r2_key)) between 1 and 1024 and cover_image_r2_key !~* '^[a-z][a-z0-9+.-]*://')
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_services_published_at_check check (status <> 'published' or published_at is not null)
);

create table public.website_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 200),
  title text not null check (length(btrim(title)) between 1 and 300),
  body text not null default '' check (length(body) <= 200000),
  seo_description text check (seo_description is null or length(seo_description) <= 500),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_pages_published_at_check check (status <> 'published' or published_at is not null)
);

-- updated_at -------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- published_at -----------------------------------------------
-- Stamped once, on the first draft -> published transition.
-- Uses clock_timestamp() (real event time) rather than now()
-- (transaction time) so republishes in one transaction stay
-- distinguishable; an existing stamp is never overwritten or
-- cleared, even if the row returns to draft.

create or replace function public.set_content_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := case
      when tg_op = 'UPDATE' then coalesce(old.published_at, clock_timestamp())
      else clock_timestamp()
    end;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'website_posts', 'website_collections', 'website_collection_images',
    'website_services', 'website_pages'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'website_posts', 'website_collections', 'website_services', 'website_pages'
  ] loop
    execute format(
      'create trigger set_content_published_at before insert or update of status, published_at on public.%I for each row execute function public.set_content_published_at()',
      table_name
    );
  end loop;
end;
$$;

-- Read-path indexes -------------------------------------------

create index website_posts_public_idx on public.website_posts(published_at desc) where status = 'published';
create index website_collections_public_idx on public.website_collections(published_at desc) where status = 'published';
create index website_services_public_idx on public.website_services(sort_order) where status = 'published';
create index website_pages_public_idx on public.website_pages(slug) where status = 'published';
create index website_collection_images_collection_idx on public.website_collection_images(collection_id, sort_order);

-- RLS ----------------------------------------------------------
-- anon / non-staff authenticated: published rows only.
-- website_collection_images inherit the parent collection's
-- status, so images of a draft collection are never reachable.
-- Staff (active staff_profiles row) get full access.
-- service_role bypasses RLS for dashboard server writes.

alter table public.website_posts enable row level security;
alter table public.website_collections enable row level security;
alter table public.website_collection_images enable row level security;
alter table public.website_services enable row level security;
alter table public.website_pages enable row level security;

create policy website_posts_public_read on public.website_posts
  for select to anon, authenticated
  using (status = 'published');
create policy website_posts_staff_all on public.website_posts
  for all to authenticated
  using (public.loyalty_is_staff())
  with check (public.loyalty_is_staff());

create policy website_collections_public_read on public.website_collections
  for select to anon, authenticated
  using (status = 'published');
create policy website_collections_staff_all on public.website_collections
  for all to authenticated
  using (public.loyalty_is_staff())
  with check (public.loyalty_is_staff());

create policy website_collection_images_public_read on public.website_collection_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.website_collections c
      where c.id = collection_id and c.status = 'published'
    )
  );
create policy website_collection_images_staff_all on public.website_collection_images
  for all to authenticated
  using (public.loyalty_is_staff())
  with check (public.loyalty_is_staff());

create policy website_services_public_read on public.website_services
  for select to anon, authenticated
  using (status = 'published');
create policy website_services_staff_all on public.website_services
  for all to authenticated
  using (public.loyalty_is_staff())
  with check (public.loyalty_is_staff());

create policy website_pages_public_read on public.website_pages
  for select to anon, authenticated
  using (status = 'published');
create policy website_pages_staff_all on public.website_pages
  for all to authenticated
  using (public.loyalty_is_staff())
  with check (public.loyalty_is_staff());

-- Privileges ----------------------------------------------------
-- Supabase default privileges auto-grant DML to anon and
-- authenticated on new tables; revoke, then grant deliberately.

revoke all on table public.website_posts, public.website_collections,
  public.website_collection_images, public.website_services, public.website_pages
  from anon, authenticated;

grant select on table public.website_posts, public.website_collections,
  public.website_collection_images, public.website_services, public.website_pages
  to anon;
grant select, insert, update, delete on table public.website_posts,
  public.website_collections, public.website_collection_images,
  public.website_services, public.website_pages
  to authenticated;
grant all on table public.website_posts, public.website_collections,
  public.website_collection_images, public.website_services, public.website_pages
  to service_role;

revoke all on function public.set_updated_at(), public.set_content_published_at()
  from public, anon, authenticated;

comment on table public.website_posts is 'Headless CMS blog posts for kahelstudio.com; anon reads published rows only.';
comment on table public.website_collections is 'Headless CMS portfolio collections; child images inherit publication status.';
comment on table public.website_collection_images is 'Ordered images for a collection; R2 keys served from the public custom domain.';
comment on table public.website_services is 'Headless CMS marketing services; distinct from the operational booking catalogue (public.services).';
comment on table public.website_pages is 'Headless CMS standalone pages for kahelstudio.com; anon reads published rows only.';
comment on column public.website_posts.published_at is 'Stamped once on first publish; retained when the row returns to draft.';
comment on column public.website_collections.published_at is 'Stamped once on first publish; retained when the row returns to draft.';
comment on column public.website_services.published_at is 'Stamped once on first publish; retained when the row returns to draft.';
comment on column public.website_pages.published_at is 'Stamped once on first publish; retained when the row returns to draft.';
