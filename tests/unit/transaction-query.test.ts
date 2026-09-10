import { describe, expect, it, vi } from "vitest";
import { dateRange, querySampleTransactions } from "@/features/transactions/query";
import { sampleReport, reportPeriods } from "@/features/insights/reports";
import { FinanceRepository } from "@/features/finance/repository";
import type { FinanceTransaction } from "@/features/finance/types";

const row=(id:string,date:string,amountMinor=50000n):FinanceTransaction=>({id,date,occurredAt:date+"T10:00:00.000Z",accountId:"account-a",categoryId:"food",type:"expense",amountMinor,currency:"INR",merchant:"Test merchant",tags:[],source:"manual",createdAt:"2026-09-07T12:00:00.000Z",updatedAt:"2026-09-07T12:00:00.000Z"});
describe("date query boundaries and stable ordering",()=>{
  const now=new Date(2026,8,7,15);
  it.each([
    ["today","2026-09-07","2026-09-08"],["yesterday","2026-09-06","2026-09-07"],
    ["this_week","2026-09-07","2026-09-14"],["this_month","2026-09-01","2026-10-01"],
    ["last_month","2026-08-01","2026-09-01"],["last_7_days","2026-09-01","2026-09-08"],
    ["last_30_days","2026-08-09","2026-09-08"],["this_year","2026-01-01","2027-01-01"],
    ["last_year","2025-01-01","2026-01-01"],
  ] as const)("%s uses an exclusive end",(preset,dateFrom,dateTo)=>expect(dateRange(preset,now)).toEqual({dateFrom,dateTo}));
  it("validates custom ranges and includes the final selected day",()=>{
    expect(dateRange("custom",now,"2024-02-28","2024-02-29")).toEqual({dateFrom:"2024-02-28",dateTo:"2024-03-01"});
    expect(()=>dateRange("custom",now,"2026-02-30","2026-03-01")).toThrow();
    expect(()=>dateRange("custom",now,"2026-09-07","2026-09-01")).toThrow();
  });
  it("orders date/time, then upload batch, then original statement row and ID",()=>{
    const rows=[{...row("b","2026-09-05"),metadata:{import_row:2}}, {...row("a","2026-09-05"),metadata:{import_row:1}}, {...row("c","2026-09-05"),occurredAt:"2026-09-05T09:00:00.000Z"}, row("d","2026-09-04")];
    expect(querySampleTransactions(rows,{sort:"newest"}).rows.map((x)=>x.id)).toEqual(["a","b","c","d"]);
    expect(querySampleTransactions(rows,{page:1,pageSize:2}).rows.map((x)=>x.id)).toEqual(["c","d"]);
  });
  it("applies all filters before pagination",()=>{
    const rows=[row("1","2026-08-01"),row("2","2026-08-02",90000n),{...row("3","2026-08-03"),categoryId:"other"},row("4","2026-09-01")];
    expect(querySampleTransactions(rows,{account:"account-a",category:"food",type:"expense",search:"merchant",dateFrom:"2026-08-01",dateTo:"2026-09-01",minAmount:"100",maxAmount:"1000",sort:"amount_desc",pageSize:1})).toMatchObject({total:2,rows:[{id:"2"}]});
  });
  it("sends filters, sort, and page in the database query",async()=>{
    const rpc=vi.fn().mockResolvedValue({data:{rows:[],total:0},error:null});
    const repository=new FinanceRepository({rpc} as never);
    const query={account:"account-a",category:"food",dateFrom:"2026-08-01",dateTo:"2026-09-01",sort:"uploaded_desc" as const,page:2,pageSize:25};
    await repository.queryTransactions(query);
    expect(rpc).toHaveBeenCalledWith("search_finance_transactions",{filters:query});
  });
  it("keeps a null-category drilldown distinct from all categories",()=>{
    const rows=[row("classified","2026-08-01"),{...row("unclassified","2026-08-02"),categoryId:undefined}];
    expect(querySampleTransactions(rows,{category:"uncategorized"}).rows.map((item)=>item.id)).toEqual(["unclassified"]);
  });
});
describe("historical reporting",()=>{
  const rows=[7,8,9].flatMap((month,index)=>[{...row(`income-${month}`,`2026-0${month}-05`,BigInt(index+1)*1000000n),type:"income" as const},row(`expense-${month}`,`2026-0${month}-10`,BigInt(index+1)*400000n)]);
  it.each([["07","08",1000000n,400000n],["08","09",2000000n,800000n],["09","10",3000000n,1200000n]])("reports %s independently",(month,end,income,expenses)=>expect(sampleReport(rows,[],`2026-${month}-01`,`2026-${end}-01`)).toMatchObject({income,expenses,count:2}));
  it("returns empty historical periods and compares January with December",()=>{
    expect(sampleReport(rows,[],"2024-01-01","2025-01-01")).toMatchObject({income:0n,expenses:0n,count:0,categories:[]});
    expect(reportPeriods("2025-01","monthly",new Date(2026,8,7))).toMatchObject({previousStart:"2024-12-01",previousEnd:"2025-01-01",yearAgoStart:"2024-01-01"});
  });
  it("a date edit moves the transaction between reports without duplication",()=>{
    const changed=rows.map((item)=>item.id==="expense-8"?{...item,date:"2026-09-10"}:item);
    expect(sampleReport(changed,[],"2026-08-01","2026-09-01").expenses).toBe(0n);
    expect(sampleReport(changed,[],"2026-09-01","2026-10-01").expenses).toBe(2000000n);
  });
  it("transfers do not count as spending; loan interest and refunds do",()=>{
    const rows=[row("purchase","2026-08-10"),{...row("transfer","2026-08-10",100000n),type:"transfer" as const}, {...row("loan","2026-08-10"),type:"transfer" as const,loanInterestMinor:1000n}, {...row("refund","2026-08-11",5000n),type:"refund" as const}];
    expect(sampleReport(rows,[],"2026-08-01","2026-09-01").expenses).toBe(46000n);
  });
});

it("daily totals span pages and exclude transfer principal",()=>{
  const rows=[row("one","2026-09-01",18800n),row("two","2026-09-01",7600n),{...row("transfer","2026-09-01",100000n),type:"transfer" as const,loanInterestMinor:1000n}];
  const page=querySampleTransactions(rows,{pageSize:1});
  expect(page.rows).toHaveLength(1);
  expect(page.dailyTotals?.["2026-09-01"]).toBe(-27400n);
  expect(querySampleTransactions(rows,{type:"expense",pageSize:1}).dailyTotals?.["2026-09-01"]).toBe(-26400n);
});
