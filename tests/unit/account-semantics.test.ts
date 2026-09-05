import { describe, expect, it } from "vitest";
import { creditCardMetrics, isAssetAccountType, isLiabilityAccountType, loanMetrics } from "@/features/accounts/account-semantics";
import { accountBalance, availableCash, expenseTotal, getPrimaryDashboardAccount, netWorth } from "@/features/finance/calculations";
import type { Account, FinanceTransaction } from "@/features/finance/types";

const account = (id: string, type: Account["type"], openingBalanceMinor: bigint, extra: Partial<Account> = {}): Account => ({ id, name: id, institution: id, type, currency: "INR", openingBalanceMinor, color: "#000", includeInAnalytics: true, includeInNetWorth: true, archived: false, ...extra });
const transaction = (id: string, type: FinanceTransaction["type"], amountMinor: bigint, accountId: string, extra: Partial<FinanceTransaction> = {}): FinanceTransaction => ({ id, type, amountMinor, accountId, currency: "INR", date: "2026-09-05", merchant: "Test", tags: [], source: "manual", createdAt: "", updatedAt: "", ...extra });

describe("account semantics", () => {
  it("classifies assets and liabilities centrally", () => {
    expect(["bank", "savings", "current", "checking", "cash", "wallet", "debit_card", "prepaid_card", "investment", "asset"].every((type) => isAssetAccountType(type as Account["type"]))).toBe(true);
    expect(["credit_card", "loan", "liability"].every((type) => isLiabilityAccountType(type as Account["type"]))).toBe(true);
  });

  it("selects the highest positive eligible asset and never a liability", () => {
    const accounts = [account("bank", "bank", 12000n), account("savings", "savings", 75000n), account("card", "credit_card", 90000n, { creditLimitMinor: 200000n }), account("loan", "loan", 3800000n)];
    expect(getPrimaryDashboardAccount(accounts, [])?.id).toBe("savings");
    accounts[0].openingBalanceMinor = 95000n;
    expect(getPrimaryDashboardAccount(accounts, [])?.id).toBe("bank");
    expect(availableCash(accounts, [])).toBe(170000n);
  });

  it("handles zero, negative, archived, and no eligible accounts safely", () => {
    expect(getPrimaryDashboardAccount([account("zero", "bank", 0n), account("negative", "cash", -1n), account("archived", "savings", 100n, { archived: true })], [])).toBeUndefined();
    expect(getPrimaryDashboardAccount([account("card", "credit_card", 100n)], [])).toBeUndefined();
  });

  it("calculates card used, available, over-limit, payments, and refunds without counting payment as spending", () => {
    const card = account("card", "credit_card", 35000n, { creditLimitMinor: 100000n });
    const bank = account("bank", "bank", 50000n);
    const purchase = transaction("purchase", "expense", 5000n, "card");
    const refund = transaction("refund", "refund", 2000n, "card", { refundOfId: "purchase" });
    const payment = transaction("payment", "transfer", 10000n, "bank", { transferAccountId: "card" });
    expect(accountBalance(card, [purchase, refund, payment])).toBe(28000n);
    expect(accountBalance(bank, [payment])).toBe(40000n);
    expect(expenseTotal([purchase, refund, payment])).toBe(3000n);
    expect(creditCardMetrics(card, accountBalance(card, [purchase, refund, payment]))).toMatchObject({ usedMinor: 28000n, availableMinor: 72000n, overLimit: false });
    expect(creditCardMetrics(card, 105000n)).toMatchObject({ availableMinor: -5000n, overLimit: true });
    expect(netWorth([bank, card], [purchase, refund, payment])).toBe(12000n);
  });

  it("splits a loan payment so the bank pays the EMI, principal reduces liability, and interest is spending", () => {
    const bank = account("bank", "bank", 100000n);
    const loan = account("loan", "loan", 380000n, { originalPrincipalMinor: 500000n, emiMinor: 42000n, interestRate: 8.5 });
    const payment = transaction("emi", "transfer", 42000n, "bank", { transferAccountId: "loan", loanPrincipalMinor: 30000n, loanInterestMinor: 12000n });
    expect(accountBalance(bank, [payment])).toBe(58000n);
    expect(accountBalance(loan, [payment])).toBe(350000n);
    expect(expenseTotal([payment])).toBe(12000n);
    expect(loanMetrics(loan, accountBalance(loan, [payment]))).toMatchObject({ originalMinor: 500000n, outstandingMinor: 350000n, emiMinor: 42000n, interestRate: 8.5 });
  });
});
