interface AuthFailure {
  code?: string;
  message?: string;
}

export function authErrorMessage(error: AuthFailure, fallback = "We couldn't complete that request. Please try again.") {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "Verify your email before signing in.";
  if (code === "user_already_exists" || message.includes("already registered")) return "An account may already exist for that email. Try signing in or resetting your password.";
  if (code.includes("rate_limit") || message.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (code === "same_password" || message.includes("same password")) return "Choose a password you haven't used for this account.";
  if (message.includes("password")) return "The password does not meet the account security requirements.";
  return fallback;
}

export function safeAppPath(value: string | null, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
