alter table public.bookings
  add column if not exists paymongo_payment_id text,
  add column if not exists paymongo_payment_method text,
  add column if not exists paymongo_payment_description text,
  add column if not exists paymongo_paid_at timestamptz,
  add column if not exists paymongo_available_at timestamptz,
  add column if not exists paymongo_credited_at timestamptz;

-- Earlier webhook code stored the payment ID in the payment-intent column.
update public.bookings
set paymongo_payment_id = paymongo_payment_intent_id,
    paymongo_payment_intent_id = null
where paymongo_payment_id is null
  and paymongo_payment_intent_id like 'pay\_%' escape '\';
