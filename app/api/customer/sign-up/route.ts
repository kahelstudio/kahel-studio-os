import { NextResponse } from "next/server";
import {
  auditCustomerEvent,
  consumeCustomerRateLimit,
  createCustomerProfile,
  ensureCustomerAccount,
  hasTrustedOrigin,
  isStaffAddress,
  isValidEmail,
  normalizeEmail,
  normalizeMobile,
} from "@/lib/server/customer-auth";

export const runtime = "nodejs";

type SignUpRequest = { firstName?: unknown; lastName?: unknown; email?: unknown; mobile?: unknown };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to create account." }, { status: 403 });
  let input: SignUpRequest;
  try { input = await request.json() as SignUpRequest; } catch { return NextResponse.json({ error: "Check the information and try again." }, { status: 400 }); }
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const mobile = typeof input.mobile === "string" ? normalizeMobile(input.mobile) : "";
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100 || !isValidEmail(email) || mobile.length < 7 || mobile.length > 32 || isStaffAddress(email)) {
    return NextResponse.json({ error: "Check the information and try again." }, { status: 400 });
  }
  try {
    if (!await consumeCustomerRateLimit(request, "customer_signup", email, 4, "1 hour")) {
      return NextResponse.json({ error: "Please wait before requesting another account email." }, { status: 429 });
    }
    const profile = await createCustomerProfile({ firstName, lastName, email, mobile });
    await ensureCustomerAccount(profile, "signup");
    return NextResponse.json({ message: "Check your email to verify your account and create your password." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    await auditCustomerEvent({ action: "invitation_failed", metadata: { source: "signup" } });
    return NextResponse.json({ error: "We could not send the setup email. Please try again later." }, { status: 503 });
  }
}
