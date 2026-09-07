import { format, isValid, parse, parseISO } from "date-fns";
import { normalizeIndianAmount } from "./normalization";
import { extractPdfText, renderPdfForOcr } from "./pdf";
import { normalizeMerchant } from "./merchant-normalization";
import type { ReceiptExtraction } from "./types";

export type OcrProgress = (progress: number, message: string) => void;

async function withOcrTimeout<T>(operation: Promise<T>, timeoutMs = 90_000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Local OCR timed out. Try a clearer image or enter the transaction manually.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function recognizeImages(images: Array<File | Blob>, onProgress?: OcrProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress?.(25 + Math.round(message.progress * 70), "Reading text locally on this device");
      }
    },
  });
  try {
    const pages: string[] = [];
    for (let index = 0; index < images.length; index += 1) {
      onProgress?.(25 + Math.round((index / images.length) * 65), `Reading image ${index + 1} of ${images.length}`);
      const result = await withOcrTimeout(worker.recognize(images[index]));
      pages.push(result.data.text);
    }
    return pages.join("\n");
  } finally {
    await worker.terminate();
  }
}

export async function extractTextLocally(file: File, onProgress?: OcrProgress) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    onProgress?.(2, "Checking for selectable PDF text");
    const text = await extractPdfText(file, onProgress);
    if (text.replace(/\s/g, "").length >= 40) return { text, method: "pdf_text" as const };
    const images = await renderPdfForOcr(file, onProgress);
    return { text: await recognizeImages(images, onProgress), method: "ocr" as const };
  }
  return { text: await recognizeImages([file], onProgress), method: "ocr" as const };
}

function parsedDate(value: string) {
  const cleaned = value.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const direct = parseISO(cleaned);
  if (isValid(direct)) return format(direct, "yyyy-MM-dd");
  for (const pattern of ["dd/MM/yyyy", "dd-MM-yyyy", "dd MMM yyyy", "dd MMMM yyyy", "MMM dd yyyy", "MMMM dd yyyy"]) {
    const candidate = parse(cleaned, pattern, new Date());
    if (isValid(candidate)) return format(candidate, "yyyy-MM-dd");
  }
  return "";
}

function extractDate(text: string) {
  const candidates = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/g) ?? [];
  return candidates.map(parsedDate).find(Boolean) ?? "";
}

function extractLabeled(text: string, labels: string[]) {
  for (const label of labels) {
    const expression = new RegExp(`(?:${label})\\s*(?:[:#-]\\s*)?([A-Z0-9][A-Z0-9@._/-]{3,})`, "i");
    const value = text.match(expression)?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function amountFromText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const prioritized = [
    /\b(?:grand\s+total|amount\s+paid|total\s+paid|paid)\b[^\d₹]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\btotal\b(?!\s+tax)[^\d₹]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\bamount\b[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of prioritized) {
    for (const line of lines) {
      if (/\b(?:subtotal|tax|gst|cgst|sgst|discount)\b/i.test(line) && !/grand\s+total/i.test(line)) continue;
      const raw = line.match(pattern)?.[1];
      if (!raw) continue;
      try {
        const amount = normalizeIndianAmount(raw);
        if (amount !== "0.00") return amount;
      } catch { /* Try the next deterministic candidate. */ }
    }
  }
  return "";
}

function merchantFromReceipt(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    if (/^(?:paid to|sent to|received from)\s*:?.*$/i.test(lines[index])) {
      const inline = lines[index].replace(/^(?:paid to|sent to|received from)\s*:?[\s-]*/i, "");
      const candidate = inline || lines[index + 1] || "";
      if (candidate) return normalizeMerchant(candidate);
    }
  }
  const candidate = lines.find((line) =>
    /[a-z]{2}/i.test(line)
    && !/\b(?:receipt|invoice|tax|gst|total|amount|date|time|paid|successful|transaction|order|upi|utr)\b/i.test(line)
    && !/^\d/.test(line),
  );
  return candidate ? normalizeMerchant(candidate) : "";
}

export function parseReceiptText(rawText: string): ReceiptExtraction {
  const text = rawText.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  const amount = amountFromText(text);
  const merchant = merchantFromReceipt(text);
  const date = extractDate(text);
  const time = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?\b/i)?.[0];
  const upiId = text.match(/\b[a-z0-9._-]{2,}@[a-z0-9.-]{2,}\b/i)?.[0];
  const reference = extractLabeled(text, ["UPI transaction ID", "transaction ID", "UTR", "reference(?: no| number)?"]);
  const invoiceNumber = extractLabeled(text, ["invoice(?: no| number)?"]);
  const orderNumber = extractLabeled(text, ["order(?: no| number| id)?"]);
  const type = /\b(?:received from|credited|refund(?:ed)?)\b/i.test(text)
    ? (/\brefund(?:ed)?\b/i.test(text) ? "refund" as const : "income" as const)
    : "expense" as const;
  const paymentMethod = /\bupi\b/i.test(text) ? "UPI"
    : /\bcredit card\b/i.test(text) ? "Credit card"
      : /\bdebit card\b/i.test(text) ? "Debit card"
        : /\bcash\b/i.test(text) ? "Cash" : undefined;
  const issueCodes = [
    ...(!amount ? ["amount_unreadable"] : []),
    ...(!merchant ? ["merchant_unreadable"] : []),
    ...(!date ? ["date_unreadable"] : []),
    ...(type === "refund" ? ["refund_purchase_required"] : []),
  ];
  return {
    rawText: text,
    merchant,
    amount,
    date,
    time,
    type,
    upiId,
    reference,
    invoiceNumber,
    orderNumber,
    paymentMethod,
    confidence: amount && merchant && date ? "medium" : "low",
    issueCodes,
  };
}

export async function scanReceipt(file: File, onProgress?: OcrProgress) {
  const extracted = await extractTextLocally(file, onProgress);
  onProgress?.(98, "Preparing your editable review");
  return { ...parseReceiptText(extracted.text), extractionMethod: extracted.method };
}
