"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths, addYears, format, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/features/finance/finance-provider";
import { usePeriodReport } from "@/features/finance/use-finance-query";
import { formatMoney, percentage } from "@/features/finance/money";
import { CategoryBars } from "@/features/insights/category-bars";
import { CashflowChart } from "@/features/dashboard/cashflow-chart";
import { reportPeriods, trendMonths, type PeriodReport } from "@/features/insights/reports";
import { dateOnly, transactionHref } from "@/features/transactions/query";

export default function InsightsPage(){return <Suspense fallback={<p role="status">Loading Insights…</p>}><InsightsContent/></Suspense>;}
function InsightsContent() {
  const {data}=useFinance(); const params=useSearchParams(); const router=useRouter(); const now=new Date();
  const view=params.get("view")==="yearly"?"yearly":"monthly";
  const periods=reportPeriods(params.get("month") ?? format(now,"yyyy-MM"),view,now);
  const [months,setMonths]=useState(6);
  const selected=usePeriodReport(periods.start,periods.end);
  const previous=usePeriodReport(periods.previousStart,periods.previousEnd);
  const yearAgo=usePeriodReport(periods.yearAgoStart,periods.yearAgoEnd);
  const trendEnd=view==="yearly"?new Date(periods.reference.getFullYear(),11,1):periods.reference;
  const trendRange={start:dateOnly(subMonths(startOfMonth(trendEnd),(view==="yearly"?12:months)-1)),end:dateOnly(addMonths(startOfMonth(trendEnd),1))};
  const trend=usePeriodReport(trendRange.start,trendRange.end);
  const navigate=(date:Date,nextView=view)=>router.replace("/insights?month="+format(date,"yyyy-MM")+"&view="+nextView,{scroll:false});
  const range={dateFrom:periods.start,dateTo:periods.end};
  const money=(value:bigint)=>formatMoney(value,data.profile.currency);
  const report=selected.result;
  const error=selected.error||previous.error||yearAgo.error||trend.error;
  const next=view==="yearly"?addYears(periods.reference,1):addMonths(periods.reference,1);
  return <>
    <PageHeading eyebrow="Your financial history" title="Insights" description="Explore any recorded month or year."/>
    <div className="mb-5 flex min-w-0 flex-wrap items-center gap-2">
      <Select className="w-full sm:w-36" aria-label="Report view" value={view} onChange={(event)=>navigate(periods.reference,event.target.value as typeof view)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select>
      <div className="flex w-full min-w-0 max-w-full items-center gap-2 sm:w-auto sm:flex-none"><Button variant="secondary" size="icon" aria-label="Previous period" onClick={()=>navigate(view==="yearly"?addYears(periods.reference,-1):addMonths(periods.reference,-1))}><ChevronLeft className="size-4"/></Button>
      {view==="monthly"?<Input type="month" aria-label="Report month" className="min-w-0 flex-1 sm:w-52" min="1900-01" max={format(now,"yyyy-MM")} value={format(periods.reference,"yyyy-MM")} onChange={(event)=>{if(/^\d{4}-\d{2}$/.test(event.target.value))navigate(new Date(event.target.value+"-01T12:00:00"));}}/>:<Input type="number" aria-label="Report year" className="min-w-0 flex-1 sm:w-36" min={1900} max={now.getFullYear()} value={periods.reference.getFullYear()} onChange={(event)=>{const year=Number(event.target.value);if(year>=1900&&year<=now.getFullYear())navigate(new Date(year,0,1));}}/>}
      <Button variant="secondary" size="icon" aria-label="Next period" disabled={next>now} onClick={()=>navigate(next)}><ChevronRight className="size-4"/></Button></div><Button variant="ghost" onClick={()=>navigate(now)}>Current period</Button>
    </div>
    <h2 className="mb-4 text-xl font-semibold" data-testid="selected-period">{format(periods.reference,view==="yearly"?"yyyy":"MMMM yyyy")}</h2>
    {error&&<div role="alert" className="mb-4 rounded-xl border p-4 text-sm">{error}<Button className="ml-2" variant="secondary" onClick={()=>{selected.refresh();previous.refresh();yearAgo.refresh();trend.refresh();}}>Retry reports</Button></div>}
    {!report&&!error&&<p role="status">Loading this period…</p>}
    {report&&<>
      {!report.count&&<p className="mb-5 rounded-2xl border p-5 text-sm">No financial activity for this period.</p>}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Income" value={money(report.income)} href={transactionHref({...range,type:"income"})}/>
        <Metric label="Expenses" value={money(report.expenses)} href={transactionHref(range)}/>
        <Metric label="Cash flow" value={money(report.income-report.expenses)} href={transactionHref(range)}/>
        <Metric label="Savings rate" value={report.income?percentage(report.income-report.expenses,report.income).toFixed(1)+"%":"—"} href={transactionHref(range)}/>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Transaction count" value={String(report.count)} href={transactionHref(range)}/><Metric label="Largest expense" value={money(report.largest?.amount??0n)} note={report.largest?.merchant} href={report.largest?transactionHref({id:report.largest.id}):transactionHref({...range,type:"expense"})}/><Metric label="Recurring spending" value={money(report.recurring)} href={transactionHref({...range,source:"recurring"})}/><Metric label="Subscription spending" value={money(report.subscriptions)} href="/recurring"/></div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>Category spending</CardTitle></CardHeader><CardContent>{report.categories.length?<CategoryBars transactions={[]} categories={data.categories} currency={data.profile.currency} groups={report.categories.map((row)=>({categoryId:row.id,amountMinor:row.amount}))}/>:<p className="py-12 text-center text-muted">No category data</p>}</CardContent></Card>
      <Card><CardHeader className="flex-wrap"><CardTitle>{view==="yearly"?"Yearly report":"Income vs spending"}</CardTitle>{view==="monthly"&&<Select className="w-36" aria-label="Trend length" value={months} onChange={(event)=>setMonths(Number(event.target.value))}><option value={6}>6 months</option><option value={12}>12 months</option></Select>}</CardHeader><CardContent>{trend.result?<CashflowChart transactions={[]} currency={data.profile.currency} reportTrend={trendMonths(trend.result,trendEnd,view==="yearly"?12:months)}/>:<p role="status">Loading trend…</p>}</CardContent></Card></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2"><Comparison title={view==="yearly"?"Previous year comparison":"Previous month comparison"} current={report} previous={previous.result} currency={data.profile.currency}/>{view==="monthly"&&<Comparison title="Same month last year" current={report} previous={yearAgo.result} currency={data.profile.currency}/>}</div>
      <Card className="mt-5"><CardHeader><CardTitle>Category detail</CardTitle></CardHeader><CardContent>{report.categories.map((row,index)=><Link key={row.id} href={transactionHref({...range,category:row.id})} className="flex min-h-14 min-w-0 items-center gap-3 border-b py-3 hover:text-info"><span className="text-xs text-muted">{index+1}</span><span className="min-w-0 flex-1 break-words text-sm font-semibold">{data.categories.find((category)=>category.id===row.id)?.name??"Uncategorized"}</span><strong className="amount text-sm">{money(row.amount)}</strong></Link>)}</CardContent></Card>
      <Card className="mt-5"><CardHeader><CardTitle>Budget spending in this period</CardTitle></CardHeader><CardContent>{report.budgets.map((row)=><Link key={row.id} href={"/budgets#budget-"+row.id} className="flex min-h-12 items-center justify-between gap-3 border-b text-sm"><span>{data.budgets.find((budget)=>budget.id===row.id)?.name}</span><strong>{money(row.spent)}</strong></Link>)}{!report.budgets.length&&<p className="text-sm text-muted">No active budgets.</p>}</CardContent></Card>
    </>}
  </>;
}
function Metric({label,value,href,note}:{label:string;value:string;href:string;note?:string}){return <Link href={href} className="card block min-w-0 p-5 hover:border-ring"><p className="eyebrow">{label}</p><p className="amount mt-3 break-words text-2xl font-bold">{value}</p>{note&&<p className="mt-2 truncate text-xs text-muted">{note}</p>}</Link>;}
function Comparison({title,current,previous,currency}:{title:string;current:PeriodReport;previous?:PeriodReport;currency:string}){
  const rate=(report:PeriodReport)=>report.income?percentage(report.income-report.expenses,report.income).toFixed(1)+"%":"—";
  const values=(report:PeriodReport)=>[formatMoney(report.income,currency),formatMoney(report.expenses,currency),formatMoney(report.income-report.expenses,currency),rate(report)];
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{!previous?<p role="status">Loading comparison…</p>:!previous.count?<p className="text-sm text-muted">No comparison data available.</p>:<div className="space-y-3">{["Income","Expenses","Cash flow","Savings rate"].map((label,index)=><div key={label} className="flex flex-wrap justify-between gap-2 text-xs"><span>{label}</span><span>{values(previous)[index]} → <strong>{values(current)[index]}</strong></span></div>)}</div>}</CardContent></Card>;
}
