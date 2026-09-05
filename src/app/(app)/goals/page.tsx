"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Laptop, Pencil, Plane, Plus, ShieldCheck, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { isAssetAccountType } from "@/features/accounts/account-semantics";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney, parseMoney, percentage, sumMoney } from "@/features/finance/money";
import type { Goal, GoalContribution, GoalContributionDraft } from "@/features/finance/types";
import { financeColors } from "@/lib/theme";

const icons = { ShieldCheck, Plane, Laptop };
const today = () => new Date().toISOString().slice(0, 10);

export default function GoalsPage() {
  const { data, addGoal, addGoalContribution, updateGoalContribution, deleteGoalContribution } = useFinance();
  const [creating, setCreating] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", targetDate: "2027-03-31" });
  const [contributionGoal, setContributionGoal] = useState<Goal>();
  const [editingContribution, setEditingContribution] = useState<GoalContribution>();
  const [removingContribution, setRemovingContribution] = useState<GoalContribution>();
  const [contributionForm, setContributionForm] = useState({ amount: "", date: today(), sourceAccountId: "", note: "" });
  const [busy, setBusy] = useState(false);
  const sourceAccounts = data.accounts.filter((account) => !account.archived && isAssetAccountType(account.type));
  const totalTarget = sumMoney(data.goals.map((item) => item.targetMinor));
  const totalCurrent = sumMoney(data.goals.map((item) => item.currentMinor));

  const createGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const targetMinor = parseMoney(goalForm.target);
      if (targetMinor <= 0n) return toast.error("Target amount must be greater than zero.");
      await addGoal({ name: goalForm.name.trim(), targetMinor, currentMinor: 0n, openingMinor: 0n, targetDate: goalForm.targetDate, color: financeColors.accent, icon: "Target" });
      toast.success("Goal created");
      setGoalForm({ name: "", target: "", targetDate: "2027-03-31" });
      setCreating(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create goal"); }
  };

  const openContribution = (goal: Goal, contribution?: GoalContribution) => {
    setContributionGoal(goal);
    setEditingContribution(contribution);
    setContributionForm(contribution ? {
      amount: `${contribution.amountMinor / 100n}.${String(contribution.amountMinor % 100n).padStart(2, "0")}`,
      date: contribution.date,
      sourceAccountId: contribution.sourceAccountId ?? "",
      note: contribution.note ?? "",
    } : { amount: "", date: today(), sourceAccountId: sourceAccounts[0]?.id ?? "", note: "" });
  };

  const saveContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contributionGoal) return;
    let amountMinor: bigint;
    try { amountMinor = parseMoney(contributionForm.amount); }
    catch { return toast.error("Enter a valid contribution amount."); }
    if (amountMinor <= 0n) return toast.error("Contribution amount must be greater than zero.");
    if (!contributionForm.sourceAccountId) return toast.error("Choose the account where this money is held.");
    const draft: GoalContributionDraft = { goalId: contributionGoal.id, ...contributionForm };
    setBusy(true);
    try {
      if (editingContribution) await updateGoalContribution(editingContribution.id, draft);
      else await addGoalContribution(draft);
      toast.success(editingContribution ? "Contribution updated" : "Money added to goal");
      setContributionGoal(undefined);
      setEditingContribution(undefined);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save contribution"); }
    finally { setBusy(false); }
  };

  const removeContribution = async () => {
    if (!removingContribution) return;
    setBusy(true);
    try {
      await deleteGoalContribution(removingContribution.id);
      toast.success("Contribution removed and goal progress recalculated");
      setRemovingContribution(undefined);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove contribution"); }
    finally { setBusy(false); }
  };

  const totalRemaining = totalTarget > totalCurrent ? totalTarget - totalCurrent : 0n;
  return <>
    <PageHeading eyebrow="Make progress visible" title="Savings goals" description={`You’ve set aside ${formatMoney(totalCurrent, data.profile.currency)} across ${data.goals.length} priorities.`} action={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New goal</Button>} />
    <Card className="mb-5 bg-primary text-primary-foreground"><CardContent className="p-7 sm:p-8"><div className="grid items-end gap-7 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/60">Overall progress</p><p className="amount mt-3 text-4xl font-extrabold">{Math.min(percentage(totalCurrent, totalTarget), 100).toFixed(0)}%</p><p className="mt-2 text-sm text-primary-foreground/65">{formatMoney(totalRemaining, data.profile.currency)} remaining across every goal</p></div><Target className="hidden size-14 text-primary-foreground/20 sm:block" /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-income" style={{ width: `${Math.min(percentage(totalCurrent, totalTarget), 100)}%` }} /></div></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">{data.goals.map((goal) => <GoalCard key={goal.id} goal={goal} contributions={data.goalContributions.filter((item) => item.goalId === goal.id)} currency={data.profile.currency} accounts={data.accounts} onAdd={() => openContribution(goal)} onEdit={(contribution) => openContribution(goal, contribution)} onRemove={setRemovingContribution} />)}</div>
    {!data.goals.length && <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Create a goal, then add real contribution records as you save.</CardContent></Card>}

    <Modal open={creating} onClose={() => setCreating(false)} title="Create a savings goal" description="New goals begin at zero; each amount saved is recorded in its contribution history."><form onSubmit={createGoal} className="grid gap-4 p-5 sm:p-6"><Field label="Goal name"><Input required value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder="e.g. Emergency fund" autoFocus /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Target amount"><Input required inputMode="decimal" value={goalForm.target} onChange={(event) => setGoalForm({ ...goalForm, target: event.target.value })} /></Field><Field label="Target date"><Input type="date" required value={goalForm.targetDate} onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })} /></Field></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit">Create goal</Button></div></form></Modal>

    <Modal open={Boolean(contributionGoal)} onClose={() => { setContributionGoal(undefined); setEditingContribution(undefined); }} title={editingContribution ? "Edit contribution" : "Add money"} description="This records a savings allocation. It does not create an expense or deduct the account twice.">
      <form onSubmit={saveContribution} className="grid gap-4 p-5 sm:p-6">
        <Field label="Amount"><Input required inputMode="decimal" value={contributionForm.amount} onChange={(event) => setContributionForm({ ...contributionForm, amount: event.target.value })} autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><Input required type="date" value={contributionForm.date} onChange={(event) => setContributionForm({ ...contributionForm, date: event.target.value })} /></Field><Field label="Source account"><Select required value={contributionForm.sourceAccountId} onChange={(event) => setContributionForm({ ...contributionForm, sourceAccountId: event.target.value })}><option value="">Choose account</option>{sourceAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field></div>
        <Field label="Note (optional)"><Textarea value={contributionForm.note} onChange={(event) => setContributionForm({ ...contributionForm, note: event.target.value })} placeholder="e.g. Monthly allocation" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setContributionGoal(undefined)}>Cancel</Button><Button type="submit" disabled={busy || !sourceAccounts.length}>{busy ? "Saving…" : editingContribution ? "Save changes" : "Add contribution"}</Button></div>
        {!sourceAccounts.length && <p className="text-xs text-destructive">Add an asset or cash account before recording a contribution.</p>}
      </form>
    </Modal>

    <Modal open={Boolean(removingContribution)} onClose={() => setRemovingContribution(undefined)} title="Remove contribution?" description="Only the goal allocation record is removed. No transaction or source-account history is deleted."><div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end sm:p-6"><Button variant="secondary" onClick={() => setRemovingContribution(undefined)}>Cancel</Button><Button variant="danger" onClick={() => void removeContribution()} disabled={busy}>{busy ? "Removing…" : "Remove contribution"}</Button></div></Modal>
  </>;
}

