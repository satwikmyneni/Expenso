import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replaceWithAuthenticatedRoute: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/auth/navigation", () => ({ replaceWithAuthenticatedRoute: mocks.replaceWithAuthenticatedRoute }));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { signInWithPassword: mocks.signInWithPassword, signInWithOtp: mocks.signInWithOtp } }),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() } }));

import LoginPage from "@/app/login/page";

describe("email authentication", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-a" }, session: { user: { id: "user-a" } } },
      error: null,
    });
    window.history.replaceState({}, "", "/login?next=%2Faccounts");
  });

  it("keeps email and password sign-in working alongside OAuth", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-private-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "person@example.com", password: "a-long-private-password" }));
    expect(mocks.replaceWithAuthenticatedRoute).toHaveBeenCalledWith("/accounts");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows invalid credentials and always releases the loading state", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "incorrect-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Email or password is incorrect."));
    expect(mocks.replaceWithAuthenticatedRoute).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("handles a rejected Supabase request without leaving an infinite spinner", async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error("network unavailable"));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-private-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("We couldn't finish signing you in. Please try again."));
    expect(mocks.replaceWithAuthenticatedRoute).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("times out a stalled Supabase request and restores the login button", async () => {
    vi.useFakeTimers();
    mocks.signInWithPassword.mockReturnValue(new Promise(() => undefined));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-private-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: /Signing in/ })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(mocks.toastError).toHaveBeenCalledWith("Sign-in is taking too long. Check your connection and try again.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("does not leave loading active if navigation throws", async () => {
    mocks.replaceWithAuthenticatedRoute.mockImplementationOnce(() => { throw new Error("navigation failed"); });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-private-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("You're signed in, but Expenso couldn't open your workspace. Refresh the page to continue."));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
