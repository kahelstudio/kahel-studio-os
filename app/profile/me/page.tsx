import { Lock } from "lucide-react";
import {
  EMERGENCY_CONTACTS,
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
  const primary = EMERGENCY_CONTACTS.find((c) => c.primary) ?? EMERGENCY_CONTACTS[0];

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-indigo-100)] font-display text-3xl font-semibold text-[var(--color-indigo-800)]">
          EB
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
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
          <div key={s.label} className="flex-1 px-[22px] py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-ink-100)" }}>
            <div className="text-[13px] text-[var(--color-text-secondary)]">{s.label}</div>
            <div className="mt-1.5 font-display text-[30px] font-semibold tracking-[-0.02em]">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Contact</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_INFO.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <SectionLabel>Account</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_META.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="font-mono text-sm font-semibold">{r.value}</span>
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
          <div key={r.label} className="flex items-center justify-between gap-4 border-b border-[var(--color-ink-100)] px-5 py-[15px] last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm text-[var(--color-text-secondary)]">{r.label}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-ink-300)]">{r.audit}</div>
            </div>
            <span className="font-mono text-sm font-semibold text-[#4A453F]">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Numbers are masked by default — full values require authorised Admin or Super Admin access. Changes here
        need administrator verification.
      </p>

      <SectionLabel
        action={
          <button className="h-[30px] rounded-control border border-[var(--color-ink-300)] px-3 text-xs font-semibold text-[#4A453F] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
            Edit sizes
          </button>
        }
      >
        Uniform &amp; clothing sizes
      </SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PROFILE_SIZES.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Used for uniforms, production clothing and protective equipment. You can update your own sizes anytime.
      </p>

      <SectionLabel
        trailing={
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Lock className="h-3 w-3" /> Confidential
          </span>
        }
        action={
          <button className="h-[30px] rounded-control border border-[var(--color-ink-300)] px-3 text-xs font-semibold text-[#4A453F] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
            Add contact
          </button>
        }
      >
        Emergency contact
      </SectionLabel>
      <div className="mb-3.5 flex items-center gap-3 rounded-card border border-[#F5C9B0] bg-[var(--color-kahel-50)] px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-kahel-700)]">
            Primary emergency contact
          </div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {primary.name} · {primary.rel}
          </div>
          <div className="font-mono text-[13px] text-[var(--color-text-secondary)]">{primary.phone}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {EMERGENCY_CONTACTS.map((c) => (
          <div key={c.name} className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-ink-100)] px-[18px] py-3.5">
              <span className="font-display text-[15px] font-semibold">{c.name}</span>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: c.badgeBg, color: c.badgeColor }}
              >
                {c.badgeL}
              </span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">{c.rel}</span>
              <div className="ml-auto flex gap-1.5">
                {["Call", "Message", "Email"].map((a) => (
                  <button key={a} className="h-[30px] rounded-control border border-[var(--color-ink-300)] px-3 text-xs font-semibold text-[#4A453F] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2">
              <Field label="Primary phone" value={c.phone} border />
              <Field label="Alternative phone" value={c.alt} />
              <Field label="Email" value={c.email} border />
              <Field label="Last verified" value={c.verified} />
              <Field label="Home address" value={c.address} border />
              <Field label="Notes" value={c.notes} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Confidential — never shown in staff lists or search. Visible to authorised Admin &amp; Super Admin when
        operationally necessary; all changes are audit-logged.
      </p>
    </div>
  );
}

function Field({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`border-b border-[var(--color-ink-50)] px-[18px] py-3 ${border ? "border-r" : ""}`}>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold">{value}</div>
    </div>
  );
}
