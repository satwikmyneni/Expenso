import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/demo"); await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true"); });

test("landing page leads to a complete sample workspace",async({page})=>{test.setTimeout(45_000);await page.goto("/");await expect(page.getByRole("heading",{name:/your money/i})).toBeVisible();await Promise.all([page.waitForURL("**/dashboard",{timeout:15_000}),page.getByRole("link",{name:"Explore sample workspace"}).click()]);await expect(page.getByRole("heading",{name:/^Good (morning|afternoon|evening),/})).toBeVisible();await expect(page.getByRole("heading",{name:"Dashboard"})).toHaveCount(0);await expect(page.getByText("Total balance",{exact:true})).toBeVisible()});

test("login keeps email and social options visible",async({page})=>{await page.goto("/login");await expect(page.getByRole("button",{name:/Continue with Google/})).toBeVisible();await expect(page.getByRole("button",{name:/Continue with Apple/})).toBeVisible();await expect(page.getByRole("button",{name:/Continue with Microsoft/})).toBeVisible();await expect(page.getByRole("button",{name:"Sign in"})).toBeVisible();await expect(page.getByRole("button",{name:"Email me a magic link"})).toBeVisible()});

test("protected routes reject an unauthenticated non-demo request",async({page,context})=>{await context.clearCookies();await page.goto("/accounts");await expect(page).toHaveURL(/\/login\?.*next=%2Faccounts/)});

test("invalid callbacks return safely to sign in",async({page})=>{await page.goto("/auth/callback?next=//attacker.example");await expect(page).toHaveURL(/\/login\?error=auth_callback/);await expect(page.getByRole("heading",{name:"Welcome back"})).toBeVisible()});

