import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getRequest, setCookie } from "@tanstack/react-start/server";

export const ADMIN_SESSION_COOKIE = "airavoto_qraf_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

export function getSiteAdminPassword(): string | undefined {
  return process.env["SITE_ADMIN_PASSWORD"];
}

export function getSiteAdminUsername(): string | undefined {
  return process.env["SITE_ADMIN_USERNAME"];
}

export function getSiteAdminOtp(): string | undefined {
  return process.env["SITE_ADMIN_OTP"];
}

function getAdminSessionKey(): Buffer | undefined {
  const username = getSiteAdminUsername();
  const password = getSiteAdminPassword();
  const otp = getSiteAdminOtp();
  if (
    !username ||
    !password ||
    password.length < MIN_ADMIN_PASSWORD_LENGTH ||
    !otp ||
    !/^\d{6}$/.test(otp)
  ) {
    return undefined;
  }
  return createHash("sha256").update(`${username}\0${password}\0${otp}`).digest();
}

export function constantTimeTextEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function sign(payload: string, secret: string | Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(password: string | Buffer, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor((now + SESSION_MAX_AGE_MS) / 1000) }),
  ).toString("base64url");
  return `${payload}.${sign(payload, password)}`;
}

export function verifyAdminSessionToken(
  token: string,
  secret: string | Buffer,
  now = Date.now(),
): boolean {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;
  if (!constantTimeTextEqual(signature, sign(payload, secret))) return false;

  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value || typeof value !== "object" || !("exp" in value)) return false;
    const expiresAt = (value as { exp?: unknown }).exp;
    return (
      typeof expiresAt === "number" && Number.isSafeInteger(expiresAt) && expiresAt > now / 1000
    );
  } catch {
    return false;
  }
}

function getCookieValue(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  for (const item of (request.headers.get("cookie") ?? "").split(";")) {
    const cookie = item.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }
  return undefined;
}

export function isAdminSession(request: Request): boolean {
  const secret = getAdminSessionKey();
  if (!secret) return false;
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE);
  return token ? verifyAdminSessionToken(token, secret) : false;
}

function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return new URL(request.url).protocol === "https:" || forwarded === "https";
}

export function establishAdminSession(): void {
  const secret = getAdminSessionKey();
  if (!secret)
    throw new Error(
      "Configure SITE_ADMIN_USERNAME, SITE_ADMIN_PASSWORD, and SITE_ADMIN_OTP in Render.",
    );
  const request = getRequest();
  setCookie(ADMIN_SESSION_COOKIE, createAdminSessionToken(secret), {
    httpOnly: true,
    secure: requestIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSession(): void {
  const request = getRequest();
  setCookie(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: requestIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
