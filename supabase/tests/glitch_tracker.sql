begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'assertion failed: %', message; end if;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('ac000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'glitch-admin@kahel.test', '', now(), now());
insert into public.staff_profiles (user_id, role, display_name, can_manage_bookings, can_manage_loyalty, can_manage_rewards, can_manage_galleries)
values ('ac000000-0000-4000-8000-000000000001', 'admin', 'Glitch Admin', true, true, true, true);

insert into public.glitches (title, description, category, severity, status, location_or_system, reported_by, reporter_name, observed_at)
values ('Upload interrupted', 'A client gallery upload repeatedly stops before completion.', 'Files', 'Critical', 'Open', 'Client Portal', 'ac000000-0000-4000-8000-000000000001', 'Glitch Admin', now());

select pg_temp.assert_true((select reference ~ '^GL-[0-9]{4}-[0-9]{4}$' from public.glitches where title = 'Upload interrupted'), 'database generates the required concurrent-safe reference');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.glitches'::regclass), 'glitches retain RLS');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.glitch_activity'::regclass), 'activity has RLS');

insert into public.glitch_activity (glitch_id, actor_id, event_type, message)
select id, 'ac000000-0000-4000-8000-000000000001', 'created', 'Initial report recorded.' from public.glitches where title = 'Upload interrupted';

do $$
begin
  update public.glitch_activity set message = 'Changed';
  raise exception 'mutation unexpectedly succeeded';
exception when others then
  if sqlerrm <> 'glitch activity is append-only' then raise; end if;
end
$$;

do $$
begin
  update public.glitches set status = 'Resolved' where title = 'Upload interrupted';
  raise exception 'expected resolution evidence rejection';
exception when check_violation then null;
end
$$;

rollback;
