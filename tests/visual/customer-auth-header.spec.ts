import { expect, test } from "@playwright/test";

test("desktop header shows sign in for unauthenticated users", async ({ page }) => {
  await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("authenticated desktop header exposes only customer account links", async ({ page }) => {
  await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true, firstName: "Ana" }) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "My account" }).focus();
  await expect(page.getByRole("menuitem", { name: "Client Portal" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("link", { name: /payroll|staff|os/i })).toHaveCount(0);
});

for (const viewport of [{ name: "iPad", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`${viewport.name} menu keeps customer access and booking available`, async ({ page }) => {
    await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) }));
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Book now" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
}

test("unauthenticated portal access returns to customer sign in", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/portal/bookings");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fportal%2Fbookings$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("sign-in password visibility is keyboard accessible", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("CustomerPassword1!");
  await page.getByRole("button", { name: "Show password" }).focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
});
