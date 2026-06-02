import { describe, expect, test } from "vitest";
import { createAdminSessionToken, verifyAdminPassword } from "./admin-auth";

describe("admin auth", () => {
  test("accepts the configured admin password and rejects blank or wrong values", () => {
    expect(verifyAdminPassword("liang", "liang")).toBe(true);
    expect(verifyAdminPassword(" liang ", "liang")).toBe(true);
    expect(verifyAdminPassword("", "liang")).toBe(false);
    expect(verifyAdminPassword("wrong", "liang")).toBe(false);
  });

  test("creates a stable non-plain-text session token", () => {
    const token = createAdminSessionToken("liang");

    expect(token).toBe(createAdminSessionToken("liang"));
    expect(token).not.toBe("liang");
    expect(token.length).toBeGreaterThan(40);
  });
});
