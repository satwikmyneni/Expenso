import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseUrl = "https://expenso-cookie-test.supabase.co";
const publishableKey = "sb_publishable_test_only";
const userId = "11111111-1111-4111-8111-111111111111";

function encodeJwtPart(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function browserCookies() {
  if (!document.cookie) return [];
  return document.cookie.split("; ").map((cookie) => {
    const separator = cookie.indexOf("=");
    return {
      name: cookie.slice(0, separator),
      value: decodeURIComponent(cookie.slice(separator + 1)),
    };
  });
}

function clearBrowserCookies() {
  browserCookies().forEach(({ name }) => {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  });
}

describe("Supabase SSR cookie bridge", () => {
  afterEach(() => {
    clearBrowserCookies();
    vi.unstubAllGlobals();
  });

  it("makes a password session written by the browser client readable by the server client", async () => {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = [
      encodeJwtPart({ alg: "HS256", typ: "JWT" }),
      encodeJwtPart({ aud: "authenticated", exp: now + 3600, role: "authenticated", sub: userId }),
      "test-signature",
    ].join(".");
    const user = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "person@example.com",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    };

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/v1/token")) {
        return new Response(JSON.stringify({
          access_token: accessToken,
          expires_at: now + 3600,
          expires_in: 3600,
          refresh_token: "test-refresh-token",
          token_type: "bearer",
          user,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.includes("/auth/v1/user")) {
        return new Response(JSON.stringify(user), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected Supabase request: ${new URL(url).pathname}`);
    }));

    const browserClient = createBrowserClient(supabaseUrl, publishableKey, {
      isSingleton: false,
      auth: { detectSessionInUrl: false },
    });
    const signIn = await browserClient.auth.signInWithPassword({
      email: "person@example.com",
      password: "a-long-private-password",
    });

    expect(signIn.error).toBeNull();
    expect(browserCookies().some(({ name }) => name.startsWith("sb-expenso-cookie-test-auth-token"))).toBe(true);

    const serverClient = createServerClient(supabaseUrl, publishableKey, {
      cookies: { getAll: browserCookies, setAll: () => undefined },
    });
    const verified = await serverClient.auth.getClaims();

    expect(verified.error).toBeNull();
    expect(verified.data?.claims.sub).toBe(userId);
  });
});
