import { test, expect } from "@playwright/test";

test.beforeEach(async ({page})=>{
  await page.goto("/demo");
  await page.waitForFunction(()=>document.documentElement.dataset.hydrated==="true");
  await page.waitForFunction(()=>Boolean(localStorage.getItem("expenso-demo-data-v2")));
});

test("account inactive status survives reload and retains history",async({page})=>{
  await page.goto("/accounts");
  const account=page.getByRole("article",{name:/HDFC Salary/});
  await account.getByRole("button",{name:"Manage HDFC Salary"}).click();
  await page.getByRole("menuitem",{name:"Mark as Inactive"}).click();
  await expect(account.getByText("inactive",{exact:true})).toBeVisible();
  await page.reload();await expect(account.getByText("inactive",{exact:true})).toBeVisible();
  await account.getByRole("link",{name:"Open transaction history for HDFC Salary"}).click();
  await expect(page).toHaveURL(/accountId=/);
  await expect(page.getByText(/Inactive/).first()).toBeVisible();
  await page.locator("main").getByRole("button",{name:"Add transaction"}).click();
  await expect(page.getByRole("dialog").getByLabel("Account",{exact:true}).locator('option').filter({hasText:"HDFC Salary"})).toHaveCount(0);
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.goto("/accounts");await account.getByRole("button",{name:"Manage HDFC Salary"}).click();
  await page.getByRole("menuitem",{name:"Mark as Active"}).click();
  await page.reload();await expect(account.getByText("active",{exact:true})).toBeVisible();
});

test("category deletion reassigns persisted transactions without archiving",async({page})=>{
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions);
  await page.goto("/categories");
  await expect(page.getByRole("button",{name:"Delete Uncategorized",exact:true})).toHaveCount(0);
  page.on("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Delete Food & dining",exact:true}).click();
  await expect(page.getByRole("button",{name:"Delete Food & dining",exact:true})).toHaveCount(0);
  await page.reload();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!));
  expect(after.categories.some((row:{name:string})=>row.name==="Food & dining")).toBe(false);
  expect(after.categories.some((row:{name:string})=>row.name==="Archived")).toBe(false);
  expect(after.transactions.length).toBe(before.length);
  const fallback=after.categories.find((row:{name:string})=>row.name==="Uncategorized");
  expect(fallback.isDefault).toBe(true);
  expect(after.transactions.some((row:{categoryId:string})=>row.categoryId===fallback.id)).toBe(true);
});

test("contributions can be edited and removed before permanently deleting a goal",async({page})=>{
  await page.goto("/goals");
  const goal=page.locator('[id^="goal-"]').filter({hasText:"Emergency fund"});
  await goal.getByRole("button",{name:"Add money"}).click();
  await page.getByLabel("Amount",{exact:true}).fill("123");
  await page.getByLabel("Note (optional)").fill("Managed allocation");
  await page.getByRole("button",{name:"Add contribution",exact:true}).click();
  await expect(goal.getByText(/Managed allocation/)).toBeVisible();
  await goal.getByRole("button",{name:/Edit .*123.* contribution/}).click();
  await page.getByLabel("Amount",{exact:true}).fill("124");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await goal.getByRole("button",{name:/Remove .*124.* contribution/}).click();
  await page.getByRole("button",{name:"Remove contribution",exact:true}).click();
  await expect(goal.getByText(/Managed allocation/)).toHaveCount(0);
  page.on("dialog",dialog=>dialog.accept());
  await goal.getByRole("button",{name:"Delete goal",exact:true}).click();await expect(goal).toHaveCount(0);
  await page.reload();await expect(goal).toHaveCount(0);
});

for(const width of [375,390,393]) test(`filters scroll internally at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto("/transactions");
  const chips=page.getByLabel("Quick transaction filters");
  const sizes=await chips.evaluate((node)=>{node.scrollLeft=200;return {width:node.clientWidth,content:node.scrollWidth,scroll:node.scrollLeft};});
  expect(sizes.content).toBeGreaterThan(sizes.width);expect(sizes.scroll).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  const nav=await page.getByRole("navigation",{name:"Mobile navigation"}).boundingBox();
  expect(nav!.x).toBeGreaterThanOrEqual(0);expect(nav!.x+nav!.width).toBeLessThanOrEqual(width);
  const add=await page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("button",{name:"Add transaction"}).boundingBox();
  expect(add!.x+add!.width).toBeLessThanOrEqual(width);
});
