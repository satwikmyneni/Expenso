"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Filter, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { PageHeading } from "@/components/page-heading";
import { useFinance } from "@/features/finance/finance-provider";
import type { FinanceTransaction, TransactionType } from "@/features/finance/types";
import { TransactionRow } from "@/features/transactions/transaction-row";
import { TransactionModal } from "@/features/transactions/transaction-modal";
import { formatMoney } from "@/features/finance/money";
import { exportTransactionsCsv } from "@/features/exports/csv";

export default function TransactionsPage() {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-panel bg-muted-surface" aria-label="Loading transactions" />}><TransactionsContent /></Suspense>;
}

function TransactionsContent() {
  const { data, deleteTransaction, loadAccountTransactions } = useFinance();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [category, setCategory] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction>();
  const [accountHistory, setAccountHistory] = useState<{ accountId: string; transactions: FinanceTransaction[] } | null>(null);
  const accountId = searchParams.get("accountId");
  const selectedAccount = data.accounts.find((item) => item.id === accountId);

  useEffect(() => {
    let active = true;
    if (!accountId) return () => { active = false; };
    void loadAccountTransactions(accountId).then((transactions) => {
      if (active) setAccountHistory({ accountId, transactions });
    }).catch(() => {
      if (!active) return;
      setAccountHistory({ accountId, transactions: [] });
      toast.error("We couldn't load that account's transaction history.");
    });
    return () => { active = false; };
  }, [accountId, loadAccountTransactions]);

  const accountTransactions = accountId && accountHistory?.accountId === accountId ? accountHistory.transactions : null;
  const filtered = useMemo(() => (accountId ? accountTransactions ?? [] : data.transactions).filter((transaction) => {
    const haystack = [transaction.merchant, transaction.description, transaction.notes, transaction.reference, transaction.tags.join(" "), formatMoney(transaction.amountMinor, transaction.currency), data.accounts.find((item) => item.id === transaction.accountId)?.name, data.categories.find((item) => item.id === transaction.categoryId)?.name].join(" ").toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (type === "all" || transaction.type === type) && (category === "all" || transaction.categoryId === category);
  }), [accountId, accountTransactions, category, data.accounts, data.categories, data.transactions, search, type]);
  const activeFilters = [type, accountId ?? "all", category].filter((value) => value !== "all").length;

  const selectAccount = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "all") next.delete("accountId");
    else next.set("accountId", id);
    const query = next.toString();
    router.replace(query ? `/transactions?${query}` : "/transactions", { scroll: false });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this transaction? Historical reports and balances will update automatically.")) return;
    try {
      await deleteTransaction(id);
      setAccountHistory((current) => current ? { ...current, transactions: current.transactions.filter((transaction) => transaction.id !== id) } : null);
      toast.success("Transaction deleted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete transaction"); }
  };

  return <>
    <PageHeading eyebrow={selectedAccount ? "Account history" : "Money activity"} title={selectedAccount ? selectedAccount.name : "Transactions"} description={`${filtered.length} records${selectedAccount ? ` for ${selectedAccount.institution || selectedAccount.name}` : ""} · Search, filter and review every movement.`} action={<Button className="rounded-full px-5" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add transaction</Button>} />
    {accountId && <div className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-info/20 bg-info/10 px-4 text-sm" role="status">
      <span>{selectedAccount ? <>Showing only <strong>{selectedAccount.name}</strong></> : "This account is unavailable or you do not have access to it."}</span>
      <Button type="button" size="sm" variant="ghost" onClick={() => selectAccount("all")}>Clear account</Button>
    </div>}
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-elevated/30 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"/><Input id="global-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant, amount, category, account…" className="pl-10"/>{search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Clear search"><X className="size-4" /></button>}</div>
        <Button variant="secondary" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal className="size-4"/> Filters {activeFilters > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{activeFilters}</span>}</Button>
        <Button variant="secondary" disabled={Boolean(accountId && accountTransactions === null)} onClick={() => { exportTransactionsCsv(filtered, data.accounts, data.categories); toast.success("CSV export prepared"); }}><Download className="size-4"/> Export</Button>
      </div>
      {filtersOpen && <div className="grid gap-3 border-b bg-canvas/50 p-4 sm:grid-cols-3 sm:p-5">
        <label className="text-xs font-bold">Type<Select className="mt-1.5" value={type} onChange={(e) => setType(e.target.value as TransactionType | "all")}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Transfers</option><option value="refund">Refunds</option><option value="adjustment">Adjustments</option></Select></label>
        <label className="text-xs font-bold">Account<Select className="mt-1.5" value={accountId ?? "all"} onChange={(e) => selectAccount(e.target.value)}><option value="all">All accounts</option>{data.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label className="text-xs font-bold">Category<Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
      </div>}
      <div className="hidden grid-cols-[minmax(0,1fr)_98px_92px_92px_72px] gap-3 border-b border-border bg-background/35 px-6 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground sm:grid"><span>Transaction</span><span>Date</span><span>Type</span><span className="text-right">Amount</span><span /></div>
      <CardContent className="px-4 py-1 sm:px-6">
        {accountId && accountTransactions === null ? <div className="py-20 text-center text-sm text-muted" aria-live="polite">Loading this account’s history…</div> : filtered.length ? filtered.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accounts={data.accounts} categories={data.categories} onDelete={remove} onEdit={setEditing} />) : <div className="py-20 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-brand"><Filter className="size-5" /></span><h2 className="font-bold">No matching transactions</h2><p className="mt-1 text-sm text-muted">Try clearing a filter or changing your search.</p></div>}
      </CardContent>
    </Card>
    <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    <TransactionModal open={Boolean(editing)} onClose={() => setEditing(undefined)} transaction={editing} />
  </>;
}
