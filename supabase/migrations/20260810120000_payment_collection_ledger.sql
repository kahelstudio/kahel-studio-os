-- Payment collection ledger. All new amounts are integer centavos. Existing
-- booking/invoice *_amount_php integers are also centavos. products.price is
-- numeric pesos and is snapshotted with round(price * 100).
--
-- Cash register/session tables are intentionally out of scope because the
-- current architecture has no register model.

alter table public.invoices add column if not exists booking_id uuid;

-- Only infer a booking when exactly one invoice is attached to that booking.
update public.invoices i
set booking_id = p.booking_id
from public.projects p
where i.project_id = p.id
  and i.booking_id is null
  and p.booking_id is not null
  and 1 = (
    select count(*)
    from public.invoices sibling
    join public.projects sibling_project on sibling_project.id = sibling.project_id
    where sibling_project.booking_id = p.booking_id
  );

alter table public.invoices drop constraint if exists invoices_booking_client_fkey;
alter table public.invoices add constraint invoices_booking_client_fkey
  foreign key (booking_id, client_id) references public.bookings(id, client_id) on delete restrict;
alter table public.invoices drop constraint if exists invoices_id_client_id_key;
alter table public.invoices add constraint invoices_id_client_id_key unique (id, client_id);
create unique index if not exists invoices_booking_id_key
  on public.invoices (booking_id) where booking_id is not null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  booking_id uuid not null,
  processor text not null check (processor in ('none', 'paymongo', 'legacy_import')),
  source text not null check (source in ('staff', 'customer_checkout', 'webhook', 'legacy_import')),
  payment_method text not null check (payment_method in ('cash', 'digital', 'card', 'gcash', 'paymaya', 'qrph', 'billease', 'legacy_import')),
  payment_purpose text not null check (payment_purpose in ('balance', 'add_on', 'balance_and_add_on', 'legacy_import')),
  status text not null check (status in (
    'pending', 'paid', 'failed', 'cancelled', 'expired', 'partially_refunded', 'refunded'
  )),
  settlement_status text not null default 'not_applicable' check (settlement_status in (
    'not_applicable', 'pending', 'available', 'settled', 'failed'
  )),
  currency text not null default 'PHP' check (currency = 'PHP'),
  balance_component_centavos bigint not null check (balance_component_centavos >= 0),
  add_on_amount_centavos bigint not null check (add_on_amount_centavos >= 0),
  amount_centavos bigint not null check (
    amount_centavos > 0
    and amount_centavos = balance_component_centavos + add_on_amount_centavos
  ),
  refunded_amount_centavos bigint not null default 0 check (
    refunded_amount_centavos >= 0 and refunded_amount_centavos <= amount_centavos
  ),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  note text check (note is null or length(note) <= 2000),
  receipt_requested boolean not null default true,
  create_invoice_requested boolean not null default false,
  provider_checkout_session_id text,
  provider_payment_id text,
  provider_payment_intent_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  payment_method_detail text,
  provider_description text,
  prepared_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint payments_id_client_id_key unique (id, client_id),
  constraint payments_processor_method_check check (
    (payment_method = 'cash' and processor = 'none')
    or (payment_method in ('digital', 'card', 'gcash', 'paymaya', 'qrph', 'billease') and processor = 'paymongo')
    or (payment_method = 'legacy_import' and processor = 'legacy_import')
  ),
  constraint payments_status_dates_check check (
    (status = 'pending' and paid_at is null and failed_at is null and cancelled_at is null and expired_at is null)
    or (status in ('paid', 'partially_refunded', 'refunded') and paid_at is not null and failed_at is null and cancelled_at is null and expired_at is null)
    or (status = 'failed' and paid_at is null and failed_at is not null and cancelled_at is null and expired_at is null)
    or (status = 'cancelled' and paid_at is null and failed_at is null and cancelled_at is not null and expired_at is null)
    or (status = 'expired' and paid_at is null and failed_at is null and cancelled_at is null and expired_at is not null)
  ),
  constraint payments_refund_status_check check (
    (status = 'partially_refunded' and refunded_amount_centavos > 0 and refunded_amount_centavos < amount_centavos)
    or (status = 'refunded' and refunded_amount_centavos = amount_centavos)
    or (status not in ('partially_refunded', 'refunded') and refunded_amount_centavos = 0)
  ),
  constraint payments_posted_check check (
    (status in ('paid', 'partially_refunded', 'refunded') and posted_at is not null)
    or (status not in ('paid', 'partially_refunded', 'refunded') and posted_at is null)
  )
);

create unique index payments_provider_checkout_session_key on public.payments (provider_checkout_session_id)
  where provider_checkout_session_id is not null;
create unique index payments_provider_payment_id_key on public.payments (provider_payment_id)
  where provider_payment_id is not null;
create unique index payments_provider_payment_intent_id_key on public.payments (provider_payment_intent_id)
  where provider_payment_intent_id is not null;
create index payments_client_created_at_idx on public.payments (client_id, created_at desc);
create index payments_booking_created_at_idx on public.payments (booking_id, created_at desc);
create index payments_pending_idx on public.payments (created_at) where status = 'pending';

-- Immutable pending snapshots. No booking/invoice totals or product stock change
-- until the payment is successfully posted.
create table public.payment_line_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  line_type text not null check (line_type in ('balance', 'add_on')),
  product_id uuid references public.products(id) on delete restrict,
  description text not null check (length(btrim(description)) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_price_centavos bigint not null check (unit_price_centavos >= 0),
  total_centavos bigint not null check (
    total_centavos >= 0 and total_centavos = quantity * unit_price_centavos
  ),
  created_at timestamptz not null default now(),
  constraint payment_line_items_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict,
  constraint payment_line_items_kind_check check (
    (line_type = 'balance' and product_id is null)
    or (line_type = 'add_on' and product_id is not null)
  )
);

create unique index payment_line_items_balance_key on public.payment_line_items (payment_id)
  where line_type = 'balance';
create unique index payment_line_items_product_key on public.payment_line_items (payment_id, product_id)
  where line_type = 'add_on';
create index payment_line_items_payment_idx on public.payment_line_items (payment_id, created_at);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  booking_id uuid not null,
  invoice_id uuid,
  amount_centavos bigint not null check (amount_centavos > 0),
  created_at timestamptz not null default now(),
  constraint payment_allocations_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict,
  constraint payment_allocations_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint payment_allocations_invoice_client_fkey foreign key (invoice_id, client_id)
    references public.invoices(id, client_id) on delete restrict
);

create index payment_allocations_booking_idx on public.payment_allocations (booking_id);
create index payment_allocations_invoice_idx on public.payment_allocations (invoice_id) where invoice_id is not null;

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  payment_line_item_id uuid unique references public.payment_line_items(id) on delete restrict,
  kind text not null check (kind in ('service', 'product', 'adjustment')),
  description text not null check (length(btrim(description)) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_price_centavos bigint not null check (unit_price_centavos >= 0),
  total_centavos bigint not null check (
    total_centavos >= 0 and total_centavos = quantity * unit_price_centavos
  ),
  created_at timestamptz not null default now(),
  constraint invoice_items_invoice_client_fkey foreign key (invoice_id, client_id)
    references public.invoices(id, client_id) on delete restrict
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id, created_at);

