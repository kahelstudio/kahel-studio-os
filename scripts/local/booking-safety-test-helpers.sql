-- LOCAL DEVELOPMENT ONLY — Phase 4 booking-safety harness helpers. Not a migration; never run on staging/production.
-- Lets a test make the in-transaction project-creation step fail on demand (simulated downstream outage).
create table if not exists public.safety_test_controls (key text primary key, enabled boolean not null default false);
grant select, insert, update on public.safety_test_controls to service_role;
create or replace function public.safety_test_set_project_failure(enabled boolean) returns void
language sql security definer set search_path = '' as $$
  insert into public.safety_test_controls (key, enabled) values ('project_failure', enabled)
  on conflict (key) do update set enabled = excluded.enabled;
$$;
grant execute on function public.safety_test_set_project_failure(boolean) to service_role;
create or replace function public.safety_test_fail_project_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.safety_test_controls where key = 'project_failure' and enabled) then
    raise exception 'SAFETY-TEST simulated project service outage' using errcode = '57P03';
  end if;
  return new;
end $$;
drop trigger if exists safety_test_fail_project_insert on public.projects;
create trigger safety_test_fail_project_insert before insert on public.projects
  for each row execute function public.safety_test_fail_project_insert();
-- Remove with: drop trigger safety_test_fail_project_insert on public.projects; drop function public.safety_test_fail_project_insert();
--              drop function public.safety_test_set_project_failure(boolean); drop table public.safety_test_controls;

-- Fixed local-only actor for staff RPCs in the harness (reschedule_booking / update_booking_status need an auth user).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('5afe7e57-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'safety-test-staff@kahel.test', '', now(), now())
on conflict (id) do nothing;
insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings)
values ('5afe7e57-0000-4000-8000-000000000001', 'staff', 'SAFETY-TEST Staff', true)
on conflict (user_id) do nothing;
insert into public.clients (id, external_ref, name)
values ('5afe7e57-0000-4000-8000-0000000000c1', 'SAFETY-TEST-CLIENT', 'SAFETY-TEST- Client')
on conflict (id) do nothing;
insert into public.client_profiles (id, client_id, email, first_name, last_name)
values ('5afe7e57-0000-4000-8000-0000000000d1', '5afe7e57-0000-4000-8000-0000000000c1', 'safety-test-client@example.test', 'SAFETY-TEST-', 'Client')
on conflict do nothing;
