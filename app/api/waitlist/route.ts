import { NextResponse } from "next/server";
import { hasTrustedOrigin, isValidEmail, normalizeEmail } from "@/lib/server/customer-auth";
import { turnstileConfigured, turnstileRequired, turnstileSiteKey, verifyTurnstile } from "@/lib/server/turnstile";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getWaitlistServices } from "@/lib/server/waitlist-data";
import { sendWaitlistConfirmation, sendWaitlistAdminNotification } from "@/lib/server/waitlist-email";

export const runtime = "nodejs";

const VALID_TIME_OF_DAY = new Set(["morning", "afternoon", "evening", "any"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function short(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

export async function GET() {
  const services = await getWaitlistServices().catch(() => []);
  return NextResponse.json({
    turnstileRequired: turnstileRequired(),
    turnstileConfigured: turnstileConfigured(),
    turnstileSiteKey: turnstileSiteKey(),
    services,
  });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: bots fill this in, humans leave it empty. Silent acceptance so bots get no signal.
  if (body["email_confirm"] != null && body["email_confirm"] !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const { name, email, phone, service_id, preferred_start, preferred_end, time_of_day, notes } = body;
  const turnstileToken = typeof body["cf-turnstile-response"] === "string" ? body["cf-turnstile-response"] : "";

  if (!short(name, 2, 200)) return NextResponse.json({ error: "Please enter your name (2–200 characters)." }, { status: 422 });
  if (typeof email !== "string" || !isValidEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });
  if (phone != null && phone !== "" && !short(phone, 7, 30)) return NextResponse.json({ error: "Phone number looks invalid." }, { status: 422 });
  if (!validDate(preferred_start)) return NextResponse.json({ error: "Please choose a preferred start date." }, { status: 422 });
  if (!validDate(preferred_end)) return NextResponse.json({ error: "Please choose a preferred end date." }, { status: 422 });
  if (preferred_end < preferred_start) return NextResponse.json({ error: "End date must be on or after the start date." }, { status: 422 });
  if (typeof time_of_day !== "string" || !VALID_TIME_OF_DAY.has(time_of_day)) return NextResponse.json({ error: "Please select a preferred time of day." }, { status: 422 });
  if (notes != null && notes !== "" && !short(notes, 0, 1000)) return NextResponse.json({ error: "Notes must be 1 000 characters or fewer." }, { status: 422 });
  if (service_id != null && service_id !== "" && (typeof service_id !== "string" || !UUID_RE.test(service_id))) {
    return NextResponse.json({ error: "Invalid service selection." }, { status: 422 });
  }

  if (!await verifyTurnstile(request, turnstileToken)) {
    return NextResponse.json(
      { error: turnstileConfigured() ? "Security check failed. Please try again." : "Security check not configured — contact us directly." },
      { status: 403 },
    );
  }

  const admin = getSupabaseAdmin();

  let resolvedServiceId: string | null = null;
  let serviceName = "Any session";
  if (typeof service_id === "string" && service_id) {
    const { data: svc } = await admin.from("services").select("id, name").eq("id", service_id).maybeSingle<{ id: string; name: string }>();
    if (svc) { resolvedServiceId = svc.id; serviceName = svc.name; }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wa = admin as any;
  const insertResult = await wa
    .from("waitlist_entries")
    .insert({
      name: (name as string).trim(),
      email: normalizeEmail(email as string),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      service_id: resolvedServiceId,
      preferred_start,
      preferred_end,
      time_of_day,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      source: "booking_page",
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };
  const { data: entry, error } = insertResult;

  if (error || !entry) {
    console.error("waitlist insert error:", error?.message);
    return NextResponse.json({ error: "Unable to save your request. Please try again shortly." }, { status: 500 });
  }

  const firstName = (name as string).trim().split(/\s+/)[0];
  const fmt = (d: string) => new Date(`${d}T00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  const preferredWindow = preferred_start === preferred_end ? fmt(preferred_start as string) : `${fmt(preferred_start as string)} – ${fmt(preferred_end as string)}`;

  void Promise.allSettled([
    sendWaitlistConfirmation({
      to: normalizeEmail(email as string),
      firstName,
      serviceName,
      preferredWindow,
      waitlistId: entry.id,
    }),
    sendWaitlistAdminNotification({
      name: (name as string).trim(),
      email: normalizeEmail(email as string),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      serviceName,
      preferredWindow,
      timeOfDay: time_of_day as string,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      waitlistId: entry.id,
    }),
  ]);

  return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
}
