import { differenceInCalendarDays, endOfMonth, format, isAfter, startOfDay } from "date-fns";
import type { Account } from "./types";

export interface LiabilityReminderCandidate {
  accountId: string;
  kind: "credit_card_due" | "loan_due";
  title: string;
  body: string;
  dueDate: string;
  leadDays: number;
  dedupeKey: string;
  actionUrl: string;
}

function dateAtDay(reference: Date, day: number) {
  const lastDay = endOfMonth(reference).getDate();
  return new Date(reference.getFullYear(), reference.getMonth(), Math.min(day, lastDay));
}

export function nextMonthlyDueDate(day: number, reference = new Date()) {
  const today = startOfDay(reference);
  let due = dateAtDay(today, day);
  if (isAfter(today, due)) due = dateAtDay(new Date(today.getFullYear(), today.getMonth() + 1, 1), day);
  return due;
}

export function accountDueDate(account: Account, reference = new Date()) {
  if (account.type === "credit_card" && account.paymentDueDay) return nextMonthlyDueDate(account.paymentDueDay, reference);
  if (account.type === "loan" && account.nextPaymentDate) {
    const configured = startOfDay(new Date(`${account.nextPaymentDate}T12:00:00`));
    const due = isAfter(startOfDay(reference), configured) ? nextMonthlyDueDate(configured.getDate(), reference) : configured;
    if (account.endDate && due > new Date(`${account.endDate}T23:59:59`)) return null;
    return due;
  }
  return null;
}

export function buildLiabilityReminderCandidates(accounts: Account[], reference = new Date()): LiabilityReminderCandidate[] {
  const today = startOfDay(reference);
  return accounts.flatMap((account) => {
    if (account.archived || account.liabilityStatus === "closed" || account.liabilityStatus === "paused" || account.remindersEnabled === false || (account.type !== "credit_card" && account.type !== "loan")) return [];
    const due = accountDueDate(account, reference);
    if (!due) return [];
    const leadDays = differenceInCalendarDays(due, today);
    if (!(account.reminderDays ?? [7, 3, 0]).includes(leadDays)) return [];
    const dueDate = format(due, "yyyy-MM-dd");
    const name = account.name || account.institution || (account.type === "loan" ? "Loan" : "Credit card");
    const dueText = leadDays === 0 ? "due today" : `due in ${leadDays} days`;
    const kind = account.type === "loan" ? "loan_due" : "credit_card_due";
    return [{
      accountId: account.id,
      kind,
      title: account.type === "loan" ? "Loan EMI reminder" : "Credit card payment reminder",
      body: `Your ${name} ${account.type === "loan" ? "EMI" : "payment"} is ${dueText}.`,
      dueDate,
      leadDays,
      dedupeKey: `${kind}:${account.id}:${dueDate}:${leadDays}`,
      actionUrl: `/accounts?manage=${encodeURIComponent(account.id)}`,
    }];
  });
}
