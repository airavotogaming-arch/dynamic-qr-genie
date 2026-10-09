import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  clearAdminSession,
  constantTimeTextEqual,
  establishAdminSession,
  getSiteAdminOtp,
  getSiteAdminPassword,
  getSiteAdminUsername,
} from "./site-auth.server";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();

function clientKey(): string {
  return getRequest().headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function remainingLockout(key: string, now = Date.now()): number {
  for (const [storedKey, value] of failedLogins) {
    if (value.lockedUntil > 0 && value.lockedUntil <= now) failedLogins.delete(storedKey);
  }
  const attempt = failedLogins.get(key);
  return attempt && attempt.lockedUntil > now ? attempt.lockedUntil - now : 0;
}

function recordFailure(key: string, now = Date.now()): boolean {
  const attempt = failedLogins.get(key) ?? { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.count = 0;
    attempt.lockedUntil = now + LOCKOUT_MS;
    failedLogins.set(key, attempt);
    return true;
  }
  failedLogins.set(key, attempt);
  return false;
}

export const loginAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().min(1).max(1024),
      password: z.string().min(1).max(1024),
      otp: z.string().min(1).max(1024),
    }),
  )
  .handler(async ({ data }) => {
    const username = getSiteAdminUsername();
    const password = getSiteAdminPassword();
    const otp = getSiteAdminOtp();
    if (!username || !password || !otp) {
      return {
        ok: false as const,
        error:
          "Admin login is not configured. Set SITE_ADMIN_USERNAME, SITE_ADMIN_PASSWORD, and SITE_ADMIN_OTP in Render.",
      };
    }
    const key = clientKey();
    if (remainingLockout(key) > 0) {
      return { ok: false as const, error: "Too many attempts. Try again in 15 minutes." };
    }
    if (
      !constantTimeTextEqual(data.username, username) ||
      !constantTimeTextEqual(data.password, password) ||
      !constantTimeTextEqual(data.otp, otp)
    ) {
      const locked = recordFailure(key);
      return {
        ok: false as const,
        error: locked
          ? "Too many attempts. Try again in 15 minutes."
          : "The admin username, password, or OTP is incorrect.",
      };
    }

    failedLogins.delete(key);
    establishAdminSession();
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  clearAdminSession();
  return { ok: true as const };
});
