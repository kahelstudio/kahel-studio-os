"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import type { ResourceDirectory } from "@/lib/server/resource-scheduling";

type Resource = ResourceDirectory["resources"][number];
type Requirement = { mode: "fixed" | "any_available"; resourceId: string; resourceType: string; customerSelectable: boolean };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const inputClass = "h-10 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 text-sm focus:border-[var(--color-kahel-500)] focus:outline-none";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60";
const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-indigo-800)] disabled:opacity-60";
const card = "rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/booking-resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
  return result;
}
const manilaInput = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
const toIso = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();

export function ResourceAdmin({ initial }: { initial: ResourceDirectory }) {
  const { fireToast } = useToast();
  const [directory, setDirectory] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.resources[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const selected = directory.resources.find((r) => r.id === selectedId);
  const typeName = useMemo(() => new Map(directory.types.map((t) => [t.code, t.name])), [directory.types]);

  async function reload() {
    const response = await fetch("/api/booking-resources", { cache: "no-store" });
    if (response.ok) setDirectory(await response.json() as ResourceDirectory);
  }
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await action(); await reload(); fireToast(success, "success"); }
    catch (error) { fireToast(error instanceof Error ? error.message : "The change could not be saved.", "danger"); }
    finally { setBusy(false); }
  }

  const grouped = directory.types.map((t) => ({ type: t, resources: directory.resources.filter((r) => r.type === t.code) })).filter((g) => g.resources.length);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        <section className={`${card} overflow-hidden`}>
          <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">Resources</div>
          {grouped.length === 0 && <p className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">No resources yet.</p>}
          {grouped.map((group) => (
            <div key={group.type.code}>
              <div className="bg-[var(--color-surface-muted)] px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{group.type.name}</div>
              {group.resources.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelectedId(r.id)}
                  className={`flex w-full items-center justify-between border-b border-[var(--color-border)] px-5 py-2.5 text-left text-sm last:border-b-0 ${r.id === selectedId ? "bg-[var(--color-kahel-50)] font-semibold" : "hover:bg-[var(--color-surface-muted)]"}`}>
                  <span className={r.active ? "" : "text-[var(--color-text-muted)] line-through"}>{r.name}</span>
                  {r.publicSelectable && <span className="rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-indigo-800)]">Public</span>}
                </button>
              ))}
            </div>
          ))}
        </section>
        <NewResource types={directory.types} staff={directory.staff} busy={busy} onCreate={(input) => run(() => post({ action: "save_resource", ...input }), `${input.name} added`)} />
      </aside>

      <div className="flex flex-col gap-4">
        {selected ? (
          <>
            <ResourceDetails key={`d-${selected.id}`} resource={selected} types={directory.types} staff={directory.staff} busy={busy}
              onSave={(input) => run(() => post({ action: "save_resource", id: selected.id, code: selected.code, ...input }), "Resource saved")} />
            <WeeklyHours key={`h-${selected.id}`} resource={selected} busy={busy} onSave={(hours) => run(() => post({ action: "set_hours", resourceId: selected.id, hours }), "Working hours saved")} />
            <Blocks key={`b-${selected.id}`} resource={selected} busy={busy}
              onAdd={(block) => run(() => post({ action: "add_block", resourceId: selected.id, ...block }), "Block added")}
              onRemove={(blockId) => run(() => post({ action: "remove_block", blockId }), "Block removed")} />
          </>
        ) : <div className={`${card} p-8 text-center text-sm text-[var(--color-text-secondary)]`}>Add a resource to manage its schedule.</div>}
        <ServiceRequirements directory={directory} typeName={typeName} busy={busy}
          onSave={(serviceId, requirements) => run(() => post({ action: "set_requirements", serviceId, requirements }), "Service requirements saved")} />
      </div>
    </div>
  );
}

function NewResource({ types, staff, busy, onCreate }: { types: ResourceDirectory["types"]; staff: ResourceDirectory["staff"]; busy: boolean; onCreate: (input: { name: string; type: string; staffUserId: string | null; publicSelectable: boolean }) => void }) {
  const [name, setName] = useState(""); const [type, setType] = useState("photographer"); const [staffUserId, setStaffUserId] = useState(""); const [publicSelectable, setPublic] = useState(false);
  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 font-display text-[15px] font-semibold">Add resource</div>
      <div className="grid gap-2.5">
        <input className={inputClass} placeholder="Name, e.g. Luiz or FX3" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select>
        <select className={inputClass} value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)}><option value="">Not linked to a staff member</option>{staff.map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publicSelectable} onChange={(e) => setPublic(e.target.checked)} /> Customers may choose this resource by name</label>
        <button type="button" className={primaryButton} disabled={busy || !name.trim()} onClick={() => { onCreate({ name: name.trim(), type, staffUserId: staffUserId || null, publicSelectable }); setName(""); }}><Plus className="h-4 w-4" />Add</button>
      </div>
    </section>
  );
}

