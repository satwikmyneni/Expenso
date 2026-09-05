import { describe, expect, it } from "vitest";
import { minorToDecimal, parseMoney, percentage, sumMoney } from "@/features/finance/money";

describe("exact money operations", () => {
  it("parses Indian-formatted and decimal values into integer minor units", () => { expect(parseMoney("₹1,25,000.05")).toBe(12_500_005n); expect(parseMoney("0.10")).toBe(10n); });
  it("never loses paise while summing", () => { expect(sumMoney([10n, 20n, 1n])).toBe(31n); expect(minorToDecimal(31n)).toBe("0.31"); });
  it("calculates percentages deterministically", () => expect(percentage(1n, 3n)).toBe(33.33));
  it("rejects unsafe precision", () => expect(() => parseMoney("1.009")).toThrow());
});
