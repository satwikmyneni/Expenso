import { describe, expect, it } from "vitest";
import type { Category, FinanceTransaction, MerchantRule } from "@/features/finance/types";
import { categorizeDeterministically } from "@/features/imports/categorization";
import { merchantFromDescription, normalizeMerchant } from "@/features/imports/merchant-normalization";

const category = (id: string, name: string): Category => ({
  id,
  name,
  icon: "Circle",
  color: "#000000",
  kind: "both",
  archived: false,
});

const categories = [
  category("food", "Food & Dining"),
  category("utilities", "Bills & Utilities"),
  category("shopping", "Shopping"),
  category("rent", "Rent"),
  category("uncategorized", "Uncategorized"),
];

const historical = (id: string, merchant: string, categoryId: string): FinanceTransaction => ({
  id,
  accountId: "account",
  categoryId,
  type: "expense",
  amountMinor: 100n,
  currency: "INR",
  date: "2026-09-01",
  merchant,
  tags: [],
  source: "manual",
  reviewStatus: "confirmed",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
});

describe("merchant normalization", () => {
  it.each([
    ["MC DONALDS", "McDonald's"],
    ["MCDONALD'S INDIA", "McDonald's"],
    ["TATASKY", "Tata Sky"],
    ["TATA SKY LTD", "Tata Sky"],
  ])("normalizes %s", (input, expected) => expect(normalizeMerchant(input)).toBe(expected));

  it("extracts a merchant from UPI and NEFT descriptions", () => {
    expect(merchantFromDescription("UPI/DR/624677951907/MC DONALDS/HDFC/mcdonalds@example/UPI")).toBe("McDonald's");
    expect(merchantFromDescription("NEFT*UBIN0564079*002952492581*PARU CHURI PROJECTS*B")).toBe("Paru Churi Projects");
  });
});

describe("deterministic category priority", () => {
  it("uses built-in exact merchant and keyword rules", () => {
    expect(categorizeDeterministically({ merchant: "MC DONALDS", type: "expense", categories })).toMatchObject({
      categoryId: "food",
      confidence: "high",
      needsReview: false,
    });
    expect(categorizeDeterministically({ merchant: "Tata Sky", type: "expense", categories })).toMatchObject({
      categoryId: "utilities",
      confidence: "high",
    });
    expect(categorizeDeterministically({ merchant: "Corner Cafe", type: "expense", categories })).toMatchObject({
      categoryId: "food",
      confidence: "medium",
    });
  });

  it("never guesses a category for an unknown person", () => {
    expect(categorizeDeterministically({ merchant: "ABHISHEK", type: "expense", categories })).toMatchObject({
      categoryId: "uncategorized",
      confidence: "low",
      needsReview: true,
    });
  });

  it("gives a user's enabled exact rule highest priority", () => {
    const personalRules: MerchantRule[] = [{
      id: "rule",
      pattern: "McDonald's",
      merchantNormalized: "mcdonalds",
      matchType: "exact",
      categoryId: "rent",
      accountId: "account",
      priority: 100,
      enabled: true,
      applicationCount: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }];
    expect(categorizeDeterministically({ merchant: "MC DONALDS", type: "expense", accountId: "account", categories, personalRules })).toMatchObject({
      categoryId: "rent",
      confidence: "high",
      reason: "Your merchant rule",
    });
    expect(categorizeDeterministically({ merchant: "MC DONALDS", type: "expense", accountId: "another-account", categories, personalRules })).toMatchObject({
      categoryId: "food",
      reason: "Exact merchant match",
    });
  });

  it("uses only consistent repeated history", () => {
    const consistent = [historical("one", "ABHISHEK", "rent"), historical("two", "Abhishek", "rent")];
    expect(categorizeDeterministically({ merchant: "ABHISHEK", type: "expense", categories, history: consistent })).toMatchObject({
      categoryId: "rent",
      reason: "Consistent confirmed history",
      confidence: "medium",
    });

    const inconsistent = [...consistent, historical("three", "ABHISHEK", "food")];
    expect(categorizeDeterministically({ merchant: "ABHISHEK", type: "expense", categories, history: inconsistent })).toMatchObject({
      categoryId: "uncategorized",
      needsReview: true,
    });
  });
});
