"use client";

import { useEffect, useState } from "react";

export type SystemStatus = "operational" | "degraded" | "down" | "unknown";
export type StatusPayload = { status: SystemStatus; label: string; checkedAt: string; statusPageUrl: string };

const POLL_INTERVAL = 5 * 60 * 1000;

export function useSystemStatus(): StatusPayload | null {
  const [data, setData] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/system-status");
        if (!res.ok) return;
        const json = (await res.json()) as StatusPayload;
        if (!cancelled) setData(json);
      } catch {}
    }

    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}

export function statusDotClass(status: SystemStatus): string {
  switch (status) {
    case "operational": return "bg-[var(--color-success)]";
    case "degraded": return "bg-amber-400";
    case "down": return "bg-red-500";
    default: return "bg-[var(--color-text-muted)]";
  }
}
