"use client";

import { Suspense } from "react";
import { FileSpreadsheet, ScanLine } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { ReceiptScanner } from "@/features/imports/receipt-scanner";
import { StatementImporter } from "@/features/imports/statement-importer";

function ImportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "receipt" ? "receipt" : "statement";
  return <>
    <PageHeading
      eyebrow="Review before save"
      title={mode === "statement" ? "Import statements" : "Scan a receipt"}
      description={mode === "statement"
        ? "Normalize bank activity, detect deterministic categories and duplicates, then explicitly confirm each transaction."
        : "Extract receipt or UPI payment details locally, correct them, and save through the normal transaction flow."}
    />
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-canvas p-1.5 sm:inline-grid sm:min-w-[420px]" role="tablist" aria-label="Import workflow">
      <button type="button" role="tab" aria-selected={mode === "statement"} onClick={() => router.replace("/imports")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${mode === "statement" ? "bg-surface text-brand shadow-sm" : "text-muted-foreground"}`}><FileSpreadsheet className="size-4" />Statement</button>
      <button type="button" role="tab" aria-selected={mode === "receipt"} onClick={() => router.replace("/imports?mode=receipt")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${mode === "receipt" ? "bg-surface text-brand shadow-sm" : "text-muted-foreground"}`}><ScanLine className="size-4" />Scan receipt</button>
    </div>
    {mode === "statement" ? <StatementImporter /> : <ReceiptScanner />}
  </>;
}

export default function ImportsPage() {
  return <Suspense fallback={<PageHeading eyebrow="Review before save" title="Import transactions" description="Preparing the private import workspace…" />}>
    <ImportsContent />
  </Suspense>;
}
