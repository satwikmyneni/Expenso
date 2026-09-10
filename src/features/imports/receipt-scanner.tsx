"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, FileImage, FileUp, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { isAssetAccountType } from "@/features/accounts/account-semantics";
import { useFinance } from "@/features/finance/finance-provider";
import type { TransactionType } from "@/features/finance/types";
import { categorizeDeterministically } from "./categorization";
import { duplicateAgainstExisting } from "./duplicate-detection";
import { validateReceiptFile } from "./file-security";
import { normalizeMerchant, normalizeMerchantKey } from "./merchant-normalization";
import { scanReceipt } from "./ocr";
import type { DuplicateCandidate, ReceiptExtraction } from "./types";

const emptyExtraction: ReceiptExtraction = { rawText: "", merchant: "", amount: "", date: "", type: "expense", confidence: "low", issueCodes: [] };

export function ReceiptScanner() {
  const { data, addTransaction, loadImportCandidates, saveMerchantRule, uploadReceipt } = useFinance();
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [extraction, setExtraction] = useState<ReceiptExtraction>(emptyExtraction);
  const [accountId, setAccountId] = useState(data.accounts.find((account) => !account.archived && account.isActive !== false && isAssetAccountType(account.type))?.id ?? data.accounts.find((account) => !account.archived && account.isActive !== false)?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [refundOfId, setRefundOfId] = useState("");
  const [remember, setRemember] = useState(false);
  const [attachOriginal, setAttachOriginal] = useState(true);
  const [duplicate, setDuplicate] = useState<DuplicateCandidate>();
  const [importAnyway, setImportAnyway] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: "" });
  const [busy, setBusy] = useState(false);
  const [pendingAttachmentTransactionId, setPendingAttachmentTransactionId] = useState<string>();
  const activeAccounts = data.accounts.filter((account) => !account.archived && account.isActive !== false);
  const categories = data.categories.filter((category) => !category.archived && (category.kind === "both" || category.kind === (extraction.type === "income" ? "income" : "expense")));
  const purchases = useMemo(() => data.transactions.filter((transaction) => transaction.type === "expense" && transaction.accountId === accountId), [accountId, data.transactions]);

  const choose = async (nextFile?: File) => {
    if (!nextFile) return;
    try { validateReceiptFile(nextFile); }
    catch (error) { return toast.error(error instanceof Error ? error.message : "Unsupported receipt file."); }
    setBusy(true);
    setProgress({ value: 1, message: "Preparing local extraction" });
    setPendingAttachmentTransactionId(undefined);
    try {
      const result = await scanReceipt(nextFile, (value, message) => setProgress({ value, message }));
      const suggestion = categorizeDeterministically({ merchant: result.merchant, description: result.rawText, type: result.type, accountId, categories: data.categories, personalRules: data.merchantRules, history: data.transactions });
      setFile(nextFile);
      setExtraction(result);
      setCategoryId(suggestion.categoryId ?? "");
      setRemember(false);
      setImportAnyway(false);
      setDuplicate(undefined);
      if (!result.amount) toast.error("Couldn't confidently read the amount. Enter it before saving.");
      else if (!result.merchant) toast.error("Couldn't confidently read the merchant. Enter it before saving.");
      else toast.success("Receipt extracted locally — review every field before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Receipt OCR failed. Try another image or enter the transaction manually.");
    } finally {
      setBusy(false);
      setProgress({ value: 0, message: "" });
    }
  };

  const recategorize = () => {
    const suggestion = categorizeDeterministically({ merchant: extraction.merchant, description: extraction.rawText, type: extraction.type, accountId, categories: data.categories, personalRules: data.merchantRules, history: data.transactions });
    setExtraction((current) => ({ ...current, merchant: suggestion.merchant }));
    setCategoryId(suggestion.categoryId ?? "");
  };

  const findDuplicate = async () => {
    if (!extraction.date || !extraction.amount || !accountId) return undefined;
    const existing = await loadImportCandidates(accountId, extraction.date, extraction.date);
    const candidate = duplicateAgainstExisting({
      id: "receipt-review",
      rowNumber: 1,
      date: extraction.date,
      description: extraction.rawText,
      merchant: normalizeMerchant(extraction.merchant),
      amount: extraction.amount,
      direction: extraction.type === "income" || extraction.type === "refund" ? "credit" : "debit",
      type: extraction.type,
      reference: extraction.reference,
      selected: true,
      status: "ready",
      issueCodes: [],
      confidence: extraction.confidence,
      accountId,
      source: "pdf",
    }, existing);
    setDuplicate(candidate);
    return candidate;
  };

  const receiptMetadata = () => ({
    extraction_method: "local_non_ai_ocr",
    upi_id: extraction.upiId ?? null,
    reference: extraction.reference ?? null,
    invoice_number: extraction.invoiceNumber ?? null,
    order_number: extraction.orderNumber ?? null,
    transaction_time: extraction.time ?? null,
  });

  const retryAttachment = async () => {
    if (!file || !pendingAttachmentTransactionId) return;
    setBusy(true);
    try {
      await uploadReceipt(pendingAttachmentTransactionId, file, receiptMetadata());
      setPendingAttachmentTransactionId(undefined);
      setFile(undefined);
      setExtraction(emptyExtraction);
      toast.success("Receipt attached securely.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not attach receipt."); }
    finally { setBusy(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !accountId) return toast.error("Choose a receipt and account.");
    if (!extraction.merchant.trim() || !extraction.amount || !extraction.date) return toast.error("Merchant, amount, and date are required.");
    if (extraction.type !== "transfer" && !categoryId) return toast.error("Choose a category, including Uncategorized when the merchant is unknown.");
    if (extraction.type === "transfer" && (!transferAccountId || transferAccountId === accountId)) return toast.error("Choose a different transfer account.");
    if (extraction.type === "refund" && !refundOfId) return toast.error("Choose the original purchase for this refund.");
    const currentDuplicate = duplicate ?? await findDuplicate();
    if (currentDuplicate && !importAnyway) return toast.error("A possible duplicate exists. Review it and explicitly choose Import anyway if it is legitimate.");

    setBusy(true);
    try {
      const merchant = normalizeMerchant(extraction.merchant);
      const transaction = await addTransaction({
        accountId,
        transferAccountId: extraction.type === "transfer" ? transferAccountId : undefined,
        categoryId: extraction.type === "transfer" ? undefined : categoryId,
        type: extraction.type,
        amount: extraction.amount,
        date: extraction.date,
        merchant,
        description: "Scanned receipt",
        paymentMethod: extraction.paymentMethod,
        reference: extraction.reference,
        refundOfId: extraction.type === "refund" ? refundOfId : undefined,
        duplicateOfId: importAnyway ? currentDuplicate?.transactionId : undefined,
        reviewStatus: importAnyway && currentDuplicate?.transactionId ? "duplicate" : "confirmed",
        source: "ocr",
        metadata: receiptMetadata(),
      });
      if (remember && categoryId) await saveMerchantRule({ pattern: merchant, merchantNormalized: normalizeMerchantKey(merchant), categoryId, accountId, transactionType: extraction.type });
      if (attachOriginal && !data.demo) {
        try { await uploadReceipt(transaction.id, file, receiptMetadata()); }
        catch (error) {
          setPendingAttachmentTransactionId(transaction.id);
          toast.error(error instanceof Error ? error.message : "Transaction saved, but receipt attachment failed.");
          return;
        }
      }
      toast.success(data.demo && attachOriginal ? "Transaction saved in the sample workspace; receipt files are not persisted in sample mode." : "Transaction and receipt review saved.");
      setFile(undefined);
      setExtraction(emptyExtraction);
      setCategoryId("");
      setDuplicate(undefined);
      setImportAnyway(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the scanned transaction."); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <Card className="border-dashed"><CardContent className="p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <ReceiptChoice icon={Camera} label="Take photo" description="Use the rear camera" onClick={() => cameraInput.current?.click()} />
        <ReceiptChoice icon={FileImage} label="Choose photo" description="JPG, PNG, or WEBP" onClick={() => photoInput.current?.click()} />
        <ReceiptChoice icon={FileUp} label="Choose file" description="Image or PDF · 10 MB max" onClick={() => fileInput.current?.click()} />
      </div>
      <input ref={cameraInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void choose(event.target.files?.[0])} />
      <input ref={photoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choose(event.target.files?.[0])} />
      <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => void choose(event.target.files?.[0])} />
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 text-income" />OCR runs locally in your browser. Nothing is saved until you confirm.</p>
      {busy && progress.value > 0 && <div className="mt-5" role="status"><div className="flex justify-between text-xs font-semibold"><span>{progress.message}</span><span>{progress.value}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted-surface"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress.value}%` }} /></div></div>}
    </CardContent></Card>

    {file && <Card><CardContent className="p-5 sm:p-7"><form onSubmit={save} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Editable OCR review</p><h2 className="mt-1 text-xl font-bold">Confirm the transaction</h2><p className="mt-1 max-w-xl text-xs text-muted-foreground">{file.name} · extracted deterministically; verify every field.</p></div><Button type="button" variant="secondary" onClick={recategorize}><RotateCcw className="size-4" />Normalize again</Button></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Merchant"><Input required value={extraction.merchant} onChange={(event) => setExtraction({ ...extraction, merchant: event.target.value })} /></Field><Field label="Amount"><Input required inputMode="decimal" value={extraction.amount} onChange={(event) => setExtraction({ ...extraction, amount: event.target.value })} placeholder="0.00" /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Date"><Input required type="date" value={extraction.date} onChange={(event) => setExtraction({ ...extraction, date: event.target.value })} /></Field><Field label="Type"><Select value={extraction.type} onChange={(event) => setExtraction({ ...extraction, type: event.target.value as TransactionType })}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option><option value="refund">Refund</option></Select></Field><Field label="Account"><Select required value={accountId} onChange={(event) => { setAccountId(event.target.value); setDuplicate(undefined); }}><option value="">Choose account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field></div>
      {extraction.type === "transfer" ? <Field label="Transfer to"><Select value={transferAccountId} onChange={(event) => setTransferAccountId(event.target.value)}><option value="">Choose destination</option>{activeAccounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field> : <Field label="Category"><Select required value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setRemember(true); }}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>}
      {extraction.type === "refund" && <Field label="Original purchase"><Select required value={refundOfId} onChange={(event) => setRefundOfId(event.target.value)}><option value="">Choose purchase</option>{purchases.map((transaction) => <option key={transaction.id} value={transaction.id}>{transaction.date} · {transaction.merchant}</option>)}</Select></Field>}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Reference / UTR"><Input value={extraction.reference ?? ""} onChange={(event) => setExtraction({ ...extraction, reference: event.target.value || undefined })} /></Field><Field label="Payment method"><Input value={extraction.paymentMethod ?? ""} onChange={(event) => setExtraction({ ...extraction, paymentMethod: event.target.value || undefined })} /></Field></div>
      <Field label="Extracted text (review only)" hint="Raw OCR text is not placed in the transaction description."><Textarea rows={5} value={extraction.rawText} onChange={(event) => setExtraction({ ...extraction, rawText: event.target.value })} /></Field>
      <div className="grid gap-3 rounded-2xl border border-border bg-canvas/55 p-4 text-sm"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><strong>Remember this merchant and category</strong><small className="block text-muted-foreground">Creates a private exact-match rule for future imports.</small></span></label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={attachOriginal} onChange={(event) => setAttachOriginal(event.target.checked)} /><span><strong>Attach original receipt</strong><small className="block text-muted-foreground">Stored privately under your authenticated user path.</small></span></label></div>
      {duplicate && <div className="rounded-2xl border border-warning/35 bg-warning/10 p-4 text-sm"><p className="font-bold">Possible duplicate</p><p className="mt-1 text-xs text-muted-foreground">{duplicate.reasons.join(", ")}</p><label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={importAnyway} onChange={(event) => setImportAnyway(event.target.checked)} />Import anyway — this is a separate transaction</label></div>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => void findDuplicate()}>Check duplicate</Button>{pendingAttachmentTransactionId ? <Button type="button" onClick={() => void retryAttachment()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}Retry receipt attachment</Button> : <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Add transaction</Button>}</div>
    </form></CardContent></Card>}
  </div>;
}

function ReceiptChoice({ icon: Icon, label, description, onClick }: { icon: typeof Camera; label: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-ring/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-brand"><Icon className="size-5" /></span><span><strong className="block text-sm">{label}</strong><small className="mt-1 block text-muted-foreground">{description}</small></span></button>;
}
