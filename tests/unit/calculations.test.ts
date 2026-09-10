import { describe, expect, it } from "vitest";
import { accountBalance, budgetProgress, expenseTotal, netWorth, savingsRate } from "@/features/finance/calculations";
import type { Account, Budget, FinanceTransaction } from "@/features/finance/types";

const account = (id: string, type: Account["type"], opening = 0n): Account => ({ id, name:id, type, currency:"INR", openingBalanceMinor:opening, color:"#000", includeInAnalytics:true, includeInNetWorth:true, archived:false });
const transaction = (id:string,type:FinanceTransaction["type"],amount:bigint,accountId="bank",extra:Partial<FinanceTransaction>={}):FinanceTransaction=>({id,type,amountMinor:amount,accountId,currency:"INR",date:"2026-09-03",merchant:"Test",tags:[],source:"manual",createdAt:"",updatedAt:"",...extra});

describe("finance calculations",()=>{
  it("excludes transfers and subtracts refunds from net spending",()=>expect(expenseTotal([transaction("e","expense",1000n),transaction("r","refund",300n),transaction("t","transfer",5000n)])).toBe(700n));
  it("moves a transfer without changing combined asset value",()=>{const bank=account("bank","bank",10000n);const savings=account("savings","savings");const tx=transaction("t","transfer",2500n,"bank",{transferAccountId:"savings"});expect(accountBalance(bank,[tx])).toBe(7500n);expect(accountBalance(savings,[tx])).toBe(2500n);expect(netWorth([bank,savings],[tx])).toBe(10000n)});
  it("increases card outstanding on purchase and reduces it on payment",()=>{const card=account("card","credit_card",1000n);const purchase=transaction("p","expense",500n,"card");const payment=transaction("x","transfer",400n,"bank",{transferAccountId:"card"});expect(accountBalance(card,[purchase,payment])).toBe(1100n)});
  it("prefers a balance supplied by the server-side balance view",()=>{const synced={...account("bank","bank",1000n),currentBalanceMinor:8750n};expect(accountBalance(synced,[transaction("e","expense",500n)])).toBe(8750n)});
  it("uses the selected budget period",()=>{const budget:Budget={id:"b",name:"Weekly",categoryIds:["food"],limitMinor:1000n,period:"weekly",alertThreshold:80,rollover:false};const current=transaction("now","expense",100n,"bank",{categoryId:"food",date:"2026-09-03"});const prior=transaction("prior","expense",900n,"bank",{categoryId:"food",date:"2026-08-30"});expect(budgetProgress(budget,[current,prior],new Date("2026-09-03T12:00:00")).spentMinor).toBe(100n)});
  it("calculates savings rate from exact totals",()=>expect(savingsRate(10000n,7500n)).toBe(25));
});

// Available money and liabilities must remain distinct even when an account is inactive.
describe("financial overview", () => {
  it("separates available assets, loans, credit cards and net worth", async () => {
    const { totalBalance, liabilityTotal, netWorth } = await import("@/features/finance/calculations");
    const accounts = [account("bank","bank",5000000n), {...account("cash","cash",500000n),isActive:false},account("card","credit_card",1000000n),account("loan","loan",10000000n)];
    expect(totalBalance(accounts,[])).toBe(5500000n);
    expect(liabilityTotal(accounts,[],"loan")).toBe(10000000n);
    expect(liabilityTotal(accounts,[],"credit_card")).toBe(1000000n);
    expect(netWorth(accounts,[])).toBe(-5500000n);
  });
});
