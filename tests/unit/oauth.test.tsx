import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { callbackError, callbackErrorMessage } from "@/features/auth/callback";
import { authCallbackUrl, publicAuthProviderEnabled, startSocialOAuth } from "@/features/auth/oauth";
import { SocialLoginButtons } from "@/features/auth/social-login-buttons";

describe("social authentication", () => {
  it("renders all provider options with accessible names", () => {
    render(<SocialLoginButtons />);
    const providerButtons = [
      screen.getByRole("button", { name: /Continue with Google/i }),
      screen.getByRole("button", { name: /Continue with Apple/i }),
      screen.getByRole("button", { name: /Continue with Microsoft/i }),
    ];

    for (const button of providerButtons) {
      expect(button).toBeInTheDocument();
      expect(button.querySelector("svg[aria-hidden='true']")).toHaveClass("size-[21px]", "shrink-0");
    }
  });

  it.each([
    ["google", "google"],
    ["apple", "apple"],
    ["microsoft", "azure"],
  ] as const)("initiates %s through the correct Supabase provider", async (provider, supabaseProvider) => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { provider: supabaseProvider, url: "https://provider.example" }, error: null });
    const client = { auth: { signInWithOAuth } };
    await startSocialOAuth(client as never, provider, "https://expenso.example", "/transactions?type=expense");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: supabaseProvider,
      options: { redirectTo: "https://expenso.example/auth/callback?next=%2Ftransactions%3Ftype%3Dexpense" },
    });
  });

  it("keeps callback destinations app-relative", () => {
    expect(authCallbackUrl("https://expenso.example", "//attacker.example")).toBe("https://expenso.example/auth/callback?next=%2Fdashboard");
  });

  it("enables a provider only for an explicit true public flag", () => {
    expect(publicAuthProviderEnabled("true")).toBe(true);
    expect(publicAuthProviderEnabled(" TRUE ")).toBe(true);
    expect(publicAuthProviderEnabled("false")).toBe(false);
    expect(publicAuthProviderEnabled(undefined)).toBe(false);
  });

  it("classifies cancelled, provider, and invalid callbacks without exposing provider details", () => {
    expect(callbackError(new URLSearchParams("error=access_denied&error_description=private"))).toBe("oauth_cancelled");
    expect(callbackError(new URLSearchParams("error=server_error&error_description=private"))).toBe("oauth_provider");
    expect(callbackError(new URLSearchParams())).toBe("auth_callback");
    expect(callbackError(new URLSearchParams("code=one-time-code"))).toBeNull();
    expect(callbackErrorMessage("oauth_provider")).not.toContain("private");
  });
});
