import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getClaims: vi.fn(), createServerClient: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => {
    mocks.createServerClient(...args);
    return { auth: { getClaims: mocks.getClaims } };
  },
}));

import { proxy } from "@/proxy";

describe("proxy backend selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a-valid-public-client-key-value");
    mocks.getClaims.mockResolvedValue({ data: null, error: null });
  });

  it("does not let a stale demo cookie bypass configured Supabase authentication", async () => {
    const request = new NextRequest("https://expenso.example/dashboard", { headers: { cookie: "expenso-demo=1" } });
    const response = await proxy(request);
    expect(mocks.createServerClient).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://expenso.example/login?next=%2Fdashboard");
    expect(response.headers.get("set-cookie")).not.toContain("expenso-demo=1");
  });

  it("surfaces a Supabase session connection failure instead of opening demo mode", async () => {
    mocks.getClaims.mockRejectedValue(new Error("network unavailable"));
    const request = new NextRequest("https://expenso.example/accounts", { headers: { cookie: "expenso-demo=1" } });
    const response = await proxy(request);
    expect(response.headers.get("location")).toBe("https://expenso.example/login?error=supabase_connection&next=%2Faccounts");
    expect(response.headers.get("set-cookie")).not.toContain("expenso-demo=1");
  });

  it("allows a protected route when the SSR client verifies the session claims", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "user-a" } }, error: null });
    const request = new NextRequest("https://expenso.example/accounts", {
      headers: { cookie: "sb-project-auth-token=opaque-session-value" },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    const options = mocks.createServerClient.mock.calls[0]?.[2] as { cookies: { getAll: () => Array<{ name: string }> } };
    expect(options.cookies.getAll().map(({ name }) => name)).toContain("sb-project-auth-token");
  });

  it("allows the explicit demo cookie only when both Supabase values are absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const request = new NextRequest("https://expenso.example/dashboard", { headers: { cookie: "expenso-demo=1" } });
    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
