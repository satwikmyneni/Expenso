import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateReceiptFile } from "@/features/imports/file-security";
import { parseReceiptText } from "@/features/imports/ocr";

const fixture = (name: string) => readFileSync(
  resolve(process.cwd(), "tests", "fixtures", "imports", name),
  "utf8",
);

const binaryFixture = (name: string) => readFileSync(
  resolve(process.cwd(), "tests", "fixtures", "imports", name),
);

describe("deterministic receipt text extraction", () => {
  it("extracts a sanitized restaurant receipt", () => {
    expect(parseReceiptText(fixture("restaurant-receipt-ocr.txt"))).toMatchObject({
      merchant: "McDonald's",
      amount: "156.44",
      date: "2026-09-03",
      paymentMethod: "UPI",
      invoiceNumber: "INV-1009",
    });
  });

  it("extracts an Indian UPI screenshot", () => {
    expect(parseReceiptText(fixture("upi-payment-ocr.txt"))).toMatchObject({
      merchant: "McDonald's",
      amount: "156.44",
      date: "2026-09-03",
      type: "expense",
      upiId: "mcdonalds@example",
      reference: "624677951907",
      paymentMethod: "UPI",
    });
  });

  it("prefers grand total over subtotal and tax", () => {
    expect(parseReceiptText(fixture("tax-total-receipt-ocr.txt"))).toMatchObject({
      merchant: "Sample Cafe",
      amount: "990.00",
      date: "2026-09-05",
    });
  });

  it("requires manual correction for unreadable fields", () => {
    const result = parseReceiptText(fixture("unreadable-receipt-ocr.txt"));
    expect(result.confidence).toBe("low");
    expect(result.issueCodes).toEqual(expect.arrayContaining(["amount_unreadable", "date_unreadable"]));
  });
});

describe("receipt file security", () => {
  it("ships real sanitized PNG fixtures for receipt and UPI OCR verification", () => {
    const manifest = JSON.parse(fixture("synthetic-image-fixtures.json")) as {
      fixtures: Array<{ image?: string }>;
    };
    const images = manifest.fixtures.flatMap((entry) => entry.image ? [entry.image] : []);

    expect(images).toEqual(expect.arrayContaining([
      "synthetic-restaurant-receipt.png",
      "synthetic-upi-screenshot.png",
    ]));
    for (const image of images) {
      expect(binaryFixture(image).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
  });

  it("accepts only matching supported MIME and extension pairs", () => {
    expect(validateReceiptFile(new File(["synthetic"], "receipt.png", { type: "image/png" }))).toEqual({
      extension: "png",
      contentType: "image/png",
    });
    expect(() => validateReceiptFile(new File(["synthetic"], "receipt.png", { type: "text/html" }))).toThrow(/matching file type/i);
    expect(() => validateReceiptFile(new File(["synthetic"], "receipt.exe", { type: "image/png" }))).toThrow(/JPG/i);
  });

  it("rejects empty receipt files", () => {
    expect(() => validateReceiptFile(new File([], "receipt.pdf", { type: "application/pdf" }))).toThrow(/empty/i);
  });
});
