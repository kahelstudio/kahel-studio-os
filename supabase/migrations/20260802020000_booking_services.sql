-- Public booking packages must resolve to the canonical service required by the
-- loyalty foundation before a booking can be inserted.
insert into public.services (code, name, active) values
  ('theme-session', 'Theme', true),
  ('express-session', 'Express', true),
  ('group-session', 'Group', true),
  ('duo-session', 'Duo', true),
  ('solo-session', 'Solo', true),
  ('mini-session', 'Mini Session', true),
  ('baby-shower', 'Baby Shower', true),
  ('engagement-party', 'Engagement Party', true),
  ('birthday', 'Birthday', true),
  ('christening', 'Christening', true),
  ('debut', 'Debut', true),
  ('anniversary-celebration', 'Anniversary Celebration', true)
on conflict (code) do update set name = excluded.name, active = true;
