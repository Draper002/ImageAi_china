export type GenerationFailurePayload = {
  code: string;
  error: string;
};

export function messageFromUnknownError(error: unknown) {
  return error instanceof Error ? error.message : "Generation failed";
}

export function generationFailurePayload(error: unknown): GenerationFailurePayload {
  const normalized = messageFromUnknownError(error).toLowerCase();

  if (
    normalized.includes("region") ||
    normalized.includes("endpoint")
  ) {
    return {
      code: "bailian_region_error",
      error: "百炼 API Key 与接入地域不匹配，请确认 endpoint 配置与账号地域一致。"
    };
  }

  if (
    normalized.includes("api-key") ||
    normalized.includes("api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return {
      code: "bailian_auth_error",
      error: "百炼 API Key 无效或未配置，请检查 BAILIAN_API_KEY。"
    };
  }

  if (
    normalized.includes("quota") ||
    normalized.includes("balance") ||
    normalized.includes("rate limit") ||
    normalized.includes("throttl")
  ) {
    return {
      code: "bailian_quota_error",
      error: "百炼账户余额、额度或限流不足，请到阿里云百炼控制台检查后重试。"
    };
  }

  if (
    normalized.includes("model") ||
    normalized.includes("permission") ||
    normalized.includes("does not exist")
  ) {
    return {
      code: "bailian_model_error",
      error: "百炼模型不可用或账号没有权限，请检查 BAILIAN_IMAGE_MODEL 和模型权限。"
    };
  }

  if (
    normalized.includes("image url") ||
    normalized.includes("reference image") ||
    normalized.includes("signed url") ||
    normalized.includes("not accessible")
  ) {
    return {
      code: "bailian_image_url_error",
      error: "百炼无法访问参考图链接，请确认参考图 signed URL 可被服务端访问。"
    };
  }

  if (
    normalized.includes("connection") ||
    normalized.includes("connect timeout") ||
    normalized.includes("timeout") ||
    normalized.includes("fetch failed")
  ) {
    return {
      code: "bailian_connection_error",
      error: "连接百炼失败，请检查网络、endpoint 或稍后重试。"
    };
  }

  return {
    code: "generation_failed",
    error: "生成失败，请检查百炼配置、模型权限或稍后重试。"
  };
}
