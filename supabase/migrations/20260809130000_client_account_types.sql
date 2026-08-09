alter table public.clients
  add column account_type text not null default 'consumer'
  check (account_type in ('consumer', 'corporate'));

create index clients_account_type_idx on public.clients(account_type);
