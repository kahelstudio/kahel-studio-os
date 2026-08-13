-- Minimum cash controls and approved cash refunds. Monetary values are integer
-- PHP centavos, including legacy columns whose names end in _php.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  minimum_cash_centavos bigint not null default 0 check (minimum_cash_centavos >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cash_register_sessions (
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references public.cash_registers(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'pending_review', 'closed')),
  opening_amount_centavos bigint not null check (opening_amount_centavos >= 0),
  expected_amount_centavos bigint check (expected_amount_centavos is null or expected_amount_centavos >= 0),
  counted_amount_centavos bigint check (counted_amount_centavos is null or counted_amount_centavos >= 0),
  variance_centavos bigint,
  opened_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  opened_at timestamptz not null default now(),
  opening_note text check (opening_note is null or length(opening_note) <= 2000),
  close_submitted_at timestamptz,
  close_note text check (close_note is null or length(close_note) <= 2000),
  reviewed_by uuid references public.staff_profiles(user_id) on delete restrict,
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 2000),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cash_register_sessions_close_values_check check (
    (status = 'open' and expected_amount_centavos is null and counted_amount_centavos is null and variance_centavos is null
      and close_submitted_at is null and reviewed_by is null and reviewed_at is null and closed_at is null)
    or
    (status = 'pending_review' and expected_amount_centavos is not null and counted_amount_centavos is not null
      and variance_centavos = counted_amount_centavos - expected_amount_centavos
      and close_submitted_at is not null and reviewed_by is null and reviewed_at is null and closed_at is null)
    or
    (status = 'closed' and expected_amount_centavos is not null and counted_amount_centavos is not null
      and variance_centavos = counted_amount_centavos - expected_amount_centavos
      and close_submitted_at is not null and reviewed_by is not null and reviewed_at is not null and closed_at is not null)
  ),
  constraint cash_register_sessions_separate_reviewer_check check (reviewed_by is null or reviewed_by <> opened_by)
);

create unique index cash_register_sessions_one_active_idx
  on public.cash_register_sessions (register_id) where status in ('open', 'pending_review');
create index cash_register_sessions_opened_idx
  on public.cash_register_sessions (register_id, opened_at desc);

create table public.cash_register_session_events (
  id uuid primary key default gen_random_uuid(),
  register_session_id uuid not null references public.cash_register_sessions(id) on delete restrict,
  event_type text not null check (event_type in ('opened', 'close_submitted', 'close_rejected', 'close_approved')),
  actor_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  note text check (note is null or length(note) <= 2000),
  expected_amount_centavos bigint check (expected_amount_centavos is null or expected_amount_centavos >= 0),
  counted_amount_centavos bigint check (counted_amount_centavos is null or counted_amount_centavos >= 0),
  variance_centavos bigint,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cash_register_session_events_values_check check (
    (event_type = 'opened' and expected_amount_centavos is null and counted_amount_centavos is null and variance_centavos is null)
    or (event_type in ('close_submitted', 'close_rejected', 'close_approved')
      and expected_amount_centavos is not null and counted_amount_centavos is not null
      and variance_centavos = counted_amount_centavos - expected_amount_centavos)
  )
);

create index cash_register_session_events_session_idx
  on public.cash_register_session_events (register_session_id, occurred_at, id);

create table public.cash_register_events (
  id uuid primary key default gen_random_uuid(),
  register_session_id uuid not null references public.cash_register_sessions(id) on delete restrict,
  event_type text not null check (event_type in ('payment_received', 'manual_cash_in', 'manual_cash_out', 'cash_refund')),
  direction text not null check (direction in ('in', 'out')),
  amount_centavos bigint not null check (amount_centavos > 0),
  payment_id uuid references public.payments(id) on delete restrict,
  refund_id uuid,
  idempotency_key text check (idempotency_key is null or length(btrim(idempotency_key)) between 8 and 200),
  reason text check (reason is null or length(btrim(reason)) between 3 and 1000),
  actor_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cash_register_events_shape_check check (
    (event_type = 'payment_received' and direction = 'in' and payment_id is not null and refund_id is null and idempotency_key is null)
    or (event_type in ('manual_cash_in', 'manual_cash_out') and direction = case when event_type = 'manual_cash_in' then 'in' else 'out' end
      and payment_id is null and refund_id is null and idempotency_key is not null and reason is not null)
    or (event_type = 'cash_refund' and direction = 'out' and payment_id is not null and refund_id is not null and idempotency_key is null)
  )
);

create unique index cash_register_events_payment_key
  on public.cash_register_events (payment_id) where event_type = 'payment_received';
create unique index cash_register_events_refund_key
  on public.cash_register_events (refund_id) where event_type = 'cash_refund';
create unique index cash_register_events_manual_idempotency_key
  on public.cash_register_events (register_session_id, idempotency_key) where idempotency_key is not null;
create index cash_register_events_session_idx
  on public.cash_register_events (register_session_id, occurred_at, id);

alter table public.cash_transactions
  add column register_session_id uuid references public.cash_register_sessions(id) on delete restrict;
create index cash_transactions_register_session_idx
  on public.cash_transactions (register_session_id, occurred_at) where register_session_id is not null;

