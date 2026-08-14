-- Versioned booking terms, binding acceptance evidence, and optional consent.
-- All writes are performed by narrowly granted service-role RPCs.

create type public.legal_document_version_state as enum (
  'draft', 'under_review', 'approved', 'published', 'superseded', 'withdrawn'
);
create type public.booking_agreement_requirement_status as enum ('unavailable', 'pending', 'accepted');
create type public.agreement_acceptance_method as enum ('checkbox', 'electronic_signature', 'staff_assisted', 'imported');
create type public.consent_purpose as enum ('marketing', 'portfolio', 'privacy_acknowledgment');

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null unique check (document_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text check (description is null or length(btrim(description)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  legal_document_id uuid not null references public.legal_documents(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  version_label text not null check (length(btrim(version_label)) between 1 and 50),
  title text not null check (length(btrim(title)) between 1 and 200),
  summary jsonb not null check (jsonb_typeof(summary) = 'array'),
  effective_date date,
  state public.legal_document_version_state not null default 'draft',
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  change_summary text not null check (length(btrim(change_summary)) between 1 and 1000),
  created_by uuid references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  published_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legal_document_id, version_number),
  unique (id, legal_document_id),
  constraint legal_document_versions_approval_check check (
    (state in ('draft', 'under_review') and approved_by is null and approved_at is null and published_by is null and published_at is null)
    or (state = 'approved' and approved_by is not null and approved_at is not null and published_by is null and published_at is null)
    or (state in ('published', 'superseded', 'withdrawn') and approved_by is not null and approved_at is not null and published_by is not null and published_at is not null)
  )
);

-- The publication RPC replaces the previous row under an advisory lock. This
-- index remains the final database guard against concurrent current versions.
create unique index legal_document_versions_one_published_idx
  on public.legal_document_versions(legal_document_id) where state = 'published';
create index legal_document_versions_document_history_idx
  on public.legal_document_versions(legal_document_id, version_number desc);

create table public.agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  client_profile_id uuid not null,
  accepted_by_user_id uuid references auth.users(id) on delete restrict,
  legal_document_version_id uuid not null references public.legal_document_versions(id) on delete restrict,
  legal_document_id uuid not null references public.legal_documents(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  method public.agreement_acceptance_method not null,
  source text not null check (length(btrim(source)) between 1 and 100),
  environment text not null check (environment in ('production', 'staging', 'development', 'test')),
  locale text check (locale is null or length(btrim(locale)) between 2 and 35),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 8 and 200),
  booking_snapshot jsonb not null check (jsonb_typeof(booking_snapshot) = 'object'),
  client_snapshot jsonb not null check (jsonb_typeof(client_snapshot) = 'object'),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  user_snapshot jsonb not null check (jsonb_typeof(user_snapshot) = 'object'),
  booking_summary jsonb not null check (jsonb_typeof(booking_summary) = 'object'),
  booking_summary_hash text not null check (booking_summary_hash ~ '^[0-9a-f]{64}$'),
  evidence_metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(evidence_metadata) = 'object' and octet_length(evidence_metadata::text) <= 2000
  ),
  created_at timestamptz not null default now(),
  constraint agreement_acceptances_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint agreement_acceptances_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint agreement_acceptances_version_document_fkey foreign key (legal_document_version_id, legal_document_id)
    references public.legal_document_versions(id, legal_document_id) on delete restrict,
  unique (booking_id, legal_document_version_id),
  unique (booking_id, idempotency_key),
  unique (id, booking_id)
);

create index agreement_acceptances_client_created_idx
  on public.agreement_acceptances(client_id, accepted_at desc);
create index agreement_acceptances_version_idx
  on public.agreement_acceptances(legal_document_version_id);

create table public.booking_agreement_requirements (
  booking_id uuid primary key,
  client_id uuid not null references public.clients(id) on delete restrict,
  legal_document_version_id uuid references public.legal_document_versions(id) on delete restrict,
  status public.booking_agreement_requirement_status not null,
  acceptance_id uuid,
  required_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_agreement_requirements_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint booking_agreement_requirements_acceptance_booking_fkey foreign key (acceptance_id, booking_id)
    references public.agreement_acceptances(id, booking_id) on delete restrict,
  constraint booking_agreement_requirements_state_check check (
    (status = 'unavailable' and legal_document_version_id is null and acceptance_id is null and required_at is null and accepted_at is null)
    or (status = 'pending' and legal_document_version_id is not null and acceptance_id is null and required_at is not null and accepted_at is null)
    or (status = 'accepted' and legal_document_version_id is not null and acceptance_id is not null and required_at is not null and accepted_at is not null)
  )
);

create index booking_agreement_requirements_client_status_idx
  on public.booking_agreement_requirements(client_id, status);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  client_profile_id uuid not null,
  user_id uuid references auth.users(id) on delete restrict,
  purpose public.consent_purpose not null,
  selected boolean not null,
  recorded_at timestamptz not null default now(),
  source text not null check (length(btrim(source)) between 1 and 100),
  locale text check (locale is null or length(btrim(locale)) between 2 and 35),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 8 and 200),
  selection_metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(selection_metadata) = 'object' and octet_length(selection_metadata::text) <= 2000
  ),
  withdrawal_of uuid references public.consent_records(id) on delete restrict,
  withdrawal_metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(withdrawal_metadata) = 'object' and octet_length(withdrawal_metadata::text) <= 2000
  ),
  constraint consent_records_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint consent_records_profile_client_fkey foreign key (client_profile_id, client_id)
    references public.client_profiles(id, client_id) on delete restrict,
  constraint consent_records_selection_check check (
    (selected and withdrawal_of is null and withdrawal_metadata = '{}'::jsonb)
    or (not selected and withdrawal_of is not null)
  ),
  unique (booking_id, purpose, idempotency_key)
);

