import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStaffPrincipal: vi.fn(),
  mutationResult: { data: null as { id: string; name?: string } | null, error: null as { code?: string } | null },
  auditInsert: vi.fn(),
}));

vi.mock("@/lib/server/staff-auth", () => ({ getStaffPrincipal: mocks.getStaffPrincipal }));
vi.mock("@/lib/server/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "staff_audit_log") return { insert: mocks.auditInsert };
      const final = { maybeSingle: async () => mocks.mutationResult, single: async () => mocks.mutationResult };
      const selected = { select: () => final };
      const filtered = { eq: () => selected };
      return {
        insert: () => selected,
        update: () => filtered,
        delete: () => filtered,
      };
    },
  }),
}));

import { DELETE, POST, PUT } from "@/app/api/operations/[kind]/route";

const context = { params: Promise.resolve({ kind: "equipment" }) };
const body = { id: "10000000-0000-4000-8000-000000000001", serial: "CAM-1", name: "Camera", category: "Camera", status: "available" };
const request = (method: string, value?: Record<string, unknown>) => new Request(`https://kahelstudio.com/api/operations/equipment${method === "DELETE" ? `?id=${body.id}` : ""}`, {
  method,
  headers: { "content-type": "application/json" },
  body: value ? JSON.stringify(value) : undefined,
});

describe("equipment operation responses and audit actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStaffPrincipal.mockResolvedValue({ userId: "staff-id", email: "staff@example.com", role: "admin", permissions: [] });
    mocks.mutationResult = { data: { id: body.id, name: body.name }, error: null };
    mocks.auditInsert.mockResolvedValue({ error: null });
  });

  it("audits a successful create as created", async () => {
    const response = await POST(request("POST", body), context);
    expect(response.status).toBe(201);
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({ event: "Created equipment", metadata: expect.objectContaining({ action: "created", display_name: "Camera" }) }));
  });

  it("audits a successful update only after a row is returned", async () => {
    const response = await PUT(request("PUT", body), context);
    expect(response.status).toBe(200);
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({ event: "Updated equipment", metadata: expect.objectContaining({ action: "updated" }) }));
  });

  it("returns 404 and does not audit a nonexistent update", async () => {
    mocks.mutationResult = { data: null, error: null };
    const response = await PUT(request("PUT", body), context);
    expect(response.status).toBe(404);
    expect(mocks.auditInsert).not.toHaveBeenCalled();
  });

  it("audits a successful delete only after a row is returned", async () => {
    const response = await DELETE(request("DELETE"), context);
    expect(response.status).toBe(200);
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({ event: "Deleted equipment", metadata: expect.objectContaining({ action: "deleted" }) }));
  });

  it("returns 404 and does not audit a nonexistent delete", async () => {
    mocks.mutationResult = { data: null, error: null };
    const response = await DELETE(request("DELETE"), context);
    expect(response.status).toBe(404);
    expect(mocks.auditInsert).not.toHaveBeenCalled();
  });
});
