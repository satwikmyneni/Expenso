import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  clearDemoMode: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({ auth: { signOut: mocks.signOut } }) }));
vi.mock("@/features/finance/demo-mode", () => ({ clearDemoMode: mocks.clearDemoMode }));
vi.mock("@/features/finance/finance-provider", () => ({
  useFinance: () => ({
    data: { demo: false, profile: { id: "user-a", displayName: "Nisha Rao", email: "nisha@example.com", currency: "INR", timezone: "Asia/Kolkata" } },
    resetDemo: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

import SettingsPage from "@/app/(app)/settings/page";

describe("profile and logout", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("shows the authenticated identity and keeps sign out directly in Profile", async () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Nisha Rao");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("nisha@example.com");
    const signOut = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(signOut);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(mocks.clearDemoMode).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/login");

    fireEvent.click(screen.getByRole("button", { name: "Security" }));
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
