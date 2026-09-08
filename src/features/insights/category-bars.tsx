"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Category, FinanceTransaction } from "@/features/finance/types";
import { spendingByCategory } from "@/features/finance/calculations";
import { formatMoney } from "@/features/finance/money";

export function CategoryBars({ transactions, categories, currency, groups }: { transactions: FinanceTransaction[]; categories: Category[]; currency: string; groups?: ReturnType<typeof spendingByCategory> }) {
  const data = (groups ?? spendingByCategory(transactions)).slice(0, 7).map((item) => ({ name: categories.find((cat) => cat.id === item.categoryId)?.name.split(" ")[0] ?? "Other", amount: Number(item.amountMinor) / 100 }));
  return <div className="h-72"><ResponsiveContainer><BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 6" stroke="rgb(var(--border))"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/><Tooltip cursor={{ fill: "rgb(var(--muted))" }} formatter={(value) => formatMoney(BigInt(Math.round(Number(value) * 100)), currency)}/><Bar dataKey="amount" fill="rgb(var(--chart-1))" radius={[8,8,2,2]} maxBarSize={42}/></BarChart></ResponsiveContainer></div>;
}
