import { NextResponse } from "next/server";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizePhilippinePhone } from "@/lib/operation-rules";

export const runtime = "nodejs";

const supported = new Set(["booking", "quotation", "maintenance", "equipment", "compliance", "portfolio", "campaign", "expense", "invoice", "payroll-run", "payroll-adjustment", "candidate", "onboarding", "offboarding", "shift", "report", "remittance", "payroll-correction"]);
const financial = new Set(["expense", "invoice", "payroll-run", "payroll-adjustment", "report", "remittance", "payroll-correction"]);
const bookingOperations = new Set(["booking", "quotation"]);

type Body = Record<string, unknown>;
const text = (body: Body, key: string, max = 500) => typeof body[key] === "string" ? body[key].trim().replace(/\s+/g, " ").slice(0, max) : "";
const optional = (body: Body, key: string, max = 1000) => text(body, key, max) || null;
const amount = (body: Body, key: string) => Number(body[key]);
const date = (body: Body, key: string) => {
  const value = text(body, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
};
const dateTime = (body: Body, key: string) => {
  const value = text(body, key);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const initials = (name: string) => name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 4).toUpperCase();
const random = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

async function audit(principal: StaffPrincipal, kind: string, id: string) {
  await getSupabaseAdmin().from("staff_audit_log").insert({ actor_id: principal.userId, actor_name: principal.email, event: `Created ${kind.replaceAll("-", " ")}`, event_type: financial.has(kind) ? "billing" : "data", entity_type: kind, entity_id: id });
}

async function employeeId(reference: string) {
  const result = await getSupabaseAdmin().from("payroll_employees").select("id").eq("employee_ref", reference).maybeSingle();
  return result.data?.id ?? null;
}

async function createBooking(body: Body, principal: StaffPrincipal) {
  type BookingProfile = { id: string; client_id: string; mobile: string | null; email: string };
  const admin = getSupabaseAdmin();
  const phone = normalizePhilippinePhone(text(body, "phone", 32));
  const clientName = text(body, "clientName", 255);
  const email = text(body, "email", 320).toLowerCase();
  const serviceType = text(body, "serviceType", 255);
  const serviceDate = date(body, "serviceDate");
  const serviceTime = text(body, "serviceTime", 8);
  const location = text(body, "location", 255);
  const paymentType = text(body, "paymentType", 32);
  const total = amount(body, "total");
  if (!phone) return bad("Enter a valid client phone number.");
  if (clientName.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter the client name and a valid email address.");
  if (!serviceType || !serviceDate || !/^\d{2}:[0-5]\d$/.test(serviceTime) || Number(serviceTime.slice(0, 2)) > 23 || !location || !["cash", "gcash", "maya", "bank_transfer", "card"].includes(paymentType)) return bad("Complete the service date, time, location, and valid payment method.");
  if (!Number.isFinite(total) || total < 0) return bad("Enter a valid booking total.");

  const profiles = await admin.from("client_profiles").select("id,client_id,mobile,email").not("mobile", "is", null);
  const phoneMatches = (profiles.data as BookingProfile[] | null)?.filter((item) => normalizePhilippinePhone(item.mobile ?? "") === phone) ?? [];
  if (phoneMatches.length > 1) return NextResponse.json({ error: "More than one client uses that phone number. Resolve the duplicate client records first." }, { status: 409 });
  let profile: BookingProfile | undefined = phoneMatches[0];
  if (profile && profile.email.trim().toLowerCase() !== email) return NextResponse.json({ error: "That phone number belongs to a client with a different email address." }, { status: 409 });
  if (!profile) {
    const emailProfile = await admin.from("client_profiles").select("id,client_id,mobile,email").eq("normalized_email", email).maybeSingle();
    if (emailProfile.data) {
      if (normalizePhilippinePhone(emailProfile.data.mobile ?? "") !== phone) return NextResponse.json({ error: "That email belongs to a client with a different phone number." }, { status: 409 });
      profile = emailProfile.data as BookingProfile;
    }
  }
  let createdClientId: string | null = null;
  let createdProfileId: string | null = null;
  async function cleanupCreatedClient() {
    if (!createdClientId) return;
    await admin.from("clients").update({ primary_contact_profile_id: null }).eq("id", createdClientId);
    if (createdProfileId) await admin.from("client_profiles").delete().eq("id", createdProfileId);
    await admin.from("clients").delete().eq("id", createdClientId);
  }
  if (!profile) {
    const names = clientName.split(" ");
    const client = await admin.from("clients").insert({ name: clientName, status: "active", account_type: "consumer", external_ref: `cus-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}` }).select("id").single();
    if (client.error || !client.data) return NextResponse.json({ error: "Unable to create the client." }, { status: 500 });
    createdClientId = client.data.id;
    const createdProfile = await admin.from("client_profiles").insert({ client_id: client.data.id, email, first_name: names[0], last_name: names.slice(1).join(" ") || "-", mobile: phone, status: "active" }).select("id,client_id,mobile,email").single();
    if (createdProfile.error || !createdProfile.data) { await admin.from("clients").delete().eq("id", client.data.id); return NextResponse.json({ error: createdProfile.error?.code === "23505" ? "A client with that phone or email already exists." : "Unable to create the client contact." }, { status: createdProfile.error?.code === "23505" ? 409 : 500 }); }
    profile = createdProfile.data as BookingProfile;
    createdProfileId = profile.id;
    const linked = await admin.from("clients").update({ primary_contact_profile_id: profile.id }).eq("id", profile.client_id);
    if (linked.error) { await cleanupCreatedClient(); return NextResponse.json({ error: "Unable to securely finish creating the client." }, { status: 500 }); }
  }
  const service = await admin.from("services").select("id,name").eq("active", true).ilike("name", serviceType).maybeSingle();
  const selectedService = service.data;
  if (!selectedService) { await cleanupCreatedClient(); return NextResponse.json({ error: "Choose a configured active booking service." }, { status: 400 }); }
  const cents = Math.round(total * 100);
  const reference = random("KS");
  const idempotency = crypto.randomUUID();
  const fingerprintBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${serviceDate}:${serviceTime}:${selectedService.id}:${idempotency}`));
  const fingerprint = [...new Uint8Array(fingerprintBytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const booking = await admin.from("bookings").insert({ client_id: profile.client_id, client_profile_id: profile.id, idempotency_key: idempotency, request_fingerprint: fingerprint, reference, service_type: selectedService.name, service_id: selectedService.id, service_date: serviceDate, service_time: serviceTime, location, payment_type: paymentType, currency: "PHP", subtotal_amount_php: cents, total_amount_php: cents, paid_amount_php: 0, refunded_amount_php: 0, status: "inquiry", payment_status: "unpaid", attendance: "expected", kind: "standard" }).select("id,reference").single();
  if (booking.error || !booking.data) { await cleanupCreatedClient(); return NextResponse.json({ error: "Unable to create the booking." }, { status: 500 }); }
  await audit(principal, "booking", booking.data.id);
  return NextResponse.json(booking.data, { status: 201 });
}

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { kind } = await context.params;
  if (kind !== "report") return NextResponse.json({ error: "Unsupported operation." }, { status: 404 });
  if (principal.role === "staff") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const result = await getSupabaseAdmin().from("saved_reports").select("id,name,source,period,schedule,created_at").order("created_at", { ascending: false });
  if (result.error) return NextResponse.json({ error: "Unable to load reports." }, { status: 500 });
  return NextResponse.json({ reports: result.data ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ kind: string }> }) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { kind } = await context.params;
  if (!supported.has(kind)) return NextResponse.json({ error: "Unsupported create operation." }, { status: 404 });
  if (bookingOperations.has(kind) && !principal.permissions.includes("bookings.manage")) return NextResponse.json({ error: "Booking management permission is required." }, { status: 403 });
  if (kind === "portfolio" && !principal.permissions.includes("galleries.publish")) return NextResponse.json({ error: "Gallery publishing permission is required." }, { status: 403 });
  if (financial.has(kind) && principal.role === "staff") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 32_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  const body = await request.json().catch(() => null) as Body | null;
  if (!body || Array.isArray(body)) return bad("Invalid request body.");
  if (kind === "booking") return createBooking(body, principal);
  const admin = getSupabaseAdmin();
  let result: { data: { id: string } | null; error: { code?: string } | null };

  switch (kind) {
    case "quotation": {
      const serviceType = text(body, "serviceType", 255), total = amount(body, "total");
      if (!text(body, "clientName") || !serviceType || !Number.isFinite(total) || total < 0) return bad("Enter a client, service, and valid total.");
      const client = await admin.from("clients").select("id").ilike("name", text(body, "clientName")).maybeSingle();
      result = await admin.from("quotations").insert({ reference: random("QT"), client_id: client.data?.id ?? null, service_type: serviceType, total, valid_until: date(body, "validUntil") || null, notes: optional(body, "notes"), status: "draft", created_by: principal.userId }).select("id").single(); break;
    }
    case "maintenance": {
      if (!text(body, "task") || !text(body, "assetLabel") || !text(body, "assignee") || !["Preventive", "Repair", "Cleaning", "Inspection", "Replace"].includes(text(body, "maintenanceType"))) return bad("Complete the task, asset, assignee, and valid maintenance type.");
      result = await admin.from("maintenance_records").insert({ task: text(body, "task"), asset_label: text(body, "assetLabel", 128), maintenance_type: text(body, "maintenanceType"), assignee: text(body, "assignee", 255), next_due: date(body, "nextDue") || null, estimated_cost: Number.isFinite(amount(body, "estimatedCost")) ? amount(body, "estimatedCost") : null, issue: optional(body, "issue"), status: text(body, "status") === "completed" ? "completed" : "reported" }).select("id").single(); break;
    }
    case "equipment": {
      if (!text(body, "serial") || !text(body, "name") || !text(body, "category") || !["available", "out", "maint"].includes(text(body, "status"))) return bad("Complete the serial, name, category, and valid status fields.");
      result = await admin.from("equipment").insert({ serial: text(body, "serial", 64), name: text(body, "name", 255), category: text(body, "category", 64), status: text(body, "status"), location: optional(body, "location", 255), note: optional(body, "note") }).select("id").single(); break;
    }
    case "compliance": {
      if (!["requirement", "category", "agency", "frequency", "responsiblePerson"].every((key) => text(body, key))) return bad("Complete all required compliance fields.");
      result = await admin.from("compliance_records").insert({ requirement: text(body, "requirement"), category: text(body, "category", 64), agency: text(body, "agency", 255), reference_number: optional(body, "referenceNumber"), frequency: text(body, "frequency", 64), responsible_person: text(body, "responsiblePerson", 255), expires_on: date(body, "expiresOn") || null, estimated_cost: optional(body, "estimatedCost"), status: "duesoon", created_by: principal.userId }).select("id").single(); break;
    }
    case "portfolio": {
      if (!["slot", "title", "category", "consentReference"].every((key) => text(body, key)) || !["draft", "published"].includes(text(body, "status"))) return bad("A slot, title, category, consent reference, and valid status are required.");
      result = await admin.from("website_portfolio_items").insert({ slot: text(body, "slot", 16), title: text(body, "title"), category: text(body, "category", 64), consent_reference: text(body, "consentReference"), status: text(body, "status") }).select("id").single(); break;
    }
    case "campaign": {
      const spend = amount(body, "spend"); if (!text(body, "name") || !text(body, "channel") || !Number.isFinite(spend) || spend < 0) return bad("Enter a campaign name, channel, and valid spend.");
      const startsAt = dateTime(body, "startsAt"), endsAt = dateTime(body, "endsAt"); if ((text(body, "startsAt") && !startsAt) || (text(body, "endsAt") && !endsAt)) return bad("Enter valid campaign dates."); if (startsAt && endsAt && endsAt <= startsAt) return bad("Campaign end must be after its start."); if (!["draft", "scheduled", "live", "ended"].includes(text(body, "status"))) return bad("Choose a valid campaign status.");
      result = await admin.from("marketing_campaigns").insert({ name: text(body, "name"), channel: text(body, "channel"), spend, status: text(body, "status"), starts_at: startsAt, ends_at: endsAt, created_by: principal.userId }).select("id").single(); break;
    }
    case "expense": {
      const value = amount(body, "amount"); if (!text(body, "category") || !text(body, "description") || !date(body, "expenseDate") || !Number.isFinite(value) || value <= 0) return bad("Complete the expense details with an amount greater than zero.");
      result = await admin.from("expenses").insert({ reference: random("EXP"), category: text(body, "category", 64), description: text(body, "description"), expense_date: date(body, "expenseDate"), amount_php: Math.round(value * 100), created_by: principal.userId }).select("id").single(); break;
    }
    case "invoice": {
      const value = amount(body, "total"); if (!text(body, "reference") || !text(body, "clientName") || !date(body, "issuedAt") || !Number.isFinite(value) || value < 0 || !["issued", "partially_paid", "paid", "overdue", "void"].includes(text(body, "status"))) return bad("Complete the BIR serial, client, date, amount, and valid status.");
      const client = await admin.from("clients").select("id").ilike("name", text(body, "clientName")).maybeSingle(); if (!client.data) return bad("No client matches that name. Create the client account first.");
      result = await admin.from("invoices").insert({ client_id: client.data.id, reference: text(body, "reference", 64), currency: "PHP", subtotal_amount_php: Math.round(value * 100), tax_amount_php: 0, total_amount_php: Math.round(value * 100), paid_amount_php: text(body, "status") === "paid" ? Math.round(value * 100) : 0, status: text(body, "status"), issued_at: `${date(body, "issuedAt")}T00:00:00+08:00`, paid_at: text(body, "status") === "paid" ? new Date().toISOString() : null }).select("id").single(); break;
    }
    case "payroll-run": {
      const start = date(body, "periodStart"), end = date(body, "periodEnd"), payment = date(body, "paymentDate"); if (!text(body, "periodLabel") || !start || !end || !payment || !text(body, "preparedBy")) return bad("Complete all pay-run dates and details."); if (end < start) return bad("Period end must not be before period start.");
      const employees = await admin.from("payroll_employees").select("id", { count: "exact", head: true }).eq("status", "active");
      result = await admin.from("payroll_runs").insert({ reference: random("PR"), period_label: text(body, "periodLabel", 64), period_start: start, period_end: end, payment_date: payment, prepared_by: text(body, "preparedBy", 255), employee_count: employees.count ?? 0, status: "pending", created_by: principal.userId }).select("id").single(); break;
    }
    case "payroll-adjustment": case "payroll-correction": {
      const employee = await employeeId(text(body, "employeeRef", 16)); const value = amount(body, "amount"); if (!employee) return bad("No payroll employee matches that reference."); if (!Number.isFinite(value) || value === 0 || !text(body, "reason") || !date(body, "effectiveDate")) return bad("Enter a non-zero amount, reason, and effective date.");
      result = await admin.from("payroll_adjustments").insert({ employee_id: employee, amount: value, reason: kind === "payroll-correction" ? `Correction: ${text(body, "reason")}` : text(body, "reason"), effective_date: date(body, "effectiveDate"), status: "pending" }).select("id").single(); break;
    }
    case "candidate": {
      const name = text(body, "name", 255), role = text(body, "roleApplied", 255); if (!name || !role || !["applied", "screening", "interview", "offer", "hired", "declined"].includes(text(body, "stage"))) return bad("Enter the candidate name, role, and valid stage.");
      result = await admin.from("recruitment_candidates").insert({ initials: initials(name), name, role_applied: role, source: optional(body, "source"), notes: optional(body, "notes"), stage: text(body, "stage") }).select("id").single(); break;
    }
    case "onboarding": case "offboarding": {
      const name = text(body, "name", 255), role = text(body, "role", 255); if (!name || !role) return bad("Enter the team member name and role.");
      result = kind === "onboarding" ? await admin.from("recruitment_hires").insert({ initials: initials(name), name, role, tasks_total: 6, status: "onboarding" }).select("id").single() : await admin.from("recruitment_departures").insert({ initials: initials(name), name, role, tasks_total: 5, status: "offboarding" }).select("id").single(); break;
    }
    case "shift": {
      const name = text(body, "name", 255), weekStart = date(body, "weekStart"), day = Number(body.dayOfWeek); if (!name || !text(body, "role") || !weekStart || !Number.isInteger(day) || day < 0 || day > 6 || !["studio", "location"].includes(text(body, "location"))) return bad("Complete the staff, role, week, day, and valid location fields.");
      result = await admin.from("shifts").insert({ name, initials: initials(name), role: text(body, "role", 255), week_start: weekStart, day_of_week: day, time_description: optional(body, "timeDescription"), location: text(body, "location"), created_by: principal.userId }).select("id").single(); break;
    }
    case "report": {
      if (!text(body, "name") || !["Finance", "Bookings", "Projects", "Tasks"].includes(text(body, "source")) || !text(body, "period") || !["Manual", "Weekly", "Monthly"].includes(text(body, "schedule") || "Manual")) return bad("Complete the report name, source, period, and valid schedule.");
      result = await admin.from("saved_reports").insert({ name: text(body, "name"), source: text(body, "source", 64), period: text(body, "period", 64), schedule: text(body, "schedule", 32) || "Manual", created_by: principal.userId }).select("id").single(); break;
    }
    case "remittance": {
      const employee = await employeeId(text(body, "employeeRef", 16));
      const values = [amount(body, "sssAmount") || 0, amount(body, "philhealthAmount") || 0, amount(body, "pagibigAmount") || 0];
      if (!employee || !text(body, "periodLabel") || values.some((value) => !Number.isFinite(value) || value < 0) || values.every((value) => value === 0)) return bad("Enter a valid employee, period, and at least one non-negative contribution amount.");
      result = await admin.from("payroll_contributions").insert({ employee_id: employee, period_label: text(body, "periodLabel", 32), sss_amount: values[0], philhealth_amount: values[1], pagibig_amount: values[2], paid_at: new Date().toISOString() }).select("id").single(); break;
    }
    default: return NextResponse.json({ error: "Unsupported create operation." }, { status: 404 });
  }
  if (result.error || !result.data) return NextResponse.json({ error: result.error?.code === "23505" ? "A record with that unique reference already exists." : "Unable to save this record." }, { status: result.error?.code === "23505" ? 409 : 500 });
  await audit(principal, kind, result.data.id);
  return NextResponse.json(result.data, { status: 201 });
}
