import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {},
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-boundary">{children}</div>,
}));
vi.mock("@/features/finance/finance-provider", () => ({
  FinanceProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="finance-boundary">{children}</div>,
}));
vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

import { Providers } from "@/components/providers";
import ProductLayout from "@/app/(app)/layout";

describe("authenticated provider boundary", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it("does not initialize finance session state on public authentication pages", () => {
    render(<Providers><div>Public login content</div></Providers>);

    expect(screen.getByTestId("query-boundary")).toBeInTheDocument();
    expect(screen.queryByTestId("finance-boundary")).not.toBeInTheDocument();
  });

  it("initializes finance state inside the protected application layout", () => {
    render(<ProductLayout><div>Private app content</div></ProductLayout>);

    expect(screen.getByTestId("finance-boundary")).toContainElement(screen.getByTestId("app-shell"));
    expect(screen.getByText("Private app content")).toBeInTheDocument();
  });
});
