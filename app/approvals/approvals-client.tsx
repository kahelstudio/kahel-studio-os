"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  ExternalLink,
  FileQuestion,
  Filter,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import { ApprovalAttachmentUploader } from "@/components/approvals/approval-attachment-uploader";
import {
  APPROVAL_PRIORITIES,
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPES,
  APPROVAL_TYPE_BY_VALUE,
  BULK_ELIGIBLE_REQUEST_TYPES,
  calculateLiquidation,
  type ApprovalField,
} from "@/lib/approvals";
import type { ApprovalDashboard, ApprovalRecord } from "@/lib/server/approvals-data";

type Tab = "my-approvals" | "my-requests" | "all" | "completed";
type DecisionAction = "approve" | "reject" | "return" | "request_document" | "withdraw" | "submit" | "resubmit" | "override_approve" | "override_reject" | "archive";
type FulfillmentAction = "release" | "payment" | "balance_return" | "reimbursement";

const completedStatuses = new Set(["approved", "rejected", "cancelled", "withdrawn"]);
const secondaryViews = ["pending", "urgent", "overdue", "financial", "projects", "attendance", "purchases", "cash-advances"] as const;

export function ApprovalsClient({ initialDashboard, initialError }: { initialDashboard: ApprovalDashboard | null; initialError: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fireToast } = useToast();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const initialCreateType = searchParams.get("create");
  const [createOpen, setCreateOpen] = useState(Boolean(initialCreateType && APPROVAL_TYPE_BY_VALUE[initialCreateType]));
  const [createType, setCreateType] = useState<string | null>(initialCreateType && APPROVAL_TYPE_BY_VALUE[initialCreateType] ? initialCreateType : null);
  const [creationKey, setCreationKey] = useState(() => crypto.randomUUID());
  const [createSeed, setCreateSeed] = useState<ApprovalRecord | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [decision, setDecision] = useState<{ record: ApprovalRecord; action: DecisionAction } | null>(null);
  const [fulfillment, setFulfillment] = useState<{ record: ApprovalRecord; action: FulfillmentAction } | null>(null);
  const [assignment, setAssignment] = useState<{ record: ApprovalRecord; action: "reassign" | "delegate" } | null>(null);
  const [editing, setEditing] = useState<ApprovalRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const searchValue = searchParams.get("q") ?? "";
  const deferredSearch = useDeferredValue(searchValue.toLowerCase());
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = requestedTab === "all" && dashboard?.role === "staff" ? "my-approvals" : (["my-approvals", "my-requests", "all", "completed"].includes(requestedTab ?? "") ? requestedTab! : "my-approvals");
  const selectedRecord = dashboard?.records.find((record) => record.id === searchParams.get("request")) ?? null;

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const records = dashboard?.records ?? [];
  const awaiting = records.filter((record) => record.canDecide);
  const mine = records.filter((record) => record.requesterId === dashboard?.userId);
  const approvedThisMonth = records.filter((record) => record.status === "approved" && record.completedAt?.slice(0, 7) === manilaMonth()).length;
  const returned = mine.filter((record) => record.status === "returned_for_changes").length;
  const overdue = records.filter((record) => record.overdue).length;
  const pendingAmount = records.filter((record) => record.status === "pending_approval" && record.canViewFinancials).reduce((sum, record) => sum + (record.amount ?? 0), 0);
  const visible = records.filter((record) => dashboard && matchesTab(record, tab, dashboard)).filter((record) => matchesFilters(record, searchParams, deferredSearch));
  const activeFilterEntries = [...searchParams.entries()].filter(([key, value]) => value && !["tab", "request"].includes(key));
  const canExport = dashboard?.role === "admin" || dashboard?.role === "super_admin";

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(`/approvals${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  async function refresh(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      const body = await response.json() as ApprovalDashboard & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to refresh approvals.");
      startTransition(() => { setDashboard(body); setError(null); });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh approvals.");
    } finally {
      setRefreshing(false);
    }
  }

  async function runAction(record: ApprovalRecord, action: string, payload: Record<string, unknown> = {}) {
    setPending(true);
    try {
      const response = await fetch(`/api/approvals/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json().catch(() => ({})) as { error?: string; stale?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Unable to update this request.");
      fireToast(actionMessage(action), "success");
      setDecision(null); setFulfillment(null); setAssignment(null);
      await refresh(true);
    } catch (actionError) {
      fireToast(actionError instanceof Error ? actionError.message : "Unable to update this request.", "danger");
      await refresh(true);
    } finally {
      setPending(false);
    }
  }

  async function bulkApprove() {
    setPending(true);
    try {
      const response = await fetch("/api/approvals/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestIds: selected }) });
      const result = await response.json().catch(() => ({})) as { error?: string; approved?: number };
      if (!response.ok) throw new Error(result.error ?? "Unable to approve the selected requests.");
      fireToast(`${result.approved ?? selected.length} requests approved.`, "success");
      setSelected([]);
      await refresh(true);
    } catch (bulkError) {
      fireToast(bulkError instanceof Error ? bulkError.message : "Bulk approval failed.", "danger");
    } finally { setPending(false); }
  }

  function openCreate(record?: ApprovalRecord) {
    setCreationKey(crypto.randomUUID());
    setCreateSeed(record ?? null);
    setCreateType(record?.requestType ?? null);
    setCreateOpen(true);
  }

  if (!dashboard && error) return <PageError message={error} onRetry={() => void refresh()} pending={refreshing} />;
  if (!dashboard) return <PageLoading />;

  return <div className="app-page min-w-0 p-4 pb-16 sm:p-7 lg:p-9">
    {!online && <div role="status" className="mb-4 flex items-center gap-2 rounded-control border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]"><AlertCircle className="h-4 w-4" /> You are offline. Decisions and submissions will be available when the connection returns.</div>}
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-control border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger-text)]"><span>{error}</span><button onClick={() => void refresh()} className="font-semibold underline">Retry</button></div>}

    <header className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="font-display text-[30px] font-semibold tracking-[-0.025em] sm:text-[36px]">Approvals</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)] sm:text-[15px]">Review and manage operational and financial requests.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none"><span className="sr-only">Search approvals</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" /><input value={searchValue} onChange={(event) => updateParams({ q: event.target.value || null })} placeholder="Search or reference" className="h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-kahel-500)] focus:ring-2 focus:ring-[var(--color-kahel-100)]" /></label>
        <button onClick={() => setFilterOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold"><Filter className="h-4 w-4" /> Filter{activeFilterEntries.length ? ` · ${activeFilterEntries.length}` : ""}</button>
        {canExport && <a href={`/api/approvals/export?${searchParams.toString()}`} className="inline-flex h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></a>}
        {dashboard.role === "super_admin" && <button onClick={() => setWorkflowOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Workflow rules</span></button>}
        <button onClick={() => openCreate()} className="inline-flex h-11 items-center gap-2 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5300]"><Plus className="h-4 w-4" /> New Request</button>
      </div>
    </header>

    <section aria-label="Approval summary" className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="Awaiting My Approval" value={String(awaiting.length)} icon={<Clock3 />} onClick={() => updateParams({ tab: "my-approvals", view: null, status: null })} />
      <Kpi label="Submitted by Me" value={String(mine.filter((record) => record.status !== "draft").length)} icon={<Send />} onClick={() => updateParams({ tab: "my-requests", view: null, status: null })} />
      <Kpi label="Approved This Month" value={String(approvedThisMonth)} icon={<CheckCircle2 />} onClick={() => updateParams({ tab: "completed", status: "approved", view: null })} />
      <Kpi label="Returned for Changes" value={String(returned)} icon={<RotateCcw />} onClick={() => updateParams({ tab: "my-requests", status: "returned_for_changes", view: null })} />
      <Kpi label="Overdue" value={String(overdue)} icon={<AlertCircle />} onClick={() => updateParams({ view: "overdue", status: null })} tone="warning" />
      <Kpi label="Total Amount Pending" value={formatMoney(pendingAmount, "PHP")} icon={<CircleDollarSign />} onClick={() => updateParams({ view: "financial", status: "pending_approval" })} compact />
    </section>

    <div className="mt-6 flex gap-6 overflow-x-auto" role="tablist" aria-label="Approval views">
      {(["my-approvals", "my-requests", ...(dashboard.role !== "staff" ? ["all"] : []), "completed"] as Tab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => updateParams({ tab: item === "my-approvals" ? null : item, status: null, view: null })} className={`shrink-0 border-b-2 pb-2 pt-1 text-sm font-semibold ${tab === item ? "border-[#FF5300] text-[#FF5300]" : "border-transparent text-[var(--color-text-secondary)]"}`}>{tabLabel(item)}</button>)}
    </div>
    <div className="mt-3 flex items-center gap-6 overflow-x-auto" aria-label="Saved views">
      {secondaryViews.map((view) => <button key={view} onClick={() => updateParams({ view: searchParams.get("view") === view ? null : view, status: null })} className={`shrink-0 border-b-2 pb-2 pt-1 text-[13px] font-semibold capitalize transition-colors ${searchParams.get("view") === view ? "border-[#FF5300] text-[#FF5300]" : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}>{view.replace("-", " ")}</button>)}
      <button onClick={() => void refresh()} disabled={refreshing} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-control text-[var(--color-text-secondary)] disabled:opacity-50" aria-label="Refresh approvals"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
    </div>

    {activeFilterEntries.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{activeFilterEntries.map(([key, value]) => <button key={key} onClick={() => updateParams({ [key]: null })} className="inline-flex items-center gap-1 rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium"><span className="capitalize">{key.replaceAll("-", " ")}: {filterLabel(key, value, dashboard)}</span><X className="h-3 w-3" /></button>)}<button onClick={() => clearFilters(router, tab)} className="text-xs font-semibold text-[#FF5300]">Clear filters</button></div>}

    {selected.length > 0 && <div className="mt-4 flex items-center justify-between gap-3 rounded-control border border-[var(--color-kahel-300)] bg-[var(--color-kahel-100)] px-4 py-3"><span className="text-sm font-semibold">{selected.length} selected</span><div className="flex gap-2"><button onClick={() => setSelected([])} className="text-sm font-semibold">Clear</button><button disabled={pending} onClick={() => void bulkApprove()} className="rounded-control bg-[#FF5300] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve selected</button></div></div>}

    {visible.length ? <RequestList records={visible} selected={selected} onSelect={setSelected} onOpen={(id) => updateParams({ request: id })} /> : <EmptyState tab={tab} filtered={activeFilterEntries.length > 0} onCreate={() => openCreate()} onClear={() => clearFilters(router, tab)} />}

    {filterOpen && <FilterDialog dashboard={dashboard} params={searchParams} onApply={(changes) => { updateParams(changes); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />}
    {workflowOpen && <WorkflowRulesDialog onClose={() => setWorkflowOpen(false)} />}
    {createOpen && <CreateDialog dashboard={dashboard} requestType={createType} idempotencyKey={creationKey} seed={createSeed} onChoose={setCreateType} onClose={() => { setCreateOpen(false); setCreateType(null); setCreateSeed(null); }} onCreated={async (message) => { fireToast(message, "success"); setCreateOpen(false); setCreateType(null); setCreateSeed(null); await refresh(true); }} />}
    {selectedRecord && <DetailDrawer record={selectedRecord} dashboard={dashboard} onClose={() => updateParams({ request: null })} onDecision={(action) => setDecision({ record: selectedRecord, action })} onFulfillment={(action) => setFulfillment({ record: selectedRecord, action })} onAssignment={(action) => setAssignment({ record: selectedRecord, action })} onEdit={() => setEditing(selectedRecord)} onDuplicate={() => openCreate(selectedRecord)} onRefresh={() => void refresh(true)} />}
    {decision && <DecisionDialog decision={decision} pending={pending} onClose={() => setDecision(null)} onConfirm={(comment) => void runAction(decision.record, decision.action, { comment })} />}
    {fulfillment && <FulfillmentDialog value={fulfillment} pending={pending} onClose={() => setFulfillment(null)} onConfirm={(payload) => void runAction(fulfillment.record, fulfillment.action, payload)} />}
    {assignment && <AssignmentDialog value={assignment} people={dashboard.people.filter((person) => person.role !== "staff")} pending={pending} onClose={() => setAssignment(null)} onConfirm={(targetId, comment) => void runAction(assignment.record, assignment.action, { targetId, comment })} />}
    {editing && <EditRequestDialog record={editing} onClose={() => setEditing(null)} onSaved={async (message) => { fireToast(message, "success"); setEditing(null); await refresh(true); }} />}
  </div>;
}

function RequestList({ records, selected, onSelect, onOpen }: { records: ApprovalRecord[]; selected: string[]; onSelect: (ids: string[]) => void; onOpen: (id: string) => void }) {
  function selectable(record: ApprovalRecord) { return record.canDecide && BULK_ELIGIBLE_REQUEST_TYPES.has(record.requestType); }
  return <div className="mt-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[1380px] border-collapse text-left text-xs"><thead className="bg-[var(--color-surface-muted)] text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]"><tr><th className="w-10 px-3 py-3"><span className="sr-only">Select</span></th>{["Reference", "Request type", "Subject", "Requester", "Source", "Amount", "Current approver", "Submitted", "Required by", "Priority", "Status", "Actions"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-canvas)]"><td className="px-3 py-3"><input type="checkbox" disabled={!selectable(record)} checked={selected.includes(record.id)} onChange={(event) => onSelect(event.target.checked ? [...selected, record.id] : selected.filter((id) => id !== record.id))} aria-label={`Select ${record.reference}`} /></td><td className="whitespace-nowrap px-3 py-3 font-semibold text-[#FF5300]"><button onClick={() => onOpen(record.id)}>{record.reference}</button></td><td className="max-w-44 px-3 py-3">{record.requestTypeLabel}</td><td className="max-w-52 px-3 py-3"><button onClick={() => onOpen(record.id)} className="line-clamp-2 text-left font-semibold">{record.subject}</button></td><td className="whitespace-nowrap px-3 py-3">{record.requester}</td><td className="capitalize px-3 py-3">{record.sourceModule}</td><td className="whitespace-nowrap px-3 py-3 font-medium">{record.amount === null ? record.canViewFinancials ? "—" : "Restricted" : formatMoney(record.amount, record.currency)}</td><td className="whitespace-nowrap px-3 py-3">{record.currentApprover}</td><td className="whitespace-nowrap px-3 py-3">{shortDate(record.submittedAt ?? record.createdAt)}</td><td className={`whitespace-nowrap px-3 py-3 ${record.overdue ? "font-semibold text-[var(--color-danger-text)]" : ""}`}>{record.requiredBy ? shortDate(record.requiredBy) : "—"}</td><td className="px-3 py-3"><PriorityBadge value={record.priority} /></td><td className="px-3 py-3"><StatusBadge value={record.status} /><div className="mt-1"><FulfillmentBadge value={record.fulfillmentStatus} /></div></td><td className="px-3 py-3"><button onClick={() => onOpen(record.id)} className="inline-flex min-h-10 items-center gap-1 rounded-control px-2 font-semibold">Review <ChevronRight className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
    <div className="divide-y divide-[var(--color-border)] xl:hidden">{records.map((record) => <article key={record.id} className="p-4"><button onClick={() => onOpen(record.id)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold text-[#FF5300]">{record.reference}</div><h3 className="mt-1 font-display text-[15px] font-semibold">{record.subject}</h3><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{record.requestTypeLabel}</p></div><StatusBadge value={record.status} /></div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><Meta label="Requester" value={record.requester} /><Meta label="Required by" value={record.requiredBy ? shortDate(record.requiredBy) : "Not set"} danger={record.overdue} /><Meta label="Amount" value={record.amount === null ? record.canViewFinancials ? "Not applicable" : "Restricted" : formatMoney(record.amount, record.currency)} /><Meta label="Priority" value={capitalize(record.priority)} /></div>{record.canDecide && <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3 text-sm font-semibold text-[#FF5300]">Review and decide <ChevronRight className="h-4 w-4" /></div>}</button></article>)}</div>
  </div>;
}

function DetailDrawer({ record, dashboard, onClose, onDecision, onFulfillment, onAssignment, onEdit, onDuplicate, onRefresh }: { record: ApprovalRecord; dashboard: ApprovalDashboard; onClose: () => void; onDecision: (action: DecisionAction) => void; onFulfillment: (action: FulfillmentAction) => void; onAssignment: (action: "reassign" | "delegate") => void; onEdit: () => void; onDuplicate: () => void; onRefresh: () => void }) {
  const { fireToast } = useToast();
  const [comment, setComment] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const definition = APPROVAL_TYPE_BY_VALUE[record.requestType];
  const liquidation = record.requestType === "cash_advance_liquidation" ? calculateLiquidation(numberDetail(record, "amountReleased"), numberDetail(record, "totalSpent"), numberDetail(record, "amountReturned")) : null;
  async function addComment(event: React.FormEvent) {
    event.preventDefault(); setCommentPending(true);
    try {
      const response = await fetch(`/api/approvals/${record.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: comment, visibility: "participants" }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to add comment.");
      setComment(""); fireToast("Comment added.", "success"); onRefresh();
    } catch (error) { fireToast(error instanceof Error ? error.message : "Unable to add comment.", "danger"); } finally { setCommentPending(false); }
  }
  return <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`${record.reference} details`}><button aria-label="Close request details" onClick={onClose} className="absolute inset-0 bg-black/40" /><aside className="relative flex h-dvh w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-canvas)] shadow-[var(--shadow-dialog)]"><header className="flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-[#FF5300]">{record.reference}</div><h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">{record.subject}</h2><div className="mt-2 flex flex-wrap gap-2"><StatusBadge value={record.status} /><PriorityBadge value={record.priority} /><FulfillmentBadge value={record.fulfillmentStatus} /></div></div><button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-control hover:bg-[var(--color-surface-muted)]" aria-label="Close"><X className="h-5 w-5" /></button></header>
    <div className="flex-1 overflow-y-auto p-4 sm:p-5"><section className="grid grid-cols-2 gap-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3"><Meta label="Requester" value={record.requester} /><Meta label="Current approver" value={record.currentApprover} /><Meta label="Submitted" value={record.submittedAt ? fullDate(record.submittedAt) : "Draft"} /><Meta label="Required by" value={record.requiredBy ? shortDate(record.requiredBy) : "Not set"} danger={record.overdue} /><Meta label="Source" value={capitalize(record.sourceModule)} /><Meta label="Amount" value={record.amount === null ? record.canViewFinancials ? "Not applicable" : "Restricted" : formatMoney(record.amount, record.currency)} /></section>
      {record.missingDocuments && <div className="mt-4 flex gap-2 rounded-control border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-text)]"><Paperclip className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Supporting documents are missing.</strong><div className="mt-0.5 text-xs">Add the required quotation, receipt, or evidence before final review.</div></div></div>}
      <Section title="Justification"><p className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{record.description}</p>{record.notesToApprover && <div className="mt-3 rounded-control bg-[var(--color-surface-muted)] p-3 text-sm"><strong>Note to approver:</strong> {record.notesToApprover}</div>}</Section>
      {record.project && <Section title="Related records"><div className="text-sm"><strong>Project:</strong> {record.project}</div></Section>}
      <Section title={definition?.label ?? "Request details"}><dl className="grid gap-3 sm:grid-cols-2">{Object.entries(record.details).map(([key, value]) => <div key={key} className={`rounded-control border p-3 ${/original/i.test(key) ? "border-[var(--color-border)] bg-[var(--color-surface-muted)]" : /requested/i.test(key) ? "border-[var(--color-kahel-300)] bg-[var(--color-kahel-100)]" : "border-[var(--color-border)]"}`}><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{fieldLabel(definition?.fields, key)}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{displayDetail(value)}</dd></div>)}</dl>{liquidation && <div className="mt-4 grid grid-cols-2 gap-3"><Meta label="Remaining to return" value={formatMoney(liquidation.remainingToReturn * 100, "PHP")} /><Meta label="Excess eligible" value={formatMoney(liquidation.excessEligibleForReimbursement * 100, "PHP")} /></div>}</Section>
      <Section title="Supporting files"><div className="space-y-2">{record.attachments.map((attachment) => <a key={attachment.id} href={`/api/approvals/${record.id}/attachments/${attachment.id}`} className="flex min-h-11 items-center gap-3 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:border-[var(--color-kahel-400)]"><Paperclip className="h-4 w-4 shrink-0 text-[#FF5300]" /><span className="min-w-0 flex-1 truncate">{attachment.filename}</span><Download className="h-4 w-4 shrink-0" /></a>)}</div><div className="mt-3"><ApprovalAttachmentUploader approvalId={record.id} disabled={completedStatuses.has(record.status)} onComplete={onRefresh} /></div></Section>
      <Section title="Approval route"><ol className="space-y-3">{record.steps.map((step) => <li key={step.id} className="flex gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${step.status === "approved" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : step.status === "pending" ? "bg-[var(--color-kahel-100)] text-[#FF5300]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"}`}>{step.status === "approved" ? <Check className="h-3.5 w-3.5" /> : step.stepNumber}</span><div className="min-w-0"><div className="text-sm font-semibold">{step.approverName ?? roleLabel(step.approverRole)} · {capitalize(step.status)}</div><div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{step.actedAt ? `${step.actedByName ?? "Staff"} · ${fullDate(step.actedAt)}` : step.dueAt ? `Due ${fullDate(step.dueAt)}` : "Waiting"}</div>{step.comment && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{step.comment}</p>}</div></li>)}</ol></Section>
      {record.financialEvents.length > 0 && <Section title="Release and payment history"><div className="space-y-3">{record.financialEvents.map((event) => <div key={event.id} className="rounded-control border border-[var(--color-border)] p-3 text-sm"><div className="flex justify-between gap-3"><strong className="capitalize">{event.type}</strong><strong>{formatMoney(event.amount, record.currency)}</strong></div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">{event.paymentMethod} · {event.transactionReference} · {fullDate(event.occurredAt)}</div></div>)}</div></Section>}
      <Section title="Comments"><div className="space-y-3">{record.comments.length ? record.comments.map((item) => <div key={item.id} className="rounded-control bg-[var(--color-surface-muted)] p-3"><div className="text-xs font-semibold">{item.author} <span className="font-normal text-[var(--color-text-muted)]">· {fullDate(item.createdAt)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p></div>) : <p className="text-sm text-[var(--color-text-muted)]">No comments yet.</p>}<form onSubmit={addComment} className="flex gap-2"><input required maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" className="h-11 min-w-0 flex-1 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm outline-none focus:border-[#FF5300]" /><button disabled={commentPending} className="grid h-11 w-11 place-items-center rounded-control bg-[#FF5300] text-white disabled:opacity-50" aria-label="Add comment"><Send className="h-4 w-4" /></button></form></div></Section>
      <Section title="Activity"><ol className="space-y-3 border-l border-[var(--color-border)] pl-4">{record.activity.map((item) => <li key={item.id}><div className="text-sm font-semibold">{actionLabel(item.action)}</div><div className="text-xs text-[var(--color-text-muted)]">{item.actor} · {fullDate(item.createdAt)}</div>{item.comment && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.comment}</p>}</li>)}</ol></Section>
    </div>
    <footer className="flex flex-wrap gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link href={record.sourceHref} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold"><ExternalLink className="h-4 w-4" /> Open Source Record</Link>
      {record.canDecide && <><button onClick={() => onDecision("approve")} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Approve</button><button onClick={() => onDecision("return")} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Return</button><button onClick={() => onDecision("reject")} className="min-h-11 rounded-control border border-[var(--color-danger-border)] px-3 text-sm font-semibold text-[var(--color-danger-text)]">Reject</button><button onClick={() => onDecision("request_document")} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Request Document</button><button onClick={() => onAssignment("delegate")} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Delegate</button></>}
      {record.canWithdraw && <>{record.status === "draft" && <button onClick={() => onDecision("submit")} className="min-h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">Submit</button>}{record.status === "returned_for_changes" && <button onClick={() => onDecision("resubmit")} className="min-h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">Resubmit</button>}<button onClick={() => onDecision("withdraw")} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Withdraw</button></>}
      {record.requesterId === dashboard.userId && ["draft", "returned_for_changes"].includes(record.status) && <button onClick={onEdit} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">{record.status === "draft" ? "Edit Draft" : "Respond to Changes"}</button>}
      <button onClick={onDuplicate} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Duplicate</button>
      {record.canFulfill && record.requestType === "cash_advance" && ["not_released", "partially_released", "released"].includes(record.fulfillmentStatus ?? "") && <button onClick={() => onFulfillment("release")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-kahel-500)] px-3 text-sm font-semibold text-[#FF5300]"><Banknote className="h-4 w-4" /> Record Release</button>}
      {record.canFulfill && record.requestType === "cash_advance" && record.fulfillmentStatus === "liquidation_submitted" && <><button onClick={() => onFulfillment("balance_return")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-kahel-500)] px-3 text-sm font-semibold text-[#FF5300]">Record Balance Return</button><button onClick={() => onFulfillment("reimbursement")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-kahel-500)] px-3 text-sm font-semibold text-[#FF5300]">Record Reimbursement</button></>}
      {record.canFulfill && record.requestType !== "cash_advance" && record.requestType !== "cash_advance_liquidation" && record.fulfillmentStatus !== "paid" && <button onClick={() => onFulfillment("payment")} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-kahel-500)] px-3 text-sm font-semibold text-[#FF5300]"><Banknote className="h-4 w-4" /> Record Payment</button>}
      {dashboard.role === "super_admin" && record.status === "pending_approval" && !record.canDecide && <button onClick={() => onDecision("override_approve")} className="min-h-11 rounded-control border border-[var(--color-danger-border)] px-3 text-sm font-semibold text-[var(--color-danger-text)]">Override</button>}
      {dashboard.role === "super_admin" && completedStatuses.has(record.status) && <button onClick={() => onDecision("archive")} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Archive</button>}
    </footer></aside></div>;
}

function CreateDialog({ dashboard, requestType, idempotencyKey, seed, onChoose, onClose, onCreated }: { dashboard: ApprovalDashboard; requestType: string | null; idempotencyKey: string; seed: ApprovalRecord | null; onChoose: (value: string) => void; onClose: () => void; onCreated: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const definition = requestType ? APPROVAL_TYPE_BY_VALUE[requestType] : null;
  const outstandingAdvance = dashboard.records.some((record) => record.requesterId === dashboard.userId && record.requestType === "cash_advance" && ["awaiting_liquidation", "liquidation_submitted"].includes(record.fulfillmentStatus ?? "") && (record.requiredBy ? record.requiredBy < manilaDate() : true));
  useEffect(() => {
    const form = formRef.current;
    if (!form || !seed || !definition) return;
    const values: Record<string, unknown> = { subject: seed.subject, description: seed.description, priority: capitalize(seed.priority), requiredBy: seed.requiredBy ?? "", amount: seed.amount === null ? "" : seed.amount / 100, projectId: seed.projectId ?? "", employeeId: seed.employeeId ?? "", notesToApprover: seed.notesToApprover ?? "", ...seed.details };
    for (const [name, value] of Object.entries(values)) {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = value === true;
      else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) control.value = value === null || value === undefined ? "" : String(value);
    }
  }, [definition, seed]);
  async function submit(form: HTMLFormElement, submitForApproval: boolean) {
    if (!definition) return; setPending(true); setFormError(null);
    const data = new FormData(form);
    const details = Object.fromEntries(definition.fields.map((field) => [field.key, field.type === "checkbox" ? data.get(field.key) === "on" : field.type === "number" && data.get(field.key) ? Number(data.get(field.key)) : String(data.get(field.key) ?? "").trim()]));
    const payload = { idempotencyKey, requestType: definition.value, subject: data.get("subject"), description: data.get("description"), priority: data.get("priority"), requiredBy: data.get("requiredBy"), amount: data.get("amount"), currency: "PHP", projectId: data.get("projectId"), employeeId: data.get("employeeId"), notesToApprover: data.get("notesToApprover"), details, submit: submitForApproval };
    try {
      const response = await fetch("/api/approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to create this request.");
      onCreated(submitForApproval ? "Request submitted for approval." : "Draft saved.");
    } catch (error) { setFormError(error instanceof Error ? error.message : navigator.onLine ? "Unable to create this request." : "Submission was interrupted while offline. Your form remains open."); } finally { setPending(false); }
  }
  return <Modal title={definition ? definition.label : "New Request"} onClose={onClose} wide>{!definition ? <div><p className="text-sm text-[var(--color-text-secondary)]">Choose the approval you need. The workflow and approver are assigned securely when you submit.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{APPROVAL_TYPES.map((item) => <button key={item.value} onClick={() => onChoose(item.value)} className="flex min-h-16 items-center justify-between rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-left hover:border-[var(--color-kahel-400)]"><span><span className="block text-xs font-semibold text-[var(--color-text-muted)]">{item.group}</span><span className="mt-0.5 block text-sm font-semibold">{item.label}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}</div></div> : <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget, true); }} className="space-y-4"><button type="button" onClick={() => onChoose("")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5300]"><ChevronRight className="h-3.5 w-3.5 rotate-180" /> Change request type</button>{definition.value === "cash_advance" && outstandingAdvance && <div className="rounded-control border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-text)]"><strong>Outstanding cash advance</strong><p className="mt-1 text-xs">You have an overdue or unliquidated advance. This warning does not automatically block submission.</p></div>}{formError && <div role="alert" className="rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">{formError}</div>}<Field label="Subject" required><input name="subject" required maxLength={255} className={inputClass} /></Field><Field label="Description or justification" required><textarea name="description" required maxLength={4000} rows={4} className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Priority" required><select name="priority" defaultValue="Normal" className={inputClass}>{APPROVAL_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></Field><Field label="Required-by date"><input name="requiredBy" type="date" className={inputClass} /></Field></div>{definition.financial && <Field label="Amount (PHP)" required><input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></Field>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Related project"><select name="projectId" className={inputClass}><option value="">No project</option>{dashboard.projects.map((project) => <option key={project.id} value={project.id}>{project.reference} · {project.title}</option>)}</select></Field><Field label="Related employee"><select name="employeeId" className={inputClass}><option value="">No employee</option>{dashboard.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.reference} · {employee.name}</option>)}</select></Field></div><div className="border-t border-[var(--color-border)] pt-4"><h3 className="mb-3 text-sm font-semibold">Request details</h3><div className="grid gap-4 sm:grid-cols-2">{definition.fields.map((field) => <DynamicField key={field.key} field={field} />)}</div></div><Field label="Notes to approver"><textarea name="notesToApprover" maxLength={2000} rows={3} className={inputClass} /></Field><div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => formRef.current && void submit(formRef.current, false)} disabled={pending} className="h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Save as Draft</button><button disabled={pending} className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Submitting…" : "Submit for Approval"}</button></div></form>}</Modal>;
}

function EditRequestDialog({ record, onClose, onSaved }: { record: ApprovalRecord; onClose: () => void; onSaved: (message: string) => void }) {
  const definition = APPROVAL_TYPE_BY_VALUE[record.requestType];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  if (!definition) return null;
  async function save(form: HTMLFormElement, submit: boolean) {
    setPending(true); setError(null); const data = new FormData(form);
    const details = Object.fromEntries(definition.fields.map((field) => [field.key, field.type === "checkbox" ? data.get(field.key) === "on" : field.type === "number" && data.get(field.key) ? Number(data.get(field.key)) : String(data.get(field.key) ?? "").trim()]));
    try {
      const response = await fetch(`/api/approvals/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: submit ? "update_submit" : "update", subject: data.get("subject"), description: data.get("description"), priority: data.get("priority"), requiredBy: data.get("requiredBy"), amount: data.get("amount"), notesToApprover: data.get("notesToApprover"), details }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to update this request.");
      onSaved(submit ? "Request updated and submitted." : "Request changes saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update this request."); } finally { setPending(false); }
  }
  return <Modal title={record.status === "draft" ? "Edit Draft" : "Respond to Requested Changes"} onClose={onClose} wide><form ref={formRef} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget, true); }} className="space-y-4">{error && <div role="alert" className="rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">{error}</div>}<Field label="Subject" required><input name="subject" defaultValue={record.subject} required maxLength={255} className={inputClass} /></Field><Field label="Description or justification" required><textarea name="description" defaultValue={record.description} required maxLength={4000} rows={4} className={inputClass} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Priority" required><select name="priority" defaultValue={capitalize(record.priority)} className={inputClass}>{APPROVAL_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Required-by date"><input name="requiredBy" type="date" defaultValue={record.requiredBy ?? ""} className={inputClass} /></Field></div>{definition.financial && <Field label="Amount (PHP)" required><input name="amount" type="number" min="0.01" step="0.01" defaultValue={record.amount === null ? "" : record.amount / 100} className={inputClass} /></Field>}<div className="grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">{definition.fields.map((field) => <EditDynamicField key={field.key} field={field} value={record.details[field.key]} />)}</div><Field label="Notes to approver"><textarea name="notesToApprover" defaultValue={record.notesToApprover ?? ""} rows={3} maxLength={2000} className={inputClass} /></Field><div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={pending} onClick={() => formRef.current && void save(formRef.current, false)} className="h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Save changes</button><button disabled={pending} className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">Save and {record.status === "draft" ? "submit" : "resubmit"}</button></div></form></Modal>;
}

function FilterDialog({ dashboard, params, onApply, onClose }: { dashboard: ApprovalDashboard; params: URLSearchParams; onApply: (changes: Record<string, string | null>) => void; onClose: () => void }) {
  function apply(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const keys = ["type", "status", "fulfillment", "requester", "approver", "project", "source", "priority", "submitted-from", "submitted-to", "required-by", "amount-min", "amount-max", "overdue", "awaiting", "missing-documents"]; onApply(Object.fromEntries(keys.map((key) => [key, String(data.get(key) ?? "") || null]))); }
  return <Modal title="Filter approvals" onClose={onClose}><form onSubmit={apply} className="grid gap-4 sm:grid-cols-2"><FilterSelect name="type" label="Request type" value={params.get("type")} options={APPROVAL_TYPES.map((item) => [item.value, item.label])} /><FilterSelect name="status" label="Status" value={params.get("status")} options={Object.entries(APPROVAL_STATUS_LABELS)} /><FilterSelect name="fulfillment" label="Fulfillment status" value={params.get("fulfillment")} options={["not_released", "partially_released", "released", "awaiting_liquidation", "liquidation_submitted", "liquidated", "awaiting_payment", "paid"].map((item) => [item, titleCase(item)])} /><FilterSelect name="priority" label="Priority" value={params.get("priority")} options={APPROVAL_PRIORITIES.map((item) => [item.toLowerCase(), item])} /><FilterSelect name="requester" label="Requester" value={params.get("requester")} options={dashboard.people.map((person) => [person.id, person.name])} /><FilterSelect name="approver" label="Approver" value={params.get("approver")} options={dashboard.people.map((person) => [person.id, person.name])} /><FilterSelect name="project" label="Project" value={params.get("project")} options={dashboard.projects.map((project) => [project.id, `${project.reference} · ${project.title}`])} /><FilterSelect name="source" label="Source module" value={params.get("source")} options={[...new Set(dashboard.records.map((record) => record.sourceModule))].sort().map((item) => [item, capitalize(item)])} />{[["submitted-from", "Submitted from", "date"], ["submitted-to", "Submitted to", "date"], ["required-by", "Required by", "date"], ["amount-min", "Minimum amount", "number"], ["amount-max", "Maximum amount", "number"]].map(([name, label, type]) => <Field key={name} label={label}><input name={name} type={type} step={type === "number" ? "0.01" : undefined} defaultValue={params.get(name) ?? ""} className={inputClass} /></Field>)}<div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">{[["overdue", "Overdue only"], ["awaiting", "Awaiting me"], ["missing-documents", "Missing documents"]].map(([name, label]) => <label key={name} className="flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm"><input name={name} type="checkbox" value="1" defaultChecked={params.get(name) === "1"} /> {label}</label>)}</div><div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4 sm:col-span-2"><button type="button" onClick={onClose} className="h-11 rounded-control px-4 text-sm font-semibold">Cancel</button><button className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">Apply filters</button></div></form></Modal>;
}

type WorkflowRule = { id: string; name: string; request_type: string; min_amount_php: number | null; max_amount_php: number | null; steps: unknown; bulk_approval_allowed: boolean; bulk_amount_limit_php: number | null; active: boolean };
function WorkflowRulesDialog({ onClose }: { onClose: () => void }) {
  const { fireToast } = useToast();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => { let active = true; fetch("/api/approvals/rules", { cache: "no-store" }).then(async (response) => { const body = await response.json() as { rules?: WorkflowRule[]; error?: string }; if (!response.ok) throw new Error(body.error); return body.rules ?? []; }).then((items) => { if (active) setRules(items); }).catch((error) => fireToast(error instanceof Error ? error.message : "Unable to load workflow rules.", "danger")).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [fireToast]);
  async function save(event: React.FormEvent<HTMLFormElement>, rule: WorkflowRule) { event.preventDefault(); setPendingId(rule.id); const data = new FormData(event.currentTarget); try { const response = await fetch("/api/approvals/rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rule.id, minAmount: data.get("minAmount"), maxAmount: data.get("maxAmount"), bulkAllowed: data.get("bulkAllowed") === "on", bulkLimit: data.get("bulkLimit"), active: data.get("active") === "on" }) }); const body = await response.json().catch(() => ({})) as { rule?: WorkflowRule; error?: string }; if (!response.ok || !body.rule) throw new Error(body.error ?? "Unable to update workflow rule."); setRules((current) => current.map((item) => item.id === rule.id ? body.rule! : item)); fireToast("Workflow rule updated.", "success"); } catch (error) { fireToast(error instanceof Error ? error.message : "Unable to update workflow rule.", "danger"); } finally { setPendingId(null); } }
  return <Modal title="Workflow rules" onClose={onClose} wide><p className="text-sm text-[var(--color-text-secondary)]">Amount thresholds are in Philippine pesos. Approval routes remain database-controlled and all changes are audited.</p>{loading ? <div className="h-40 animate-pulse rounded-card bg-[var(--color-surface-muted)] motion-reduce:animate-none" /> : <div className="space-y-3">{rules.map((rule) => <form key={rule.id} onSubmit={(event) => void save(event, rule)} className="rounded-card border border-[var(--color-border)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{rule.name}</h3><p className="mt-1 text-xs text-[var(--color-text-muted)]">{rule.request_type} · {workflowSteps(rule.steps)}</p></div><label className="flex items-center gap-2 text-xs font-semibold"><input name="active" type="checkbox" defaultChecked={rule.active} /> Active</label></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Field label="Minimum"><input name="minAmount" type="number" min="0" step="0.01" defaultValue={rule.min_amount_php === null ? "" : rule.min_amount_php / 100} className={inputClass} /></Field><Field label="Maximum"><input name="maxAmount" type="number" min="0" step="0.01" defaultValue={rule.max_amount_php === null ? "" : rule.max_amount_php / 100} className={inputClass} /></Field><Field label="Bulk limit"><input name="bulkLimit" type="number" min="0" step="0.01" defaultValue={rule.bulk_amount_limit_php === null ? "" : rule.bulk_amount_limit_php / 100} className={inputClass} /></Field><div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-2 text-xs font-semibold"><input name="bulkAllowed" type="checkbox" defaultChecked={rule.bulk_approval_allowed} /> Allow bulk</label><button disabled={pendingId === rule.id} className="h-11 rounded-control bg-[#FF5300] px-3 text-sm font-semibold text-white disabled:opacity-50">Save</button></div></div></form>)}</div>}</Modal>;
}

function DecisionDialog({ decision, pending, onClose, onConfirm }: { decision: { record: ApprovalRecord; action: DecisionAction }; pending: boolean; onClose: () => void; onConfirm: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  const required = ["reject", "return", "request_document", "withdraw", "override_approve", "override_reject", "archive"].includes(decision.action) && !(decision.action === "withdraw" && decision.record.status === "draft");
  return <Modal title={actionLabel(decision.action)} onClose={onClose}><p className="text-sm text-[var(--color-text-secondary)]">Confirm this action for <strong>{decision.record.reference}</strong>. Approval decisions are recorded permanently in the audit history.</p><Field label={required ? "Reason" : "Approval note (optional)"} required={required}><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={2000} className={inputClass} /></Field><div className="flex justify-end gap-2"><button onClick={onClose} className="h-11 rounded-control px-4 text-sm font-semibold">Cancel</button><button disabled={pending || required && !comment.trim()} onClick={() => onConfirm(comment)} className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Processing…" : "Confirm"}</button></div></Modal>;
}

function FulfillmentDialog({ value, pending, onClose, onConfirm }: { value: { record: ApprovalRecord; action: FulfillmentAction }; pending: boolean; onClose: () => void; onConfirm: (payload: Record<string, unknown>) => void }) {
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); onConfirm({ amount: data.get("amount"), paymentMethod: data.get("paymentMethod"), transactionReference: data.get("transactionReference"), occurredAt: data.get("occurredAt"), comment: data.get("comment") }); }
  return <Modal title={`Record ${capitalize(value.action)}`} onClose={onClose}><div className="rounded-control bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-text)]">Authorization and {value.action} are separate states. Record this only after funds actually moved.</div><form onSubmit={submit} className="mt-4 space-y-4"><Field label="Amount" required><input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></Field><Field label="Payment method" required><input name="paymentMethod" required maxLength={80} className={inputClass} /></Field><Field label="Transaction reference" required><input name="transactionReference" required maxLength={120} className={inputClass} /></Field><Field label="Transaction date and time" required><input name="occurredAt" type="datetime-local" required className={inputClass} /></Field><Field label="Notes"><textarea name="comment" rows={3} maxLength={1000} className={inputClass} /></Field><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-11 rounded-control px-4 text-sm font-semibold">Cancel</button><button disabled={pending} className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">Record {capitalize(value.action)}</button></div></form></Modal>;
}

function AssignmentDialog({ value, people, pending, onClose, onConfirm }: { value: { record: ApprovalRecord; action: "reassign" | "delegate" }; people: ApprovalDashboard["people"]; pending: boolean; onClose: () => void; onConfirm: (targetId: string, comment: string) => void }) {
  const [target, setTarget] = useState(""); const [comment, setComment] = useState("");
  return <Modal title={capitalize(value.action)} onClose={onClose}><Field label="Authorized approver" required><select value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass}><option value="">Choose approver</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {roleLabel(person.role)}</option>)}</select></Field><Field label="Reason" required><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} className={inputClass} /></Field><div className="flex justify-end gap-2"><button onClick={onClose} className="h-11 rounded-control px-4 text-sm font-semibold">Cancel</button><button disabled={pending || !target || !comment.trim()} onClick={() => onConfirm(target, comment)} className="h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm</button></div></Modal>;
}

function Kpi({ label, value, icon, onClick, compact, tone }: { label: string; value: string; icon: React.ReactNode; onClick: () => void; compact?: boolean; tone?: "warning" }) { return <button onClick={onClick} className="group min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[var(--color-kahel-400)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5300] sm:p-4"><div className={`flex h-8 w-8 items-center justify-center rounded-control [&>svg]:h-4 [&>svg]:w-4 ${tone === "warning" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-kahel-100)] text-[#FF5300]"}`}>{icon}</div><div className={`mt-3 truncate font-display font-semibold ${compact ? "text-lg" : "text-2xl"}`}>{value}</div><div className="mt-1 text-[11px] font-medium leading-4 text-[var(--color-text-secondary)] sm:text-xs">{label}</div></button>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><h3 className="mb-3 font-display text-base font-semibold">{title}</h3>{children}</section>; }
function Meta({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</div><div className={`mt-1 truncate text-xs font-semibold sm:text-sm ${danger ? "text-[var(--color-danger-text)]" : ""}`}>{value}</div></div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block text-sm font-semibold"><span className="mb-1.5 block">{label}{required && <span className="text-[#FF5300]"> *</span>}</span>{children}</label>; }
function DynamicField({ field }: { field: ApprovalField }) { if (field.type === "checkbox") return <label className="flex min-h-11 items-start gap-2 rounded-control border border-[var(--color-border)] p-3 text-sm font-medium sm:col-span-2"><input name={field.key} type="checkbox" required={field.required} className="mt-0.5" /> {field.label}</label>; return <Field label={field.label} required={field.required}>{field.type === "textarea" ? <textarea name={field.key} required={field.required} rows={3} maxLength={2000} placeholder={field.placeholder} className={inputClass} /> : <input name={field.key} required={field.required} type={field.type} step={field.type === "number" ? "0.01" : undefined} placeholder={field.placeholder} className={inputClass} />}</Field>; }
function EditDynamicField({ field, value }: { field: ApprovalField; value: unknown }) { if (field.type === "checkbox") return <label className="flex min-h-11 items-start gap-2 rounded-control border border-[var(--color-border)] p-3 text-sm font-medium sm:col-span-2"><input name={field.key} type="checkbox" required={field.required} defaultChecked={value === true} className="mt-0.5" /> {field.label}</label>; return <Field label={field.label} required={field.required}>{field.type === "textarea" ? <textarea name={field.key} required={field.required} rows={3} maxLength={2000} defaultValue={value === null || value === undefined ? "" : String(value)} className={inputClass} /> : <input name={field.key} required={field.required} type={field.type} step={field.type === "number" ? "0.01" : undefined} defaultValue={value === null || value === undefined ? "" : String(value)} className={inputClass} />}</Field>; }
function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string | null; options: string[][] }) { return <Field label={label}><select name={name} defaultValue={value ?? ""} className={inputClass}><option value="">Any</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field>; }
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-50 grid items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={title}><button onClick={onClose} aria-label="Close dialog" className="absolute inset-0 bg-black/45" /><div className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-modal border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:rounded-modal ${wide ? "sm:w-[min(760px,calc(100vw-2rem))]" : "sm:w-[min(520px,calc(100vw-2rem))]"}`}><header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"><h2 className="font-display text-lg font-semibold">{title}</h2><button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-control" aria-label="Close"><X className="h-5 w-5" /></button></header><div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">{children}</div></div></div>; }
function StatusBadge({ value }: { value: string }) { const label = APPROVAL_STATUS_LABELS[value] ?? titleCase(value); const tone = value === "approved" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : value === "rejected" ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" : value === "returned_for_changes" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : value === "pending_approval" || value === "submitted" ? "bg-[var(--color-info-bg)] text-[var(--color-info-text)]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"; return <span className={`inline-flex rounded-pill px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${tone}`}>{label}</span>; }
function FulfillmentBadge({ value }: { value: string | null }) { return value ? <span className="inline-flex rounded-pill border border-[var(--color-border)] px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap">{titleCase(value)}</span> : null; }
function PriorityBadge({ value }: { value: ApprovalRecord["priority"] }) { return <span className={`inline-flex rounded-pill px-2 py-1 text-[10px] font-semibold capitalize ${value === "urgent" ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" : value === "high" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"}`}>{value}</span>; }
function EmptyState({ tab, filtered, onCreate, onClear }: { tab: Tab; filtered: boolean; onCreate: () => void; onClear: () => void }) { const mine = tab === "my-requests"; return <div className="mt-4 grid min-h-72 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-kahel-100)] text-[#FF5300]">{filtered ? <Search className="h-5 w-5" /> : mine ? <FileQuestion className="h-5 w-5" /> : <Check className="h-5 w-5" />}</div><h2 className="mt-4 font-display text-xl font-semibold">{filtered ? "No matching requests" : mine ? "No requests yet" : "You’re all caught up"}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-[var(--color-text-secondary)]">{filtered ? "Try removing a filter or changing your search." : mine ? "Create a request when you need approval for a project change, attendance update, purchase, cash advance, or another studio expense." : "There are no requests waiting for your approval."}</p><button onClick={filtered ? onClear : onCreate} className="mt-5 h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white">{filtered ? "Clear filters" : mine ? "New Request" : "New Request"}</button></div></div>; }
function PageLoading() { return <div className="p-5 sm:p-8" aria-busy="true"><div className="h-9 w-52 animate-pulse rounded bg-[var(--color-surface-muted)] motion-reduce:animate-none" /><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-card bg-[var(--color-surface-muted)] motion-reduce:animate-none" />)}</div><div className="mt-6 h-80 animate-pulse rounded-card bg-[var(--color-surface-muted)] motion-reduce:animate-none" /></div>; }
function PageError({ message, onRetry, pending }: { message: string; onRetry: () => void; pending: boolean }) { return <div className="grid min-h-[70dvh] place-items-center p-6 text-center"><div><ShieldAlert className="mx-auto h-9 w-9 text-[var(--color-danger-text)]" /><h1 className="mt-4 font-display text-2xl font-semibold">Approvals unavailable</h1><p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">{message}</p><button disabled={pending} onClick={onRetry} className="mt-5 h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">Try again</button></div></div>; }

const inputClass = "min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm font-normal outline-none focus:border-[#FF5300] focus:ring-2 focus:ring-[var(--color-kahel-100)]";
function matchesTab(record: ApprovalRecord, tab: Tab, dashboard: ApprovalDashboard) { if (tab === "my-approvals") return record.canDecide; if (tab === "my-requests") return record.requesterId === dashboard.userId; if (tab === "completed") return completedStatuses.has(record.status); return dashboard.role !== "staff"; }
function matchesFilters(record: ApprovalRecord, params: URLSearchParams, search: string) { const view = params.get("view"); const amount = record.amount === null ? null : record.amount / 100; if (search && !`${record.reference} ${record.requestTypeLabel} ${record.subject} ${record.requester} ${record.project ?? ""}`.toLowerCase().includes(search)) return false; if (params.get("type") && record.requestType !== params.get("type")) return false; if (params.get("status") && record.status !== params.get("status")) return false; if (params.get("fulfillment") && record.fulfillmentStatus !== params.get("fulfillment")) return false; if (params.get("requester") && record.requesterId !== params.get("requester")) return false; if (params.get("approver") && !record.steps.some((step) => step.approverId === params.get("approver") || step.actedBy === params.get("approver"))) return false; if (params.get("project") && record.projectId !== params.get("project")) return false; if (params.get("source") && record.sourceModule !== params.get("source")) return false; if (params.get("priority") && record.priority !== params.get("priority")) return false; if (params.get("submitted-from") && (record.submittedAt ?? record.createdAt).slice(0, 10) < params.get("submitted-from")!) return false; if (params.get("submitted-to") && (record.submittedAt ?? record.createdAt).slice(0, 10) > params.get("submitted-to")!) return false; if (params.get("required-by") && record.requiredBy !== params.get("required-by")) return false; if (params.get("amount-min") && (amount === null || amount < Number(params.get("amount-min")))) return false; if (params.get("amount-max") && (amount === null || amount > Number(params.get("amount-max")))) return false; if (params.get("overdue") === "1" && !record.overdue || params.get("awaiting") === "1" && !record.canDecide || params.get("missing-documents") === "1" && !record.missingDocuments) return false; if (view === "pending" && record.status !== "pending_approval" || view === "urgent" && record.priority !== "urgent" || view === "overdue" && !record.overdue || view === "financial" && record.amount === null || view === "projects" && record.group !== "Projects" || view === "attendance" && record.group !== "Attendance" || view === "purchases" && record.group !== "Purchases" || view === "cash-advances" && record.group !== "Cash Advances") return false; return true; }
function clearFilters(router: ReturnType<typeof useRouter>, tab: Tab) { startTransition(() => router.replace(tab === "my-approvals" ? "/approvals" : `/approvals?tab=${tab}`, { scroll: false })); }
function filterLabel(key: string, value: string, dashboard: ApprovalDashboard) { if (key === "type") return APPROVAL_TYPE_BY_VALUE[value]?.label ?? value; if (key === "requester" || key === "approver") return dashboard.people.find((person) => person.id === value)?.name ?? value; if (key === "project") return dashboard.projects.find((project) => project.id === value)?.reference ?? value; return titleCase(value); }
function formatMoney(cents: number, currency: string) { return new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100); }
function shortDate(value: string) { return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value)); }
function fullDate(value: string) { return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)); }
function manilaMonth() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(new Date()); }
function manilaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function capitalize(value: string) { return value ? value[0].toUpperCase() + value.slice(1).replaceAll("_", " ") : value; }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function tabLabel(tab: Tab) { return ({ "my-approvals": "My Approvals", "my-requests": "My Requests", all: "All Requests", completed: "Completed" })[tab]; }
function roleLabel(role?: string | null) { return role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "staff" ? "Staff" : "Unassigned"; }
function actionLabel(action: string) { return titleCase(action === "return" ? "returned_for_changes" : action); }
function actionMessage(action: string) { return action === "approve" ? "Request approved." : action === "reject" ? "Request rejected." : action === "return" || action === "request_document" ? "Request returned for changes." : action === "withdraw" ? "Request withdrawn." : action === "release" ? "Fund release recorded." : action === "payment" ? "Payment recorded." : action === "balance_return" ? "Balance return recorded." : action === "reimbursement" ? "Reimbursement recorded." : action === "submit" || action === "resubmit" ? "Request submitted." : "Request updated."; }
function fieldLabel(fields: ApprovalField[] | undefined, key: string) { return fields?.find((field) => field.key === key)?.label ?? titleCase(key); }
function displayDetail(value: unknown) { if (typeof value === "boolean") return value ? "Yes" : "No"; if (value === null || value === "") return "Not provided"; return String(value); }
function numberDetail(record: ApprovalRecord, key: string) { const value = record.details[key]; return typeof value === "number" ? value : Number(value) || 0; }
function workflowSteps(value: unknown) { if (!Array.isArray(value)) return "Configured route"; return value.map((step) => step && typeof step === "object" && "role" in step ? roleLabel(String(step.role)) : "Approver").join(" → "); }
