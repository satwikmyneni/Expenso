"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { dateRange, transactionHref } from "@/features/transactions/query";
import { usePeriodReport } from "@/features/finance/use-finance-query";
import type { Budget } from "@/features/finance/types";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, minorToDecimal, parseMoney, percentage, sumMoney } from "@/features/finance/money";

export default function BudgetsPage() {
  const { data, addBudget, updateBudget, archiveBudget } = useFinance();
  const monthlyRange=dateRange("this_month"); const weeklyRange=dateRange("this_week"); const yearlyRange=dateRange("this_year");
  const monthly=usePeriodReport(monthlyRange.dateFrom!,monthlyRange.dateTo!);
  const weekly=usePeriodReport(weeklyRange.dateFrom!,weeklyRange.dateTo!);
  const yearly=usePeriodReport(yearlyRange.dateFrom!,yearlyRange.dateTo!);
  const progressFor=(budget:Budget) => { const report=budget.period==="yearly"?yearly.result:budget.period==="weekly"?weekly.result:monthly.result; const spentMinor=report?.budgets.find((row)=>row.id===budget.id)?.spent ?? 0n; return {spentMinor,remainingMinor:budget.limitMinor-spentMinor,percent:percentage(spentMinor,budget.limitMinor)}; };
  const [editing,setEditing]=useState<Budget>();
  const [busy,setBusy]=useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", limit: "", categoryIds: [] as string[], period: "monthly" as Budget["period"] });
  const totalLimit = sumMoney(data.budgets.map((item) => item.limitMinor));
  const spent = sumMoney(data.budgets.map((item) => progressFor(item).spentMinor));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.categoryIds.length) return toast.error("Choose a category.");
    if (busy) return;
    setBusy(true);
    try {
      const limitMinor = parseMoney(form.limit);
      if (limitMinor <= 0n) return toast.error("Budget limit must be greater than zero.");
      const draft={name:form.name,limitMinor,categoryIds:form.categoryIds,period:form.period,alertThreshold:editing?.alertThreshold ?? 80,rollover:editing?.rollover ?? false};
      if(editing) await updateBudget(editing.id,draft); else await addBudget(draft);
      toast.success(editing ? "Budget updated." : "Budget created.");
      setOpen(false);
      setForm({ name: "", limit: "", categoryIds: [], period: "monthly" }); setEditing(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create budget.");
    } finally { setBusy(false); }
  };

  return <>
    <PageHeading eyebrow="Spending plans" title="Budgets" description="Give every flexible category a calm, realistic boundary." action={<Button onClick={() => {setEditing(undefined);setForm({name:"",limit:"",categoryIds:[],period:"monthly"});setOpen(true);}}><Plus className="size-4" />New budget</Button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Summary label="Planned limits" value={formatMoney(totalLimit, data.profile.currency)} /><Summary label="Spent so far" value={formatMoney(spent, data.profile.currency)} /><Summary label="Still available" value={formatMoney(totalLimit - spent, data.profile.currency)} positive /></div>
    <div className="grid gap-4 md:grid-cols-2">{data.budgets.map((budget) => {
      const progress = progressFor(budget);
      const over = progress.percent >= 100;
      const warning = progress.percent >= budget.alertThreshold;
      const category = data.categories.find((item) => budget.categoryIds.includes(item.id));
      return <Card id={`budget-${budget.id}`} className="scroll-mt-24 target:ring-2 target:ring-ring" key={budget.id}><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ background: category?.color }} /><div><h2 className="font-bold">{budget.name}</h2><p className="mt-0.5 text-xs text-muted">{budget.period} budget</p></div></div>{over ? <AlertTriangle className="size-5 text-destructive" /> : warning ? <AlertTriangle className="size-5 text-warning" /> : <CheckCircle2 className="size-5 text-income" />}</div><div className="mt-7 flex items-end justify-between"><div><p className="amount text-2xl font-extrabold">{formatMoney(progress.spentMinor, data.profile.currency)}</p><p className="mt-1 text-xs text-muted">of {formatMoney(budget.limitMinor, data.profile.currency)}</p></div><span className={`text-sm font-bold ${over ? "text-destructive" : warning ? "text-warning" : "text-income"}`}>{progress.percent.toFixed(0)}%</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted-surface"><div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : warning ? "bg-warning" : "bg-income"}`} style={{ width: `${Math.min(progress.percent, 100)}%` }} /></div><p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><TrendingDown className="size-3.5 text-brand" />{over ? `Over by ${formatMoney(-progress.remainingMinor, data.profile.currency)}` : `${formatMoney(progress.remainingMinor, data.profile.currency)} left to spend`}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={()=>{setEditing(budget);setForm({name:budget.name,limit:minorToDecimal(budget.limitMinor),categoryIds:budget.categoryIds,period:budget.period});setOpen(true);}}>Edit budget</Button><Button size="sm" variant="ghost" onClick={()=>{if(window.confirm("Archive this budget? Transactions remain unchanged.")) void archiveBudget(budget.id).then(()=>toast.success("Budget archived")).catch((error)=>toast.error(error.message));}}>Archive budget</Button>{budget.categoryIds.map((categoryId)=><Link key={categoryId} className="pill-control" href={transactionHref({category:categoryId,...dateRange(budget.period==="weekly"?"this_week":budget.period==="yearly"?"this_year":"this_month")})}>View {data.categories.find((row)=>row.id===categoryId)?.name ?? "transactions"}</Link>)}</div></CardContent></Card>;
    })}</div>
    {(monthly.error || weekly.error || yearly.error) && <p role="alert">{monthly.error || weekly.error || yearly.error}</p>}
    {!data.budgets.length && <p className="py-8 text-center text-muted">No budgets yet. Create a budget to start planning.</p>}
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit budget" : "Create a budget"} description="Set a clear monthly spending limit.">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <Field label="Budget name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Eating out" /></Field>
        <fieldset className="grid gap-2"><legend className="mb-2 text-xs font-semibold">Categories</legend>{data.categories.filter((item)=>!item.archived && item.kind!=="income").map((item)=><label key={item.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.categoryIds.includes(item.id)} onChange={(event)=>setForm({...form,categoryIds:event.target.checked?[...form.categoryIds,item.id]:form.categoryIds.filter((id)=>id!==item.id)})}/>{item.name}</label>)}</fieldset><Field label="Period"><Select value={form.period} onChange={(event)=>setForm({...form,period:event.target.value as Budget["period"]})}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
        <Field label="Budget limit"><Input required inputMode="decimal" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} placeholder="10000" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save budget" : "Create budget"}</Button></div>
      </form>
    </Modal>
  </>;
}

function Summary({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <Card className="p-5"><p className="eyebrow">{label}</p><p className={`amount mt-3 text-2xl font-extrabold ${positive ? "text-income" : ""}`}>{value}</p></Card>;
}
