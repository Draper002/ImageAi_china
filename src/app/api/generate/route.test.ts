import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  getEnv: vi.fn(),
  reserveGenerationCredit: vi.fn(),
  refundGenerationCredit: vi.fn(),
  buildStoragePath: vi.fn(),
  uploadPrivateFile: vi.fn(),
  createBailianClient: vi.fn(),
  generateImage: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv
}));

vi.mock("@/lib/credits", () => ({
  reserveGenerationCredit: mocks.reserveGenerationCredit,
  refundGenerationCredit: mocks.refundGenerationCredit
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    buildStoragePath: mocks.buildStoragePath,
    uploadPrivateFile: mocks.uploadPrivateFile
  };
});

vi.mock("@/lib/bailian-images", () => ({
  createBailianClient: mocks.createBailianClient,
  generateImage: mocks.generateImage
}));

function createAdminClient() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  const createSignedUrl = vi.fn((path: string) => Promise.resolve({
    data: { signedUrl: `https://storage.example.com/${currentBucket}/${path}` },
    error: null
  }));
  let currentBucket = "";
  const from = vi.fn(() => ({ insert, update }));
  const storageFrom = vi.fn((bucket: string) => {
    currentBucket = bucket;
    return { createSignedUrl };
  });

  return {
    client: {
      from,
      storage: { from: storageFrom }
    },
    from,
    insert,
    update,
    eq,
    storageFrom,
    createSignedUrl
  };
}

function createRequest(form: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(form)
  } as unknown as Request;
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("generation-1");

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } }
        })
      }
    });

    mocks.getEnv.mockReturnValue({
      BAILIAN_API_KEY: "bailian-key",
      BAILIAN_IMAGE_MODEL: "wan2.7-image-pro",
      BAILIAN_API_BASE_URL: "https://dashscope.aliyuncs.com/api/v1",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });

    mocks.reserveGenerationCredit.mockResolvedValue(true);
    mocks.uploadPrivateFile.mockResolvedValue(undefined);
    mocks.createBailianClient.mockReturnValue({ provider: "bailian-client" });
    mocks.generateImage.mockResolvedValue(Buffer.from("generated-png"));
    mocks.buildStoragePath.mockImplementation((_userId: string, generationId: string, filename: string) =>
      `user-1/${generationId}/${filename}`
    );
  });

  test("returns 400 when subject is missing", async () => {
    const admin = createAdminClient();
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const response = await POST(createRequest(new FormData()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Subject is required" });
  });

  test("uploads reference image, signs it, sends Bailian request, and stores generated PNG", async () => {
    const admin = createAdminClient();
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);
    const form = new FormData();
    form.set("subject", "一杯冰美式");
    form.set("aspectRatio", "1:1");
    form.set("referenceImage", new File([Buffer.from("reference")], "ref.png", { type: "image/png" }));

    const response = await POST(createRequest(form));

    expect(response.status).toBe(200);
    expect(mocks.buildStoragePath).toHaveBeenCalledWith("user-1", "generation-1", "ref.png");
    expect(mocks.uploadPrivateFile).toHaveBeenCalledWith(
      admin.client,
      "reference-images",
      "user-1/generation-1/ref.png",
      expect.any(File),
      "image/png"
    );
    expect(admin.storageFrom).toHaveBeenCalledWith("reference-images");
    expect(admin.createSignedUrl).toHaveBeenCalledWith("user-1/generation-1/ref.png", 60 * 10);
    expect(mocks.createBailianClient).toHaveBeenCalledWith(
      "bailian-key",
      "https://dashscope.aliyuncs.com/api/v1"
    );
    expect(mocks.generateImage).toHaveBeenCalledWith({
      client: { provider: "bailian-client" },
      model: "wan2.7-image-pro",
      prompt: expect.stringContaining("一杯冰美式"),
      aspectRatio: "1:1",
      referenceImageUrl: "https://storage.example.com/reference-images/user-1/generation-1/ref.png"
    });
    expect(mocks.uploadPrivateFile).toHaveBeenCalledWith(
      admin.client,
      "generated-images",
      "user-1/generation-1/generated.png",
      expect.any(Blob),
      "image/png"
    );
  });

  test("sanitizes generation record insert failures", async () => {
    const admin = createAdminClient();
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);
    admin.insert.mockResolvedValue({
      error: {
        message: "duplicate key value violates unique constraint generations_secret_idx"
      }
    });
    const form = new FormData();
    form.set("subject", "iced coffee");

    const response = await POST(createRequest(form));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to start generation. Please try again later."
    });
    expect(mocks.reserveGenerationCredit).not.toHaveBeenCalled();
  });

  test("refunds credit when Bailian generation fails", async () => {
    const admin = createAdminClient();
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);
    mocks.generateImage.mockRejectedValue(new Error("Bailian failed"));
    const form = new FormData();
    form.set("subject", "一杯冰美式");

    const response = await POST(createRequest(form));

    expect(response.status).toBe(500);
    expect(mocks.refundGenerationCredit).toHaveBeenCalledWith(admin.client, "user-1", "generation-1");
  });

  test("stores sanitized Bailian failure instead of raw signed URL provider details", async () => {
    const admin = createAdminClient();
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);
    mocks.generateImage.mockRejectedValue(new Error(
      "reference image signed url is not accessible: https://storage.example.com/ref.png?token=secret-token"
    ));
    const form = new FormData();
    form.set("subject", "iced coffee");

    const response = await POST(createRequest(form));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "bailian_image_url_error",
      error: "百炼无法访问参考图链接，请确认参考图 signed URL 可被服务端访问。"
    });
    expect(admin.update).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "failed",
      error_message: "百炼无法访问参考图链接，请确认参考图 signed URL 可被服务端访问。"
    }));
    expect(admin.update).not.toHaveBeenCalledWith(expect.objectContaining({
      error_message: expect.stringContaining("secret-token")
    }));
  });
});
