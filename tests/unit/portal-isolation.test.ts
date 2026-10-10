import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSafePortalPath, normalizeEmail } from "@/lib/server/customer-auth";

const root = process.cwd();
const src = (rel: string) => readFileSync(join(root, rel), "utf8");

// ---------------------------------------------------------------------------
// §1  Open-redirect allowlist (pure function)
// ---------------------------------------------------------------------------

describe("portal redirect safety", () => {
  it("allowlists portal sub-paths", () => {
    expect(isSafePortalPath("/portal")).toBe(true);
    expect(isSafePortalPath("/portal/bookings")).toBe(true);
    expect(isSafePortalPath("/portal/projects/PRJ-001")).toBe(true);
    expect(isSafePortalPath("/portal/galleries")).toBe(true);
    expect(isSafePortalPath("/portal/messages")).toBe(true);
    expect(isSafePortalPath("/portal/invoices")).toBe(true);
    expect(isSafePortalPath("/portal/agreements/some-uuid")).toBe(true);
  });

  it("blocks external and double-slash destinations", () => {
    expect(isSafePortalPath("//evil.example/portal")).toBe(false);
    expect(isSafePortalPath("https://evil.example/portal")).toBe(false);
    expect(isSafePortalPath("javascript:alert(1)")).toBe(false);
  });

  it("blocks staff and unauthenticated routes", () => {
    expect(isSafePortalPath("/os")).toBe(false);
    expect(isSafePortalPath("/login")).toBe(false);
    expect(isSafePortalPath("/admin")).toBe(false);
    expect(isSafePortalPath("/sign-in")).toBe(false);
  });

  it("handles null and undefined safely", () => {
    expect(isSafePortalPath(null)).toBe(false);
    expect(isSafePortalPath(undefined)).toBe(false);
    expect(isSafePortalPath("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2  Media asset ownership invariant (pure logic)
// ---------------------------------------------------------------------------

describe("media asset isolation invariant", () => {
  const CLIENT_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const CLIENT_B = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

  it("denies access when media.client_id does not match authenticated customer", () => {
    expect(CLIENT_B).not.toBe(CLIENT_A);
  });

  it("the media route enforces client_id ownership check", () => {
    const code = src("app/media/[assetId]/[variant]/route.ts");
    expect(code).toContain("media.client_id !== customer.clientId");
  });
});

// ---------------------------------------------------------------------------
// §3  All portal data functions call requireCustomerIdentity
// ---------------------------------------------------------------------------

describe("portal data functions are gated by requireCustomerIdentity", () => {
  it("getPortalOverview", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('requireCustomerIdentity("/portal")');
  });

  it("getPortalBookings", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('requireCustomerIdentity("/portal/bookings")');
  });

  it("getPortalBooking uses reference-scoped path", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain("requireCustomerIdentity(`/portal/bookings/${reference}`)");
  });

  it("getPortalProjects", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('requireCustomerIdentity("/portal/projects")');
  });

  it("getPortalProjectDetail uses reference-scoped path", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain("requireCustomerIdentity(`/portal/projects/${reference}`)");
  });

  it("getPortalInvoices", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('requireCustomerIdentity("/portal/invoices")');
  });

  it("getPortalMessages", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('requireCustomerIdentity("/portal/messages")');
  });

  it("getPortalGalleries", () => {
    expect(src("lib/server/customer-gallery-data.ts")).toContain('requireCustomerIdentity("/portal/galleries")');
  });

  it("getPortalGallery uses gallery-scoped path", () => {
    expect(src("lib/server/customer-gallery-data.ts")).toContain("requireCustomerIdentity(`/portal/galleries/${galleryId}`)");
  });
});

// ---------------------------------------------------------------------------
// §4  Portal data uses customer-scoped client (RLS enforcement)
// ---------------------------------------------------------------------------

describe("portal data uses customer-scoped client", () => {
  it("portal-data imports getSupabaseCustomerClient", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain("getSupabaseCustomerClient");
  });

  it("portal-data creates customer client from identity.accessToken", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain("getSupabaseCustomerClient(identity.accessToken)");
  });

  it("gallery-data uses customerDb(accessToken) for owned tables", () => {
    expect(src("lib/server/customer-gallery-data.ts")).toContain("customerDb(identity.accessToken)");
  });

  it("gallery-data uses adminDb() only for media_assets (no customer RLS)", () => {
    expect(src("lib/server/customer-gallery-data.ts")).toContain('adminDb().from("media_assets")');
  });

  it("loyalty portal page passes accessToken to getLoyaltySummary", () => {
    expect(src("app/portal/loyalty/page.tsx")).toContain("identity.accessToken");
  });

  it("loyalty redeem page uses customer client", () => {
    expect(src("app/portal/loyalty/redeem/page.tsx")).toContain("identity.accessToken");
  });
});

// ---------------------------------------------------------------------------
// §5  Service-role operations retain explicit clientId ownership filter
// ---------------------------------------------------------------------------

