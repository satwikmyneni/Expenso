import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async (onHeaders?: (headers: Record<string, string>) => void) => {
    onHeaders?.({ "cache-control": "private, no-cache, no-store" });
    return { auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } };
  },
}));

import { GET } from "@/app/auth/callback/route";

describe("PKCE callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: "user-a" } } }, error: null });
  });

  it("exchanges a successful OAuth code and keeps the redirect relative", async () => {
    const response = await GET(new Request("https://expenso.example/auth/callback?code=single-use-code&sb_flow_id=flow-a&next=%2Faccounts"));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("single-use-code", { flowId: "flow-a" });
    expect(response.headers.get("location")).toBe("https://expenso.example/accounts");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects an external next target", async () => {
    const response = await GET(new Request("https://expenso.example/auth/callback?code=single-use-code&next=%2F%2Fattacker.example"));
    expect(response.headers.get("location")).toBe("https://expenso.example/dashboard");
  });

  it("handles provider cancellation without attempting a code exchange", async () => {
    const response = await GET(new Request("https://expenso.example/auth/callback?error=access_denied"));
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://expenso.example/login?error=oauth_cancelled");
  });

  it("returns an expired or invalid code to a fresh sign-in", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({ data: { session: null }, error: { code: "flow_state_expired" } });
    const response = await GET(new Request("https://expenso.example/auth/callback?code=expired-code"));
    expect(response.headers.get("location")).toBe("https://expenso.example/login?error=auth_callback");
  });
});
