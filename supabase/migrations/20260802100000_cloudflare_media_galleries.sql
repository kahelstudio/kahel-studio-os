-- Canonical media and gallery delivery model. R2 identifiers and operational
-- tables are intentionally available only to trusted server roles.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  project_id uuid,
  private_r2_key text check (private_r2_key is null or (length(btrim(private_r2_key)) between 1 and 1024 and private_r2_key !~* '^[a-z][a-z0-9+.-]*://')),
  public_r2_key text check (public_r2_key is null or (length(btrim(public_r2_key)) between 1 and 1024 and public_r2_key !~* '^[a-z][a-z0-9+.-]*://')),
  cloudflare_image_id text check (cloudflare_image_id is null or length(btrim(cloudflare_image_id)) between 1 and 255),
  original_filename text not null check (length(btrim(original_filename)) between 1 and 500),
  original_extension text check (original_extension is null or original_extension ~ '^[A-Za-z0-9]{1,16}$'),
  mime_type text not null check (mime_type ~ '^[A-Za-z0-9][A-Za-z0-9.+-]*/[A-Za-z0-9][A-Za-z0-9.+-]*$'),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  aspect_ratio numeric(12, 8) check (aspect_ratio is null or aspect_ratio > 0),
  focal_x numeric(7, 6) check (focal_x is null or focal_x between 0 and 1),
  focal_y numeric(7, 6) check (focal_y is null or focal_y between 0 and 1),
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  alt_text text check (alt_text is null or length(alt_text) <= 2000),
  decorative boolean not null default false,
  caption text check (caption is null or length(caption) <= 10000),
  usage_type text not null default 'gallery' check (usage_type in ('website', 'portfolio', 'service', 'team', 'campaign', 'original', 'gallery', 'cover', 'thumbnail', 'download', 'archive')),
  visibility text not null default 'private' check (visibility in ('private', 'gallery', 'public')),
  status text not null default 'uploading' check (status in ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'archived')),
  processing_failure_code text,
  processing_failure_message text,
  source_asset_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz,
  processed_at timestamptz,
  dominant_color text check (dominant_color is null or dominant_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint media_assets_id_client_id_key unique (id, client_id),
  constraint media_assets_source_client_fkey foreign key (source_asset_id, client_id)
    references public.media_assets(id, client_id) on delete restrict,
  constraint media_assets_source_fkey foreign key (source_asset_id)
    references public.media_assets(id) on delete restrict,
  constraint media_assets_source_check check (source_asset_id is null or source_asset_id <> id),
  constraint media_assets_project_requires_client_check check (project_id is null or client_id is not null),
  constraint media_assets_dimensions_check check ((width is null) = (height is null)),
  constraint media_assets_focal_check check ((focal_x is null) = (focal_y is null)),
  constraint media_assets_public_alt_check check (
    visibility <> 'public' or status <> 'ready' or decorative or length(btrim(coalesce(alt_text, ''))) > 0
  ),
  constraint media_assets_failure_check check (
    (status = 'failed' and length(btrim(coalesce(processing_failure_message, ''))) > 0)
    or (status <> 'failed' and processing_failure_code is null and processing_failure_message is null)
  )
);

alter table public.staff_profiles
  add column can_manage_galleries boolean not null default false;

update public.staff_profiles
set can_manage_galleries = true
where role in ('super_admin', 'admin');

alter table public.galleries drop constraint galleries_publish_check;
alter table public.galleries
  add column booking_id uuid,
  add column status text not null default 'draft',
  add column access_rule text not null default 'client_only',
  add column downloads_enabled boolean not null default false,
  add column favorites_enabled boolean not null default true,
  add column selections_enabled boolean not null default true,
  add column watermark_enabled boolean not null default true,
  add column expires_at timestamptz,
  add column session_date date,
  add column cover_media_asset_id uuid,
  add column created_by uuid references auth.users(id) on delete set null,
  add constraint galleries_status_check check (status in ('draft', 'processing', 'ready', 'published', 'archived', 'expired')),
  add constraint galleries_access_rule_check check (access_rule in ('client_only', 'client_profiles', 'staff_only')),
  add constraint galleries_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  add constraint galleries_cover_client_fkey foreign key (cover_media_asset_id, client_id)
    references public.media_assets(id, client_id) on delete restrict,
  add constraint galleries_id_client_id_key unique (id, client_id),
  add constraint galleries_expiry_check check (expires_at is null or expires_at > created_at);

