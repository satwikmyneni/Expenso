"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Mic, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFinance } from "@/features/finance/finance-provider";
import { detectDuplicates } from "@/features/finance/detection";
import { categorizeDeterministically } from "@/features/imports/categorization";
import type { TransactionDraft, TransactionType } from "@/features/finance/types";
import { parseVoiceTransaction, startVoiceCapture } from "./voice";
import type { FinanceTransaction } from "@/features/finance/types";
import { minorToDecimal, parseMoney } from "@/features/finance/money";

const schema = z.object({
  type: z.enum(["expense", "income", "transfer", "refund", "adjustment"]),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid positive amount"),
  accountId: z.string().min(1, "Choose an account"),
  transferAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().min(1, "Choose a date"),
  merchant: z.string().min(2, "Enter a merchant or description"),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  refundOfId: z.string().optional(),
  loanPrincipal: z.string().optional(),
  loanInterest: z.string().optional(),
}).superRefine((value, context) => {
  if (value.type === "transfer" && (!value.transferAccountId || value.transferAccountId === value.accountId)) context.addIssue({ code: "custom", path: ["transferAccountId"], message: "Choose a different destination account" });
  if (value.type === "refund" && !value.refundOfId) context.addIssue({ code: "custom", path: ["refundOfId"], message: "Choose the purchase being refunded" });
  if (value.type === "transfer" && (value.loanPrincipal || value.loanInterest)) {
    try {
      const principal = parseMoney(value.loanPrincipal ?? "");
      const interest = parseMoney(value.loanInterest ?? "");
      if (principal <= 0n) context.addIssue({ code: "custom", path: ["loanPrincipal"], message: "Principal must be greater than zero" });
      if (interest < 0n) context.addIssue({ code: "custom", path: ["loanInterest"], message: "Interest cannot be negative" });
      if (principal + interest !== parseMoney(value.amount)) context.addIssue({ code: "custom", path: ["loanInterest"], message: "Principal and interest must equal the payment amount" });
    } catch { context.addIssue({ code: "custom", path: ["loanPrincipal"], message: "Enter valid principal and interest amounts" }); }
  }
});
type FormValues = z.infer<typeof schema>;

const types: Array<{ value: TransactionType; label: string; icon: typeof ArrowUpRight }> = [
  { value: "expense", label: "Expense", icon: ArrowUpRight }, { value: "income", label: "Income", icon: ArrowDownLeft }, { value: "transfer", label: "Transfer", icon: ArrowLeftRight },
  { value: "refund", label: "Refund", icon: RotateCcw },
];

