import { expect, test } from "@playwright/test";

const IS_CI = Boolean(process.env.CI);

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`Reports dashboard at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", viewport.width);
    if (!IS_CI) await expect(page).toHaveScreenshot(`reports-${viewport.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test(`Tasks dashboard at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tasks/board");
    await expect(page.getByRole("heading", { name: "Studio operations" })).toBeVisible();

    const board = page.locator("main.min-w-0");
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", viewport.width);
    await expect(board.locator(":scope > div")).toHaveCSS("min-width", "1040px");
    if (!IS_CI) await expect(page).toHaveScreenshot(`tasks-${viewport.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
}
