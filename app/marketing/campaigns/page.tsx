import { Plus } from "lucide-react";
import { MARKETING_CAMPAIGNS, MARKETING_KPIS } from "@/lib/sample-data";
import { KpiStrip } from "@/components/finance/kpi-strip";

export default function MarketingCampaignsPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Campaigns
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Spend, reach, and the bookings each channel actually drove
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New campaign
        </button>
      </div>

      <KpiStrip kpis={MARKETING_KPIS} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2fr_1.6fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Campaign</div>
          <div>Channel</div>
          <div>Status</div>
          <div className="text-right">Spend</div>
          <div className="text-right">Bookings</div>
        </div>
        {MARKETING_CAMPAIGNS.map((c) => (
          <div
            key={c.name}
            className="grid h-[54px] grid-cols-[2fr_1.6fr_1fr_1fr_1fr] items-center border-b border-[var(--color-ink-100)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="font-semibold">{c.name}</div>
            <div className="text-[var(--color-text-secondary)]">{c.channel}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: c.stBg, color: c.stColor }}
              >
                {c.stLabel}
              </span>
            </div>
            <div className="text-right text-[13px] text-[var(--color-ink-700)]">{c.spend}</div>
            <div className="text-right font-display font-semibold">{c.bookings}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
