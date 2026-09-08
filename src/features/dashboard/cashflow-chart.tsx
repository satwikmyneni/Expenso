"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { FinanceTransaction } from "@/features/finance/types";
import { monthlyTrend } from "@/features/finance/calculations";
import { formatMoney } from "@/features/finance/money";

export function BalanceTrendChart({ transactions, currency, currentBalance, months, reportTrend }: { transactions: FinanceTransaction[]; currency: string; currentBalance: bigint; months: number; reportTrend?: ReturnType<typeof monthlyTrend> }) {
  const trend = reportTrend ?? monthlyTrend(transactions, new Date(), months);
  const totalMovement = trend.reduce((total, item) => total + item.incomeMinor - item.expenseMinor, 0n);
  const startingBalance = currentBalance - totalMovement;
  const data = trend.map((item, index) => ({
    month: item.month,
    balance: Number(startingBalance + trend.slice(0, index + 1).reduce((total, entry) => total + entry.incomeMinor - entry.expenseMinor, 0n)) / 100,
  }));

  return <div className="h-[250px] w-full sm:h-[285px]" aria-label={`${months} month total balance trend`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--income))" stopOpacity={0.24} /><stop offset="100%" stopColor="rgb(var(--income))" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="2 7" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10 }} dy={10} />
        <Tooltip cursor={{ stroke: "rgb(var(--border))" }} content={({ active, payload, label }) => active && payload?.[0] ? <div className="rounded-xl border border-border bg-elevated px-3 py-2.5 text-xs shadow-float"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="amount mt-1 font-semibold text-foreground">{formatMoney(BigInt(Math.round(Number(payload[0].value) * 100)), currency)}</p></div> : null} />
        <Area type="monotone" dataKey="balance" stroke="rgb(var(--income))" strokeWidth={2.5} fill="url(#balance-fill)" dot={{ r: 2.5, fill: "rgb(var(--income))", strokeWidth: 0 }} activeDot={{ r: 5, fill: "rgb(var(--income))", stroke: "rgb(var(--surface))", strokeWidth: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function CashflowChart({ transactions, currency, reportTrend }: { transactions: FinanceTransaction[]; currency: string; reportTrend?: ReturnType<typeof monthlyTrend> }) {
  const data = (reportTrend ?? monthlyTrend(transactions)).map((item) => ({ month: item.month, income: Number(item.incomeMinor) / 100, spending: Number(item.expenseMinor) / 100 }));
  return <div className="h-[245px] w-full" aria-label="Income and spending chart">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--income))" stopOpacity={0.22}/><stop offset="100%" stopColor="rgb(var(--income))" stopOpacity={0}/></linearGradient>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--expense))" stopOpacity={0.16}/><stop offset="100%" stopColor="rgb(var(--expense))" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 11 }} dy={8}/>
        <Tooltip cursor={{ stroke: "rgb(var(--border))" }} content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-xl border bg-surface p-3 text-xs shadow-lg"><p className="mb-2 font-bold">{label}</p>{payload.map((entry) => <p className="mt-1 flex min-w-36 justify-between gap-4 text-muted" key={entry.name}><span className="capitalize">{entry.name}</span><strong className="text-ink">{formatMoney(BigInt(Math.round(Number(entry.value) * 100)), currency)}</strong></p>)}</div> : null} />
        <Area type="monotone" dataKey="income" stroke="rgb(var(--income))" strokeWidth={2.5} fill="url(#income-fill)" />
        <Area type="monotone" dataKey="spending" stroke="rgb(var(--expense))" strokeWidth={2.5} fill="url(#spend-fill)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
