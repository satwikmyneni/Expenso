"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./button";

export function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="max-h-[94dvh] w-full min-w-0 max-w-full overflow-y-auto rounded-t-[26px] border border-border bg-elevated pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-w-xl sm:rounded-[26px]">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-surface/95 p-5 backdrop-blur sm:p-6">
        <div className="min-w-0 break-words"><h2 id="modal-title" className="text-xl font-bold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog"><X className="size-5" /></Button>
      </div>
      {children}
    </div>
  </div>;
}
