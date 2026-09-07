import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AccountType } from "@/features/finance/types";
import {
  detectImportedTransactionType,
  normalizeIndianAmount,
  normalizeRow,
  normalizeStatementDate,
  parseStatementText,
} from "@/features/imports/pipeline";

const fixture = (name: string) => readFileSync(
  resolve(process.cwd(), "tests", "fixtures", "imports", name),
  "utf8",
);

describe("statement normalization", () => {
  it.each([
    ["1,804.95", "1804.95"],
    ["22,979.00", "22979.00"],
    ["1,50,000.00", "150000.00"],
    ["₹ 932", "932.00"],
    ["(500.5)", "-500.50"],
  ])("normalizes Indian amount %s exactly", (input, expected) => {
    expect(normalizeIndianAmount(input)).toBe(expected);
  });

  it.each([
    ["01/09/2026", "2026-09-01"],
    ["01-09-2026", "2026-09-01"],
    ["01 Sep 2026", "2026-09-01"],
  ])("normalizes statement date %s", (input, expected) => {
    expect(normalizeStatementDate(input)).toBe(expected);
  });

  it("uses debit/credit rather than the balance column", () => {
    const row = normalizeRow({
      "Txn Date": "03/09/2026",
      Narration: "UPI/DR/624677951907/MC DONALDS/HDFC/mcdonalds@example/UPI",
      Debit: "156.44",
      Balance: "8,374.79",
    }, 1, "csv");

    expect(row).toMatchObject({
      date: "2026-09-03",
      direction: "debit",
      amount: "156.44",
      merchant: "McDonald's",
      reference: "624677951907",
      bankCode: "HDFC",
      upiId: "mcdonalds@example",
      type: "expense",
    });
  });

  it("parses a sanitized Indian statement and preserves wrapped descriptions", () => {
    const rows = parseStatementText(fixture("indian-bank-statement.txt"), "txt");

    expect(rows).toHaveLength(13);
    expect(rows[0].amount).toBe("1804.95");
    expect(rows[0].direction).toBe("debit");
    expect(rows[1].direction).toBe("credit");
    expect(rows[3]).toMatchObject({ amount: "22979.00", direction: "credit", type: "income" });
    expect(rows[8].type).toBe("transfer");
    expect(rows[9].type).toBe("refund");
    expect(rows[10].description).toContain("WRAPPED DESCRIPTION CONTINUES HERE");
    expect(rows[11].date).toBe("2026-08-15");
  });

  it("leaves invalid rows in review instead of inventing values", () => {
    const row = normalizeRow({ Narration: "Unknown person" }, 1, "csv");
    expect(row.status).toBe("invalid");
    expect(row.selected).toBe(false);
    expect(row.issueCodes).toEqual(expect.arrayContaining(["invalid_amount", "invalid_date"]));
  });
});

describe("deterministic transaction type detection", () => {
  const detect = (description: string, direction: "debit" | "credit", accountType?: AccountType) =>
    detectImportedTransactionType(description, direction, accountType).type;

  it("does not assume every NEFT credit is a transfer", () => {
    expect(detect("NEFT*REFERENCE*PARU CHURI PROJECTS", "credit")).toBe("income");
  });

  it("treats ATM withdrawal and card payments as transfers", () => {
    expect(detect("ATM CASH WITHDRAWAL", "debit")).toBe("transfer");
    expect(detect("CREDIT CARD PAYMENT HDFC", "debit")).toBe("transfer");
    expect(detect("PAYMENT RECEIVED THANK YOU", "credit", "credit_card")).toBe("transfer");
  });

  it("distinguishes credit-card purchases and refunds", () => {
    expect(detect("POS PURCHASE SAMPLE CAFE", "debit", "credit_card")).toBe("expense");
    expect(detect("AMAZON REFUND REVERSAL", "credit", "credit_card")).toBe("refund");
  });
});
