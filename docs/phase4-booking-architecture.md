# Phase 4 — Current booking architecture (as found)

Traced on branch `phase-4-native-scheduling` (created from `claude/supabase-local-dev-ybaof2` @ `a2f84a0` **with 84 pre-existing uncommitted changes carried in the working tree**; see the Phase 4 safety note in `phase4-booking-safety-results.md`).
Sources:
- the **live local database** (function bodies dumped with `pg_get_functiondef`, because later migrations redefine earlier functions);
- the route handlers and server actions listed below.

No architecture was changed while writing this.

## 1. Data model

| Table | Role | Key integrity |
|---|---|---|
| `booking_resources` | bookable resource (`code`, `name`, `type ∈ {space, team}`, `timezone`, `capacity` **check = 1**, `hold_minutes` 1–10, `active`) | seeded: **Main Studio** (`space`), **Event Team** (`team`) |
| `booking_resource_weekly_hours` | per-resource opening hours per ISO weekday | unique (resource, day, opens, closes) |
| `booking_resource_blackouts` | closures per resource (`blocked_range` generated `[)`) | GiST index; trigger `protect_booking_blackout` |
| `services` | `duration_minutes`, `prep_buffer_minutes`, `cleanup_buffer_minutes`, `minimum_notice_minutes`, `maximum_advance_days` (365), **`default_resource_id` NOT NULL** | each service is tied to exactly one resource |
| `bookings` | the customer/financial record: `status ∈ {inquiry, quoted, confirmed, progress, completed, cancelled}`, `payment_status`, `attendance ∈ {expected, attended, no_show}`, `starts_at/ends_at/timezone`, **`resource_id` (one)**, duration/buffer snapshots, `reservation_hold_id`, `idempotency_key`, PayMongo checkout columns, cancellation metadata | `bookings_schedule_interval_check`, `bookings_cancellation_metadata_check`, deferred FK to the hold |
| `booking_reservations` | **canonical interval ownership**: `type ∈ {hold, booking, blackout}`, `status ∈ {held, booked, released, expired}`, `blocked_range = [start − prep, end + cleanup)`, `expires_at`, `idempotency_key` (unique), `owner_token_hash`, `booking_id` (**unique**: one reservation per booking) | **`booking_reservations_exclusive_resource`: `EXCLUDE USING gist (resource_id WITH =, blocked_range WITH &&) WHERE status IN ('held','booked')`**; hold check (held ⇒ expires_at, idempotency key, fingerprint, owner hash); release check |
| `booking_reservation_events`, `booking_schedule_history` | append-only audit (trigger-enforced) | |
| `provider_webhook_inbox` | PayMongo webhook inbox, `unique (provider, event_id)`, fingerprint check, status/attempt/backoff | |
| `payments`, `payment_events`, `payment_allocations`, `payment_settlements`, `receipts`, `invoices` | payment ledger (append-only ledger trigger `prevent_payment_ledger_mutation`) | `payment_events` keyed by provider event id |
| `projects` | downstream project per confirmed booking | created by trigger |
| `booking_agreement_requirements`, `agreement_acceptances` | versioned terms per booking | |

**Resource model today:** one resource per booking and one resource per service (`services.default_resource_id`). `sync_booking_reservation` rejects any other resource (`resource is not configured for this service`). Multi-resource exists only as the **linked booking pair** (a studio booking plus an event booking, two `bookings` rows created in one transaction).

## 2. Main path: availability → hold → booking → checkout → payment → webhook → confirmation → project

