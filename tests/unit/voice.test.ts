import { describe, expect, it, vi } from "vitest";
import { parseVoiceTransaction } from "@/features/transactions/voice";

describe("voice parsing",()=>{
  it("parses a spoken expense for confirmation",()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-03T12:00:00Z"));expect(parseVoiceTransaction("Spent 450 rupees on dinner at Biryani Blues today")).toMatchObject({amount:"450",type:"expense",merchant:"Biryani Blues",date:"2026-09-03"});vi.useRealTimers()});
  it("recognizes income",()=>expect(parseVoiceTransaction("Got salary of 85000 today").type).toBe("income"));
});
