"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { GlitchRow } from "@/lib/server/glitches-data";
import { useToast } from "@/components/toast/toast-provider";

const GLITCH_ST: Record<string, { bg: string; c: string; l: string }> = {
  open: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", l: "Open" },
  progress: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", l: "Investigating" },
  fixed: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", l: "Fixed" },
  closed: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)", l: "Closed" },
};

const SEV_COLOR: Record<string, string> = {
  High: "var(--color-danger-text)",
  Medium: "var(--color-warning-text)",
  Low: "var(--color-text-secondary)",
};

function formatReportedAt(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${day} ${month} · ${h}:${mins} ${ampm}`;
}

export function GlitchesTable({ group, glitches }: { group: "open" | "closed"; glitches: GlitchRow[] }) {
  const statusFilter = group === "open" ? ["open", "progress"] : ["fixed", "closed"];
  const rows = glitches.filter((g) => statusFilter.includes(g.status));
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Glitches
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Production issues and bug reports across the workspace
          </p>
        </div>
        <button type="button" onClick={() => setReportOpen(true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Report glitch
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[0.8fr_2fr_1fr_0.7fr_0.9fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Ref</div>
          <div>Issue</div>
          <div>Reported by</div>
          <div>Severity</div>
          <div>Status</div>
          <div className="text-right">Logged</div>
        </div>
        {rows.map((g) => {
          const st = GLITCH_ST[g.status] ?? GLITCH_ST.open;
          const sevColor = SEV_COLOR[g.severity] ?? "var(--color-text-secondary)";
          return (
            <div
              key={g.reference}
              className="grid min-h-[58px] grid-cols-[0.8fr_2fr_1fr_0.7fr_0.9fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-xs text-[var(--color-text-muted)]">{g.reference}</div>
              <div>
                <div className="font-semibold">{g.title}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{g.area}</div>
              </div>
              <div className="text-[var(--color-text-primary)]">{g.reporter}</div>
              <div className="font-semibold" style={{ color: sevColor }}>
                {g.severity}
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.l}
                </span>
              </div>
              <div className="text-right text-xs text-[var(--color-text-muted)]">{formatReportedAt(g.reportedAt)}</div>
            </div>
          );
        })}
      </div>
      {reportOpen && <ReportGlitchDialog close={() => setReportOpen(false)} />}
    </div>
  );
}

function ReportGlitchDialog({ close }: { close: () => void }) {
  const router = useRouter();
  const { fireToast } = useToast();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !submitting) close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, submitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/glitches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, area, severity }) });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to report the glitch.");
      close();
      fireToast(`${result.reference ?? "Glitch"} reported`, "success");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to report the glitch.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="report-glitch-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) close(); }}><form onSubmit={submit} className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:max-w-lg sm:rounded-card"><header className="flex items-start gap-4 border-b border-[var(--color-border)] p-5"><div><h2 id="report-glitch-title" className="font-display text-xl font-semibold">Report glitch</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Log a production issue for investigation.</p></div><button type="button" onClick={close} disabled={submitting} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-5"><label className="block text-sm font-semibold">What happened?<textarea autoFocus required minLength={5} maxLength={500} rows={4} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Describe the issue and what you expected to happen..." className="mt-1.5 w-full resize-y rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-normal outline-none focus:border-[var(--color-kahel-500)]" /></label><label className="block text-sm font-semibold">Affected app or area<input required minLength={2} maxLength={255} value={area} onChange={(event) => setArea(event.target.value)} placeholder="Bookings, Finance, Client Portal..." list="glitch-areas" className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal outline-none focus:border-[var(--color-kahel-500)]" /><datalist id="glitch-areas"><option value="Bookings" /><option value="Finance" /><option value="Projects" /><option value="Client Portal" /><option value="Website" /><option value="Staff account" /></datalist></label><fieldset><legend className="text-sm font-semibold">Severity</legend><div className="mt-1.5 grid grid-cols-3 gap-2">{["Low", "Medium", "High"].map((option) => <button type="button" key={option} aria-pressed={severity === option} onClick={() => setSeverity(option)} className="min-h-11 rounded-control border border-[var(--color-border)] text-sm font-semibold aria-pressed:border-[var(--color-kahel-500)] aria-pressed:bg-[var(--color-kahel-100)] aria-pressed:text-[var(--color-kahel-700)]">{option}</button>)}</div></fieldset>{error && <p className="text-sm font-medium text-[var(--color-danger-text)]" role="alert">{error}</p>}</div><footer className="flex gap-3 border-t border-[var(--color-border)] p-5"><button type="button" onClick={close} disabled={submitting} className="min-h-11 flex-1 rounded-control border border-[var(--color-border)] text-sm font-semibold hover:bg-[var(--color-surface-muted)] disabled:opacity-55">Cancel</button><button disabled={submitting || title.trim().length < 5 || area.trim().length < 2} className="min-h-11 flex-1 rounded-control bg-[var(--color-kahel-500)] text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-55">{submitting ? "Reporting..." : "Report glitch"}</button></footer></form></div>;
}
