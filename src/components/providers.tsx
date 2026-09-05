"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));

  useEffect(() => {
    const saved = localStorage.getItem("expenso-theme") ?? "system";
    const media = matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => document.documentElement.classList.toggle("dark", saved === "dark" || (saved === "system" && media.matches));
    applySystemTheme();
    if (saved === "system") media.addEventListener("change", applySystemTheme);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    document.documentElement.dataset.hydrated = "true";
    return () => { media.removeEventListener("change", applySystemTheme); delete document.documentElement.dataset.hydrated; };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