update public.galleries
set status = case when published then 'published' else 'draft' end;

create or replace function public.synchronize_gallery_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.published then new.status := 'published'; end if;
  elsif new.status is not distinct from old.status
        and new.published is distinct from old.published then
    new.status := case when new.published then 'published' else 'ready' end;
  end if;

  new.published := new.status = 'published';
  new.published_at := case
    when new.status = 'published' then coalesce(new.published_at, now())
    else null
  end;
  return new;
end;
$$;

drop trigger if exists synchronize_gallery_publication on public.galleries;
create trigger synchronize_gallery_publication
before insert or update of status, published, published_at on public.galleries
for each row execute function public.synchronize_gallery_publication();

alter table public.gallery_assets
  add column client_id uuid,
  add column media_asset_id uuid,
  add column visibility text not null default 'gallery',
  add column approval_status text not null default 'pending',
  add column downloadable boolean not null default false,
  add column download_variant text not null default 'watermarked',
  add column caption text,
  add constraint gallery_assets_visibility_check check (visibility in ('gallery', 'hidden')),
  add constraint gallery_assets_approval_check check (approval_status in ('pending', 'approved', 'rejected')),
  add constraint gallery_assets_download_variant_check check (download_variant in ('original', 'web', 'watermarked')),
  add constraint gallery_assets_caption_check check (caption is null or length(caption) <= 10000);

update public.gallery_assets ga
set client_id = g.client_id
from public.galleries g
where g.id = ga.gallery_id;

alter table public.gallery_assets alter column client_id set not null;
alter table public.gallery_assets drop constraint gallery_assets_gallery_id_fkey;
alter table public.gallery_assets
  add constraint gallery_assets_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete cascade,
  add constraint gallery_assets_media_client_fkey foreign key (media_asset_id, client_id)
    references public.media_assets(id, client_id) on delete restrict,
  add constraint gallery_assets_id_gallery_client_key unique (id, gallery_id, client_id);

create unique index gallery_assets_gallery_media_key
  on public.gallery_assets(gallery_id, media_asset_id) where media_asset_id is not null;

create table public.gallery_favorites (
  gallery_id uuid not null,
  gallery_asset_id uuid not null,
  client_id uuid not null,
  client_profile_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (gallery_id, client_profile_id, gallery_asset_id),
  constraint gallery_favorites_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete cascade,
  constraint gallery_favorites_asset_gallery_client_fkey foreign key (gallery_asset_id, gallery_id, client_id)
    references public.gallery_assets(id, gallery_id, client_id) on delete cascade,
  constraint gallery_favorites_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete cascade
);

create table public.gallery_selections (
  gallery_id uuid not null,
  gallery_asset_id uuid not null,
  client_id uuid not null,
  client_profile_id uuid not null,
  submission_status text not null default 'draft' check (submission_status in ('draft', 'submitted')),
  note text check (note is null or length(note) <= 2000),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (gallery_id, client_profile_id, gallery_asset_id),
  constraint gallery_selections_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete cascade,
  constraint gallery_selections_asset_gallery_client_fkey foreign key (gallery_asset_id, gallery_id, client_id)
    references public.gallery_assets(id, gallery_id, client_id) on delete cascade,
  constraint gallery_selections_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete cascade,
  constraint gallery_selections_submission_check check (
    (submission_status = 'draft' and submitted_at is null)
    or (submission_status = 'submitted' and submitted_at is not null)
  )
);

create table public.gallery_activity (
  id bigint generated always as identity primary key,
  gallery_id uuid not null,
  client_id uuid not null,
  client_profile_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (length(btrim(event_type)) between 1 and 120),
  gallery_asset_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint gallery_activity_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete restrict,
  constraint gallery_activity_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint gallery_activity_asset_gallery_client_fkey foreign key (gallery_asset_id, gallery_id, client_id)
    references public.gallery_assets(id, gallery_id, client_id) on delete restrict
);

