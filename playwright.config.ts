import { defineConfig } from "@playwright/test";

const isolatedDevServer = process.env.PLAYWRIGHT_DEV_SERVER === "true";
const port = process.env.PLAYWRIGHT_PORT ?? (process.env.CI ? "3000" : "3100");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CI || isolatedDevServer ? `npx next dev --port ${port}` : `npm run build && npx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { ...process.env, KAHEL_AUTH_DISABLED: "true" },
  },
});