function ResourceDetails({ resource, types, staff, busy, onSave }: { resource: Resource; types: ResourceDirectory["types"]; staff: ResourceDirectory["staff"]; busy: boolean; onSave: (input: { name: string; type: string; staffUserId: string | null; publicSelectable: boolean; active: boolean; sortOrder: number }) => void }) {
  const [name, setName] = useState(resource.name); const [type, setType] = useState(resource.type); const [staffUserId, setStaffUserId] = useState(resource.staffUserId ?? "");
  const [publicSelectable, setPublic] = useState(resource.publicSelectable); const [active, setActive] = useState(resource.active); const [sortOrder, setSortOrder] = useState(resource.sortOrder);
  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-center justify-between"><div className="font-display text-xl font-semibold">{resource.name}</div><span className="text-xs text-[var(--color-text-muted)]">{resource.typeName}</span></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[var(--color-text-muted)]">Name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-[var(--color-text-muted)]">Type<select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-[var(--color-text-muted)]">Linked staff member<select className={inputClass} value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)}><option value="">Not linked</option>{staff.map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-[var(--color-text-muted)]">Order (automatic assignment picks lower first)<input type="number" className={inputClass} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={publicSelectable} onChange={(e) => setPublic(e.target.checked)} /> Customers may choose by name</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (bookable)</label>
      </div>
      <button type="button" className={`${primaryButton} mt-4`} disabled={busy || !name.trim()} onClick={() => onSave({ name: name.trim(), type, staffUserId: staffUserId || null, publicSelectable, active, sortOrder })}>Save resource</button>
    </section>
  );
}

function WeeklyHours({ resource, busy, onSave }: { resource: Resource; busy: boolean; onSave: (hours: Array<{ day: number; opens: string; closes: string }>) => void }) {
  const [rows, setRows] = useState(() => DAYS.map((_, i) => { const h = resource.hours.find((x) => x.day === i + 1); return { day: i + 1, working: !!h, opens: h?.opens ?? "09:00", closes: h?.closes ?? "18:00" }; }));
  const update = (day: number, patch: Partial<(typeof rows)[number]>) => setRows((current) => current.map((r) => r.day === day ? { ...r, ...patch } : r));
  return (
    <section className={`${card} p-5`}>
      <div className="mb-1 font-display text-[15px] font-semibold">Weekly working hours</div>
      <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">Times are Asia/Manila. A day without hours is a day off.</p>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.day} className="grid grid-cols-[56px_auto_1fr_1fr] items-center gap-2 text-sm">
            <span className="font-semibold">{DAYS[r.day - 1]}</span>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.working} onChange={(e) => update(r.day, { working: e.target.checked })} />{r.working ? "Working" : "Off"}</label>
            <input type="time" className={inputClass} value={r.opens} disabled={!r.working} onChange={(e) => update(r.day, { opens: e.target.value })} />
            <input type="time" className={inputClass} value={r.closes} disabled={!r.working} onChange={(e) => update(r.day, { closes: e.target.value })} />
          </div>
        ))}
      </div>
      <button type="button" className={`${primaryButton} mt-4`} disabled={busy} onClick={() => onSave(rows.filter((r) => r.working).map(({ day, opens, closes }) => ({ day, opens, closes })))}>Save hours</button>
    </section>
  );
}

