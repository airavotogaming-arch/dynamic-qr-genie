import { describe, expect, it } from "vitest";

import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/site-auth.server";

describe("admin session tokens", () => {
  const password = "local-test-admin-password-2026";
  const now = Date.UTC(2026, 9, 9, 4, 0, 0);

  it("accepts a correctly signed, unexpired token", () => {
    const token = createAdminSessionToken(password, now);
    expect(verifyAdminSessionToken(token, password, now + 1_000)).toBe(true);
  });

  it("rejects a token signed with a different password", () => {
    const token = createAdminSessionToken(password, now);
    expect(verifyAdminSessionToken(token, "another-admin-password", now + 1_000)).toBe(false);
  });

  it("rejects altered and expired tokens", () => {
    const token = createAdminSessionToken(password, now);
    const [payload, signature] = token.split(".");
    expect(verifyAdminSessionToken(`${payload}.${signature}x`, password, now + 1_000)).toBe(false);
    expect(verifyAdminSessionToken(token, password, now + 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
