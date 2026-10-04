# Phase 4B — Native resource scheduling

Status: local development only (branch `phase-4-native-scheduling`). Migration `supabase/migrations/20261004000000_native_resource_scheduling.sql`; manual rollback `supabase/rollbacks/20261004000000_native_resource_scheduling.down.sql`.
Principle: **extend Kahel's booking engine, don't replace it.** Every resource of a booking is protected by the same GiST exclusion constraint that already guarded Main Studio and Event Team.

## 1. Resource model
| Element | Design | Why |
|---|---|---|
| `booking_resource_types` | lookup table (`code`, `name`, `is_person`). Seeded: `space` (= STUDIO; legacy code kept), `team` (legacy), `photographer`, `videographer`, `drone_operator`, `camera`, `equipment`, `rental_item` | new types are rows, not schema/architecture changes; replaces the hard-coded `check (type in ('space','team'))` |
| `booking_resources` (extended) | + `staff_user_id → staff_profiles(user_id)` (nullable; unique per type), + `public_selectable`, + `sort_order` | a staff member *may* be a resource (Luiz → "Photographer — Luiz") without copying staff data; freelancers, studios and cameras are resources without a staff link; `sort_order` makes automatic assignment deterministic |
| unchanged | `capacity = 1` (exclusive), `timezone`, `hold_minutes ≤ 10`, `active` | every Phase 4 requirement is exclusive; no non-exclusive capacity was demonstrated, so none was added |
| not added | location, metadata JSON | no scheduling requirement; integrity data stays relational |

## 2. Availability
Per resource, availability = **weekly working hours − leave − manual blocks/closures − active holds − bookings**:
- weekly hours: `booking_resource_weekly_hours` (existing table, per resource per ISO weekday; a day without rows is a day off, e.g. Luiz Wednesday OFF);
- leave / time off / manual blocks / closures / maintenance: `booking_resource_blackouts` (existing) + `kind`, and `external_source` / `external_ref` (unique) for idempotent projections;
- exceptions: "Oct 12 unavailable" = a whole-day block; "Oct 16 13:00–18:00 only" = a block over the other working hours (the UI explains this); extra hours beyond the weekly plan are **not** supported (no demonstrated need);
- holds and bookings: `booking_reservations` rows `held` (unexpired) or `booked` overlapping `[start − prep, end + cleanup)`.

`booking_resource_unavailable_reason()` returns `outside_hours | leave | blocked | reserved | inactive | null`; the same reasons are shown to staff.

**Service availability** (`get_service_availability`; public wrapper `get_public_service_availability`) answers *"is the SERVICE bookable at this time?"*. A slot is available only if **every** requirement can be satisfied with distinct resources at that time. For customer-selectable requirements it also returns the free **public** resources per slot (e.g. `10:00 → Luiz, Photographer B`). Internal equipment is never exposed publicly. Services without requirements delegate to the legacy `get_booking_availability` (identical output plus `requirements: []`).

## 3. Service requirements
`service_resource_requirements(service_id, position, selection_mode, resource_id | resource_type, customer_selectable)`:

| Mode | Meaning | Example |
|---|---|---|
| `fixed` | a specific resource | Main Studio |
| `any_available` | one resource of a type, assigned deterministically (`sort_order`, `code`) | Any photographer |
| `any_available` + `customer_selectable` | USER SELECTED allowed (customer may name a public resource; staff may choose any) | Photographer: ○ Any ○ Luiz ○ B |

- **Position 1 is the anchor.** It becomes `bookings.resource_id` and owns the canonical reservation row.
- Services **without** rows keep the legacy single `default_resource_id` behaviour; nothing changes for them (verified: 22 Phase 4A tests and 122 pgTAP assertions unchanged).

Examples (tested with RESOURCE-TEST fixtures):

| Service | Requirements |
|---|---|
| Solo Portrait | Main Studio (fixed) + Photographer (any, customer-selectable) |
| Corporate Interview | Photographer (any) + Videographer (any) + FX3 (fixed) + Audio Kit (fixed) |
| Camera Rental | FX3 (fixed); variable duration via `duration_minutes` (service minimum to +480 min, as before) |
| Wedding / events | Photographer (any); event-defined duration as today |

## 4. Hold algorithm (all-or-nothing)
`acquire_booking_hold_with_resources(…, selections)`. `acquire_booking_hold` keeps its exact signature and delegates with no selections, so existing callers are unchanged.
1. Validate credentials and the idempotent replay (unchanged rules; replays return the existing assignments).
2. Services without requirements: the **legacy code path, verbatim**.
3. Multi-resource:
   1. Validate customer selections (only `customer_selectable` requirements and `public_selectable` resources).
   2. Check notice and advance.
   3. **Lock the candidate set**: `pg_advisory_xact_lock` on every fixed resource plus every active resource of each required type, in **ascending resource-id order**. These are the same lock keys the legacy code uses per resource, so legacy and multi-resource paths serialise correctly.
   4. Resolve every requirement deterministically.
   5. Insert the anchor hold, then one **component** reservation per additional resource (`parent_reservation_id`, `requirement_position`, `selection_locked` for explicit choices).
   6. Any unresolved requirement or exclusion violation raises 23P01 and the whole RPC rolls back. **Never a partial reservation.**

