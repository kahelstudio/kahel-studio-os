// Phase 4 booking-safety harness (local only). Exercises the REAL route handlers and RPCs against the local
// Supabase database, in parallel, and always inspects the database afterwards instead of trusting responses.
import { createHash, createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

export const PREFIX = "SAFETY-TEST-";
export const TZ_OFFSET = "+08:00"; // Asia/Manila, no DST

// ── network guard + PayMongo mock ───────────────────────────────────────────────────────────────────────────
export const payMongo = { checkoutsCreated: 0, fail: false, expiresInSeconds: 3600 as number | null, calls: [] as string[] };
let guardInstalled = false;
export function installNetworkGuard(supabaseUrl: string) {
  if (guardInstalled) return;
  guardInstalled = true;
  const realFetch = globalThis.fetch;
  const local = new URL(supabaseUrl);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === local.hostname && url.port === local.port) return realFetch(input, init);
    if (url.hostname === "api.paymongo.com" && url.pathname === "/v2/checkout_sessions") {
      payMongo.calls.push(url.pathname);
      if (payMongo.fail) return new Response(JSON.stringify({ errors: [{ detail: "mock outage" }] }), { status: 503 });
      payMongo.checkoutsCreated += 1;
      const id = `cs_${PREFIX.toLowerCase().replace(/-/g, "_")}${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      return Response.json({ data: { id, attributes: { checkout_url: `https://checkout.paymongo.test/${id}`, ...(payMongo.expiresInSeconds === null ? {} : { expires_at: Math.floor(Date.now() / 1000) + payMongo.expiresInSeconds }) } } });
    }
    throw new Error(`booking-safety network guard blocked ${url.origin}`);
  }) as typeof fetch;
}

// ── database access (service role, local) ───────────────────────────────────────────────────────────────────
let client: ReturnType<typeof createClient> | null = null;
export function db() {
  client ??= createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false } });
  return client;
}
type RpcResult<T> = { data: T | null; error: { code?: string; message: string } | null };
/** Untyped RPC call that keeps the client bound (calling a detached `rpc` is exactly bug B-1). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rpc<T = any>(name: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  const client = db() as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<RpcResult<T>> };
  return client.rpc(name, args);
}

/** Direct SQL as the local postgres superuser (docker exec psql). Used ONLY for test setup and for inspecting tables
 *  the application deliberately cannot touch (booking_* reservation tables, webhook inbox): keeps their RPC-only grants. */
