"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/features/finance/category-icon";
import { formatMoney } from "@/features/finance/money";
import type { Account, Category, FinanceTransaction } from "@/features/finance/types";
import { financeColors } from "@/lib/theme";
import Link from "next/link";
import { transactionHref } from "./query";

export function TransactionRow({ transaction, accounts, categories, compact = false, showDetails = false, onDelete, onEdit }: { transaction: FinanceTransaction; accounts: Account[]; categories: Category[]; compact?: boolean; showDetails?: boolean; onDelete?: (id: string) => void; onEdit?: (transaction: FinanceTransaction) => void }) {
  const category = categories.find((item) => item.id === transaction.categoryId);
  const account = accounts.find((item) => item.id === transaction.accountId);
  const date = parseISO(transaction.date);
  const when = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, compact ? "d MMM" : "d MMM yyyy");
  const income = transaction.type === "income" || transaction.type === "refund";
  const Icon = transaction.type === "transfer" ? ArrowLeftRight : income ? ArrowDownLeft : category ? null : ArrowUpRight;
  const typeLabel = transaction.type === "refund" ? "Refund" : transaction.type === "transfer" ? "Transfer" : transaction.type === "income" ? "Income" : transaction.type === "adjustment" ? "Adjustment" : "Expense";
  const typeTone = income ? "bg-income/10 text-income" : transaction.type === "transfer" || transaction.type === "adjustment" ? "bg-info/10 text-info" : "bg-expense/10 text-expense";
  const detailed = !compact || showDetails;

  return <div className="group flex min-h-[70px] min-w-0 flex-wrap items-center gap-3 border-b border-border/80 py-3 last:border-0 sm:flex-nowrap">
    <span className="grid size-10 shrink-0 place-items-center rounded-[13px] border border-white/[.025]" style={{ backgroundColor: `${category?.color ?? financeColors.neutral}1d`, color: category?.color ?? financeColors.neutral }}>
      {Icon ? <Icon className="size-[18px]" /> : <CategoryIcon name={category?.icon} className="size-[18px]" />}
    </span>
    <div className="min-w-0 flex-1">{onEdit ? <button type="button" className="block min-h-11 w-full truncate text-left text-sm font-semibold hover:text-info" onClick={() => onEdit(transaction)} aria-label={`Open ${transaction.merchant}`}>{transaction.merchant}</button> : <Link className="block min-h-11 truncate py-3 text-sm font-semibold hover:text-info" href={transactionHref({id:transaction.id})}>{transaction.merchant}</Link>}<p className="mt-0.5 truncate text-[11px] text-muted-foreground">{category?.name ?? (transaction.type === "transfer" ? "Transfer" : "Uncategorized")} · {account?.name}</p><p className="text-[10px] text-muted-foreground sm:hidden">{when}{transaction.occurredAt ? ` · ${format(new Date(transaction.occurredAt),"HH:mm")}` : ""}</p></div>
    {detailed && <span className="hidden w-[98px] shrink-0 text-xs text-muted-foreground sm:block">{when}</span>}
    {detailed && <span className={`status-pill hidden w-[92px] justify-center sm:inline-flex ${typeTone}`}>{typeLabel}</span>}
    <div className="max-w-[45%] shrink-0 text-right sm:min-w-[92px]"><p className={`amount text-sm font-semibold ${income ? "text-income" : transaction.type === "transfer" ? "text-foreground" : "text-expense"}`}>{income ? "+" : transaction.type === "transfer" ? "" : "−"}{formatMoney(transaction.amountMinor, transaction.currency)}</p>{compact && !showDetails && <p className="mt-0.5 text-[11px] text-muted-foreground">{when}</p>}</div>
    {(onDelete || onEdit) && <div className="flex w-full justify-end opacity-100 sm:w-auto sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">{onEdit && <Button variant="ghost" size="icon" className="size-11 sm:size-8 sm:min-h-8" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.merchant}`}><Pencil className="size-3.5" /></Button>}{onDelete && <Button variant="ghost" size="icon" className="size-11 text-destructive sm:size-8 sm:min-h-8" onClick={() => onDelete(transaction.id)} aria-label={`Delete ${transaction.merchant}`}><Trash2 className="size-3.5" /></Button>}</div>}
  </div>;
}
