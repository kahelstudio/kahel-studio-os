"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "time" | "datetime-local" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
};

export type OperationKind = "booking" | "quotation" | "maintenance" | "equipment" | "compliance" | "portfolio" | "campaign" | "expense" | "invoice" | "payroll-run" | "payroll-adjustment" | "candidate" | "onboarding" | "offboarding" | "shift" | "report" | "remittance" | "payroll-correction";

const configs: Record<OperationKind, { title: string; description: string; submit: string; adminOnly?: boolean; permission?: string; fields: Field[] }> = {
  booking: { title: "New booking", description: "Create a studio booking. Existing clients are matched by phone number.", submit: "Create booking", permission: "bookings.manage", fields: [
    { name: "phone", label: "Client phone", type: "tel", required: true, placeholder: "+63 9XX XXX XXXX" }, { name: "clientName", label: "Client name", required: true }, { name: "email", label: "Client email", type: "email", required: true },
    { name: "serviceType", label: "Service", required: true }, { name: "serviceDate", label: "Session date", type: "date", required: true }, { name: "serviceTime", label: "Session time", type: "time", required: true },
    { name: "location", label: "Location", required: true }, { name: "paymentType", label: "Payment", type: "select", options: ["cash", "gcash", "maya", "bank_transfer", "card"], required: true }, { name: "total", label: "Total (PHP)", type: "number", min: "0", step: "0.01", required: true },
  ] },
  quotation: { title: "New quotation", description: "Create a draft client quotation.", submit: "Create quotation", permission: "bookings.manage", fields: [{ name: "clientName", label: "Client", required: true }, { name: "serviceType", label: "Package or service", required: true }, { name: "total", label: "Total (PHP)", type: "number", min: "0", step: "0.01", required: true }, { name: "validUntil", label: "Valid until", type: "date" }, { name: "notes", label: "Notes", type: "textarea" }] },
  maintenance: { title: "New maintenance item", description: "Schedule upkeep or record a repair requirement.", submit: "Create item", fields: [{ name: "task", label: "Task", required: true }, { name: "assetLabel", label: "Asset", required: true }, { name: "maintenanceType", label: "Type", type: "select", options: ["Preventive", "Repair", "Cleaning", "Inspection", "Replace"], required: true }, { name: "assignee", label: "Assigned staff or vendor", required: true }, { name: "nextDue", label: "Next due", type: "date" }, { name: "estimatedCost", label: "Estimated cost (PHP)", type: "number", min: "0", step: "0.01" }, { name: "issue", label: "Issue or notes", type: "textarea" }] },
  equipment: { title: "Add equipment", description: "Register a serialized studio asset.", submit: "Add equipment", fields: [{ name: "serial", label: "Serial number", required: true }, { name: "name", label: "Equipment name", required: true }, { name: "category", label: "Category", required: true }, { name: "status", label: "Status", type: "select", options: ["available", "out", "maint"], required: true }, { name: "location", label: "Location" }, { name: "note", label: "Note", type: "textarea" }] },
  compliance: { title: "New compliance record", description: "Track a permit, renewal, fee, or filing.", submit: "Create record", fields: [{ name: "requirement", label: "Requirement", required: true }, { name: "category", label: "Category", required: true }, { name: "agency", label: "Agency", required: true }, { name: "referenceNumber", label: "Registration or reference no." }, { name: "frequency", label: "Frequency", required: true }, { name: "responsiblePerson", label: "Responsible person", required: true }, { name: "expiresOn", label: "Next due or expiry", type: "date" }, { name: "estimatedCost", label: "Estimated fee" }] },
  portfolio: { title: "Add portfolio work", description: "Create a curated portfolio entry. A consent reference is required.", submit: "Add work", permission: "galleries.publish", fields: [{ name: "slot", label: "Portfolio slot", required: true }, { name: "title", label: "Title", required: true }, { name: "category", label: "Category", required: true }, { name: "consentReference", label: "Consent reference", required: true }, { name: "status", label: "Status", type: "select", options: ["draft", "published"], required: true }] },
  campaign: { title: "New campaign", description: "Create and schedule a marketing campaign.", submit: "Create campaign", fields: [{ name: "name", label: "Campaign name", required: true }, { name: "channel", label: "Channel", required: true }, { name: "spend", label: "Budget or spend (PHP)", type: "number", min: "0", step: "0.01", required: true }, { name: "status", label: "Status", type: "select", options: ["draft", "scheduled", "live"], required: true }, { name: "startsAt", label: "Starts", type: "datetime-local" }, { name: "endsAt", label: "Ends", type: "datetime-local" }] },
  expense: { title: "Record expense", description: "Record money paid out by the studio.", submit: "Record expense", adminOnly: true, fields: [{ name: "category", label: "Category", type: "select", options: ["Maintenance", "Payroll", "Equipment", "Studio", "Supplies", "Utilities", "Other"], required: true }, { name: "description", label: "Description", required: true }, { name: "expenseDate", label: "Date", type: "date", required: true }, { name: "amount", label: "Amount (PHP)", type: "number", min: "0.01", step: "0.01", required: true }] },
  invoice: { title: "Record BIR invoice serial", description: "Record an existing printed invoice. The system does not issue the legal serial.", submit: "Record serial", adminOnly: true, fields: [{ name: "reference", label: "BIR serial", required: true }, { name: "clientName", label: "Client source", required: true }, { name: "total", label: "Amount (PHP)", type: "number", min: "0", step: "0.01", required: true }, { name: "issuedAt", label: "Issued date", type: "date", required: true }, { name: "status", label: "Status", type: "select", options: ["issued", "partially_paid", "paid", "overdue", "void"], required: true }] },
  "payroll-run": { title: "Create pay run", description: "Create a draft payroll cycle for review.", submit: "Create pay run", adminOnly: true, fields: [{ name: "periodLabel", label: "Period label", required: true }, { name: "periodStart", label: "Period start", type: "date", required: true }, { name: "periodEnd", label: "Period end", type: "date", required: true }, { name: "paymentDate", label: "Payment date", type: "date", required: true }, { name: "preparedBy", label: "Prepared by", required: true }] },
  "payroll-adjustment": { title: "New payroll adjustment", description: "Add a one-off earning or deduction for an employee.", submit: "Create adjustment", adminOnly: true, fields: [{ name: "employeeRef", label: "Employee reference", required: true }, { name: "amount", label: "Amount (negative for deduction)", type: "number", step: "0.01", required: true }, { name: "reason", label: "Reason", required: true }, { name: "effectiveDate", label: "Effective date", type: "date", required: true }] },
  candidate: { title: "Add candidate", description: "Add a person to the recruitment pipeline.", submit: "Add candidate", fields: [{ name: "name", label: "Full name", required: true }, { name: "roleApplied", label: "Role applied for", required: true }, { name: "source", label: "Source" }, { name: "stage", label: "Stage", type: "select", options: ["applied", "screening", "interview", "offer"], required: true }, { name: "notes", label: "Notes", type: "textarea" }] },
  onboarding: { title: "Start onboarding", description: "Create the standard onboarding checklist for a new hire.", submit: "Start onboarding", fields: [{ name: "name", label: "New hire name", required: true }, { name: "role", label: "Role", required: true }] },
  offboarding: { title: "Start offboarding", description: "Create the standard exit checklist for a departing team member.", submit: "Start offboarding", fields: [{ name: "name", label: "Team member name", required: true }, { name: "role", label: "Role", required: true }] },
  shift: { title: "New shift", description: "Add a staff shift to the schedule.", submit: "Add shift", fields: [{ name: "name", label: "Staff name", required: true }, { name: "role", label: "Role or assignment", required: true }, { name: "weekStart", label: "Week starting", type: "date", required: true }, { name: "dayOfWeek", label: "Day", type: "select", options: ["0", "1", "2", "3", "4", "5", "6"], required: true }, { name: "timeDescription", label: "Time", placeholder: "9:00 AM - 6:00 PM", required: true }, { name: "location", label: "Location", type: "select", options: ["studio", "location"], required: true }] },
  report: { title: "Create report", description: "Save a report configuration for generation and reuse.", submit: "Create report", adminOnly: true, fields: [{ name: "name", label: "Report name", required: true }, { name: "source", label: "Data source", type: "select", options: ["Finance", "Bookings", "Projects", "Tasks"], required: true }, { name: "period", label: "Period", type: "select", options: ["Last 7 days", "Last 30 days", "This quarter", "This year"], required: true }, { name: "schedule", label: "Delivery schedule", type: "select", options: ["Manual", "Weekly", "Monthly"] }] },
  remittance: { title: "Record remittance", description: "Record statutory contribution remittance totals.", submit: "Record remittance", adminOnly: true, fields: [{ name: "employeeRef", label: "Employee reference", required: true }, { name: "periodLabel", label: "Period", required: true }, { name: "sssAmount", label: "SSS (PHP)", type: "number", min: "0", step: "0.01" }, { name: "philhealthAmount", label: "PhilHealth (PHP)", type: "number", min: "0", step: "0.01" }, { name: "pagibigAmount", label: "Pag-IBIG (PHP)", type: "number", min: "0", step: "0.01" }] },
  "payroll-correction": { title: "Create payroll correction", description: "Record a correcting payroll adjustment with an audit reason.", submit: "Create correction", adminOnly: true, fields: [{ name: "employeeRef", label: "Employee reference", required: true }, { name: "amount", label: "Correction amount", type: "number", step: "0.01", required: true }, { name: "reason", label: "Correction reason", required: true }, { name: "effectiveDate", label: "Effective date", type: "date", required: true }] },
};