create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  amount_centavos bigint not null check (amount_centavos > 0),
  cash_received_centavos bigint not null check (cash_received_centavos > 0),
  change_centavos bigint not null check (
    change_centavos >= 0 and cash_received_centavos = amount_centavos + change_centavos
  ),
  note text check (note is null or length(note) <= 2000),
  occurred_at timestamptz not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint cash_transactions_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict
);

create index cash_transactions_occurred_at_idx on public.cash_transactions (occurred_at desc);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  booking_id uuid not null,
  invoice_id uuid,
  receipt_number text not null unique check (length(btrim(receipt_number)) between 1 and 64),
  client_name text not null check (length(btrim(client_name)) between 1 and 200),
  booking_reference text not null check (length(btrim(booking_reference)) between 1 and 64),
  invoice_reference text,
  payment_method text not null,
  amount_centavos bigint not null check (amount_centavos > 0),
  cash_received_centavos bigint,
  change_centavos bigint,
  note text,
  issued_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint receipts_id_client_id_key unique (id, client_id),
  constraint receipts_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict,
  constraint receipts_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict,
  constraint receipts_invoice_client_fkey foreign key (invoice_id, client_id)
    references public.invoices(id, client_id) on delete restrict,
  constraint receipts_cash_check check (
    (payment_method = 'cash' and cash_received_centavos is not null and change_centavos is not null
      and cash_received_centavos = amount_centavos + change_centavos)
    or (payment_method <> 'cash' and cash_received_centavos is null and change_centavos is null)
  )
);

create index receipts_client_issued_at_idx on public.receipts (client_id, issued_at desc);

create table public.receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  description text not null check (length(btrim(description)) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit_price_centavos bigint not null check (unit_price_centavos >= 0),
  total_centavos bigint not null check (
    total_centavos >= 0 and total_centavos = quantity * unit_price_centavos
  ),
  created_at timestamptz not null default now(),
  constraint receipt_line_items_receipt_client_fkey foreign key (receipt_id, client_id)
    references public.receipts(id, client_id) on delete restrict
);

create index receipt_line_items_receipt_idx on public.receipt_line_items (receipt_id, created_at);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null check (provider in ('internal', 'paymongo')),
  provider_event_id text,
  event_type text not null check (length(btrim(event_type)) between 1 and 120),
  event_status text not null check (event_status in ('received', 'processed', 'ignored', 'failed')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  processing_error text,
  constraint payment_events_processing_check check (
    (event_status = 'received' and processed_at is null)
    or (event_status <> 'received' and processed_at is not null)
  )
);

create unique index payment_events_provider_event_key on public.payment_events (provider, provider_event_id)
  where provider_event_id is not null;
create index payment_events_payment_idx on public.payment_events (payment_id, received_at desc);

create table public.payment_settlements (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  provider text not null check (provider = 'paymongo'),
  provider_settlement_id text,
  status text not null check (status in ('pending', 'available', 'settled', 'failed')),
  gross_amount_centavos bigint not null check (gross_amount_centavos > 0),
  fee_amount_centavos bigint check (fee_amount_centavos is null or fee_amount_centavos >= 0),
  net_amount_centavos bigint check (net_amount_centavos is null or net_amount_centavos >= 0),
  available_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_settlements_amounts_check check (
    (fee_amount_centavos is null and net_amount_centavos is null)
    or (fee_amount_centavos is not null and net_amount_centavos is not null
      and fee_amount_centavos <= gross_amount_centavos
      and net_amount_centavos = gross_amount_centavos - fee_amount_centavos)
  ),
  constraint payment_settlements_status_dates_check check (
    (status = 'pending' and available_at is null and settled_at is null)
    or (status = 'available' and available_at is not null and settled_at is null)
    or (status = 'settled' and available_at is not null and settled_at is not null)
    or status = 'failed'
  )
);

create unique index payment_settlements_provider_id_key
  on public.payment_settlements (provider, provider_settlement_id)
  where provider_settlement_id is not null;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  payment_line_item_id uuid not null unique references public.payment_line_items(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta < 0),
  stock_after integer not null check (stock_after >= 0),
  unit_price_centavos bigint not null check (unit_price_centavos >= 0),
  reason text not null check (reason = 'paid_add_on'),
  created_at timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

create or replace function public.set_payment_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end
$$;

create trigger set_payment_updated_at before update on public.payments
for each row execute function public.set_payment_updated_at();
create trigger set_payment_settlement_updated_at before update on public.payment_settlements
for each row execute function public.set_payment_updated_at();

create or replace function public.enforce_payment_settlement_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.payment_id <> new.payment_id
     or old.provider <> new.provider
     or old.gross_amount_centavos <> new.gross_amount_centavos
     or (old.provider_settlement_id is not null and old.provider_settlement_id is distinct from new.provider_settlement_id)
     or not (
       old.status = new.status
       or (old.status = 'pending' and new.status in ('available', 'settled', 'failed'))
       or (old.status = 'available' and new.status in ('settled', 'failed'))
     ) then
    raise exception 'invalid settlement transition' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger enforce_payment_settlement_transition
before update on public.payment_settlements
for each row execute function public.enforce_payment_settlement_transition();

create or replace function public.prevent_payment_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception '% records are append-only', tg_table_name using errcode = '55000'; end
$$;

create trigger payment_line_items_append_only before update or delete on public.payment_line_items
for each row execute function public.prevent_payment_ledger_mutation();
create trigger payment_allocations_append_only before update or delete on public.payment_allocations
for each row execute function public.prevent_payment_ledger_mutation();
create trigger invoice_items_append_only before update or delete on public.invoice_items
for each row execute function public.prevent_payment_ledger_mutation();
create trigger cash_transactions_append_only before update or delete on public.cash_transactions
for each row execute function public.prevent_payment_ledger_mutation();
create trigger receipts_append_only before update or delete on public.receipts
for each row execute function public.prevent_payment_ledger_mutation();
create trigger receipt_line_items_append_only before update or delete on public.receipt_line_items
for each row execute function public.prevent_payment_ledger_mutation();
create trigger payment_events_append_only before update or delete on public.payment_events
for each row execute function public.prevent_payment_ledger_mutation();
create trigger inventory_movements_append_only before update or delete on public.inventory_movements
for each row execute function public.prevent_payment_ledger_mutation();
drop trigger if exists staff_audit_log_append_only on public.staff_audit_log;
create trigger staff_audit_log_append_only before update or delete on public.staff_audit_log
for each row execute function public.prevent_payment_ledger_mutation();

