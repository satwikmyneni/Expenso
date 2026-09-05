import { describe, expect, it } from "vitest";
import { normalizeIndianAmount, normalizeRow } from "@/features/imports/pipeline";

describe("statement normalization",()=>{
  it("handles Indian digit grouping exactly",()=>expect(normalizeIndianAmount("1,25,000.50")).toBe("125000.50"));
  it("normalizes common Indian bank columns",()=>{const row=normalizeRow({"Txn Date":"03/09/2026",Narration:"UPI/SWIGGY/12345",Debit:"450.00",UTR:"12345"},1,"csv");expect(row.date).toBe("2026-09-03");expect(row.direction).toBe("debit");expect(row.amount).toBe("450.00");expect(row.issue).toBeUndefined()});
  it("routes ambiguous data to review",()=>expect(normalizeRow({Narration:"Unknown"},1,"csv").issue).toContain("amount"));
});
