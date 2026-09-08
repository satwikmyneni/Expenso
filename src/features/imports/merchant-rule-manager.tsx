"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useFinance } from "@/features/finance/finance-provider";
import type { MerchantRule, TransactionType } from "@/features/finance/types";
import { normalizeMerchantKey } from "./merchant-normalization";

export function MerchantRuleManager() {
  const {data,saveMerchantRule,updateMerchantRule,deleteMerchantRule}=useFinance();
  const [open,setOpen]=useState(false); const [editing,setEditing]=useState<MerchantRule>(); const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({pattern:"",categoryId:"",accountId:"",transactionType:""});
  const edit=(rule?:MerchantRule)=>{setEditing(rule);setForm({pattern:rule?.pattern ?? "",categoryId:rule?.categoryId ?? "",accountId:rule?.accountId ?? "",transactionType:rule?.transactionType ?? ""});setOpen(true);};
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);try {
    const draft={pattern:form.pattern.trim(),merchantNormalized:normalizeMerchantKey(form.pattern),categoryId:form.categoryId,accountId:form.accountId||undefined,transactionType:(form.transactionType||undefined) as TransactionType|undefined};
    if(!draft.pattern || !draft.categoryId) throw new Error("Choose a merchant and category.");
    if(editing) await updateMerchantRule(editing.id,draft.categoryId,draft); else await saveMerchantRule(draft);
    setOpen(false);toast.success("Merchant rule saved");
  }catch(error){toast.error((error as Error).message);}finally{setBusy(false);}};
  return <Card className="mt-5"><CardHeader className="flex-wrap"><div><CardTitle>Merchant rules</CardTitle><p className="mt-2 text-sm text-muted">Remember your category choices for future transactions.</p></div><Button variant="secondary" onClick={()=>edit()}>Add merchant rule</Button></CardHeader><CardContent>
    {data.merchantRules.map((rule)=><div key={rule.id} className="flex min-w-0 flex-wrap items-center gap-3 border-b py-4"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{rule.pattern} → {data.categories.find((row)=>row.id===rule.categoryId)?.name ?? "Uncategorized"}</p><p className="mt-1 text-xs text-muted">{rule.accountId ? data.accounts.find((row)=>row.id===rule.accountId)?.name : "All accounts"} · {rule.transactionType ?? "All types"} · {rule.enabled?"Active":"Disabled"}</p></div><Button size="sm" variant="secondary" aria-label={`Edit rule for ${rule.pattern}`} onClick={()=>edit(rule)}>Edit</Button><Button size="sm" variant="ghost" aria-label={`Delete merchant rule for ${rule.pattern}`} onClick={()=>{if(window.confirm("Delete this rule? Existing transactions will not change."))void deleteMerchantRule(rule.id).then(()=>toast.success("Rule deleted")).catch((error)=>toast.error(error.message));}}>Delete</Button></div>)}
    {!data.merchantRules.length && <p className="py-6 text-sm text-muted">No personal merchant rules yet.</p>}
    </CardContent><Modal open={open} onClose={()=>setOpen(false)} title={editing?"Edit merchant rule":"Add merchant rule"}><form onSubmit={submit} className="grid gap-4 p-5"><Field label="Merchant"><Input required value={form.pattern} onChange={(event)=>setForm({...form,pattern:event.target.value})}/></Field><Field label="Category"><Select required value={form.categoryId} onChange={(event)=>setForm({...form,categoryId:event.target.value})}><option value="">Choose category</option>{data.categories.filter((row)=>!row.archived).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field><Field label="Account scope"><Select value={form.accountId} onChange={(event)=>setForm({...form,accountId:event.target.value})}><option value="">All accounts</option>{data.accounts.filter((row)=>!row.archived).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field><Field label="Transaction type scope"><Select value={form.transactionType} onChange={(event)=>setForm({...form,transactionType:event.target.value})}><option value="">All types</option>{["expense","income","transfer","refund","adjustment"].map((type)=><option key={type}>{type}</option>)}</Select></Field><Button type="submit" disabled={busy}>{busy?"Saving…":"Save merchant rule"}</Button></form></Modal></Card>;
}
