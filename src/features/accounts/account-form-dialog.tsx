"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { accountFormSchema, accountFormToDraft, accountToForm, accountTypeOptions, type AccountFormValues } from "./account-form";
import type { Account, AccountDraft } from "@/features/finance/types";

type FormErrors = Partial<Record<keyof AccountFormValues, string>>;

export function AccountFormDialog({
  open,
  onClose,
  account,
  accounts = [],
  currency,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  account?: Account;
  accounts?: Account[];
  currency: string;
  onSave: (draft: AccountDraft) => Promise<void>;
}) {
  if (!open) return null;
  return <OpenAccountFormDialog onClose={onClose} account={account} accounts={accounts} currency={currency} onSave={onSave} />;
}

function OpenAccountFormDialog({
  onClose,
  account,
  accounts,
  currency,
  onSave,
}: {
  onClose: () => void;
  account?: Account;
  accounts: Account[];
  currency: string;
  onSave: (draft: AccountDraft) => Promise<void>;
}) {
  const [form, setForm] = useState<AccountFormValues>(() => accountToForm(account));
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);

  const update = <Key extends keyof AccountFormValues>(key: Key, value: AccountFormValues[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = accountFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AccountFormValues;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setBusy(true);
    try { await onSave(accountFormToDraft(parsed.data, currency, account)); }
    finally { setBusy(false); }
  };

  const title = account ? "Edit account" : "Add an account";
  const liability = form.type === "credit_card" || form.type === "loan";
  const paymentAccounts = accounts.filter((item) => item.id !== account?.id && !item.archived && !["credit_card", "loan", "liability"].includes(item.type));
  return <Modal open onClose={onClose} title={title} description={account ? "Changes keep the same account ID and transaction history." : "Add an institution so Expenso can apply the correct verified branding."}>
    <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6" noValidate>
      <Field label="Account name" error={errors.name}>
        <Input required aria-invalid={Boolean(errors.name)} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Salary account" autoFocus />
      </Field>
      <Field label="Institution name" error={errors.institution}>
        <Input required aria-invalid={Boolean(errors.institution)} value={form.institution} onChange={(event) => update("institution", event.target.value)} placeholder="e.g. HDFC Bank" />
      </Field>
      <Field label="Account type" error={errors.type}>
        <Select value={form.type} onChange={(event) => update("type", event.target.value as AccountFormValues["type"])}>{accountTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
      </Field>
      <Field label={liability ? "Current outstanding" : "Opening balance"} error={errors.opening} hint={liability ? (account ? "Total currently owed, including recorded purchases and payments. This is not just the statement amount due." : "Amount owed before the transactions you will record in Expenso. Do not include purchases you will add separately.") : "The balance before your first Expenso transaction."}>
        <Input required aria-invalid={Boolean(errors.opening)} inputMode="decimal" value={form.opening} onChange={(event) => update("opening", event.target.value)} />
      </Field>
      {form.type === "credit_card" && <div className="grid gap-4 rounded-2xl border border-border bg-canvas/45 p-4 sm:grid-cols-2">
        <Field label="Credit limit" error={errors.creditLimit}><Input required inputMode="decimal" aria-invalid={Boolean(errors.creditLimit)} value={form.creditLimit} onChange={(event) => update("creditLimit", event.target.value)} /></Field>
        <Field label="Card network (optional)"><Select value={form.cardNetwork} onChange={(event) => update("cardNetwork", event.target.value as AccountFormValues["cardNetwork"])}><option value="">Unknown</option><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="american_express">American Express</option><option value="rupay">RuPay</option></Select></Field>
        <Field label="Statement day" error={errors.statementDay}><Input required type="number" min="1" max="31" aria-invalid={Boolean(errors.statementDay)} value={form.statementDay} onChange={(event) => update("statementDay", event.target.value)} /></Field>
        <Field label="Payment due day" error={errors.paymentDueDay}><Input required type="number" min="1" max="31" aria-invalid={Boolean(errors.paymentDueDay)} value={form.paymentDueDay} onChange={(event) => update("paymentDueDay", event.target.value)} /></Field>
        <Field label="Minimum payment (optional)" error={errors.minimumPayment}><Input inputMode="decimal" aria-invalid={Boolean(errors.minimumPayment)} value={form.minimumPayment} onChange={(event) => update("minimumPayment", event.target.value)} /></Field>
        <Field label="Payment account (optional)"><Select value={form.paymentAccountId} onChange={(event) => update("paymentAccountId", event.target.value)}><option value="">Choose when paying</option>{paymentAccounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
      </div>}
      {(form.type === "debit_card" || form.type === "prepaid_card") && <Field label="Card network (optional)"><Select value={form.cardNetwork} onChange={(event) => update("cardNetwork", event.target.value as AccountFormValues["cardNetwork"])}><option value="">Unknown</option><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="american_express">American Express</option><option value="rupay">RuPay</option></Select></Field>}
      {form.type === "loan" && <div className="grid gap-4 rounded-2xl border border-border bg-canvas/45 p-4 sm:grid-cols-2">
        <Field label="Original principal" error={errors.originalPrincipal}><Input required inputMode="decimal" aria-invalid={Boolean(errors.originalPrincipal)} value={form.originalPrincipal} onChange={(event) => update("originalPrincipal", event.target.value)} /></Field>
        <Field label="Interest rate (%)" error={errors.interestRate}><Input required inputMode="decimal" aria-invalid={Boolean(errors.interestRate)} value={form.interestRate} onChange={(event) => update("interestRate", event.target.value)} /></Field>
        <Field label="EMI amount" error={errors.emi}><Input required inputMode="decimal" aria-invalid={Boolean(errors.emi)} value={form.emi} onChange={(event) => update("emi", event.target.value)} /></Field>
        <Field label="Repayment account (optional)"><Select value={form.paymentAccountId} onChange={(event) => update("paymentAccountId", event.target.value)}><option value="">Choose when repaying</option>{paymentAccounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Next payment date" error={errors.nextPaymentDate}><Input required type="date" aria-invalid={Boolean(errors.nextPaymentDate)} value={form.nextPaymentDate} onChange={(event) => update("nextPaymentDate", event.target.value)} /></Field>
        <Field label="Start date (optional)"><Input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
        <Field label="End date (optional)" error={errors.endDate}><Input type="date" aria-invalid={Boolean(errors.endDate)} value={form.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field>
      </div>}
      {liability && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status"><Select value={form.liabilityStatus} onChange={(event) => update("liabilityStatus", event.target.value as AccountFormValues["liabilityStatus"])}><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></Select></Field>
        <Field label="Reminders"><Select value={form.reminderSchedule} onChange={(event) => update("reminderSchedule", event.target.value as AccountFormValues["reminderSchedule"])}><option value="7,3,0">7 days, 3 days, and due date</option><option value="3,0">3 days and due date</option><option value="0">Due date only</option><option value="off">Off</option></Select></Field>
      </div>}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : account ? "Save changes" : "Add account"}</Button>
      </div>
    </form>
  </Modal>;
}
