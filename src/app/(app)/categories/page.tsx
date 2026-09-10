"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Pencil, Plus } from "lucide-react";
import { dateRange, transactionHref } from "@/features/transactions/query";
import { usePeriodReport } from "@/features/finance/use-finance-query";
import { MerchantRuleManager } from "@/features/imports/merchant-rule-manager";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

import { CategoryIcon } from "@/features/finance/category-icon";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, percentage, sumMoney } from "@/features/finance/money";
import type { Category } from "@/features/finance/types";
import { financeColors } from "@/lib/theme";

export default function CategoriesPage() {
  const { data, addCategory, updateCategory, deleteCategory } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing,setEditing]=useState<Category>();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; kind: Category["kind"]; color: string; parentId: string; sortOrder: number }>({ name: "", kind: "expense", color: financeColors.accent, parentId:"",sortOrder:0 });
  const active = data.categories.filter((category) => !category.archived).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)||a.name.localeCompare(b.name));
  const range=dateRange("this_month"); const report=usePeriodReport(range.dateFrom!,range.dateTo!);
  const spending=(report.result?.categories ?? []).map((row)=>({categoryId:row.id,amountMinor:row.amount}));
  const total = sumMoney(spending.map((item) => item.amountMinor));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Enter a category name.");
    setBusy(true);
    try {
      const draft={name:form.name,kind:form.kind,color:form.color,icon:editing?.icon ?? "Circle",parentId:form.parentId||undefined,sortOrder:form.sortOrder};
      if(editing) await updateCategory(editing.id,draft); else await addCategory(draft);
      setForm({ name: "", kind: "expense", color: financeColors.accent,parentId:"",sortOrder:0 });
      setOpen(false);
      toast.success(editing ? "Category updated." : "Category added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: Category) => {
    if (category.name.toLowerCase() === "uncategorized") return toast.error("Uncategorized is protected and cannot be deleted.");
    if (!window.confirm(`Delete ${category.name} and its subcategories? Existing transactions will move to Uncategorized; no financial history will be deleted.`)) return;
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted; existing transactions moved to Uncategorized.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    }
  };

  return <>
    <PageHeading eyebrow="Your system" title="Categories" description="A coordinated view of where money moves, built from your actual transactions." action={<Button className="rounded-full px-5" onClick={() => {setEditing(undefined);setForm({name:"",kind:"expense",color:financeColors.accent,parentId:"",sortOrder:0});setOpen(true);}}><Plus className="size-4" />Add category</Button>} />
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
        <div className="min-w-0 flex-1"><Link className="block min-h-11 truncate py-3 text-sm font-semibold hover:text-info" href={transactionHref({category:category.id,...range})}>{category.name}</Link>{category.parentId && <p className="truncate text-xs text-muted">Under {data.categories.find((row)=>row.id===category.parentId)?.name}</p>}<p className="mt-1 text-[11px] capitalize text-muted-foreground">{category.kind} · {formatMoney(amount, data.profile.currency)}</p></div>
        {category.name.toLowerCase()!=="uncategorized" && <Button size="icon" variant="ghost" aria-label={`Edit ${category.name}`} onClick={()=>{setEditing(category);setForm({name:category.name,kind:category.kind,color:category.color,parentId:category.parentId ?? "",sortOrder:category.sortOrder ?? 0});setOpen(true);}}><Pencil className="size-4"/></Button>}
        {category.name.toLowerCase() !== "uncategorized" ? <Button size="icon" variant="ghost" aria-label={`Delete ${category.name}`} onClick={() => void remove(category)}><Trash2 className="size-4" /></Button> : null}
      </CardContent></Card>; })}
    </div>
    {report.error && <p role="alert">{report.error}</p>}
    <MerchantRuleManager />
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit category" : "Add a category"} description="Custom categories are private to your account.">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <Field label="Category name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Pet care" /></Field>
        <Field label="Used for"><Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Category["kind"] })}><option value="expense">Expenses</option><option value="income">Income</option><option value="both">Income and expenses</option></Select></Field>
        <Field label="Parent category"><Select value={form.parentId} onChange={(event)=>setForm({...form,parentId:event.target.value})}><option value="">Top level</option>{active.filter((row)=>row.id!==editing?.id).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field><Field label="Display order"><Input type="number" value={form.sortOrder} onChange={(event)=>setForm({...form,sortOrder:Number(event.target.value)})}/></Field>
        <Field label="Color"><Input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="h-12 p-1" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save category" : "Add category"}</Button></div>
      </form>
    </Modal>
  </>;
}
