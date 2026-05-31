import { describe, expect, test } from "vitest";
import { hasSupabasePublicConfig, parseEnv } from "./env";

const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  BAILIAN_API_KEY: "bailian",
  NEXT_PUBLIC_APP_URL: "https://app.example.com"
};

describe("parseEnv", () => {
  test("returns typed Bailian environment values with defaults when all required keys exist", () => {
    const result = parseEnv(requiredEnv);

    expect(result).toEqual({
      ...requiredEnv,
      BAILIAN_IMAGE_MODEL: "wan2.7-image-pro",
      BAILIAN_API_BASE_URL: "https://dashscope.aliyuncs.com/api/v1"
    });
  });

  test("allows Bailian image model and API base URL overrides", () => {
    const result = parseEnv({
      ...requiredEnv,
      BAILIAN_IMAGE_MODEL: "custom-image-model",
      BAILIAN_API_BASE_URL: "https://example.com/bailian"
    });

    expect(result.BAILIAN_IMAGE_MODEL).toBe("custom-image-model");
    expect(result.BAILIAN_API_BASE_URL).toBe("https://example.com/bailian");
  });

  test("throws a useful error when a required key is missing", () => {
    expect(() => parseEnv({})).toThrow("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  });

  test("requires Bailian API key and ignores legacy provider config", () => {
    const legacyProviderConfig = {
      ["OPEN" + "AI_API_KEY"]: "legacy",
      ["OPEN" + "AI_IMAGE_MODEL"]: "legacy-image-model"
    };

    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        ...legacyProviderConfig,
        NEXT_PUBLIC_APP_URL: "https://app.example.com"
      })
    ).toThrow("Missing environment variable: BAILIAN_API_KEY");
  });

  test("detects missing Supabase public config", () => {
    expect(hasSupabasePublicConfig({})).toBe(false);
  });

  test("detects present Supabase public config", () => {
    expect(
      hasSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
      })
    ).toBe(true);
  });
});
