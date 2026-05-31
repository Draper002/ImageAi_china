import { describe, expect, test } from "vitest";
import { generationFailurePayload } from "./generation-errors";

describe("generationFailurePayload", () => {
  test("maps invalid Bailian API key errors to a clear user-facing message", () => {
    expect(generationFailurePayload(new Error("Invalid API-key provided."))).toEqual({
      code: "bailian_auth_error",
      error: "百炼 API Key 无效或未配置，请检查 BAILIAN_API_KEY。"
    });
  });

  test("maps Bailian region and endpoint mismatch errors", () => {
    expect(generationFailurePayload(new Error("The API key and endpoint region do not match."))).toEqual({
      code: "bailian_region_error",
      error: "百炼 API Key 与接入地域不匹配，请确认 endpoint 配置与账号地域一致。"
    });
  });

  test("maps quota, balance, and rate limit errors", () => {
    for (const message of ["quota exceeded", "insufficient balance", "rate limit reached"]) {
      expect(generationFailurePayload(new Error(message))).toEqual({
        code: "bailian_quota_error",
        error: "百炼账户余额、额度或限流不足，请到阿里云百炼控制台检查后重试。"
      });
    }
  });

  test("maps model, permission, and missing model errors", () => {
    for (const message of ["model permission denied", "model does not exist"]) {
      expect(generationFailurePayload(new Error(message))).toEqual({
        code: "bailian_model_error",
        error: "百炼模型不可用或账号没有权限，请检查 BAILIAN_IMAGE_MODEL 和模型权限。"
      });
    }
  });

  test("maps image URL, reference image, signed URL, and access errors", () => {
    for (const message of ["image url is invalid", "reference image failed", "signed url expired", "not accessible"]) {
      expect(generationFailurePayload(new Error(message))).toEqual({
        code: "bailian_image_url_error",
        error: "百炼无法访问参考图链接，请确认参考图 signed URL 可被服务端访问。"
      });
    }
  });

  test("maps fetch, timeout, and connection errors", () => {
    for (const message of ["fetch failed", "request timeout", "connection reset"]) {
      expect(generationFailurePayload(new Error(message))).toEqual({
        code: "bailian_connection_error",
        error: "连接百炼失败，请检查网络、endpoint 或稍后重试。"
      });
    }
  });

  test("falls back to a Bailian-specific generic failure", () => {
    expect(generationFailurePayload(new Error("unexpected provider failure"))).toEqual({
      code: "generation_failed",
      error: "生成失败，请检查百炼配置、模型权限或稍后重试。"
    });
  });
});