| Step | Entry point | DB function / trigger | Transaction boundary & guarantees |
|---|---|---|---|
| Availability | `GET /api/paymongo/availability` → `lib/server/booking-availability.ts#getBookingAvailability` | `expire_booking_holds(500)` then `get_booking_availability(service, date, resource?, duration?)` | read-only snapshot. Candidates = weekly hours stepped by **60 min (30 for Mini Session)**, minus active blackouts, minus `booked` and unexpired `held` reservations on the **service's single resource**, plus notice/advance rules |
| Hold | `POST /api/bookings/holds` (public; trusted origin; rate limit 12/h per owner key + IP) | route pre-check: the requested start must be an *offered available* slot (application guard). Then `acquire_booking_hold(...)` | **one transaction**: expire due holds → idempotency replay (`idempotency_key` + fingerprint + owner hash, `FOR UPDATE`) → `pg_advisory_xact_lock(resource)` → hours/notice/advance/blackout checks → `INSERT booking_reservations (hold, held, expires_at = now + ≤10 min)`. **Exclusion constraint** arbitrates overlap; `exclusion_violation` → 23P01 "no longer available" (409) |
| Booking | `POST /api/paymongo/checkout` (website) or `POST /api/paymongo/checkout/package` (linked pair) | `INSERT bookings (reservation_hold_id, reservation_owner_token_hash, …)` → **BEFORE trigger `sync_booking_reservation`** | trigger (same transaction as the insert): resource must equal the service default; per-resource advisory lock; schedule policy; blackout check; the attached hold must be `held`, unexpired, owned (token hash) and match service/resource/start/end exactly → links the hold to the booking (still `held`, keeps `expires_at`) |
| Payment record | same route | `prepare_payment_collection(booking, 'paymongo', …, idempotency key = "<Idempotency-Key>:payment:<holdId>")` | creates a `pending` payment (idempotent) |
| Checkout claim | same route | `claim_booking_checkout(booking)` | single-flight: sets `checkout_creation_started_at` if no checkout URL and no claim in the last 5 min |
| PayMongo checkout | same route → `fetch("https://api.paymongo.com/v2/checkout_sessions")` (10 s timeout, `Idempotency-Key` header) | — | **external call outside any DB transaction**. On failure: claim cleared, 502 "booking saved, checkout unavailable" |
| Checkout activation | same route | `activate_booking_checkout(booking, session, url, expires_at)` then `mark_paymongo_checkout(payment, …)` | locks booking + reservation; requires booking `inquiry/quoted`, `payment_status = pending`, reservation **still `held` and unexpired** → reservation becomes **`type = booking, status = booked, expires_at = checkout expiry`**. If PayMongo returns no expiry, the route uses **now + 365 days**. `booked` rows are never swept by the expiry job |
| Webhook | `POST /api/paymongo/webhook` | HMAC check → `enqueue_provider_webhook_event` (unique provider+event_id, fingerprint) → if inbox row already `processed` → 200 | dispatch by event type |
| Payment paid | webhook (`checkout_session.payment.paid` with `metadata.payment_id`) | `confirm_paymongo_payment(...)` → `payment_post_success(...)` → `payment_post_success_before_refunds(...)` | one transaction: payment row `FOR UPDATE`; amount/IDs must match; duplicate `payment_events.provider_event_id` → return unchanged; already-`paid` → log `ignored` event; else ledger: invoice/items, **booking `status → confirmed`** (PayMongo processor, from inquiry/quoted), `payment_status`, allocation, receipt, payment events, staff audit, settlement row |
| Confirmation side effects | triggers on `bookings` | `sync_booking_reservation` (status confirmed → reservation `booked`), **`create_project_for_confirmed_booking`** (project if none for the booking), `loyalty_reconcile_booking_after_change`, `initialize_booking_agreement_requirement` (on insert) | same transaction as the confirmation |
| Receipt e-mail | webhook route `after(() => sendConfirmedPaymentReceipt(...))` | reads receipt; sends via transactional e-mail | after the response, outside the transaction; triggered **every time `confirm_paymongo_payment` returns a payment**, including duplicates |
| Inbox completion | webhook route | `finish_provider_webhook_event(succeeded)` | success → `processed`; failure → `failed` + backoff (2^n min, ≤ 1 h); non-2xx < 500 is acknowledged (200) |
| Payment failed/expired | webhook (`checkout_session.payment.failed` / `checkout_session.expired`) | `fail_or_expire_provider_payment` then `release_failed_booking_checkout(booking, session, failed/expired)` | payment → failed/expired (if pending/failed/expired). Booking `payment_status = failed` unless paid/confirmed; reservation `held/booked` → `released`/`expired` |
| Legacy bookings | webhook with `metadata.booking_id` only | direct `bookings` update / `release_failed_booking_checkout` | pre-ledger path |

## 3. Other lifecycles

