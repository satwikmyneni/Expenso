import { describe, expect, it } from "vitest";
import type { FinanceTransaction } from "@/features/finance/types";
import { applyDuplicateDetection, duplicateAgainstExisting } from "@/features/imports/duplicate-detection";
import { importRowToDraft, normalizeReviewedRow } from "@/features/imports/review";
import type { NormalizedTransaction } from "@/features/imports/types";

const row = (overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction => ({
  id: "row-1",
  rowNumber: 1,
  date: "2026-08-15",
  description: "UPI/DR/123456789012/SAMPLE CAFE/HDFC/cafe@example/UPI",
  merchant: "Sample Cafe",
  amount: "500.00",
  direction: "debit",
  type: "expense",
  reference: "123456789012",
  selected: true,
  status: "ready",
  issueCodes: [],
  confidence: "high",
  categoryId: "food",
  accountId: "bank",
  reviewed: true,
  source: "csv",
  ...overrides,
});

const existing: FinanceTransaction = {
  id: "existing",
  accountId: "bank",
  categoryId: "food",
  type: "expense",
  amountMinor: 50000n,
  currency: "INR",
  date: "2026-08-15",
  merchant: "Sample Cafe",
  description: "UPI/DR/123456789012/SAMPLE CAFE/HDFC/cafe@example/UPI",
  reference: "123456789012",
  tags: [],
  source: "manual",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};

describe("duplicate detection", () => {
  it("flags reference and multi-field matches against existing history", () => {
    expect(duplicateAgainstExisting(row(), [existing])).toMatchObject({
      transactionId: "existing",
      confidence: "likely",
      source: "existing",
    });
  });

  it("flags repeated rows inside the same statement without silently selecting them", () => {
    const result = applyDuplicateDetection([row(), row({ id: "row-2", rowNumber: 2 })], []);
    expect(result[0].duplicate).toBeUndefined();
    expect(result[1]).toMatchObject({ status: "duplicate", selected: false });
    expect(result[1].duplicate?.source).toBe("statement");
  });
});

describe("review conversion", () => {
  it("requires explicit review for low-confidence rows", () => {
    expect(normalizeReviewedRow(row({ confidence: "low", reviewed: false }))).toMatchObject({
      status: "needs_review",
      selected: false,
    });
  });

  it("preserves historical dates and original statement details", () => {
    expect(importRowToDraft(row(), "import-id")).toMatchObject({
      accountId: "bank",
      date: "2026-08-15",
      merchant: "Sample Cafe",
      description: expect.stringContaining("UPI/DR"),
      reference: "123456789012",
      importId: "import-id",
      reviewStatus: "confirmed",
      source: "csv",
    });
  });

  it("maps debit and credit transfers in the correct direction", () => {
    expect(importRowToDraft(row({ type: "transfer", categoryId: undefined, transferAccountId: "cash" }), "import-id")).toMatchObject({
      accountId: "bank",
      transferAccountId: "cash",
      type: "transfer",
    });
    expect(importRowToDraft(row({ type: "transfer", direction: "credit", categoryId: undefined, transferAccountId: "source-bank" }), "import-id")).toMatchObject({
      accountId: "source-bank",
      transferAccountId: "bank",
      type: "transfer",
    });
  });

  it("records an explicit import-anyway duplicate relationship", () => {
    const draft = importRowToDraft(row({
      duplicate: { transactionId: "existing", confidence: "likely", reasons: ["same reference"], source: "existing" },
      importDuplicateAnyway: true,
    }), "import-id");
    expect(draft).toMatchObject({ duplicateOfId: "existing", reviewStatus: "duplicate" });
  });
});
