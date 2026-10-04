"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { reassignResource } from "@/app/booking/list/[ref]/resource-actions";
import type { BookingResourceOption } from "@/lib/server/resource-scheduling";

const REASONS: Record<string, string> = { reserved: "Booked", leave: "On leave", blocked: "Blocked", outside_hours: "Not working", inactive: "Inactive" };

export function BookingResourcesPanel({ bookingRef, bookingId, options, editable }: { bookingRef: string; bookingId: string; options: BookingResourceOption[]; editable: boolean }) {
  const { fireToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<number | null>(null);
  const [choice, setChoice] = useState("");
  const [reason, setReason] = useState("");
  if (options.length === 0) return null;

  function save(position: number) {
    startTransition(async () => {
      try {
        await reassignResource(bookingRef, bookingId, position, choice, reason);
        fireToast("Resource reassigned", "success");
        setEditing(null); setReason("");
      } catch (error) {
        fireToast(error instanceof Error ? error.message : "Reassignment failed.", "danger");
      }
    });
  }

  return (
    <section className="mb-6 rounded-card border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">Resources</h2>
      <p className="mt-1 text-sm text-text-secondary">Everything this booking reserves. Changes are re-checked against working hours, leave, blocks and other bookings.</p>
      <div className="mt-4 divide-y divide-[var(--color-border)]">
        {options.map((option) => {
          const assigned = option.candidates.find((c) => c.id === option.assignedResourceId);
          return (
            <div key={option.position} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">{option.typeName}{option.mode === "fixed" ? " · fixed" : " · any available"}</div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{assigned?.name ?? "Not assigned"}</div>
                </div>
                {editable && option.mode === "any_available" && editing !== option.position && (
                  <button type="button" onClick={() => { setEditing(option.position); setChoice(option.assignedResourceId ?? ""); }}
                    className="inline-flex min-h-10 items-center rounded-control border border-[var(--color-border-strong)] px-4 text-[13px] font-semibold text-[var(--color-indigo-800)] hover:border-[var(--color-indigo-800)]">Change</button>
                )}
              </div>
              {editing === option.position && (
                <div className="mt-3 grid gap-2.5">
                  <div className="grid gap-1.5">
                    {option.candidates.map((candidate) => {
                      const current = candidate.id === option.assignedResourceId;
                      const blocked = !current && !!candidate.unavailableReason;
                      return (
                        <label key={candidate.id} className={`flex items-center justify-between rounded-control border px-3 py-2 text-sm ${choice === candidate.id ? "border-[var(--color-kahel-500)] bg-[var(--color-kahel-50)]" : "border-[var(--color-border)]"} ${blocked ? "opacity-60" : ""}`}>
                          <span className="flex items-center gap-2"><input type="radio" name={`resource-${option.position}`} disabled={blocked} checked={choice === candidate.id} onChange={() => setChoice(candidate.id)} />{candidate.name}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{current ? "Assigned" : candidate.unavailableReason ? REASONS[candidate.unavailableReason] ?? candidate.unavailableReason : "Available"}</span>
                        </label>
                      );
                    })}
                  </div>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for the change (kept in the audit log)" maxLength={500}
                    className="h-10 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 text-sm focus:border-[var(--color-kahel-500)] focus:outline-none" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(null)} disabled={isPending} className="min-h-10 flex-1 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Keep current</button>
                    <button type="button" onClick={() => save(option.position)} disabled={isPending || !choice || choice === option.assignedResourceId || !reason.trim()}
                      className="min-h-10 flex-1 rounded-control bg-[var(--color-kahel-500)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{isPending ? "Saving…" : "Reassign"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
