"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { format, isValid, subDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeading } from "@/components/page-heading";
import { useFinance } from "@/features/finance/finance-provider";
import { useTransactions, usePeriodReport } from "@/features/finance/use-finance-query";
import type { FinanceTransaction, TransactionType, TransactionSource } from "@/features/finance/types";
import { TransactionRow } from "@/features/transactions/transaction-row";
import { TransactionModal } from "@/features/transactions/transaction-modal";
import { dateRange, datePresets, transactionSorts, type DatePreset, type TransactionQuery, type TransactionSort } from "@/features/transactions/query";
import { formatMoney } from "@/features/finance/money";
import { accountBalance } from "@/features/finance/calculations";
import { exportTransactionsCsv } from "@/features/exports/csv";

const presetLabels = ["All dates", "Today", "Yesterday", "This week", "This month", "Last month", "Last 7 days", "Last 30 days", "This year", "Last year", "Custom date range"];
const sortLabels = ["Newest", "Oldest", "Amount high → low", "Amount low → high", "Recently uploaded/imported", "Oldest uploaded/imported"];
export default function TransactionsPage() { return <Suspense fallback={<p role="status">Loading transactions…</p>}><TransactionsContent /></Suspense>; }

function TransactionsContent() {
  const { data, deleteTransaction, exportTransactions } = useFinance();
  const params = useSearchParams();
  const [addOpen,setAddOpen] = useState(false);
  const [editing,setEditing] = useState<FinanceTransaction>();
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [exporting,setExporting] = useState(false);
  const [custom,setCustom] = useState({ from: params.get("dateFrom") ?? "", through: params.get("dateTo") && isValid(new Date(params.get("dateTo") + "T12:00:00")) ? format(subDays(new Date(params.get("dateTo") + "T12:00:00"),1),"yyyy-MM-dd") : "" });
  const query: TransactionQuery = {
    account: params.get("account") ?? params.get("accountId") ?? undefined,
    category: params.get("category") ?? undefined, type: (params.get("type") || undefined) as TransactionType | undefined,
    source: (params.get("source") || undefined) as TransactionSource | undefined, importId: params.get("importId") ?? undefined,
    id: params.get("id") ?? undefined, search: params.get("search") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined, dateTo: params.get("dateTo") ?? undefined,
    minAmount: params.get("minAmount") ?? undefined, maxAmount: params.get("maxAmount") ?? undefined,
    sort: transactionSorts.includes(params.get("sort") as TransactionSort) ? params.get("sort") as TransactionSort : "newest",
    page: Math.max(Number(params.get("page")) || 0,0), pageSize: 25,
  };
  const { result,error,refresh } = useTransactions(query);
  const selectedAccount = data.accounts.find((row) => row.id === query.account);
  const change = (values: Record<string,string | undefined>) => {
    // Read the synchronously updated URL, not a previous React render. Native
    // history is integrated with useSearchParams by Next; rapid changes compose
    // without racing server navigations or dropping other active filters.
    const next = new URLSearchParams(window.location.search);
    const legacyAccount = next.get("accountId");
    if (legacyAccount && !next.has("account")) next.set("account",legacyAccount);
    next.delete("accountId"); next.delete("page");
    Object.entries(values).forEach(([key,value]) => { if (value) next.set(key,value); else next.delete(key); });
    window.history.replaceState(null,"","/transactions" + (next.size ? "?" + next : ""));
  };
  const preset = params.get("datePreset") ?? (query.dateFrom || query.dateTo ? "custom" : "all");
  const remove = async (id: string) => {
    if (!window.confirm("Delete this transaction? Balances and historical reports will update.")) return;
    try { await deleteTransaction(id); refresh(); toast.success("Transaction deleted"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete transaction"); }
  };
  const exact = query.id ? result?.rows[0] : undefined;
  return <>
    <PageHeading eyebrow={selectedAccount ? "Account history" : "Money activity"} title={selectedAccount?.name ?? "Transactions"} description={String(result?.total ?? "…")+" matching records · Review every movement."} action={<Button onClick={() => setAddOpen(true)}><Plus className="size-4"/>Add transaction</Button>}/>
    {selectedAccount && <AccountHistorySummary accountId={selectedAccount.id} from={query.dateFrom} to={query.dateTo}/>}
    {result?.cached && <p role="status" className="mb-4 rounded-xl border p-3 text-sm">Offline: showing only your recently cached transactions and pending entries. Connect for complete history, reporting, and export.</p>}
    {query.account && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-sm"><span>Showing only <strong>{selectedAccount?.name ?? "selected account"}</strong></span><Button size="sm" variant="ghost" onClick={() => change({account:undefined})}>Clear account</Button></div>}
    <Card>
      <div className="flex min-w-0 flex-col gap-3 border-b p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-4 size-4 text-muted"/><Input aria-label="Search transactions" id="global-search" placeholder="Search merchant, reference or notes…" className="pl-10" value={query.search ?? ""} onChange={(event) => change({search:event.target.value})}/></div>
        <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal className="size-4"/>Filters</Button>
        <Select aria-label="Sort transactions" className="sm:w-52" value={query.sort} onChange={(event) => change({sort:event.target.value})}>{transactionSorts.map((sort,index) => <option key={sort} value={sort}>{sortLabels[index]}</option>)}</Select>
        <Button variant="secondary" disabled={exporting} onClick={() => { setExporting(true); void exportTransactions(query).then((rows) => { exportTransactionsCsv(rows,data.accounts,data.categories); toast.success("CSV export prepared"); }).catch((error) => toast.error(error.message)).finally(() => setExporting(false)); }}><Download className="size-4"/>{exporting ? "Exporting…" : "Export"}</Button>
      </div>
      {filtersOpen && <div className="grid min-w-0 gap-4 border-b p-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Transaction filters">
        <Field label="Date"><Select value={preset} onChange={(event) => { const value=event.target.value as DatePreset; const range=value === "custom" ? {} : dateRange(value); change({datePreset:value,dateFrom:range.dateFrom,dateTo:range.dateTo}); }}>{datePresets.map((value,index) => <option key={value} value={value}>{presetLabels[index]}</option>)}</Select></Field>
        <Field label="Account"><Select value={query.account ?? ""} onChange={(event) => change({account:event.target.value})}><option value="">All accounts</option>{data.accounts.map((row) => <option key={row.id} value={row.id}>{row.name}{row.archived ? " (archived)" : ""}</option>)}</Select></Field>
        <Field label="Category"><Select value={query.category ?? ""} onChange={(event) => change({category:event.target.value})}><option value="">All categories</option>{data.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field>
        <Field label="Type"><Select value={query.type ?? ""} onChange={(event) => change({type:event.target.value})}><option value="">All types</option>{["expense","income","transfer","refund","adjustment"].map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
        <Field label="Minimum amount"><Input inputMode="decimal" value={query.minAmount ?? ""} onChange={(event) => change({minAmount:event.target.value})}/></Field>
        <Field label="Maximum amount"><Input inputMode="decimal" value={query.maxAmount ?? ""} onChange={(event) => change({maxAmount:event.target.value})}/></Field>
        <Field label="Source"><Select value={query.source ?? ""} onChange={(event) => change({source:event.target.value})}><option value="">All sources</option>{["manual","voice","csv","xlsx","pdf","ocr","recurring"].map((source) => <option key={source}>{source}</option>)}</Select></Field>
        {preset === "custom" && <div className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-3"><Field label="From"><Input type="date" value={custom.from} onChange={(event) => setCustom({...custom,from:event.target.value})}/></Field><Field label="To"><Input type="date" value={custom.through} onChange={(event) => setCustom({...custom,through:event.target.value})}/></Field><Button className="self-end" onClick={() => { try { change({...dateRange("custom",new Date(),custom.from,custom.through)}); } catch(error) { toast.error((error as Error).message); } }}>Apply date range</Button></div>}
        <Button variant="ghost" onClick={() => window.history.replaceState(null,"","/transactions")}>Clear all filters</Button>
      </div>}
      <CardContent className="min-w-0 px-4 py-1 sm:px-6">
        {error ? <div role="alert" className="py-10 text-sm">{error}<Button onClick={refresh} variant="secondary" className="mt-3">Retry</Button></div>
          : !result ? <p role="status" className="py-12 text-center">Loading transactions…</p>
          : result.rows.length ? result.rows.map((row,index) => <div key={row.id}>
            {(query.sort === "newest" || query.sort === "oldest") && row.date !== result.rows[index-1]?.date && <h2 className="eyebrow pt-5 sm:hidden">{format(new Date(row.date+"T12:00:00"),"EEEE, d MMM yyyy")}</h2>}
            <TransactionRow transaction={row} accounts={data.accounts} categories={data.categories} onEdit={setEditing} onDelete={remove}/>
          </div>) : <div className="py-16 text-center"><Filter className="mx-auto mb-4 size-6"/><h2 className="font-semibold">No matching transactions</h2><p className="mt-2 text-sm text-muted">Try a different period or clear a filter.</p></div>}
      </CardContent>
      {result && <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4"><Button variant="secondary" disabled={!query.page} onClick={() => change({page:String((query.page ?? 0)-1)})}>Previous</Button><span className="text-xs">Page {(query.page ?? 0)+1} of {Math.max(Math.ceil(result.total/25),1)}</span><Button variant="secondary" disabled={((query.page ?? 0)+1)*25 >= result.total} onClick={() => change({page:String((query.page ?? 0)+1)})}>Next</Button></div>}
    </Card>
    <TransactionModal open={addOpen} onClose={() => { setAddOpen(false); refresh(); }}/>
    <TransactionModal open={Boolean(editing || exact)} transaction={editing ?? exact} onClose={() => { setEditing(undefined); if(query.id) change({id:undefined}); refresh(); }}/>
  </>;
}

function AccountHistorySummary({accountId,from,to}:{accountId:string;from?:string;to?:string}) {
  const {data}=useFinance(); const account=data.accounts.find((row)=>row.id===accountId)!;
  const {result,error}=usePeriodReport(from ?? "0001-01-01",to ?? "9999-12-31",accountId);
  return <Card className="mb-4 p-4"><p className="text-sm font-semibold">{account.institution} · {account.type.replaceAll("_"," ")} · {account.archived ? "Archived" : "Active"}</p><div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">{[["Current balance",account.archived && !data.demo ? null : accountBalance(account,data.transactions)],["Income",result?.income],["Expenses",result?.expenses],["Transfers",result?.transfers]].map(([label,value])=><div key={String(label)} className="min-w-0"><p className="eyebrow">{label}</p><p className="amount mt-1 break-words font-semibold">{typeof value==="bigint"?formatMoney(value,data.profile.currency):value===null?"Archived":"…"}</p></div>)}</div>{error&&<p role="alert" className="mt-3 text-sm">{error}</p>}</Card>;
}
