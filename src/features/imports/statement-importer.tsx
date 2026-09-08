"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, FileUp, Loader2, Search, ShieldCheck, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { useFinance } from "@/features/finance/finance-provider";
import { parseMoney } from "@/features/finance/money";
import type { ImportHistoryItem, TransactionType } from "@/features/finance/types";
import { sha256File } from "./file-security";
import { normalizeMerchant, normalizeMerchantKey } from "./merchant-normalization";
import { parseStatement } from "./pipeline";
import { importRowToDraft, normalizeReviewedRow, prepareRowsForReview } from "./review";
import type { NormalizedTransaction } from "./types";

const PAGE_SIZE = 40;

function updateRow(rows: NormalizedTransaction[], id: string, changes: Partial<NormalizedTransaction>) {
  return rows.map((row) => row.id === id ? normalizeReviewedRow({ ...row, ...changes, reviewed: changes.reviewed ?? true }) : row);
}

function amountForSort(value: string) {
  try { return parseMoney(value); }
  catch { return -1n; }
}

export function StatementImporter() {
  const { data, addTransactions, loadImportCandidates, findImportByHash, createImport, completeImport, saveMerchantRule } = useFinance();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<NormalizedTransaction[]>([]);
  const [file, setFile] = useState<File>();
  const [fileHash, setFileHash] = useState("");
  const [previousImport, setPreviousImport] = useState<ImportHistoryItem>();
  const [accountId, setAccountId] = useState(data.accounts.find((account) => !account.archived)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | NormalizedTransaction["status"]>("all");
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "merchant">("date-asc");
  const [bulkCategory, setBulkCategory] = useState("");
  const [page, setPage] = useState(0);
  const activeAccounts = data.accounts.filter((account) => !account.archived);
  const activeCategories = data.categories.filter((category) => !category.archived);
  const selectedAccount = activeAccounts.find((account) => account.id === accountId);

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesSearch = !search || `${row.merchant} ${row.description} ${row.reference ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === "all" || row.status === filter);
  }).sort((left, right) => {
    if (sort === "date-desc") return right.date.localeCompare(left.date) || right.rowNumber - left.rowNumber;
    if (sort === "amount-desc") {
      const leftAmount = amountForSort(left.amount);
      const rightAmount = amountForSort(right.amount);
      return rightAmount === leftAmount ? left.rowNumber - right.rowNumber : rightAmount > leftAmount ? 1 : -1;
    }
    if (sort === "merchant") return left.merchant.localeCompare(right.merchant);
    return left.date.localeCompare(right.date) || left.rowNumber - right.rowNumber;
  }), [filter, rows, search, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = rows.filter((row) => row.selected && row.status === "ready").length;

  const pick = async (nextFile?: File) => {
    if (!nextFile) return;
    if (!selectedAccount) return toast.error("Choose the Expenso account represented by this statement first.");
    setBusy(true);
    setProgress({ value: 1, message: "Validating statement" });
    try {
      const hash = await sha256File(nextFile);
      const earlier = await findImportByHash(hash);
      setPreviousImport(earlier);
      const parsed = await parseStatement(nextFile, (value, message) => setProgress({ value, message }));
      const dated = parsed.map((row) => row.date).filter(Boolean).sort();
      const start = dated[0];
      const end = dated[dated.length - 1];
      const existing = start && end ? await loadImportCandidates(selectedAccount.id, start, end) : [];
      const reviewed = prepareRowsForReview(parsed, { account: selectedAccount, categories: data.categories, merchantRules: data.merchantRules, history: data.transactions, duplicateCandidates: existing });
      setRows(reviewed);
      setFile(nextFile);
      setFileHash(hash);
      setPage(0);
      toast.success(`${reviewed.length} rows normalized for explicit review.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The statement could not be parsed.");
    } finally {
      setBusy(false);
      setProgress({ value: 0, message: "" });
      if (input.current) input.current.value = "";
    }
  };

  const changeAccount = async (nextAccountId: string) => {
    setAccountId(nextAccountId);
    if (!rows.length) return;
    const account = activeAccounts.find((item) => item.id === nextAccountId);
    if (!account) return;
    setBusy(true);
    try {
      const dated = rows.map((row) => row.date).filter(Boolean).sort();
      const existing = dated.length ? await loadImportCandidates(nextAccountId, dated[0], dated[dated.length - 1]) : [];
      setRows(prepareRowsForReview(rows.map((row) => ({ ...row, duplicate: undefined, importDuplicateAnyway: false, accountId: nextAccountId })), { account, categories: data.categories, merchantRules: data.merchantRules, history: data.transactions, duplicateCandidates: existing }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not refresh duplicate checks."); }
    finally { setBusy(false); }
  };

  const confirmImport = async () => {
    if (!file || !selectedAccount) return toast.error("Choose a statement and account.");
    const selected = rows.filter((row) => row.selected && row.status === "ready");
    if (!selected.length) return toast.error("Explicitly select at least one ready row.");
    setBusy(true);
    let history: ImportHistoryItem | undefined;
    let completed = 0;
    try {
      history = await createImport({ accountId: selectedAccount.id, fileName: file.name, fileType: file.name.split(".").pop()?.toLowerCase() ?? file.type, fileHash, totalRows: rows.length });
      const drafts = selected.map((row) => importRowToDraft(row, history!.id));
      await addTransactions(drafts, (done, total) => {
        completed = done;
        setProgress({ value: Math.round((done / total) * 100), message: `Saving batch ${done} of ${total}` });
      });
      const remembered = new Map(selected.filter((row) => row.rememberRule && row.categoryId).map((row) => [normalizeMerchantKey(row.merchant), row]));
      for (const [merchantNormalized, row] of remembered) {
        await saveMerchantRule({ pattern: normalizeMerchant(row.merchant), merchantNormalized, categoryId: row.categoryId!, accountId: row.accountId, transactionType: row.type });
      }
      await completeImport(history.id, {
        importedRows: selected.length,
        skippedRows: rows.length - selected.length,
        duplicateRows: rows.filter((row) => row.status === "duplicate" && !row.importDuplicateAnyway).length,
        failedRows: rows.filter((row) => row.status === "invalid").length,
      });
      setRows([]);
      setFile(undefined);
      setFileHash("");
      setPreviousImport(undefined);
      toast.success(`${selected.length} confirmed transactions imported.`);
    } catch (error) {
      if (history) {
        try {
          await completeImport(history.id, {
            importedRows: completed,
            skippedRows: rows.length - selected.length,
            duplicateRows: rows.filter((row) => row.status === "duplicate" && !row.importDuplicateAnyway).length,
            failedRows: selected.length - completed,
            errorMessage: error instanceof Error ? error.message : "Import stopped during a batch.",
          });
        } catch { /* Preserve the original actionable import error. */ }
      }
      if (completed) {
        const importedIds = new Set(selected.slice(0, completed).map((row) => row.id));
        setRows((current) => current.map((row) => importedIds.has(row.id) ? { ...row, selected: false, status: "skipped", issueCodes: [...row.issueCodes, "already_imported"] } : row));
      }
      toast.error(`${completed ? `${completed} rows were saved before the import stopped. ` : ""}${error instanceof Error ? error.message : "Import failed."}`);
    } finally {
      setBusy(false);
      setProgress({ value: 0, message: "" });
    }
  };

  const selectAllVisible = (selected: boolean) => {
    const visibleIds = new Set(visibleRows.map((row) => row.id));
    setRows((current) => current.map((row) => {
      if (!visibleIds.has(row.id) || row.status === "invalid" || (row.duplicate && !row.importDuplicateAnyway)) return row;
      return normalizeReviewedRow({ ...row, selected, reviewed: selected || row.reviewed });
    }));
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    setRows((current) => current.map((row) => row.selected && row.type !== "transfer" ? normalizeReviewedRow({ ...row, categoryId: bulkCategory, categoryReason: "Bulk user correction", confidence: "high", reviewed: true }) : row));
    toast.success("Category applied to selected rows. Choose Remember per merchant where appropriate.");
  };

  return <div className="space-y-5">
    <Card className="border-dashed"><CardContent className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-7">
      <div><p className="eyebrow">Upload locally</p><h2 className="mt-2 text-xl font-bold">Choose the account, then the statement</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">PDF, CSV, XLS, XLSX, and TXT are parsed before any transaction or import record is saved.</p><div className="mt-4 max-w-sm"><Field label="Statement account"><Select value={accountId} onChange={(event) => void changeAccount(event.target.value)}><option value="">Choose account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution ?? account.type}</option>)}</Select></Field></div></div>
      <div><input ref={input} className="sr-only" type="file" accept=".pdf,.csv,.xls,.xlsx,.txt,application/pdf,text/csv,text/plain" onChange={(event) => void pick(event.target.files?.[0])} /><Button className="min-h-12 w-full sm:w-auto" onClick={() => input.current?.click()} disabled={busy || !accountId}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}{busy ? "Reading…" : "Choose statement"}</Button><p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-income" />20 MB · 5,000 rows max</p></div>
      {busy && progress.value > 0 && <div className="sm:col-span-2" role="status"><div className="flex justify-between text-xs font-semibold"><span>{progress.message}</span><span>{progress.value}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${progress.value}%` }} /></div></div>}
    </CardContent></Card>

    {previousImport && <div className="rounded-2xl border border-warning/35 bg-warning/10 p-4 text-sm" role="alert"><p className="font-bold">This exact file was imported before.</p><p className="mt-1 text-xs text-muted-foreground">Previous import: {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(previousImport.createdAt))}. Every matching transaction is still checked individually.</p></div>}

    {rows.length > 0 && <>
      <Card><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-accent text-brand"><FileSpreadsheet className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{file?.name}</p><p className="text-xs text-muted-foreground">{rows.length} rows · {rows.filter((row) => row.status === "needs_review").length} need review · {rows.filter((row) => row.status === "duplicate").length} duplicates</p></div></div></div>
        <div className="grid gap-2 sm:grid-cols-3 xl:flex"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9 xl:w-56" aria-label="Search review rows" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search rows" /></label><Select aria-label="Filter review status" value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(0); }}><option value="all">All statuses</option><option value="ready">Ready</option><option value="needs_review">Needs review</option><option value="duplicate">Duplicates</option><option value="invalid">Invalid</option><option value="skipped">Skipped</option></Select><Select aria-label="Sort review rows" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(0); }}><option value="date-asc">Oldest first</option><option value="date-desc">Newest first</option><option value="amount-desc">Largest amount</option><option value="merchant">Merchant A–Z</option></Select></div>
        <Button onClick={() => void confirmImport()} disabled={busy || selectedCount === 0}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Import {selectedCount}</Button>
      </div><div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center"><label className="flex min-h-11 items-center gap-2 text-xs font-bold"><input type="checkbox" onChange={(event) => selectAllVisible(event.target.checked)} />Select visible reviewed rows</label><div className="flex min-w-0 flex-1 gap-2 sm:justify-end"><Select className="min-w-0 max-w-64" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} aria-label="Bulk category"><option value="">Bulk category…</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Button variant="secondary" onClick={applyBulkCategory} disabled={!bulkCategory}>Apply</Button></div></div></CardContent></Card>

      <div className="hidden overflow-hidden rounded-[22px] border border-border bg-surface md:block"><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="bg-canvas text-[10px] uppercase tracking-[.1em] text-muted-foreground"><tr><th className="p-3">Use</th><th className="p-3">Date</th><th className="p-3">Merchant / original</th><th className="p-3">Amount</th><th className="p-3">Type</th><th className="p-3">Category / counterpart</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{visibleRows.map((row) => <DesktopReviewRow key={row.id} row={row} accounts={activeAccounts} categories={activeCategories} purchases={data.transactions.filter((item) => item.type === "expense" && item.accountId === row.accountId)} onChange={(changes) => setRows((current) => updateRow(current, row.id, changes))} />)}</tbody></table></div></div>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:hidden">{visibleRows.map((row) => <MobileReviewRow key={row.id} row={row} accounts={activeAccounts} categories={activeCategories} purchases={data.transactions.filter((item) => item.type === "expense" && item.accountId === row.accountId)} onChange={(changes) => setRows((current) => updateRow(current, row.id, changes))} />)}</div>
      {pageCount > 1 && <div className="flex items-center justify-between"><Button variant="secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-xs font-semibold">Page {page + 1} of {pageCount}</span><Button variant="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
    </>}

    {data.imports.length > 0 && <Card><CardContent className="p-5 sm:p-6"><h2 className="text-sm font-bold">Import history</h2><div className="mt-3 divide-y divide-border">{data.imports.slice(0, 8).map((item) => <div key={item.id} className="flex flex-col gap-2 py-3 text-xs sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.fileName}</p><p className="mt-1 text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))} · {item.fileType.toUpperCase()}</p></div><div className="grid grid-cols-4 gap-3 text-center"><HistoryMetric label="Imported" value={item.importedRows} /><HistoryMetric label="Skipped" value={item.skippedRows} /><HistoryMetric label="Duplicates" value={item.duplicateRows} /><HistoryMetric label="Failed" value={item.failedRows} /></div></div>)}</div></CardContent></Card>}
  </div>;
}

type RowProps = { row: NormalizedTransaction; accounts: Array<{ id: string; name: string }>; categories: Array<{ id: string; name: string }>; purchases: Array<{ id: string; date: string; merchant: string }>; onChange: (changes: Partial<NormalizedTransaction>) => void };

function DesktopReviewRow({ row, accounts, categories, purchases, onChange }: RowProps) {
  return <tr className="border-t border-border align-top"><td className="p-3"><input aria-label={`Import row ${row.rowNumber}`} type="checkbox" checked={row.selected} disabled={row.status === "invalid" || Boolean(row.duplicate && !row.importDuplicateAnyway)} onChange={(event) => onChange({ selected: event.target.checked, reviewed: event.target.checked })} /></td><td className="p-3"><Input className="w-36" type="date" value={row.date} onChange={(event) => onChange({ date: event.target.value })} /></td><td className="p-3"><Input className="w-52" aria-label={`Merchant row ${row.rowNumber}`} value={row.merchant} onChange={(event) => onChange({ merchant: event.target.value, confidence: "low", categoryReason: "Merchant edited" })} /><p className="mt-1 max-w-52 truncate text-[10px] text-muted-foreground" title={row.description}>{row.description}</p></td><td className="p-3"><Input className="w-28" inputMode="decimal" value={row.amount} onChange={(event) => onChange({ amount: event.target.value })} /></td><td className="p-3"><Select className="w-32" value={row.type} onChange={(event) => onChange({ type: event.target.value as TransactionType, categoryId: event.target.value === "transfer" ? undefined : row.categoryId })}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option><option value="refund">Refund</option><option value="adjustment">Adjustment</option></Select></td><td className="p-3"><RowRelationship row={row} accounts={accounts} categories={categories} purchases={purchases} onChange={onChange} /></td><td className="p-3"><ReviewBadge row={row} /></td><td className="p-3"><RowActions row={row} onChange={onChange} /></td></tr>;
}

function MobileReviewRow({ row, accounts, categories, purchases, onChange }: RowProps) {
  return <Card><CardContent className="grid min-w-0 grid-cols-1 gap-3 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{row.merchant}</p><p className="mt-1 line-clamp-2 break-all text-xs text-muted-foreground">{row.description}</p></div><ReviewBadge row={row} /></div><div className="grid grid-cols-2 gap-3"><Field label="Date"><Input type="date" value={row.date} onChange={(event) => onChange({ date: event.target.value })} /></Field><Field label="Amount"><Input inputMode="decimal" value={row.amount} onChange={(event) => onChange({ amount: event.target.value })} /></Field></div><Field label="Merchant"><Input value={row.merchant} onChange={(event) => onChange({ merchant: event.target.value, confidence: "low" })} /></Field><Field label="Type"><Select value={row.type} onChange={(event) => onChange({ type: event.target.value as TransactionType, categoryId: event.target.value === "transfer" ? undefined : row.categoryId })}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option><option value="refund">Refund</option><option value="adjustment">Adjustment</option></Select></Field><RowRelationship row={row} accounts={accounts} categories={categories} purchases={purchases} onChange={onChange} /><div className="flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-xs font-bold"><input type="checkbox" checked={row.selected} disabled={row.status === "invalid" || Boolean(row.duplicate && !row.importDuplicateAnyway)} onChange={(event) => onChange({ selected: event.target.checked, reviewed: event.target.checked })} />Import this row</label><RowActions row={row} onChange={onChange} /></div></CardContent></Card>;
}

function RowRelationship({ row, accounts, categories, purchases, onChange }: RowProps) {
  if (row.type === "transfer") return <div><Select className="w-full min-w-0 md:min-w-44" value={row.transferAccountId ?? ""} onChange={(event) => onChange({ transferAccountId: event.target.value || undefined })}><option value="">Choose counterpart</option>{accounts.filter((account) => account.id !== row.accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select><p className="mt-1 text-[10px] text-muted-foreground">{row.transferReason ?? "Confirmed transfer"}</p></div>;
  if (row.type === "refund") return <div><Select className="w-full min-w-0 md:min-w-44" value={row.refundOfId ?? ""} onChange={(event) => onChange({ refundOfId: event.target.value || undefined })}><option value="">Original purchase</option>{purchases.map((purchase) => <option key={purchase.id} value={purchase.id}>{purchase.date} · {purchase.merchant}</option>)}</Select><CategoryAndRemember row={row} categories={categories} onChange={onChange} /></div>;
  return <CategoryAndRemember row={row} categories={categories} onChange={onChange} />;
}

function CategoryAndRemember({ row, categories, onChange }: Pick<RowProps, "row" | "categories" | "onChange">) {
  return <div><Select className="w-full min-w-0 md:min-w-44" value={row.categoryId ?? ""} onChange={(event) => onChange({ categoryId: event.target.value || undefined, confidence: "high", categoryReason: "User correction", rememberRule: false })}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><p className="mt-1 text-[10px] text-muted-foreground">{row.categoryReason ?? "Needs a deterministic match"}</p>{row.categoryReason === "User correction" && <label className="mt-1 flex min-h-8 items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" checked={row.rememberRule ?? false} onChange={(event) => onChange({ rememberRule: event.target.checked })} />Always categorize {row.merchant} this way</label>}</div>;
}

function ReviewBadge({ row }: { row: NormalizedTransaction }) {
  const label = row.status === "needs_review" ? "Needs review" : row.status === "duplicate" ? "Duplicate" : row.status.charAt(0).toUpperCase() + row.status.slice(1);
  const tone = row.status === "ready" ? "bg-income/10 text-income" : row.status === "duplicate" ? "bg-warning/10 text-warning" : row.status === "invalid" ? "bg-expense/10 text-expense" : "bg-muted-surface text-muted-foreground";
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>{label} · {row.confidence === "low" ? "low" : row.confidence}</span>;
}

function RowActions({ row, onChange }: Pick<RowProps, "row" | "onChange">) {
  if (row.duplicate) return <Select className="w-36" aria-label={`Duplicate action row ${row.rowNumber}`} value={row.importDuplicateAnyway ? "import" : row.status === "needs_review" ? "review" : "skip"} onChange={(event) => {
    if (event.target.value === "import") onChange({ importDuplicateAnyway: true, reviewed: true, selected: true, status: "ready" });
    else if (event.target.value === "review") onChange({ importDuplicateAnyway: false, status: "needs_review", selected: false });
    else onChange({ importDuplicateAnyway: false, status: "duplicate", selected: false });
  }}><option value="skip">Skip duplicate</option><option value="review">Review</option><option value="import">Import anyway</option></Select>;
  return <Button size="sm" variant="ghost" onClick={() => onChange({ status: "skipped", selected: false })}><SkipForward className="size-3.5" />Skip</Button>;
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return <span><strong className="block text-sm">{value}</strong><small className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</small></span>;
}
