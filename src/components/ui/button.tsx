import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none active:scale-[.98] disabled:pointer-events-none disabled:opacity-45", {
  variants: {
    variant: {
      primary: "bg-brand text-white shadow-sm shadow-brand/15 hover:bg-brand/90",
      secondary: "border border-border bg-elevated text-foreground hover:border-ring/35 hover:bg-secondary/55",
      provider: "border border-input bg-transparent text-foreground hover:border-ring/55 hover:bg-secondary/35",
      ghost: "text-muted-foreground hover:bg-muted-surface hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    size: { default: "h-11", sm: "h-9 min-h-9 px-3 text-xs", icon: "size-11 min-h-11 rounded-full p-0" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(variants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
