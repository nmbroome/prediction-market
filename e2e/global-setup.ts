import { chromium, type FullConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load .env.local so credentials live in a gitignored file, never in source.
loadEnv({ path: ".env.local" });

const AUTH_FILE = "e2e/.auth/state.json";

// Logs the dedicated test account in ONCE through the real UI, then persists
// the browser storage (localStorage holds the Supabase session that the
// MigrationBanner reads via createClient.ts). Every spec reuses this session,
// so no individual test handles the password.
async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "https://prediction-market-iota.vercel.app";

  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set (in .env.local). " +
        "See playwright.config.ts for the full list of required env vars."
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/auth`);
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Wait for the Supabase session to be written to localStorage. The key is
  // `sb-<project-ref>-auth-token`; we poll for any such key rather than hard-
  // coding the ref so this survives a project change.
  await page.waitForFunction(
    () =>
      Object.keys(window.localStorage).some(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      ),
    undefined,
    { timeout: 15_000 }
  );

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  await browser.close();
}

export default globalSetup;
