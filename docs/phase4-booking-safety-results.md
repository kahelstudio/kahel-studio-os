# Phase 4A — Booking safety results

**Local development only.** Branch `phase-4-native-scheduling`. Local Supabase (`127.0.0.1`), PayMongo **mocked** at the HTTP boundary (`sk_test_` key present but never used), all e-mail/SMS credentials removed from the test process, outbound network blocked except local Supabase.
Harness: `tests/booking-safety/` (`npm run test:booking-safety`; see `vitest.booking-safety.config.mts`). It calls the **real route handlers** (`/api/bookings/holds`, `/api/paymongo/checkout`, `/api/paymongo/webhook`) and the **same RPCs** the staff server actions call (`reschedule_booking`, `update_booking_status`), concurrently, and checks the **database** after every test.
Raw evidence: `docs/phase4-evidence/*.json` (`02-payment-BEFORE-FIX.json` = run before the BLOCKER fix).
Final run: **22/22 harness tests pass** (run twice, repeatable); unit suite **288/288**.

## Safety note: working tree and local environment
- The branch was created on top of **84 pre-existing uncommitted changes** (other work, including two untracked booking migrations already applied to the local DB). Nothing was reset, stashed or overwritten; Phase 4 commits stage only Phase 4 files (see final report).
- **F-ENV-1 (local environment):** this local database (newer Supabase CLI) grants API roles only `Dxtm` on tables created by migrations, so the app's **service-role key could not read `services` or `booking_resources`, nor insert `bookings`**: 109 of 138 public tables lacked DML. The website booking flow was therefore broken locally. To test the real code paths, `scripts/local/grant-service-role-legacy-defaults.sql` (local only, idempotent) mirrors the legacy hosted default for `service_role`; `scripts/local/restore-service-role-acl-pre-phase4.sql` restores the exact previous ACLs. Staging/production grants were **not** inspected (no access). **Recommendation:** add explicit `grant … to service_role` in migrations instead of relying on platform defaults.
- Local-only test helpers: `scripts/local/booking-safety-test-helpers.sql` (a SAFETY-TEST staff actor/client, plus a flag-controlled trigger used to simulate a project-service outage). Not a migration.

## Invariants
| ID | Invariant | Protection (evidence) |
|---|---|---|
| **B1** Exclusive resource | no two active reservations on one resource overlap | **DATABASE_GUARDED**: GiST exclusion `booking_reservations_exclusive_resource`. Same slot via the RPC with no route pre-check: **1 winner at 2/10/30/50 concurrent**, 0 errors, 1 DB row. Overlap checker = 0 pairs after every file |
| **B2** Hold protection | a valid hold protects its slot until paid / expired / released | **DATABASE_GUARDED** for holds (exclusion over `held`; expiry `SKIP LOCKED`). After checkout activation the reservation becomes `booked` and is **never released by time**; see H-1 |
| **B3** No payment without reservation | no checkout unless the slot is secured | **TRANSACTION_GUARDED**: the booking insert re-validates the owned, unexpired hold in the `sync_booking_reservation` trigger before the PayMongo call; `activate_booking_checkout` re-checks under `FOR UPDATE`. Case B: lost race / stolen hold / forged hold → 409, **0 provider checkouts**, 0 bookings. F3: hold expiring mid-checkout → 409 and **no URL handed out** (orphan provider session, L-3) |
| **B4** Idempotent payment | duplicates create no extra payment/ledger/confirmation/project/receipt | **DATABASE_GUARDED**: payment row `FOR UPDATE`, `payment_events.provider_event_id`, `payments.status = paid` short-circuit, one project per booking, receipt e-mail `UNIQUE (environment, logical_idempotency_key, resend_sequence)`. Case E: ×1, ×2 sequential, **×10 concurrent → 1 paid payment, 1 allocation, 1 receipt, 1 project** (10 redundant e-mail enqueue calls deduplicated by the unique key, L-2) |
| **B5** Expired holds | an expired hold never silently becomes a conflicting confirmed booking | **DATABASE_GUARDED**: reactivation of an expired reservation goes through the exclusion constraint (F2: conflict aborts confirmation; cancelled booking reactivation after slot reuse → 23P01). Safe for the schedule, **unsafe for the money** (H-3) |
| **B6** Rescheduling | failed reschedule keeps the original booking | **DATABASE_GUARDED** + transactional: A→occupied 12:00 and partial 11:30 → 23P01, A unchanged (booking and reservation). Concurrent reschedules into one free slot: **exactly 1 winner at 2/10/30**, every loser intact |
| **B7** Atomic multi-resource | all or none | **N/A today**: one resource per booking. The linked studio+event pair is one transaction (two resources). Built and tested in Phase 4B |
| **B8** Valid parallel work | different slots/resources don't serialize | per-resource advisory lock + per-range constraint: 10+10 concurrent requests on two different slots → **2 winners**; reschedule p50 3–21 ms |

Overlap semantics (RPC level; the existing base booking is 10:00):

| Service | Accepted | Conflict |
|---|---|---|
| 30 min | 09:30, 10:30 | 09:45, 10:00, 10:15 |
| 60 min | 09:00, 11:00 | 09:30, 10:00, 10:30 |
| 120 min | 08:00, 12:00 | 09:30, 11:30 |
| 60 min + 15/15 min buffers | 08:30, 11:30 | 08:45, 11:15 |

Intervals are half-open `[start − prep, end + cleanup)`, as designed. The public route additionally only offers hourly starts (30 min for Mini Session): an application-level rule in `get_booking_availability`, not a DB constraint.

