export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getCampaigns, getMarketingKpis } from "@/lib/server/marketing-data";
import { KpiStrip } from "@/components/finance/kpi-strip";
import { ActionButton } from "@/components/shared/action-button";

const MKT_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  live: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Live" },
  scheduled: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", label: "Scheduled" },
  ended: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)", label: "Ended" },
};

export default async function MarketingCampaignsPage() {
  const [campaigns, kpis] = await Promise.all([getCampaigns(), getMarketingKpis()]);

  const kpiItems = [
    { label: "Total spend", value: `₱${kpis.totalSpend.toLocaleString()}` },
    { label: "Bookings from campaigns", value: String(kpis.totalBookings) },
    { label: "ROI", value: `${kpis.roi}%` },
    { label: "Active campaigns", value: String(kpis.activeCampaigns) },
  ];

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Campaigns
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Spend, reach, and the bookings each channel actually drove
          </p>
        </div>
        <ActionButton label="New campaign" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New campaign
        </ActionButton>
      </div>

      <KpiStrip kpis={kpiItems} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2fr_1.6fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Campaign</div>
          <div>Channel</div>
          <div>Status</div>
          <div className="text-right">Spend</div>
          <div className="text-right">Bookings</div>
        </div>
        {campaigns.map((c) => {
          const st = MKT_STATUS[c.status] ?? MKT_STATUS.ended;
          return (
            <div
              key={c.id}
              className="grid h-[54px] grid-cols-[2fr_1.6fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-[var(--color-text-secondary)]">{c.channel}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.label}
                </span>
              </div>
              <div className="text-right text-[13px] text-[var(--color-text-primary)]">₱{c.spend.toLocaleString()}</div>
              <div className="text-right font-display font-semibold">{c.bookingsAttributed}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
