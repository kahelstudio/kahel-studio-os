import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "ipad", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  test(`register workspace renders on ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      const expectedDataFallback = /table not available|Client portal access lookup failed|Failed to load resource/.test(text);
      if (message.type() === "error" && !expectedDataFallback) consoleErrors.push(text);
    });

    await page.setViewportSize(viewport);
    const response = await page.goto("/pos/register", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Register", exact: true })).toBeVisible();
    await expect(page.getByText("Open, count, and independently review physical cash.")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
}
