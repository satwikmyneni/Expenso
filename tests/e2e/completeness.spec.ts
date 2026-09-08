import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixture = (name:string) => fileURLToPath(new URL(`../fixtures/imports/${name}`,import.meta.url));
test.beforeEach(async ({page})=>{
  await page.goto("/demo");
  await page.waitForFunction(()=>document.documentElement.dataset.hydrated==="true");
  await page.waitForFunction(()=>Boolean(localStorage.getItem("expenso-demo-data-v2")));
});

async function noOverflow(page:Page) {
  const layout = await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    width:document.documentElement.scrollWidth,
    offenders:[...document.querySelectorAll("main *")].filter((node)=>node.getBoundingClientRect().right>innerWidth+1).slice(0,5).map((node)=>({tag:node.tagName,classes:node.className})),
  }));
  expect(layout.width,JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
}

for(const width of [320,375,390,393,414]) {
  test(`responsive pages, filters and modals fit ${width}px`,async({page},info)=>{
    test.setTimeout(180_000);
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    await page.setViewportSize({width,height:844});
    for(const route of ["dashboard","transactions","accounts","categories","goals","budgets","recurring","insights","calendar","imports","imports?mode=receipt","settings"]) {
      await page.goto("/"+route);
      await page.waitForFunction(()=>document.documentElement.dataset.hydrated==="true");
      await expect(page.locator("main h1")).toBeVisible();
      await noOverflow(page);
      if(route==="dashboard"||route==="insights") await page.screenshot({path:info.outputPath(`${route}-${width}.png`),fullPage:true});
      if(route==="transactions") {
        await page.getByRole("button",{name:"Filters",exact:true}).click();
        await page.getByRole("combobox",{name:"Date",exact:true}).selectOption("custom");
        await expect(page.getByLabel("From",{exact:true})).toBeVisible();await noOverflow(page);
        await page.locator("main").getByRole("button",{name:"Add transaction",exact:true}).click();
        await page.getByLabel("Merchant / description").fill("Long merchant ".repeat(15));
        await page.getByLabel("Reference / UTR").fill("SANITIZED-REFERENCE-".repeat(20));
        await noOverflow(page);await page.getByRole("button",{name:"Cancel",exact:true}).click();
      }
      if(route==="imports") {
        await page.locator('input[type="file"][accept*=".txt"]').setInputFiles(fixture("indian-bank-statement.txt"));
        await expect(page.getByText(/13 rows/).first()).toBeVisible();await noOverflow(page);
        await page.screenshot({path:info.outputPath(`import-review-${width}.png`),fullPage:true});
      }
    }
    expect(errors).toEqual([]);
  });
}

test("dashboard links reach existing entity management and editors",async({page})=>{
  for(const [selector,url] of [
    ['a[href="/transactions"]',/\/transactions$/],
    ['a[href^="/transactions?id="]',/\/transactions\?id=/],
    ['a[href^="/transactions?accountId="]',/\/transactions\?accountId=/],
    ['a[href^="/transactions?category="]',/\/transactions\?category=/],
    ['a[href^="/goals#goal-"]',/\/goals#goal-/],
    ['a[href^="/budgets#budget-"]',/\/budgets#budget-/],
    ['a[href^="/recurring#item-"]',/\/recurring#item-/],
    ['a[href="/insights"]',/\/insights$/],
  ] as const) {
    await page.goto("/dashboard");
    await page.locator("main").locator(selector).first().click();
    await expect(page).toHaveURL(url);
    if(String(url).includes("id=")) await expect(page.getByRole("dialog",{name:"Edit transaction"})).toBeVisible();
    else await expect(page.locator("main h1")).toBeVisible();
  }
});

test("goal, budget and bill edits persist; archives preserve transactions",async({page})=>{
  test.setTimeout(90_000);
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions.length);
  await page.goto("/goals");
  const goal=page.locator('[id^="goal-"]').filter({hasText:"Emergency fund"});
  await goal.getByRole("button",{name:"Edit goal",exact:true}).click();
  await page.getByLabel("Target amount").fill("350000");
  await page.getByLabel("Description",{exact:true}).fill("Sanitized edited goal");
  await page.getByRole("button",{name:"Save goal",exact:true}).click();
  await expect(goal.getByText("Sanitized edited goal")).toBeVisible();await page.reload();
  await expect(goal.getByText("Sanitized edited goal")).toBeVisible();
  await page.goto("/budgets");
  const budget=page.locator('[id^="budget-"]').first();
  await budget.getByRole("button",{name:"Edit budget"}).click();
  await page.getByLabel("Budget name").fill("Edited monthly plan");
  await page.getByLabel("Budget limit").fill("25000");
  await page.getByRole("button",{name:"Save budget"}).click();await page.reload();
  await expect(page.getByText("Edited monthly plan",{exact:true})).toBeVisible();
  await page.goto("/recurring");
  await page.locator('[id^="item-"]').first().getByRole("button",{name:/^Edit (bill|subscription|recurring)$/}).click();
  await page.getByLabel("Name",{exact:true}).fill("Edited recurring record");
  await page.getByRole("button",{name:"Save recurring"}).click();await page.reload();
  await expect(page.getByText("Edited recurring record",{exact:true})).toBeVisible();
  page.on("dialog",dialog=>dialog.accept());
  await page.locator('[id^="item-"]').filter({hasText:"Edited recurring record"}).getByRole("button",{name:"Archive",exact:true}).click();
  await expect(page.getByText("Edited recurring record",{exact:true})).toHaveCount(0);await page.reload();
  await expect(page.getByText("Edited recurring record",{exact:true})).toHaveCount(0);
  await page.goto("/goals");await goal.getByRole("button",{name:"Archive goal"}).click();
  await expect(goal).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions.length)).toBe(count);
});

