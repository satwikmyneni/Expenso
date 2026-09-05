"use client";

import { useState } from "react";
import { CalendarClock, CreditCard, Plus, Receipt, Repeat2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, parseMoney, sumMoney } from "@/features/finance/money";
import type { RecurringItem } from "@/features/finance/types";
import { accountBalance } from "@/features/finance/calculations";
import { accountDueDate } from "@/features/finance/liability-reminders";
import { titleCase } from "@/lib/utils";

const monthlyEquivalent = (item: RecurringItem) => item.frequency === "yearly" ? item.amountMinor / 12n : item.frequency === "quarterly" ? item.amountMinor / 3n : item.frequency === "weekly" ? item.amountMinor * 52n / 12n : item.frequency === "daily" ? item.amountMinor * 365n / 12n : item.amountMinor;

export default function RecurringPage() {
  const { data, addRecurringItem } = useFinance();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", type: "expense" as "expense" | "income", kind: "bill" as RecurringItem["kind"], frequency: "monthly" as RecurringItem["frequency"], nextDate: new Date().toISOString().slice(0, 10), accountId: data.accounts[0]?.id ?? "", categoryId: "" });
  const expenses = data.recurring.filter((item) => item.type === "expense");
  const monthly = sumMoney(expenses.map(monthlyEquivalent));
  const subscriptionMonthly = sumMoney(data.recurring.filter((item) => item.kind === "subscription").map(monthlyEquivalent));
  const liabilities = data.accounts.filter((account) => !account.archived && account.liabilityStatus !== "closed" && account.liabilityStatus !== "paused" && account.remindersEnabled !== false && (account.type === "credit_card" || account.type === "loan"));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    let amountMinor: bigint;
    try { amountMinor = parseMoney(form.amount); }
    catch (error) { return toast.error(error instanceof Error ? error.message : "Enter a valid amount."); }
    if (amountMinor <= 0n) return toast.error("Amount must be greater than zero.");
    if (form.kind === "recurring" && !form.accountId) return toast.error("Choose an account.");

    setBusy(true);
    try {
      await addRecurringItem({ title: form.title, amountMinor, type: form.kind === "subscription" || form.kind === "bill" ? "expense" : form.type, kind: form.kind, frequency: form.frequency, nextDate: form.nextDate, accountId: form.accountId || undefined, categoryId: form.categoryId || undefined });
      setOpen(false);
      setForm({ ...form, title: "", amount: "" });
      toast.success("Recurring item added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add recurring item.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <PageHeading eyebrow="Predictable money" title="Recurring & bills" description="Upcoming payments, subscriptions, and repeating income in one timeline." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" />Add recurring</Button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Metric icon={Repeat2} label="Monthly recurring" value={formatMoney(monthly, data.profile.currency)} /><Metric icon={CreditCard} label="Subscriptions" value={String(data.recurring.filter((item) => item.kind === "subscription").length)} /><Metric icon={CalendarClock} label="Due soon" value={String(data.recurring.filter((item) => item.status === "due").length)} warning /></div>
    {liabilities.length > 0 && <Card className="mb-5 overflow-hidden"><div className="border-b border-border p-5 sm:p-6"><h2 className="font-semibold">Card & loan reminders</h2><p className="mt-1 text-xs text-muted-foreground">Monthly due dates are tracked separately from spending transactions.</p></div><CardContent className="px-5 py-1 sm:px-6">{liabilities.map((account) => { const due = accountDueDate(account); const amount = account.type === "loan" ? account.emiMinor : account.minimumPaymentMinor; return <div key={account.id} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><span className="grid size-11 place-items-center rounded-[14px] bg-warning/10 text-warning">{account.type === "loan" ? <Receipt className="size-5" /> : <CreditCard className="size-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{account.type === "loan" ? "Loan EMI" : "Credit card payment"} · {due ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long" }).format(due) : "Due date not set"}</p></div><div className="text-right"><p className="amount text-sm font-semibold">{formatMoney(amount ?? accountBalance(account, data.transactions), data.profile.currency)}</p><span className="status-pill mt-1 bg-warning/10 text-warning">{account.reminderDays?.join("/") || "0"} day reminders</span></div></div>; })}</CardContent></Card>}
    <Card className="overflow-hidden"><div className="border-b border-border p-5 sm:p-6"><h2 className="font-semibold">Upcoming timeline</h2><p className="mt-1 text-xs text-muted-foreground">Expected events are forecasts until a transaction is confirmed.</p></div><CardContent className="px-5 py-1 sm:px-6">{data.recurring.length ? [...data.recurring].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).map((item) => <div key={`${item.kind}:${item.id}`} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><span className={`grid size-11 place-items-center rounded-[14px] ${item.status === "due" ? "bg-warning/10 text-warning" : "bg-secondary text-info"}`}>{item.kind === "subscription" ? <CreditCard className="size-5" /> : item.kind === "bill" ? <Receipt className="size-5" /> : <Repeat2 className="size-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{titleCase(item.kind)} · {titleCase(item.frequency)} · {item.nextDate ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long" }).format(new Date(`${item.nextDate}T12:00:00`)) : "Date not set"}</p></div><div className="text-right"><p className={`amount text-sm font-semibold ${item.type === "income" ? "text-income" : "text-expense"}`}>{item.type === "income" ? "+" : "−"}{formatMoney(item.amountMinor, data.profile.currency)}</p><span className={`status-pill mt-1 ${item.status === "due" ? "bg-warning/10 text-warning" : "bg-income/10 text-income"}`}>{item.status}</span></div></div>) : <div className="py-16 text-center text-sm text-muted-foreground">No recurring items yet.</div>}</CardContent></Card>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border bg-accent/40 p-4 text-sm"><TrendingUp className="mt-0.5 size-4 shrink-0 text-brand" /><p><strong>Subscription total:</strong> confirmed subscriptions are equivalent to {formatMoney(subscriptionMonthly, data.profile.currency)} per month.</p></div>

    <Modal open={open} onClose={() => setOpen(false)} title="Add a recurring item" description="Track a bill, subscription, or repeating transaction.">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Kind"><Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as RecurringItem["kind"] })}><option value="bill">Bill</option><option value="subscription">Subscription</option><option value="recurring">Recurring transaction</option></Select></Field>{form.kind === "recurring" && <Field label="Direction"><Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as "expense" | "income" })}><option value="expense">Expense</option><option value="income">Income</option></Select></Field>}</div>
        <Field label="Name"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Electricity" /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount"><Input required inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field><Field label="Frequency"><Select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as RecurringItem["frequency"] })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></Select></Field></div>
        <Field label="Next date"><Input required type="date" value={form.nextDate} onChange={(event) => setForm({ ...form, nextDate: event.target.value })} /></Field>
        <Field label={`Account${form.kind === "recurring" ? "" : " (optional)"}`}><Select required={form.kind === "recurring"} value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}><option value="">No account selected</option>{data.accounts.filter((account) => !account.archived).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</Select></Field>
        <Field label="Category (optional)"><Select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Uncategorized</option>{data.categories.filter((category) => !category.archived && (category.kind === (form.kind === "recurring" ? form.type : "expense") || category.kind === "both")).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</Select></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add recurring"}</Button></div>
      </form>
    </Modal>
  </>;
}

function Metric({ icon: Icon, label, value, warning }: { icon: typeof Repeat2; label: string; value: string; warning?: boolean }) {
  return <Card className="p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">{label}</p><p className={`amount mt-3 text-2xl font-extrabold ${warning ? "text-warning" : ""}`}>{value}</p></div><Icon className={`size-5 ${warning ? "text-warning" : "text-brand"}`} /></div></Card>;
}
