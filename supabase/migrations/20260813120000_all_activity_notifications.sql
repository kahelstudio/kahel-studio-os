create or replace function public.notify_staff_audit_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_notifications (recipient_id, event_key, kind, title, body, href, created_at)
  select
    profile.user_id,
    'staff-audit:' || new.id || ':' || profile.user_id,
    left('activity.' || new.event_type, 80),
    left(new.event, 255),
    left(new.actor_name || case when new.entity_type is null then '' else ' - ' || replace(new.entity_type, '_', ' ') end, 1000),
    '/logs',
    new.created_at
  from public.staff_profiles profile
  where profile.active
  on conflict (event_key) do nothing;
  return new;
end
$$;

create or replace function public.notify_customer_audit_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor_name text;
begin
  select coalesce(profile.display_name, auth_user.email, initcap(replace(new.actor_type, '_', ' ')))
  into actor_name
  from (select 1) source
  left join public.staff_profiles profile on profile.user_id = new.actor_user_id
  left join auth.users auth_user on auth_user.id = new.actor_user_id;

  actor_name := coalesce(actor_name, initcap(replace(new.actor_type, '_', ' ')));

  insert into public.staff_notifications (recipient_id, event_key, kind, title, body, href, created_at)
  select
    profile.user_id,
    'customer-audit:' || new.id || ':' || profile.user_id,
    left('activity.' || new.actor_type, 80),
    left(initcap(replace(new.action, '_', ' ')), 255),
    left(actor_name || ' - ' || replace(new.entity_type, '_', ' '), 1000),
    case when new.entity_type = 'booking' then '/booking/list' else '/logs' end,
    new.created_at
  from public.staff_profiles profile
  where profile.active
  on conflict (event_key) do nothing;
  return new;
end
$$;

create trigger staff_audit_activity_notification
after insert on public.staff_audit_log
for each row execute function public.notify_staff_audit_activity();

create trigger customer_audit_activity_notification
after insert on public.customer_audit_log
for each row execute function public.notify_customer_audit_activity();

revoke all on function public.notify_staff_audit_activity(), public.notify_customer_audit_activity() from public, anon, authenticated;
grant execute on function public.notify_staff_audit_activity(), public.notify_customer_audit_activity() to service_role;
