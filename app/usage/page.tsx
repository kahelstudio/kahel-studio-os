import { BarChart3, Cloud, Database, Gauge, Mail, Server, Users } from "lucide-react";

const RESOURCE_CARDS = [
  { icon: Cloud, label: "File storage" },
  { icon: Server, label: "Bandwidth" },
  { icon: Mail, label: "Email & SMS" },
  { icon: Users, label: "Team seats" },
  { icon: Database, label: "Database" },
  { icon: BarChart3, label: "Automations" },
];

export default function UsagePage() {
  return (
    <div className="min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <Gauge className="h-3.5 w-3.5 text-[var(--color-kahel-500)]" />
          Platform administration
        </div>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.025em]">Usage</h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Monitor platform resources, storage, activity and service limits.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RESOURCE_CARDS.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--color-text-muted)]" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                {label}
              </span>
            </div>
            <div className="mt-3 font-display text-[23px] font-bold text-[var(--color-text-muted)]">—</div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Not yet connected</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" strokeWidth={1.5} />
        <h2 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Usage analytics not yet connected
        </h2>
        <p className="mx-auto mt-2 max-w-[460px] text-sm text-[var(--color-text-secondary)]">
          Live metrics for storage, bandwidth, email sends, and API usage will appear here once the monitoring
          integration is configured. No data has been collected yet.
        </p>
      </div>
    </div>
  );
}
