import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export type RegisterRole = "staff" | "admin" | "super_admin";
export type RegisterSessionStatus = "open" | "pending_review" | "closed";

export type RegisterMovement = {
  id: string;
  kind: "cash" | "session";
  eventType: string;
  direction: "in" | "out" | null;
  amountCentavos: number | null;
  expectedAmountCentavos: number | null;
  countedAmountCentavos: number | null;
  varianceCentavos: number | null;
  reason: string | null;
  actorName: string;
  occurredAt: string;
  paymentId: string | null;
  refundId: string | null;
};

export type RegisterSession = {
  id: string;
  status: RegisterSessionStatus;
  openingAmountCentavos: number;
  expectedAmountCentavos: number;
  countedAmountCentavos: number | null;
  varianceCentavos: number | null;
  openedBy: string;
  openerName: string;
  openedAt: string;
  openingNote: string | null;
  closeSubmittedAt: string | null;
  closeNote: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  closedAt: string | null;
  cashInCentavos: number;
  cashOutCentavos: number;
  movements: RegisterMovement[];
};

export type RegisterOption = {
  id: string;
  code: string;
  name: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  minimumCashCentavos: number;
  activeSession: RegisterSession | null;
};

export type ClosedRegisterSession = RegisterSession & {
  registerId: string;
  registerName: string;
  locationName: string;
};

export type RegisterWorkspace = {
  registers: RegisterOption[];
  recentClosed: ClosedRegisterSession[];
  generatedAt: string;
};

type LocationRecord = { id: string; code: string; name: string; minimum_cash_centavos: number };
type RegisterRecord = { id: string; location_id: string; code: string; name: string };
type SessionRecord = {
  id: string; register_id: string; status: RegisterSessionStatus; opening_amount_centavos: number;
  expected_amount_centavos: number | null; counted_amount_centavos: number | null; variance_centavos: number | null;
  opened_by: string; opened_at: string; opening_note: string | null; close_submitted_at: string | null;
  close_note: string | null; reviewed_by: string | null; reviewed_at: string | null; review_note: string | null;
  closed_at: string | null;
};
type CashEventRecord = {
  id: string; register_session_id: string; event_type: string; direction: "in" | "out";
  amount_centavos: number; payment_id: string | null; refund_id: string | null; reason: string | null;
  actor_id: string; occurred_at: string;
};
type SessionEventRecord = {
  id: string; register_session_id: string; event_type: string; actor_id: string; note: string | null;
  expected_amount_centavos: number | null; counted_amount_centavos: number | null;
  variance_centavos: number | null; occurred_at: string;
};
type StaffRecord = { user_id: string; display_name: string };

export class RegisterDataError extends Error {
  constructor(dataset: string, cause?: unknown) {
    super(`Unable to load register ${dataset}.`, { cause });
    this.name = "RegisterDataError";
  }
}

function rows<T>(dataset: string, result: { data: T[] | null; error: unknown }) {
  if (result.error) throw new RegisterDataError(dataset, result.error);
  return result.data ?? [];
}

function cents(value: number | null) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) throw new RegisterDataError("amounts");
  return value;
}

