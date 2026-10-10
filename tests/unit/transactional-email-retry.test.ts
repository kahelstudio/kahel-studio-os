import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  principal: vi.fn(),
  trusted: vi.fn(() => true),
  process: vi.fn(),
  admin: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("@/lib/server/staff-auth", () => ({ getStaffPrincipal: mocks.principal }));
vi.mock("@/lib/server/customer-auth", () => ({ hasTrustedOrigin: mocks.trusted }));
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => mocks.admin }));
vi.mock("@/lib/server/transactional-email-service", async (original) => {
  const actual = await original<typeof import("@/lib/server/transactional-email-service")>();
  return { ...actual, processTransactionalEmailQueue: mocks.process };
});

import { POST } from "@/app/api/email/messages/[messageId]/resend/route";

const messageId = "10000000-0000-4000-8000-000000000001";
const childId = "10000000-0000-4000-8000-000000000002";
const original = {
  contains_secure_content: false, status: "failed", retry_eligible: true,
  client_id: "client-1", recipient_profile_id: "profile-1", booking_id: "booking-1",
  template_version_id: "version-old", recipient_email: "old@example.com", recipient_name: "Old Name",
  render_context: {},
  rendered_subject: "Booking received", rendered_html: "<p>Booking received</p>", rendered_text: "Booking received",
  sender_email: "hello@kahelstudio.com", sender_name: "Kahel Studio", reply_to_email: "support@kahelstudio.com",
};

afterEach(() => {
  mocks.principal.mockReset();
  mocks.trusted.mockReset().mockReturnValue(true);
  mocks.process.mockReset();
  mocks.admin.from.mockReset();
  mocks.admin.rpc.mockReset();
});

describe("transactional email retry route", () => {
  it("rejects unauthenticated and unauthorized staff", async () => {
    mocks.principal.mockResolvedValueOnce(null);
    expect((await POST(request(), context())).status).toBe(401);

    mocks.principal.mockResolvedValueOnce({ role: "staff", userId: "staff-1", email: "staff@example.com" });
    expect((await POST(request(), context())).status).toBe(403);
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });

  it("refreshes the recipient and template before a successful retry", async () => {
    authorize();
    mockTables({ prior: null, finalStatus: "provider_accepted" });
    mocks.admin.rpc.mockResolvedValue({ data: { id: childId, status: "queued" }, error: null });
    mocks.process.mockResolvedValue({ processed: 1, accepted: 1, failed: 0 });

    const response = await POST(request(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ messageId: childId, status: "provider_accepted", reused: false });
    const refresh = tableCalls("transactional_messages")[2];
    expect(refresh.update).toHaveBeenCalledWith(expect.objectContaining({ template_version_id: "version-latest", recipient_email: "new@example.com", recipient_name: "New Client", rendered_subject: "Booking KS-1001 received", rendered_html: "<p>Hello New Client</p>" }));
    expect(mocks.process).toHaveBeenCalledWith(expect.objectContaining({ messageId: childId }));
  });

  it("returns the same child for a repeated retry instead of sending twice", async () => {
    authorize();
    const originalQuery = query({ data: original, error: null });
    const priorQuery = query({ data: { id: childId, status: "provider_accepted" }, error: null });
    const byTable: Record<string, ReturnType<typeof query>[]> = { transactional_messages: [originalQuery, priorQuery] };
    mocks.admin.from.mockImplementation((table: string) => byTable[table].shift());

    const response = await POST(request(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ messageId: childId, status: "provider_accepted", reused: true });
    expect(mocks.admin.rpc).not.toHaveBeenCalled();
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns a sanitized provider failure from a failed retry", async () => {
    authorize();
    mockTables({ prior: null, finalStatus: "failed" });
    mocks.admin.rpc.mockResolvedValue({ data: { id: childId, status: "queued" }, error: null });
    mocks.process.mockResolvedValue({ processed: 1, accepted: 0, failed: 1 });

    const response = await POST(request(), context());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ status: "failed", errorCode: "provider_sender_rejected", error: "Email provider rejected the configured sender." });
  });
});

function authorize() {
  mocks.principal.mockResolvedValue({ role: "admin", userId: "staff-1", email: "admin@example.com" });
}

function request() {
  return new Request(`https://dashboard.kahelstudio.com/api/email/messages/${messageId}/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "retry-key-123" },
    body: JSON.stringify({ reason: "Retry after configuration fix" }),
  });
}

function context() { return { params: Promise.resolve({ messageId }) }; }

let captured: Record<string, ReturnType<typeof query>[]> = {};
let used: Record<string, ReturnType<typeof query>[]> = {};
function tableCalls(table: string) { return used[table]; }

function mockTables({ prior, finalStatus }: { prior: { id: string; status: string } | null; finalStatus: string }) {
  captured = {
    transactional_messages: [
      query({ data: original, error: null }),
      query({ data: prior, error: null }),
      query({ data: null, error: null }),
      query({ data: { status: finalStatus, last_error_code: finalStatus === "failed" ? "provider_sender_rejected" : null, last_error_message: finalStatus === "failed" ? "Email provider rejected the configured sender." : null }, error: null }),
    ],
    client_profiles: [query({ data: { email: "New@Example.com", first_name: "New", last_name: "Client", status: "active" }, error: null })],
    bookings: [query({ data: { id: "booking-1", reference: "KS-1001", service_type: "Portrait", service_date: "2026-10-02", service_time: "10:00:00", location: "Studio", total_amount_php: 500000, paid_amount_php: 250000 }, error: null })],
    email_template_versions: [query({ data: { template_id: "template-1" }, error: null }), query({ data: { id: "version-latest", subject_template: "Booking {{ booking_id }} received", html_template: "<p>Hello {{ customer_name }}</p>", text_template: "Hello {{ customer_name }}" }, error: null })],
    email_templates: [query({ data: { template_key: "booking-request-received", active: true }, error: null })],
    staff_audit_log: [query({ data: null, error: null })],
  };
  used = {};
  mocks.admin.from.mockImplementation((table: string) => {
    const next = captured[table].shift()!;
    (used[table] ??= []).push(next);
    return next;
  });
}

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & { then?: (resolve: (value: typeof result) => unknown) => unknown } = {};
  for (const method of ["select", "eq", "not", "order", "limit", "update", "insert"]) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve) => Promise.resolve(resolve(result));
  return chain;
}
