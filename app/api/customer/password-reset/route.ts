import { NextResponse } from "next/server";
import { auditCustomerEvent, consumeCustomerRateLimit, customerCallbackUrl, getProfileByEmail, hasTrustedOrigin, isStaffAddress, isValidEmail, normalizeEmail } from "@/lib/server/customer-auth";
import { getSupabaseAuthClient } from "@/lib/server/supabase-admin";
import { recordSupabaseAuthEmailRequest } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ requested: true }, { status: 202 });
  let email = "";
  try {
    const input = await request.json() as { email?: unknown };
    email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  } catch {}
  try {
    if (isValidEmail(email) && !isStaffAddress(email) && await consumeCustomerRateLimit(request, "customer_password_reset", email, 4, "1 hour")) {
      const profile = await getProfileByEmail(email);
      if (profile?.user_id && profile.status !== "disabled") {
        const { error } = await getSupabaseAuthClient().auth.resetPasswordForEmail(email, { redirectTo: customerCallbackUrl() });
        if (!error) {
          await recordSupabaseAuthEmailRequest({
            templateKey: "supabase-auth-password-reset", operationId: crypto.randomUUID(), to: email,
            recipientUserId: profile.user_id, recipientProfileId: profile.id, clientId: profile.client_id,
          });
          await auditCustomerEvent({ action: "password_reset_requested", userId: profile.user_id, clientId: profile.client_id, profileId: profile.id, entityId: profile.id });
        }
      }
    }
  } catch {
    // Always return the same response to prevent account enumeration.
  }
  return NextResponse.json({ requested: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
