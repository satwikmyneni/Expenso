"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { endOfMonth, startOfMonth } from "date-fns";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { budgetProgress, transactionsInRange } from "@/features/finance/calculations";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, parseMoney, sumMoney } from "@/features/finance/money";

export default function BudgetsPage() {
  const { data, addBudget } = useFinance();
  const now = new Date();
  const current = transactionsInRange(data.transactions, startOfMonth(now), endOfMonth(now));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", limit: "", categoryId: "" });
  const totalLimit = sumMoney(data.budgets.map((item) => item.limitMinor));
  const spent = sumMoney(data.budgets.map((item) => budgetProgress(item, current, now).spentMinor));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.categoryId) return toast.error("Choose a category.");
    try {
      const limitMinor = parseMoney(form.limit);
      if (limitMinor <= 0n) return toast.error("Budget limit must be greater than zero.");
      await addBudget({ name: form.name, limitMinor, categoryIds: [form.categoryId], period: "monthly", alertThreshold: 80, rollover: false });
      toast.success("Budget created.");
      setOpen(false);
      setForm({ name: "", limit: "", categoryId: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create budget.");
    }
  };

  return <>
    <PageHeading eyebrow="Monthly plan" title="Budgets" description="Give every flexible category a calm, realistic boundary." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" />New budget</Button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Summary label="Monthly plan" value={formatMoney(totalLimit, data.profile.currency)} /><Summary label="Spent so far" value={formatMoney(spent, data.profile.currency)} /><Summary label="Still available" value={formatMoney(totalLimit - spent, data.profile.currency)} positive /></div>
    <div className="grid gap-4 md:grid-cols-2">{data.budgets.map((budget) => {
      const progress = budgetProgress(budget, current, now);
      const over = progress.percent >= 100;
      const warning = progress.percent >= budget.alertThreshold;
      const category = data.categories.find((item) => budget.categoryIds.includes(item.id));
      return <Card key={budget.id}><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ background: category?.color }} /><div><h2 className="font-bold">{budget.name}</h2><p className="mt-0.5 text-xs text-muted">Monthly budget</p></div></div>{over ? <AlertTriangle className="size-5 text-destructive" /> : warning ? <AlertTriangle className="size-5 text-warning" /> : <CheckCircle2 className="size-5 text-income" />}</div><div className="mt-7 flex items-end justify-between"><div><p className="amount text-2xl font-extrabold">{formatMoney(progress.spentMinor, data.profile.currency)}</p><p className="mt-1 text-xs text-muted">of {formatMoney(budget.limitMinor, data.profile.currency)}</p></div><span className={`text-sm font-bold ${over ? "text-destructive" : warning ? "text-warning" : "text-income"}`}>{progress.percent.toFixed(0)}%</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted-surface"><div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : warning ? "bg-warning" : "bg-income"}`} style={{ width: `${Math.min(progress.percent, 100)}%` }} /></div><p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><TrendingDown className="size-3.5 text-brand" />{over ? `Over by ${formatMoney(-progress.remainingMinor, data.profile.currency)}` : `${formatMoney(progress.remainingMinor, data.profile.currency)} left to spend`}</p></CardContent></Card>;
    })}</div>
    <Modal open={open} onClose={() => setOpen(false)} title="Create a budget" description="Set a clear monthly spending limit.">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <Field label="Budget name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Eating out" /></Field>
        <Field label="Category"><Select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose a category</option>{data.categories.filter((item) => !item.archived && item.kind !== "income").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Monthly limit"><Input required inputMode="decimal" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} placeholder="10000" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create budget</Button></div>
      </form>
    </Modal>
  </>;
}

function Summary({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <Card className="p-5"><p className="eyebrow">{label}</p><p className={`amount mt-3 text-2xl font-extrabold ${positive ? "text-income" : ""}`}>{value}</p></Card>;
}
