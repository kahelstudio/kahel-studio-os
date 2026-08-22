import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("supabase/migrations/20260822120000_prevent_double_booking.sql"), "utf8")
  .replace(/--.*$/gm, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

describe("canonical booking reservation migration", () => {
  it("uses resource-scoped interval exclusion instead of exact-slot uniqueness", () => {
    expect(sql).toContain("create extension if not exists btree_gist");
    expect(sql).toMatch(/exclude using gist \(resource_id with =, blocked_range with &&\) where \(status in \('held', 'booked'\)\)/);
    expect(sql).not.toContain("bookings_active_slot_key");

    const exclusion = sql.match(/add constraint booking_reservations_exclusive_resource ([^;]+);/)?.[1];
    expect(exclusion).toBeDefined();
    expect(exclusion).not.toContain("now()");
    expect(exclusion).not.toContain("clock_timestamp()");
  });

  it("routes every booking schedule and status write through the canonical trigger", () => {
    expect(sql).toMatch(/create trigger sync_booking_reservation before insert or update of [^;]+ on public\.bookings/);
    expect(sql).toContain("new.status in ('cancelled', 'completed')");
    expect(sql).toContain("current_reservation.status = 'expired'");
    expect(sql).toMatch(/linked reservation hold expired before booking (confirmation|activation)/);
    expect(sql).toContain("booking schedule conflicts with an existing reservation");
    expect(sql).toContain("schedule_changed and new.status in ('inquiry', 'quoted', 'confirmed', 'progress')");
    expect(sql).toContain("new.starts_at < server_time + make_interval(mins => selected_service.minimum_notice_minutes)");
    expect(sql).toContain("public.booking_resource_weekly_hours hours");
    expect(sql).toContain("public.booking_resource_blackouts blackout");
    expect(sql).toContain("new.payment_type = 'cash'");
  });

  it("uses explicit event durations and ignores stale holds in read-only availability", () => {
    expect(sql).toContain("lower(code) in ('debut', 'anniversary-celebration')");
    expect(sql).toContain("lower(name) in ('debut', 'anniversary celebration')");
    expect(sql).toContain("r.status = 'booked' or (r.status = 'held' and r.expires_at > server_time)");
  });

  it("keeps reservation tables private and exposes only safe public availability", () => {
    expect(sql).toContain("alter table public.booking_reservations enable row level security;");
    expect(sql).toMatch(/revoke all on table [^;]*public\.booking_reservations[^;]* from public, anon, authenticated, service_role;/);
    expect(sql).toContain("grant execute on function public.get_booking_availability(uuid,date,uuid,integer) to anon, authenticated, service_role;");
    expect(sql).toMatch(/grant execute on function public\.expire_booking_holds\(integer\), public\.acquire_booking_hold[^;]+ to service_role;/);
    expect(sql).not.toMatch(/grant (insert|update|delete|all) on table public\.booking_reservations/);
  });

  it("locks security-definer RPC search paths and explicitly transitions expired holds", () => {
    for (const name of [
      "expire_booking_holds",
      "get_booking_availability",
      "acquire_booking_hold",
      "release_booking_hold",
      "link_booking_hold",
    ]) {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${name}\\([^$]+security definer set search_path = '' as \\$\\$`));
    }
    expect(sql).toContain("set status = 'expired', released_at = clock_timestamp()");
    expect(sql.indexOf("perform public.expire_booking_holds(500)")).toBeLessThan(sql.indexOf("where idempotency_key = btrim(requested_idempotency_key) for update"));
  });

  it("serializes blackouts and protects pending payment checkouts", () => {
    expect(sql).toContain("pg_advisory_xact_lock(pg_catalog.hashtextextended(selected_resource.id::text, 0))");
    expect(sql).toContain("create trigger protect_booking_blackout");
    expect(sql).toContain("blackout conflicts with an existing reservation");
    expect(sql).toContain("create or replace function public.activate_booking_checkout");
    expect(sql).toContain("create or replace function public.release_failed_booking_checkout");
    expect(sql).not.toContain("r.expires_at + interval '10 minutes' <= clock_timestamp()");
    expect(sql).toContain("booked reservations are released only by a definitive provider failure");
  });

  it("does not allow callers to substitute an unrelated resource", () => {
    expect(sql.match(/resource is not configured for this service/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("carries bounded duration overrides through availability, holds, and booking snapshots", () => {
    expect(sql).toContain("requested_duration_minutes integer default null");
    expect(sql).toContain("effective_duration_minutes > selected_service.duration_minutes + 480");
    expect(sql).toContain("new.duration_minutes_snapshot < selected_service.duration_minutes");
    expect(sql).toContain("new.duration_minutes_snapshot > selected_service.duration_minutes + 480");
    expect(sql).toContain("public.acquire_booking_hold(uuid,timestamptz,text,text,text,uuid,integer,integer)");
  });
});

describe("checkout reservation safety migration", () => {
  const safety = readFileSync(resolve("supabase/migrations/20260822190000_checkout_reservation_safety.sql"), "utf8")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  it("re-arms expired checkouts without timing out booked reservations", () => {
    expect(safety).toContain("create or replace function public.reset_booking_checkout_for_retry(");
    expect(safety).toContain("grant execute on function public.reset_booking_checkout_for_retry(uuid, text, text, timestamptz) to service_role");
    expect(safety).toContain("booking_already_confirmed");
    expect(safety).toContain("set status = 'held'");
    expect(safety).toContain("paymongo_checkout_url = null");
  });
});
