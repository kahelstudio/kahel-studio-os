import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CI ? "npx next dev" : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, KAHEL_AUTH_DISABLED: "true" },
  },
});
