import { expect, test, type Page } from "@playwright/test";

const glitch = {
  id: "ad000000-0000-4000-8000-000000000001", reference: "GL-2026-0001", title: "Client upload blocked", description: "A gallery upload stops before completion.", category: "Files", severity: "Critical", status: "Open", locationOrSystem: "Client Portal", operationsBlocked: true, workaround: "Upload in smaller batches.", resolutionSummary: null, reportedById: "ad000000-0000-4000-8000-000000000002", reportedBy: "Sofia Lim", assignedToId: "ad000000-0000-4000-8000-000000000003", assignedTo: "Paolo Cruz", resolvedBy: null, bookingId: null, booking: null, projectId: null, project: null, clientId: null, client: null, linkedTaskId: null, linkedTask: null, observedAt: "2026-08-09T08:00:00.000Z", resolvedAt: null, closedAt: null, createdAt: "2026-08-09T08:00:00.000Z", updatedAt: "2026-08-09T08:00:00.000Z", activities: [{ id: 1, eventType: "created", message: "Reported GL-2026-0001.", actor: "Sofia Lim", createdAt: "2026-08-09T08:00:00.000Z" }], attachments: [],
};
const workspace = { glitches: [glitch], staff: [{ id: "ad000000-0000-4000-8000-000000000002", name: "Sofia Lim" }, { id: "ad000000-0000-4000-8000-000000000003", name: "Paolo Cruz" }], bookings: [], projects: [], clients: [], tasks: [], viewer: { id: "ad000000-0000-4000-8000-000000000004", name: "Admin", role: "admin" } };

async function mockGlitches(page: Page) {
  await page.route("**/api/glitches", async (route) => {
    if (route.request().method() === "POST") return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "ad000000-0000-4000-8000-000000000005", reference: "GL-2026-0002" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(workspace) });
  });
  await page.route("**/api/glitches/*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updated: true }) }));
  await page.route("**/api/glitches/*/attachments", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

async function loadWorkspace(page: Page) {
  await page.goto("/glitches");
  const retry = page.getByRole("button", { name: "Try again" });
  if (await retry.isVisible()) await retry.click();
  await expect(page.getByText("GL-2026-0001")).toBeVisible();
}

test("reports, filters, opens, and resolves a glitch", async ({ page }) => {
  await mockGlitches(page);
  await loadWorkspace(page);
  await page.getByRole("button", { name: /Critical/ }).click();
  await expect(page.getByText("Severity: Critical")).toBeVisible();
  await page.getByText("GL-2026-0001").click();
  await expect(page.getByRole("dialog", { name: /Client upload blocked/ })).toBeVisible();
  await page.getByPlaceholder("Resolution summary").fill("Upload worker capacity restored.");
  await page.getByRole("button", { name: "Mark as resolved" }).click();
  await expect(page.getByText("Glitch updated")).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "Report Glitch" }).click();
  await page.getByLabel("Issue title").fill("Printer unavailable");
  await page.getByLabel("Description").fill("The front desk printer is offline.");
  await page.getByRole("button", { name: "Report Glitch" }).last().click();
  await expect(page.getByText("GL-2026-0002 reported")).toBeVisible();
});

test("supports dark mode and mobile cards without page overflow", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ks_theme", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGlitches(page);
  await loadWorkspace(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
  await expect(page.getByText("Operations blocked")).toBeVisible();
});