create or replace function public.payment_require_active_staff(requested_actor_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_name text;
begin
  select display_name into actor_name
  from public.staff_profiles
  where user_id = requested_actor_id and active;
  if actor_name is null then
    raise exception 'active staff actor is required' using errcode = '42501';
  end if;
  return actor_name;
end
$$;

-- Legacy rows preserve existing aggregates and never run through the posting
-- function. No receipt is fabricated. Invoice linkage is retained only when the
-- inferred invoice already has at least the same paid aggregate.
insert into public.payments (
  client_id, booking_id, processor, source, payment_method, payment_purpose,
  status, settlement_status, balance_component_centavos, add_on_amount_centavos,
  amount_centavos, idempotency_key, request_fingerprint, receipt_requested,
  create_invoice_requested, paid_at, posted_at, created_at, updated_at
)
select b.client_id, b.id, 'legacy_import', 'legacy_import', 'legacy_import', 'legacy_import',
       'paid', 'not_applicable', b.paid_amount_php::bigint, 0, b.paid_amount_php::bigint,
       'legacy-booking:' || b.id,
       md5('legacy-booking:' || b.id) || md5('booking-legacy:' || b.id),
       false, false, coalesce(b.paymongo_paid_at, b.updated_at, b.created_at),
       coalesce(b.paymongo_paid_at, b.updated_at, b.created_at), b.created_at, b.updated_at
from public.bookings b
where b.paid_amount_php > 0
on conflict (idempotency_key) do nothing;

insert into public.payment_allocations (payment_id, client_id, booking_id, invoice_id, amount_centavos, created_at)
select p.id, p.client_id, p.booking_id, i.id, p.amount_centavos, p.created_at
from public.payments p
left join public.invoices i
  on i.booking_id = p.booking_id and i.paid_amount_php::bigint >= p.amount_centavos
where p.source = 'legacy_import'
on conflict (payment_id) do nothing;

create or replace function public.prepare_payment_collection(
  requested_booking_id uuid,
  requested_processor text,
  requested_source text,
  requested_payment_method text,
  requested_balance_component_centavos bigint,
  requested_idempotency_key text,
  requested_add_ons jsonb default '[]'::jsonb,
  requested_create_invoice boolean default false,
  requested_note text default null,
  requested_receipt boolean default true,
  requested_actor_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  booking_row public.bookings;
  current_payment public.payments;
  invoice_row public.invoices;
  add_on record;
  add_on_total bigint := 0;
  pending_balance bigint := 0;
  reserved_quantity bigint := 0;
  payment_amount bigint;
  request_document jsonb;
  request_hash text;
begin
  if requested_source = 'staff' then
    perform public.payment_require_active_staff(requested_actor_id);
  elsif requested_actor_id is not null then
    raise exception 'customer checkout cannot impersonate staff' using errcode = '42501';
  end if;
  if requested_processor not in ('none', 'paymongo')
     or requested_payment_method not in ('cash', 'digital')
     or (requested_payment_method = 'cash' and requested_processor <> 'none')
     or (requested_payment_method = 'digital' and requested_processor <> 'paymongo')
     or requested_source not in ('staff', 'customer_checkout')
     or (requested_payment_method = 'cash' and requested_source <> 'staff') then
    raise exception 'invalid processor, source, or payment method' using errcode = '22023';
  end if;
  if requested_balance_component_centavos < 0
     or length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
     or length(coalesce(requested_note, '')) > 2000
     or jsonb_typeof(coalesce(requested_add_ons, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid collection input' using errcode = '22023';
  end if;

  request_document := jsonb_build_object(
    'booking_id', requested_booking_id, 'processor', requested_processor,
    'source', requested_source, 'payment_method', requested_payment_method,
    'balance_component_centavos', requested_balance_component_centavos,
    'add_ons', coalesce(requested_add_ons, '[]'::jsonb),
    'create_invoice', requested_create_invoice, 'note', requested_note,
    'receipt_requested', requested_receipt
  );
  request_hash := md5(request_document::text) || md5('payment:' || request_document::text);

  select * into current_payment from public.payments
  where idempotency_key = btrim(requested_idempotency_key);
  if current_payment.id is not null then
    if current_payment.request_fingerprint <> request_hash then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
    select * into invoice_row from public.invoices where booking_id = current_payment.booking_id;
    return jsonb_build_object('payment', to_jsonb(current_payment) - 'request_fingerprint', 'invoice_id', invoice_row.id);
  end if;

  select * into booking_row from public.bookings where id = requested_booking_id for update;
  if booking_row.id is null then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if booking_row.status = 'cancelled' then raise exception 'cannot collect a cancelled booking' using errcode = '23514'; end if;

  select * into current_payment from public.payments
  where idempotency_key = btrim(requested_idempotency_key);
  if current_payment.id is not null then
    if current_payment.request_fingerprint <> request_hash then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
    select * into invoice_row from public.invoices where booking_id = current_payment.booking_id;
    return jsonb_build_object('payment', to_jsonb(current_payment) - 'request_fingerprint', 'invoice_id', invoice_row.id);
  end if;

  select coalesce(sum(balance_component_centavos), 0) into pending_balance
  from public.payments
  where booking_id = booking_row.id and status in ('pending', 'failed', 'expired');
  if requested_balance_component_centavos
     > booking_row.total_amount_php::bigint - booking_row.paid_amount_php::bigint - pending_balance then
    raise exception 'balance component exceeds unreserved outstanding balance' using errcode = '23514';
  end if;

  for add_on in
    select parsed.product_id, sum(parsed.quantity)::bigint quantity
    from jsonb_to_recordset(coalesce(requested_add_ons, '[]'::jsonb))
      as parsed(product_id uuid, quantity bigint)
    group by parsed.product_id order by parsed.product_id
  loop
    if add_on.product_id is null or add_on.quantity is null or add_on.quantity <= 0
       or add_on.quantity > 2147483647 then
      raise exception 'each add_on requires product_id and positive quantity' using errcode = '22023';
    end if;
    select p.id as product_id, p.name, p.stock, round(p.price * 100)::bigint unit_price_centavos,
           add_on.quantity quantity into strict add_on
    from public.products p where p.id = add_on.product_id and p.active for update;
    if add_on.unit_price_centavos < 0 then raise exception 'invalid product price' using errcode = '23514'; end if;
    select coalesce(sum(line.quantity), 0) into reserved_quantity
    from public.payment_line_items line
    join public.payments payment on payment.id = line.payment_id
    where line.product_id = add_on.product_id
      and line.line_type = 'add_on'
      and payment.status in ('pending', 'failed', 'expired');
    if add_on.quantity::bigint + reserved_quantity > add_on.stock::bigint then
      raise exception 'add_on quantity exceeds unreserved product stock' using errcode = '23514';
    end if;
    if add_on.unit_price_centavos > 2147483647
       or add_on.quantity > 0 and add_on.unit_price_centavos > 2147483647 / add_on.quantity then
      raise exception 'add_on total exceeds supported range' using errcode = '22003';
    end if;
    add_on_total := add_on_total + add_on.unit_price_centavos * add_on.quantity;
    if add_on_total > 2147483647 then
      raise exception 'add_on total exceeds supported range' using errcode = '22003';
    end if;
  end loop;
  payment_amount := requested_balance_component_centavos + add_on_total;
  if payment_amount <= 0 then raise exception 'payment must include a balance or add-on' using errcode = '22023'; end if;
  if payment_amount > 2147483647
     or booking_row.total_amount_php::bigint + add_on_total > 2147483647
     or booking_row.subtotal_amount_php::bigint + add_on_total > 2147483647 then
    raise exception 'amount exceeds legacy integer range' using errcode = '22003';
  end if;

  select * into invoice_row from public.invoices where booking_id = booking_row.id;
  if invoice_row.id is not null and invoice_row.status = 'void' then
    raise exception 'cannot collect a void invoice' using errcode = '23514';
  end if;
  if invoice_row.id is not null
     and requested_balance_component_centavos
         > invoice_row.total_amount_php::bigint - invoice_row.paid_amount_php::bigint - pending_balance then
    raise exception 'balance component exceeds unreserved invoice balance' using errcode = '23514';
  end if;

  insert into public.payments (
    client_id, booking_id, processor, source, payment_method, payment_purpose,
    status, settlement_status, balance_component_centavos, add_on_amount_centavos,
    amount_centavos, idempotency_key, request_fingerprint, note, receipt_requested,
    create_invoice_requested, prepared_by
  ) values (
    booking_row.client_id, booking_row.id, requested_processor, requested_source, requested_payment_method,
    case when requested_balance_component_centavos > 0 and add_on_total > 0 then 'balance_and_add_on'
         when add_on_total > 0 then 'add_on' else 'balance' end,
    'pending', case when requested_processor = 'paymongo' then 'pending' else 'not_applicable' end,
    requested_balance_component_centavos, add_on_total, payment_amount,
    btrim(requested_idempotency_key), request_hash, nullif(btrim(requested_note), ''),
    requested_receipt, requested_create_invoice, requested_actor_id
  ) returning * into current_payment;

  if requested_balance_component_centavos > 0 then
    insert into public.payment_line_items (
      payment_id, client_id, line_type, description, quantity, unit_price_centavos, total_centavos
    ) values (
      current_payment.id, booking_row.client_id, 'balance', 'Booking balance', 1,
      requested_balance_component_centavos, requested_balance_component_centavos
    );
  end if;
  for add_on in
    select parsed.product_id, sum(parsed.quantity)::bigint quantity
    from jsonb_to_recordset(coalesce(requested_add_ons, '[]'::jsonb))
      as parsed(product_id uuid, quantity bigint)
    group by parsed.product_id order by parsed.product_id
  loop
    insert into public.payment_line_items (
      payment_id, client_id, line_type, product_id, description, quantity,
      unit_price_centavos, total_centavos
    )
    select current_payment.id, booking_row.client_id, 'add_on', p.id, p.name, add_on.quantity::integer,
           round(p.price * 100)::bigint, round(p.price * 100)::bigint * add_on.quantity
    from public.products p where p.id = add_on.product_id;
  end loop;

  insert into public.payment_events (
    payment_id, provider, event_type, event_status, occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'internal', 'payment.prepared', 'processed', now(), now(),
    jsonb_build_object('source', requested_source)
  );
  return jsonb_build_object('payment', to_jsonb(current_payment) - 'request_fingerprint', 'invoice_id', invoice_row.id);
exception when no_data_found then
  raise exception 'add_on product was not found or inactive' using errcode = 'P0002';
end
$$;

-- Internal once-only posting gate. It is not executable by API roles. Every
-- financial aggregate, invoice line, stock movement, allocation, and receipt is
-- committed in the same transaction as the paid state transition.
create or replace function public.payment_post_success(
  requested_payment_id uuid,
  requested_paid_at timestamptz,
  requested_actor_id uuid default null,
  requested_cash_received_centavos bigint default null,
  requested_note text default null,
  requested_provider_event_id text default null,
  requested_event_occurred_at timestamptz default null,
  requested_provider_payload jsonb default null
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  current_payment public.payments;
  booking_row public.bookings;
  invoice_row public.invoices;
  line_row public.payment_line_items;
  receipt_row public.receipts;
  actor_name text := 'Payment service';
  new_stock integer;
  invoice_created boolean := false;
begin
  select * into current_payment from public.payments where id = requested_payment_id for update;
  if current_payment.id is null then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if current_payment.status = 'paid' then return current_payment; end if;
  if current_payment.status not in ('pending', 'failed', 'expired') then
    raise exception 'payment status cannot transition to paid' using errcode = '23514';
  end if;
  if requested_paid_at is null then raise exception 'paid_at is required' using errcode = '22023'; end if;
  if current_payment.payment_method = 'cash' then
    actor_name := public.payment_require_active_staff(requested_actor_id);
    if requested_cash_received_centavos is null
       or requested_cash_received_centavos < current_payment.amount_centavos then
      raise exception 'cash received does not cover payment amount' using errcode = '23514';
    end if;
  elsif requested_actor_id is not null then
    actor_name := public.payment_require_active_staff(requested_actor_id);
  end if;

  select * into booking_row from public.bookings where id = current_payment.booking_id for update;
  select * into invoice_row from public.invoices where booking_id = booking_row.id for update;
  if invoice_row.id is not null and invoice_row.status = 'void' then
    raise exception 'cannot post against a void invoice' using errcode = '23514';
  end if;

  if invoice_row.id is null and current_payment.create_invoice_requested then
    insert into public.invoices (
      client_id, project_id, booking_id, reference, subtotal_amount_php, tax_amount_php,
      total_amount_php, paid_amount_php, status, issued_at
    ) values (
      booking_row.client_id,
      (select id from public.projects where booking_id = booking_row.id order by created_at limit 1),
      booking_row.id, 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      booking_row.subtotal_amount_php,
      booking_row.total_amount_php - booking_row.subtotal_amount_php,
      booking_row.total_amount_php, booking_row.paid_amount_php,
      case when booking_row.paid_amount_php = booking_row.total_amount_php then 'paid'
           when booking_row.paid_amount_php > 0 then 'partially_paid' else 'issued' end,
      now()
    ) returning * into invoice_row;
    invoice_created := true;
  end if;

  if invoice_created and booking_row.subtotal_amount_php > 0 then
    insert into public.invoice_items (
      invoice_id, client_id, kind, description, quantity,
      unit_price_centavos, total_centavos
    ) values (
      invoice_row.id, current_payment.client_id, 'service', booking_row.service_type,
      1, booking_row.subtotal_amount_php, booking_row.subtotal_amount_php
    );
  end if;

  if booking_row.paid_amount_php::bigint + current_payment.amount_centavos
     > booking_row.total_amount_php::bigint + current_payment.add_on_amount_centavos then
    raise exception 'payment exceeds resulting booking total' using errcode = '23514';
  end if;
  if booking_row.total_amount_php::bigint + current_payment.add_on_amount_centavos > 2147483647 then
    raise exception 'resulting booking total exceeds integer range' using errcode = '22003';
  end if;

  for line_row in
    select * from public.payment_line_items where payment_id = current_payment.id order by product_id nulls first for update
  loop
    if line_row.line_type = 'add_on' then
      update public.products
      set stock = stock - line_row.quantity, updated_at = now()
      where id = line_row.product_id and active and stock >= line_row.quantity
      returning stock into new_stock;
      if not found then raise exception 'insufficient stock for product %', line_row.product_id using errcode = '23514'; end if;
      insert into public.inventory_movements (
        product_id, payment_line_item_id, quantity_delta, stock_after, unit_price_centavos, reason
      ) values (
        line_row.product_id, line_row.id, -line_row.quantity, new_stock,
        line_row.unit_price_centavos, 'paid_add_on'
      );
      if invoice_row.id is not null then
        insert into public.invoice_items (
          invoice_id, client_id, product_id, payment_line_item_id, kind, description,
          quantity, unit_price_centavos, total_centavos
        ) values (
          invoice_row.id, current_payment.client_id, line_row.product_id, line_row.id,
          'product', line_row.description, line_row.quantity,
          line_row.unit_price_centavos, line_row.total_centavos
        );
      end if;
    end if;
  end loop;

  update public.bookings
  set subtotal_amount_php = subtotal_amount_php + current_payment.add_on_amount_centavos::integer,
      total_amount_php = total_amount_php + current_payment.add_on_amount_centavos::integer,
      paid_amount_php = paid_amount_php + current_payment.amount_centavos::integer,
      payment_status = case
        when paid_amount_php + current_payment.amount_centavos::integer
             = total_amount_php + current_payment.add_on_amount_centavos::integer then 'paid'
        else 'partially_paid' end,
      status = case
        when current_payment.processor = 'paymongo' and status in ('inquiry', 'quoted') then 'confirmed'
        else status end,
      paymongo_payment_id = case when current_payment.processor = 'paymongo' then current_payment.provider_payment_id else paymongo_payment_id end,
      paymongo_payment_intent_id = case when current_payment.processor = 'paymongo' then current_payment.provider_payment_intent_id else paymongo_payment_intent_id end,
      paymongo_payment_method = case when current_payment.processor = 'paymongo' then current_payment.payment_method_detail else paymongo_payment_method end,
      paymongo_payment_description = case when current_payment.processor = 'paymongo' then current_payment.provider_description else paymongo_payment_description end,
      paymongo_paid_at = case when current_payment.processor = 'paymongo' then requested_paid_at else paymongo_paid_at end
  where id = booking_row.id returning * into booking_row;

  if invoice_row.id is not null then
    if invoice_row.paid_amount_php::bigint + current_payment.amount_centavos
       > invoice_row.total_amount_php::bigint + current_payment.add_on_amount_centavos then
      raise exception 'payment exceeds resulting invoice total' using errcode = '23514';
    end if;
    update public.invoices
    set subtotal_amount_php = subtotal_amount_php + current_payment.add_on_amount_centavos::integer,
        total_amount_php = total_amount_php + current_payment.add_on_amount_centavos::integer,
        paid_amount_php = paid_amount_php + current_payment.amount_centavos::integer,
        status = case
          when paid_amount_php + current_payment.amount_centavos::integer
               = total_amount_php + current_payment.add_on_amount_centavos::integer then 'paid'
          else 'partially_paid' end,
        paid_at = case
          when paid_amount_php + current_payment.amount_centavos::integer
               = total_amount_php + current_payment.add_on_amount_centavos::integer then requested_paid_at
          else null end
    where id = invoice_row.id returning * into invoice_row;
  end if;

  insert into public.payment_allocations (payment_id, client_id, booking_id, invoice_id, amount_centavos)
  values (current_payment.id, current_payment.client_id, booking_row.id, invoice_row.id, current_payment.amount_centavos);

  if current_payment.payment_method = 'cash' then
    insert into public.cash_transactions (
      payment_id, client_id, amount_centavos, cash_received_centavos,
      change_centavos, note, occurred_at, recorded_by
    ) values (
      current_payment.id, current_payment.client_id, current_payment.amount_centavos,
      requested_cash_received_centavos, requested_cash_received_centavos - current_payment.amount_centavos,
      coalesce(nullif(btrim(requested_note), ''), current_payment.note), requested_paid_at, requested_actor_id
    );
  end if;

  update public.payments
  set status = 'paid', paid_at = requested_paid_at, failed_at = null, expired_at = null,
      cancelled_at = null, posted_at = now(),
      note = coalesce(nullif(btrim(requested_note), ''), note)
  where id = current_payment.id returning * into current_payment;

  if requested_provider_event_id is not null then
    insert into public.payment_events (
      payment_id, provider, provider_event_id, event_type, event_status,
      occurred_at, processed_at, payload
    ) values (
      current_payment.id, 'paymongo', btrim(requested_provider_event_id),
      'checkout_session.payment.paid', 'processed', requested_event_occurred_at, now(),
      coalesce(requested_provider_payload, '{}'::jsonb)
    );
  end if;

  if current_payment.receipt_requested then
    insert into public.receipts (
      payment_id, client_id, booking_id, invoice_id, receipt_number, client_name,
      booking_reference, invoice_reference, payment_method, amount_centavos,
      cash_received_centavos, change_centavos, note, issued_at
    )
    select current_payment.id, current_payment.client_id, booking_row.id, invoice_row.id,
      'RCP-' || upper(substr(replace(current_payment.id::text, '-', ''), 1, 16)),
       c.name, booking_row.reference, invoice_row.reference,
       case when current_payment.processor = 'paymongo'
         then coalesce(current_payment.payment_method_detail, 'digital')
         else current_payment.payment_method end,
      current_payment.amount_centavos,
      case when current_payment.payment_method = 'cash' then requested_cash_received_centavos end,
      case when current_payment.payment_method = 'cash' then requested_cash_received_centavos - current_payment.amount_centavos end,
      current_payment.note, requested_paid_at
    from public.clients c where c.id = current_payment.client_id
    returning * into receipt_row;

    insert into public.receipt_line_items (
      receipt_id, client_id, description, quantity, unit_price_centavos, total_centavos
    )
    select receipt_row.id, current_payment.client_id, description, quantity,
           unit_price_centavos, total_centavos
    from public.payment_line_items where payment_id = current_payment.id order by created_at;
  end if;

  insert into public.payment_events (
    payment_id, provider, event_type, event_status, occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'internal', 'payment.posted', 'processed', requested_paid_at, now(),
    jsonb_build_object('method', current_payment.payment_method)
  );
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (
    requested_actor_id, actor_name, 'Payment collected', 'billing', 'payment', current_payment.id,
    jsonb_build_object('method', current_payment.payment_method, 'amount_centavos', current_payment.amount_centavos,
                       'booking_id', current_payment.booking_id)
  );
  return current_payment;
end
$$;

create or replace function public.post_cash_payment(
  requested_payment_id uuid,
  requested_cash_received_centavos bigint,
  requested_actor_id uuid,
  requested_note text default null,
  requested_receipt boolean default true,
  requested_paid_at timestamptz default now()
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments;
begin
  perform public.payment_require_active_staff(requested_actor_id);
  select * into current_payment from public.payments where id = requested_payment_id;
  if current_payment.id is null or current_payment.payment_method <> 'cash' then
    raise exception 'prepared cash payment not found' using errcode = 'P0002';
  end if;
  if current_payment.status not in ('pending', 'paid') then
    raise exception 'cash payment status cannot be posted' using errcode = '23514';
  end if;
  if current_payment.status = 'pending' then
    update public.payments
    set receipt_requested = requested_receipt
    where id = current_payment.id;
  end if;
  return public.payment_post_success(
    requested_payment_id, requested_paid_at, requested_actor_id,
    requested_cash_received_centavos, requested_note, null, null, null
  );
end
$$;

create or replace function public.collect_cash_payment(
  requested_booking_id uuid,
  requested_processor text,
  requested_source text,
  requested_payment_method text,
  requested_balance_component_centavos bigint,
  requested_idempotency_key text,
  requested_add_ons jsonb default '[]'::jsonb,
  requested_create_invoice boolean default false,
  requested_note text default null,
  requested_receipt boolean default true,
  requested_actor_id uuid default null,
  requested_cash_received_centavos bigint default null,
  requested_paid_at timestamptz default now()
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare prepared jsonb;
begin
  prepared := public.prepare_payment_collection(
    requested_booking_id, requested_processor, requested_source, requested_payment_method,
    requested_balance_component_centavos, requested_idempotency_key, requested_add_ons,
    requested_create_invoice, requested_note, requested_receipt, requested_actor_id
  );
  return public.post_cash_payment(
    (prepared->'payment'->>'id')::uuid, requested_cash_received_centavos,
    requested_actor_id, requested_note, requested_receipt, requested_paid_at
  );
end
$$;

create or replace function public.cancel_unbound_payment(
  requested_payment_id uuid,
  requested_actor_id uuid
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments; actor_name text;
begin
  actor_name := public.payment_require_active_staff(requested_actor_id);
  select * into current_payment from public.payments where id = requested_payment_id for update;
  if current_payment.id is null
     or current_payment.status <> 'pending'
     or current_payment.processor <> 'paymongo'
     or current_payment.provider_checkout_session_id is not null then
    raise exception 'unbound pending PayMongo payment not found' using errcode = 'P0002';
  end if;
  update public.payments
  set status = 'cancelled', cancelled_at = now()
  where id = current_payment.id
  returning * into current_payment;
  insert into public.payment_events (
    payment_id, provider, provider_event_id, event_type, event_status,
    occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'internal', 'cancel-unbound:' || current_payment.id,
    'payment.cancelled_unbound', 'processed', current_payment.cancelled_at, now(),
    jsonb_build_object('actor_id', requested_actor_id)
  );
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (
    requested_actor_id, actor_name, 'Unbound payment cancelled', 'billing',
    'payment', current_payment.id, jsonb_build_object('processor', current_payment.processor)
  );
  return current_payment;
end
$$;

-- Releases a provider reservation only after staff has verified that the
-- failed/expired checkout will not be paid. This is intentionally explicit:
-- automatically releasing it could allow a late paid webhook to overpay the booking.
create or replace function public.reconcile_failed_provider_payment(
  requested_payment_id uuid,
  requested_actor_id uuid,
  requested_reason text
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments; actor_name text;
begin
  actor_name := public.payment_require_active_staff(requested_actor_id);
  if length(btrim(coalesce(requested_reason, ''))) not between 5 and 1000 then
    raise exception 'reconciliation reason is required' using errcode = '22023';
  end if;
  select * into current_payment from public.payments where id = requested_payment_id for update;
  if current_payment.id is null
     or current_payment.processor <> 'paymongo'
     or current_payment.status not in ('failed', 'expired') then
    raise exception 'failed or expired PayMongo payment not found' using errcode = 'P0002';
  end if;
  update public.payments
  set status = 'cancelled', failed_at = null, expired_at = null, cancelled_at = now(),
      note = concat_ws(E'\n', note, 'Reconciliation: ' || btrim(requested_reason))
  where id = current_payment.id returning * into current_payment;
  insert into public.payment_events (
    payment_id, provider, provider_event_id, event_type, event_status,
    occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'internal', 'reconcile-failed:' || current_payment.id,
    'payment.reservation_released', 'processed', current_payment.cancelled_at, now(),
    jsonb_build_object('actor_id', requested_actor_id, 'reason', btrim(requested_reason))
  );
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (
    requested_actor_id, actor_name, 'Failed payment reconciled', 'billing', 'payment',
    current_payment.id, jsonb_build_object('reason', btrim(requested_reason), 'new_status', 'cancelled')
  );
  return current_payment;
end
$$;

create or replace function public.mark_paymongo_checkout(
  requested_payment_id uuid,
  requested_checkout_session_id text,
  requested_checkout_url text,
  requested_checkout_expires_at timestamptz,
  requested_payment_intent_id text default null
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments;
begin
  if length(btrim(coalesce(requested_checkout_session_id, ''))) = 0
     or length(btrim(coalesce(requested_checkout_url, ''))) = 0 then
    raise exception 'checkout session ID and URL are required' using errcode = '22023';
  end if;
  select * into current_payment from public.payments where id = requested_payment_id for update;
  if current_payment.id is null or current_payment.processor <> 'paymongo' then
    raise exception 'prepared PayMongo payment not found' using errcode = 'P0002';
  end if;
  if current_payment.status <> 'pending' then return current_payment; end if;
  if current_payment.provider_checkout_session_id is not null
     and current_payment.provider_checkout_session_id <> btrim(requested_checkout_session_id) then
    raise exception 'checkout session mismatch' using errcode = '23514';
  end if;
  if current_payment.provider_payment_intent_id is not null
     and requested_payment_intent_id is not null
     and current_payment.provider_payment_intent_id <> btrim(requested_payment_intent_id) then
    raise exception 'payment intent mismatch' using errcode = '23514';
  end if;
  update public.payments set
    provider_checkout_session_id = coalesce(provider_checkout_session_id, btrim(requested_checkout_session_id)),
    provider_payment_intent_id = coalesce(provider_payment_intent_id, nullif(btrim(requested_payment_intent_id), '')),
    checkout_url = coalesce(checkout_url, requested_checkout_url),
    checkout_expires_at = coalesce(checkout_expires_at, requested_checkout_expires_at)
  where id = current_payment.id returning * into current_payment;
  update public.bookings set
    paymongo_checkout_session_id = coalesce(paymongo_checkout_session_id, current_payment.provider_checkout_session_id),
    paymongo_checkout_url = coalesce(paymongo_checkout_url, current_payment.checkout_url),
    paymongo_payment_intent_id = coalesce(paymongo_payment_intent_id, current_payment.provider_payment_intent_id),
    paymongo_checkout_expires_at = coalesce(paymongo_checkout_expires_at, current_payment.checkout_expires_at),
    checkout_creation_started_at = null,
    payment_status = case when payment_status = 'unpaid' then 'pending' else payment_status end
  where id = current_payment.booking_id;
  return current_payment;
end
$$;

create or replace function public.confirm_paymongo_payment(
  requested_provider_event_id text,
  requested_checkout_session_id text,
  requested_metadata_payment_id uuid,
  requested_provider_payment_id text,
  requested_payment_intent_id text,
  requested_amount_centavos bigint,
  requested_paid_at timestamptz,
  requested_event_occurred_at timestamptz,
  requested_payment_method_detail text,
  requested_description text,
  requested_available_at timestamptz,
  requested_payload jsonb
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare
  current_payment public.payments;
  existing_event public.payment_events;
  settlement_row public.payment_settlements;
begin
  if length(btrim(coalesce(requested_provider_event_id, ''))) = 0
     or length(btrim(coalesce(requested_checkout_session_id, ''))) = 0
     or length(btrim(coalesce(requested_provider_payment_id, ''))) = 0
     or requested_amount_centavos <= 0 or requested_paid_at is null
     or requested_event_occurred_at is null
     or jsonb_typeof(coalesce(requested_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid PayMongo confirmation' using errcode = '22023';
  end if;
  select * into current_payment from public.payments
  where processor = 'paymongo'
    and provider_checkout_session_id = btrim(requested_checkout_session_id)
  for update;
  if current_payment.id is null then raise exception 'PayMongo checkout not found' using errcode = 'P0002'; end if;
  if requested_metadata_payment_id is not null and requested_metadata_payment_id <> current_payment.id then
    raise exception 'PayMongo metadata payment ID mismatch' using errcode = '23514';
  end if;
  if current_payment.amount_centavos <> requested_amount_centavos then
    raise exception 'PayMongo amount mismatch' using errcode = '23514';
  end if;
  if current_payment.status in ('partially_refunded', 'refunded') then
    raise exception 'refunded payment cannot be reconfirmed' using errcode = '23514';
  end if;
  if current_payment.status = 'cancelled' then
    raise exception 'cancelled payment cannot be confirmed' using errcode = '23514';
  end if;
  if current_payment.provider_payment_id is not null
     and current_payment.provider_payment_id <> btrim(requested_provider_payment_id) then
    raise exception 'PayMongo payment ID mismatch' using errcode = '23514';
  end if;
  if current_payment.provider_payment_intent_id is not null
     and requested_payment_intent_id is not null
     and current_payment.provider_payment_intent_id <> btrim(requested_payment_intent_id) then
    raise exception 'PayMongo payment intent mismatch' using errcode = '23514';
  end if;

  select * into existing_event from public.payment_events
  where provider = 'paymongo' and provider_event_id = btrim(requested_provider_event_id);
  if existing_event.id is not null then
    if existing_event.payment_id <> current_payment.id then
      raise exception 'PayMongo event belongs to another payment' using errcode = '23505';
    end if;
    return current_payment;
  end if;

  if current_payment.status = 'paid' then
    insert into public.payment_events (
      payment_id, provider, provider_event_id, event_type, event_status,
      occurred_at, processed_at, payload
    ) values (
      current_payment.id, 'paymongo', btrim(requested_provider_event_id),
      'checkout_session.payment.paid', 'ignored', requested_event_occurred_at, now(),
      coalesce(requested_payload, '{}'::jsonb)
    );
    return current_payment;
  end if;

  update public.payments set
    provider_payment_id = btrim(requested_provider_payment_id),
    provider_payment_intent_id = coalesce(provider_payment_intent_id, nullif(btrim(requested_payment_intent_id), '')),
    payment_method = case
      when nullif(btrim(requested_payment_method_detail), '') in ('card', 'gcash', 'paymaya', 'qrph', 'billease')
        then btrim(requested_payment_method_detail)
      else payment_method
    end,
    payment_method_detail = nullif(btrim(requested_payment_method_detail), ''),
    provider_description = nullif(btrim(requested_description), '')
  where id = current_payment.id returning * into current_payment;

  current_payment := public.payment_post_success(
    current_payment.id, requested_paid_at, null, null, null,
    requested_provider_event_id, requested_event_occurred_at, requested_payload
  );
  insert into public.payment_settlements (
    payment_id, provider, status, gross_amount_centavos, available_at
  ) values (
    current_payment.id, 'paymongo',
    case when requested_available_at is null then 'pending' else 'available' end,
    current_payment.amount_centavos, requested_available_at
  ) on conflict (payment_id) do nothing;
  select * into settlement_row from public.payment_settlements where payment_id = current_payment.id;
  update public.payments set settlement_status = settlement_row.status
  where id = current_payment.id returning * into current_payment;
  update public.bookings set paymongo_available_at = coalesce(paymongo_available_at, requested_available_at)
  where id = current_payment.booking_id;
  return current_payment;
end
$$;

create or replace function public.fail_or_expire_provider_payment(
  requested_provider_event_id text,
  requested_checkout_session_id text,
  requested_metadata_payment_id uuid,
  requested_event_type text,
  requested_event_occurred_at timestamptz,
  requested_payload jsonb
)
returns public.payments language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments; existing_event public.payment_events; target_status text;
begin
  if length(btrim(coalesce(requested_provider_event_id, ''))) = 0
     or length(btrim(coalesce(requested_checkout_session_id, ''))) = 0
     or requested_event_occurred_at is null
     or jsonb_typeof(coalesce(requested_payload, '{}'::jsonb)) <> 'object'
     or requested_event_type not in ('checkout_session.payment.failed', 'checkout_session.expired') then
    raise exception 'unsupported provider event type' using errcode = '22023';
  end if;
  target_status := case when requested_event_type = 'checkout_session.expired' then 'expired' else 'failed' end;
  select * into current_payment from public.payments
  where processor = 'paymongo' and provider_checkout_session_id = btrim(requested_checkout_session_id)
  for update;
  if current_payment.id is null then raise exception 'PayMongo checkout not found' using errcode = 'P0002'; end if;
  if requested_metadata_payment_id is not null and requested_metadata_payment_id <> current_payment.id then
    raise exception 'PayMongo metadata payment ID mismatch' using errcode = '23514';
  end if;
  select * into existing_event from public.payment_events
  where provider = 'paymongo' and provider_event_id = btrim(requested_provider_event_id);
  if existing_event.id is not null then
    if existing_event.payment_id <> current_payment.id then
      raise exception 'PayMongo event belongs to another payment' using errcode = '23505';
    end if;
    return current_payment;
  end if;
  insert into public.payment_events (
    payment_id, provider, provider_event_id, event_type, event_status,
    occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'paymongo', btrim(requested_provider_event_id), requested_event_type,
    case when current_payment.status in ('paid', 'cancelled', 'partially_refunded', 'refunded') then 'ignored' else 'processed' end,
    requested_event_occurred_at, now(), coalesce(requested_payload, '{}'::jsonb)
  );
  if current_payment.status in ('pending', 'failed', 'expired') then
    update public.payments set
      status = target_status,
      failed_at = case when target_status = 'failed' then requested_event_occurred_at end,
      expired_at = case when target_status = 'expired' then requested_event_occurred_at end,
      cancelled_at = null
    where id = current_payment.id returning * into current_payment;
  end if;
  return current_payment;
end
$$;

-- Merchant-only settlement mutation. Its event is the immutable change record;
-- the settlement row is a constrained current-state projection.
create or replace function public.update_paymongo_settlement(
  requested_payment_id uuid,
  requested_provider_event_id text,
  requested_provider_settlement_id text,
  requested_status text,
  requested_fee_amount_centavos bigint,
  requested_net_amount_centavos bigint,
  requested_available_at timestamptz,
  requested_settled_at timestamptz,
  requested_event_occurred_at timestamptz,
  requested_payload jsonb
)
returns public.payment_settlements language plpgsql security definer set search_path = '' as $$
declare current_payment public.payments; settlement_row public.payment_settlements;
begin
  if length(btrim(coalesce(requested_provider_event_id, ''))) = 0
     or requested_event_occurred_at is null
     or jsonb_typeof(coalesce(requested_payload, '{}'::jsonb)) <> 'object'
     or requested_status not in ('pending', 'available', 'settled', 'failed') then
    raise exception 'invalid settlement status' using errcode = '22023';
  end if;
  select * into current_payment from public.payments where id = requested_payment_id for update;
  if current_payment.id is null or current_payment.processor <> 'paymongo' or current_payment.status not in ('paid', 'partially_refunded', 'refunded') then
    raise exception 'paid PayMongo payment not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.payment_events
    where provider = 'paymongo'
      and provider_event_id = btrim(requested_provider_event_id)
      and payment_id <> current_payment.id
  ) then
    raise exception 'PayMongo event belongs to another payment' using errcode = '23505';
  end if;
  insert into public.payment_events (
    payment_id, provider, provider_event_id, event_type, event_status,
    occurred_at, processed_at, payload
  ) values (
    current_payment.id, 'paymongo', btrim(requested_provider_event_id),
    'payment.settlement.' || requested_status, 'processed', requested_event_occurred_at, now(),
    coalesce(requested_payload, '{}'::jsonb)
  ) on conflict (provider, provider_event_id) where provider_event_id is not null do nothing;
  if not found then
    select * into settlement_row from public.payment_settlements where payment_id = current_payment.id;
    return settlement_row;
  end if;
  insert into public.payment_settlements (
    payment_id, provider, provider_settlement_id, status, gross_amount_centavos,
    fee_amount_centavos, net_amount_centavos, available_at, settled_at
  ) values (
    current_payment.id, 'paymongo', nullif(btrim(requested_provider_settlement_id), ''),
    requested_status, current_payment.amount_centavos, requested_fee_amount_centavos,
    requested_net_amount_centavos, requested_available_at, requested_settled_at
  ) on conflict (payment_id) do update set
    provider_settlement_id = coalesce(public.payment_settlements.provider_settlement_id, excluded.provider_settlement_id),
    status = excluded.status, fee_amount_centavos = excluded.fee_amount_centavos,
    net_amount_centavos = excluded.net_amount_centavos, available_at = excluded.available_at,
    settled_at = excluded.settled_at
  returning * into settlement_row;
  update public.payments set settlement_status = requested_status where id = current_payment.id;
  update public.bookings set
    paymongo_available_at = coalesce(paymongo_available_at, requested_available_at),
    paymongo_credited_at = coalesce(paymongo_credited_at, requested_settled_at)
  where id = current_payment.booking_id;
  return settlement_row;
end
$$;

alter table public.payments enable row level security;
alter table public.payment_line_items enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.invoice_items enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_line_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_settlements enable row level security;
alter table public.inventory_movements enable row level security;

-- Views expose customer-safe snapshots only. security_invoker keeps ownership
-- evaluation on the underlying tables; policies exist solely for these reads.
create policy payments_customer_read on public.payments for select to authenticated
using (public.customer_owns_client(client_id));
create policy payment_line_items_customer_read on public.payment_line_items for select to authenticated
using (public.customer_owns_client(client_id));
create policy receipts_customer_read on public.receipts for select to authenticated
using (public.customer_owns_client(client_id));
create policy receipt_line_items_customer_read on public.receipt_line_items for select to authenticated
using (public.customer_owns_client(client_id));

create view public.customer_payments with (security_invoker = true) as
select id, client_id, booking_id, payment_method, payment_purpose, status, currency,
       balance_component_centavos, add_on_amount_centavos, amount_centavos,
       refunded_amount_centavos, note, receipt_requested, paid_at, created_at
from public.payments;

create view public.customer_payment_lines with (security_invoker = true) as
select id, payment_id, client_id, line_type, description, quantity,
       unit_price_centavos, total_centavos, created_at
from public.payment_line_items;

create view public.customer_receipts with (security_invoker = true) as
select id, payment_id, client_id, booking_id, invoice_id, receipt_number,
       client_name, booking_reference, invoice_reference, payment_method,
       amount_centavos, cash_received_centavos, change_centavos, note, issued_at
from public.receipts;

create view public.customer_receipt_lines with (security_invoker = true) as
select id, receipt_id, client_id, description, quantity, unit_price_centavos,
       total_centavos, created_at
from public.receipt_line_items;

revoke all on table public.payments, public.payment_line_items, public.payment_allocations,
  public.invoice_items, public.cash_transactions, public.receipts, public.receipt_line_items,
  public.payment_events, public.payment_settlements, public.inventory_movements
  from anon, authenticated;
revoke insert, update, delete, truncate on table public.payments, public.payment_line_items,
  public.payment_allocations, public.invoice_items, public.cash_transactions, public.receipts,
  public.receipt_line_items, public.payment_events, public.payment_settlements,
  public.inventory_movements from service_role;
revoke all on public.customer_payments, public.customer_payment_lines,
  public.customer_receipts, public.customer_receipt_lines from anon, authenticated;
-- security_invoker views require underlying SELECT privileges. Restrict those
-- grants to exactly the columns projected by the safe views; RLS still enforces
-- customer ownership and the base tables remain unavailable as whole rows.
grant select (
  id, client_id, booking_id, payment_method, payment_purpose, status, currency,
  balance_component_centavos, add_on_amount_centavos, amount_centavos,
  refunded_amount_centavos, note, receipt_requested, paid_at, created_at
) on public.payments to authenticated;
grant select (
  id, payment_id, client_id, line_type, description, quantity,
  unit_price_centavos, total_centavos, created_at
) on public.payment_line_items to authenticated;
grant select (
  id, payment_id, client_id, booking_id, invoice_id, receipt_number, client_name,
  booking_reference, invoice_reference, payment_method, amount_centavos,
  cash_received_centavos, change_centavos, note, issued_at
) on public.receipts to authenticated;
grant select (
  id, receipt_id, client_id, description, quantity, unit_price_centavos,
  total_centavos, created_at
) on public.receipt_line_items to authenticated;
grant select on public.customer_payments, public.customer_payment_lines,
  public.customer_receipts, public.customer_receipt_lines to authenticated;

revoke all on function public.set_payment_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.enforce_payment_settlement_transition() from public, anon, authenticated, service_role;
revoke all on function public.prevent_payment_ledger_mutation() from public, anon, authenticated, service_role;
revoke all on function public.payment_require_active_staff(uuid) from public, anon, authenticated, service_role;
revoke all on function public.payment_post_success(uuid, timestamptz, uuid, bigint, text, text, timestamptz, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.prepare_payment_collection(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.post_cash_payment(uuid, bigint, uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.collect_cash_payment(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_unbound_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reconcile_failed_provider_payment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_paymongo_checkout(uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.confirm_paymongo_payment(text, text, uuid, text, text, bigint, timestamptz, timestamptz, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.fail_or_expire_provider_payment(text, text, uuid, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.update_paymongo_settlement(uuid, text, text, text, bigint, bigint, timestamptz, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.prepare_payment_collection(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid) to service_role;
grant execute on function public.post_cash_payment(uuid, bigint, uuid, text, boolean, timestamptz) to service_role;
grant execute on function public.collect_cash_payment(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) to service_role;
grant execute on function public.cancel_unbound_payment(uuid, uuid) to service_role;
grant execute on function public.reconcile_failed_provider_payment(uuid, uuid, text) to service_role;
grant execute on function public.mark_paymongo_checkout(uuid, text, text, timestamptz, text) to service_role;
grant execute on function public.confirm_paymongo_payment(text, text, uuid, text, text, bigint, timestamptz, timestamptz, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.fail_or_expire_provider_payment(text, text, uuid, text, timestamptz, jsonb) to service_role;
grant execute on function public.update_paymongo_settlement(uuid, text, text, text, bigint, bigint, timestamptz, timestamptz, timestamptz, jsonb) to service_role;

comment on table public.cash_transactions is
  'Cash payment journal only; no register/session model exists in the current architecture.';
comment on function public.prepare_payment_collection(uuid, text, text, text, bigint, text, jsonb, boolean, text, boolean, uuid) is
  'Creates pending immutable snapshots only. add_ons is [{"product_id":"uuid","quantity":1}]. No totals or stock change until successful posting.';
