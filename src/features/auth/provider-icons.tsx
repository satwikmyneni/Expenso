import { FaMicrosoft } from "react-icons/fa6";
import { SiApple, SiGoogle } from "react-icons/si";

const iconClass = "size-[21px] shrink-0";

export function GoogleIcon() {
  return <SiGoogle className={iconClass} aria-hidden="true" focusable="false" />;
}

export function AppleIcon() {
  return <SiApple className={iconClass} aria-hidden="true" focusable="false" />;
}

export function MicrosoftIcon() {
  return <FaMicrosoft className={iconClass} aria-hidden="true" focusable="false" />;
}
