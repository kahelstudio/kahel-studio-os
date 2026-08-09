create table public.staff_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  relationship text not null check (length(btrim(relationship)) between 2 and 80),
  phone text not null check (length(btrim(phone)) between 7 and 30),
  email text check (email is null or length(btrim(email)) between 3 and 254),
  created_at timestamptz not null default now()
);

create index idx_staff_emergency_contacts_staff
  on public.staff_emergency_contacts(staff_id, created_at);

alter table public.staff_emergency_contacts enable row level security;

create policy staff_emergency_contacts_self_read
  on public.staff_emergency_contacts for select to authenticated
  using (staff_id = auth.uid());

create policy staff_emergency_contacts_admin_read
  on public.staff_emergency_contacts for select to authenticated
  using (
    exists (
      select 1 from public.staff_profiles
      where user_id = auth.uid() and active and role in ('admin', 'super_admin')
    )
  );

create policy staff_emergency_contacts_self_insert
  on public.staff_emergency_contacts for insert to authenticated
  with check (staff_id = auth.uid());

create policy staff_emergency_contacts_self_update
  on public.staff_emergency_contacts for update to authenticated
  using (staff_id = auth.uid()) with check (staff_id = auth.uid());

create policy staff_emergency_contacts_self_delete
  on public.staff_emergency_contacts for delete to authenticated
  using (staff_id = auth.uid());

revoke all on table public.staff_emergency_contacts from anon;
grant select, insert, update, delete on table public.staff_emergency_contacts to authenticated;
