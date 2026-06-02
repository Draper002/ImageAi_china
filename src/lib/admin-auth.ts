import { createHash, timingSafeEqual } from "node:crypto";

export const adminSessionCookieName = "promptcanvas_admin";

export function createAdminSessionToken(password: string) {
  return createHash("sha256")
    .update(`promptcanvas-admin:${password}`)
    .digest("hex");
}

export function verifyAdminPassword(input: unknown, configuredPassword = process.env.ADMIN_PASSWORD) {
  const password = String(input ?? "").trim();
  const expected = String(configuredPassword ?? "").trim();
  if (!password || !expected) return false;

  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  if (passwordBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(passwordBuffer, expectedBuffer);
}

export function verifyAdminSessionToken(token: unknown, configuredPassword = process.env.ADMIN_PASSWORD) {
  const expected = String(configuredPassword ?? "").trim();
  const value = String(token ?? "");
  if (!expected || !value) return false;

  const expectedToken = createAdminSessionToken(expected);
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expectedToken);
  if (valueBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
