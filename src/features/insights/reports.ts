import { addMonths, addYears, format, startOfMonth, startOfYear, subMonths, subYears } from "date-fns";
import type { Budget, FinanceTransaction } from "@/features/finance/types";
import { expenseTotal, incomeTotal, spendingByCategory } from "@/features/finance/calculations";
import { parseMoney, sumMoney } from "@/features/finance/money";
import { dateOnly } from "@/features/transactions/query";

export interface PeriodReport {
  income: bigint; expenses: bigint; count: number; transfers: bigint; recurring: bigint; subscriptions: bigint;
  largest?: { id: string; merchant: string; amount: bigint };
  categories: Array<{ id: string; amount: bigint }>;
  months: Array<{ month: string; income: bigint; expenses: bigint; count: number }>;
  days: Array<{ day: string; income: bigint; expenses: bigint }>;
  budgets: Array<{ id: string; spent: bigint }>;
}
export function reportPeriods(month: string, view: "monthly" | "yearly", now = new Date()) {
  const parsed = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? new Date(`${month}-01T12:00:00`) : now;
  const reference = parsed > now ? now : parsed;
  const start = view === "yearly" ? startOfYear(reference) : startOfMonth(reference);
  const end = view === "yearly" ? addYears(start, 1) : addMonths(start, 1);
  const previous = view === "yearly" ? subYears(start, 1) : subMonths(start, 1);
  return { reference: start, start: dateOnly(start), end: dateOnly(end), previousStart: dateOnly(previous), previousEnd: dateOnly(start), yearAgoStart: dateOnly(subYears(start, 1)), yearAgoEnd: dateOnly(subYears(end, 1)) };
}
export function sampleReport(rows: FinanceTransaction[], budgets: Budget[], start: string, end: string, account?: string): PeriodReport {
  const matching = rows.filter((row) => row.date >= start && row.date < end && (!account || row.accountId === account || row.transferAccountId === account));
  const largest = [...matching].filter((row) => row.type === "expense").sort((a,b) => a.amountMinor === b.amountMinor ? a.id.localeCompare(b.id) : a.amountMinor > b.amountMinor ? -1 : 1)[0];
  return {
    income: incomeTotal(matching), expenses: expenseTotal(matching), count: matching.length,
    transfers: sumMoney(matching.filter((row) => row.type === "transfer").map((row) => row.amountMinor)),
    recurring: expenseTotal(matching.filter((row) => row.recurringId || row.source === "recurring")), subscriptions: expenseTotal(matching.filter((row) => row.subscriptionId)),
    largest: largest ? { id: largest.id, merchant: largest.merchant, amount: largest.amountMinor } : undefined,
    categories: spendingByCategory(matching).map((row) => ({ id: row.categoryId, amount: row.amountMinor })),
    months: [...new Set(matching.map((row) => row.date.slice(0,7)))].sort().map((month) => { const items = matching.filter((row) => row.date.startsWith(month)); return { month, income: incomeTotal(items), expenses: expenseTotal(items), count: items.length }; }),
    days: [...new Set(matching.map((row) => row.date))].sort().map((day) => { const items = matching.filter((row) => row.date === day); return { day, income: incomeTotal(items), expenses: expenseTotal(items) }; }),
    budgets: budgets.map((budget) => ({ id: budget.id, spent: expenseTotal(matching.filter((row) => row.categoryId && budget.categoryIds.includes(row.categoryId))) })),
  };
}
export function decodeReport(value: unknown): PeriodReport {
  const report = value as Record<string, unknown>;
  const amount = (value: unknown) => parseMoney(String(value ?? 0));
  const entries = (key: string) => (report[key] ?? []) as Array<Record<string, unknown>>;
  const largest = report.largest as Record<string, unknown> | null;
  return {
    income: amount(report.income), expenses: amount(report.expenses), count: Number(report.count), transfers: amount(report.transfers), recurring: amount(report.recurring), subscriptions: amount(report.subscriptions),
    largest: largest ? { id: String(largest.id), merchant: String(largest.merchant), amount: amount(largest.amount) } : undefined,
    categories: entries("categories").map((row) => ({ id: String(row.id ?? "uncategorized"), amount: amount(row.amount) })),
    months: entries("months").map((row) => ({ month: String(row.month), income: amount(row.income), expenses: amount(row.expenses), count: Number(row.count) })),
    days: entries("days").map((row) => ({ day: String(row.day), income: amount(row.income), expenses: amount(row.expenses) })),
    budgets: entries("budgets").map((row) => ({ id: String(row.id), spent: amount(row.spent) })),
  };
}
export function trendMonths(report: PeriodReport, reference: Date, months: number) {
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(reference, months-index-1);
    const found = report.months.find((row) => row.month === format(month,"yyyy-MM"));
    return { month: format(month,"MMM yyyy"), incomeMinor: found?.income ?? 0n, expenseMinor: found?.expenses ?? 0n };
  });
}