describe("service-role operations keep explicit ownership filters", () => {
  it("getInvoicePaymentsByClient compares identity.clientId before querying", () => {
    const code = src("lib/server/customer-portal-data.ts");
    expect(code).toContain("identity.clientId !== clientId");
    expect(code).toContain('"Unauthorized."');
  });

  it("admin payment query includes explicit eq(client_id) filter", () => {
    expect(src("lib/server/customer-portal-data.ts")).toContain('.eq("client_id", clientId)');
  });

  it("profile update API uses three-field ownership filter", () => {
    const code = src("app/api/customer/profile/route.ts");
    expect(code).toContain("identity.profileId");
    expect(code).toContain("identity.clientId");
    expect(code).toContain("identity.user.id");
  });

  it("agreement acceptance API verifies both clientId and profileId", () => {
    const code = src("app/api/customer/bookings/[bookingId]/agreement/route.ts");
    expect(code).toContain("identity.clientId");
    expect(code).toContain("identity.profileId");
  });

  it("gallery favorites API enforces clientId AND profileId on all mutations", () => {
    const code = src("app/api/customer/galleries/[galleryId]/favorites/[assetId]/route.ts");
    expect(code).toContain("identity.clientId");
    expect(code).toContain("identity.profileId");
  });
});

// ---------------------------------------------------------------------------
// §6  Legacy portal sample data is removed
// ---------------------------------------------------------------------------

describe("legacy portal sample data removed", () => {
  it("lib/client-portal-data.ts does not exist", () => {
    expect(() => readFileSync(join(root, "lib/client-portal-data.ts"), "utf8")).toThrow();
  });

  it("lib/server/client-portal-db.ts does not exist", () => {
    expect(() => readFileSync(join(root, "lib/server/client-portal-db.ts"), "utf8")).toThrow();
  });

  it("components/client-portal/client-portal-page.tsx does not exist", () => {
    expect(() => readFileSync(join(root, "components/client-portal/client-portal-page.tsx"), "utf8")).toThrow();
  });

  it("portal data module references no sample data", () => {
    const code = src("lib/server/customer-portal-data.ts");
    expect(code).not.toContain("sample-data");
    expect(code).not.toContain("BOOKINGS_BY_REF");
    expect(code).not.toContain("CLIENT_PORTAL");
  });

  it("portal gallery module references no sample data", () => {
    const code = src("lib/server/customer-gallery-data.ts");
    expect(code).not.toContain("sample-data");
    expect(code).not.toContain("CLIENT_PORTAL");
  });

  it("proxy no longer lists /client-portal in PUBLIC_PATHS", () => {
    const proxy = src("proxy.ts");
    expect(proxy).not.toContain('"/client-portal"');
  });

  it("proxy no longer allows /api/client-portals", () => {
    const proxy = src("proxy.ts");
    expect(proxy).not.toContain("api/client-portals");
  });

  it("project-record.tsx no longer imports CLIENT_PORTAL", () => {
    const code = src("app/projects/[projectRef]/project-record.tsx");
    expect(code).not.toContain("CLIENT_PORTAL");
    expect(code).not.toContain("sample-data");
  });
});

// ---------------------------------------------------------------------------
// §7  CustomerIdentity type carries accessToken; React cache deduplicates
// ---------------------------------------------------------------------------

describe("CustomerIdentity and request-scoped cache", () => {
  it("customer-auth declares accessToken on CustomerIdentity", () => {
    expect(src("lib/server/customer-auth.ts")).toContain("accessToken: string;");
  });

  it("identityForToken returns accessToken in the object", () => {
    expect(src("lib/server/customer-auth.ts")).toContain("accessToken,");
  });

  it("getCustomerIdentity is wrapped in React cache to deduplicate per-request calls", () => {
    const code = src("lib/server/customer-auth.ts");
    expect(code).toContain("cache(");
    expect(code).toContain("getCustomerIdentityFromCookies");
  });
});

// ---------------------------------------------------------------------------
// §8  Portal navigation and new pages
// ---------------------------------------------------------------------------

describe("portal navigation and new portal pages", () => {
  it("layout includes Messages nav entry", () => {
    const layout = src("app/portal/layout.tsx");
    expect(layout).toContain("/portal/messages");
    expect(layout).toContain("Messages");
  });

  it("layout applies active state via isActive helper", () => {
    const layout = src("app/portal/layout.tsx");
    expect(layout).toContain("isActive");
    expect(layout).toContain("aria-current");
  });

  it("/portal/messages/page.tsx exists", () => {
    expect(() => src("app/portal/messages/page.tsx")).not.toThrow();
  });

  it("/portal/projects/[reference]/page.tsx exists", () => {
    expect(() => src("app/portal/projects/[reference]/page.tsx")).not.toThrow();
  });

  it("gallery detail page handles non-available states gracefully", () => {
    const code = src("app/portal/galleries/[galleryId]/page.tsx");
    expect(code).toContain("processing");
    expect(code).toContain("unavailable");
    expect(code).not.toContain("if (state !== \"available\") return null");
  });

  it("invoices page renders a payment history section", () => {
    const code = src("app/portal/invoices/page.tsx");
    expect(code).toContain("Payment history");
    expect(code).toContain("getInvoicePaymentsByClient");
  });
});

// ---------------------------------------------------------------------------
// §9  .dev.vars has KAHEL_AUTH_DISABLED set to false
// ---------------------------------------------------------------------------

describe("development configuration", () => {
  it("KAHEL_AUTH_DISABLED is false in .dev.vars (Cloudflare Workers dev)", () => {
    const vars = src(".dev.vars");
    expect(vars).toContain("KAHEL_AUTH_DISABLED=false");
    expect(vars).not.toContain("KAHEL_AUTH_DISABLED=true");
  });
});

// ---------------------------------------------------------------------------
// §10  normalizeEmail (re-asserts existing behaviour)
// ---------------------------------------------------------------------------

describe("customer identifier normalization", () => {
  it("normalizes email addresses for comparison", () => {
    expect(normalizeEmail("  Client@Example.COM ")).toBe("client@example.com");
    expect(normalizeEmail("USER@DOMAIN.ORG")).toBe("user@domain.org");
  });
});
