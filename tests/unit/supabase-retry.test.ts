import { describe, expect, it, vi } from "vitest";
import { isJwtIssuedAtFuture, retryJwtIssuedAtFuture } from "@/features/finance/repository";

describe("Supabase finance-load retry", () => {
  it("retries once when PostgREST briefly rejects a newly issued JWT", async () => {
    type Result = { error: { code: string; message: string } | null; data: string[] | null };
    const operation = vi.fn<() => Promise<Result>>()
      .mockResolvedValueOnce({ error: { code: "PGRST303", message: "JWT issued at future" }, data: null })
      .mockResolvedValueOnce({ error: null, data: ["loaded"] });
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await retryJwtIssuedAtFuture(operation, (value) => value.error, wait);

    expect(result.data).toEqual(["loaded"]);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });

  it("does not retry permission, RLS, authentication, or connection failures", async () => {
    const failure = { error: { code: "42501", message: "permission denied" }, data: null };
    const operation = vi.fn<() => Promise<typeof failure>>().mockResolvedValue(failure);
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await retryJwtIssuedAtFuture(operation, (value) => value.error, wait);

    expect(result).toBe(failure);
    expect(operation).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
    expect(isJwtIssuedAtFuture({ code: "PGRST303", message: "JWT expired" })).toBe(false);
  });
});
