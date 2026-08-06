export const dynamic = "force-dynamic";

import { Lock } from "lucide-react";
import { getMyProfile } from "@/lib/server/profile-data";

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function GovRow({ label, value, audit }: { label: string; value: string; audit: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{audit}</div>
      </div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

export default async function ProfileMePage() {
  const profile = await getMyProfile();

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Unable to load profile.
      </div>
    );
  }

  const adminRoleLabel =
    profile.adminRole === "super_admin"
      ? "Super admin"
      : profile.adminRole === "admin"
        ? "Admin"
        : "Staff";

  const govComplete = !!(profile.gov.sss || profile.gov.tin || profile.gov.philhealth || profile.gov.pagibig);

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-indigo-100)] font-display text-3xl font-semibold text-[var(--color-indigo-800)]">
          {profile.initials}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            {profile.displayName}
          </h1>
          <p className="mt-0.5 text-[15px] text-[var(--color-text-secondary)]">
            {profile.jobTitle} · {adminRoleLabel}
          </p>
        </div>
        <button className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          Edit profile
        </button>
      </div>

      <SectionLabel>Contact</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Row label="Full name" value={profile.displayName} />
        <Row label="Email" value={profile.email} />
      </div>

      <SectionLabel>Account</SectionLabel>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Row label="Role" value={`${profile.jobTitle} · ${adminRoleLabel}`} />
        {profile.hiredAt && <Row label="Member since" value={profile.hiredAt} />}
        {profile.employeeRef && <Row label="Employee ID" value={profile.employeeRef} />}
        <Row label="User ID" value={profile.userId.slice(0, 8).toUpperCase()} />
      </div>

      <SectionLabel
        trailing={
          govComplete ? (
            <span className="rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-success-text)]">
              Complete
            </span>
          ) : (
            <span className="rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              Incomplete
            </span>
          )
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
        <GovRow label="SSS number" value={profile.gov.sss ?? "—"} audit="Linked from payroll record" />
        <GovRow label="TIN" value={profile.gov.tin ?? "—"} audit="Linked from payroll record" />
        <GovRow label="PhilHealth number" value={profile.gov.philhealth ?? "—"} audit="Linked from payroll record" />
        <GovRow label="Pag-IBIG MID number" value={profile.gov.pagibig ?? "—"} audit="Linked from payroll record" />
        {profile.employeeRef && <GovRow label="Employee ID" value={profile.employeeRef} audit="System-assigned" />}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Numbers are masked by default — full values require authorised Admin or Super Admin access. Changes here
        need administrator verification.
      </p>
    </div>
  );
}