create table public.media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  project_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  upload_token_hash text not null unique check (upload_token_hash ~ '^[0-9a-f]{64}$'),
  expected_mime_type text,
  expected_byte_size bigint check (expected_byte_size is null or expected_byte_size >= 0),
  private_r2_key text not null check (length(btrim(private_r2_key)) between 1 and 1024),
  status text not null default 'pending' check (status in ('pending', 'uploading', 'completed', 'expired', 'failed')),
  expires_at timestamptz not null,
  completed_asset_id uuid,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_upload_sessions_project_client_fkey foreign key (project_id, client_id)
    references public.projects(id, client_id) on delete restrict,
  constraint media_upload_sessions_asset_client_fkey foreign key (completed_asset_id, client_id)
    references public.media_assets(id, client_id) on delete restrict,
  constraint media_upload_sessions_asset_fkey foreign key (completed_asset_id)
    references public.media_assets(id) on delete restrict,
  constraint media_upload_sessions_expiry_check check (expires_at > created_at),
  constraint media_upload_sessions_project_requires_client_check check (project_id is null or client_id is not null)
);

create table public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null,
  client_id uuid,
  job_type text not null check (length(btrim(job_type)) between 1 and 120),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 250),
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  finished_at timestamptz,
  last_error text,
  input jsonb not null default '{}'::jsonb check (jsonb_typeof(input) = 'object'),
  output jsonb check (output is null or jsonb_typeof(output) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_processing_jobs_asset_client_fkey foreign key (media_asset_id, client_id)
    references public.media_assets(id, client_id) on delete cascade,
  constraint media_processing_jobs_asset_fkey foreign key (media_asset_id)
    references public.media_assets(id) on delete cascade,
  constraint media_processing_jobs_finish_check check ((status in ('succeeded', 'failed', 'cancelled')) = (finished_at is not null))
);

create table public.gallery_download_archives (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null,
  client_id uuid not null,
  requested_by_profile_id uuid,
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 250),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed', 'expired')),
  private_r2_key text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  expires_at timestamptz,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_download_archives_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete cascade,
  constraint gallery_download_archives_profile_client_fkey foreign key (requested_by_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint gallery_download_archives_ready_check check (status <> 'ready' or (private_r2_key is not null and expires_at is not null))
);

create table public.gallery_email_outbox (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null,
  client_id uuid not null,
  recipient_profile_id uuid not null,
  template_key text not null check (length(btrim(template_key)) between 1 and 120),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 250),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_email_outbox_gallery_client_fkey foreign key (gallery_id, client_id)
    references public.galleries(id, client_id) on delete cascade,
  constraint gallery_email_outbox_profile_client_fkey foreign key (recipient_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint gallery_email_outbox_sent_check check (status <> 'sent' or sent_at is not null)
);

create index media_assets_client_project_idx on public.media_assets(client_id, project_id, created_at desc);
create index media_assets_processing_idx on public.media_assets(status, created_at) where status in ('uploaded', 'processing', 'failed');
create unique index media_assets_private_r2_key_key on public.media_assets(private_r2_key) where private_r2_key is not null;
create unique index media_assets_public_r2_key_key on public.media_assets(public_r2_key) where public_r2_key is not null;
create unique index media_assets_cloudflare_image_id_key on public.media_assets(cloudflare_image_id) where cloudflare_image_id is not null;
create index galleries_booking_id_idx on public.galleries(booking_id) where booking_id is not null;
create index galleries_customer_delivery_idx on public.galleries(client_id, status, expires_at) where status = 'published';
create index gallery_assets_delivery_idx on public.gallery_assets(gallery_id, approval_status, visibility, sort_order);
create index gallery_favorites_profile_idx on public.gallery_favorites(client_profile_id, created_at desc);
create index gallery_selections_profile_status_idx on public.gallery_selections(client_profile_id, gallery_id, submission_status);
create index gallery_activity_gallery_created_idx on public.gallery_activity(gallery_id, created_at desc);
create index media_upload_sessions_expiry_idx on public.media_upload_sessions(expires_at) where status in ('pending', 'uploading');
create index media_processing_jobs_claim_idx on public.media_processing_jobs(available_at, created_at) where status in ('pending', 'failed');
create index gallery_download_archives_gallery_idx on public.gallery_download_archives(gallery_id, created_at desc);
create index gallery_email_outbox_claim_idx on public.gallery_email_outbox(available_at, created_at) where status in ('pending', 'failed');

create or replace function public.gallery_customer_has_profile(requested_profile_id uuid, requested_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.client_profiles p
    where p.id = requested_profile_id and p.client_id = requested_client_id
      and p.user_id = auth.uid() and p.status = 'active'
  );
$$;

