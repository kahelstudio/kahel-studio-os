# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboards.spec.ts >> Reports dashboard at mobile
- Location: tests/visual/dashboards.spec.ts:10:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Reports', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Reports', exact: true })

```

```yaml
- main:
  - img "Kahel Studio"
  - paragraph: Studio operations
  - heading "Welcome back" [level=1]
  - paragraph: Sign in to manage bookings, projects, clients, and studio delivery.
  - text: Email
  - textbox "Email":
    - /placeholder: you@example.com
  - text: Password
  - textbox "Password Show password"
  - button "Show password"
  - button "Forgot password?"
  - button "Sign in"
  - text: or
  - button "Continue with Google"
  - paragraph: Need staff access? Contact your Kahel Studio administrator.
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const viewports = [
  4  |   { name: "mobile", width: 390, height: 844 },
  5  |   { name: "tablet", width: 768, height: 1024 },
  6  |   { name: "desktop", width: 1440, height: 1000 },
  7  | ] as const;
  8  | 
  9  | for (const viewport of viewports) {
  10 |   test(`Reports dashboard at ${viewport.name}`, async ({ page }) => {
  11 |     await page.setViewportSize(viewport);
  12 |     await page.goto("/reports");
> 13 |     await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
     |                                                                               ^ Error: expect(locator).toBeVisible() failed
  14 |     await expect(page.locator("html")).toHaveJSProperty("scrollWidth", viewport.width);
  15 |     await expect(page).toHaveScreenshot(`reports-${viewport.name}.png`, { fullPage: true });
  16 |   });
  17 | 
  18 |   test(`Tasks dashboard at ${viewport.name}`, async ({ page }) => {
  19 |     await page.setViewportSize(viewport);
  20 |     await page.goto("/tasks/board");
  21 |     await expect(page.getByRole("heading", { name: "Studio operations" })).toBeVisible();
  22 | 
  23 |     const board = page.locator("main.min-w-0");
  24 |     // The Kanban lanes intentionally scroll inside the content region on narrow screens.
  25 |     await expect(page.locator("html")).toHaveJSProperty("scrollWidth", viewport.width);
  26 |     await expect(board.locator(":scope > div")).toHaveCSS("min-width", "1040px");
  27 |     await expect(page).toHaveScreenshot(`tasks-${viewport.name}.png`, { fullPage: true });
  28 |   });
  29 | }
  30 | 
```