function GoalCard({ goal, contributions, currency, accounts, onAdd, onEdit, onRemove }: { goal: Goal; contributions: GoalContribution[]; currency: string; accounts: { id: string; name: string }[]; onAdd: () => void; onEdit: (contribution: GoalContribution) => void; onRemove: (contribution: GoalContribution) => void }) {
  const Icon = icons[goal.icon as keyof typeof icons] ?? Target;
  const rawProgress = percentage(goal.currentMinor, goal.targetMinor);
  const visualProgress = Math.min(Math.max(rawProgress, 0), 100);
  const remaining = goal.targetMinor > goal.currentMinor ? goal.targetMinor - goal.currentMinor : 0n;
  const reached = goal.currentMinor >= goal.targetMinor;
  return <Card><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: goal.color }}><Icon className="size-5" /></span><Button size="sm" onClick={onAdd}><Plus className="size-4" />Add money</Button></div><h2 className="mt-5 text-lg font-bold">{goal.name}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><GoalMetric label="Saved" value={formatMoney(goal.currentMinor, currency)} /><GoalMetric label="Target" value={formatMoney(goal.targetMinor, currency)} /><GoalMetric label="Remaining" value={formatMoney(remaining, currency)} /><GoalMetric label="Progress" value={`${rawProgress.toFixed(0)}%`} /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full" style={{ width: `${visualProgress}%`, background: goal.color }} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><CalendarDays className="size-3.5" />Target {goal.targetDate ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${goal.targetDate}T12:00:00`)) : "not set"}</span>{reached && <span className="flex items-center gap-1 font-semibold text-income"><CheckCircle2 className="size-4" />{goal.currentMinor > goal.targetMinor ? `Overfunded by ${formatMoney(goal.currentMinor - goal.targetMinor, currency)}` : "Goal reached"}</span>}</div><div className="mt-5 border-t border-border pt-4"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Contribution history</h3><div className="mt-2 divide-y divide-border">{(goal.openingMinor ?? 0n) > 0n && <div className="py-3 text-sm"><p className="font-semibold">{formatMoney(goal.openingMinor ?? 0n, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Opening saved balance · retained from before contribution tracking</p></div>}{contributions.map((contribution) => { const source = accounts.find((account) => account.id === contribution.sourceAccountId)?.name ?? "Source account unavailable"; return <div key={contribution.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="amount text-sm font-semibold">{formatMoney(contribution.amountMinor, currency)}</p><p className="mt-1 truncate text-xs text-muted-foreground">{source} · {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${contribution.date}T12:00:00`))}{contribution.note ? ` · ${contribution.note}` : ""}{contribution.linkedTransactionId ? " · Linked transaction" : ""}</p></div><Button size="icon" variant="ghost" aria-label={`Edit ${formatMoney(contribution.amountMinor, currency)} contribution`} onClick={() => onEdit(contribution)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${formatMoney(contribution.amountMinor, currency)} contribution`} onClick={() => onRemove(contribution)}><Trash2 className="size-4" /></Button></div>; })}{!(goal.openingMinor ?? 0n) && !contributions.length && <p className="py-4 text-sm text-muted-foreground">No contributions yet.</p>}</div></div></CardContent></Card>;
}

function GoalMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-canvas/70 p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="amount mt-1 truncate text-sm font-bold">{value}</p></div>;
}