## 5. Multi-resource locking and lifecycle
- **Components mirror their anchor**: trigger `mirror_booking_reservation_components` copies status, type, expiry, release and schedule changes from the anchor to its components in the same transaction. Every existing function keeps working unchanged:
  - checkout activation (`held → booked`);
  - expiry (now sweeps anchors only);
  - failed-payment release;
  - cancellation;
  - reschedule;
  - customer hold release.
- Components are additional rows of `booking_reservations`, so the **existing exclusion constraint** guards every resource, and `booking_reservations_component_check` keeps components unlinked (`booking_id` only on the anchor).
- **Rescheduling** moves every resource together. If an automatically assigned component resource is busy or off at the new time, the trigger swaps in another free resource of the same type. A customer- or staff-chosen resource (`selection_locked`) is never swapped: the move fails and the original booking stays intact (B6). The anchor is never swapped automatically; staff reassign it explicitly.
- **Staff bookings without a hold** (operations route, linked pairs, loyalty): `sync_booking_reservation` resolves the anchor and `reserve_booking_components` reserves the rest automatically.
- **Staff overrides**: `reassign_booking_resource(booking, position, resource, actor, reason)` re-checks hours, leave, blocks and conflicts. An override can never create a double booking (DB-enforced). It is audited in `staff_audit_log`.

## 6. Payment boundary (unchanged rule, re-verified)
**ALL resources secured → payment may begin.** The checkout route creates the PayMongo session only after the booking insert has linked a live, owned hold (`sync_booking_reservation`), and the hold exists only if every resource was reserved. Re-tested through the real routes (05-resource-payment):
- photographer busy → hold 409, **0 checkouts**, studio not left reserved;
- paid → studio and photographer `booked`;
- failed → both released;
- 10 duplicate webhooks → 1 payment, 1 project;
- cancellation → both released.

## 7. Photographer availability
Photographers are `booking_resources` of type `photographer` with their own weekly hours, leave and blocks. Their availability feeds every service that requires a photographer, and the shared Main Studio still serialises studio sessions while photographers work in parallel elsewhere (tested: Luiz and B at 10:00 both succeed without a studio; two studio sessions at the same time do not).

## 8. Leave integration boundary (OrangeHRM; not implemented)
Kahel must schedule without OrangeHRM at runtime. Approved leave is **projected** into Kahel as blocks:

| Event (Integration Hub → Kahel) | Kahel action |
|---|---|
| `STAFF_LEAVE_APPROVED { leave_id, employee_ref, starts_at, ends_at, type }` | map `employee_ref → staff_user_id → resource(s)` and call `add_booking_resource_block(resource, starts, ends, 'leave', reason, actor, 'orangehrm', leave_id)`. Idempotent on `(external_source, external_ref)`; a redelivery returns the existing block (tested) |
| `STAFF_LEAVE_CANCELLED { leave_id }` | `remove_booking_resource_block` for the block with `external_ref = leave_id` |
| conflict (leave over an existing booking) | `protect_booking_blackout` refuses it (23P01). The hub must surface it for staff to reassign the booking first, then retry |

## 9. UI
| Area | Change |
|---|---|
| Customer booking (`/book`) | for services with a customer-selectable requirement, below the chosen time: "Photographer: ○ Any available photographer ○ Luiz ○ …" (public resources free at that time only); the choice is sent as `resourceSelections` with the hold. Other services are unchanged |
| Staff booking detail | "Resources" panel: assigned resource per requirement; **Change** lists candidates with their state (Available / Booked / On leave / Blocked / Not working); reassignment needs a reason |
| Calendar | new **By resource** view (`/calendar?view=resources`) with All / Studio / Photographer / Videographer / Equipment filters, per-resource day timeline (bookings, checkout holds, blocks/leave), click a resource for its own schedule, click a booking to open it |
| Settings → Booking resources | resources (type, linked staff, public, active, order), weekly hours, leave/blocks (whole or partial day), service requirements editor |

## 10. Performance (local, PostgREST round trip included)
| Candidate pool | Availability (median) | Hold (worst case) | Booking confirm (with components) | Reschedule |
|---|---:|---:|---:|---:|
| 1 resource (legacy) | 12 ms | 6 ms | — | — |
| 5 photographers | 5 ms | 3 ms | 10 ms | 46 ms |
| 20 photographers | 5 ms | 3 ms | 9 ms | 55 ms |
| 100 photographers | 15 ms | 4 ms | 8 ms | 53 ms |

No bottleneck. Reschedule is the slowest path because it takes the whole candidate lock set; acceptable at these sizes.

## 11. Known limitations / follow-ups
- Requirement quantity is 1 per row (two photographers = two rows).
- No per-date "extra working hours" (only subtractive exceptions).
- The anchor resource is never auto-swapped on reschedule.
- Buffers (prep/cleanup) apply to all resources of a booking.
- The legacy calendar month/week grid still shows bookings, not resources (the resource view is separate).
- Existing services have **no** requirements until the owner configures them (by design: backward compatible).