create index consent_records_client_recorded_idx on public.consent_records(client_id, recorded_at desc);
create index consent_records_booking_purpose_idx on public.consent_records(booking_id, purpose, recorded_at desc);

create or replace function public.booking_terms_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.staff_profiles where user_id = auth.uid() and active
  );
$$;

create or replace function public.prevent_booking_terms_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% records are append-only', tg_table_name using errcode = '55000';
end;
$$;

create or replace function public.enforce_legal_version_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.state in ('published', 'superseded', 'withdrawn') then
      raise exception 'published legal document versions cannot be deleted' using errcode = '55000';
    end if;
    return old;
  end if;

  if old.state in ('published', 'superseded', 'withdrawn') and (
    new.legal_document_id is distinct from old.legal_document_id
    or new.version_number is distinct from old.version_number
    or new.version_label is distinct from old.version_label
    or new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.effective_date is distinct from old.effective_date
    or new.content is distinct from old.content
    or new.content_hash is distinct from old.content_hash
    or new.change_summary is distinct from old.change_summary
    or new.created_by is distinct from old.created_by
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.published_by is distinct from old.published_by
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'published legal document version content and provenance are immutable' using errcode = '55000';
  end if;

  if old.state in ('superseded', 'withdrawn') and new.state is distinct from old.state then
    raise exception 'final legal document version state is immutable' using errcode = '55000';
  end if;
  if old.state = 'published' and new.state not in ('published', 'superseded', 'withdrawn') then
    raise exception 'invalid published legal document transition' using errcode = '55000';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger enforce_legal_version_immutability
before update or delete on public.legal_document_versions
for each row execute function public.enforce_legal_version_immutability();
create trigger prevent_agreement_acceptance_mutation
before update or delete on public.agreement_acceptances
for each row execute function public.prevent_booking_terms_append_only_mutation();
create trigger prevent_consent_record_mutation
before update or delete on public.consent_records
for each row execute function public.prevent_booking_terms_append_only_mutation();

create or replace function public.initialize_booking_agreement_requirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version_id uuid;
begin
  select version.id into current_version_id
  from public.legal_document_versions version
  join public.legal_documents document on document.id = version.legal_document_id
  where document.document_key = 'booking_terms' and version.state = 'published'
    and version.effective_date <= current_date;

  insert into public.booking_agreement_requirements (
    booking_id, client_id, legal_document_version_id, status, required_at
  ) values (
    new.id, new.client_id, current_version_id,
    (case when current_version_id is null then 'unavailable' else 'pending' end)::public.booking_agreement_requirement_status,
    case when current_version_id is null then null else now() end
  );
  return new;
end;
$$;

create trigger initialize_booking_agreement_requirement
after insert on public.bookings
for each row execute function public.initialize_booking_agreement_requirement();

create or replace function public.legal_document_create_version(
  requested_document_key text,
  requested_content jsonb,
  requested_actor_user_id uuid,
  requested_change_summary text
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  document_id uuid;
  next_version integer;
  result public.legal_document_versions%rowtype;
  actor_name text;
begin
  select document.id into document_id from public.legal_documents document
  where document.document_key = requested_document_key;
  if document_id is null then raise exception 'legal document not found' using errcode = 'P0002'; end if;
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if jsonb_typeof(requested_content) <> 'object'
     or length(btrim(coalesce(requested_content ->> 'version_label', ''))) = 0
     or length(btrim(coalesce(requested_content ->> 'title', ''))) = 0
     or jsonb_typeof(requested_content -> 'summary') <> 'array'
     or length(btrim(coalesce(requested_change_summary, ''))) = 0 then
    raise exception 'content and change summary are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(document_id::text, 0));
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.legal_document_versions where legal_document_id = document_id;
  insert into public.legal_document_versions (
    legal_document_id, version_number, version_label, title, summary, effective_date,
    content, content_hash, change_summary, created_by
  ) values (
    document_id, next_version, btrim(requested_content ->> 'version_label'),
    btrim(requested_content ->> 'title'), requested_content -> 'summary',
    nullif(requested_content ->> 'effective_date', '')::date, requested_content,
    encode(sha256(convert_to(requested_content::text, 'UTF8')), 'hex'),
    btrim(requested_change_summary), requested_actor_user_id
  ) returning * into result;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Created legal document draft', 'documents',
    'legal_document_version', result.id, jsonb_build_object('document_key', requested_document_key, 'version_number', next_version));
  return result;
end;
$$;

create or replace function public.legal_document_update_draft(
  requested_version_id uuid,
  requested_content jsonb,
  requested_actor_user_id uuid,
  requested_change_summary text
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_row public.legal_document_versions%rowtype;
  result public.legal_document_versions%rowtype;
  actor_name text;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if jsonb_typeof(requested_content) <> 'object'
     or length(btrim(coalesce(requested_content ->> 'version_label', ''))) = 0
     or length(btrim(coalesce(requested_content ->> 'title', ''))) = 0
     or jsonb_typeof(requested_content -> 'summary') <> 'array'
     or length(btrim(coalesce(requested_change_summary, ''))) = 0 then
    raise exception 'content and change summary are required' using errcode = '22023';
  end if;
  select * into previous_row from public.legal_document_versions where id = requested_version_id for update;
  if not found then raise exception 'legal document version not found' using errcode = 'P0002'; end if;
  if previous_row.state <> 'draft' then raise exception 'only draft content is editable' using errcode = '55000'; end if;
  update public.legal_document_versions set
    version_label = btrim(requested_content ->> 'version_label'),
    title = btrim(requested_content ->> 'title'),
    summary = requested_content -> 'summary',
    effective_date = nullif(requested_content ->> 'effective_date', '')::date,
    content = requested_content,
    content_hash = encode(sha256(convert_to(requested_content::text, 'UTF8')), 'hex'),
    change_summary = btrim(requested_change_summary)
  where id = requested_version_id returning * into result;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Updated legal document draft', 'documents',
    'legal_document_version', result.id, jsonb_build_object('version_number', result.version_number));
  return result;
end;
$$;

create or replace function public.legal_document_transition(
  requested_version_id uuid,
  requested_state public.legal_document_version_state,
  requested_actor_user_id uuid,
  requested_reason text
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_row public.legal_document_versions%rowtype;
  result public.legal_document_versions%rowtype;
  actor_name text;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if length(btrim(coalesce(requested_reason, ''))) = 0 then
    raise exception 'transition reason is required' using errcode = '22023';
  end if;
  select * into previous_row from public.legal_document_versions where id = requested_version_id for update;
  if not found then raise exception 'legal document version not found' using errcode = 'P0002'; end if;
  if not (
    (previous_row.state = 'draft' and requested_state = 'under_review')
    or (previous_row.state = 'under_review' and requested_state in ('draft', 'approved'))
    or (previous_row.state = 'approved' and requested_state = 'under_review')
  ) then raise exception 'invalid legal document workflow transition' using errcode = '22023'; end if;
  update public.legal_document_versions set
    state = requested_state,
    approved_by = case when requested_state = 'approved' then requested_actor_user_id else null end,
    approved_at = case when requested_state = 'approved' then now() else null end
  where id = requested_version_id returning * into result;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Transitioned legal document version', 'documents',
    'legal_document_version', result.id,
    jsonb_build_object('from', previous_row.state, 'to', result.state, 'reason', btrim(requested_reason)));
  return result;
end;
$$;

create or replace function public.legal_document_publish(
  requested_version_id uuid,
  requested_actor_user_id uuid,
  requested_reason text
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_version public.legal_document_versions%rowtype;
  result public.legal_document_versions%rowtype;
  actor_name text;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if length(btrim(coalesce(requested_reason, ''))) = 0 then raise exception 'publication reason is required' using errcode = '22023'; end if;
  select * into selected_version from public.legal_document_versions where id = requested_version_id;
  if not found then raise exception 'legal document version not found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(selected_version.legal_document_id::text, 0));
  select * into selected_version from public.legal_document_versions where id = requested_version_id for update;
  if selected_version.state <> 'approved' then raise exception 'only an approved version can be published' using errcode = '22023'; end if;
  if selected_version.effective_date is null or selected_version.effective_date > current_date then
    raise exception 'an effective date on or before publication is required' using errcode = '22023';
  end if;
  if selected_version.content_hash <> encode(sha256(convert_to(selected_version.content::text, 'UTF8')), 'hex') then
    raise exception 'legal document content hash mismatch' using errcode = '55000';
  end if;
  update public.legal_document_versions set state = 'superseded'
  where legal_document_id = selected_version.legal_document_id and state = 'published';
  update public.legal_document_versions set state = 'published', published_by = requested_actor_user_id, published_at = now()
  where id = requested_version_id returning * into result;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Published legal document version', 'documents',
    'legal_document_version', result.id,
    jsonb_build_object('version_number', result.version_number, 'content_hash', result.content_hash, 'reason', btrim(requested_reason)));
  return result;
end;
$$;

create or replace function public.legal_document_withdraw(
  requested_version_id uuid,
  requested_actor_user_id uuid,
  requested_reason text
)
returns public.legal_document_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_version public.legal_document_versions%rowtype;
  result public.legal_document_versions%rowtype;
  actor_name text;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_user_id and active and role in ('admin', 'super_admin');
  if actor_name is null then raise exception 'active administrative actor required' using errcode = '42501'; end if;
  if length(btrim(coalesce(requested_reason, ''))) = 0 then raise exception 'withdrawal reason is required' using errcode = '22023'; end if;
  select * into selected_version from public.legal_document_versions where id = requested_version_id;
  if not found then raise exception 'legal document version not found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(selected_version.legal_document_id::text, 0));
  update public.legal_document_versions set state = 'withdrawn'
  where id = requested_version_id and state = 'published' returning * into result;
  if not found then raise exception 'only the current published version can be withdrawn' using errcode = '22023'; end if;
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_user_id, actor_name, 'Withdrew legal document version', 'documents',
    'legal_document_version', result.id, jsonb_build_object('reason', btrim(requested_reason)));
  return result;
