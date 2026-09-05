import type { Account, Category, FinanceTransaction } from "@/features/finance/types";
import { minorToDecimal } from "@/features/finance/money";

function escapeCsv(value: string) { return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value; }

export function transactionsToCsv(transactions: FinanceTransaction[], accounts: Account[], categories: Category[]) {
  const header = ["date", "type", "amount", "currency", "merchant", "category", "account", "payment_method", "notes", "source", "reference"];
  const rows = transactions.map((transaction) => [transaction.date, transaction.type, minorToDecimal(transaction.amountMinor), transaction.currency, transaction.merchant, categories.find((item) => item.id === transaction.categoryId)?.name ?? "", accounts.find((item) => item.id === transaction.accountId)?.name ?? "", transaction.paymentMethod ?? "", transaction.notes ?? "", transaction.source, transaction.reference ?? ""]);
  return [header, ...rows].map((row) => row.map((value) => escapeCsv(String(value))).join(",")).join("\r\n");
}

export function exportTransactionsCsv(transactions: FinanceTransaction[], accounts: Account[], categories: Category[]) {
  const blob = new Blob([transactionsToCsv(transactions, accounts, categories)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `expenso-transactions-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
  URL.revokeObjectURL(url);
}
