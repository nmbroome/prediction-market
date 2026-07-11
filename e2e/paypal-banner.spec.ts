import { test, expect } from "@playwright/test";

// Verifies the PayPal reminder banner (src/components/MigrationBanner.tsx) for a
// logged-in user whose payment_method is NOT "PayPal". The authenticated session
// comes from global-setup, so the test account must have a non-PayPal (or empty)
// payment method for the banner to render.

test.describe("PayPal reminder banner", () => {
  test("renders for a non-PayPal user with a working Add PayPal CTA", async ({
    page,
  }) => {
    await page.goto("/");

    // The banner is anchored by its "Add PayPal" call-to-action link.
    const addPaypal = page.getByRole("link", { name: "Add PayPal" });
    await expect(addPaypal).toBeVisible();
    await expect(addPaypal).toHaveAttribute("href", "/profile");

    // Message must be one of the two supported variants (MTurk vs. no-info).
    const banner = page.locator("div", { has: addPaypal }).first();
    await expect(banner).toContainText(/PayPal/i);
    await expect(banner).toContainText(
      /(MTurk, which is being discontinued|don't have your PayPal info on file)/i
    );

    // Dismiss (×) should remove the banner for the rest of the session.
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(addPaypal).toHaveCount(0);
  });

  test("Add PayPal navigates to the profile page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Add PayPal" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});