end;
$$;

create or replace function public.accept_booking_agreement(
  requested_booking_id uuid,
  requested_user_id uuid,
  requested_version_id uuid,
  requested_document_hash text,
  requested_idempotency_key text,
  requested_method public.agreement_acceptance_method,
  requested_source text,
  requested_environment text,
  requested_locale text default null,
  requested_evidence_metadata jsonb default '{}'::jsonb
)
returns public.agreement_acceptances
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  profile_row public.client_profiles%rowtype;
  client_row public.clients%rowtype;
  requirement_row public.booking_agreement_requirements%rowtype;
  version_row public.legal_document_versions%rowtype;
  existing_row public.agreement_acceptances%rowtype;
  result public.agreement_acceptances%rowtype;
  summary jsonb;
begin
  if length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
     or length(btrim(coalesce(requested_source, ''))) not between 1 and 100
     or requested_environment not in ('production', 'staging', 'development', 'test')
     or jsonb_typeof(requested_evidence_metadata) <> 'object'
     or octet_length(requested_evidence_metadata::text) > 2000
     or exists (
       select 1 from jsonb_object_keys(requested_evidence_metadata) key
       where key not in ('request_id', 'session_id', 'challenge_id', 'channel')
     ) then raise exception 'invalid acceptance evidence' using errcode = '22023'; end if;

  select * into existing_row from public.agreement_acceptances
  where booking_id = requested_booking_id and idempotency_key = btrim(requested_idempotency_key);
  if found then
    if existing_row.accepted_by_user_id is distinct from requested_user_id
       or existing_row.method <> requested_method
       or existing_row.source <> btrim(requested_source)
       or existing_row.environment <> requested_environment
       or existing_row.locale is distinct from nullif(btrim(requested_locale), '')
       or existing_row.evidence_metadata <> requested_evidence_metadata then
      raise exception 'idempotency key was used with different acceptance data' using errcode = '22023';
    end if;
    return existing_row;
  end if;

  select * into booking_row from public.bookings where id = requested_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  select * into profile_row from public.client_profiles
  where id = booking_row.client_profile_id and client_id = booking_row.client_id
    and status in ('invited', 'active')
    and (requested_user_id is null or user_id = requested_user_id);
  if not found then raise exception 'booking customer identity mismatch' using errcode = '42501'; end if;
  select * into client_row from public.clients where id = booking_row.client_id;
  select * into requirement_row from public.booking_agreement_requirements where booking_id = booking_row.id for update;
  if not found or requirement_row.status = 'unavailable' then
    select version.* into version_row
    from public.legal_document_versions version
    join public.legal_documents document on document.id = version.legal_document_id
    where document.document_key = 'booking_terms' and version.state = 'published'
      and version.effective_date <= current_date;
    if not found then raise exception 'booking terms are unavailable' using errcode = '55000'; end if;
    insert into public.booking_agreement_requirements (
      booking_id, client_id, legal_document_version_id, status, required_at
    ) values (booking_row.id, booking_row.client_id, version_row.id, 'pending', now())
    on conflict (booking_id) do update set legal_document_version_id = excluded.legal_document_version_id,
      status = 'pending', required_at = excluded.required_at, updated_at = now()
    returning * into requirement_row;
  end if;
  if requirement_row.status = 'accepted' then
    select * into existing_row from public.agreement_acceptances where id = requirement_row.acceptance_id;
    raise exception 'booking agreement was already accepted as %', existing_row.id using errcode = '55000';
  end if;
  select * into version_row from public.legal_document_versions where id = requirement_row.legal_document_version_id;
  if version_row.state not in ('published', 'superseded', 'withdrawn') then
    raise exception 'required booking terms version is invalid' using errcode = '55000';
  end if;
  if version_row.id <> requested_version_id or version_row.content_hash <> requested_document_hash then
    raise exception 'accepted booking terms version does not match the required version' using errcode = '55000';
  end if;

  summary := jsonb_build_object(
    'reference', booking_row.reference, 'service_type', booking_row.service_type,
    'service_date', booking_row.service_date, 'service_time', booking_row.service_time,
    'location', booking_row.location, 'currency', booking_row.currency,
    'subtotal_amount_php', booking_row.subtotal_amount_php, 'total_amount_php', booking_row.total_amount_php
  );
  insert into public.agreement_acceptances (
    booking_id, client_id, client_profile_id, accepted_by_user_id,
    legal_document_version_id, legal_document_id, version_number, document_hash,
    method, source, environment, locale, idempotency_key,
    booking_snapshot, client_snapshot, profile_snapshot, user_snapshot,
    booking_summary, booking_summary_hash, evidence_metadata
  ) values (
    booking_row.id, booking_row.client_id, booking_row.client_profile_id, requested_user_id,
    version_row.id, version_row.legal_document_id, version_row.version_number, version_row.content_hash,
    requested_method, btrim(requested_source), requested_environment, nullif(btrim(requested_locale), ''),
    btrim(requested_idempotency_key),
    jsonb_build_object('id', booking_row.id, 'reference', booking_row.reference, 'status', booking_row.status,
      'payment_status', booking_row.payment_status, 'created_at', booking_row.created_at),
    jsonb_build_object('id', client_row.id, 'external_ref', client_row.external_ref, 'name', client_row.name),
    jsonb_build_object('id', profile_row.id, 'email', profile_row.email, 'first_name', profile_row.first_name,
      'last_name', profile_row.last_name, 'mobile', profile_row.mobile),
    jsonb_build_object('id', requested_user_id, 'authenticated', requested_user_id is not null), summary,
    encode(sha256(convert_to(summary::text, 'UTF8')), 'hex'), requested_evidence_metadata
  ) returning * into result;
  update public.booking_agreement_requirements set status = 'accepted', acceptance_id = result.id,
    accepted_at = result.accepted_at, updated_at = now() where booking_id = booking_row.id;
  insert into public.customer_audit_log (
    client_id, client_profile_id, actor_user_id, actor_type, action, entity_type, entity_id, request_id, metadata
  ) values (
    booking_row.client_id, booking_row.client_profile_id, requested_user_id, 'customer',
    'booking_agreement.accepted', 'booking', booking_row.id,
    requested_evidence_metadata ->> 'request_id',
    jsonb_build_object('acceptance_id', result.id, 'legal_document_version_id', version_row.id,
      'version_number', version_row.version_number, 'method', requested_method, 'source', btrim(requested_source))
  );
  return result;
