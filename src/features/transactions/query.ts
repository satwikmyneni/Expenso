import { addDays, addMonths, addYears, format, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subYears } from "date-fns";
import type { FinanceTransaction, TransactionSource, TransactionType } from "@/features/finance/types";
import { parseMoney } from "@/features/finance/money";

export const datePresets = ["all", "today", "yesterday", "this_week", "this_month", "last_month", "last_7_days", "last_30_days", "this_year", "last_year", "custom"] as const;
export type DatePreset = typeof datePresets[number];
export const transactionSorts = ["newest", "oldest", "amount_desc", "amount_asc", "uploaded_desc", "uploaded_asc"] as const;
export type TransactionSort = typeof transactionSorts[number];
export interface TransactionQuery {
  account?: string; category?: string; type?: TransactionType; source?: TransactionSource; importId?: string; id?: string;
  search?: string; dateFrom?: string; dateTo?: string; minAmount?: string; maxAmount?: string;
  sort?: TransactionSort; page?: number; pageSize?: number;
}
export interface TransactionPage { rows: FinanceTransaction[]; total: number; cached?: boolean; dailyTotals?: Record<string, bigint> }
export const dateOnly = (date: Date) => format(date, "yyyy-MM-dd");
export const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) && dateOnly(new Date(`${value}T12:00:00`)) === value;

export function dateRange(preset: DatePreset, reference = new Date(), from = "", through = ""): { dateFrom?: string; dateTo?: string } {
  const endToday = addDays(reference, 1);
  const range = (start: Date, end: Date) => ({ dateFrom: dateOnly(start), dateTo: dateOnly(end) });
  switch (preset) {
    case "today": return range(reference, endToday);
    case "yesterday": return range(subDays(reference, 1), reference);
    case "this_week": return range(startOfWeek(reference, { weekStartsOn: 1 }), addDays(startOfWeek(reference, { weekStartsOn: 1 }), 7));
    case "this_month": return range(startOfMonth(reference), addMonths(startOfMonth(reference), 1));
    case "last_month": return range(startOfMonth(subMonths(reference, 1)), startOfMonth(reference));
    case "last_7_days": return range(subDays(reference, 6), endToday);
    case "last_30_days": return range(subDays(reference, 29), endToday);
    case "this_year": return range(startOfYear(reference), addYears(startOfYear(reference), 1));
    case "last_year": return range(startOfYear(subYears(reference, 1)), startOfYear(reference));
    case "custom":
      if (!validDate(from) || !validDate(through) || from > through) throw new Error("Choose a valid From date on or before the To date.");
      return range(new Date(`${from}T12:00:00`), addDays(new Date(`${through}T12:00:00`), 1));
    default: return {};
  }
}

export function transactionHref(query: TransactionQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return `/transactions${params.size ? `?${params}` : ""}`;
}

export function compareTransactions(a: FinanceTransaction, b: FinanceTransaction, sort: TransactionSort = "newest") {
  const occurred = (value: FinanceTransaction) => value.occurredAt ?? `${value.date}T12:00:00.000Z`;
  const upload = (value: FinanceTransaction) => value.importedAt ?? value.createdAt;
  const seq = (value: FinanceTransaction) => typeof value.metadata?.import_row === "number" ? value.metadata.import_row : 0;
  const primary = sort === "amount_desc" ? (a.amountMinor > b.amountMinor ? -1 : a.amountMinor < b.amountMinor ? 1 : 0)
    : sort === "amount_asc" ? (a.amountMinor < b.amountMinor ? -1 : a.amountMinor > b.amountMinor ? 1 : 0)
    : sort === "uploaded_desc" ? upload(b).localeCompare(upload(a))
    : sort === "uploaded_asc" ? upload(a).localeCompare(upload(b))
    : sort === "oldest" ? occurred(a).localeCompare(occurred(b)) : occurred(b).localeCompare(occurred(a));
  if (primary) return primary;
  if (sort.startsWith("uploaded")) return seq(a) - seq(b) || occurred(b).localeCompare(occurred(a)) || a.id.localeCompare(b.id);
  return occurred(b).localeCompare(occurred(a)) || upload(b).localeCompare(upload(a)) || seq(a) - seq(b) || a.id.localeCompare(b.id);
}

// Only the explicit sample workspace uses this in-memory equivalent. Live rows
// are filtered and ordered inside Postgres before OFFSET/LIMIT.
export function querySampleTransactions(transactions: FinanceTransaction[], query: TransactionQuery): TransactionPage {
  const matches = transactions.filter((row) =>
    (!query.account || row.accountId === query.account || row.transferAccountId === query.account)
    && (!query.category || (query.category === "uncategorized" ? !row.categoryId : row.categoryId === query.category))
    && (!query.type || row.type === query.type) && (!query.source || row.source === query.source)
    && (!query.id || row.id === query.id) && (!query.importId || row.importId === query.importId)
    && (!query.dateFrom || row.date >= query.dateFrom) && (!query.dateTo || row.date < query.dateTo)
    && (!query.minAmount || row.amountMinor >= parseMoney(query.minAmount))
    && (!query.maxAmount || row.amountMinor <= parseMoney(query.maxAmount))
    && (!query.search || [row.merchant, row.description, row.reference, row.notes, ...row.tags].join(" ").toLowerCase().includes(query.search.toLowerCase())),
  ).sort((a, b) => compareTransactions(a, b, query.sort));
  const size = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const offset = Math.max(query.page ?? 0, 0) * size;
  const dailyTotals: Record<string, bigint> = {};
  for (const row of matches) {
    const net = row.type === "income" || row.type === "refund" ? row.amountMinor : row.type === "expense" ? -row.amountMinor : row.type === "transfer" ? -(row.loanInterestMinor ?? 0n) : 0n;
    dailyTotals[row.date] = (dailyTotals[row.date] ?? 0n) + net;
  }
  return { total: matches.length, rows: matches.slice(offset, offset + size), dailyTotals };
}
