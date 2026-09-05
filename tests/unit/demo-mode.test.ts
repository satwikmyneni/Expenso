import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/demo/route";
import { DEMO_COOKIE, isDemoMode } from "@/features/finance/demo-mode";

describe("explicit sample mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.cookie = `${DEMO_COOKIE}=; Path=/; Max-Age=0`;
  });

  it("honors the demo cookie only when Supabase values are absent", () => {
    document.cookie = `${DEMO_COOKIE}=1; Path=/`;
    expect(isDemoMode("absent")).toBe(true);
    expect(isDemoMode("configured")).toBe(false);
    expect(isDemoMode("invalid")).toBe(false);
  });

  it("creates a demo session only when both public Supabase values are absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = GET();
    expect(response.headers.get("location")).toBe("/dashboard");
    expect(response.headers.get("set-cookie")).toContain(`${DEMO_COOKIE}=1`);
  });

  it("clears a stale demo session when Supabase is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a-valid-public-client-key-value");
    const response = GET();
    expect(response.headers.get("location")).toBe("/dashboard");
    expect(response.headers.get("set-cookie")).not.toContain(`${DEMO_COOKIE}=1`);
  });

  it("does not enable demo mode for incomplete or invalid Supabase configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = GET();
    expect(response.headers.get("location")).toBe("/login?error=supabase_misconfigured");
    expect(response.headers.get("set-cookie")).not.toContain(`${DEMO_COOKIE}=1`);
  });
});
