-- --------------------------------------------------------------------
-- Inventory equipment: split the KAHEL id tag (e.g. KAHL-001) from the
-- manufacturer serial number (e.g. AK8654564564654).
-- --------------------------------------------------------------------

alter table public.equipment add column id_tag text;

-- Existing serial values already hold the KAHEL tag; promote them to id_tag.
update public.equipment set id_tag = btrim(serial) where id_tag is null;

alter table public.equipment alter column id_tag set not null;
alter table public.equipment add constraint equipment_id_tag_unique unique (id_tag);
