import { NextResponse } from "next/server";
import { getProducts } from "@/lib/server/pos-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