alter table public.invoices
  add column refunded_amount_centavos bigint not null default 0,
  add constraint invoices_refunded_amount_check check (
    refunded_amount_centavos >= 0 and refunded_amount_centavos <= paid_amount_php::bigint
  );

alter table public.bookings drop constraint bookings_check;
alter table public.bookings add constraint bookings_net_paid_check check (
  paid_amount_php >= 0 and paid_amount_php::bigint - refunded_amount_php::bigint <= total_amount_php::bigint
);
alter table public.invoices drop constraint invoices_check;
alter table public.invoices add constraint invoices_net_paid_check check (
  paid_amount_php >= 0 and paid_amount_php::bigint - refunded_amount_centavos <= total_amount_php::bigint
);

create table public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null unique references public.approval_requests(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  booking_id uuid not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  amount_centavos bigint not null check (amount_centavos > 0),
  refund_method text not null default 'cash' check (refund_method = 'cash'),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  actor_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  refunded_at timestamptz not null default now(),
  register_session_id uuid references public.cash_register_sessions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint payment_refunds_payment_client_fkey foreign key (payment_id, client_id)
    references public.payments(id, client_id) on delete restrict,
  constraint payment_refunds_booking_client_fkey foreign key (booking_id, client_id)
    references public.bookings(id, client_id) on delete restrict
);

alter table public.cash_register_events
  add constraint cash_register_events_refund_fkey foreign key (refund_id)
    references public.payment_refunds(id) on delete restrict;

create index payment_refunds_payment_idx on public.payment_refunds (payment_id, refunded_at);
create index payment_refunds_booking_idx on public.payment_refunds (booking_id, refunded_at);
create index payment_refunds_client_idx on public.payment_refunds (client_id, refunded_at desc);

insert into public.locations (id, code, name, minimum_cash_centavos, active)
values ('20000000-0000-4000-8000-000000000001', 'main-studio', 'Main Studio', 0, true)
on conflict (code) do update set name = excluded.name, active = true;

insert into public.cash_registers (id, location_id, code, name, active)
select '20000000-0000-4000-8000-000000000002', id, 'main-studio-register', 'Main Studio Register', true
from public.locations where code = 'main-studio'
on conflict (code) do update set location_id = excluded.location_id, name = excluded.name, active = true;

create or replace function public.prevent_cash_journal_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception '% records are append-only', tg_table_name using errcode = '55000';
end
$$;

create trigger cash_register_events_append_only before update or delete on public.cash_register_events
for each row execute function public.prevent_cash_journal_mutation();
create trigger cash_register_session_events_append_only before update or delete on public.cash_register_session_events
for each row execute function public.prevent_cash_journal_mutation();
create trigger payment_refunds_append_only before update or delete on public.payment_refunds
for each row execute function public.prevent_cash_journal_mutation();

-- Generic approval financial recording must never fulfill a client refund. The
-- guarded path additionally proves that the referenced immutable refund exists
-- and exactly matches this event, so setting the custom GUC alone is insufficient.
create or replace function public.enforce_client_refund_financial_event()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.approval_requests
    where id = new.request_id and request_type = 'client_refund'
  ) and not (
    current_setting('app.cash_refund_financial_event', true) = 'on'
    and new.event_type = 'payment'
    and new.payment_method = 'cash'
    and exists (
      select 1 from public.payment_refunds r
      where r.id::text = new.transaction_reference
        and r.approval_request_id = new.request_id
        and r.amount_centavos = new.amount_php::bigint
        and r.actor_id = new.recorded_by
    )
  ) then
    raise exception 'client refund financial events must be recorded by refund_cash_payment' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger enforce_client_refund_financial_event before insert on public.approval_financial_events
for each row execute function public.enforce_client_refund_financial_event();

-- Sessions are current-state records, but only the close workflow may mutate them.
create or replace function public.enforce_cash_register_session_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.register_id <> new.register_id
     or old.opening_amount_centavos <> new.opening_amount_centavos
     or old.opened_by <> new.opened_by
     or old.opened_at <> new.opened_at
     or old.opening_note is distinct from new.opening_note
     or old.created_at <> new.created_at
     or not (
       (old.status = 'open' and new.status in ('pending_review', 'open'))
       or (old.status = 'pending_review' and new.status in ('closed', 'open', 'pending_review'))
     ) then
    raise exception 'invalid cash register session transition' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger enforce_cash_register_session_transition before update on public.cash_register_sessions
for each row execute function public.enforce_cash_register_session_transition();

-- cash_transactions remains append-only. This one-time null-to-session assignment
-- is available only inside the register collection RPC and cannot alter cash data.
create or replace function public.prevent_cash_transaction_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and current_setting('app.link_cash_register_session', true) = 'on'
     and old.register_session_id is null and new.register_session_id is not null
     and (to_jsonb(new) - 'register_session_id') = (to_jsonb(old) - 'register_session_id') then
    return new;
  end if;
  raise exception 'cash_transactions records are append-only' using errcode = '55000';
end
$$;

drop trigger if exists cash_transactions_append_only on public.cash_transactions;
create trigger cash_transactions_append_only before update or delete on public.cash_transactions
for each row execute function public.prevent_cash_transaction_mutation();