export async function getRegisterWorkspace(): Promise<RegisterWorkspace> {
  const admin = getSupabaseAdmin();
  const [locationsResult, registersResult, activeResult, closedResult] = await Promise.all([
    admin.from("locations").select("id,code,name,minimum_cash_centavos").eq("active", true).order("name").returns<LocationRecord[]>(),
    admin.from("cash_registers").select("id,location_id,code,name").eq("active", true).order("name").returns<RegisterRecord[]>(),
    admin.from("cash_register_sessions").select("id,register_id,status,opening_amount_centavos,expected_amount_centavos,counted_amount_centavos,variance_centavos,opened_by,opened_at,opening_note,close_submitted_at,close_note,reviewed_by,reviewed_at,review_note,closed_at").in("status", ["open", "pending_review"]).order("opened_at", { ascending: false }).returns<SessionRecord[]>(),
    admin.from("cash_register_sessions").select("id,register_id,status,opening_amount_centavos,expected_amount_centavos,counted_amount_centavos,variance_centavos,opened_by,opened_at,opening_note,close_submitted_at,close_note,reviewed_by,reviewed_at,review_note,closed_at").eq("status", "closed").order("closed_at", { ascending: false }).limit(20).returns<SessionRecord[]>(),
  ]);
  const locations = rows("locations", locationsResult);
  const locationById = new Map(locations.map((row) => [row.id, row]));
  const registers = rows("registers", registersResult).filter((row) => locationById.has(row.location_id));
  const registerById = new Map(registers.map((row) => [row.id, row]));
  const activeSessions = rows("active sessions", activeResult).filter((row) => registerById.has(row.register_id));
  const closedSessions = rows("closed sessions", closedResult).filter((row) => registerById.has(row.register_id));
  const sessions = [...activeSessions, ...closedSessions];
  const sessionIds = sessions.map((row) => row.id);

  const [cashResult, sessionEventResult] = sessionIds.length ? await Promise.all([
    admin.from("cash_register_events").select("id,register_session_id,event_type,direction,amount_centavos,payment_id,refund_id,reason,actor_id,occurred_at").in("register_session_id", sessionIds).order("occurred_at", { ascending: false }).returns<CashEventRecord[]>(),
    admin.from("cash_register_session_events").select("id,register_session_id,event_type,actor_id,note,expected_amount_centavos,counted_amount_centavos,variance_centavos,occurred_at").in("register_session_id", sessionIds).order("occurred_at", { ascending: false }).returns<SessionEventRecord[]>(),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const cashEvents = rows("cash events", cashResult);
  const sessionEvents = rows("session events", sessionEventResult);
  const staffIds = [...new Set([
    ...sessions.flatMap((row) => [row.opened_by, row.reviewed_by]).filter((id): id is string => Boolean(id)),
    ...cashEvents.map((row) => row.actor_id),
    ...sessionEvents.map((row) => row.actor_id),
  ])];
  const staffResult = staffIds.length
    ? await admin.from("staff_profiles").select("user_id,display_name").in("user_id", staffIds).returns<StaffRecord[]>()
    : { data: [], error: null };
  const staffById = new Map(rows("staff names", staffResult).map((row) => [row.user_id, row.display_name]));
  const cashBySession = new Map<string, CashEventRecord[]>();
  const lifecycleBySession = new Map<string, SessionEventRecord[]>();
  for (const event of cashEvents) cashBySession.set(event.register_session_id, [...(cashBySession.get(event.register_session_id) ?? []), event]);
  for (const event of sessionEvents) lifecycleBySession.set(event.register_session_id, [...(lifecycleBySession.get(event.register_session_id) ?? []), event]);

  const mapSession = (row: SessionRecord): RegisterSession => {
    const cash = cashBySession.get(row.id) ?? [];
    const cashInCentavos = cash.filter((event) => event.direction === "in").reduce((sum, event) => sum + (cents(event.amount_centavos) ?? 0), 0);
    const cashOutCentavos = cash.filter((event) => event.direction === "out").reduce((sum, event) => sum + (cents(event.amount_centavos) ?? 0), 0);
    const expectedAmountCentavos = cents(row.expected_amount_centavos) ?? (cents(row.opening_amount_centavos) ?? 0) + cashInCentavos - cashOutCentavos;
    const movements: RegisterMovement[] = [
      ...cash.map((event) => ({
        id: event.id, kind: "cash" as const, eventType: event.event_type, direction: event.direction,
        amountCentavos: cents(event.amount_centavos), expectedAmountCentavos: null, countedAmountCentavos: null,
        varianceCentavos: null, reason: event.reason, actorName: staffById.get(event.actor_id) ?? "Staff member",
        occurredAt: event.occurred_at, paymentId: event.payment_id, refundId: event.refund_id,
      })),
      ...(lifecycleBySession.get(row.id) ?? []).map((event) => ({
        id: event.id, kind: "session" as const, eventType: event.event_type, direction: null,
        amountCentavos: null, expectedAmountCentavos: cents(event.expected_amount_centavos),
        countedAmountCentavos: cents(event.counted_amount_centavos), varianceCentavos: cents(event.variance_centavos),
        reason: event.note, actorName: staffById.get(event.actor_id) ?? "Staff member", occurredAt: event.occurred_at,
        paymentId: null, refundId: null,
      })),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return {
      id: row.id, status: row.status, openingAmountCentavos: cents(row.opening_amount_centavos) ?? 0,
      expectedAmountCentavos, countedAmountCentavos: cents(row.counted_amount_centavos),
      varianceCentavos: cents(row.variance_centavos), openedBy: row.opened_by,
      openerName: staffById.get(row.opened_by) ?? "Staff member", openedAt: row.opened_at,
      openingNote: row.opening_note, closeSubmittedAt: row.close_submitted_at, closeNote: row.close_note,
      reviewedBy: row.reviewed_by, reviewerName: row.reviewed_by ? staffById.get(row.reviewed_by) ?? "Staff member" : null,
      reviewedAt: row.reviewed_at, reviewNote: row.review_note, closedAt: row.closed_at,
      cashInCentavos, cashOutCentavos, movements,
    };
  };

  const activeByRegister = new Map(activeSessions.map((row) => [row.register_id, mapSession(row)]));
  return {
    registers: registers.map((register) => {
      const location = locationById.get(register.location_id)!;
      return {
        id: register.id, code: register.code, name: register.name, locationId: location.id,
        locationCode: location.code, locationName: location.name,
        minimumCashCentavos: cents(location.minimum_cash_centavos) ?? 0,
        activeSession: activeByRegister.get(register.id) ?? null,
      };
    }),
    recentClosed: closedSessions.map((row) => {
      const register = registerById.get(row.register_id)!;
      const location = locationById.get(register.location_id)!;
      return { ...mapSession(row), registerId: register.id, registerName: register.name, locationName: location.name };
    }),
    generatedAt: new Date().toISOString(),
  };
}
