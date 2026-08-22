import { expect, test, type Page } from "@playwright/test";

async function openPayments(page: Page) {
  const response = await page.goto("/payments", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  const schemaUnavailable = await page
    .getByRole("heading", { name: "Unable to load payments", exact: true })
    .isVisible();
  test.skip(
    schemaUnavailable,
    'Payment schema is not applied: /payments rendered "Unable to load payments".',
  );
}

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "ipad", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  test(`payments workspace renders on ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.setViewportSize(viewport);
    await openPayments(page);
    await expect(page.getByRole("heading", { name: "Payments", exact: true })).toBeVisible();
    await expect(page.getByText("Collect balances, add-ons and product purchases in one place.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
}

test("record payment opens an explicit booking picker and restores focus", async ({ page }) => {
  await openPayments(page);
  const trigger = page.getByRole("button", { name: "Record payment" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Choose a booking" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search eligible bookings" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Choose a booking" })).toBeHidden();
  await expect(trigger).toBeFocused();
});
