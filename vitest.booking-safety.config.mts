import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Phase 4 booking-safety harness: LOCAL Supabase only, real route handlers + RPCs, concurrent requests.
// Run with: npm run test:booking-safety   (never part of `npm test`)
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/unit/server-only.ts", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/booking-safety/**/*.test.ts"],
    setupFiles: ["tests/booking-safety/setup.ts"],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