end;
$$;

create or replace function public.record_booking_consent(
  requested_booking_id uuid,
  requested_user_id uuid,
  requested_purpose public.consent_purpose,
  requested_selected boolean,
  requested_idempotency_key text,
  requested_source text,
  requested_locale text default null,
  requested_selection_metadata jsonb default '{}'::jsonb,
  requested_withdrawal_of uuid default null,
  requested_withdrawal_metadata jsonb default '{}'::jsonb
)
returns public.consent_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  existing_row public.consent_records%rowtype;
  result public.consent_records%rowtype;
begin
  if length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
     or length(btrim(coalesce(requested_source, ''))) not between 1 and 100
     or jsonb_typeof(requested_selection_metadata) <> 'object'
     or jsonb_typeof(requested_withdrawal_metadata) <> 'object'
     or octet_length(requested_selection_metadata::text) > 2000
     or octet_length(requested_withdrawal_metadata::text) > 2000
     or exists (select 1 from jsonb_object_keys(requested_selection_metadata) key where key not in ('channel', 'form_id'))
     or exists (select 1 from jsonb_object_keys(requested_withdrawal_metadata) key where key not in ('reason', 'request_id')) then
    raise exception 'invalid consent evidence' using errcode = '22023';
  end if;
  select * into existing_row from public.consent_records where booking_id = requested_booking_id
    and purpose = requested_purpose and idempotency_key = btrim(requested_idempotency_key);
  if found then
    if existing_row.user_id <> requested_user_id or existing_row.selected <> requested_selected
       or existing_row.source <> btrim(requested_source)
       or existing_row.locale is distinct from nullif(btrim(requested_locale), '')
       or existing_row.selection_metadata <> requested_selection_metadata
       or existing_row.withdrawal_of is distinct from requested_withdrawal_of
       or existing_row.withdrawal_metadata <> requested_withdrawal_metadata then
      raise exception 'idempotency key was used with different consent data' using errcode = '22023';
    end if;
    return existing_row;
  end if;
  select * into booking_row from public.bookings where id = requested_booking_id;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.client_profiles where id = booking_row.client_profile_id
    and client_id = booking_row.client_id and status in ('invited', 'active')
    and (requested_user_id is null or user_id = requested_user_id)) then
    raise exception 'booking customer identity mismatch' using errcode = '42501';
  end if;
  if requested_selected and requested_withdrawal_of is not null then
    raise exception 'a consent selection cannot withdraw another record' using errcode = '22023';
  elsif not requested_selected then
    perform 1 from public.consent_records where id = requested_withdrawal_of
      and booking_id = requested_booking_id and purpose = requested_purpose and selected;
    if not found then raise exception 'selected consent record to withdraw was not found' using errcode = '22023'; end if;
  end if;
  insert into public.consent_records (
    booking_id, client_id, client_profile_id, user_id, purpose, selected, source, locale,
    idempotency_key, selection_metadata, withdrawal_of, withdrawal_metadata
  ) values (
    booking_row.id, booking_row.client_id, booking_row.client_profile_id, requested_user_id,
    requested_purpose, requested_selected, btrim(requested_source), nullif(btrim(requested_locale), ''),
    btrim(requested_idempotency_key), requested_selection_metadata, requested_withdrawal_of,
    requested_withdrawal_metadata
  ) returning * into result;
  insert into public.customer_audit_log (
    client_id, client_profile_id, actor_user_id, actor_type, action, entity_type, entity_id, request_id, metadata
  ) values (
    booking_row.client_id, booking_row.client_profile_id, requested_user_id, 'customer',
    case when requested_selected then 'consent.selected' else 'consent.withdrawn' end,
    'booking', booking_row.id, requested_withdrawal_metadata ->> 'request_id',
    jsonb_build_object('consent_record_id', result.id, 'purpose', requested_purpose, 'selected', requested_selected)
  );
  return result;