export function OperationCreateButton({ kind, children, className, defaults = {}, autoOpen = false }: { kind: OperationKind; children: React.ReactNode; className?: string; defaults?: Record<string, string>; autoOpen?: boolean }) {
  const config = configs[kind];
  const router = useRouter();
  const { fireToast } = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(!config.adminOnly && !config.permission);

  useEffect(() => {
    if (!config.adminOnly && !config.permission) return;
    fetch("/api/staff/me").then(async (response) => response.ok ? await response.json() as { role?: string; permissions?: string[] } : null).then((data) => setAllowed(config.adminOnly ? data?.role === "admin" || data?.role === "super_admin" : Boolean(config.permission && data?.permissions?.includes(config.permission)))).catch(() => setAllowed(false));
  }, [config.adminOnly, config.permission]);
  useEffect(() => {
    if (allowed && (autoOpen || new URLSearchParams(window.location.search).get("create") === kind)) dialog.current?.showModal();
  }, [allowed, autoOpen, kind]);

  if (!allowed) return null;
  const close = () => { if (!pending) { dialog.current?.close(); setError(""); } };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/operations/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...defaults, ...body }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save this record.");
      dialog.current?.close();
      (event.target as HTMLFormElement).reset();
      fireToast(`${config.title} saved.`, "success");
      window.dispatchEvent(new CustomEvent("operation-created", { detail: { kind } }));
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this record."); }
    finally { setPending(false); }
  }

  return <>
    <button type="button" className={className} onClick={() => dialog.current?.showModal()}>{children}</button>
    <dialog ref={dialog} onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setError("")} className="m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text-primary)] shadow-[var(--shadow-dialog)] backdrop:bg-black/45">
      <form onSubmit={submit} className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-xl font-semibold">{config.title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{config.description}</p></div><button type="button" onClick={close} aria-label="Close" className="grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)]"><X className="h-4 w-4" /></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{config.fields.map((field, index) => <label key={field.name} className={`grid gap-1.5 text-sm font-semibold ${field.type === "textarea" ? "sm:col-span-2" : ""}`}><span>{field.label}{field.required ? <span aria-hidden="true" className="text-[var(--color-danger-text)]"> *</span> : null}</span>{field.type === "textarea" ? <textarea name={field.name} defaultValue={defaults[field.name]} required={field.required} rows={3} maxLength={1000} className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-normal" /> : field.type === "select" ? <select name={field.name} defaultValue={defaults[field.name] ?? field.options?.[0]} required={field.required} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal">{field.options?.map((option) => <option key={option} value={option}>{kind === "shift" && field.name === "dayOfWeek" ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(option)] : option.replaceAll("_", " ")}</option>)}</select> : <input autoFocus={index === 0} name={field.name} defaultValue={defaults[field.name]} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} min={field.min} max={field.max} step={field.step} maxLength={500} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />}</label>)}</div>
        {error ? <p className="mt-4 rounded-control bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger-text)]" role="alert">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={pending} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{pending ? "Saving..." : config.submit}</button></div>
      </form>
    </dialog>
  </>;
}
