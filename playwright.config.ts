import { defineConfig, devices } from "@playwright/test";

// E2E tests run against a live deployment (default: production) using a
// dedicated test account. Auth is established once in global-setup and reused
// via a saved storageState, so no test ever types a password itself.
//
// Required env vars (put them in .env.local, which is gitignored):
//   PLAYWRIGHT_BASE_URL   – target site (defaults to the prod Vercel URL)
//   E2E_TEST_EMAIL        – test account email
//   E2E_TEST_PASSWORD     – test account password

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || "https://prediction-market-iota.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Reuse the authenticated session captured in global-setup.
    storageState: "e2e/.auth/state.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