end;
$$;

alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.agreement_acceptances enable row level security;
alter table public.booking_agreement_requirements enable row level security;
alter table public.consent_records enable row level security;

create policy legal_documents_customer_staff_read on public.legal_documents for select to authenticated using (
  public.booking_terms_is_staff() or exists (
    select 1 from public.legal_document_versions version
    where version.legal_document_id = legal_documents.id and version.state = 'published'
  )
);
create policy legal_document_versions_customer_staff_read on public.legal_document_versions for select to authenticated using (
  state = 'published' or public.booking_terms_is_staff()
);
create policy agreement_acceptances_customer_staff_read on public.agreement_acceptances for select to authenticated using (
  public.customer_owns_client(client_id) or public.booking_terms_is_staff()
);
create policy booking_agreement_requirements_customer_staff_read on public.booking_agreement_requirements for select to authenticated using (
  public.customer_owns_client(client_id) or public.booking_terms_is_staff()
);
create policy consent_records_customer_staff_read on public.consent_records for select to authenticated using (
  public.customer_owns_client(client_id) or public.booking_terms_is_staff()
);

create view public.customer_booking_agreements with (security_invoker = true) as
select acceptance.id, acceptance.booking_id, acceptance.client_id, acceptance.legal_document_version_id,
  acceptance.version_number, acceptance.document_hash, acceptance.accepted_at, acceptance.method,
  acceptance.source, acceptance.locale, acceptance.booking_summary, acceptance.booking_summary_hash
