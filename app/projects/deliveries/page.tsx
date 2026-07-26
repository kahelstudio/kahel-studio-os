import { Globe } from "lucide-react";

export default function ProjectsDeliveriesPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Delivery
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Presigned R2 links, expiring 30 days after delivery
      </p>

      <div className="mt-6 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
        <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]">
          <Globe className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="font-display text-lg font-semibold text-[var(--color-text-secondary)]">
          No galleries awaiting delivery
        </div>
        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Finish a project in review and it lands here to send.
        </div>
      </div>
    </div>
  );
}
