import { NextResponse } from "next/server";
import { clearCustomerSessionCookies, isSafePortalPath, refreshCustomerSession, setCustomerSessionCookies } from "@/lib/server/customer-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("next");
  const next = isSafePortalPath(requested) ? requested! : "/portal";
  const session = await refreshCustomerSession(request);
  if (!session) {
    const response = NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, url.origin));
    clearCustomerSessionCookies(response);
    return response;
  }
  const response = NextResponse.redirect(new URL(next, url.origin));
  setCustomerSessionCookies(response, session);
  return response;
}