test("historical selectors, drilldowns, edits and combined filters use selected dates",async({page})=>{
  test.setTimeout(90_000);
  // Only explicit, isolated sample storage is populated. No live Supabase calls.
  await page.evaluate(()=>{
    const data=JSON.parse(localStorage.getItem("expenso-demo-data-v2")!);
    data.transactions=[7,8,9].flatMap((month)=>["income","expense"].map((type)=>({
      id:`historical-${month}-${type}`,accountId:data.accounts[0].id,categoryId:data.categories[0].id,type,
      amountMinor:`${(month-6)*(type==="income"?1000000:400000)}n`,currency:"INR",date:`2026-0${month}-10`,
      occurredAt:`2026-0${month}-10T12:00:00.000Z`,createdAt:"2026-09-01T12:00:00.000Z",updatedAt:"2026-09-01T12:00:00.000Z",
      merchant:`Historical ${month} ${type}`,tags:[],source:"manual",metadata:{},
    })));
    localStorage.setItem("expenso-demo-data-v2",JSON.stringify(data));
  });
  for(const [month,income,expense] of [["07","10,000","4,000"],["08","20,000","8,000"],["09","30,000","12,000"]]) {
    await page.goto(`/insights?month=2026-${month}`);
    await expect(page.locator('main a').filter({has:page.getByText("Income",{exact:true})}).first()).toContainText(income);
    await expect(page.locator('main a').filter({has:page.getByText("Expenses",{exact:true})}).first()).toContainText(expense);
  }
  await page.getByLabel("Trend length").selectOption("12");
  await page.getByRole("link",{name:/Largest expense/}).click();
  await expect(page.getByRole("dialog",{name:"Edit transaction"})).toBeVisible();
  await page.getByLabel("Amount").fill("9000");await page.getByLabel("Date",{exact:true}).fill("2026-08-12");
  await page.getByRole("button",{name:"Save changes"}).click();
  await page.goto("/insights?month=2026-09");
  await expect(page.locator('main a').filter({has:page.getByText("Expenses",{exact:true})}).first()).toContainText("₹0");
  await page.goto("/insights?month=2026-08");
  await expect(page.locator('main a').filter({has:page.getByText("Expenses",{exact:true})}).first()).toContainText("17,000");
  await page.getByLabel("Report month").fill("2025-01");await expect(page.getByText("No financial activity for this period.")).toBeVisible();
  await page.getByLabel("Report view").selectOption("yearly");await page.getByLabel("Report year").fill("2024");
  await expect(page.getByTestId("selected-period")).toHaveText("2024");await expect(page.getByText("No financial activity for this period.")).toBeVisible();
  await page.goto("/transactions");await page.getByRole("button",{name:"Filters",exact:true}).click();
  await page.getByRole("combobox",{name:"Date",exact:true}).selectOption("custom");
  await page.getByLabel("From",{exact:true}).fill("2026-08-01");await page.getByLabel("To",{exact:true}).fill("2026-08-31");
  await page.getByRole("button",{name:"Apply date range"}).click();
  await page.getByRole("combobox",{name:"Type",exact:true}).selectOption("expense");
  await page.getByLabel("Search transactions",{exact:true}).fill("Historical");
  await page.getByLabel("Minimum amount").fill("8500");await page.getByLabel("Sort transactions").selectOption("amount_desc");
  await expect(page.getByRole("button",{name:"Edit Historical 9 expense",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Edit Historical 8 expense",exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole("button",{name:"Edit Historical 9 expense",exact:true})).toBeVisible();
});

test("local OCR reads a synthetic receipt and waits for review",async({page},info)=>{
  test.setTimeout(180_000);
  await page.goto("/imports?mode=receipt");
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions.length);
  await page.locator('input[type="file"][accept*=".jpg"]').setInputFiles(fixture("synthetic-restaurant-receipt.png"));
  await expect(page.getByRole("heading",{name:"Confirm the transaction"})).toBeVisible({timeout:120_000});
  await expect(page.getByLabel("Amount",{exact:true})).not.toHaveValue("");
  await expect(page.getByLabel("Merchant",{exact:true})).not.toHaveValue("");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("expenso-demo-data-v2")!).transactions.length)).toBe(count);
  await noOverflow(page);await page.screenshot({path:info.outputPath("actual-local-ocr-review.png"),fullPage:true});
});
