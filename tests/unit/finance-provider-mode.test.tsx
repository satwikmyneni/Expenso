import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  load: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  authStateCallback: null as null | ((event: string, session: { user: { id: string; email?: string } } | null) => void),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession: mocks.getSession, getUser: mocks.getUser, onAuthStateChange: mocks.onAuthStateChange },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}));
vi.mock("@/features/finance/repository", () => ({
  FinanceRepository: class {
    load(...args: unknown[]) { return mocks.load(...args); }
  },
}));
vi.mock("@/lib/offline/queue", () => ({
  enqueue: vi.fn(), failOperation: vi.fn(), pendingOperations: vi.fn().mockResolvedValue([]), removeOperation: vi.fn(),
}));
vi.mock("@/features/finance/demo-mode", () => ({ isDemoMode: () => false }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

import { FinanceProvider, useFinance } from "@/features/finance/finance-provider";

function StateProbe() {
  const { connectionError, connectionState, data, loading } = useFinance();
  return <div>
    <span data-testid="loading">{String(loading)}</span>
    <span data-testid="state">{connectionState}</span>
    <span data-testid="demo">{String(data.demo)}</span>
    <span data-testid="user">{data.profile.id}</span>
    <span data-testid="error">{connectionError}</span>
  </div>;
}

describe("finance backend selection", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authStateCallback = null;
    mocks.getSession.mockRejectedValue(new Error("network unavailable"));
    mocks.onAuthStateChange.mockImplementation((callback) => {
      mocks.authStateCallback = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    mocks.channel.mockImplementation(() => {
      const channel = { on: vi.fn(), subscribe: vi.fn() };
      channel.on.mockReturnValue(channel);
      channel.subscribe.mockReturnValue(channel);
      return channel;
    });
  });

  it("surfaces a configured Supabase connection failure without loading sample data", async () => {
    render(<FinanceProvider><StateProbe /></FinanceProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("unavailable"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("demo")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("Supabase could not be reached");
  });

  it("surfaces Supabase authentication verification errors", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-a", email: "person@example.com" } } }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_invalid" } });
    render(<FinanceProvider><StateProbe /></FinanceProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("unavailable"));
    expect(screen.getByTestId("demo")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("session_invalid");
  });

  it("loads an authenticated user's empty workspace as live data", async () => {
    const user = { id: "user-a", email: "person@example.com" };
    mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.load.mockResolvedValue({
      demo: false,
      profile: { id: user.id, displayName: "Person", email: user.email, currency: "INR", locale: "en-IN", timezone: "UTC", theme: "system" },
      accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurring: [],
    });

    render(<FinanceProvider><StateProbe /></FinanceProvider>);

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("live"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("demo")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("");
    expect(mocks.load).toHaveBeenCalledWith(user.id, user.email);
  });

  it("reloads finance state when a previously unauthenticated provider receives SIGNED_IN", async () => {
    const user = { id: "user-a", email: "person@example.com" };
    render(<FinanceProvider><StateProbe /></FinanceProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("unavailable"));

    mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.load.mockResolvedValue({
      demo: false,
      profile: { id: user.id, displayName: "Person", email: user.email, currency: "INR", locale: "en-IN", timezone: "UTC", theme: "system" },
      accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurring: [],
    });

    act(() => mocks.authStateCallback?.("SIGNED_IN", { user }));

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("live"));
    expect(screen.getByTestId("user")).toHaveTextContent(user.id);
    expect(mocks.load).toHaveBeenCalledWith(user.id, user.email);
  });

  it("clears user-specific state on SIGNED_OUT and leaves TOKEN_REFRESHED intact", async () => {
    const user = { id: "user-a", email: "person@example.com" };
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    mocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.load.mockResolvedValue({
      demo: false,
      profile: { id: user.id, displayName: "Person", email: user.email, currency: "INR", locale: "en-IN", timezone: "UTC", theme: "system" },
      accounts: [], categories: [], transactions: [], budgets: [], goals: [], recurring: [],
    });
    render(<FinanceProvider><StateProbe /></FinanceProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("live"));
    const loadCount = mocks.load.mock.calls.length;

    act(() => mocks.authStateCallback?.("TOKEN_REFRESHED", { user }));
    expect(screen.getByTestId("state")).toHaveTextContent("live");
    expect(screen.getByTestId("user")).toHaveTextContent(user.id);
    expect(mocks.load).toHaveBeenCalledTimes(loadCount);

    act(() => mocks.authStateCallback?.("SIGNED_OUT", null));
    expect(screen.getByTestId("state")).toHaveTextContent("unavailable");
    expect(screen.getByTestId("user")).toHaveTextContent("");
    expect(screen.getByTestId("demo")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("session has ended");
    expect(removeItem).toHaveBeenCalledWith(`expenso-user-cache:${user.id}`);
    expect(localStorage.getItem(`expenso-user-cache:${user.id}`)).toBeNull();
  });
});