## Latency (local, concurrent)
| Operation | n=2 | n=10 | n=30 | n=50 |
|---|---:|---:|---:|---:|
| `acquire_booking_hold` p95 (ms) | 4 | 9 | 21 | 44 |
| `POST /api/bookings/holds` p95 (ms) | 52 | 21 | 70 | 173 |
| `reschedule_booking` p95 (ms) | 3 | 7 | 24 | — |
| paid webhook ×10 concurrent p95 (ms) | — | 39 | — | — |

## Findings
| ID | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| **B-1** | **BLOCKER** | **The PayMongo webhook never confirmed ledger payments and never released failed checkouts.** `processLedgerEvent` detached `admin.rpc` (`const rpc = admin.rpc as …`); supabase-js `rpc` reads `this.rest`, so every paid / failed / expired event with `metadata.payment_id` threw `Cannot read properties of undefined (reading 'rest')` → HTTP 503 → retries → never processed. Every website checkout since commit `9c9f8ed` (2026-08-13) sets `metadata.payment_id`. Effect: **paid bookings stay `inquiry/pending` (no payment, project or receipt) and failed checkouts keep their slot `booked`** | `02-payment-BEFORE-FIX.json`: A/C/D/E/F all 503; regression unit test `tests/unit/paymongo-webhook-rpc-binding.test.ts` failed before the fix | **FIXED locally** (`admin.rpc.bind(admin)`, 1 line) + regression test. **Not deployed. If this code is deployed, production/staging are affected now; check the PayMongo dashboard against `provider_webhook_inbox` (status `pending/failed`)** |
| **H-1** | **HIGH** | **Abandoned checkouts block the slot indefinitely.** After `activate_booking_checkout` the reservation is `booked` and the expiry job only expires `held`. Release relies on `checkout_session.payment.failed` / `checkout_session.expired` webhooks, which **PayMongo's published event list doesn't include** (only `checkout_session.payment.paid` is documented for Checkout). If PayMongo returns no `expires_at`, the route sets **now + 365 days** | Case G: checkout expired → reservation still `booked`, new customer 409; without provider expiry → blocked **365 days**. Only staff cancellation frees the slot | **Open**: design decision (e.g. expire the PayMongo session via API at a Kahel deadline, then release in one step). Deliberate in code ("never release a booked reservation on an application timer") to avoid H-3 |
| **H-2** | **HIGH** | **Paid + cancelled with no recovery state.** A staff cancellation racing the paid webhook (either order) ends `cancelled` + payment `paid`, reservation released, slot resellable, and **no refund-required / rebooking state** is created. `payment_post_success` accepts payment on a cancelled booking; `update_booking_status` doesn't check payments | Case H: **10/10 rounds** → `cancelled/paid`, reservation `released`, payment `paid` | **Open**: needs an explicit state (e.g. `refund_required`) and a staff queue |
| **H-3** | **HIGH** (→ BLOCKER if PayMongo emits checkout failure/expiry events and then still accepts payment) | **Late payment after the slot was re-sold is not recorded.** After a failed/expired checkout releases the slot and another customer books it, a later paid event aborts on the exclusion constraint → webhook 503 → inbox `failed` → **captured money recorded nowhere, no recovery state** | Case F2: paid webhook 503, payment `expired`, booking `inquiry/failed`, inbox `failed` | **Open**: record the payment and flag the booking `needs_rebooking/refund` instead of aborting |
| M-1 | MEDIUM | Project creation runs inside the payment-confirmation transaction (trigger). A failing project step rolls back the payment confirmation; PayMongo's retry then succeeds. Consistent, but a persistent project failure would keep a paid booking unconfirmed | Case D2: 503 → inbox `failed` → identical retry → confirmed, 1 payment, 1 project | Accept or decouple later |
| M-2 | MEDIUM | F-ENV-1 above (missing explicit grants; local parity) | — | Workaround local only; migration recommended |
| L-1 | LOW | Concurrent double-submit of one hold returned **503** instead of 409 (unmapped 23505 message) | Case B2 before: 8–9 × 503 | **FIXED** (`lib/server/booking-slots.ts`) + unit test; after: 1 ok, 9 × 409, 0 errors |
| L-2 | LOW | Concurrent duplicate webhooks each schedule a receipt e-mail; deduplicated by the transactional-message unique key | Case E: 10 calls, 1 receipt | Accept |
| L-3 | LOW | If the hold expires between the PayMongo call and activation, an unexposed provider checkout session is left orphaned | F3: 2/20 rounds 409 + 1 provider session; never a URL without `booked` | Accept |
| L-4 | LOW | Concurrent staff status changes are last-writer-wins (cancel then confirm re-activates if the slot is free; refused with 23P01 if reused) | cancel/move/confirm race 20/20 consistent | Accept |
| X-1 | out of scope (not booking) | Same detached-`rpc` defect in `app/api/email/messages/[messageId]/resend/route.ts` (staff manual e-mail resend) | HEAD and working tree | **Not changed** (file carries other uncommitted work); reported |

## Classification of the existing engine
**SAFE_WITH_FIXES.** The scheduling core (holds, overlap, rescheduling, release, idempotent payment ledger) is **database-guarded** and held under every concurrency test. The blocker was in the webhook glue code, and the fix is one line. The HIGH items are **recovery-state gaps around payments**, not slot-integrity failures.

## Phase 4A gate
- BLOCKER B-1: small, clearly understood, fixed locally with a regression test → **Phase 4B may proceed** (resource scheduling builds on the DB-guarded core, which passed).
- H-1, H-2, H-3 are reported for owner decision; they don't block resource scheduling, but **H-1 interacts with availability** (abandoned checkouts consume capacity), and **B-1 should be deployed independently and urgently** after owner review.

## Post-implementation results (Phase 4B)
See the "Phase 4B results" section appended below.
