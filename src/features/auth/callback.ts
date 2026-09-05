export type AuthCallbackError = "auth_callback" | "oauth_cancelled" | "oauth_provider";

export function callbackError(searchParams: URLSearchParams): AuthCallbackError | null {
  const error = searchParams.get("error")?.toLowerCase();
  const description = searchParams.get("error_description")?.toLowerCase() ?? "";
  if (error) {
    if (error === "access_denied" || error.includes("cancel") || description.includes("cancel")) return "oauth_cancelled";
    return "oauth_provider";
  }
  return searchParams.has("code") ? null : "auth_callback";
}

export function callbackErrorMessage(error: string | null) {
  if (error === "oauth_cancelled") return "Social sign-in was cancelled. You can try again or continue with email.";
  if (error === "oauth_provider") return "That sign-in provider could not complete the request. Try again or continue with email.";
  if (error === "supabase_unavailable") return "Secure sign-in is not configured in this environment. You can still open the explicit sample workspace.";
  if (error === "supabase_misconfigured") return "Supabase environment values are present but invalid. Correct them and restart the application.";
  if (error === "supabase_connection") return "Supabase could not be reached while checking your session. Check the connection and try again.";
  if (error === "auth_session") return "Your Supabase session could not be verified. Sign in again to continue.";
  if (error === "auth_callback") return "That sign-in link is invalid or expired. Start a new sign-in request.";
  return null;
}