const DB_CONTAINER = process.env.BOOKING_SAFETY_DB_CONTAINER ?? "supabase_db_kahelstudio-os";
export function pg<T = Record<string, unknown>>(query: string): T[] {
  const modifying = /^\s*(insert|update|delete)\b/i.test(query);
  const wrapped = modifying ? `with t as (${query}) select coalesce(json_agg(t), '[]'::json) from t` : `select coalesce(json_agg(t), '[]'::json) from (${query}) t`;
  const out = execFileSync("docker", ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tAc", wrapped], { encoding: "utf8" });
  return JSON.parse(out.trim() || "[]") as T[];
}
export function pgExec(statement: string) {
  execFileSync("docker", ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qtAc", statement], { encoding: "utf8" });
}
export const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;

// ── time helpers ────────────────────────────────────────────────────────────────────────────────────────────
/** A Manila calendar date `daysAhead` from today (skips Sundays for Main Studio hours). */
export function manilaDate(daysAhead: number, avoidSunday = true) {
  const d = new Date(Date.now() + 8 * 3600_000 + daysAhead * 86_400_000);
  if (avoidSunday && d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
export const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00${TZ_OFFSET}`).toISOString();
/** Run-unique days: one random base per test process (fixed for the whole run) + a strictly increasing counter,
 *  so tests never collide with each other or (with high probability) with an earlier run's reservations. */
const RUN_BASE = 30 + Math.floor(Math.random() * 120);
let dayCounter = 0;
export function freshDay() {
  for (;;) {
    dayCounter += 1;
    const date = manilaDate(RUN_BASE + dayCounter, false);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 0) return date; // Main Studio is closed on Sundays
  }
}

// ── fixtures: dedicated SAFETY-TEST resources/services (never the real studio) ───────────────────────────────
export type Fixtures = { resourceA: string; resourceB: string; services: Record<"m30" | "m60" | "m120" | "buffered", string> };
let fixtures: Fixtures | null = null;
export async function ensureFixtures(): Promise<Fixtures> {
  if (fixtures) return fixtures;
  const resources: string[] = [];
  for (const code of ["safety-test-resource-a", "safety-test-resource-b"]) {
    let id = pg<{ id: string }>(`select id from public.booking_resources where code = ${lit(code)}`)[0]?.id;
    if (!id) {
      id = pg<{ id: string }>(`insert into public.booking_resources (code, name, type) values (${lit(code)}, ${lit(PREFIX + code)}, 'space') returning id`)[0].id;
      pgExec(`insert into public.booking_resource_weekly_hours (resource_id, iso_day_of_week, opens_at, closes_at) select ${lit(id)}, d, '06:00', '22:00' from generate_series(1, 7) d`);
    }
    resources.push(id);
  }
  const services: Record<string, string> = {};
  for (const [key, minutes, prep, cleanup] of [["m30", 30, 0, 0], ["m60", 60, 0, 0], ["m120", 120, 0, 0], ["buffered", 60, 15, 15]] as const) {
    const code = `safety-test-${key}`;
    const existing = await db().from("services").select("id").eq("code", code).maybeSingle<{ id: string }>();
    let id = existing.data?.id;
    if (!id) {
      const inserted = await db().from("services").insert({ code, name: `${PREFIX}${key}`, duration_minutes: minutes, prep_buffer_minutes: prep, cleanup_buffer_minutes: cleanup, default_resource_id: resources[0] } as never).select("id").single<{ id: string }>();
      if (inserted.error) throw inserted.error;
      id = inserted.data.id;
    }
    services[key] = id;
  }
  // Start every run from a clean slate on the SAFETY-TEST resources only (never touches real resources):
  // cancel earlier SAFETY-TEST bookings (the trigger releases their reservations), then release loose holds.
  const cancelled = await db().from("bookings").update({ status: "cancelled", cancellation_reason: `${PREFIX}harness cleanup` } as never)
    .in("resource_id", resources).neq("status", "cancelled").like("reference", `${PREFIX}%`);
  if (cancelled.error) throw cancelled.error;
  pgExec(`update public.booking_reservations set status = 'released', released_at = now(), updated_at = now()
    where resource_id in (${resources.map(lit).join(",")}) and status in ('held', 'booked') and booking_id is null and (to_jsonb(booking_reservations)->>'parent_reservation_id') is null`);
  fixtures = { resourceA: resources[0], resourceB: resources[1], services: services as Fixtures["services"] };
  return fixtures;
}

// ── concurrency runner ──────────────────────────────────────────────────────────────────────────────────────
export type Outcome = "ok" | "conflict" | "error";
export type RunResult = { attempts: number; ok: number; conflict: number; error: number; errors: string[]; p50: number; p95: number; max: number; wallMs: number; values: unknown[] };
export async function concurrently(n: number, attempt: (i: number) => Promise<{ outcome: Outcome; value?: unknown; detail?: string }>): Promise<RunResult> {
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: n }, async (_, i) => {
    const t = performance.now();
    try { const r = await attempt(i); return { ...r, ms: performance.now() - t }; }
    catch (error) { return { outcome: "error" as Outcome, detail: (error as Error).message, ms: performance.now() - t }; }
  }));
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => Math.round(ms[Math.min(ms.length - 1, Math.floor(p * ms.length))]);
  return {
    attempts: n, ok: results.filter((r) => r.outcome === "ok").length, conflict: results.filter((r) => r.outcome === "conflict").length,
    error: results.filter((r) => r.outcome === "error").length, errors: [...new Set(results.filter((r) => r.outcome === "error").map((r) => String(r.detail).slice(0, 140)))],
    p50: pct(0.5), p95: pct(0.95), max: Math.round(ms[ms.length - 1]), wallMs: Math.round(performance.now() - started),
    values: results.filter((r) => r.outcome === "ok").map((r) => r.value),
  };
}

export const isConflictError = (e: { code?: string; message?: string } | null) => !!e && (e.code === "23P01" || /no longer available|conflicts with an existing reservation|blackout|unavailable/.test(e.message ?? ""));

// ── direct hold acquisition (the RPC the route uses), bypassing the route pre-check ─────────────────────────
export async function acquireHoldRpc(serviceId: string, startsAt: string, opts: { resourceId?: string | null; duration?: number | null; holdMinutes?: number | null } = {}) {
  const owner = randomUUID() + randomUUID();
  const ownerHash = sha256(owner);
  const key = `${PREFIX}${randomUUID()}`;
  const fingerprint = sha256(JSON.stringify({ serviceId, startsAt, key }));
  const r = await rpc<{ reservation_id: string; status: string; expires_at: string }>("acquire_booking_hold", {
    requested_service_id: serviceId, requested_starts_at: startsAt, requested_idempotency_key: key, requested_fingerprint: fingerprint,
    requested_owner_token_hash: ownerHash, requested_resource_id: opts.resourceId ?? null, requested_hold_minutes: opts.holdMinutes ?? null, requested_duration_minutes: opts.duration ?? null,
  });
  return { ...r, owner, ownerHash };
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// ── real route invocation ───────────────────────────────────────────────────────────────────────────────────
export function routeRequest(path: string, body: unknown, headers: Record<string, string> = {}, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost", "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export async function holdViaRoute(service: string, startsAt: string, extra: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/bookings/holds/route");
  const ownerKey = `${PREFIX}${randomUUID()}`;
  const res = await POST(routeRequest("/api/bookings/holds", { service, startsAt, ownerKey, idempotencyKey: `${PREFIX}${randomUUID()}`, ...extra }));
  return { status: res.status, body: await res.json() as Record<string, unknown>, ownerKey };
}

/** Full website checkout through the real route (hold must already exist). PayMongo is mocked by the network guard. */
export async function checkoutViaRoute(input: { session: string; date: string; time: string; startsAt: string; holdId: string; holdOwnerKey: string; pay?: string; email?: string; idempotencyKey?: string }) {
  const { POST } = await import("@/app/api/paymongo/checkout/route");
  const { getCurrentBookingTerms } = await import("@/lib/server/legal-documents");
  const terms = await getCurrentBookingTerms();
  const email = input.email ?? `safety-test-${randomUUID().slice(0, 12)}@example.test`;
  const res = await POST(routeRequest("/api/paymongo/checkout", {
    name: `${PREFIX}Customer ${email.slice(12, 18)}`, email, mobile: "+639171234567", session: input.session, date: input.date, time: input.time,
    startsAt: input.startsAt, holdId: input.holdId, holdOwnerKey: input.holdOwnerKey, location: `${PREFIX}location`, pay: input.pay ?? "full", addons: [],
    ...(terms ? { termsAcceptance: { accepted: true, versionId: terms.id, contentHash: terms.contentHash } } : {}),
  }, { "Idempotency-Key": input.idempotencyKey ?? `${PREFIX}${randomUUID()}` }));
  return { status: res.status, body: await res.json() as Record<string, unknown>, email };
}

// ── PayMongo webhook (signed exactly like PayMongo's plain-HMAC header that the route accepts) ──────────────
export function payMongoEvent(type: string, p: { eventId?: string; checkoutId: string; paymentId?: string; bookingId: string; reference: string; amount: number }) {
  const paidAt = Math.floor(Date.now() / 1000);
  return {
    data: {
      id: p.eventId ?? `evt_${PREFIX.toLowerCase().replace(/-/g, "_")}${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      attributes: {
        type, livemode: false, created_at: paidAt,
        data: { id: p.checkoutId, attributes: {
          reference_number: p.reference, currency: "PHP", amount: p.amount,
          metadata: { payment_id: p.paymentId ?? "", booking_id: p.bookingId },
          payments: type.endsWith(".paid") ? [{ id: `pay_${randomUUID().replace(/-/g, "").slice(0, 20)}`, attributes: { amount: p.amount, currency: "PHP", paid_at: paidAt, description: "SAFETY-TEST payment" } }] : [],
          payment_method_used: "gcash",
        } },
      },
    },
  };
}
export async function sendWebhook(event: unknown) {
  const { POST } = await import("@/app/api/paymongo/webhook/route");
  const body = JSON.stringify(event);
  const signature = createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET!).update(body).digest("hex");
  const res = await POST(new Request("http://localhost/api/paymongo/webhook", { method: "POST", headers: { "content-type": "application/json", "Paymongo-Signature": signature }, body }));
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}

// ── database state assertions ───────────────────────────────────────────────────────────────────────────────
export async function activeReservations(resourceId: string, fromIso: string, toIso: string) {
  return pg<{ id: string; status: string; type: string; starts_at: string; ends_at: string; booking_id: string | null; expires_at: string | null }>(
    `select id, status, type, starts_at, ends_at, booking_id, expires_at from public.booking_reservations
     where resource_id = ${lit(resourceId)} and status in ('held', 'booked') and blocked_range && tstzrange(${lit(fromIso)}, ${lit(toIso)}, '[)')`);
}
/** Invariant B1 checker: no two active reservations on one resource overlap anywhere. */
export async function overlappingActivePairs(resourceIds: string[]) {
  return pg<{ n: number }>(`select count(*)::int n from public.booking_reservations a join public.booking_reservations b
    on a.id < b.id and a.resource_id = b.resource_id and a.blocked_range && b.blocked_range
    where a.status in ('held', 'booked') and b.status in ('held', 'booked') and a.resource_id in (${resourceIds.map(lit).join(",")})`)[0].n;
}

export const report: Record<string, unknown> = {};
export function record(name: string, value: unknown) {
  report[name] = value;
  console.log(`[booking-safety] ${name}: ${JSON.stringify(value)}`);
}

// ── staff-side helpers (same RPCs the staff server actions call) ────────────────────────────────────────────
export const STAFF_ACTOR = "5afe7e57-0000-4000-8000-000000000001";
export const TEST_CLIENT = "5afe7e57-0000-4000-8000-0000000000c1";
export const TEST_PROFILE = "5afe7e57-0000-4000-8000-0000000000d1";

/** Staff-created booking (mirrors POST /api/operations/[kind]: direct insert, no hold → trigger reserves). */
export async function staffBooking(serviceId: string, date: string, time: string, extra: Record<string, unknown> = {}) {
  const reference = `${PREFIX}${randomUUID().slice(0, 8).toUpperCase()}`;
  const r = await db().from("bookings").insert({
    client_id: TEST_CLIENT, client_profile_id: TEST_PROFILE, idempotency_key: `${PREFIX}${randomUUID()}`, request_fingerprint: sha256(reference),
    reference, service_type: `${PREFIX}service`, service_id: serviceId, service_date: date, service_time: time, location: `${PREFIX}location`,
    payment_type: "cash", currency: "PHP", subtotal_amount_php: 100000, total_amount_php: 100000, paid_amount_php: 0, refunded_amount_php: 0,
    status: "inquiry", payment_status: "unpaid", attendance: "expected", kind: "standard", booking_source: "staff", ...extra,
  } as never).select("id,reference,starts_at").single<{ id: string; reference: string; starts_at: string }>();
  return r;
}
export async function reschedule(reference: string, date: string, time: string, resourceId: string) {
  return rpc("reschedule_booking", { requested_reference: reference, requested_date: date, requested_time: time, requested_resource_id: resourceId, requested_actor_id: STAFF_ACTOR, requested_reason: `${PREFIX}reschedule` });
}
export async function setStatus(reference: string, status: string) {
  return rpc("update_booking_status", { requested_reference: reference, requested_status: status, requested_actor_id: STAFF_ACTOR, requested_reason: `${PREFIX}${status}` });
}
export async function bookingState(id: string) {
  const [b, r] = await Promise.all([
    db().from("bookings").select("reference,status,payment_status,starts_at,service_time").eq("id", id).single<{ reference: string; status: string; payment_status: string; starts_at: string; service_time: string }>(),
    Promise.resolve(pg<{ status: string; type: string; starts_at: string }>(`select status, type, starts_at from public.booking_reservations where booking_id = ${lit(id)}`)[0] ?? null),
  ]);
  return { booking: b.data, reservation: r };
}

/** Cancel SAFETY-TEST website bookings on the real Main Studio so no real slot stays blocked after a run. */
export async function cancelSafetyTestCheckoutBookings() {
  const r = await db().from("bookings").update({ status: "cancelled", cancellation_reason: `${PREFIX}harness cleanup` } as never)
    .eq("location", `${PREFIX}location`).neq("status", "cancelled");
  if (r.error) throw r.error;
  // loose holds created by the harness (idempotency keys carry the prefix) — never anyone else's holds
  pgExec(`update public.booking_reservations set status = 'released', released_at = now(), updated_at = now()
    where status = 'held' and booking_id is null and (to_jsonb(booking_reservations)->>'parent_reservation_id') is null and idempotency_key like ${lit(PREFIX + "%")}`);
}