from public.agreement_acceptances acceptance;

revoke all on table public.legal_documents, public.legal_document_versions,
  public.agreement_acceptances, public.booking_agreement_requirements, public.consent_records
  from anon, authenticated, service_role;
grant select on table public.legal_documents, public.legal_document_versions,
  public.agreement_acceptances, public.booking_agreement_requirements, public.consent_records
  to authenticated, service_role;
revoke all on public.customer_booking_agreements from public, anon, authenticated, service_role;
grant select on public.customer_booking_agreements to authenticated, service_role;

revoke all on function public.booking_terms_is_staff(),
  public.prevent_booking_terms_append_only_mutation(), public.enforce_legal_version_immutability(),
  public.initialize_booking_agreement_requirement(),
  public.legal_document_create_version(text,jsonb,uuid,text),
  public.legal_document_update_draft(uuid,jsonb,uuid,text),
  public.legal_document_transition(uuid,public.legal_document_version_state,uuid,text),
  public.legal_document_publish(uuid,uuid,text), public.legal_document_withdraw(uuid,uuid,text),
  public.accept_booking_agreement(uuid,uuid,uuid,text,text,public.agreement_acceptance_method,text,text,text,jsonb),
  public.record_booking_consent(uuid,uuid,public.consent_purpose,boolean,text,text,text,jsonb,uuid,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.booking_terms_is_staff() to authenticated;
grant execute on function public.legal_document_create_version(text,jsonb,uuid,text),
  public.legal_document_update_draft(uuid,jsonb,uuid,text),
  public.legal_document_transition(uuid,public.legal_document_version_state,uuid,text),
  public.legal_document_publish(uuid,uuid,text), public.legal_document_withdraw(uuid,uuid,text),
  public.accept_booking_agreement(uuid,uuid,uuid,text,text,public.agreement_acceptance_method,text,text,text,jsonb),
  public.record_booking_consent(uuid,uuid,public.consent_purpose,boolean,text,text,text,jsonb,uuid,jsonb)
  to service_role;

comment on view public.customer_booking_agreements is
  'Customer-safe agreement receipt view. RLS is evaluated on the underlying acceptance table.';
comment on table public.agreement_acceptances is
  'Append-only acceptance evidence. IP address and user agent are intentionally neither required nor stored.';
comment on table public.consent_records is
  'Append-only optional consent selections and withdrawals, independent of booking terms acceptance.';

-- Stable identity and one editable draft only. This is deliberately not legal
-- advice, has not been published, and must be reviewed by Philippine counsel.
insert into public.legal_documents (id, document_key, title, description)
values (
  'b0000000-0000-4000-8000-000000000001', 'booking_terms', 'Booking Terms and Conditions',
  'Versioned terms presented for booking acceptance.'
);

insert into public.legal_document_versions (
  id, legal_document_id, version_number, version_label, title, summary, effective_date,
  state, content, content_hash, change_summary, created_by
)
select
  'b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1,
  draft.content ->> 'version_label', draft.content ->> 'title', draft.content -> 'summary', null,
  'draft', draft.content,
  encode(sha256(convert_to(draft.content::text, 'UTF8')), 'hex'),
  'Initial editable working draft requiring legal and business review.', null
from (
  select jsonb_build_object(
    'version_label', 'Draft 1.0',
    'effective_date', '2026-08-01',
    'title', 'Booking Terms and Conditions - Working Draft',
    'summary', jsonb_build_array(
      'A booking is secured only when the configured confirmation conditions are met.',
      'Deposit, balance, rescheduling, cancellation, lateness, and no-show rules apply once approved.',
      'Deliverables and turnaround depend on the selected service and accepted booking summary.',
      'Add-ons and approved upgrades may cost extra.',
      'Privacy, marketing, and image-publication choices are handled separately.'
    ),
    'disclaimer', 'NOT LEGAL ADVICE. This unpublished working draft requires review and approval by qualified Philippine counsel before use.',
    'business_placeholders', jsonb_build_object(
      'legal_name', '[INSERT REGISTERED BUSINESS NAME]', 'trade_name', '[INSERT TRADE NAME]',
      'address', '[INSERT BUSINESS ADDRESS]', 'contact', '[INSERT OFFICIAL CONTACT DETAILS]',
      'registration', '[INSERT DTI/SEC/BIR REGISTRATION DETAILS]', 'pricing_policy', '[CONFIRM PRICES, DEPOSIT, AND PAYMENT DEADLINES]',
      'delivery_timeline', '[CONFIRM DELIVERY AND ARCHIVE PERIODS]'
    ),
    'legal_placeholders', jsonb_build_object(
      'counsel', '[PHILIPPINE COUNSEL NAME AND REVIEW DATE]',
      'governing_law', '[COUNSEL TO CONFIRM PHILIPPINE GOVERNING LAW LANGUAGE]',
      'venue', '[COUNSEL TO CONFIRM DISPUTE VENUE AND PROCESS]',
      'liability_cap', '[COUNSEL TO CONFIRM ENFORCEABLE LIABILITY CAP]',
      'privacy', '[COUNSEL/DPO TO CONFIRM DATA PRIVACY ACT COMPLIANCE]',
      'consumer_rights', '[COUNSEL TO CONFIRM NON-WAIVABLE CONSUMER RIGHTS]'
    ),
    'sections', jsonb_build_array(
      jsonb_build_object('number', 1, 'title', 'About Kahel Studio', 'text', '[INSERT REGISTERED BUSINESS NAME, TRADE NAME, REGISTRATION DETAILS, ADDRESS, AND CONTACT INFORMATION].'),
      jsonb_build_object('number', 2, 'title', 'Scope of the terms', 'text', 'These terms apply to the confirmed booking summary and approved written changes. Service-specific signed terms may take precedence where stated and legally valid.'),
      jsonb_build_object('number', 3, 'title', 'Booking requests and confirmation', 'text', 'A request does not secure a slot. Confirmation requires schedule approval, complete information, required payment, accepted terms, and no blocking conflict. Duplicate or fraudulent requests may be cancelled after review.'),
      jsonb_build_object('number', 4, 'title', 'Prices and quotations', 'text', 'Prices are in Philippine pesos unless stated otherwise. Package inclusions control; quotation validity and any travel, permit, upgrade, or extra charges must be disclosed and approved. [CONFIRM QUOTATION VALIDITY].'),
      jsonb_build_object('number', 5, 'title', 'Deposits and payments', 'text', 'Pending digital payments are not complete until verified. Cash is valid only when recorded and receipted by authorized staff. [CONFIRM DEPOSIT, REFUND, OVERPAYMENT, AND PAYMENT METHOD RULES].'),
      jsonb_build_object('number', 6, 'title', 'Remaining balances', 'text', '[CONFIRM BALANCE DUE DATE, REMINDERS, AND LAWFUL CONSEQUENCES OF NONPAYMENT]. Processor settlement delay does not reverse a verified customer payment.'),
      jsonb_build_object('number', 7, 'title', 'Add-ons and additional purchases', 'text', 'Approved add-ons, upgrades, extra people, extra time, permits, travel, and other purchases update the payable total and must be disclosed before approval.'),
      jsonb_build_object('number', 8, 'title', 'Rescheduling', 'text', '[CONFIRM NOTICE PERIOD, ALLOWED RESCHEDULES, FEES, DEPOSIT TREATMENT, AVAILABILITY, LATE REQUESTS, AND FORCE-MAJEURE EXCEPTIONS].'),
      jsonb_build_object('number', 9, 'title', 'Customer cancellation', 'text', '[COUNSEL TO REVIEW NOTICE, EFFECTIVE DATE, DEPOSIT, REFUND OR CREDIT SCHEDULE, WORK ALREADY PERFORMED, AND NON-WAIVABLE CONSUMER RIGHTS].'),
      jsonb_build_object('number', 10, 'title', 'Kahel Studio cancellation', 'text', 'Kahel Studio will notify the customer when practical and review an appropriate reschedule, refund, or alternative when it cannot perform, subject to circumstances and applicable law.'),
      jsonb_build_object('number', 11, 'title', 'No-shows and lateness', 'text', '[CONFIRM GRACE PERIOD, SESSION END TIME, NO-SHOW DECISION PROCESS, PAYMENT TREATMENT, RESCHEDULING, AND EVENT EXCEPTIONS]. No-show status requires deliberate staff recording.'),
      jsonb_build_object('number', 12, 'title', 'Session duration', 'text', 'The booking has scheduled start and end times. Customer lateness may reduce available time; extensions depend on availability and may cost extra. Studio-caused avoidable delay requires an appropriate adjustment.'),
      jsonb_build_object('number', 13, 'title', 'Customer responsibilities', 'text', 'Customers must provide accurate details, arrive on time, follow safety instructions, supervise dependents, identify accessibility or safety needs, obtain assigned permissions, and respect people, equipment, and property.'),
      jsonb_build_object('number', 14, 'title', 'Minors and guardians', 'text', '[COUNSEL TO CONFIRM WHEN A PARENT OR LEGALLY AUTHORIZED GUARDIAN MUST BOOK, APPROVE, OR REMAIN PRESENT]. Minor image-publication consent is separate.'),
      jsonb_build_object('number', 15, 'title', 'Locations, permits and access', 'text', 'The booking summary must assign venue permission, access, parking, permits, travel, weather planning, restricted-area, power, and safety responsibilities. Customers are not responsible for permits Kahel Studio agreed to obtain.'),
      jsonb_build_object('number', 16, 'title', 'Events and third-party restrictions', 'text', 'Venue rules, officials, coordinators, obstruction, lighting, schedule changes, suppliers, and safety limits may affect work, without excusing Kahel Studio obligations that cannot lawfully be excluded.'),
      jsonb_build_object('number', 17, 'title', 'Studio equipment and property', 'text', 'Documented deliberate or negligent damage may be fairly assessed where lawful. Customers may review evidence and dispute charges; charges are not automatic.'),
      jsonb_build_object('number', 18, 'title', 'Deliverables', 'text', 'The accepted booking summary controls type, quantity, format, edits, delivery, turnaround, selection, gallery availability, revisions, and add-on pricing. General terms do not expand package inclusions.'),
      jsonb_build_object('number', 19, 'title', 'Editing and creative discretion', 'text', 'Kahel Studio applies its professional style within the agreed service. Raw files are excluded unless stated; extensive retouching may cost extra. Creative discretion does not excuse agreed delivery.'),
      jsonb_build_object('number', 20, 'title', 'Customer review and revisions', 'text', '[CONFIRM SERVICE-SPECIFIC REVIEW VERSION, FEEDBACK DEADLINE, INCLUDED ROUNDS, OUT-OF-SCOPE PRICING, APPROVAL, AND FINALIZATION].'),
      jsonb_build_object('number', 21, 'title', 'Turnaround and delivery', 'text', '[CONFIRM WHEN TURNAROUND STARTS, ESTIMATE OR COMMITMENT, CUSTOMER DEPENDENCIES, DELAY NOTICE, DELIVERY CHANNEL, AND ACCESS SUPPORT].'),
      jsonb_build_object('number', 22, 'title', 'Galleries and file availability', 'text', '[CONFIRM GALLERY, DOWNLOAD, ARCHIVE, RETENTION, BACKUP, RESTORATION FEE, SECURITY, NOTICE, AND PAID-DELIVERABLE PROTECTION RULES].'),
      jsonb_build_object('number', 23, 'title', 'Copyright and permitted customer use', 'text', '[COUNSEL TO CONFIRM COPYRIGHT OWNERSHIP AND SERVICE-SPECIFIC PERSONAL OR COMMERCIAL LICENSES, INCLUDING THIRD-PARTY ASSETS AND LAWFUL RESTRICTIONS].'),
      jsonb_build_object('number', 24, 'title', 'Portfolio and promotional use', 'text', 'Portfolio and promotional use requires a separate optional choice that starts unselected, supports appropriate future withdrawal, and uses guardian authorization where required.'),
      jsonb_build_object('number', 25, 'title', 'Privacy and personal information', 'text', 'Kahel Studio processes information needed to manage bookings, communicate, process payment, deliver services, keep records, protect accounts, and prevent abuse under the separate Privacy Notice and applicable lawful bases.'),
      jsonb_build_object('number', 26, 'title', 'Force majeure and circumstances beyond control', 'text', '[COUNSEL TO REVIEW NOTICE, RESCHEDULING, REFUND OR CREDIT, WORK PERFORMED, NONRECOVERABLE THIRD-PARTY COSTS, MITIGATION, AND FAIR TREATMENT].'),
      jsonb_build_object('number', 27, 'title', 'Complaints and service concerns', 'text', '[CONFIRM CONTACT CHANNEL, REQUIRED INFORMATION, INTERNAL REVIEW, AND ESCALATION]. Mandatory rights and available regulatory remedies are not waived.'),
      jsonb_build_object('number', 28, 'title', 'Limitations subject to applicable law', 'text', '[REQUIRES PHILIPPINE COUNSEL REVIEW BEFORE PUBLICATION]. No term excludes non-excludable liability, agreed deliverables, or mandatory consumer remedies.'),
      jsonb_build_object('number', 29, 'title', 'Changes to the terms', 'text', 'New versions apply prospectively as configured. Material changes do not silently replace a booking previously accepted; required reacceptance must be explicit and historical versions remain available.'),
      jsonb_build_object('number', 30, 'title', 'Governing law and dispute handling', 'text', '[COUNSEL TO CONFIRM APPLICABLE PHILIPPINE LAW, ACCESSIBLE GOOD-FAITH PROCESS, VENUE, REGULATOR ACCESS, AND WHETHER ANY ADDITIONAL PROCESS IS LAWFUL].'),
      jsonb_build_object('number', 31, 'title', 'Contact information', 'text', '[INSERT CUSTOMER CARE, PRIVACY, COMPLAINT, BUSINESS ADDRESS, AND OPERATING CONTACT DETAILS].')
    )
  ) content
) draft;
