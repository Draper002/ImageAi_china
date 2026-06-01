import { describe, expect, test } from "vitest";
import {
  buildInvitationUrl,
  calculateReferralPaymentReward,
  generateInvitationCode,
  maskInviteeIdentifier,
  normalizeInviteCode,
  resolveInvitationCode
} from "./invitations";

describe("invitation helpers", () => {
  test("normalizes invitation codes for storage and lookup", () => {
    expect(normalizeInviteCode(" inv-8k4m2q ")).toBe("INV-8K4M2Q");
    expect(normalizeInviteCode("")).toBe("");
  });

  test("builds invite links with encoded invitation codes", () => {
    expect(buildInvitationUrl("https://image.zylgzx.cn/", "INV-8K4M2Q")).toBe(
      "https://image.zylgzx.cn/login?mode=signup&invite=INV-8K4M2Q"
    );
  });

  test("derives a stable invitation code when old profiles do not have one yet", () => {
    const userId = "12345678-90ab-cdef-1234-567890abcdef";

    expect(generateInvitationCode(userId)).toBe("INV-12345678");
    expect(resolveInvitationCode(null, userId)).toBe("INV-12345678");
    expect(resolveInvitationCode(" inv-custom ", userId)).toBe("INV-CUSTOM");
  });

  test("calculates inviter payment rewards by rounding up 30 percent of credits", () => {
    expect(calculateReferralPaymentReward(10)).toBe(3);
    expect(calculateReferralPaymentReward(25)).toBe(8);
    expect(calculateReferralPaymentReward(70)).toBe(21);
  });

  test("masks invited user identifiers", () => {
    expect(maskInviteeIdentifier("crazydraper@gmail.com")).toBe("cr***@g***.com");
    expect(maskInviteeIdentifier("ab@example.com")).toBe("ab***@e***.com");
  });
});