export function TransactionModal({ open, onClose, transaction, voicePrompt = false }: { open: boolean; onClose: () => void; transaction?: FinanceTransaction; voicePrompt?: boolean }) {
  const { data, addTransaction, updateTransaction } = useFinance();
  const [duplicateWarning, setDuplicateWarning] = useState<string>();
  const [listening, setListening] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: "expense", date: format(new Date(), "yyyy-MM-dd"), accountId: data.accounts[0]?.id, paymentMethod: "UPI" } });
  // React Hook Form deliberately exposes subscription-based values here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const type = watch("type");
  const merchant = watch("merchant");
  const accountId = watch("accountId");
  const refundOfId = watch("refundOfId");
  const transferAccountId = watch("transferAccountId");
  const loanDestination = type === "transfer" ? data.accounts.find((account) => account.id === transferAccountId && account.type === "loan") : undefined;

  useEffect(() => {
    if (!merchant?.trim()) return;
    const suggested = categorizeDeterministically({ merchant, type, accountId, categories: data.categories, personalRules: data.merchantRules, history: data.transactions });
    if (suggested.categoryId) setValue("categoryId", suggested.categoryId);
  }, [accountId, data.categories, data.merchantRules, data.transactions, merchant, setValue, type]);
  useEffect(() => {
    if (type !== "refund" || !refundOfId) return;
    const purchase = data.transactions.find((item) => item.id === refundOfId && item.type === "expense");
    if (!purchase) return;
    setValue("accountId", purchase.accountId);
    setValue("categoryId", purchase.categoryId);
    if (!merchant) setValue("merchant", purchase.merchant);
  }, [data.transactions, merchant, refundOfId, setValue, type]);
  useEffect(() => {
    if (loanDestination) return;
    setValue("loanPrincipal", undefined);
    setValue("loanInterest", undefined);
  }, [loanDestination, setValue]);
  useEffect(() => {
    if (!open) return;
    reset(transaction ? { type:transaction.type, amount:minorToDecimal(transaction.amountMinor), accountId:transaction.accountId, transferAccountId:transaction.transferAccountId, categoryId:transaction.categoryId, date:transaction.date, merchant:transaction.merchant, notes:transaction.notes, paymentMethod:transaction.paymentMethod, refundOfId:transaction.refundOfId, loanPrincipal:transaction.loanPrincipalMinor === undefined ? undefined : minorToDecimal(transaction.loanPrincipalMinor), loanInterest:transaction.loanInterestMinor === undefined ? undefined : minorToDecimal(transaction.loanInterestMinor) } : { type:"expense", date:format(new Date(),"yyyy-MM-dd"), accountId:data.accounts[0]?.id, paymentMethod:"UPI", amount:"", merchant:"" });
    setDuplicateWarning(undefined);
  }, [data.accounts, open, reset, transaction]);

  const submit = async (values: FormValues) => {
    if (loanDestination && (!values.loanPrincipal || values.loanInterest === undefined || values.loanInterest === "")) return toast.error("Enter the principal and interest split for this loan payment.");
    const draft: TransactionDraft = { ...values, source: "manual" };
    const duplicates = detectDuplicates(draft, data.transactions.filter((item)=>item.id!==transaction?.id));
    if (duplicates.length && !duplicateWarning) { setDuplicateWarning(`${duplicates[0].confidence === "likely" ? "Likely" : "Possible"} duplicate: ${duplicates[0].reasons.join(", ")}. Submit again to keep both.`); return; }
    try { if (transaction) await updateTransaction(transaction.id,draft); else await addTransaction(draft); toast.success(transaction ? "Transaction updated" : "Transaction added"); reset({ ...values, amount: "", merchant: "", notes: "" }); setDuplicateWarning(undefined); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save transaction"); }
  };

  const useVoice = async () => {
    setListening(true);
    try {
      const transcript = await startVoiceCapture();
      const parsed = parseVoiceTransaction(transcript);
      if (parsed.amount) setValue("amount", parsed.amount);
      if (parsed.merchant) setValue("merchant", parsed.merchant);
      if (parsed.type) setValue("type", parsed.type);
      if (parsed.date) setValue("date", parsed.date);
      toast.success("Voice parsed — review the details before saving");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Voice entry is unavailable"); }
    finally { setListening(false); }
  };

  return <Modal open={open} onClose={onClose} title={transaction ? "Edit transaction" : "Add transaction"} description={transaction ? "Historical balances and reports update automatically." : "Fast to enter, easy to review."}>
    <form onSubmit={handleSubmit(submit)} className="space-y-5 p-5 sm:p-6">
      {voicePrompt && !transaction && <div className="rounded-2xl border border-info/25 bg-info/10 p-4 text-sm"><p className="font-semibold">Voice entry is ready.</p><p className="mt-1 text-xs text-muted-foreground">Use the “Use voice” button below, then review the parsed fields before saving.</p></div>}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5 sm:grid-cols-4">
        {types.map((item) => <button type="button" key={item.value} onClick={() => setValue("type", item.value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${type === item.value ? "bg-surface text-brand shadow-sm" : "text-muted"}`}><item.icon className="size-4" />{item.label}</button>)}
      </div>
      <Field label="Amount" error={errors.amount?.message}>
        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted">₹</span><Input autoFocus inputMode="decimal" placeholder="0.00" className="h-16 pl-10 text-3xl font-bold amount" {...register("amount")} /></div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={type === "income" ? "Source" : "Merchant / description"} error={errors.merchant?.message}><Input placeholder={type === "income" ? "e.g. Acme salary" : "e.g. Nature's Basket"} {...register("merchant")} /></Field>
        <Field label="Date" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
        <Field label={type === "transfer" ? "From account" : "Account"} error={errors.accountId?.message}><Select {...register("accountId")}>{data.accounts.filter((account) => !account.archived).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</Select></Field>
        {type === "transfer" ? <Field label="To account" error={errors.transferAccountId?.message}><Select {...register("transferAccountId")}><option value="">Choose destination</option>{data.accounts.filter((account) => !account.archived).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</Select></Field> : <Field label="Category"><Select {...register("categoryId")}><option value="">Uncategorized</option>{data.categories.filter((category) => !category.archived && (category.kind === (type === "refund" ? "expense" : type) || category.kind === "both")).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</Select></Field>}
        {type === "refund" && <Field label="Original purchase" error={errors.refundOfId?.message}><Select {...register("refundOfId")}><option value="">Choose purchase</option>{data.transactions.filter((item) => item.type === "expense").map((item) => <option value={item.id} key={item.id}>{item.merchant} · {item.date} · {minorToDecimal(item.amountMinor)}</option>)}</Select></Field>}
        <Field label="Payment method"><Select {...register("paymentMethod")}><option>UPI</option><option>Credit card</option><option>Debit card</option><option>Cash</option><option>Bank transfer</option><option>Other</option></Select></Field>
      </div>
      {loanDestination && <div className="grid gap-4 rounded-2xl border border-border bg-canvas/55 p-4 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-sm font-semibold">Loan payment split</p><p className="mt-1 text-xs text-muted-foreground">Only principal reduces the loan. Interest is counted as spending.</p></div><Field label="Principal" error={errors.loanPrincipal?.message}><Input inputMode="decimal" {...register("loanPrincipal")} /></Field><Field label="Interest" error={errors.loanInterest?.message}><Input inputMode="decimal" {...register("loanInterest")} /></Field></div>}
      <Field label="Notes"><Textarea placeholder="Optional context" {...register("notes")} /></Field>
      {duplicateWarning && <div className="rounded-2xl border border-warning/35 bg-warning/10 p-4 text-sm font-semibold text-foreground"><Sparkles className="mr-2 inline size-4 text-warning" />{duplicateWarning}</div>}
      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={useVoice} disabled={listening}><Mic className={`size-4 ${listening ? "animate-pulse" : ""}`} />{listening ? "Listening…" : "Use voice"}</Button>
        <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : duplicateWarning ? "Keep both" : transaction ? "Save changes" : "Save transaction"}</Button></div>
      </div>
    </form>
  </Modal>;
}
