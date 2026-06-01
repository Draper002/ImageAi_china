import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

const { signUp } = await import("./actions");

describe("signUp", () => {
  test("creates and confirms users on the server before signing them in", async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "user_1" } }, error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    const publicSignUp = vi.fn().mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });

    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { createUser } }
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { signInWithPassword, signUp: publicSignUp }
    });

    const formData = new FormData();
    formData.set("email", "  tester@example.com  ");
    formData.set("password", "secret123");

    await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/create");

    expect(createUser).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "secret123",
      email_confirm: true
    });
    expect(publicSignUp).not.toHaveBeenCalled();
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "secret123"
    });
  });

  test("normalizes and stores the invitation code in app metadata during signup", async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "user_1" } }, error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });

    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { createUser } }
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { signInWithPassword }
    });

    const formData = new FormData();
    formData.set("email", "tester@example.com");
    formData.set("password", "secret123");
    formData.set("inviteCode", " inv-8k4m2q ");

    await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/create");

    expect(createUser).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "secret123",
      email_confirm: true,
      app_metadata: {
        invite_code: "INV-8K4M2Q"
      }
    });
  });
});
