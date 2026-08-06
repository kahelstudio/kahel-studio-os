import { getCampaigns } from "@/lib/server/marketing-data";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

const SOURCE_COLORS = [
  "#FF5300",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
];

export default async function MarketingAttributionPage() {
  const campaigns = await getCampaigns();

  const byChannel = new Map<string, { spend: number; bookings: number }>();
  for (const c of campaigns) {
    const ch = byChannel.get(c.channel) ?? { spend: 0, bookings: 0 };
    ch.spend += c.spend;
    ch.bookings += c.bookingsAttributed;
    byChannel.set(c.channel, ch);
  }

  const totalBookings = [...byChannel.values()].reduce((s, v) => s + v.bookings, 0);
  const sources = [...byChannel.entries()]
    .map(([label, v], i) => ({
      label,
      pct: totalBookings > 0 ? Math.round((v.bookings / totalBookings) * 100) : 0,
      val: formatPHP(v.spend),
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Attribution
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Where this month&rsquo;s bookings came from, by first touch
      </p>

      <div className="mt-6 flex flex-col gap-[18px] rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {sources.map((s, i) => (
          <div key={s.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <span
                className="text-sm font-semibold"
                style={{ color: i === 0 ? "var(--color-attention-text)" : "var(--color-text-secondary)" }}
              >
                {s.label}
              </span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                <span className="font-display font-semibold text-[var(--color-text-primary)]">{s.val}</span> ·{" "}
                {s.pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]">
              <div className="h-full rounded-pill" style={{ width: `${Math.max(s.pct, 2)}%`, background: s.color }} />
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="text-sm text-[var(--color-text-muted)]">No campaign data yet.</div>
        )}
      </div>
    </div>
  );
}
