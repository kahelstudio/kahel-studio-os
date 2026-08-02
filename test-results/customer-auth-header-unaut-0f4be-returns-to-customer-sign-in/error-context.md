# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-auth-header.spec.ts >> unauthenticated portal access returns to customer sign in
- Location: tests/visual/customer-auth-header.spec.ts:35:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/sign-in\?next=%2Fportal%2Fbookings$/
Received string:  "http://127.0.0.1:3000/sign-in?next=%2Fportal"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en" data-theme="light" data-theme-preference="system" class="__variable_9dd457 __variable_8b3a0b h-full antialiased">…</html>
       - unexpected value "http://127.0.0.1:3000/sign-in?next=%2Fportal"

```

```yaml
- main:
  - region "Welcome back":
    - complementary "Kahel Studio customer portal":
      - link "Kahel Studio home":
        - /url: /
        - img "Kahel Studio"
      - paragraph: Your story, kept in one place.
      - paragraph: Review sessions, follow project updates, and access your studio deliveries.
    - paragraph: Customer portal
    - heading "Welcome back" [level=1]
    - paragraph: Sign in to view your sessions, projects, and studio deliveries.
    - text: Email address
    - textbox "Email address":
      - /placeholder: you@example.com
    - text: Password
    - textbox "Password"
    - button "Show password"
    - link "Forgot password?":
      - /url: /forgot-password
    - button "Sign in"
    - text: New to Kahel Studio?
    - link "Create an account":
      - /url: /sign-up
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("desktop header keeps sign in secondary and booking primary", async ({ page }) => {
  4  |   await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) }));
  5  |   await page.setViewportSize({ width: 1440, height: 900 });
  6  |   await page.goto("/");
  7  |   await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  8  |   await expect(page.getByRole("button", { name: "Book now" })).toBeVisible();
  9  | });
  10 | 
  11 | test("authenticated desktop header exposes only customer account links", async ({ page }) => {
  12 |   await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true, firstName: "Ana" }) }));
  13 |   await page.setViewportSize({ width: 1440, height: 900 });
  14 |   await page.goto("/");
  15 |   await page.getByRole("button", { name: "My account" }).focus();
  16 |   await expect(page.getByRole("menuitem", { name: "Client Portal" })).toBeVisible();
  17 |   await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();
  18 |   await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  19 |   await expect(page.getByRole("link", { name: /payroll|staff|os/i })).toHaveCount(0);
  20 | });
  21 | 
  22 | for (const viewport of [{ name: "iPad", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
  23 |   test(`${viewport.name} menu keeps customer access and booking available`, async ({ page }) => {
  24 |     await page.route("**/api/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) }));
  25 |     await page.setViewportSize(viewport);
  26 |     await page.goto("/");
  27 |     await page.getByRole("button", { name: "Open menu" }).click();
  28 |     await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  29 |     await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Book now" })).toBeVisible();
  30 |     await page.keyboard.press("Escape");
  31 |     await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  32 |   });
  33 | }
  34 | 
  35 | test("unauthenticated portal access returns to customer sign in", async ({ page }) => {
  36 |   await page.context().clearCookies();
  37 |   await page.goto("/portal/bookings");
> 38 |   await expect(page).toHaveURL(/\/sign-in\?next=%2Fportal%2Fbookings$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  39 |   await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  40 | });
  41 | 
  42 | test("sign-in password visibility is keyboard accessible", async ({ page }) => {
  43 |   await page.goto("/sign-in");
  44 |   const password = page.getByLabel("Password", { exact: true });
  45 |   await password.fill("CustomerPassword1!");
  46 |   await page.getByRole("button", { name: "Show password" }).focus();
  47 |   await page.keyboard.press("Enter");
  48 |   await expect(password).toHaveAttribute("type", "text");
  49 | });
  50 | 
```