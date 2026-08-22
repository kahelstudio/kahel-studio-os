import { NextResponse } from "next/server";
import { getPayMongoPaymentCapability } from "@/lib/server/paymongo-methods";
import { consumeCustomerRateLimit } from "@/lib/server/customer-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const amount = Number(url.searchParams.get("amount"));
  if (!Number.isSafeInteger(amount) || amount < 0) return NextResponse.json({ error: "Enter a valid payment amount." }, { status: 400 });
  if (!await consumeCustomerRateLimit(request, "payment_capability", "public", 120, "10 minutes")) {
    return NextResponse.json({ error: "Too many payment checks. Please wait a moment." }, { status: 429 });
  }
  const capability = getPayMongoPaymentCapability(amount);
  return NextResponse.json({ bnpl: capability.bnpl }, { headers: { "Cache-Control": "private, no-store" } });
}
