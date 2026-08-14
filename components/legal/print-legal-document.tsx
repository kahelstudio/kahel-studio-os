"use client";

import { Printer } from "lucide-react";

export function PrintLegalDocument() {
  return <button type="button" onClick={() => window.print()} className="print:hidden inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF5300] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30"><Printer className="h-4 w-4" /> Print or save as PDF</button>;
}