create or replace function public.gallery_customer_can_access(requested_gallery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.galleries g
    where g.id = requested_gallery_id and g.status = 'published' and g.published
      and g.access_rule in ('client_only', 'client_profiles')
      and (g.expires_at is null or g.expires_at > now())
      and public.customer_owns_client(g.client_id)
  );
$$;

create or replace function public.gallery_media_customer_can_read(requested_media_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gallery_assets ga
    where ga.media_asset_id = requested_media_asset_id
      and ga.visibility = 'gallery' and ga.approval_status = 'approved'
      and public.gallery_customer_can_access(ga.gallery_id)
  );
$$;

create or replace function public.set_gallery_selection_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.submission_status = 'submitted' then
    new.submitted_at := coalesce(new.submitted_at, now());
  else
    new.submitted_at := null;
  end if;
  return new;
end;
$$;

create trigger set_gallery_selection_submission
before insert or update of submission_status on public.gallery_selections
for each row execute function public.set_gallery_selection_submission();

create or replace function public.prevent_gallery_activity_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'gallery activity is append-only' using errcode = '55000';
end;
$$;

create trigger gallery_activity_append_only
before update or delete on public.gallery_activity
for each row execute function public.prevent_gallery_activity_mutation();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'media_assets', 'gallery_selections', 'media_upload_sessions',
    'media_processing_jobs', 'gallery_download_archives', 'gallery_email_outbox'
  ] loop
    execute format(
      'create trigger set_customer_updated_at before update on public.%I for each row execute function public.set_customer_updated_at()',
      table_name
    );
  end loop;
end;
$$;

alter table public.media_assets enable row level security;
alter table public.gallery_favorites enable row level security;
alter table public.gallery_selections enable row level security;
alter table public.gallery_activity enable row level security;
alter table public.media_upload_sessions enable row level security;
alter table public.media_processing_jobs enable row level security;
alter table public.gallery_download_archives enable row level security;
alter table public.gallery_email_outbox enable row level security;

drop policy if exists galleries_select_own_published on public.galleries;
drop policy if exists galleries_customer_read on public.galleries;
create policy galleries_customer_read on public.galleries
for select to authenticated
using (public.gallery_customer_can_access(id));
drop policy if exists galleries_staff_read on public.galleries;
create policy galleries_staff_read on public.galleries
for select to authenticated
using (public.loyalty_is_staff());

drop policy if exists gallery_assets_select_through_published_gallery on public.gallery_assets;
drop policy if exists gallery_assets_customer_read on public.gallery_assets;
create policy gallery_assets_customer_read on public.gallery_assets
for select to authenticated
using (visibility = 'gallery' and approval_status = 'approved' and public.gallery_customer_can_access(gallery_id));
drop policy if exists gallery_assets_staff_read on public.gallery_assets;
create policy gallery_assets_staff_read on public.gallery_assets
for select to authenticated
using (public.loyalty_is_staff());

create policy media_assets_customer_read on public.media_assets
for select to authenticated
using (public.gallery_media_customer_can_read(id));
create policy media_assets_staff_read on public.media_assets
for select to authenticated
using (public.loyalty_is_staff());

create policy gallery_favorites_customer_read on public.gallery_favorites
for select to authenticated
using (public.gallery_customer_has_profile(client_profile_id, client_id) and public.gallery_customer_can_access(gallery_id));
create policy gallery_favorites_customer_insert on public.gallery_favorites
for insert to authenticated
with check (
  public.gallery_customer_has_profile(client_profile_id, client_id)
  and public.gallery_customer_can_access(gallery_id)
  and exists (select 1 from public.galleries g where g.id = gallery_id and g.favorites_enabled)
  and exists (select 1 from public.gallery_assets ga where ga.id = gallery_asset_id and ga.visibility = 'gallery' and ga.approval_status = 'approved')
);
create policy gallery_favorites_customer_delete on public.gallery_favorites
for delete to authenticated
using (
  public.gallery_customer_has_profile(client_profile_id, client_id)
  and public.gallery_customer_can_access(gallery_id)
  and exists (select 1 from public.galleries g where g.id = gallery_id and g.favorites_enabled)
);
create policy gallery_favorites_staff_read on public.gallery_favorites
for select to authenticated using (public.loyalty_is_staff());

