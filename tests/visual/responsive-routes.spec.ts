import { expect, test, type Page, type Response } from "@playwright/test";

test.setTimeout(180_000);
test.skip(Boolean(process.env.CI), "Requires local application data services");

const routes = [
  "/", "/attendance/engagements", "/attendance/timesheets", "/booking/calendar", "/booking/emails",
  "/booking/list", "/client-portal", "/compliance/dashboard", "/compliance/register", "/crm/accounts",
  "/crm/queue", "/dashboard", "/docs", "/feedback/myreports", "/feedback/report", "/finance/expenses",
  "/finance/invoices", "/finance/payments", "/finance/reconciliation", "/finance/sales", "/glitches/closed",
  "/glitches/open", "/help", "/inventory/checkouts", "/inventory/equipment", "/login", "/logs",
  "/maintenance/history", "/maintenance/schedule", "/marketing/attribution", "/marketing/campaigns", "/os",
  "/payroll/adjustments", "/payroll/audit", "/payroll/contributions", "/payroll/employees",
  "/payroll/overview", "/payroll/payslips", "/payroll/reports", "/payroll/runs", "/payroll/settings", "/payroll/states",
  "/payroll/thirteenth", "/performance/goals", "/performance/me", "/performance/reviews",
  "/policies/health-safety", "/policies/it", "/policies/policies", "/pos/bookings", "/pos/cat-addons",
  "/pos/cat-events", "/pos/cat-rentals", "/pos/cat-retail", "/pos/cat-sessions", "/pos/sale",
  "/preferences/appearance", "/preferences/general", "/preferences/notifications", "/profile/emergency",
  "/profile/me", "/profile/security", "/projects/deliveries", "/projects/pipeline", "/quotation/drafts",
  "/quotation/list", "/recruitment/candidates", "/recruitment/checklist", "/recruitment/departures",
  "/recruitment/hires", "/recruitment/roles", "/recruitment/templates", "/reports", "/reset-password",
  "/settings/audit", "/settings/billing", "/settings/general", "/settings/payroll", "/settings/team",
  "/shiftboard", "/shiftboard/next-month", "/shiftboard/next-week", "/tasks/board", "/tasks/mine", "/usage",
  "/website/pages", "/website/portfolio",
] as const;

async function expectResponsivePage(page: Page, route: string) {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  const onConsole = (message: { type: () => string; text: () => string }) => {
    const text = message.text();
    const expectedDataFallback = /table not available|Client portal access lookup failed|Failed to load resource/.test(text);
    if (message.type() === "error" && !expectedDataFallback) errors.push(text);
  };
  const onResponse = (response: Response) => {
    const url = new URL(response.url());
    const expectedTasksFallback = response.status() === 401
      && url.pathname === "/api/tasks"
      && url.searchParams.get("mine") === "true";
    if (response.status() >= 400 && response.request().resourceType() !== "document" && !expectedTasksFallback) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  };
  page.on("console", onConsole);
  page.on("response", onResponse);
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), route).toBeLessThan(400);
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document, `${route} document overflow`).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body, `${route} body overflow`).toBeLessThanOrEqual(widths.viewport + 1);
  expect(errors, `${route} console errors`).toEqual([]);
  expect(failedResponses, `${route} failed resources`).toEqual([]);
  page.removeListener("console", onConsole);
  page.removeListener("response", onResponse);
}

for (const viewport of [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-393", width: 393, height: 852 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-810-portrait", width: 810, height: 1080 },
  { name: "ipad-large-portrait", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-large-landscape", width: 1180, height: 820 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "large-desktop", width: 1920, height: 1080 },
]) {
  test(`all routes reflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of routes) await expectResponsivePage(page, route);
  });
}
