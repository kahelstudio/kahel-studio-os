create table if not exists public.client_portals (
  project_ref text primary key,
  published boolean not null default false,
  email text not null,
  access_code text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_activity (
  project_ref text primary key references public.client_portals(project_ref) on delete cascade,
  favorites_json jsonb not null default '{}'::jsonb,
  rating integer not null default 0 check (rating between 0 and 5),
  tags_json jsonb not null default '{}'::jsonb,
  feedback_sent boolean not null default false,
  selects_submitted boolean not null default false,
  selects_submitted_at timestamptz,
  feedback_submitted_at timestamptz,
  last_accessed_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  last_downloaded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_tokens (
  token_hash text primary key,
  project_ref text not null references public.client_portals(project_ref) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists client_portal_tokens_project_ref_idx on public.client_portal_tokens(project_ref);

alter table public.client_portals enable row level security;
alter table public.client_portal_activity enable row level security;
alter table public.client_portal_tokens enable row level security;

-- The Worker uses SUPABASE_SECRET_KEY server-side. No anonymous access is granted.
