import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-12 w-full min-w-0 max-w-full rounded-control border border-input bg-elevated px-3.5 text-sm text-foreground placeholder:text-muted-foreground/65 transition focus:border-ring/75 focus:outline-none focus:ring-2 focus:ring-ring/10", className)} {...props} />
));
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-12 w-full min-w-0 max-w-full rounded-control border border-input bg-elevated px-3.5 text-sm text-foreground transition focus:border-ring/75 focus:outline-none focus:ring-2 focus:ring-ring/10", className)} {...props} />
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-24 w-full min-w-0 max-w-full resize-y rounded-control border border-input bg-elevated px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/65 focus:border-ring/75 focus:outline-none focus:ring-2 focus:ring-ring/10", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-foreground">{label}{children}{error ? <span className="text-xs font-medium text-destructive">{error}</span> : hint ? <span className="text-[11px] font-normal text-muted-foreground">{hint}</span> : null}</label>;
}
