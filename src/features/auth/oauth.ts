import type { Provider, SupabaseClient } from "@supabase/supabase-js";
import { safeAppPath } from "./errors";

export type SocialProvider = "google" | "apple" | "microsoft";

export const socialProviders: Record<SocialProvider, { label: string; provider: Provider }> = {
  google: { label: "Google", provider: "google" },
  apple: { label: "Apple", provider: "apple" },
  microsoft: { label: "Microsoft", provider: "azure" },
};

export function publicAuthProviderEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export const socialProviderAvailability: Record<SocialProvider, boolean> = {
  google: publicAuthProviderEnabled(process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED),
  apple: publicAuthProviderEnabled(process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED),
  microsoft: publicAuthProviderEnabled(process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED),
};

function configuredAppOrigin(fallbackOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return fallbackOrigin;

  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : fallbackOrigin;
  } catch {
    return fallbackOrigin;
  }
}

export function authCallbackUrl(currentOrigin: string, nextPath: string | null = "/dashboard") {
  const callback = new URL("/auth/callback", configuredAppOrigin(currentOrigin));
  callback.searchParams.set("next", safeAppPath(nextPath));
  return callback.toString();
}

export async function startSocialOAuth(
  client: Pick<SupabaseClient, "auth">,
  provider: SocialProvider,
  currentOrigin: string,
  nextPath: string | null,
) {
  return client.auth.signInWithOAuth({
    provider: socialProviders[provider].provider,
    options: { redirectTo: authCallbackUrl(currentOrigin, nextPath) },
  });
}
