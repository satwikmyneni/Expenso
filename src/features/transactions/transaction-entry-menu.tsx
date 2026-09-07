"use client";

import Link from "next/link";
import { FileSpreadsheet, Keyboard, Mic, ScanLine } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function TransactionEntryMenu({ open, onClose, onManual, onVoice }: { open: boolean; onClose: () => void; onManual: () => void; onVoice: () => void }) {
  return <Modal open={open} onClose={onClose} title="Add transaction" description="Choose the safest entry method. Every scanned or imported result is reviewed before saving.">
    <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
      <Choice icon={Keyboard} title="Manual" description="Enter and review the details yourself" onClick={onManual} />
      <Choice icon={Mic} title="Voice" description="Open the form and use local speech capture" onClick={onVoice} />
      <LinkChoice href="/imports?mode=receipt" icon={ScanLine} title="Scan receipt" description="Photo, screenshot, or PDF with local OCR" onClick={onClose} />
      <LinkChoice href="/imports?mode=statement" icon={FileSpreadsheet} title="Import statement" description="PDF, CSV, XLS, XLSX, or TXT review" onClick={onClose} />
    </div>
  </Modal>;
}

function Choice({ icon: Icon, title, description, onClick }: { icon: typeof Keyboard; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-ring/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-brand"><Icon className="size-5" /></span><span><strong className="block text-sm">{title}</strong><small className="mt-1 block leading-5 text-muted-foreground">{description}</small></span></button>;
}

function LinkChoice({ href, icon: Icon, title, description, onClick }: { href: string; icon: typeof Keyboard; title: string; description: string; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-ring/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-brand"><Icon className="size-5" /></span><span><strong className="block text-sm">{title}</strong><small className="mt-1 block leading-5 text-muted-foreground">{description}</small></span></Link>;
}
