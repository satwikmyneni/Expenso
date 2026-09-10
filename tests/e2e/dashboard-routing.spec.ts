import { expect, test } from "@playwright/test";

const routes = ["/dashboard", "/transactions", "/categories", "/goals", "/accounts", "/insights", "/imports", "/more"];

test("dashboard direct requests preserve the unauthenticated login flow", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login\?.*next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

// The E2E server has no Supabase configuration. Explicit sample mode verifies
// route rendering only; it is not evidence of a successful Supabase sign-in.
test("existing sample dashboard survives direct navigation and refresh", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
  const direct = await page.goto("/dashboard");
  expect(direct?.status()).toBe(200);
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
  const refreshed = await page.reload();
  expect(refreshed?.status()).toBe(200);
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
});

for (const route of routes) {
  test(`existing sample workspace resolves ${route}`, async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("This page could not be found.", { exact: true })).toHaveCount(0);
  });
}


test("dashboard navigation links resolve to existing pages", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/demo");
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute("href")!.split("#")[0]))],
  );
  for (const href of hrefs) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
  }
  for (const route of ["/transactions", "/accounts", "/categories", "/goals", "/insights", "/imports"]) {
    await page.goto("/dashboard");
    await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
    const directLink = page.locator(`a[href="${route}"]:visible`).first();
    if (!await directLink.count()) {
      await page.locator('a[href="/more"]:visible').click();
    }
    await page.locator(`a[href="${route}"]:visible`).first().click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("main")).toBeVisible();
  }
});
