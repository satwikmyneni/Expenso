import { expect, test } from "@playwright/test";

test("corrected credit-card outstanding stays 3000 after saving and refreshing", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Total balance", { exact: true })).toBeVisible();
  await page.goto("/accounts");
  const card = page.getByRole("article", { name: /Regalia Gold, Credit card/ });
  await expect(card).toBeVisible();
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions);
  await card.getByRole("button", { name: "Manage Regalia Gold" }).click();
  await page.getByRole("menuitem", { name: "Edit account" }).click();
  await page.getByLabel("Current outstanding").fill("3000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(card.locator('[data-testid="credit-card-metrics"]')).toContainText("3,000");
  await page.reload();
  await expect(card.locator('[data-testid="credit-card-metrics"]')).toContainText("3,000");
  await card.getByRole("button", { name: "Manage Regalia Gold" }).click();
  await page.getByRole("menuitem", { name: "Edit account" }).click();
  await expect(page.getByLabel("Current outstanding")).toHaveValue("3000.00");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions)).toEqual(history);
});
