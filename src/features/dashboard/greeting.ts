interface GreetingProfile {
  displayName?: string | null;
  firstName?: string | null;
  email?: string | null;
}

const genericEmailNames = new Set(["admin", "contact", "demo", "expenso", "finance", "hello", "info", "mail", "noreply", "support", "test", "user"]);

function firstNameLike(value: string | null | undefined) {
  const token = (value ?? "").trim().replace(/\s+/g, " ").split(" ")[0]?.replace(/^[^\p{L}]+|[^\p{L}'’\-]+$/gu, "") ?? "";
  if (!/\p{L}/u.test(token)) return null;
  if (token === token.toLowerCase() || token === token.toUpperCase()) {
    return `${token.charAt(0).toLocaleUpperCase()}${token.slice(1).toLocaleLowerCase()}`;
  }
  return token;
}

function nameFromEmail(email: string | null | undefined) {
  const match = (email ?? "").trim().toLowerCase().match(/^([^@]+)@[^@]+$/);
  if (!match) return null;
  const candidate = match[1].split("+")[0].split(/[._-]+/)[0];
  if (!/^\p{L}{2,30}$/u.test(candidate) || genericEmailNames.has(candidate)) return null;
  return firstNameLike(candidate);
}

export function resolveGreetingName(profile: GreetingProfile | null | undefined) {
  return firstNameLike(profile?.displayName)
    ?? firstNameLike(profile?.firstName)
    ?? nameFromEmail(profile?.email)
    ?? "there";
}

export function resolveTimeGreeting(date: Date) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

