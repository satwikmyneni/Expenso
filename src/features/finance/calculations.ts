import { endOfMonth, endOfWeek, endOfYear, format, isWithinInterval, parseISO, startOfMonth, startOfWeek, startOfYear, subMonths } from "date-fns";
import type { Account, Budget, FinanceTransaction } from "./types";
import { percentage, sumMoney } from "./money";
import { isAssetAccountType, isCashAccountType, isLiabilityAccountType } from "@/features/accounts/account-semantics";

export function transactionsInRange(transactions: FinanceTransaction[], start: Date, end: Date) {
  return transactions.filter((transaction) => isWithinInterval(parseISO(transaction.date), { start, end }));
}

export function expenseTotal(transactions: FinanceTransaction[]): bigint {
  const expenses = sumMoney(transactions.filter((item) => item.type === "expense").map((item) => item.amountMinor));
  const refunds = sumMoney(transactions.filter((item) => item.type === "refund").map((item) => item.amountMinor));
  const loanInterest = sumMoney(transactions.filter((item) => item.type === "transfer" && item.loanInterestMinor !== undefined).map((item) => item.loanInterestMinor ?? 0n));
  return expenses + loanInterest - refunds;
}

export function incomeTotal(transactions: FinanceTransaction[]): bigint {
  return sumMoney(transactions.filter((item) => item.type === "income").map((item) => item.amountMinor));
}

export function accountBalance(account: Account, transactions: FinanceTransaction[]): bigint {
  if (account.currentBalanceMinor !== undefined) return account.currentBalanceMinor;
  const liability = isLiabilityAccountType(account.type);
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === "transfer") {
      if (transaction.accountId === account.id) return liability ? balance + transaction.amountMinor : balance - transaction.amountMinor;
      if (transaction.transferAccountId === account.id) {
        const incoming = account.type === "loan" && transaction.loanPrincipalMinor !== undefined ? transaction.loanPrincipalMinor : transaction.amountMinor;
        return liability ? balance - incoming : balance + incoming;
      }
      return balance;
    }
    if (transaction.accountId !== account.id) return balance;
    if (transaction.type === "income" || transaction.type === "refund") return liability ? balance - transaction.amountMinor : balance + transaction.amountMinor;
    if (transaction.type === "expense") return liability ? balance + transaction.amountMinor : balance - transaction.amountMinor;
    return balance + transaction.amountMinor;
  }, account.openingBalanceMinor);
}

export function netWorth(accounts: Account[], transactions: FinanceTransaction[]): bigint {
  return sumMoney(accounts.filter((account) => account.includeInNetWorth && !account.archived).map((account) => {
    const balance = accountBalance(account, transactions);
    return isLiabilityAccountType(account.type) ? -balance : balance;
  }));
}

export function totalBalance(accounts: Account[], transactions: FinanceTransaction[]): bigint {
  return sumMoney(accounts.filter((account) => !account.archived && (isCashAccountType(account.type) || account.type === "asset")).map((account) => accountBalance(account, transactions)));
}

export function liabilityTotal(accounts: Account[], transactions: FinanceTransaction[], type: "loan" | "credit_card"): bigint {
  return sumMoney(accounts.filter((account) => !account.archived && account.type === type).map((account) => accountBalance(account, transactions)));
}

export function availableCash(accounts: Account[], transactions: FinanceTransaction[]): bigint {
  return sumMoney(accounts
    .filter((account) => !account.archived && isCashAccountType(account.type))
    .map((account) => accountBalance(account, transactions)));
}

export function getPrimaryDashboardAccount(accounts: Account[], transactions: FinanceTransaction[]) {
  return accounts
    .filter((account) => !account.archived && isAssetAccountType(account.type))
    .map((account) => ({ account, balance: accountBalance(account, transactions) }))
    .filter((candidate) => candidate.balance > 0n)
    .sort((left, right) => left.balance === right.balance ? left.account.name.localeCompare(right.account.name) : left.balance > right.balance ? -1 : 1)[0]?.account;
}

export function savingsRate(income: bigint, expenses: bigint): number {
  return income === 0n ? 0 : percentage(income - expenses, income);
}

export function monthlySummary(transactions: FinanceTransaction[], reference = new Date()) {
  const current = transactionsInRange(transactions, startOfMonth(reference), endOfMonth(reference));
  const previousReference = subMonths(reference, 1);
  const previous = transactionsInRange(transactions, startOfMonth(previousReference), endOfMonth(previousReference));
  const income = incomeTotal(current);
  const expenses = expenseTotal(current);
  const previousExpenses = expenseTotal(previous);
  const spendingChange = previousExpenses === 0n ? 0 : Number(((expenses - previousExpenses) * 10_000n) / previousExpenses) / 100;
  return { income, expenses, savings: income - expenses, savingsRate: savingsRate(income, expenses), previousExpenses, spendingChange };
}

export function spendingByCategory(transactions: FinanceTransaction[]) {
  const totals = new Map<string, bigint>();
  for (const transaction of transactions) {
    if (transaction.type === "transfer" && transaction.loanInterestMinor !== undefined) {
      const key = transaction.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0n) + transaction.loanInterestMinor);
      continue;
    }
    if (transaction.type !== "expense" && transaction.type !== "refund") continue;
    const key = transaction.categoryId ?? "uncategorized";
    const signed = transaction.type === "refund" ? -transaction.amountMinor : transaction.amountMinor;
    totals.set(key, (totals.get(key) ?? 0n) + signed);
  }
  return [...totals.entries()].map(([categoryId, amountMinor]) => ({ categoryId, amountMinor })).sort((a, b) => a.amountMinor === b.amountMinor ? 0 : a.amountMinor > b.amountMinor ? -1 : 1);
}

export function budgetProgress(budget: Budget, transactions: FinanceTransaction[], reference = new Date()) {
  const range = budget.period === "weekly"
    ? { start: startOfWeek(reference, { weekStartsOn: 1 }), end: endOfWeek(reference, { weekStartsOn: 1 }) }
    : budget.period === "yearly"
      ? { start: startOfYear(reference), end: endOfYear(reference) }
      : { start: startOfMonth(reference), end: endOfMonth(reference) };
  const relevant = transactionsInRange(transactions, range.start, range.end).filter((item) => item.categoryId && budget.categoryIds.includes(item.categoryId));
  const spentMinor = expenseTotal(relevant);
  return { spentMinor, remainingMinor: budget.limitMinor - spentMinor, percent: percentage(spentMinor, budget.limitMinor) };
}

export function monthlyTrend(transactions: FinanceTransaction[], reference = new Date(), months = 6) {
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(reference, months - index - 1);
    const inMonth = transactionsInRange(transactions, startOfMonth(month), endOfMonth(month));
    return { month: format(month, "MMM"), incomeMinor: incomeTotal(inMonth), expenseMinor: expenseTotal(inMonth) };
  });
}
