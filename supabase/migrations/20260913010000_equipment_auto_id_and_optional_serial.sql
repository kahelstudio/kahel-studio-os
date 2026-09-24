-- Assign canonical KAHL tags and allow equipment without manufacturer serials.
alter table public.equipment alter column serial drop not null;
update public.equipment
set serial = null
where upper(btrim(serial)) = 'NA' or btrim(serial) = btrim(id_tag);

create or replace function public.next_equipment_id_tag()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  next_number bigint;
begin
  perform pg_advisory_xact_lock(hashtext('public.equipment.id_tag'));

  select coalesce(max((substring(id_tag from '^KAHL-([0-9]+)$'))::bigint), 0) + 1
    into next_number
    from public.equipment
    where id_tag ~ '^KAHL-[0-9]+$';

  return 'KAHL-' || lpad(next_number::text, 3, '0');
end;
$$;

create temporary table equipment_id_tag_migration on commit drop as
select
  id,
  id_tag as old_id_tag,
  'KAHL-' || lpad(row_number() over (order by created_at, id)::text, 3, '0') as new_id_tag
from public.equipment;

-- Use temporary values first to avoid collisions while renumbering existing rows.
update public.equipment set id_tag = '__KAHL_MIGRATION__' || id::text;

update public.equipment as equipment
set id_tag = migration.new_id_tag
from equipment_id_tag_migration as migration
where equipment.id = migration.id;

update public.maintenance_records as maintenance
set asset_label = migration.new_id_tag
from equipment_id_tag_migration as migration
where maintenance.asset_label = migration.old_id_tag;

alter table public.equipment alter column id_tag set default public.next_equipment_id_tag();
