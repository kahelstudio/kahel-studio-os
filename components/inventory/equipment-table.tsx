"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EquipmentRow } from "@/lib/server/inventory-data";
import { EquipmentRowActions } from "@/components/inventory/equipment-row-actions";

const PAGE_SIZE = 10;

const INV_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  available: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Available" },
  out: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)", label: "Checked out" },
  maint: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", label: "Maintenance" },
};

export function EquipmentTable({ equipment }: { equipment: EquipmentRow[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(equipment.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = equipment.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mt-[26px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-[var(--color-canvas)]">
            <tr className="h-11 text-left text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
              <Th>ID Tag</Th>
              <Th>Serial</Th>
              <Th>Item</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Location / note</Th>
              <Th><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((item) => {
              const status = INV_STATUS[item.status] ?? INV_STATUS.available;
              const note = item.note ?? item.location ?? "—";
              const noteColor = item.status === "maint" ? "var(--color-danger-text)" : "var(--color-text-secondary)";

              return (
                <tr key={item.id} className="h-[52px] bg-[var(--color-surface)] hover:bg-[var(--color-canvas)]">
                  <Td mono muted title={item.idTag}>{item.idTag}</Td>
                  <Td mono title={item.serial ?? "NA"}>{item.serial ?? "NA"}</Td>
                  <Td strong title={item.name}>{item.name}</Td>
                  <Td muted title={item.category}>{item.category}</Td>
                  <Td>
                    <span className="whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ background: status.bg, color: status.c }}>
                      {status.label}
                    </span>
                  </Td>
                  <Td title={note}><span style={{ color: noteColor }}>{note}</span></Td>
                  <td className="border-b border-[var(--color-border)] px-2">
                    <EquipmentRowActions
                      values={{ id: item.id, idTag: item.idTag, serial: item.serial, name: item.name, category: item.category, status: item.status, location: item.location, note: item.note }}
                      label={`${item.idTag} ${item.name}`}
                    />
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[var(--color-text-secondary)]">No equipment has been added.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {equipment.length > 0 ? (
        <footer className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
          <span className="text-xs text-[var(--color-text-secondary)]">
            Page {currentPage} of {pageCount} · {equipment.length} item{equipment.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Previous page" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Next page" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 font-semibold first:pl-5 last:pr-5">{children}</th>;
}

function Td({ children, mono = false, muted = false, strong = false, title }: { children: React.ReactNode; mono?: boolean; muted?: boolean; strong?: boolean; title?: string }) {
  return (
    <td className={`truncate border-b border-[var(--color-border)] px-4 text-sm first:pl-5 ${mono ? "font-mono text-[13px]" : ""} ${muted ? "text-[var(--color-text-secondary)]" : ""} ${strong ? "font-semibold" : ""}`} title={title}>
      {children}
    </td>
  );
}