-- Refund-aware replacement of the original preparation function. Gross paid
-- remains historical; refunded value reopens collectible booking/invoice balance.
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
  booking_outstanding bigint;
  invoice_outstanding bigint;
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
  if requested_payment_method = 'cash'
     and current_setting('app.cash_register_collection', true) is distinct from 'on' then
    raise exception 'cash preparation requires the register collection workflow' using errcode = '42501';
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
  booking_outstanding := booking_row.total_amount_php::bigint
    - (booking_row.paid_amount_php::bigint - booking_row.refunded_amount_php::bigint);
  if requested_balance_component_centavos > booking_outstanding - pending_balance then
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
    where line.product_id = add_on.product_id and line.line_type = 'add_on'
      and payment.status in ('pending', 'failed', 'expired');
    if add_on.quantity::bigint + reserved_quantity > add_on.stock::bigint then
      raise exception 'add_on quantity exceeds unreserved product stock' using errcode = '23514';
    end if;
    if add_on.unit_price_centavos > 2147483647
       or add_on.quantity > 0 and add_on.unit_price_centavos > 2147483647 / add_on.quantity then
      raise exception 'add_on total exceeds supported range' using errcode = '22003';
    end if;
    add_on_total := add_on_total + add_on.unit_price_centavos * add_on.quantity;
    if add_on_total > 2147483647 then raise exception 'add_on total exceeds supported range' using errcode = '22003'; end if;
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
  if invoice_row.id is not null then
    invoice_outstanding := invoice_row.total_amount_php::bigint
      - (invoice_row.paid_amount_php::bigint - invoice_row.refunded_amount_centavos);
    if requested_balance_component_centavos > invoice_outstanding - pending_balance then
      raise exception 'balance component exceeds unreserved invoice balance' using errcode = '23514';
    end if;
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

-- Preserve the prior posting implementation for inventory, allocation, receipt,
-- provider, and audit behavior. The wrapper presents net paid to that function,
-- then restores cumulative gross paid and refund history before commit.
alter function public.payment_post_success(uuid, timestamptz, uuid, bigint, text, text, timestamptz, jsonb)
  rename to payment_post_success_before_refunds;

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
  payment_row public.payments;
  booking_row public.bookings;
  invoice_row public.invoices;
  result public.payments;
  booking_refunds integer;
  invoice_refunds bigint;
  invoice_existed boolean;
begin
  select * into payment_row from public.payments where id = requested_payment_id for update;
  if payment_row.id is null then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if payment_row.status = 'paid' then return payment_row; end if;
  select * into booking_row from public.bookings where id = payment_row.booking_id for update;
  select * into invoice_row from public.invoices where booking_id = booking_row.id for update;
  booking_refunds := booking_row.refunded_amount_php;
  invoice_existed := invoice_row.id is not null;
  invoice_refunds := coalesce(invoice_row.refunded_amount_centavos, 0);

  if booking_refunds > 0 then
    update public.bookings
    set paid_amount_php = paid_amount_php - refunded_amount_php,
        refunded_amount_php = 0
    where id = booking_row.id;
  end if;
  if invoice_existed and invoice_refunds > 0 then
    update public.invoices
    set paid_amount_php = paid_amount_php - refunded_amount_centavos::integer,
        refunded_amount_centavos = 0
    where id = invoice_row.id;
  end if;

  result := public.payment_post_success_before_refunds(
    requested_payment_id, requested_paid_at, requested_actor_id,
    requested_cash_received_centavos, requested_note, requested_provider_event_id,
    requested_event_occurred_at, requested_provider_payload
  );

  if booking_refunds > 0 then
    update public.bookings
    set paid_amount_php = paid_amount_php + booking_refunds,
        refunded_amount_php = booking_refunds
    where id = booking_row.id;
  end if;
  select * into invoice_row from public.invoices where booking_id = booking_row.id for update;
  if invoice_row.id is not null then
    if invoice_existed and invoice_refunds > 0 then
      update public.invoices
      set paid_amount_php = paid_amount_php + invoice_refunds::integer,
          refunded_amount_centavos = invoice_refunds
      where id = invoice_row.id;
    elsif not invoice_existed and booking_refunds > 0 then
      update public.invoices
      set paid_amount_php = paid_amount_php + booking_refunds,
          refunded_amount_centavos = booking_refunds
      where id = invoice_row.id;
    end if;
  end if;
  return result;
end
$$;

