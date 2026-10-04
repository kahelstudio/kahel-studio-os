import Link from "next/link";
import type { ResourceCalendarItem } from "@/lib/server/resource-scheduling";

type Resource = { id: string; code: string; name: string; type: string; typeName: string; active: boolean };
export const RESOURCE_FILTERS: Array<{ id: string; label: string; types: string[] | null }> = [
  { id: "all", label: "All", types: null },
  { id: "studio", label: "Studio", types: ["space"] },
  { id: "photographer", label: "Photographer", types: ["photographer"] },
  { id: "videographer", label: "Videographer", types: ["videographer", "drone_operator"] },
  { id: "equipment", label: "Equipment", types: ["camera", "equipment", "rental_item"] },
];
const START_HOUR = 7; const END_HOUR = 21; const HOURS = END_HOUR - START_HOUR;
const manilaHour = (iso: string) => { const d = new Date(new Date(iso).getTime() + 8 * 3600_000); return d.getUTCHours() + d.getUTCMinutes() / 60; };
const manilaTime = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(11, 16);

export function ResourceSchedule({ date, filter, resourceId, resources, items, prevHref, nextHref, hrefFor }: {
  date: string; filter: string; resourceId: string | null; resources: Resource[]; items: ResourceCalendarItem[];
  prevHref: string; nextHref: string; hrefFor: (patch: { filter?: string; resource?: string | null }) => string;
}) {
  const types = RESOURCE_FILTERS.find((f) => f.id === filter)?.types ?? null;
  const shown = resources.filter((r) => r.active && (types === null || types.includes(r.type)) && (!resourceId || r.id === resourceId));
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return (
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Link href={prevHref} aria-label="Previous day" className="grid h-9 w-9 place-items-center rounded-control border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]">‹</Link>
          <div className="font-display text-[15px] font-semibold">{label}</div>
          <Link href={nextHref} aria-label="Next day" className="grid h-9 w-9 place-items-center rounded-control border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]">›</Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_FILTERS.map((f) => (
            <Link key={f.id} href={hrefFor({ filter: f.id, resource: null })}
              className={`rounded-pill px-3 py-1.5 text-[13px] font-semibold ${f.id === filter && !resourceId ? "bg-[var(--color-kahel-500)] text-white" : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}>{f.label}</Link>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid border-b border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]" style={{ gridTemplateColumns: `200px repeat(${HOURS}, minmax(0,1fr))` }}>
            <div className="px-4 py-2">Resource</div>
            {Array.from({ length: HOURS }, (_, i) => <div key={i} className="border-l border-[var(--color-border)] px-1.5 py-2">{String(START_HOUR + i).padStart(2, "0")}:00</div>)}
          </div>
          {shown.length === 0 && <p className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">No resources of this kind yet. Add them in Settings → Booking resources.</p>}
          {shown.map((resource) => (
            <div key={resource.id} className="grid border-b border-[var(--color-border)] last:border-b-0" style={{ gridTemplateColumns: `200px 1fr` }}>
              <Link href={hrefFor({ resource: resource.id })} className="px-4 py-3 text-sm hover:bg-[var(--color-surface-muted)]">
                <div className="font-semibold text-[var(--color-text-primary)]">{resource.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{resource.typeName}</div>
              </Link>
              <div className="relative h-[58px] border-l border-[var(--color-border)]" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(100% / ${HOURS} - 1px), var(--color-border) calc(100% / ${HOURS} - 1px), var(--color-border) calc(100% / ${HOURS}))` }}>
                {items.filter((item) => item.resourceId === resource.id).map((item) => {
                  const from = Math.max(START_HOUR, manilaHour(item.startsAt)); const to = Math.min(END_HOUR, manilaHour(item.endsAt) || 24);
                  if (to <= from) return null;
                  const style = { left: `${((from - START_HOUR) / HOURS) * 100}%`, width: `${((to - from) / HOURS) * 100}%` };
                  const tone = item.kind === "block" ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-dashed" : item.kind === "hold" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]" : "bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]";
                  const title = item.kind === "block" ? `${item.blockKind === "leave" ? "Leave" : "Blocked"} · ${item.reason}` : item.kind === "hold" ? "Held during checkout" : `${item.service ?? "Booking"}${item.clientName ? ` — ${item.clientName}` : ""}`;
                  const body = (
                    <div className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-control border border-[var(--color-border)] px-2 py-1 text-[11px] leading-4 ${tone}`} style={style} title={`${manilaTime(item.startsAt)}–${manilaTime(item.endsAt)} ${title}`}>
                      <div className="truncate font-semibold">{title}</div>
                      <div className="truncate">{manilaTime(item.startsAt)}–{manilaTime(item.endsAt)}</div>
                    </div>
                  );
                  return item.kind === "booking" && item.reference ? <Link key={item.reservationId} href={`/booking/list/${item.reference}`}>{body}</Link> : <div key={item.kind === "block" ? item.blockId : item.reservationId}>{body}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
