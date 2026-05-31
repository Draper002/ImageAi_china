import { Buffer } from "node:buffer";
import { describe, expect, test, vi } from "vitest";
import {
  BAILIAN_IMAGE_ENDPOINT,
  buildBailianRequest,
  createBailianClient,
  extractImageUrl,
  generateImage,
  sizeForAspectRatio
} from "./bailian-images";

describe("sizeForAspectRatio", () => {
  test.each([
    ["1:1", "1536*1536"],
    ["4:5", "1344*1680"],
    ["16:9", "1664*936"],
    ["9:16", "936*1664"],
    ["3:2", "1728*1152"],
    ["unknown", "1536*1536"]
  ])("maps %s to %s", (aspectRatio, expectedSize) => {
    expect(sizeForAspectRatio(aspectRatio)).toBe(expectedSize);
  });
});

describe("buildBailianRequest", () => {
  test("builds a text-only request with thinking mode", () => {
    expect(buildBailianRequest({
      model: "wan2.7-image-pro",
      prompt: "Generate a city night scene",
      aspectRatio: "16:9"
    })).toEqual({
      model: "wan2.7-image-pro",
      input: {
        messages: [{
          role: "user",
          content: [{ text: "Generate a city night scene" }]
        }]
      },
      parameters: {
        size: "1664*936",
        n: 1,
        watermark: false,
        thinking_mode: true
      }
    });
  });

  test("builds a reference-image request without thinking mode", () => {
    expect(buildBailianRequest({
      model: "wan2.7-image-pro",
      prompt: "Use this composition",
      aspectRatio: "4:5",
      referenceImageUrl: "https://example.test/reference.png"
    })).toEqual({
      model: "wan2.7-image-pro",
      input: {
        messages: [{
          role: "user",
          content: [
            { image: "https://example.test/reference.png" },
            { text: "Use this composition" }
          ]
        }]
      },
      parameters: {
        size: "1344*1680",
        n: 1,
        watermark: false
      }
    });
  });
});

describe("extractImageUrl", () => {
  test("extracts the first image URL from message content", () => {
    expect(extractImageUrl({
      output: {
        choices: [{
          message: {
            content: [
              { text: "done" },
              { image: "https://example.test/result.png" }
            ]
          }
        }]
      }
    })).toBe("https://example.test/result.png");
  });

  test("returns undefined when no image exists", () => {
    expect(extractImageUrl({
      output: {
        choices: [{
          message: {
            content: [{ text: "no image" }]
          }
        }]
      }
    })).toBeUndefined();
  });
});

describe("generateImage", () => {
  test("POSTs to Bailian, downloads the returned image, and returns bytes", async () => {
    const imageBytes = Buffer.from("image-bytes");
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: {
          choices: [{
            message: {
              content: [{ image: "https://example.test/result.png" }]
            }
          }]
        }
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      }))
      .mockResolvedValueOnce(new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" }
      }));

    const result = await generateImage({
      client: {
        apiKey: "test-key",
        baseUrl: "https://dashscope.example/api/v1",
        fetch
      },
      model: "wan2.7-image-pro",
      prompt: "Create an image",
      aspectRatio: "1:1"
    });

    expect(fetch).toHaveBeenNthCalledWith(1, `https://dashscope.example/api/v1${BAILIAN_IMAGE_ENDPOINT}`, {
      method: "POST",
      headers: {
        authorization: "Bearer test-key",
        "content-type": "application/json"
      },
      body: JSON.stringify(buildBailianRequest({
        model: "wan2.7-image-pro",
        prompt: "Create an image",
        aspectRatio: "1:1"
      }))
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "https://example.test/result.png");
    expect(result).toEqual(imageBytes);
  });

  test("normalizes trailing slash in the Bailian base URL", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: {
          choices: [{
            message: {
              content: [{ image: "https://example.test/result.png" }]
            }
          }]
        }
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      }))
      .mockResolvedValueOnce(new Response(Buffer.from("image-bytes"), {
        status: 200,
        headers: { "content-type": "image/png" }
      }));

    await generateImage({
      client: {
        ...createBailianClient("test-key", "https://dashscope.example/api/v1/"),
        fetch
      },
      model: "wan2.7-image-pro",
      prompt: "Create an image",
      aspectRatio: "1:1"
    });

    expect(fetch.mock.calls[0][0]).toBe(`https://dashscope.example/api/v1${BAILIAN_IMAGE_ENDPOINT}`);
  });

  test("throws when Bailian does not return an image URL", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: {
        choices: [{
          message: {
            content: [{ text: "no image" }]
          }
        }]
      }
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));

    await expect(generateImage({
      client: {
        apiKey: "test-key",
        baseUrl: "https://dashscope.example/api/v1",
        fetch
      },
      model: "wan2.7-image-pro",
      prompt: "Create an image",
      aspectRatio: "1:1"
    })).rejects.toThrow("Bailian did not return an image URL.");
  });

  test("throws safe status text for non-JSON HTTP failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("upstream unavailable token=secret", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "content-type": "text/plain" }
    }));

    await expect(generateImage({
      client: {
        apiKey: "test-key",
        baseUrl: "https://dashscope.example/api/v1",
        fetch
      },
      model: "wan2.7-image-pro",
      prompt: "Create an image",
      aspectRatio: "1:1"
    })).rejects.toThrow("Bailian request failed with status 503 Service Unavailable");
  });

  test("throws clean Bailian code and message for JSON failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "InvalidApiKey",
      message: "Invalid API-key provided."
    }), {
      status: 401,
      headers: { "content-type": "application/json" }
    }));

    await expect(generateImage({
      client: {
        apiKey: "test-key",
        baseUrl: "https://dashscope.example/api/v1",
        fetch
      },
      model: "wan2.7-image-pro",
      prompt: "Create an image",
      aspectRatio: "1:1"
    })).rejects.toThrow("Bailian request failed with status 401 code InvalidApiKey: Invalid API-key provided.");
  });
});
