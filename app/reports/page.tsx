"use client";

import { Suspense } from "react";
import { ReportsHub } from "@/components/reports/reports-hub";

export default function ReportsPage() {
  return <Suspense fallback={<div className="p-10 text-sm text-[var(--color-text-secondary)]">Loading reports...</div>}><ReportsHub /></Suspense>;
}
