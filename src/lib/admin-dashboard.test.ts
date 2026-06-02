import { describe, expect, test } from "vitest";
import { summarizeAdminUsers } from "./admin-dashboard";

describe("admin dashboard", () => {
  test("summarizes recharge, generation usage, rewards, and generation counts per user", () => {
    const users = summarizeAdminUsers({
      profiles: [
        { user_id: "user-1", email: "a@example.com", credit_balance: 12, created_at: "2026-06-01T00:00:00.000Z" },
        { user_id: "user-2", email: "b@example.com", credit_balance: 2, created_at: "2026-06-02T00:00:00.000Z" }
      ],
      ledgers: [
        { user_id: "user-1", amount: -3, reason: "generation_debit" },
        { user_id: "user-1", amount: 25, reason: "credit_purchase" },
        { user_id: "user-1", amount: 4, reason: "case_reward" },
        { user_id: "user-2", amount: 1, reason: "referral_signup_bonus" }
      ],
      payments: [
        { user_id: "user-1", amount_cents: 1990, credit_amount: 25, status: "paid" },
        { user_id: "user-1", amount_cents: 990, credit_amount: 10, status: "pending" }
      ],
      generations: [
        { user_id: "user-1", status: "succeeded" },
        { user_id: "user-1", status: "failed" },
        { user_id: "user-2", status: "succeeded" }
      ]
    });

    expect(users[0]).toMatchObject({
      userId: "user-1",
      email: "a@example.com",
      credits: 12,
      paidCents: 1990,
      purchasedCredits: 25,
      usedCredits: 3,
      rewardCredits: 4,
      generationCount: 2
    });
    expect(users[1]).toMatchObject({
      userId: "user-2",
      rewardCredits: 1,
      generationCount: 1
    });
  });
});