test("user can add and edit a historical transaction",async({page})=>{await page.goto("/transactions");await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");await page.getByRole("button",{name:"Add transaction"}).first().click();await page.getByLabel("Amount").fill("425.50");await page.getByLabel("Merchant / description").fill("E2E Cafe");await page.getByLabel("Date").fill("2025-03-14");await page.getByRole("button",{name:"Save transaction"}).click();await expect(page.getByText("E2E Cafe")).toBeVisible();await page.getByRole("button",{name:"Edit E2E Cafe"}).click();await page.getByLabel("Merchant / description").fill("E2E Cafe edited");await page.getByRole("button",{name:"Save changes"}).click();await expect(page.getByText("E2E Cafe edited")).toBeVisible()});

test("mobile navigation exposes the central quick add",async({page},testInfo)=>{test.skip(testInfo.project.name!=="mobile");await page.goto("/dashboard");await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");const quickAdd=page.getByRole("button",{name:"Add transaction"});await expect(quickAdd).toBeVisible();await quickAdd.click();await expect(page.getByRole("dialog")).toBeVisible()});

test("user can add a custom category",async({page})=>{await page.goto("/categories");await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");await page.getByRole("button",{name:"Add category"}).click();await page.getByLabel("Category name").fill("Pet care");await page.getByRole("button",{name:"Add category",exact:true}).last().click();await expect(page.getByText("Pet care",{exact:true})).toBeVisible()});

test("account management validates, edits, preserves context, and safely deletes",async({page})=>{
  await page.goto("/accounts");
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  await page.getByRole("button",{name:"Add account"}).click();
  await page.getByLabel("Account name").fill("E2E account");
  await page.getByRole("button",{name:"Add account",exact:true}).last().click();
  await expect(page.getByText("Institution name is required.")).toBeVisible();
  await page.getByLabel("Institution name").fill("HDFC Bank");
  await page.getByRole("button",{name:"Add account",exact:true}).last().click();

  let card=page.getByRole("article",{name:/E2E account/});
  await expect(card).toHaveAttribute("data-bank-brand","hdfc");
  await expect(card.getByRole("img",{name:"HDFC Bank logo"})).toBeVisible();
  const historyHref=await card.getByRole("link",{name:"Open transaction history for E2E account"}).getAttribute("href");
  await card.getByRole("button",{name:"Manage E2E account"}).click();
  await page.getByRole("menuitem",{name:"Edit account"}).click();
  await page.getByLabel("Institution name").fill("SBI");
  await page.getByRole("button",{name:"Save changes"}).click();
  card=page.getByRole("article",{name:/E2E account/});
  await expect(card).toHaveAttribute("data-bank-brand","sbi");
  await expect(card.locator("[data-bank-logo]")).toHaveCount(0);
  await expect(card.getByRole("link",{name:"Open transaction history for E2E account"})).toHaveAttribute("href",historyHref!);

  await card.getByRole("link",{name:"Open transaction history for E2E account"}).click();
  await expect(page).toHaveURL(new RegExp(`accountId=${historyHref!.split("accountId=")[1]}`));
  await expect(page.getByRole("heading",{name:"E2E account"})).toBeVisible();
  await expect(page.getByText(/Showing only/)).toContainText("E2E account");
  await page.reload();
  await expect(page.getByRole("heading",{name:"E2E account"})).toBeVisible();

  await page.goto("/accounts");
  card=page.getByRole("article",{name:/E2E account/});
  await card.getByRole("button",{name:"Manage E2E account"}).click();
  await page.getByRole("menuitem",{name:"Delete account"}).click();
  await expect(page.getByRole("dialog",{name:"Delete account?"})).toBeVisible();
  await page.getByRole("button",{name:"Delete account",exact:true}).click();
  await expect(page.getByRole("article",{name:/E2E account/})).toHaveCount(0);
});

test("an account with financial history is archived instead of destructively deleted",async({page})=>{
  await page.goto("/accounts");
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  const initialTransactions = await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2") ?? "{}").transactions?.length ?? 0);
  const account = page.getByRole("article",{name:/HDFC Salary/});
  await account.getByRole("button",{name:"Manage HDFC Salary"}).click();
  await page.getByRole("menuitem",{name:"Delete account"}).click();
  await expect(page.getByRole("dialog",{name:"Account cannot be deleted"})).toBeVisible();
  await page.getByRole("button",{name:"Archive account"}).click();
  await expect(account).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("article",{name:/HDFC Salary/})).toHaveCount(0);
  const finalTransactions = await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2") ?? "{}").transactions?.length ?? 0);
  expect(finalTransactions).toBe(initialTransactions);
});

test("goal contributions persist in history without creating spending",async({page})=>{
  await page.goto("/goals");
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  const initialTransactions = await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2") ?? "{}").transactions?.length ?? 0);
  const goal = page.locator(".card").filter({ hasText: "Emergency fund" }).first();
  await goal.getByRole("button",{name:"Add money"}).click();
  await page.getByLabel("Amount").fill("5000");
  await page.getByLabel("Date").fill("2026-09-05");
  await page.getByLabel("Note (optional)").fill("E2E allocation");
  await page.getByRole("button",{name:"Add contribution"}).click();
  await expect(goal.getByText("E2E allocation",{exact:false})).toBeVisible();
  await page.reload();
  const refreshedGoal = page.locator(".card").filter({ hasText: "Emergency fund" }).first();
  await expect(refreshedGoal.getByText("E2E allocation",{exact:false})).toBeVisible();
  await refreshedGoal.getByRole("button",{name:/Edit .* contribution/}).last().click();
  await page.getByLabel("Amount").fill("6000");
  await page.getByLabel("Note (optional)").fill("E2E allocation edited");
  await page.getByRole("button",{name:"Save changes"}).click();
  await expect(refreshedGoal.getByText("E2E allocation edited",{exact:false})).toBeVisible();
  await refreshedGoal.getByRole("button",{name:/Remove .* contribution/}).last().click();
  await page.getByRole("button",{name:"Remove contribution",exact:true}).click();
  await expect(refreshedGoal.getByText("E2E allocation edited",{exact:false})).toHaveCount(0);
  const finalTransactions = await page.evaluate(() => JSON.parse(localStorage.getItem("expenso-demo-data-v2") ?? "{}").transactions?.length ?? 0);
  expect(finalTransactions).toBe(initialTransactions);
});

test("credit-card account cards show liability limits and due details",async({page})=>{
  await page.goto("/accounts");
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  const card = page.getByRole("article",{name:/Regalia Gold, Credit card/});
  await expect(card.getByText("Used",{exact:true})).toBeVisible();
  await expect(card.getByText("Credit limit",{exact:true})).toBeVisible();
  await expect(card.getByText("Available",{exact:false})).toBeVisible();
  await expect(card.getByText(/Due/)).toBeVisible();
});

test("dashboard features the highest positive asset instead of available credit",async({page})=>{
  await page.goto("/dashboard");
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
  const featured = page.locator("aside").getByRole("article").first();
  await expect(featured).toHaveAttribute("data-account-visual","bank");
  await expect(featured).toHaveAccessibleName(/HDFC Salary/);
  await expect(featured).not.toHaveAccessibleName(/Regalia Gold/);
});
