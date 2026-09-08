"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useTransactions } from "@/features/finance/use-finance-query";
import { minorToDecimal } from "@/features/finance/money";
import type { FinanceTransaction } from "@/features/finance/types";

// Refund relationships may point outside the recent workspace page. Search the
// owner's purchase history in Postgres rather than losing historical options.
export function PurchaseSelector({ value, accountId, onChange, error }: {
  value?: string; accountId?: string; onChange: (purchase: FinanceTransaction | undefined) => void; error?: string;
}) {
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(0);
  const purchases = useTransactions({ type:"expense",account:accountId,search,page,pageSize:25 });
  const selected = useTransactions({ id:value,type:"expense" },Boolean(value));
  const rows = purchases.result?.rows ?? [];
  const original = selected.result?.rows[0];
  const options = original && !rows.some((row)=>row.id===original.id) ? [original,...rows] : rows;
  return <div className="min-w-0 space-y-2 sm:col-span-2">
    <Field label="Search purchases"><Input value={search} onChange={(event)=>{setSearch(event.target.value);setPage(0);}} placeholder="Find an older purchase"/></Field>
    <Field label="Original purchase" error={error}><Select value={value ?? ""} onChange={(event)=>onChange(options.find((row)=>row.id===event.target.value))}><option value="">Choose purchase</option>{options.map((row)=><option value={row.id} key={row.id}>{row.merchant} · {row.date} · {minorToDecimal(row.amountMinor)}</option>)}</Select></Field>
    {purchases.error && <p role="alert" className="text-xs text-destructive">{purchases.error}<Button type="button" variant="ghost" onClick={purchases.refresh}>Retry</Button></p>}
    {!purchases.result&&!purchases.error&&<p role="status" className="text-xs">Loading purchases…</p>}
    <div className="flex flex-wrap justify-between gap-2"><Button type="button" size="sm" variant="ghost" disabled={!page} onClick={()=>setPage(page-1)}>Previous purchases</Button><Button type="button" size="sm" variant="ghost" disabled={(page+1)*25 >= (purchases.result?.total ?? 0)} onClick={()=>setPage(page+1)}>More purchases</Button></div>
  </div>;
}