create or replace function public.open_cash_register(
  requested_register_id uuid,
  requested_opening_amount_centavos bigint,
  requested_actor_id uuid,
  requested_note text default null
)
returns public.cash_register_sessions language plpgsql security definer set search_path = '' as $$
declare register_row record; result public.cash_register_sessions;
begin
  perform public.payment_require_active_staff(requested_actor_id);
  if requested_opening_amount_centavos is null or requested_opening_amount_centavos < 0
     or length(coalesce(requested_note, '')) > 2000 then
    raise exception 'invalid register opening' using errcode = '22023';
  end if;
  select r.id, l.minimum_cash_centavos into register_row
  from public.cash_registers r join public.locations l on l.id = r.location_id
  where r.id = requested_register_id and r.active and l.active for update of r;
  if register_row.id is null then raise exception 'active cash register not found' using errcode = 'P0002'; end if;
  if requested_opening_amount_centavos < register_row.minimum_cash_centavos then
    raise exception 'opening cash is below the location minimum' using errcode = '23514';
  end if;
  insert into public.cash_register_sessions (register_id, opening_amount_centavos, opened_by, opening_note)
  values (requested_register_id, requested_opening_amount_centavos, requested_actor_id, nullif(btrim(requested_note), ''))
  returning * into result;
  insert into public.cash_register_session_events (register_session_id, event_type, actor_id, note)
  values (result.id, 'opened', requested_actor_id, nullif(btrim(requested_note), ''));
  return result;
end
$$;

create or replace function public.get_cash_collection_registers()
returns table (
  register_id uuid,
  register_code text,
  register_name text,
  location_id uuid,
  location_name text,
  minimum_cash_centavos bigint,
  session_id uuid,
  session_status text,
  opened_by uuid,
  opened_at timestamptz,
  opening_amount_centavos bigint
) language sql security definer set search_path = '' as $$
  select r.id, r.code, r.name, l.id, l.name, l.minimum_cash_centavos,
    s.id, s.status, s.opened_by, s.opened_at, s.opening_amount_centavos
  from public.cash_registers r
  join public.locations l on l.id = r.location_id
  left join public.cash_register_sessions s on s.register_id = r.id
    and s.status in ('open', 'pending_review')
  where r.active and l.active
  order by l.name, r.name
$$;

create or replace function public.record_manual_cash_event(
  requested_session_id uuid,
  requested_event_type text,
  requested_amount_centavos bigint,
  requested_actor_id uuid,
  requested_reason text,
  requested_idempotency_key text
)
returns public.cash_register_events language plpgsql security definer set search_path = '' as $$
declare session_row record; existing public.cash_register_events; result public.cash_register_events; current_cash bigint;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_actor_id and active and role = 'super_admin') then
    raise exception 'Super Admin access is required' using errcode = '42501';
  end if;
  if requested_event_type not in ('manual_cash_in', 'manual_cash_out') or requested_amount_centavos <= 0
     or length(btrim(coalesce(requested_reason, ''))) not between 3 and 1000
     or length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200 then
    raise exception 'invalid manual cash event' using errcode = '22023';
  end if;
  select * into existing from public.cash_register_events
  where register_session_id = requested_session_id and idempotency_key = btrim(requested_idempotency_key);
  if existing.id is not null then
    if existing.event_type <> requested_event_type or existing.amount_centavos <> requested_amount_centavos
       or existing.actor_id <> requested_actor_id or existing.reason <> btrim(requested_reason) then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
  end if;
  select s.id, s.status, s.opening_amount_centavos, l.minimum_cash_centavos into session_row
  from public.cash_register_sessions s
  join public.cash_registers r on r.id = s.register_id
  join public.locations l on l.id = r.location_id
  where s.id = requested_session_id for update of s;
  if session_row.id is null then raise exception 'register session not found' using errcode = 'P0002'; end if;
  select * into existing from public.cash_register_events
  where register_session_id = requested_session_id and idempotency_key = btrim(requested_idempotency_key);
  if existing.id is not null then
    if existing.event_type <> requested_event_type or existing.amount_centavos <> requested_amount_centavos
       or existing.actor_id <> requested_actor_id or existing.reason <> btrim(requested_reason) then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
    return existing;
  end if;
  if session_row.status <> 'open' then raise exception 'open register session not found' using errcode = 'P0002'; end if;
  select session_row.opening_amount_centavos
    + coalesce(sum(case direction when 'in' then amount_centavos else -amount_centavos end), 0)
  into current_cash from public.cash_register_events where register_session_id = requested_session_id;
  if requested_event_type = 'manual_cash_out'
     and current_cash - requested_amount_centavos < session_row.minimum_cash_centavos then
    raise exception 'cash out would breach the location minimum' using errcode = '23514';
  end if;
  insert into public.cash_register_events (
    register_session_id, event_type, direction, amount_centavos, idempotency_key, reason, actor_id
  ) values (
    requested_session_id, requested_event_type,
    case when requested_event_type = 'manual_cash_in' then 'in' else 'out' end,
    requested_amount_centavos, btrim(requested_idempotency_key), btrim(requested_reason), requested_actor_id
  ) returning * into result;
  return result;
end
$$;

