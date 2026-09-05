import { describe, expect, it } from "vitest";
import { resolveGreetingName, resolveTimeGreeting } from "@/features/dashboard/greeting";

describe("personalized dashboard greeting", () => {
  it("prefers the profile display name and uses its friendly first name", () => {
    expect(resolveGreetingName({ displayName: "Priya Sharma", firstName: "Different", email: "different@example.com" })).toBe("Priya");
  });

  it("falls back to a profile first name", () => {
    expect(resolveGreetingName({ displayName: "", firstName: "Aarav", email: "other@example.com" })).toBe("Aarav");
  });

  it("uses a safe first-name-like email segment", () => {
    expect(resolveGreetingName({ displayName: "", email: "meera.shah@example.com" })).toBe("Meera");
  });

  it("uses a generic greeting for unavailable or unsuitable profile data", () => {
    expect(resolveGreetingName(undefined)).toBe("there");
    expect(resolveGreetingName({ displayName: "", email: "user123@example.com" })).toBe("there");
    expect(resolveGreetingName({ displayName: "", email: "demo@example.com" })).toBe("there");
  });

  it("varies by profile rather than using a hard-coded person", () => {
    expect(resolveGreetingName({ displayName: "User A" })).toBe("User");
    expect(resolveGreetingName({ displayName: "Nisha Rao" })).toBe("Nisha");
  });

  it("keeps the existing morning, afternoon, and evening behavior", () => {
    expect(resolveTimeGreeting(new Date(2026, 8, 5, 8))).toBe("Good morning");
    expect(resolveTimeGreeting(new Date(2026, 8, 5, 14))).toBe("Good afternoon");
    expect(resolveTimeGreeting(new Date(2026, 8, 5, 20))).toBe("Good evening");
  });
});

