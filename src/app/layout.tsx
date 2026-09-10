import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Expenso — Personal finance, clearly", template: "%s · Expenso" },
  description: "A private, calm personal finance workspace for expenses, budgets, goals and net worth.",
  applicationName: "Expenso",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Expenso" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#f2f6fb" },
  { media: "(prefers-color-scheme: dark)", color: "#080b14" },
] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!border-border !bg-elevated !text-foreground !shadow-card",
              success: "!border-income/30",
              error: "!border-destructive/30",
              info: "!border-info/30",
              warning: "!border-warning/30",
              description: "!text-muted-foreground",
              actionButton: "!bg-brand !text-white",
              cancelButton: "!bg-muted-surface !text-foreground",
              closeButton: "!border-border !bg-elevated !text-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
