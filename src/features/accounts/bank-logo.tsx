import type { IconType } from "react-icons";
import {
  SiAmericanexpress,
  SiAxisbank,
  SiBankofamerica,
  SiChase,
  SiDiscover,
  SiGoldmansachs,
  SiHdfcbank,
  SiIcicibank,
  SiWellsfargo,
} from "react-icons/si";
import type { BankBrand, VerifiedBankLogoId } from "./bank-brands";
import { cn } from "@/lib/utils";

const verifiedLogos: Record<VerifiedBankLogoId, IconType> = {
  "american-express": SiAmericanexpress,
  "axis-bank": SiAxisbank,
  "bank-of-america": SiBankofamerica,
  "chase": SiChase,
  "discover": SiDiscover,
  "goldman-sachs": SiGoldmansachs,
  "hdfc-bank": SiHdfcbank,
  "icici-bank": SiIcicibank,
  "wells-fargo": SiWellsfargo,
};

export function BankLogo({ brand, className }: { brand: BankBrand; className?: string }) {
  if (brand.logo.status !== "VERIFIED_LOGO") return null;
  const Logo = verifiedLogos[brand.logo.id];
  return <span
    role="img"
    aria-label={`${brand.displayName} logo`}
    data-bank-logo={brand.logo.id}
    className={cn("inline-grid min-h-11 min-w-11 place-items-center", className)}
    style={{ color: brand.iconColor }}
  >
    <Logo className="size-8 max-h-8 max-w-16" aria-hidden="true" focusable="false" />
  </span>;
}
