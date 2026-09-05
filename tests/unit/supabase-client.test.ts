import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: { auth: { signUp: vi.fn() } },
  createBrowserClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => {
    mocks.createBrowserClient(...args);
    return mocks.client;
  },
}));

describe("Supabase browser client configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initializes with a current publishable key", async () => {
    const url = "https://project.supabase.co";
    const publishableKey = "sb_publishable_synthetic-test-key-value";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);

    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");

    expect(getSupabaseBrowserClient()).toBe(mocks.client);
    expect(mocks.createBrowserClient).toHaveBeenCalledWith(url, publishableKey);
  });
});
