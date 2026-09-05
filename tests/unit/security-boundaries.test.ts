import { describe, expect, it, vi } from "vitest";
import { authErrorMessage, safeAppPath } from "@/features/auth/errors";
import { FinanceRepository } from "@/features/finance/repository";
import { dataError } from "@/lib/data-error";
import { getSupabaseConfigState, getSupabasePublicKey, hasValidSupabaseConfig } from "@/lib/supabase/config";
import { isProtectedPath } from "@/proxy";

describe("safe user-facing boundaries", () => {
  it("accepts only app-relative redirects", () => {
    expect(safeAppPath("/transactions?type=expense")).toBe("/transactions?type=expense");
    expect(safeAppPath("//attacker.example")).toBe("/dashboard");
    expect(safeAppPath("https://attacker.example")).toBe("/dashboard");
  });

  it("maps auth and database failures without exposing backend details", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "backend detail" })).toBe("Email or password is incorrect.");
    expect(dataError({ code: "42501", message: "raw policy name" }).message).toBe("You do not have permission to change this record.");
    expect(dataError({ code: "XX000", message: "sensitive internal detail" }, "load").message).not.toContain("sensitive");
  });

  it("keeps product routes behind the authentication boundary", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/transactions/history")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("enables live mode only for a valid public Supabase configuration", () => {
    const publishableKey = "sb_publishable_synthetic-test-key-value";
    expect(hasValidSupabaseConfig("https://project.supabase.co", "a-valid-public-client-key-value")).toBe(true);
    expect(hasValidSupabaseConfig("https://project.supabase.co", publishableKey)).toBe(true);
    expect(hasValidSupabaseConfig("https://your-project.supabase.co", "your-anon-or-publishable-key")).toBe(false);
    expect(hasValidSupabaseConfig("not-a-url", "a-valid-public-client-key-value")).toBe(false);
    expect(getSupabaseConfigState(undefined, undefined)).toBe("absent");
    expect(getSupabaseConfigState("", "")).toBe("absent");
    expect(getSupabaseConfigState("https://project.supabase.co", undefined)).toBe("invalid");
    expect(getSupabaseConfigState("not-a-url", "a-valid-public-client-key-value")).toBe("invalid");
    expect(getSupabaseConfigState(" https://project.supabase.co ", " a-valid-public-client-key-value ")).toBe("configured");
    expect(getSupabaseConfigState("https://project.supabase.co", getSupabasePublicKey(undefined, publishableKey))).toBe("configured");
    expect(getSupabasePublicKey(" legacy-public-key ", publishableKey)).toBe("legacy-public-key");
  });

  it("writes ownership from the authenticated Supabase user id", async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: null, error: { code: "XX000", message: "stop after capture" } }) }) }));
    const repository = new FinanceRepository({ from: () => ({ insert }) } as never);
    await expect(repository.createAccount("authenticated-user-id", {
      name: "Primary account",
      institution: "Test Bank",
      type: "bank",
      currency: "INR",
      openingBalanceMinor: 0n,
      color: "#147563",
      includeInAnalytics: true,
      includeInNetWorth: true,
    })).rejects.toThrow();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "authenticated-user-id" }));
  });
});
