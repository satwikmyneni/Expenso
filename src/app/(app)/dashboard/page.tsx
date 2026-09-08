"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, Target } from "lucide-react";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/features/finance/finance-provider";
import { accountBalance, availableCash, getPrimaryDashboardAccount, netWorth } from "@/features/finance/calculations";
import { formatMoney, percentage } from "@/features/finance/money";
import { BalanceTrendChart } from "@/features/dashboard/cashflow-chart";
import { resolveGreetingName, resolveTimeGreeting } from "@/features/dashboard/greeting";
import { SpendingRing } from "@/features/dashboard/spending-ring";
import { TransactionRow } from "@/features/transactions/transaction-row";
import { ManagedAccountCard } from "@/features/accounts/managed-account-card";
import { usePeriodReport, useTransactions } from "@/features/finance/use-finance-query";
import { dateOnly, dateRange, transactionHref } from "@/features/transactions/query";
import { trendMonths } from "@/features/insights/reports";

const periods = [
  { label: "1 year", months: 12 },
  { label: "6 months", months: 6 },
  { label: "3 months", months: 3 },
  { label: "1 month", months: 1 },
] as const;

export default function DashboardPage() {
  const { data, loading } = useFinance();
  const [months, setMonths] = useState(6);
  const now = new Date();
  const greeting = resolveTimeGreeting(now);
  const greetingName = resolveGreetingName(data.profile);
  const today = new Intl.DateTimeFormat(data.profile.locale || "en-IN", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const range=dateRange("this_month",now);
  const monthReport=usePeriodReport(range.dateFrom!,range.dateTo!);
  const chartReport=usePeriodReport(dateOnly(startOfMonth(subMonths(now,months-1))),dateOnly(addMonths(startOfMonth(now),1)));
  const weeklyRange=dateRange("this_week",now); const yearlyRange=dateRange("this_year",now);
  const weeklyReport=usePeriodReport(weeklyRange.dateFrom!,weeklyRange.dateTo!);
  const yearlyReport=usePeriodReport(yearlyRange.dateFrom!,yearlyRange.dateTo!);
  const recent=useTransactions({pageSize:6,sort:"newest"});
  const progressFor=(budget:typeof data.budgets[number])=>{const report=budget.period==="yearly"?yearlyReport.result:budget.period==="weekly"?weeklyReport.result:monthReport.result;const spentMinor=report?.budgets.find((row)=>row.id===budget.id)?.spent ?? 0n;return {spentMinor,percent:percentage(spentMinor,budget.limitMinor)};};
  const summary=monthReport.result ?? {income:0n,expenses:0n};
  const groups=(monthReport.result?.categories ?? []).map((row)=>({categoryId:row.id,amountMinor:row.amount}));
  const worth = netWorth(data.accounts, data.transactions);
  const cash = availableCash(data.accounts, data.transactions);
  const topCategory = groups[0];
  const topCategoryName = data.categories.find((item) => item.id === topCategory?.categoryId)?.name ?? "—";
  const budgetUsed = data.budgets.length ? Math.round(data.budgets.reduce((total, budget) => total + progressFor(budget).percent, 0) / data.budgets.length) : 0;
  const featuredAccount = getPrimaryDashboardAccount(data.accounts, data.transactions);

  if (loading) return <DashboardSkeleton />;

  return <>
    <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow mb-3 text-info">{today}</p>
        <h1 className="break-words text-[2.35rem] font-semibold leading-[1.02] tracking-[-.055em] text-foreground sm:text-[3rem]">{greeting}, {greetingName}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Here’s the shape of your money right now.</p>
      </div>
      <div className="flex w-fit rounded-full border border-border bg-surface p-1 text-xs font-semibold text-muted-foreground" aria-label="Dashboard view">
        <span className="rounded-full bg-elevated px-4 py-2 text-foreground shadow-sm">Overview</span>
        <Link href="/transactions" className="rounded-full px-4 py-2 transition hover:text-foreground">Activity</Link>
      </div>
    </header>

    {(monthReport.error || chartReport.error || recent.error) && <p role="alert" className="mb-4 text-sm">{monthReport.error || chartReport.error || recent.error}</p>}
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.85fr)]">
      <div className="grid min-w-0 gap-5">
        <Card className="overflow-hidden">
          <CardHeader className="flex-col gap-5 pb-0 sm:flex-row sm:items-start">
            <div>
              <Link href="/accounts" className="eyebrow mb-2 inline-block py-2 hover:text-info"><span>Total balance</span> <span aria-hidden="true">↗</span></Link>
              <p className="amount text-[2.35rem] font-semibold leading-none tracking-[-.055em] sm:text-[3.2rem]">{formatMoney(worth, data.profile.currency)}</p>
              <p className="mt-3 text-xs text-income">Recorded income minus spending across included accounts</p>
            </div>
            <div className="flex rounded-full border border-border bg-background/50 p-1" aria-label="Balance chart period">
              {periods.map((period) => <button
                key={period.months}
                type="button"
                onClick={() => setMonths(period.months)}
                aria-pressed={months === period.months}
                className={`min-h-9 rounded-full px-3 text-[11px] font-semibold transition sm:px-4 ${months === period.months ? "bg-elevated text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >{period.label}</button>)}
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            <Link href="/insights" className="mb-3 inline-flex min-h-11 items-center text-sm text-info underline">Explore historical insights</Link><BalanceTrendChart transactions={data.transactions} currency={data.profile.currency} currentBalance={worth} months={months} reportTrend={chartReport.result?trendMonths(chartReport.result,now,months):[]} />
            <div className="mb-4 flex justify-end text-[10px] font-semibold text-muted-foreground"><span className="mr-2 mt-0.5 size-2.5 rounded-sm bg-income" aria-hidden="true" />Actual balance</div>
          </CardContent>
          <div className="grid border-t border-border sm:grid-cols-3">
            <BalanceMetric href="/accounts" label="Available cash" value={formatMoney(cash, data.profile.currency)} />
            <BalanceMetric href={transactionHref({...range,type:"income"})} label="Income this month" value={formatMoney(summary.income, data.profile.currency)} tone="income" />
            <BalanceMetric href={transactionHref(range)} label="Spent this month" value={formatMoney(summary.expenses, data.profile.currency)} tone="expense" />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="items-center border-b border-border pb-5 lg:pb-5">
            <div><p className="eyebrow mb-2">Latest activity</p><CardTitle className="text-xl">Recent transactions</CardTitle></div>
            <Link href="/transactions" className="pill-control min-h-9 px-3">View all <ArrowRight className="size-3.5" /></Link>
          </CardHeader>
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_110px] border-b border-border bg-elevated/45 px-7 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground sm:grid">
            <span>Transaction</span><span>Date</span><span>Type</span><span className="text-right">Amount</span>
          </div>
          <CardContent className="px-5 py-1 sm:px-7">{(recent.result?.rows ?? []).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accounts={data.accounts} categories={data.categories} compact showDetails />)}</CardContent>
        </Card>
      </div>

      <aside className="grid min-w-0 gap-5">
        <section>
          <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-xl font-semibold tracking-[-.035em]">My accounts</h2><Link href="/accounts" className="text-xs font-semibold text-info">See all</Link></div>
          {featuredAccount ? <ManagedAccountCard account={featuredAccount} balance={accountBalance(featuredAccount, data.transactions)} compact /> : <Card className="grid min-h-[226px] place-items-center p-6 text-center text-sm text-muted-foreground">Add a positive asset or cash account to feature it here.</Card>}
        </section>

        <Card>
          <CardHeader className="items-center pb-1 lg:pb-1">
            <div><p className="eyebrow mb-2">This month</p><CardTitle className="text-xl">Categories</CardTitle><Link href="/categories" className="mt-2 inline-block py-2 text-xs text-info">See all categories</Link></div>
            <p className="amount text-sm font-semibold">{formatMoney(summary.expenses, data.profile.currency)}</p>
          </CardHeader>
          <CardContent>
            <SpendingRing transactions={[]} groups={groups} categories={data.categories} currency={data.profile.currency} />
            <p className="mt-4 rounded-2xl border border-border bg-background/45 p-3.5 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">{topCategoryName}</strong> is your largest category at <strong className="text-foreground">{formatMoney(topCategory?.amountMinor ?? 0n, data.profile.currency)}</strong>.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 lg:pb-2"><div><p className="eyebrow mb-2">Coming up</p><CardTitle>Bills & subscriptions</CardTitle></div><Link href="/recurring" className="pill-control"><CalendarClock className="mr-2 size-4"/>See all</Link></CardHeader>
          <CardContent className="space-y-1 pt-1">
            {data.recurring.filter((item) => item.type === "expense" && (item.status==="active"||item.status==="due")).slice(0, 3).map((item) => <Link href={`/recurring#item-${item.id}`} className="flex min-w-0 items-center gap-3 border-b border-border py-3 last:border-0" key={item.id}>
              <span className={`size-2.5 rounded-full ${item.status === "due" ? "bg-warning" : "bg-info"}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-[11px] text-muted-foreground">Due {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.nextDate))}</p></div>
              <strong className="amount text-sm text-expense">{formatMoney(item.amountMinor, data.profile.currency)}</strong>
            </Link>)}
          </CardContent>
        </Card>
      </aside>
    </section>

    <section className="mt-5 grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader><div><p className="eyebrow mb-2">Your plan</p><CardTitle>Budget pulse</CardTitle><Link href="/budgets" className="mt-2 inline-block py-2 text-xs text-info">View all budgets</Link></div><span className="status-pill bg-secondary text-secondary-foreground">{budgetUsed}% used</span></CardHeader>
        <CardContent className="space-y-4">{data.budgets.slice(0, 3).map((budget) => { const progress = progressFor(budget); const progressTone = progress.percent > 100 ? "bg-destructive" : progress.percent >= budget.alertThreshold ? "bg-warning" : "bg-income"; return <Link href={`/budgets#budget-${budget.id}`} className="block min-w-0 py-2" key={budget.id}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{budget.name}</span><span className="text-muted-foreground">{formatMoney(progress.spentMinor, data.profile.currency)} / {formatMoney(budget.limitMinor, data.profile.currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted-surface"><div className={`h-full rounded-full ${progressTone}`} style={{ width: `${Math.min(progress.percent, 100)}%` }} /></div></Link>; })}</CardContent>
      </Card>
      <Card>
        <CardHeader><div><p className="eyebrow mb-2">Building toward</p><CardTitle>Savings goals</CardTitle><Link href="/goals" className="mt-2 inline-block py-2 text-xs text-info">View all goals</Link></div><Target className="size-5 text-info" /></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">{data.goals.slice(0, 2).map((goal) => <Link href={`/goals#goal-${goal.id}`} className="rounded-2xl border border-border bg-elevated/55 p-4" key={goal.id}><p className="text-sm font-semibold">{goal.name}</p><p className="amount mt-1 text-xs text-muted-foreground">{formatMoney(goal.currentMinor, data.profile.currency)} of {formatMoney(goal.targetMinor, data.profile.currency)}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${percentage(goal.currentMinor, goal.targetMinor)}%` }} /></div></Link>)}</CardContent>
      </Card>
    </section>
  </>;
}

function BalanceMetric({ label, value, tone, href }: { label: string; value: string; tone?: "income" | "expense"; href: string }) {
  return <Link href={href} className="min-w-0 border-t border-border px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 lg:px-7">
    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{label}</p>
    <p className={`amount mt-1.5 text-sm font-semibold ${tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-foreground"}`}>{value}</p>
  </Link>;
}

function DashboardSkeleton() {
  return <div className="animate-pulse"><div className="mb-8 h-16 w-1/2 rounded-2xl bg-muted-surface" /><div className="grid gap-5 xl:grid-cols-[1.65fr_.85fr]"><div className="h-[520px] rounded-panel bg-muted-surface" /><div className="h-[520px] rounded-panel bg-muted-surface" /></div></div>;
}
