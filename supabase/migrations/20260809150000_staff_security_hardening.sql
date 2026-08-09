create table public.staff_recovery_emails (
  staff_id uuid primary key references public.staff_profiles(user_id) on delete cascade,
  recovery_email text unique check (
    recovery_email is null or
    (recovery_email = lower(btrim(recovery_email)) and length(recovery_email) between 3 and 254)
  ),
  pending_email text check (
    pending_email is null or
    (pending_email = lower(btrim(pending_email)) and length(pending_email) between 3 and 254)
  ),
  verification_code_hash text check (verification_code_hash is null or length(verification_code_hash) = 64),
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_recovery_verification_state_check check (
    (pending_email is null and verification_code_hash is null and verification_expires_at is null)
    or
    (pending_email is not null and verification_code_hash is not null and verification_expires_at is not null)
  )
);

alter table public.staff_recovery_emails enable row level security;
revoke all on table public.staff_recovery_emails from anon, authenticated;

drop policy if exists staff_emergency_contacts_self_insert on public.staff_emergency_contacts;
drop policy if exists staff_emergency_contacts_self_update on public.staff_emergency_contacts;
drop policy if exists staff_emergency_contacts_self_delete on public.staff_emergency_contacts;
revoke insert, update, delete on table public.staff_emergency_contacts from authenticated;
