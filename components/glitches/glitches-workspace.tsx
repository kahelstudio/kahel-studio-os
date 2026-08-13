"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Bug, CheckCircle2, ChevronRight, Clock3, Download, Filter, Plus, Search, ShieldAlert, X } from "lucide-react";
import { ACTIVE_GLITCH_STATUSES, GLITCH_CATEGORIES, GLITCH_SEVERITIES, GLITCH_STATUSES, RESOLVED_GLITCH_STATUSES } from "@/lib/glitches";
import type { GlitchRecord, GlitchesWorkspace } from "@/lib/server/glitches-data";
import { useToast } from "@/components/toast/toast-provider";
import { GlitchDetailDrawer, ReportGlitchDialog } from "./glitch-dialogs";
import { formatGlitchDate, glitchSeverityTone, glitchStatusTone } from "./glitch-presentation";

type QueryParams = { get(name: string): string | null; toString(): string };

export function GlitchesWorkspaceView({ initialWorkspace }: { initialWorkspace: GlitchesWorkspace | null }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams(), { fireToast } = useToast();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [loading, setLoading] = useState(false), [requestError, setRequestError] = useState(initialWorkspace ? "" : "Unable to load glitches.");
  const [filtersOpen, setFiltersOpen] = useState(false), [reportOpen, setReportOpen] = useState(false), [selectedId, setSelectedId] = useState<string | null>(params.get("glitch"));
  const view = params.get("view") === "resolved" ? "resolved" : "active";
  const query = useDeferredValue(params.get("q") ?? "").toLowerCase();
  const selected = workspace?.glitches.find((item) => item.id === selectedId) ?? null;
  const canAdmin = workspace?.viewer.role !== "staff";

  function setParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  async function refresh() {
    setLoading(true); setRequestError("");
    try {
      const response = await fetch("/api/glitches", { cache: "no-store" });
      const result = await response.json() as GlitchesWorkspace & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load glitches.");
      setWorkspace(result);
    } catch (error) { setRequestError(error instanceof Error ? error.message : "Unable to refresh glitches."); }
    finally { setLoading(false); }
  }

  const all = workspace?.glitches ?? [];
  const active = all.filter((item) => ACTIVE_GLITCH_STATUSES.includes(item.status));
  const now = new Date();
  const resolvedThisMonth = all.filter((item) => item.resolvedAt && new Date(item.resolvedAt).getFullYear() === now.getFullYear() && new Date(item.resolvedAt).getMonth() === now.getMonth()).length;
  const durations = all.filter((item) => item.resolvedAt).map((item) => new Date(item.resolvedAt!).getTime() - new Date(item.createdAt).getTime()).filter((duration) => duration >= 0);
  const averageResolution = durations.length ? formatDuration(durations.reduce((sum, duration) => sum + duration, 0) / durations.length) : "—";
  const rows = all.filter((item) => matches(item, view, query, params)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filterKeys = ["q", "status", "severity", "category", "assigned", "reporter", "location", "from", "to"];
  const activeFilters = filterKeys.filter((key) => params.get(key));

  function exportRows() {
    if (!canAdmin) return;
    const values = rows.map((item) => [item.reference, item.title, item.category, item.locationOrSystem ?? "", item.severity, item.reportedBy, item.assignedTo ?? "", item.observedAt, item.status]);
    const csv = [["Reference", "Issue", "Category", "Location/System", "Severity", "Reported by", "Assigned to", "Observed", "Status"], ...values].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `kahel-glitches-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="app-page min-w-0 p-5 pb-16 sm:p-8 lg:p-10">
    <header className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-6 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="font-display text-[32px] font-semibold tracking-[-0.025em] sm:text-[36px]">Glitches</h1><p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Track and resolve issues affecting studio operations.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"><Filter className="h-4 w-4" /> Filter{activeFilters.length ? ` (${activeFilters.length})` : ""}</button><button type="button" onClick={exportRows} disabled={!canAdmin} title={canAdmin ? "Export filtered records" : "Admin access required"} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"><Download className="h-4 w-4" /> Export</button><button type="button" onClick={() => setReportOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"><Plus className="h-4 w-4" /> Report Glitch</button></div></header>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Kpi label="Open" value={String(all.filter((item) => item.status === "Open").length)} icon={Bug} action={() => setParams({ view: "active", status: "Open" })} /><Kpi label="In Progress" value={String(all.filter((item) => item.status === "In Progress").length)} icon={Clock3} action={() => setParams({ view: "active", status: "In Progress" })} /><Kpi label="Critical" value={String(active.filter((item) => item.severity === "Critical").length)} icon={ShieldAlert} critical action={() => setParams({ view: "active", severity: "Critical", status: null })} /><Kpi label="Resolved This Month" value={String(resolvedThisMonth)} icon={CheckCircle2} action={() => setParams({ view: "resolved", status: "Resolved" })} /><Kpi label="Average Resolution Time" value={averageResolution} icon={Clock3} /></div>
    <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center"><div className="flex rounded-control bg-[var(--color-surface-muted)] p-1"><button onClick={() => setParams({ view: "active", status: null })} aria-current={view === "active" ? "page" : undefined} className={`h-9 rounded-[5px] px-4 text-sm font-semibold ${view === "active" ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-secondary)]"}`}>Active <span className="ml-1 text-xs">{active.length}</span></button><button onClick={() => setParams({ view: "resolved", status: null })} aria-current={view === "resolved" ? "page" : undefined} className={`h-9 rounded-[5px] px-4 text-sm font-semibold ${view === "resolved" ? "bg-[var(--color-surface)] shadow-sm" : "text-[var(--color-text-secondary)]"}`}>Resolved</button></div><label className="relative min-w-0 flex-1 md:max-w-md"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" /><span className="sr-only">Search glitches</span><input defaultValue={params.get("q") ?? ""} onChange={(event) => setParams({ q: event.target.value || null })} placeholder="Search issue or reference" className="h-10 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-kahel-500)]" /></label>{loading ? <span className="text-xs text-[var(--color-text-muted)]" role="status">Refreshing…</span> : null}</div>
    {filtersOpen && workspace ? <FilterPanel workspace={workspace} params={params} setParams={setParams} /> : null}
    {activeFilters.length ? <div className="mt-3 flex flex-wrap items-center gap-2">{activeFilters.map((key) => <button key={key} onClick={() => setParams({ [key]: null })} className="inline-flex h-8 items-center gap-1 rounded-pill bg-[var(--color-kahel-100)] px-3 text-xs font-semibold text-[var(--color-kahel-700)]">{filterLabel(key, params.get(key)!, workspace)} <X className="h-3 w-3" /></button>)}<button onClick={() => setParams(Object.fromEntries(filterKeys.map((key) => [key, null])))} className="h-8 px-2 text-xs font-semibold text-[var(--color-text-secondary)] underline">Clear filters</button></div> : null}
    {requestError ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]" role="alert"><span>{requestError}</span><button onClick={() => void refresh()} className="font-semibold underline">Try again</button></div> : null}
    {!requestError && !workspace ? <div className="mt-6 h-80 animate-pulse rounded-card bg-[var(--color-surface-muted)]" /> : rows.length ? <GlitchList rows={rows} select={setSelectedId} /> : <EmptyState filtered={Boolean(activeFilters.length)} report={() => setReportOpen(true)} clear={() => setParams(Object.fromEntries(filterKeys.map((key) => [key, null])))} />}
    {reportOpen && workspace ? <ReportGlitchDialog workspace={workspace} close={() => setReportOpen(false)} refresh={refresh} fireToast={fireToast} /> : null}
    {selected && workspace ? <GlitchDetailDrawer glitch={selected} workspace={workspace} close={() => setSelectedId(null)} refresh={refresh} fireToast={fireToast} /> : null}
  </div>;
}

function matches(item: GlitchRecord, view: string, query: string, params: QueryParams) {
  if (!(view === "active" ? ACTIVE_GLITCH_STATUSES : RESOLVED_GLITCH_STATUSES).includes(item.status)) return false;
  if (query && ![item.reference, item.title, item.description, item.locationOrSystem, item.category, item.reportedBy, item.assignedTo].some((value) => value?.toLowerCase().includes(query))) return false;
  if (params.get("status") && item.status !== params.get("status")) return false;
  if (params.get("severity") && item.severity !== params.get("severity")) return false;
  if (params.get("category") && item.category !== params.get("category")) return false;
  if (params.get("assigned") && item.assignedToId !== params.get("assigned")) return false;
  if (params.get("reporter") && item.reportedById !== params.get("reporter")) return false;
  if (params.get("location") && !item.locationOrSystem?.toLowerCase().includes(params.get("location")!.toLowerCase())) return false;
  if (params.get("from") && item.observedAt.slice(0, 10) < params.get("from")!) return false;
  if (params.get("to") && item.observedAt.slice(0, 10) > params.get("to")!) return false;
  return true;
}

function Kpi({ label, value, icon: Icon, action, critical = false }: { label: string; value: string; icon: typeof Bug; action?: () => void; critical?: boolean }) { const content = <><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{label}</span><Icon className={`h-4 w-4 ${critical ? "text-[var(--color-danger-text)]" : "text-[var(--color-kahel-500)]"}`} /></div><div className="mt-3 font-display text-2xl font-semibold">{value}</div></>; return action ? <button onClick={action} className={`rounded-card border bg-[var(--color-surface)] p-4 text-left hover:border-[var(--color-border-strong)] ${critical ? "border-l-[3px] border-l-[var(--color-danger)]" : "border-[var(--color-border)]"}`}>{content}</button> : <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">{content}</div>; }

function FilterPanel({ workspace, params, setParams }: { workspace: GlitchesWorkspace; params: QueryParams; setParams: (changes: Record<string, string | null>) => void }) { return <div className="mt-4 grid gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect label="Status" value={params.get("status") ?? ""} options={GLITCH_STATUSES} change={(value) => setParams({ status: value || null })} /><FilterSelect label="Severity" value={params.get("severity") ?? ""} options={GLITCH_SEVERITIES} change={(value) => setParams({ severity: value || null })} /><FilterSelect label="Category" value={params.get("category") ?? ""} options={GLITCH_CATEGORIES} change={(value) => setParams({ category: value || null })} /><FilterSelect label="Assigned staff" value={params.get("assigned") ?? ""} options={workspace.staff.map((item) => item.name)} values={workspace.staff.map((item) => item.id)} change={(value) => setParams({ assigned: value || null })} /><FilterSelect label="Reporter" value={params.get("reporter") ?? ""} options={workspace.staff.map((item) => item.name)} values={workspace.staff.map((item) => item.id)} change={(value) => setParams({ reporter: value || null })} /><Field label="Location or system"><input defaultValue={params.get("location") ?? ""} onBlur={(event) => setParams({ location: event.target.value || null })} className="glitch-input" /></Field><Field label="From"><input type="date" value={params.get("from") ?? ""} onChange={(event) => setParams({ from: event.target.value || null })} className="glitch-input" /></Field><Field label="To"><input type="date" value={params.get("to") ?? ""} onChange={(event) => setParams({ to: event.target.value || null })} className="glitch-input" /></Field></div>; }

function GlitchList({ rows, select }: { rows: GlitchRecord[]; select: (id: string) => void }) { return <div className="mt-5 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="hidden min-w-[1120px] grid-cols-[.85fr_2fr_1fr_1.1fr_.75fr_1fr_1fr_1fr_.9fr_44px] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)] lg:grid"><span>Reference</span><span>Issue</span><span>Category</span><span>Location / system</span><span>Severity</span><span>Reported by</span><span>Assigned to</span><span>Date reported</span><span>Status</span><span /></div>{rows.map((item) => <button key={item.id} onClick={() => select(item.id)} className={`grid w-full gap-3 border-b border-[var(--color-border)] p-4 text-left last:border-b-0 hover:bg-[var(--color-canvas)] lg:min-w-[1120px] lg:grid-cols-[.85fr_2fr_1fr_1.1fr_.75fr_1fr_1fr_1fr_.9fr_44px] lg:items-center ${item.severity === "Critical" ? "border-l-[3px] border-l-[var(--color-danger)]" : ""}`}><span className="text-xs font-semibold text-[var(--color-text-muted)]">{item.reference}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span>{item.operationsBlocked ? <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-danger-text)]"><AlertTriangle className="h-3 w-3" /> Operations blocked</span> : null}</span><MobileLabel label="Category" value={item.category} /><MobileLabel label="Location / system" value={item.locationOrSystem ?? "—"} /><span className={`text-xs font-semibold ${glitchSeverityTone[item.severity]}`}>{item.severity}</span><MobileLabel label="Reported by" value={item.reportedBy} /><MobileLabel label="Assigned to" value={item.assignedTo ?? "Unassigned"} /><MobileLabel label="Reported" value={formatGlitchDate(item.observedAt)} /><span className={`w-fit rounded-pill px-2.5 py-1 text-[11px] font-semibold ${glitchStatusTone[item.status]}`}>{item.status}</span><ChevronRight className="hidden h-4 w-4 text-[var(--color-text-muted)] lg:block" /></button>)}</div>; }
function MobileLabel({ label, value }: { label: string; value: string }) { return <span className="flex items-baseline justify-between gap-3 text-xs lg:block"><span className="font-semibold text-[var(--color-text-muted)] lg:hidden">{label}</span><span className="truncate text-[var(--color-text-secondary)]">{value}</span></span>; }
function EmptyState({ filtered, report, clear }: { filtered: boolean; report: () => void; clear: () => void }) { return <div className="mt-6 grid min-h-72 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><Bug className="mx-auto h-8 w-8 text-[var(--color-kahel-500)]" /><h2 className="mt-4 font-display text-xl font-semibold">{filtered ? "No matching glitches" : "No glitches reported"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">{filtered ? "Try changing or clearing the active filters." : "When something interrupts studio operations, report it here so the team can track and resolve it."}</p><button onClick={filtered ? clear : report} className="mt-5 h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">{filtered ? "Clear filters" : "Report Glitch"}</button></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function FilterSelect({ label, value, options, values, change }: { label: string; value: string; options: readonly string[]; values?: string[]; change: (value: string) => void }) { return <Field label={label}><select value={value} onChange={(event) => change(event.target.value)} className="glitch-input"><option value="">All</option>{options.map((option, index) => <option key={values?.[index] ?? option} value={values?.[index] ?? option}>{option}</option>)}</select></Field>; }
function formatDuration(milliseconds: number) { const hours = Math.round(milliseconds / 3_600_000); return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`; }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function filterLabel(key: string, value: string, workspace: GlitchesWorkspace | null) { if (key === "assigned" || key === "reporter") return `${key === "assigned" ? "Assigned" : "Reporter"}: ${workspace?.staff.find((item) => item.id === value)?.name ?? value}`; return `${key === "q" ? "Search" : key[0].toUpperCase() + key.slice(1)}: ${value}`; }
