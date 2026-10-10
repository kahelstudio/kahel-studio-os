import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = (name: string) => readFileSync(resolve("supabase/migrations", name), "utf8")
  .replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim().toLowerCase();

describe("elapsed reschedule migration", () => {
  const sql = migration("20260927000000_reject_elapsed_booking_reschedules.sql");

  it("compares the requested resource-local timestamp with database time", () => {
    expect(sql).toContain("requested_start := (requested_date + requested_time) at time zone requested_timezone");
    expect(sql).toContain("if requested_start <= clock_timestamp()");
    expect(sql).toContain("booking cannot be rescheduled to an elapsed time");
  });

  it("retains the canonical update path so overlap enforcement still runs", () => {
    expect(sql).toMatch(/update public\.bookings set service_date = requested_date, service_time = requested_time, resource_id = requested_resource_id/);
  });
});

describe("configurable performance weight migration", () => {
  const sql = migration("20260927010000_configurable_performance_weights.sql");
  const score = (scores: number[], weights: number[]) => Math.round(scores.reduce((sum, value, index) => sum + value * weights[index], 0) * 100) / 100;

  it("uses every stored weight in the generated score", () => {
    for (const column of ["leads_sales", "responsibilities", "quality_delivery", "attendance", "teamwork"]) {
      expect(sql).toContain(`score_${column} * weight_${column}`);
    }
  });

  it("preserves defaults and calculates custom weights with two-decimal rounding", () => {
    expect(score([80, 70, 90, 100, 60], [.35, .30, .20, .10, .05])).toBe(80);
    expect(score([81.11, 72.22, 93.33, 64.44, 55.55], [.10, .20, .30, .20, .20])).toBe(74.55);
    expect(score([100, 80, 60, 40, 20], [0, .25, .25, .25, .25])).toBe(50);
  });

  it("requires nonnegative weights totaling exactly one", () => {
    expect(sql).toContain("weight_leads_sales between 0 and 1");
    expect(sql).toMatch(/weight_leads_sales \+ weight_responsibilities \+ weight_quality_delivery \+ weight_attendance \+ weight_teamwork = 1\.00/);
    expect([.10, .20, .30, .20, .10].reduce((sum, value) => sum + value, 0)).toBeLessThan(1);
    expect([.30, .30, .30, .20, .10].reduce((sum, value) => sum + value, 0)).toBeGreaterThan(1);
  });
});
