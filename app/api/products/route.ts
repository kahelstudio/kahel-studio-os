import { NextResponse } from "next/server";
import { getProducts } from "@/lib/server/pos-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
