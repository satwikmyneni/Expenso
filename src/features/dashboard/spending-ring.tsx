"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Category, FinanceTransaction } from "@/features/finance/types";
import { spendingByCategory } from "@/features/finance/calculations";
import { formatMoney, sumMoney } from "@/features/finance/money";
import { financeColors } from "@/lib/theme";

export function SpendingRing({ transactions, categories, currency }: { transactions: FinanceTransaction[]; categories: Category[]; currency: string }) {
  const values = spendingByCategory(transactions).slice(0, 5);
  const data = values.map((item) => ({ name: categories.find((category) => category.id === item.categoryId)?.name ?? "Other", value: Number(item.amountMinor) / 100, color: categories.find((category) => category.id === item.categoryId)?.color ?? financeColors.neutral }));
  const total = sumMoney(values.map((item) => item.amountMinor));
  return <div className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
    <div className="relative mx-auto h-[145px] w-[145px]"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" innerRadius={47} outerRadius={67} paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="rounded-lg border bg-surface px-2.5 py-2 text-xs font-bold shadow">{formatMoney(BigInt(Math.round(Number(payload[0].value) * 100)), currency)}</div> : null}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><span className="text-[10px] font-bold uppercase tracking-wider text-muted">Spent</span><strong className="amount mt-1 text-sm">{formatMoney(total, currency, "en-IN", true)}</strong></div></div>
    <div className="space-y-2.5">{data.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-full" style={{ background: item.color }} /><span className="min-w-0 flex-1 truncate text-muted">{item.name}</span><strong className="amount">{formatMoney(BigInt(Math.round(item.value * 100)), currency, "en-IN", true)}</strong></div>)}</div>
  </div>;
}