create or replace function public.submit_cash_register_close(
  requested_session_id uuid,
  requested_counted_amount_centavos bigint,
  requested_actor_id uuid,
  requested_note text default null
)
returns public.cash_register_sessions language plpgsql security definer set search_path = '' as $$
declare result public.cash_register_sessions; expected_cash bigint;
begin
  perform public.payment_require_active_staff(requested_actor_id);
  if requested_counted_amount_centavos is null or requested_counted_amount_centavos < 0
     or length(coalesce(requested_note, '')) > 2000 then
    raise exception 'invalid close submission' using errcode = '22023';
  end if;
  select * into result from public.cash_register_sessions where id = requested_session_id for update;
  if result.id is null or result.status <> 'open' then raise exception 'open register session not found' using errcode = 'P0002'; end if;
  if result.opened_by <> requested_actor_id then raise exception 'only the opener may submit this close' using errcode = '42501'; end if;
  select result.opening_amount_centavos
    + coalesce(sum(case direction when 'in' then amount_centavos else -amount_centavos end), 0)
  into expected_cash from public.cash_register_events where register_session_id = result.id;
  if expected_cash < 0 then raise exception 'register expected cash cannot be negative' using errcode = '23514'; end if;
  update public.cash_register_sessions set status = 'pending_review', expected_amount_centavos = expected_cash,
    counted_amount_centavos = requested_counted_amount_centavos,
    variance_centavos = requested_counted_amount_centavos - expected_cash,
    close_submitted_at = now(), close_note = nullif(btrim(requested_note), '')
  where id = result.id returning * into result;
  insert into public.cash_register_session_events (
    register_session_id, event_type, actor_id, note,
    expected_amount_centavos, counted_amount_centavos, variance_centavos
  ) values (
    result.id, 'close_submitted', requested_actor_id, result.close_note,
    result.expected_amount_centavos, result.counted_amount_centavos, result.variance_centavos
  );
  return result;
end
$$;

create or replace function public.review_cash_register_close(
  requested_session_id uuid,
  requested_reviewer_id uuid,
  requested_approve boolean,
  requested_note text default null
)
returns public.cash_register_sessions language plpgsql security definer set search_path = '' as $$
declare result public.cash_register_sessions;
begin
  if not exists (select 1 from public.staff_profiles where user_id = requested_reviewer_id and active and role in ('admin', 'super_admin')) then
    raise exception 'Admin access is required' using errcode = '42501';
  end if;
  if requested_approve is null or length(coalesce(requested_note, '')) > 2000 then
    raise exception 'invalid close review' using errcode = '22023';
  end if;
  select * into result from public.cash_register_sessions where id = requested_session_id for update;
  if result.id is null or result.status <> 'pending_review' then raise exception 'pending close not found' using errcode = 'P0002'; end if;
  if result.opened_by = requested_reviewer_id then
    raise exception 'the opener cannot review their own close' using errcode = '42501';
  end if;
  if requested_approve then
    update public.cash_register_sessions set status = 'closed', reviewed_by = requested_reviewer_id,
      reviewed_at = now(), review_note = nullif(btrim(requested_note), ''), closed_at = now()
    where id = result.id returning * into result;
    insert into public.cash_register_session_events (
      register_session_id, event_type, actor_id, note,
      expected_amount_centavos, counted_amount_centavos, variance_centavos
    ) values (
      result.id, 'close_approved', requested_reviewer_id, result.review_note,
      result.expected_amount_centavos, result.counted_amount_centavos, result.variance_centavos
    );
  else
    insert into public.cash_register_session_events (
      register_session_id, event_type, actor_id, note,
      expected_amount_centavos, counted_amount_centavos, variance_centavos
    ) values (
      result.id, 'close_rejected', requested_reviewer_id, nullif(btrim(requested_note), ''),
      result.expected_amount_centavos, result.counted_amount_centavos, result.variance_centavos
    );
    update public.cash_register_sessions set status = 'open', expected_amount_centavos = null,
      counted_amount_centavos = null, variance_centavos = null, close_submitted_at = null,
      close_note = null, reviewed_by = null, reviewed_at = null, review_note = null, closed_at = null
    where id = result.id returning * into result;
  end if;
  return result;
end
$$;

