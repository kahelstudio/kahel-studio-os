create index if not exists bookings_service_date_status_idx
  on public.bookings (service_date, status, service_time)
  where kind not in ('test', 'internal');

create index if not exists bookings_status_service_date_idx
  on public.bookings (status, service_date, service_time)
  where kind not in ('test', 'internal');

create index if not exists bookings_payment_status_idx
  on public.bookings (payment_status)
  where kind not in ('test', 'internal');

create index if not exists bookings_client_service_date_idx
  on public.bookings (client_id, service_date desc, service_time desc)
  where kind not in ('test', 'internal');
