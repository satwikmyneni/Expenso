import { AppShell } from "@/components/app-shell";
import { FinanceProvider } from "@/features/finance/finance-provider";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <FinanceProvider><AppShell>{children}</AppShell></FinanceProvider>;
}
