"use client";

import { useState } from "react";
import { Archive, ArrowUpRight, Plus, Store, Trash2 } from "lucide-react";
import { endOfMonth, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { spendingByCategory, transactionsInRange } from "@/features/finance/calculations";
import { CategoryIcon } from "@/features/finance/category-icon";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, percentage, sumMoney } from "@/features/finance/money";
import type { Category } from "@/features/finance/types";
import { financeColors } from "@/lib/theme";

export default function CategoriesPage() {
  const { data, addCategory, archiveCategory, updateMerchantRule, deleteMerchantRule } = useFinance();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; kind: Category["kind"]; color: string }>({ name: "", kind: "expense", color: financeColors.accent });
  const active = data.categories.filter((category) => !category.archived);
  const current = transactionsInRange(data.transactions, startOfMonth(new Date()), endOfMonth(new Date()));
  const spending = spendingByCategory(current);
  const total = sumMoney(spending.map((item) => item.amountMinor));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Enter a category name.");
    setBusy(true);
    try {
      await addCategory({ name: form.name, kind: form.kind, color: form.color, icon: "Circle" });
      setForm({ name: "", kind: "expense", color: financeColors.accent });
      setOpen(false);
      toast.success("Category added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category.");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (category: Category) => {
    if (category.isDefault) return;
    if (!window.confirm(`Archive ${category.name}? Existing transactions will move to Uncategorized; no financial history will be deleted.`)) return;
    try {
      await archiveCategory(category.id);
      toast.success("Category archived; existing transactions moved to Uncategorized.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive category.");
    }
  };

  return <>
    <PageHeading eyebrow="Your system" title="Categories" description="A coordinated view of where money moves, built from your actual transactions." action={<Button className="rounded-full px-5" onClick={() => setOpen(true)}><Plus className="size-4" />Add category</Button>} />
    <Card className="mb-5 overflow-hidden">
      <CardHeader className="items-center pb-4 lg:pb-4"><div><p className="eyebrow mb-2">This month</p><CardTitle className="text-xl">Spending distribution</CardTitle></div><div className="text-right"><p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">Spent</p><p className="amount mt-1 text-xl font-semibold">{formatMoney(total, data.profile.currency)}</p></div></CardHeader>
      <CardContent className="pt-0">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted-surface" aria-label="Category spending distribution">
          {spending.map((item) => { const category = active.find((entry) => entry.id === item.categoryId); return <span key={item.categoryId} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${percentage(item.amountMinor, total)}%`, background: category?.color ?? financeColors.neutral }} title={category?.name ?? "Other"} />; })}
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {spending.slice(0, 6).map((item) => { const category = active.find((entry) => entry.id === item.categoryId); return <div key={item.categoryId} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated/45 p-3.5"><span className="size-2.5 rounded-full" style={{ background: category?.color ?? financeColors.neutral }} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{category?.name ?? "Other"}</span><span className="amount text-xs text-muted-foreground">{formatMoney(item.amountMinor, data.profile.currency)}</span></div>; })}
        </div>
      </CardContent>
    </Card>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {active.map((category) => { const amount = spending.find((item) => item.categoryId === category.id)?.amountMinor ?? 0n; return <Card key={category.id} className="group transition hover:border-ring/35"><CardContent className="flex items-center gap-4 p-4 lg:p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px]" style={{ backgroundColor: `${category.color}22`, color: category.color }}><CategoryIcon name={category.icon} className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{category.name}</p><p className="mt-1 text-[11px] capitalize text-muted-foreground">{category.kind} · {formatMoney(amount, data.profile.currency)}</p></div>
        {!category.isDefault ? <Button size="icon" variant="ghost" aria-label={`Archive ${category.name}`} onClick={() => void archive(category)}><Archive className="size-4" /></Button> : <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />}
      </CardContent></Card>; })}
    </div>
    <Card className="mt-5 overflow-hidden">
      <CardHeader><div><p className="eyebrow mb-2">Deterministic learning</p><CardTitle>Merchant rules</CardTitle><p className="mt-2 text-sm text-muted-foreground">Private exact-match corrections used before built-in and keyword rules. Removing one never removes a transaction.</p></div><Store className="size-5 text-brand" /></CardHeader>
      <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
        {data.merchantRules.length ? <div className="divide-y divide-border">{data.merchantRules.map((rule) => <div key={rule.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{rule.pattern}</p><p className="mt-1 text-xs text-muted-foreground">Exact personal rule · {rule.enabled ? "Active" : "Disabled because its category was archived"}</p></div><Select className="sm:w-56" aria-label={`Category for ${rule.pattern}`} value={rule.categoryId ?? ""} onChange={(event) => void updateMerchantRule(rule.id, event.target.value).then(() => toast.success("Merchant rule updated.")).catch((error) => toast.error(error instanceof Error ? error.message : "Could not update rule."))}><option value="">Choose category</option>{active.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Button size="icon" variant="ghost" aria-label={`Delete merchant rule for ${rule.pattern}`} onClick={() => { if (window.confirm(`Delete the rule for ${rule.pattern}? Existing transactions will not change.`)) void deleteMerchantRule(rule.id).then(() => toast.success("Merchant rule deleted.")).catch((error) => toast.error(error instanceof Error ? error.message : "Could not delete rule.")); }}><Trash2 className="size-4" /></Button></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No personal rules yet. Correct a category during import and choose “Always categorize” to create one.</p>}
      </CardContent>
    </Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Add a category" description="Custom categories are private to your account.">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <Field label="Category name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Pet care" /></Field>
        <Field label="Used for"><Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Category["kind"] })}><option value="expense">Expenses</option><option value="income">Income</option><option value="both">Income and expenses</option></Select></Field>
        <Field label="Color"><Input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="h-12 p-1" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add category"}</Button></div>
      </form>
    </Modal>
  </>;
}
