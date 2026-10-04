import { NextResponse } from "next/server";
import { authenticationDisabled, getStaffPrincipal } from "@/lib/server/staff-auth";
import { addResourceBlock, getResourceDirectory, removeResourceBlock, schedulingErrorMessage, setResourceHours, setServiceRequirements, upsertResource } from "@/lib/server/resource-scheduling";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const RESOURCE_TYPES = new Set(["space", "team", "photographer", "videographer", "drone_operator", "camera", "equipment", "rental_item"]);
const BLOCK_KINDS = new Set(["manual", "leave", "closure", "maintenance"]);

/** Staff actor for audit. Null is only possible in local development with staff authentication disabled. */
async function staff(request: Request, level: "manage" | "admin") {
  const principal = await getStaffPrincipal(request);
  if (!principal) return { error: NextResponse.json({ error: "Staff access is required." }, { status: 403 }) };
  const allowed = level === "admin" ? principal.role === "admin" || principal.role === "super_admin" : principal.permissions.includes("bookings.manage");
  if (!allowed) return { error: NextResponse.json({ error: level === "admin" ? "Administrative access is required." : "Booking management permission is required." }, { status: 403 }) };
  if (!principal.userId && !authenticationDisabled()) return { error: NextResponse.json({ error: "Sign in with an active staff account." }, { status: 403 }) };
  return { actorId: principal.userId };
}

export async function GET(request: Request) {
  const auth = await staff(request, "manage");
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(await getResourceDirectory(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[booking-resources] directory failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Resources could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const adminAction = ["save_resource", "set_hours", "set_requirements"].includes(body.action);
  const auth = await staff(request, adminAction ? "admin" : "manage");
  if ("error" in auth) return auth.error;
  const actorId = auth.actorId as string; // null only in local development with authentication disabled
  try {
    switch (body.action) {
      case "save_resource": {
        const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const type = typeof body.type === "string" ? body.type : "";
        const code = typeof body.code === "string" ? body.code.trim().toLowerCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!name || name.length > 200 || !RESOURCE_TYPES.has(type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) return NextResponse.json({ error: "Enter a name and choose a valid type." }, { status: 400 });
        const staffUserId = typeof body.staffUserId === "string" && UUID.test(body.staffUserId) ? body.staffUserId : null;
        const saved = await upsertResource({ id, code, name, type, staffUserId, publicSelectable: body.publicSelectable === true, active: body.active !== false, sortOrder: Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 100 }, actorId);
        return NextResponse.json({ resource: saved });
      }
      case "set_hours": {
        if (typeof body.resourceId !== "string" || !UUID.test(body.resourceId) || !Array.isArray(body.hours)) return NextResponse.json({ error: "Invalid working hours." }, { status: 400 });
        const hours = (body.hours as Array<Record<string, unknown>>).map((h) => ({ day: Number(h.day), opens: String(h.opens), closes: String(h.closes) }));
        if (hours.some((h) => !Number.isInteger(h.day) || h.day < 1 || h.day > 7 || !TIME.test(h.opens) || !TIME.test(h.closes) || h.closes <= h.opens)) return NextResponse.json({ error: "Each working period needs a day and an end time after its start time." }, { status: 400 });
        return NextResponse.json({ hours: await setResourceHours(body.resourceId, hours, actorId) });
      }
      case "add_block": {
        const kind = typeof body.kind === "string" && BLOCK_KINDS.has(body.kind) ? body.kind : "manual";
        if (typeof body.resourceId !== "string" || !UUID.test(body.resourceId) || typeof body.startsAt !== "string" || typeof body.endsAt !== "string"
          || Number.isNaN(Date.parse(body.startsAt)) || Number.isNaN(Date.parse(body.endsAt)) || Date.parse(body.endsAt) <= Date.parse(body.startsAt)
          || typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500) return NextResponse.json({ error: "Enter a start, an end after the start, and a reason." }, { status: 400 });
        return NextResponse.json({ block: await addResourceBlock(body.resourceId, body.startsAt, body.endsAt, kind, body.reason.trim(), actorId) });
      }
      case "remove_block": {
        if (typeof body.blockId !== "string" || !UUID.test(body.blockId)) return NextResponse.json({ error: "Invalid block." }, { status: 400 });
        await removeResourceBlock(body.blockId, actorId);
        return NextResponse.json({ removed: true });
      }
      case "set_requirements": {
        if (typeof body.serviceId !== "string" || !UUID.test(body.serviceId) || !Array.isArray(body.requirements) || body.requirements.length > 20) return NextResponse.json({ error: "Invalid requirements." }, { status: 400 });
        const requirements = (body.requirements as Array<Record<string, unknown>>).map((r) => r.mode === "fixed"
          ? { mode: "fixed" as const, resource_id: String(r.resourceId ?? "") }
          : { mode: "any_available" as const, resource_type: String(r.resourceType ?? ""), customer_selectable: r.customerSelectable === true });
        if (requirements.some((r) => (r.mode === "fixed" ? !UUID.test(r.resource_id) : !RESOURCE_TYPES.has(r.resource_type)))) return NextResponse.json({ error: "Each requirement needs a resource or a type." }, { status: 400 });
        return NextResponse.json({ requirements: await setServiceRequirements(body.serviceId, requirements, actorId) });
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23P01" || code === "23505" || code === "22023" || code === "23503" || code === "23514") return NextResponse.json({ error: schedulingErrorMessage(error) }, { status: 409 });
    console.error("[booking-resources] action failed", body.action, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The change could not be saved." }, { status: 503 });
  }
}