function Blocks({ resource, busy, onAdd, onRemove }: { resource: Resource; busy: boolean; onAdd: (block: { startsAt: string; endsAt: string; kind: string; reason: string }) => void; onRemove: (id: string) => void }) {
  const [date, setDate] = useState(""); const [fullDay, setFullDay] = useState(true); const [from, setFrom] = useState("09:00"); const [to, setTo] = useState("13:00");
  const [kind, setKind] = useState("manual"); const [reason, setReason] = useState("");
  return (
    <section className={`${card} p-5`}>
      <div className="mb-1 font-display text-[15px] font-semibold">Leave, time off and manual blocks</div>
      <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">A block can&apos;t overlap an existing booking or hold. &ldquo;Available 13:00–18:00 only&rdquo; = block the hours before 13:00.</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}><option value="manual">Manual block</option><option value="leave">Leave / time off</option><option value="closure">Closure</option><option value="maintenance">Maintenance</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} /> Whole day</label>
        {!fullDay && <div className="flex gap-2"><input type="time" className={`${inputClass} flex-1`} value={from} onChange={(e) => setFrom(e.target.value)} /><input type="time" className={`${inputClass} flex-1`} value={to} onChange={(e) => setTo(e.target.value)} /></div>}
        <input className={`${inputClass} sm:col-span-2`} placeholder="Reason (visible to staff)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button type="button" className={`${secondaryButton} mt-3`} disabled={busy || !date || !reason.trim()} onClick={() => { onAdd({ startsAt: toIso(date, fullDay ? "00:00" : from), endsAt: fullDay ? toIso(date, "23:59") : toIso(date, to), kind, reason: reason.trim() }); setReason(""); }}><Plus className="h-4 w-4" />Add block</button>
      <div className="mt-4 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
        {resource.blocks.length === 0 && <p className="py-3 text-sm text-[var(--color-text-secondary)]">No upcoming blocks.</p>}
        {resource.blocks.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div><div className="font-medium">{manilaInput(b.startsAt)} → {manilaInput(b.endsAt).slice(11)}</div><div className="text-xs text-[var(--color-text-muted)]">{b.kind}{b.externalSource ? ` · from ${b.externalSource}` : ""} · {b.reason}</div></div>
            <button type="button" aria-label="Remove block" disabled={busy} onClick={() => onRemove(b.id)} className="grid h-8 w-8 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceRequirements({ directory, typeName, busy, onSave }: { directory: ResourceDirectory; typeName: Map<string, string>; busy: boolean; onSave: (serviceId: string, requirements: Requirement[]) => void }) {
  const [serviceId, setServiceId] = useState(directory.services[0]?.id ?? "");
  const current = (id: string): Requirement[] => directory.requirements.filter((r) => r.serviceId === id).map((r) => ({ mode: r.mode, resourceId: r.resourceId ?? "", resourceType: r.resourceType ?? "photographer", customerSelectable: r.customerSelectable }));
  const [rows, setRows] = useState<Requirement[]>(() => current(serviceId));
  const choose = (id: string) => { setServiceId(id); setRows(current(id)); };
  const update = (i: number, patch: Partial<Requirement>) => setRows((list) => list.map((r, index) => index === i ? { ...r, ...patch } : r));
  return (
    <section className={`${card} p-5`}>
      <div className="mb-1 font-display text-[15px] font-semibold">Service resource requirements</div>
      <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">The first requirement is the booking&apos;s main resource. A service without requirements keeps its current single-resource behaviour.</p>
      <select className={`${inputClass} w-full`} value={serviceId} onChange={(e) => choose(e.target.value)}>{directory.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}</select>
      <div className="mt-3 grid gap-2">
        {rows.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No requirements: this service uses its default resource only.</p>}
        {rows.map((r, i) => (
          <div key={i} className="grid items-center gap-2 rounded-control border border-[var(--color-border)] p-2.5 text-sm sm:grid-cols-[24px_150px_1fr_auto_auto]">
            <span className="font-semibold text-[var(--color-text-muted)]">{i + 1}</span>
            <select className={inputClass} value={r.mode} onChange={(e) => update(i, { mode: e.target.value as Requirement["mode"] })}><option value="fixed">Specific resource</option><option value="any_available">Any available of type</option></select>
            {r.mode === "fixed"
              ? <select className={inputClass} value={r.resourceId} onChange={(e) => update(i, { resourceId: e.target.value })}><option value="">Choose a resource…</option>{directory.resources.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name} ({typeName.get(x.type) ?? x.type})</option>)}</select>
              : <select className={inputClass} value={r.resourceType} onChange={(e) => update(i, { resourceType: e.target.value })}>{directory.types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select>}
            <label className={`flex items-center gap-1.5 ${r.mode === "fixed" ? "invisible" : ""}`}><input type="checkbox" checked={r.customerSelectable} onChange={(e) => update(i, { customerSelectable: e.target.checked })} />Customer can choose</label>
            <button type="button" aria-label="Remove requirement" onClick={() => setRows((list) => list.filter((_, index) => index !== i))} className="grid h-8 w-8 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-muted)]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={() => setRows((list) => [...list, { mode: "any_available", resourceId: "", resourceType: "photographer", customerSelectable: false }])}><Plus className="h-4 w-4" />Add requirement</button>
        <button type="button" className={primaryButton} disabled={busy || !serviceId || rows.some((r) => r.mode === "fixed" && !r.resourceId)} onClick={() => onSave(serviceId, rows)}>Save requirements</button>
      </div>
    </section>
  );
}
