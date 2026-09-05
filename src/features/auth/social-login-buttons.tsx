"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage, safeAppPath } from "./errors";
import { AppleIcon, GoogleIcon, MicrosoftIcon } from "./provider-icons";
import { socialProviderAvailability, socialProviders, startSocialOAuth, type SocialProvider } from "./oauth";

const icons = { google: GoogleIcon, apple: AppleIcon, microsoft: MicrosoftIcon };

export function SocialLoginButtons({ nextPath }: { nextPath?: string | null }) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const availableCount = Object.values(socialProviderAvailability).filter(Boolean).length;

  const begin = async (provider: SocialProvider) => {
    if (!socialProviderAvailability[provider]) {
      toast.info(`${socialProviders[provider].label} sign-in is not available in this environment.`);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast.error("Secure sign-in is unavailable because Supabase is not configured.");
      return;
    }

    setBusy(provider);
    const { error } = await startSocialOAuth(client, provider, location.origin, safeAppPath(nextPath ?? null));
    if (error) {
      setBusy(null);
      const unavailable = /provider|enabled|unsupported/i.test(error.message);
      toast.error(unavailable ? `${socialProviders[provider].label} sign-in is not configured yet.` : authErrorMessage(error));
    }
  };

  return <div className="space-y-3">
    <div className="grid gap-2.5">
      {(Object.keys(socialProviders) as SocialProvider[]).map((provider) => {
        const Icon = icons[provider];
        const available = socialProviderAvailability[provider];
        return <Button
          key={provider}
          type="button"
          variant="provider"
          className="w-full"
          disabled={!available || busy !== null}
          aria-label={`Continue with ${socialProviders[provider].label}${available ? "" : " (unavailable)"}`}
          onClick={() => void begin(provider)}
        >
          {busy === provider ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Icon />}
          <span>Continue with {socialProviders[provider].label}</span>
        </Button>;
      })}
    </div>
    {availableCount === 0 && <p id="social-login-status" className="px-2 pt-1 text-center text-[10px] leading-4 text-info" role="status">
      Social sign-in is not configured here yet. Email sign-in remains available.
    </p>}
  </div>;
}