create or replace function public.collect_cash_payment_with_register(
  requested_register_session_id uuid,
  requested_booking_id uuid,
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
declare
  prepared jsonb;
  result public.payments;
  cash_row public.cash_transactions;
  existing_event public.cash_register_events;
  was_already_paid boolean;
begin
  perform public.payment_require_active_staff(requested_actor_id);
  perform set_config('app.cash_register_collection', 'on', true);
  prepared := public.prepare_payment_collection(
    requested_booking_id, 'none', 'staff', 'cash', requested_balance_component_centavos,
    requested_idempotency_key, requested_add_ons, requested_create_invoice,
    requested_note, requested_receipt, requested_actor_id
  );
  perform set_config('app.cash_register_collection', 'off', true);
  select * into result from public.payments
  where id = (prepared->'payment'->>'id')::uuid for update;
  was_already_paid := result.status = 'paid';
  if not exists (
    select 1 from public.cash_register_sessions
    where id = requested_register_session_id and status = 'open' for update
  ) then raise exception 'open register session not found' using errcode = 'P0002'; end if;
  if was_already_paid then
    select * into cash_row from public.cash_transactions where payment_id = result.id;
    select * into existing_event from public.cash_register_events
    where payment_id = result.id and event_type = 'payment_received';
    if cash_row.id is null or cash_row.register_session_id is distinct from requested_register_session_id
       or existing_event.id is null or existing_event.register_session_id <> requested_register_session_id
       or existing_event.amount_centavos <> cash_row.amount_centavos then
      raise exception 'paid cash retry is not registered to the requested session' using errcode = '23514';
    end if;
    return result;
  end if;
  if result.status <> 'pending' then
    raise exception 'cash payment status cannot be posted' using errcode = '23514';
  end if;
  result := public.post_cash_payment(
    result.id, requested_cash_received_centavos,
    requested_actor_id, requested_note, requested_receipt, requested_paid_at
  );
  select * into cash_row from public.cash_transactions where payment_id = result.id for update;
  if cash_row.register_session_id is not null and cash_row.register_session_id <> requested_register_session_id then
    raise exception 'payment is already assigned to another register session' using errcode = '23514';
  end if;
  if cash_row.register_session_id is null then
    perform set_config('app.link_cash_register_session', 'on', true);
    update public.cash_transactions set register_session_id = requested_register_session_id where id = cash_row.id
    returning * into cash_row;
    perform set_config('app.link_cash_register_session', 'off', true);
  end if;
  select * into existing_event from public.cash_register_events
  where payment_id = result.id and event_type = 'payment_received';
  if existing_event.id is not null and (existing_event.register_session_id <> requested_register_session_id
     or existing_event.amount_centavos <> cash_row.amount_centavos) then
    raise exception 'cash payment register event mismatch' using errcode = '23514';
  end if;
  if existing_event.id is null then
    insert into public.cash_register_events (
      register_session_id, event_type, direction, amount_centavos, payment_id, actor_id, occurred_at
    ) values (
      requested_register_session_id, 'payment_received', 'in', cash_row.amount_centavos,
      result.id, requested_actor_id, cash_row.occurred_at
    );
  end if;
  return result;
end
$$;

create or replace function public.refund_cash_payment(
  requested_payment_id uuid,
  requested_approval_request_id uuid,
  requested_amount_centavos bigint,
  requested_actor_id uuid,
  requested_idempotency_key text,
  requested_reason text,
  requested_register_session_id uuid default null
)
returns public.payment_refunds language plpgsql security definer set search_path = '' as $$
declare
  payment_row public.payments; approval_row public.approval_requests; existing public.payment_refunds;
  result public.payment_refunds; booking_row public.bookings; invoice_row public.invoices;
  actor_name text; cumulative_refunds bigint; new_booking_refunds bigint; net_invoice_paid bigint;
  session_row record; session_cash bigint;
begin
  select display_name into actor_name from public.staff_profiles
  where user_id = requested_actor_id and active and role = 'super_admin';
  if actor_name is null then raise exception 'Super Admin access is required' using errcode = '42501'; end if;
  if requested_amount_centavos is null or requested_amount_centavos <= 0
     or length(btrim(coalesce(requested_idempotency_key, ''))) not between 8 and 200
     or length(btrim(coalesce(requested_reason, ''))) not between 3 and 1000 then
    raise exception 'invalid cash refund' using errcode = '22023';
  end if;
  select * into existing from public.payment_refunds where idempotency_key = btrim(requested_idempotency_key);
  if existing.id is not null then
    if existing.payment_id <> requested_payment_id or existing.approval_request_id <> requested_approval_request_id
       or existing.amount_centavos <> requested_amount_centavos or existing.actor_id <> requested_actor_id
       or existing.reason <> btrim(requested_reason)
       or existing.register_session_id is distinct from requested_register_session_id then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
  end if;
  select * into payment_row from public.payments where id = requested_payment_id for update;
  if payment_row.id is null then raise exception 'payment not found' using errcode = 'P0002'; end if;
  select * into booking_row from public.bookings where id = payment_row.booking_id for update;
  select * into approval_row from public.approval_requests where id = requested_approval_request_id for update;
  if requested_register_session_id is not null then
    select s.id, s.status, s.opening_amount_centavos, l.minimum_cash_centavos into session_row
    from public.cash_register_sessions s
    join public.cash_registers r on r.id = s.register_id
    join public.locations l on l.id = r.location_id
    where s.id = requested_register_session_id for update of s;
    if session_row.id is null then raise exception 'register session not found' using errcode = 'P0002'; end if;
  end if;
  select * into existing from public.payment_refunds where idempotency_key = btrim(requested_idempotency_key);
  if existing.id is not null then
    if existing.payment_id <> requested_payment_id or existing.approval_request_id <> requested_approval_request_id
       or existing.amount_centavos <> requested_amount_centavos or existing.actor_id <> requested_actor_id
       or existing.reason <> btrim(requested_reason)
       or existing.register_session_id is distinct from requested_register_session_id then
      raise exception 'idempotency key was used with different details' using errcode = '23505';
    end if;
    return existing;
  end if;
  if requested_register_session_id is not null then
    if session_row.status <> 'open' then raise exception 'open register session not found' using errcode = 'P0002'; end if;
    select session_row.opening_amount_centavos
      + coalesce(sum(case direction when 'in' then amount_centavos else -amount_centavos end), 0)
    into session_cash from public.cash_register_events where register_session_id = requested_register_session_id;
    if session_cash - requested_amount_centavos < session_row.minimum_cash_centavos then
      raise exception 'cash refund would breach the location minimum' using errcode = '23514';
    end if;
  end if;
  if payment_row.payment_method <> 'cash' or payment_row.processor <> 'none'
     or payment_row.source = 'legacy_import' or payment_row.add_on_amount_centavos <> 0
     or payment_row.status not in ('paid', 'partially_refunded') then
    raise exception 'refundable nonlegacy cash balance payment not found' using errcode = 'P0002';
  end if;
  if approval_row.id is null or approval_row.status <> 'approved' or approval_row.request_type <> 'client_refund'
     or approval_row.source_record_id is distinct from payment_row.id
     or approval_row.booking_id is distinct from payment_row.booking_id
     or approval_row.client_id is distinct from payment_row.client_id
     or approval_row.amount_php is null or requested_amount_centavos <> approval_row.amount_php::bigint
     or approval_row.fulfillment_status = 'paid' then
    raise exception 'approved payment-bound client refund not found or amount differs from approval' using errcode = '23514';
  end if;
  if exists (select 1 from public.payment_refunds where approval_request_id = approval_row.id) then
    raise exception 'approval has already been fulfilled' using errcode = '23505';
  end if;
  select coalesce(sum(amount_centavos), 0) into cumulative_refunds
  from public.payment_refunds where payment_id = payment_row.id;
  if cumulative_refunds <> payment_row.refunded_amount_centavos
     or cumulative_refunds + requested_amount_centavos > payment_row.amount_centavos then
    raise exception 'refund exceeds payment or ledger is inconsistent' using errcode = '23514';
  end if;
  if booking_row.refunded_amount_php::bigint + requested_amount_centavos > booking_row.paid_amount_php::bigint then
    raise exception 'refund exceeds booking gross paid amount' using errcode = '23514';
  end if;
  insert into public.payment_refunds (
    approval_request_id, payment_id, booking_id, client_id, amount_centavos,
    reason, idempotency_key, actor_id, register_session_id
  ) values (
    approval_row.id, payment_row.id, payment_row.booking_id, payment_row.client_id,
    requested_amount_centavos, btrim(requested_reason), btrim(requested_idempotency_key),
    requested_actor_id, requested_register_session_id
  ) returning * into result;
  update public.payments set refunded_amount_centavos = refunded_amount_centavos + requested_amount_centavos,
    status = case when refunded_amount_centavos + requested_amount_centavos = amount_centavos then 'refunded' else 'partially_refunded' end
  where id = payment_row.id returning * into payment_row;
  new_booking_refunds := booking_row.refunded_amount_php::bigint + requested_amount_centavos;
  update public.bookings set refunded_amount_php = new_booking_refunds::integer,
    payment_status = case when new_booking_refunds = paid_amount_php::bigint then 'refunded' else 'partially_paid' end
  where id = booking_row.id;
  select * into invoice_row from public.invoices where booking_id = booking_row.id for update;
  if invoice_row.id is not null then
    net_invoice_paid := invoice_row.paid_amount_php::bigint - invoice_row.refunded_amount_centavos - requested_amount_centavos;
    update public.invoices set refunded_amount_centavos = refunded_amount_centavos + requested_amount_centavos,
      status = case when status = 'void' then 'void' when net_invoice_paid >= total_amount_php::bigint then 'paid'
        when net_invoice_paid > 0 then 'partially_paid'
        when due_at is not null and due_at < now() then 'overdue' else 'issued' end,
      paid_at = case when net_invoice_paid >= total_amount_php::bigint then paid_at else null end
    where id = invoice_row.id;
  end if;
  update public.approval_requests set fulfillment_status = 'paid', completed_at = coalesce(completed_at, now())
  where id = approval_row.id;
  perform set_config('app.cash_refund_financial_event', 'on', true);
  insert into public.approval_financial_events (
    request_id, event_type, amount_php, payment_method, transaction_reference, recorded_by, occurred_at, notes
  ) values (
    approval_row.id, 'payment', requested_amount_centavos::integer, 'cash', result.id::text,
    requested_actor_id, result.refunded_at, btrim(requested_reason)
  );
  perform set_config('app.cash_refund_financial_event', 'off', true);
  insert into public.approval_audit_log (request_id, actor_id, action, previous_state, new_state, comment, metadata)
  values (approval_row.id, requested_actor_id, 'refund_paid', to_jsonb(approval_row),
    jsonb_build_object('fulfillment_status', 'paid'), btrim(requested_reason),
    jsonb_build_object('refund_id', result.id, 'payment_id', payment_row.id, 'amount_centavos', requested_amount_centavos));
  insert into public.payment_events (
    payment_id, provider, provider_event_id, event_type, event_status, occurred_at, processed_at, payload
  ) values (
    payment_row.id, 'internal', 'cash-refund:' || result.id, 'payment.cash_refunded', 'processed',
    result.refunded_at, now(), jsonb_build_object('refund_id', result.id, 'approval_request_id', approval_row.id,
      'amount_centavos', requested_amount_centavos, 'register_session_id', requested_register_session_id)
  );
  insert into public.staff_audit_log (actor_id, actor_name, event, event_type, entity_type, entity_id, metadata)
  values (requested_actor_id, actor_name, 'Cash refund paid', 'billing', 'payment_refund', result.id,
    jsonb_build_object('payment_id', payment_row.id, 'approval_request_id', approval_row.id,
      'amount_centavos', requested_amount_centavos, 'register_session_id', requested_register_session_id));
  if requested_register_session_id is not null then
    insert into public.cash_register_events (
      register_session_id, event_type, direction, amount_centavos, payment_id, refund_id, reason, actor_id, occurred_at
    ) values (
      requested_register_session_id, 'cash_refund', 'out', requested_amount_centavos,
      payment_row.id, result.id, btrim(requested_reason), requested_actor_id, result.refunded_at
    );
  end if;
  return result;
end
$$;

alter table public.locations enable row level security;
alter table public.cash_registers enable row level security;
alter table public.cash_register_sessions enable row level security;
alter table public.cash_register_session_events enable row level security;
alter table public.cash_register_events enable row level security;
alter table public.payment_refunds enable row level security;

create policy payment_refunds_customer_read on public.payment_refunds for select to authenticated
using (public.customer_owns_client(client_id));

create view public.customer_payment_refunds with (security_invoker = true) as
select id, payment_id, booking_id, client_id, amount_centavos, refund_method, reason, refunded_at
from public.payment_refunds;

revoke all on table public.locations, public.cash_registers, public.cash_register_sessions,
  public.cash_register_session_events, public.cash_register_events, public.payment_refunds
  from anon, authenticated, service_role;
grant select on table public.locations, public.cash_registers, public.cash_register_sessions,
  public.cash_register_session_events, public.cash_register_events, public.payment_refunds
  to service_role;
grant select on table public.bookings, public.clients, public.client_profiles, public.products,
  public.invoices, public.staff_profiles, public.approval_requests, public.payments,
  public.payment_line_items, public.payment_allocations, public.invoice_items,
  public.cash_transactions, public.receipts, public.receipt_line_items, public.payment_events,
  public.payment_settlements, public.inventory_movements
  to service_role;
grant select (id, payment_id, booking_id, client_id, amount_centavos, refund_method, reason, refunded_at)
  on public.payment_refunds to authenticated;
revoke all on public.customer_payment_refunds from anon, authenticated;
grant select on public.customer_payment_refunds to authenticated;

revoke all on function public.prevent_cash_journal_mutation() from public, anon, authenticated, service_role;
revoke all on function public.enforce_client_refund_financial_event() from public, anon, authenticated, service_role;
revoke all on function public.enforce_cash_register_session_transition() from public, anon, authenticated, service_role;
revoke all on function public.prevent_cash_transaction_mutation() from public, anon, authenticated, service_role;
revoke all on function public.payment_post_success_before_refunds(uuid, timestamptz, uuid, bigint, text, text, timestamptz, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.payment_post_success(uuid, timestamptz, uuid, bigint, text, text, timestamptz, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.open_cash_register(uuid, bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.get_cash_collection_registers() from public, anon, authenticated;
revoke all on function public.record_manual_cash_event(uuid, text, bigint, uuid, text, text) from public, anon, authenticated;
revoke all on function public.submit_cash_register_close(uuid, bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.review_cash_register_close(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.collect_cash_payment_with_register(uuid, uuid, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.refund_cash_payment(uuid, uuid, bigint, uuid, text, text, uuid) from public, anon, authenticated;

grant execute on function public.open_cash_register(uuid, bigint, uuid, text) to service_role;
grant execute on function public.get_cash_collection_registers() to service_role;
grant execute on function public.record_manual_cash_event(uuid, text, bigint, uuid, text, text) to service_role;
grant execute on function public.submit_cash_register_close(uuid, bigint, uuid, text) to service_role;
grant execute on function public.review_cash_register_close(uuid, uuid, boolean, text) to service_role;
grant execute on function public.collect_cash_payment_with_register(uuid, uuid, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) to service_role;
grant execute on function public.refund_cash_payment(uuid, uuid, bigint, uuid, text, text, uuid) to service_role;

comment on table public.locations is 'Operational locations and their minimum physical cash floor, in integer centavos.';
comment on table public.cash_registers is 'Named physical cash registers assigned to one location.';
comment on table public.cash_register_sessions is 'Constrained register open, close-submission, and independent-review state.';
comment on table public.cash_register_session_events is 'Append-only history of register opening and every close review transition.';
comment on table public.cash_register_events is 'Append-only retained-cash journal. Payment amounts exclude tender and change.';
comment on column public.cash_transactions.register_session_id is 'Nullable for historical cash; mandatory for cash posted through the current service RPC.';
comment on table public.payment_refunds is 'Immutable, approved, cash-only refunds. A null register_session_id means cash was paid externally.';
comment on column public.invoices.refunded_amount_centavos is 'Cumulative refunds retained separately from gross paid_amount_php so invoice payment history is not destroyed.';
comment on function public.collect_cash_payment_with_register(uuid, uuid, bigint, text, jsonb, boolean, text, boolean, uuid, bigint, timestamptz) is
  'Service-only cash collection requiring an open register. The register event records retained payment amount, never tender.';
comment on function public.refund_cash_payment(uuid, uuid, bigint, uuid, text, text, uuid) is
  'Service-only approved cash refund. Optional register session records physical cash out; null denotes external cash.';
