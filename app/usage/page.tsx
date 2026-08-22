import { BarChart3, Cloud, Database, Gauge, Mail, Server, Users } from "lucide-react";
import { getUsageMetrics } from "@/lib/server/usage-data";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("en-PH");
const bytes = new Intl.NumberFormat("en-PH", { style: "unit", unit: "megabyte", maximumFractionDigits: 1 });

export default async function UsagePage() {
  const usage = await getUsageMetrics();
  const resources = usage ? [
    { icon: Cloud, label: "Media storage", value: bytes.format(usage.mediaBytes / 1_000_000), detail: `${number.format(usage.mediaAssets)} tracked assets` },
    { icon: Server, label: "Bandwidth", value: "Managed", detail: "Cloudflare edge delivery" },
    { icon: Mail, label: "Transactional email", value: number.format(usage.emailsSent), detail: usage.emailsFailed ? `${number.format(usage.emailsFailed)} failed deliveries` : "No failed outbox deliveries" },
    { icon: Users, label: "Team seats", value: number.format(usage.activeSeats), detail: `${number.format(usage.totalSeats)} configured seats` },
    { icon: Database, label: "Core records", value: number.format(usage.databaseRecords), detail: "Customers, bookings and projects" },
    { icon: BarChart3, label: "Queued automations", value: number.format(usage.queuedAutomations), detail: "Email outbox jobs awaiting completion" },
  ] : [];
  return (
    <div className="app-page min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
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
        {resources.map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--color-text-muted)]" strokeWidth={1.75} />
              <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                {label}
              </span>
            </div>
            <div className="mt-3 font-display text-[23px] font-bold text-[var(--color-text-primary)]">{value}</div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{detail}</p>
          </div>
        ))}
      </div>

      {!usage && <div className="mt-8 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" strokeWidth={1.5} />
        <h2 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Usage metrics are temporarily unavailable
        </h2>
        <p className="mx-auto mt-2 max-w-[460px] text-sm text-[var(--color-text-secondary)]">
          Workspace metrics could not be loaded. Refresh the page to try again.
        </p>
      </div>}
    </div>
  );
}