| Lifecycle | Path | Mechanism |
|---|---|---|
| **Hold expiry** | `expire_booking_holds` (called by availability, acquire, sync trigger) | `held` + `expires_at <= now` → `expired`, `FOR UPDATE SKIP LOCKED`. **Only `held` rows expire**; checkout-activated (`booked`) reservations are released only by a PayMongo failure/expiry webhook or staff reconciliation (`reset_booking_checkout_for_retry`, `expire_legacy_paymongo_booking`, `reconcile_failed_provider_payment`) |
| **Hold release (customer)** | `DELETE /api/bookings/holds` → `release_booking_hold` | owner-token check; unlinked holds only |
| **Checkout retry** | checkout route with an expired checkout → `reset_booking_checkout_for_retry` | |
| **Cancellation** | staff `cancelBooking` server action → `update_booking_status(ref, 'cancelled', actor, reason)` | booking row `FOR UPDATE` → status → trigger releases the reservation; staff audit. **No payment/refund state is checked or created** |
| **Status change** | staff `updateBookingStatus` → `update_booking_status` (or a direct table update when the principal has no user ID) | trigger re-validates the reservation |
| **Rescheduling** | staff `rescheduleBooking` (calendar drag-and-drop) → `reschedule_booking(ref, date, time, resource, actor, reason)` (or a direct update without a user ID) | booking `FOR UPDATE` → update → `sync_booking_reservation` moves the **same** reservation row; the exclusion constraint rejects overlaps (23P01) and the whole statement rolls back, so the original schedule stays; elapsed targets rejected (uncommitted migration 20260927) |
| **No-show** | `bookings.attendance = 'no_show'` (staff) | attendance only; reservation unaffected (past time) |
| **Staff-created booking** | `POST /api/operations/[kind]` (booking kind) | `INSERT bookings (status inquiry, payment unpaid)` **without a hold** → trigger inserts a `booked` reservation directly (constraint-guarded) |
| **Linked bookings** | `POST /api/paymongo/checkout/package` → `create_linked_booking_pair(studio, event)` | one function = one transaction; advisory lock on the pair of idempotency keys; two `bookings` inserts (studio, then event), each reserving its own resource through the trigger → **atomic for exactly two resources** |
| **Loyalty reward booking** | `loyalty_create_reward_booking_with_hold` | uses an owned hold |
| **Studio/Event resources** | services point to `main-studio` (studio packages) or `event-team` (events) | Event Team is **one** exclusive resource: only one event can be booked at a time, whatever the number of photographers |

## 4. Locks, constraints, idempotency (summary)
- **Overlap:** `booking_reservations_exclusive_resource` (GiST exclusion, `[)` with buffers) over `held` + `booked`: the database guarantee.
- **Serialization:** `pg_advisory_xact_lock(hashtextextended(resource_id))` in `acquire_booking_hold` and `sync_booking_reservation`; `FOR UPDATE` on booking/reservation/payment rows; `SKIP LOCKED` for expiry.
- **Idempotency:**
  - hold `idempotency_key` + fingerprint + owner hash;
  - booking `idempotency_key` (`Idempotency-Key` header) + request fingerprint;
  - payment collection idempotency key;
  - checkout claim;
  - PayMongo `Idempotency-Key`;
  - webhook inbox `(provider, event_id)` + fingerprint;
  - `payment_events.provider_event_id`;
  - one project per booking (`exists` check in the trigger).
- **Error mapping:** `isBookingSlotConflict` (`lib/server/booking-slots.ts`) maps 23P01/23505 to "slot conflict" (409).

## 5. API routes and server actions touching bookings
`app/api/bookings/holds/route.ts` (POST/DELETE), `app/api/paymongo/availability/route.ts`, `app/api/paymongo/checkout/route.ts`, `app/api/paymongo/checkout/package/route.ts`, `app/api/paymongo/webhook/route.ts`, `app/api/operations/[kind]/route.ts`, `app/booking/list/[ref]/actions.ts` (status, reschedule, cancel, deposit verification ID), the calendar (`app/calendar/*`, `get_booking_calendar_reservations`).

## 6. Observations to test in Phase 4A (not yet findings)
1. Concurrent identical webhooks: the inbox only short-circuits **already processed** events, so concurrent duplicates all reach `confirm_paymongo_payment` (DB-idempotent), and **each schedules a receipt e-mail**.
2. Checkout-expired then paid (late payment): `payment_post_success` accepts `expired → paid`; the booking then re-activates its expired reservation through the trigger. If another customer took the slot meanwhile, the exclusion violation aborts the whole confirmation → the webhook returns 503 → retried with backoff → **money received but no confirmed booking and no recovery state**?
3. Checkout without PayMongo expiry → reservation `booked` for 365 days until a failure/expiry webhook arrives.
4. Cancellation of a paid booking creates no refund/recovery state.
5. The hold pre-check in the route is an application guard; the RPC/constraint must hold without it.
