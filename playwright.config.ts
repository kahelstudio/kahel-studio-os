import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL: process.env.CI ? "http://127.0.0.1:3000" : "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CI ? "npx next dev" : "npm run build && npx next start --port 3100",
    url: process.env.CI ? "http://127.0.0.1:3000" : "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { ...process.env, KAHEL_AUTH_DISABLED: "true" },
  },
});
