import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UptimeMonitor = { id: number; friendly_name: string; status: number };
type UptimeResponse = { stat: "ok" | "fail"; monitors?: UptimeMonitor[] };

export type SystemStatus = "operational" | "degraded" | "down" | "unknown";
export type StatusPayload = { status: SystemStatus; label: string; checkedAt: string; statusPageUrl: string };

const STATUS_PAGE_URL = process.env.UPTIMEROBOT_STATUS_PAGE_URL ?? "https://stats.uptimerobot.com/2meo2NHBx8";

export async function GET() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) return unknown();

  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: apiKey, format: "json" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return unknown();

    const data = (await res.json()) as UptimeResponse;
    if (data.stat !== "ok" || !data.monitors?.length) return unknown();

    const totalDown = data.monitors.filter((m) => m.status === 8 || m.status === 9).length;
    const total = data.monitors.length;

    let status: SystemStatus;
    let label: string;
    if (totalDown === 0) { status = "operational"; label = "All systems operational"; }
    else if (totalDown < total) { status = "degraded"; label = "Partial outage"; }
    else { status = "down"; label = "System outage"; }

    return NextResponse.json<StatusPayload>(
      { status, label, checkedAt: new Date().toISOString(), statusPageUrl: STATUS_PAGE_URL },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return unknown();
  }
}

function unknown() {
  return NextResponse.json<StatusPayload>(
    { status: "unknown", label: "System status", checkedAt: new Date().toISOString(), statusPageUrl: STATUS_PAGE_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
