import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({finance:vi.fn()}));
vi.mock("@/features/finance/finance-provider",()=>({useFinance:mocks.finance}));
import { usePeriodReport, useTransactions } from "@/features/finance/use-finance-query";

afterEach(cleanup);
describe("owner-scoped asynchronous finance queries",()=>{
  it("never shows the preceding owner's cached transaction page",async()=>{
    const queryTransactions=vi.fn().mockResolvedValue({rows:[{id:"a-private"}],total:1});
    mocks.finance.mockReturnValue({data:{demo:false,profile:{id:"a"}},queryTransactions});
    const hook=renderHook(()=>useTransactions({page:0}));
    await waitFor(()=>expect(hook.result.current.result?.total).toBe(1));
    queryTransactions.mockImplementation(()=>new Promise(()=>{}));
    mocks.finance.mockReturnValue({data:{demo:false,profile:{id:"b"}},queryTransactions});
    hook.rerender();
    expect(hook.result.current.result).toBeUndefined();
  });
  it("ignores a slow old-period result and reloads after mutation invalidation",async()=>{
    let oldResolve:(value:unknown)=>void=()=>{};
    const periodReport=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{oldResolve=resolve;})).mockResolvedValue({income:200n});
    const data={demo:false,profile:{id:"a"}};
    mocks.finance.mockReturnValue({data,periodReport});
    const hook=renderHook(({start})=>usePeriodReport(start,"2026-10-01"),{initialProps:{start:"2026-08-01"}});
    hook.rerender({start:"2026-09-01"});
    await waitFor(()=>expect(hook.result.current.result?.income).toBe(200n));
    await act(async()=>oldResolve({income:100n}));
    expect(hook.result.current.result?.income).toBe(200n);
    mocks.finance.mockReturnValue({data,periodReport:vi.fn().mockResolvedValue({income:300n})});
    hook.rerender({start:"2026-09-01"});
    await waitFor(()=>expect(hook.result.current.result?.income).toBe(300n));
  });
  it("shows a live query failure instead of sample financial data",async()=>{
    mocks.finance.mockReturnValue({data:{demo:false,profile:{id:"a"}},periodReport:vi.fn().mockRejectedValue(new Error("Connection unavailable"))});
    const hook=renderHook(()=>usePeriodReport("2026-08-01","2026-09-01"));
    await waitFor(()=>expect(hook.result.current.error).toBe("Connection unavailable"));
    expect(hook.result.current.result).toBeUndefined();
  });
});
