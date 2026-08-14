"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Filter,
  LineChart,
  Plus,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import { REPORTING_PERIOD } from "@/lib/reporting-sample-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

const metrics = [
  { label: "Revenue growth", value: "—", change: "No data yet", color: "#CECBC5", points: "0,40 25,40 50,40 75,40 100,40" },
  { label: "Export activity", value: "—", change: "No data yet", color: "#CECBC5", points: "0,40 25,40 50,40 75,40 100,40" },
  { label: "On-time delivery", value: "—", change: "No data yet", color: "#CECBC5", points: "0,40 25,40 50,40 75,40 100,40" },
  { label: "Report usage", value: "—", change: "No data yet", color: "#CECBC5", points: "0,40 25,40 50,40 75,40 100,40" },
];

const categories = [
  ["Financial reports", "Revenue, expenses and receivables", "0", "#E0F7F8", "#00575C"],
  ["Booking reports", "Sessions, demand and conversion", "0", "#E3EDFF", "#053799"],
  ["Project delivery", "Production progress and due dates", "0", "#EDEAFD", "#2A1F87"],
  ["Annual reports", "Yearly business performance", "0", "#FFF1CC", "#8A6D00"],
] as const;

export function ReportsClient() {
  const { fireToast } = useToast();
  const [period, setPeriod] = useState("Last 30 days");
  const [type, setType] = useState("All types");
  const [reports, setReports] = useState<{ name: string; meta: string }[]>([]);
  const visibleReports = reports;

  useEffect(() => {
    const load = () => { fetch("/api/operations/report").then(async (response) => response.ok ? await response.json() as { reports?: Array<{ name: string; source: string; period: string; schedule: string }> } : null).then((result) => setReports(result?.reports?.map((report) => ({ name: report.name, meta: `${report.source} · ${report.period} · ${report.schedule}` })) ?? [])).catch(() => {}); };
    const created = (event: Event) => { if ((event as CustomEvent<{ kind: string }>).detail.kind === "report") load(); };
    load(); window.addEventListener("operation-created", created); return () => window.removeEventListener("operation-created", created);
  }, []);

  function exportReport(name: string) {
    fireToast(`${name} is being prepared for download.`, "success");
  }

  return (
    <div className="app-page min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em]">Reports</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Access and download your studio reports and statements.</p>
        </div>
        <OperationCreateButton kind="report" className="flex h-11 items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Plus className="h-4 w-4" /> Create report</OperationCreateButton>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <div className="min-w-0">
          <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <SelectButton icon={<CalendarDays className="h-4 w-4" />} value={period} options={["Last 7 days", "Last 30 days", "This quarter", "This year"]} onChange={setPeriod} />
              <SelectButton icon={<Filter className="h-4 w-4" />} value={type} options={["All types", "Financial", "Bookings", "Projects"]} onChange={setType} />
              <button onClick={() => exportReport("All reports")} className="flex h-11 items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Download className="h-4 w-4" /> Export all</button>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div><h2 className="font-display text-lg font-semibold">Available reports</h2><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{period} · Updated {REPORTING_PERIOD.updated}</p></div>
              <span className="rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success-text)]">Ready</span>
            </div>
            {visibleReports.length ? visibleReports.map((report) => <div key={report.name} className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0 sm:px-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{report.name}</div><div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{report.meta}</div></div>
              <button onClick={() => exportReport(report.name)} className="grid h-10 w-10 shrink-0 place-items-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-kahel-700)]" aria-label={`Download ${report.name}`}><Download className="h-4 w-4" /></button>
            </div>) : <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">No reports generated yet.</div>}
            <button onClick={() => fireToast("All available reports loaded.", "info")} className="flex w-full items-center justify-center gap-2 px-5 py-4 text-sm font-semibold text-[var(--color-kahel-700)] hover:bg-[var(--color-kahel-50)]">View all reports <ChevronRight className="h-4 w-4" /></button>
          </section>

          <section className="mt-5 overflow-hidden rounded-card bg-[linear-gradient(125deg,#00575c,#007782_55%,#00575c)] p-6 text-white">
            <Sparkles className="h-5 w-5 text-[var(--color-kahel-200)]" />
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em]">Generate a custom report</h2>
            <p className="mt-2 max-w-lg text-sm leading-5 text-white/80">Build a focused report with your own date range, categories, and delivery schedule.</p>
            <OperationCreateButton kind="report" className="mt-5 h-11 rounded-control bg-white px-4 text-sm font-semibold text-[#00575c] hover:bg-[var(--color-surface-muted)]">Create report</OperationCreateButton>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="font-display text-lg font-semibold">Report categories</h2>
            <div className="mt-4 space-y-3">{categories.map(([name, description, count, bg, color]) => <button key={name} onClick={() => setType(name.split(" ")[0])} className="flex w-full items-center gap-3 rounded-control border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-control" style={{ background: bg, color }}><LineChart className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{name}</span><span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">{count} reports · {description}</span></span><ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" /></button>)}</div>
          </section>
          <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-display text-lg font-semibold">Quick actions</h2><div className="mt-4 space-y-2"><QuickAction label="Request a statement" onClick={() => fireToast("Statement request created.", "success")} /><QuickAction label="Download tax forms" onClick={() => fireToast("Tax forms are being prepared.", "success")} /><QuickAction label="Schedule report" onClick={() => fireToast("Report scheduler opened.", "info")} /></div></section>
          <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-display text-lg font-semibold">Recent activity</h2><p className="mt-3 text-sm text-[var(--color-text-muted)]">No activity yet.</p></section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, color, points }: { label: string; value: string; change: string; color: string; points: string }) { return <article className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-[var(--color-text-secondary)]">{label}</div><div className="mt-4 font-display text-[32px] font-semibold tracking-[-0.03em]">{value}</div></div><svg viewBox="0 0 100 45" className="mt-1 h-12 w-24" aria-hidden><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="mt-5 text-sm" style={{ color }}><span className="font-semibold">{change.split(" ")[0]}</span> <span className="text-[var(--color-text-secondary)]">{change.substring(change.indexOf(" ") + 1)}</span></div></article>; }

function SelectButton({ icon, value, options, onChange }: { icon: React.ReactNode; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="flex h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm font-medium text-[var(--color-text-primary)]">{icon}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent outline-none">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" /></label>; }

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) { return <button onClick={onClick} className="flex h-11 w-full items-center justify-between rounded-control border border-[var(--color-border)] px-3 text-left text-sm font-semibold hover:bg-[var(--color-surface-muted)]"><span>{label}</span><ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" /></button>; }
