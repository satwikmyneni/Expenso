import { describe, expect, it } from "vitest";
import { categorizeMerchant, detectDuplicates } from "@/features/finance/detection";
import type { FinanceTransaction } from "@/features/finance/types";

const existing:FinanceTransaction={id:"1",accountId:"a",categoryId:"food",type:"expense",amountMinor:45000n,currency:"INR",date:"2026-09-03",merchant:"Biryani Blues",tags:[],source:"manual",createdAt:"",updatedAt:""};
describe("deterministic detection",()=>{
  it("flags a four-factor match as a likely duplicate",()=>{const matches=detectDuplicates({accountId:"a",type:"expense",amount:"450",date:"2026-09-03",merchant:"Biryani Blues"},[existing]);expect(matches[0].confidence).toBe("likely");expect(matches[0].reasons).toHaveLength(4)});
  it("uses stable merchant category rules",()=>{expect(categorizeMerchant("SWIGGY Bangalore")).toBe("food");expect(categorizeMerchant("Uber India")).toBe("transport")});
});
