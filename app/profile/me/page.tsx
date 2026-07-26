import { Lock } from "lucide-react";
import {
  PROFILE_GOV,
  PROFILE_INFO,
  PROFILE_META,
  PROFILE_SIZES,
  PROFILE_STATS,
} from "@/lib/sample-data";

function SectionLabel({
  children,
  trailing,
  action,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 mt-9 flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
      <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        {children}
      </span>
      {trailing}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export default function ProfileMePage() {
  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-indigo-100)] font-display text-3xl font-semibold text-[var(--color-indigo-800)]">
          EB
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Eusebio Barrun
          </h1>
          <p className="mt-0.5 text-[15px] text-[var(--color-text-secondary)]">
            Owner · Lead photographer · Quezon City
          </p>
        </div>
        <button className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          Edit profile
        </button>
      </div>

      <div className="mt-7 flex overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_STATS.map((s, i) => (
          <div key={s.label} className="flex-1 px-[22px] py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}>
            <div className="text-[13px] text-[var(--color-text-secondary)]">{s.label}</div>
            <div className="mt-1.5 font-display text-[30px] font-semibold tracking-[-0.02em]">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Contact</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_INFO.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <SectionLabel>Account</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_META.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <SectionLabel
        trailing={
          <span className="rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-success-text)]">
            Complete
          </span>
        }
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Lock className="h-3 w-3" /> Admin-verified
          </span>
        }
      >
        Government information
      </SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_GOV.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm text-[var(--color-text-secondary)]">{r.label}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{r.audit}</div>
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Numbers are masked by default — full values require authorised Admin or Super Admin access. Changes here
        need administrator verification.
      </p>

      <SectionLabel
        action={
          <button className="h-[30px] rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
            Edit sizes
          </button>
        }
      >
        Uniform &amp; clothing sizes
      </SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_SIZES.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Used for uniforms, production clothing and protective equipment. You can update your own sizes anytime.
      </p>
    </div>
  );
}