create policy gallery_selections_customer_read on public.gallery_selections
for select to authenticated
using (public.gallery_customer_has_profile(client_profile_id, client_id) and public.gallery_customer_can_access(gallery_id));
create policy gallery_selections_customer_insert on public.gallery_selections
for insert to authenticated
with check (
  public.gallery_customer_has_profile(client_profile_id, client_id)
  and public.gallery_customer_can_access(gallery_id)
  and exists (select 1 from public.galleries g where g.id = gallery_id and g.selections_enabled)
  and exists (select 1 from public.gallery_assets ga where ga.id = gallery_asset_id and ga.visibility = 'gallery' and ga.approval_status = 'approved')
);
create policy gallery_selections_customer_update on public.gallery_selections
for update to authenticated
using (public.gallery_customer_has_profile(client_profile_id, client_id) and public.gallery_customer_can_access(gallery_id))
with check (
  public.gallery_customer_has_profile(client_profile_id, client_id)
  and public.gallery_customer_can_access(gallery_id)
  and exists (select 1 from public.galleries g where g.id = gallery_id and g.selections_enabled)
);
create policy gallery_selections_customer_delete on public.gallery_selections
for delete to authenticated
using (
  submission_status = 'draft'
  and public.gallery_customer_has_profile(client_profile_id, client_id)
  and public.gallery_customer_can_access(gallery_id)
  and exists (select 1 from public.galleries g where g.id = gallery_id and g.selections_enabled)
);
create policy gallery_selections_staff_read on public.gallery_selections
for select to authenticated using (public.loyalty_is_staff());

create policy gallery_activity_staff_read on public.gallery_activity
for select to authenticated using (public.loyalty_is_staff());

-- Replace earlier broad grants because storage_path is a legacy object key.
revoke all on table public.galleries, public.gallery_assets from anon, authenticated;
revoke all on table public.media_assets, public.gallery_favorites, public.gallery_selections,
  public.gallery_activity, public.media_upload_sessions, public.media_processing_jobs,
  public.gallery_download_archives, public.gallery_email_outbox from anon, authenticated;

grant select on table public.galleries to authenticated;
grant select (id, gallery_id, client_id, media_asset_id, asset_type, title, alt_text,
  sort_order, width, height, visibility, approval_status, downloadable,
  download_variant, caption, created_at, updated_at)
  on public.gallery_assets to authenticated;
grant select (id, client_id, project_id, original_filename, original_extension,
  mime_type, byte_size, width, height, aspect_ratio, focal_x, focal_y,
  checksum_sha256, alt_text, decorative, caption, usage_type, visibility, status,
  dominant_color,
  source_asset_id, uploaded_at, processed_at, created_at, updated_at)
  on public.media_assets to authenticated;
grant select, delete on table public.gallery_favorites to authenticated;
grant insert (gallery_id, gallery_asset_id, client_id, client_profile_id)
  on public.gallery_favorites to authenticated;
grant select, delete on table public.gallery_selections to authenticated;
grant insert (gallery_id, gallery_asset_id, client_id, client_profile_id, submission_status, note)
  on public.gallery_selections to authenticated;
grant update (submission_status, note) on table public.gallery_selections to authenticated;
grant select on table public.gallery_activity to authenticated;

grant all on table public.media_assets, public.galleries, public.gallery_assets,
  public.gallery_favorites, public.gallery_selections, public.gallery_activity,
  public.media_upload_sessions, public.media_processing_jobs,
  public.gallery_download_archives, public.gallery_email_outbox to service_role;
grant usage, select on sequence public.gallery_activity_id_seq to service_role;

revoke all on function public.synchronize_gallery_publication(),
  public.gallery_customer_has_profile(uuid, uuid),
  public.gallery_customer_can_access(uuid),
  public.gallery_media_customer_can_read(uuid),
  public.set_gallery_selection_submission(),
  public.prevent_gallery_activity_mutation()
  from public, anon, authenticated;
grant execute on function public.gallery_customer_has_profile(uuid, uuid),
  public.gallery_customer_can_access(uuid),
  public.gallery_media_customer_can_read(uuid)
  to authenticated;

comment on table public.media_assets is 'Canonical media metadata; R2 keys and Cloudflare image identifiers are server-only.';
comment on column public.gallery_assets.storage_path is 'Legacy storage compatibility only; never granted to customer or staff browser roles.';
comment on table public.gallery_activity is 'Append-only gallery event ledger written by trusted server operations.';
comment on table public.media_upload_sessions is 'Private server-only upload coordination; contains upload credentials and R2 keys.';
