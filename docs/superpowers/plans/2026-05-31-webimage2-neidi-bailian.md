# WebImage2.0 Neidi Bailian Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `WebImage2.0_neidi` as a copy of the existing WebImage MVP with the image provider changed from OpenAI to Alibaba Cloud Bailian Wan2.7.

**Architecture:** Keep the existing Next.js App Router, Supabase Auth/Postgres/Storage, credits, history, and UI flows. Replace only the image provider adapter and the directly related route wiring, environment variables, copy, tests, and docs.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase, Alibaba Cloud Model Studio Bailian HTTP API, Windows PowerShell commands.

---

## Project Root

Use this as the project root for all paths and commands after Task 1:

```text
C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage2.0_neidi
```

The source project is:

```text
C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage
```

Use the portable Git binary already available in the source project when Git is needed:

```text
C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe
```

## File Structure

- Create/modify `package.json` and `package-lock.json`: remove OpenAI SDK dependencies after copying the app.
- Modify `.env.example` and `docs/env.example`: replace OpenAI variables with Bailian variables.
- Modify `src/lib/env.ts` and `src/lib/env.test.ts`: parse Bailian configuration with defaults.
- Create `src/lib/bailian-images.ts` and `src/lib/bailian-images.test.ts`: provider adapter, request builder, response parser, and image downloader.
- Delete `src/lib/openai-images.ts` and `src/lib/openai-images.test.ts`: old provider adapter.
- Modify `src/app/api/generate/route.ts` and `src/app/api/generate/route.test.ts`: use Bailian adapter and signed reference image URL.
- Modify `src/lib/generation-errors.ts` and `src/lib/generation-errors.test.ts`: Bailian-specific user-facing errors.
- Modify user-facing copy in `src/app/page.tsx`, `src/app/page.test.tsx`, `src/components/create-form.tsx`, `src/app/login/page.tsx`, and any other `src` files found by `rg "OpenAI|GPT Image|GPTImage|gpt-image" src`.
- Keep the existing database migrations, Supabase helpers, credit helpers, auth helpers, pages, and UI components unless a test proves a direct provider migration need.

---

### Task 1: Copy The Existing App Into The New Folder

**Files:**
- Create/modify: `package.json`, `package-lock.json`, `.env.example`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/**`, `scripts/**`, `supabase/**`, `docs/env.example`, `docs/local-preview.md`, `README.md`, `.gitignore`
- Preserve: `docs/superpowers/specs/2026-05-31-webimage-neidi-bailian-design.md`
- Preserve: `docs/superpowers/specs/2026-05-31-webimage-neidi-bailian-design.zh.md`
- Preserve: `docs/superpowers/plans/2026-05-31-webimage2-neidi-bailian.md`

- [ ] **Step 1: Copy non-local app files**

Run from `C:\Users\Admin\Desktop\Codex Folder\Superpowers`:

```powershell
$src = Resolve-Path ".\WebImage"
$dst = Resolve-Path ".\WebImage2.0_neidi"
$excludedDirs = @(
  "$src\.git",
  "$src\.next",
  "$src\.next-dev",
  "$src\.npm-cache",
  "$src\node_modules",
  "$src\logs",
  "$src\tools",
  "$src\docs\superpowers"
)
$excludedFiles = @(
  ".env.local",
  "tmp-*.png",
  "tsconfig.tsbuildinfo"
)
robocopy $src $dst /E /XD $excludedDirs /XF $excludedFiles
if ($LASTEXITCODE -le 7) { exit 0 }
exit $LASTEXITCODE
```

Expected: `robocopy` exits as success. The target folder has `package.json`, `src`, `scripts`, and `supabase`; it does not contain `.env.local`, `node_modules`, `.next`, `tools`, or copied old `docs/superpowers`.

- [ ] **Step 2: Verify no excluded files were copied**

Run:

```powershell
Set-Location "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage2.0_neidi"
@(
  ".env.local",
  "node_modules",
  ".next",
  ".next-dev",
  ".npm-cache",
  "logs",
  "tools",
  "tmp-home.png",
  "tsconfig.tsbuildinfo"
) | ForEach-Object {
  if (Test-Path $_) { throw "Excluded path exists: $_" }
}
if (-not (Test-Path ".\package.json")) { throw "package.json was not copied" }
if (-not (Test-Path ".\src\app\api\generate\route.ts")) { throw "generate route was not copied" }
```

Expected: command finishes with no output.

- [ ] **Step 3: Confirm specs and plan are still present**

Run:

```powershell
Set-Location "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage2.0_neidi"
if (-not (Test-Path ".\docs\superpowers\specs\2026-05-31-webimage-neidi-bailian-design.zh.md")) { throw "Chinese spec missing" }
if (-not (Test-Path ".\docs\superpowers\plans\2026-05-31-webimage2-neidi-bailian.md")) { throw "Implementation plan missing" }
```

Expected: command finishes with no output.

- [ ] **Step 4: Commit the copied baseline**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add .
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "chore: copy WebImage app baseline"
```

Expected: commit succeeds and includes the copied application files.

- [ ] **Step 5: Install dependencies from the copied lockfile**

Run:

```powershell
npm.cmd ci
```

Expected: dependencies install into `node_modules` without modifying `package-lock.json`. `node_modules` remains untracked because `.gitignore` excludes it.

---

### Task 2: Migrate Environment Configuration And Dependencies

**Files:**
- Modify: `src/lib/env.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`
- Modify: `docs/env.example`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write failing environment tests**

Replace `src/lib/env.test.ts` with:

```typescript
import { describe, expect, test } from "vitest";
import { hasSupabasePublicConfig, parseEnv } from "./env";

describe("parseEnv", () => {
  test("returns Bailian environment values and defaults optional provider config", () => {
    const result = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      BAILIAN_API_KEY: "bailian-key",
      NEXT_PUBLIC_APP_URL: "https://app.example.com"
    });

    expect(result.BAILIAN_API_KEY).toBe("bailian-key");
    expect(result.BAILIAN_IMAGE_MODEL).toBe("wan2.7-image-pro");
    expect(result.BAILIAN_API_BASE_URL).toBe("https://dashscope.aliyuncs.com/api/v1");
    expect(result.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  test("allows the Bailian model and base URL to be overridden", () => {
    const result = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      BAILIAN_API_KEY: "bailian-key",
      BAILIAN_IMAGE_MODEL: "wan2.7-image",
      BAILIAN_API_BASE_URL: "https://dashscope-intl.aliyuncs.com/api/v1",
      NEXT_PUBLIC_APP_URL: "https://app.example.com"
    });

    expect(result.BAILIAN_IMAGE_MODEL).toBe("wan2.7-image");
    expect(result.BAILIAN_API_BASE_URL).toBe("https://dashscope-intl.aliyuncs.com/api/v1");
  });

  test("throws a useful error when a required key is missing", () => {
    expect(() => parseEnv({})).toThrow("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  });

  test("requires Bailian API key instead of OpenAI API key", () => {
    expect(() => parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      OPENAI_API_KEY: "openai",
      OPENAI_IMAGE_MODEL: "gpt-image-2",
      NEXT_PUBLIC_APP_URL: "https://app.example.com"
    })).toThrow("Missing environment variable: BAILIAN_API_KEY");
  });

  test("detects missing Supabase public config", () => {
    expect(hasSupabasePublicConfig({})).toBe(false);
  });

  test("detects present Supabase public config", () => {
    expect(hasSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the environment tests and verify red**

Run:

```powershell
npm.cmd test -- src/lib/env.test.ts
```

Expected: FAIL because `parseEnv` still requires `OPENAI_API_KEY` and `OPENAI_IMAGE_MODEL`.

- [ ] **Step 3: Implement Bailian environment parsing**

Replace `src/lib/env.ts` with:

```typescript
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BAILIAN_API_KEY",
  "NEXT_PUBLIC_APP_URL"
] as const;

const defaultProviderValues = {
  BAILIAN_IMAGE_MODEL: "wan2.7-image-pro",
  BAILIAN_API_BASE_URL: "https://dashscope.aliyuncs.com/api/v1"
} as const;

export type AppEnv = Record<(typeof requiredKeys)[number], string> & {
  BAILIAN_IMAGE_MODEL: string;
  BAILIAN_API_BASE_URL: string;
};

const supabasePublicKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function hasSupabasePublicConfig(
  source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
) {
  return supabasePublicKeys.every((key) => Boolean(source[key]));
}

export function parseEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): AppEnv {
  const values = {} as Record<(typeof requiredKeys)[number], string>;

  for (const key of requiredKeys) {
    const value = source[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    values[key] = value;
  }

  return {
    ...values,
    BAILIAN_IMAGE_MODEL: source.BAILIAN_IMAGE_MODEL || defaultProviderValues.BAILIAN_IMAGE_MODEL,
    BAILIAN_API_BASE_URL: source.BAILIAN_API_BASE_URL || defaultProviderValues.BAILIAN_API_BASE_URL
  };
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}
```

- [ ] **Step 4: Update environment examples**

Replace provider lines in `.env.example` and `docs/env.example` so each file contains these keys:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BAILIAN_API_KEY=your-bailian-api-key
BAILIAN_IMAGE_MODEL=wan2.7-image-pro
BAILIAN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Remove OpenAI-specific packages**

Run:

```powershell
npm.cmd uninstall openai https-proxy-agent
```

Expected: `package.json` and `package-lock.json` no longer contain `openai` or `https-proxy-agent`.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm.cmd test -- src/lib/env.test.ts
rg -n "OPENAI_API_KEY|OPENAI_IMAGE_MODEL|OPENAI_PROXY_URL|openai|https-proxy-agent" package.json package-lock.json .env.example docs/env.example
```

Expected: env tests PASS. `rg` returns no matches for the searched OpenAI/package strings in those files.

- [ ] **Step 7: Commit**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add src/lib/env.ts src/lib/env.test.ts .env.example docs/env.example package.json package-lock.json
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "chore: migrate environment to Bailian"
```

---

### Task 3: Add The Bailian Image Provider Adapter

**Files:**
- Create: `src/lib/bailian-images.test.ts`
- Create: `src/lib/bailian-images.ts`
- Delete: `src/lib/openai-images.test.ts`
- Delete: `src/lib/openai-images.ts`

- [ ] **Step 1: Write failing provider tests**

Create `src/lib/bailian-images.test.ts`:

```typescript
import { describe, expect, test, vi } from "vitest";
import {
  buildBailianRequest,
  extractImageUrl,
  generateImage,
  sizeForAspectRatio,
  type BailianClient
} from "./bailian-images";

function createClient(fetchMock: ReturnType<typeof vi.fn>): BailianClient {
  return {
    apiKey: "bailian-key",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    fetch: fetchMock as unknown as typeof fetch
  };
}

describe("sizeForAspectRatio", () => {
  test("maps supported aspect ratios to explicit Bailian sizes", () => {
    expect(sizeForAspectRatio("1:1")).toBe("1536*1536");
    expect(sizeForAspectRatio("4:5")).toBe("1344*1680");
    expect(sizeForAspectRatio("16:9")).toBe("1664*936");
    expect(sizeForAspectRatio("9:16")).toBe("936*1664");
    expect(sizeForAspectRatio("3:2")).toBe("1728*1152");
    expect(sizeForAspectRatio("unknown")).toBe("1536*1536");
  });
});

describe("buildBailianRequest", () => {
  test("builds a text-only request with one image and thinking mode enabled", () => {
    const request = buildBailianRequest({
      model: "wan2.7-image-pro",
      prompt: "生成一张咖啡产品图",
      aspectRatio: "16:9"
    });

    expect(request.parameters).toEqual({
      size: "1664*936",
      n: 1,
      watermark: false,
      thinking_mode: true
    });
    expect(request.input.messages[0].content).toEqual([
      { text: "生成一张咖啡产品图" }
    ]);
  });

  test("builds a reference-image request without thinking mode", () => {
    const request = buildBailianRequest({
      model: "wan2.7-image-pro",
      prompt: "沿用参考图构图生成海报",
      aspectRatio: "4:5",
      referenceImageUrl: "https://storage.example.com/reference.png"
    });

    expect(request.parameters).toEqual({
      size: "1344*1680",
      n: 1,
      watermark: false
    });
    expect(request.input.messages[0].content).toEqual([
      { image: "https://storage.example.com/reference.png" },
      { text: "沿用参考图构图生成海报" }
    ]);
  });
});

describe("extractImageUrl", () => {
  test("extracts the first generated image URL", () => {
    expect(extractImageUrl({
      output: {
        choices: [
          {
            message: {
              content: [
                { text: "done" },
                { image: "https://cdn.example.com/generated.png" }
              ]
            }
          }
        ]
      }
    })).toBe("https://cdn.example.com/generated.png");
  });

  test("returns undefined when Bailian response has no image", () => {
    expect(extractImageUrl({ output: { choices: [] } })).toBeUndefined();
  });
});

describe("generateImage", () => {
  test("posts to Bailian and downloads returned image bytes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/services/aigc/multimodal-generation/generation")) {
        return new Response(JSON.stringify({
          output: {
            choices: [
              { message: { content: [{ image: "https://cdn.example.com/generated.png" }] } }
            ]
          }
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });

    const bytes = await generateImage({
      client: createClient(fetchMock),
      model: "wan2.7-image-pro",
      prompt: "生成一张咖啡产品图",
      aspectRatio: "1:1"
    });

    expect(bytes).toEqual(Buffer.from([137, 80, 78, 71]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer bailian-key",
        "Content-Type": "application/json"
      }
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).parameters.n).toBe(1);
  });

  test("throws when Bailian returns no image URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      output: { choices: [{ message: { content: [{ text: "no image" }] } }] }
    }), { status: 200 }));

    await expect(generateImage({
      client: createClient(fetchMock),
      model: "wan2.7-image-pro",
      prompt: "生成一张咖啡产品图",
      aspectRatio: "1:1"
    })).rejects.toThrow("Bailian did not return an image URL.");
  });
});
```

- [ ] **Step 2: Run provider tests and verify red**

Run:

```powershell
npm.cmd test -- src/lib/bailian-images.test.ts
```

Expected: FAIL because `src/lib/bailian-images.ts` does not exist.

- [ ] **Step 3: Implement the Bailian provider adapter**

Create `src/lib/bailian-images.ts`:

```typescript
export const DEFAULT_BAILIAN_API_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const BAILIAN_IMAGE_ENDPOINT = "/services/aigc/multimodal-generation/generation";

type BailianContentItem = { text: string } | { image: string };

export type BailianRequest = {
  model: string;
  input: {
    messages: Array<{
      role: "user";
      content: BailianContentItem[];
    }>;
  };
  parameters: {
    size: string;
    n: 1;
    watermark: false;
    thinking_mode?: true;
  };
};

type BailianResponse = {
  code?: string;
  message?: string;
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{ text?: string; image?: string }>;
      };
    }>;
  };
};

export type BailianClient = {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
};

type GenerateImageArgs = {
  client: BailianClient;
  model: string;
  prompt: string;
  aspectRatio: string;
  referenceImageUrl?: string;
};

export function sizeForAspectRatio(aspectRatio: string): string {
  const sizes: Record<string, string> = {
    "1:1": "1536*1536",
    "4:5": "1344*1680",
    "16:9": "1664*936",
    "9:16": "936*1664",
    "3:2": "1728*1152"
  };

  return sizes[aspectRatio] ?? sizes["1:1"];
}

export function buildBailianRequest(args: {
  model: string;
  prompt: string;
  aspectRatio: string;
  referenceImageUrl?: string;
}): BailianRequest {
  const content: BailianContentItem[] = args.referenceImageUrl
    ? [{ image: args.referenceImageUrl }, { text: args.prompt }]
    : [{ text: args.prompt }];

  return {
    model: args.model,
    input: {
      messages: [
        {
          role: "user",
          content
        }
      ]
    },
    parameters: {
      size: sizeForAspectRatio(args.aspectRatio),
      n: 1,
      watermark: false,
      ...(args.referenceImageUrl ? {} : { thinking_mode: true as const })
    }
  };
}

export function extractImageUrl(payload: unknown): string | undefined {
  const response = payload as BailianResponse;
  for (const choice of response.output?.choices ?? []) {
    for (const item of choice.message?.content ?? []) {
      if (item.image) return item.image;
    }
  }
  return undefined;
}

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}${BAILIAN_IMAGE_ENDPOINT}`;
}

async function readJsonResponse(response: Response): Promise<BailianResponse> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) as BailianResponse : {};
  } catch {
    throw new Error(`Bailian returned invalid JSON: ${text.slice(0, 120)}`);
  }
}

export async function generateImage(args: GenerateImageArgs): Promise<Buffer> {
  const response = await args.client.fetch(endpointFor(args.client.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.client.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildBailianRequest({
      model: args.model,
      prompt: args.prompt,
      aspectRatio: args.aspectRatio,
      referenceImageUrl: args.referenceImageUrl
    }))
  });

  const payload = await readJsonResponse(response);
  if (!response.ok || payload.code) {
    throw new Error(payload.message || `Bailian request failed with status ${response.status}`);
  }

  const imageUrl = extractImageUrl(payload);
  if (!imageUrl) {
    throw new Error("Bailian did not return an image URL.");
  }

  const imageResponse = await args.client.fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download Bailian image: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Bailian result URL did not return image content.");
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

export function createBailianClient(apiKey: string, baseUrl = DEFAULT_BAILIAN_API_BASE_URL): BailianClient {
  return {
    apiKey,
    baseUrl,
    fetch
  };
}
```

- [ ] **Step 4: Delete the old provider files**

Run:

```powershell
Remove-Item -LiteralPath ".\src\lib\openai-images.ts"
Remove-Item -LiteralPath ".\src\lib\openai-images.test.ts"
```

Expected: both OpenAI provider files are gone.

- [ ] **Step 5: Verify green**

Run:

```powershell
npm.cmd test -- src/lib/bailian-images.test.ts
npx.cmd tsc --noEmit
```

Expected: provider tests PASS. TypeScript may still fail because `/api/generate` imports the deleted OpenAI adapter; that is expected until Task 4. Provider test must pass.

- [ ] **Step 6: Commit**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add src/lib/bailian-images.ts src/lib/bailian-images.test.ts src/lib/openai-images.ts src/lib/openai-images.test.ts
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "feat: add Bailian image provider"
```

---

### Task 4: Wire `/api/generate` To Bailian And Signed Reference URLs

**Files:**
- Modify: `src/app/api/generate/route.test.ts`
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Write failing route tests**

Replace `src/app/api/generate/route.test.ts` with:

```typescript
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { createBailianClient, generateImage } from "@/lib/bailian-images";
import { uploadPrivateFile } from "@/lib/storage";

const mocks = vi.hoisted(() => {
  const admin = {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  };

  return {
    admin,
    reserveGenerationCredit: vi.fn(),
    refundGenerationCredit: vi.fn(),
    uploadPrivateFile: vi.fn(),
    buildStoragePath: vi.fn(),
    createBailianClient: vi.fn(),
    generateImage: vi.fn()
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } })
    }
  })
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => mocks.admin
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    BAILIAN_API_KEY: "bailian-key",
    BAILIAN_IMAGE_MODEL: "wan2.7-image-pro",
    BAILIAN_API_BASE_URL: "https://dashscope.aliyuncs.com/api/v1",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000"
  })
}));

vi.mock("@/lib/credits", () => ({
  reserveGenerationCredit: mocks.reserveGenerationCredit,
  refundGenerationCredit: mocks.refundGenerationCredit
}));

vi.mock("@/lib/storage", () => ({
  buildStoragePath: mocks.buildStoragePath,
  uploadPrivateFile: mocks.uploadPrivateFile
}));

vi.mock("@/lib/bailian-images", () => ({
  createBailianClient: mocks.createBailianClient,
  generateImage: mocks.generateImage
}));

function setupAdmin() {
  const eq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq }));
  const insert = vi.fn(async () => ({ error: null }));
  mocks.admin.from.mockReturnValue({ insert, update });
  mocks.admin.storage.from.mockImplementation((bucket: string) => ({
    createSignedUrl: vi.fn(async (path: string) => ({
      data: { signedUrl: `https://storage.example.com/${bucket}/${path}` },
      error: null
    }))
  }));
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdmin();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("generation-1" as `${string}-${string}-${string}-${string}-${string}`);
    mocks.reserveGenerationCredit.mockResolvedValue(true);
    mocks.buildStoragePath.mockImplementation((_userId: string, generationId: string, fileName: string) => `user-1/${generationId}/${fileName}`);
    mocks.createBailianClient.mockReturnValue({ apiKey: "bailian-key", baseUrl: "https://dashscope.aliyuncs.com/api/v1", fetch });
    mocks.generateImage.mockResolvedValue(Buffer.from([137, 80, 78, 71]));
    mocks.uploadPrivateFile.mockResolvedValue(undefined);
  });

  test("requires subject", async () => {
    const form = new FormData();
    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Subject is required" });
  });

  test("sends a signed reference image URL to Bailian and stores generated bytes", async () => {
    const form = new FormData();
    form.set("subject", "一杯冰美式");
    form.set("referenceImage", new File(["ref"], "ref.png", { type: "image/png" }));

    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: form }));

    expect(response.status).toBe(200);
    expect(createBailianClient).toHaveBeenCalledWith("bailian-key", "https://dashscope.aliyuncs.com/api/v1");
    expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
      model: "wan2.7-image-pro",
      prompt: expect.stringContaining("一杯冰美式"),
      aspectRatio: "1:1",
      referenceImageUrl: "https://storage.example.com/reference-images/user-1/generation-1/ref.png"
    }));
    expect(uploadPrivateFile).toHaveBeenCalledWith(
      mocks.admin,
      "generated-images",
      "user-1/generation-1/generated.png",
      expect.any(Blob),
      "image/png"
    );
  });

  test("refunds the reserved credit when Bailian generation fails", async () => {
    mocks.generateImage.mockRejectedValue(new Error("Bailian quota exceeded"));
    const form = new FormData();
    form.set("subject", "一杯冰美式");

    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: form }));

    expect(response.status).toBe(500);
    expect(mocks.refundGenerationCredit).toHaveBeenCalledWith(mocks.admin, "user-1", "generation-1");
  });
});
```

- [ ] **Step 2: Run route tests and verify red**

Run:

```powershell
npm.cmd test -- src/app/api/generate/route.test.ts
```

Expected: FAIL because the route still imports `openai-images` and does not create a signed reference URL for Bailian.

- [ ] **Step 3: Implement route wiring**

Replace `src/app/api/generate/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { reserveGenerationCredit, refundGenerationCredit } from "@/lib/credits";
import { getEnv } from "@/lib/env";
import { generationFailurePayload, messageFromUnknownError } from "@/lib/generation-errors";
import { parseGenerateForm } from "@/lib/generate-form";
import { createBailianClient, generateImage } from "@/lib/bailian-images";
import { buildPrompt } from "@/lib/prompt-builder";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStoragePath, uploadPrivateFile } from "@/lib/storage";

async function createSignedReferenceUrl(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  path: string
): Promise<string> {
  const signed = await admin.storage.from("reference-images").createSignedUrl(path, 60 * 10);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(signed.error?.message || "Failed to create signed reference image URL.");
  }
  return signed.data.signedUrl;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const env = getEnv();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: Awaited<ReturnType<typeof parseGenerateForm>>;
  try {
    parsed = await parseGenerateForm(await request.formData());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }

  const prompt = buildPrompt(parsed);
  const generationId = crypto.randomUUID();

  const { error: insertError } = await admin.from("generations").insert({
    id: generationId,
    user_id: user.id,
    status: "processing",
    subject: parsed.subject,
    image_type: parsed.imageType,
    aspect_ratio: parsed.aspectRatio,
    style: parsed.style,
    scene: parsed.scene,
    whitespace: parsed.whitespace,
    additional_requirements: parsed.additionalRequirements,
    locale: parsed.locale,
    prompt_preview_zh: prompt.promptPreviewZh,
    prompt_preview_en: prompt.promptPreviewEn,
    submitted_prompt: prompt.submittedPrompt
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const reserved = await reserveGenerationCredit(admin, user.id, generationId);
  if (!reserved) {
    await admin.from("generations").update({ status: "failed", error_message: "Insufficient credits" }).eq("id", generationId);
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  try {
    let referencePath: string | undefined;
    let referenceImageUrl: string | undefined;
    if (parsed.referenceImage) {
      referencePath = buildStoragePath(user.id, generationId, parsed.referenceImage.name);
      await uploadPrivateFile(admin, "reference-images", referencePath, parsed.referenceImage, parsed.referenceImage.type);
      referenceImageUrl = await createSignedReferenceUrl(admin, referencePath);
    }

    const bailian = createBailianClient(env.BAILIAN_API_KEY, env.BAILIAN_API_BASE_URL);
    const imageBytes = await generateImage({
      client: bailian,
      model: env.BAILIAN_IMAGE_MODEL,
      prompt: prompt.submittedPrompt,
      aspectRatio: parsed.aspectRatio ?? "1:1",
      referenceImageUrl
    });

    const generatedPath = buildStoragePath(user.id, generationId, "generated.png");
    const imageArrayBuffer = imageBytes.buffer.slice(
      imageBytes.byteOffset,
      imageBytes.byteOffset + imageBytes.byteLength
    ) as ArrayBuffer;
    await uploadPrivateFile(admin, "generated-images", generatedPath, new Blob([imageArrayBuffer], { type: "image/png" }), "image/png");

    await admin.from("generations").update({
      status: "succeeded",
      reference_image_path: referencePath,
      generated_image_path: generatedPath,
      updated_at: new Date().toISOString()
    }).eq("id", generationId);

    const signed = await admin.storage.from("generated-images").createSignedUrl(generatedPath, 60 * 10);
    return NextResponse.json({
      id: generationId,
      imageUrl: signed.data?.signedUrl ?? null,
      status: "succeeded"
    });
  } catch (error) {
    const failure = generationFailurePayload(error);
    await refundGenerationCredit(admin, user.id, generationId);
    await admin.from("generations").update({
      status: "failed",
      error_message: messageFromUnknownError(error),
      updated_at: new Date().toISOString()
    }).eq("id", generationId);

    return NextResponse.json(failure, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm.cmd test -- src/app/api/generate/route.test.ts src/lib/bailian-images.test.ts
npx.cmd tsc --noEmit
```

Expected: route and provider tests PASS. TypeScript PASS or reports only provider-copy errors handled in later tasks; route import errors must be gone.

- [ ] **Step 5: Commit**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add src/app/api/generate/route.ts src/app/api/generate/route.test.ts
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "feat: wire generate route to Bailian"
```

---

### Task 5: Replace Provider Error Mapping

**Files:**
- Modify: `src/lib/generation-errors.test.ts`
- Modify: `src/lib/generation-errors.ts`

- [ ] **Step 1: Write failing Bailian error tests**

Replace `src/lib/generation-errors.test.ts` with:

```typescript
import { describe, expect, test } from "vitest";
import { generationFailurePayload } from "./generation-errors";

describe("generationFailurePayload", () => {
  test("maps Bailian API key errors to a clear user-facing message", () => {
    expect(generationFailurePayload(new Error("Invalid API-key provided."))).toEqual({
      code: "bailian_auth_error",
      error: "百炼 API Key 无效或未配置，请检查 BAILIAN_API_KEY。"
    });
  });

  test("maps Bailian region mismatch errors to an endpoint hint", () => {
    expect(generationFailurePayload(new Error("The API key and endpoint region do not match."))).toEqual({
      code: "bailian_region_error",
      error: "百炼 API Key 与接口地域不匹配，请确认北京或新加坡 endpoint 配置一致。"
    });
  });

  test("maps Bailian quota errors to a balance or quota hint", () => {
    expect(generationFailurePayload(new Error("quota exceeded or insufficient balance"))).toEqual({
      code: "bailian_quota_error",
      error: "百炼账户余额、额度或限流不足，请到阿里云百炼控制台检查后重试。"
    });
  });

  test("maps Bailian model permission errors to a model hint", () => {
    expect(generationFailurePayload(new Error("model permission denied"))).toEqual({
      code: "bailian_model_error",
      error: "百炼模型不可用或账号没有权限，请检查 BAILIAN_IMAGE_MODEL 和模型权限。"
    });
  });

  test("maps Bailian reference URL errors to an image access hint", () => {
    expect(generationFailurePayload(new Error("image url is not accessible"))).toEqual({
      code: "bailian_image_url_error",
      error: "百炼无法访问参考图链接，请确认参考图 signed URL 可被服务端访问。"
    });
  });

  test("maps network errors to a retry hint", () => {
    expect(generationFailurePayload(new Error("fetch failed"))).toEqual({
      code: "bailian_connection_error",
      error: "连接百炼失败，请检查网络、endpoint 或稍后重试。"
    });
  });
});
```

- [ ] **Step 2: Run error tests and verify red**

Run:

```powershell
npm.cmd test -- src/lib/generation-errors.test.ts
```

Expected: FAIL because error mapping still returns OpenAI-specific codes/messages.

- [ ] **Step 3: Implement Bailian error mapping**

Replace `src/lib/generation-errors.ts` with:

```typescript
export type GenerationFailurePayload = {
  code: string;
  error: string;
};

export function messageFromUnknownError(error: unknown) {
  return error instanceof Error ? error.message : "Generation failed";
}

export function generationFailurePayload(error: unknown): GenerationFailurePayload {
  const message = messageFromUnknownError(error);
  const normalized = message.toLowerCase();

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

  if (normalized.includes("region") || normalized.includes("endpoint")) {
    return {
      code: "bailian_region_error",
      error: "百炼 API Key 与接口地域不匹配，请确认北京或新加坡 endpoint 配置一致。"
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
    normalized.includes("connection error") ||
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
```

- [ ] **Step 4: Verify green**

Run:

```powershell
npm.cmd test -- src/lib/generation-errors.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add src/lib/generation-errors.ts src/lib/generation-errors.test.ts
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "feat: map Bailian generation errors"
```

---

### Task 6: Update Provider Copy In The UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/components/create-form.tsx`
- Modify: `src/app/login/page.tsx`
- Modify any additional `src` files returned by `rg -n "OpenAI|GPT Image|GPTImage|gpt-image" src`

- [ ] **Step 1: Find provider copy**

Run:

```powershell
rg -n "OpenAI|GPT Image|GPTImage|GPT Image-2|gpt-image" src
```

Expected before edits: matches in home copy, create form errors, login copy/tests, provider imports if any remain.

- [ ] **Step 2: Write or update failing copy tests**

Update `src/app/page.test.tsx` so it expects Bailian/Wan2.7 copy:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  test("renders Bailian provider copy in Chinese by default", async () => {
    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/通义万相 Wan2\.7/)).toBeInTheDocument();
    expect(screen.queryByText(/GPT Image/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenAI/)).not.toBeInTheDocument();
  });

  test("renders Bailian provider copy in English when locale is English", async () => {
    render(await HomePage({ searchParams: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByText(/Bailian Wan2\.7/)).toBeInTheDocument();
    expect(screen.queryByText(/GPTImage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenAI/)).not.toBeInTheDocument();
  });
});
```

If the existing `page.test.tsx` has additional assertions unrelated to provider names, keep those assertions and only replace provider-name expectations.

- [ ] **Step 3: Run copy tests and verify red**

Run:

```powershell
npm.cmd test -- src/app/page.test.tsx
```

Expected: FAIL until the homepage copy is updated.

- [ ] **Step 4: Update user-facing provider names**

Apply these exact replacements in `src` user-facing copy:

```text
OpenAI -> 阿里云百炼
GPT Image-2 -> 通义万相 Wan2.7
GPT Image -> 通义万相 Wan2.7
GPTImage -> Bailian Wan2.7
gpt-image-2 -> wan2.7-image-pro
```

For English UI copy, use:

```text
Alibaba Cloud Bailian Wan2.7
```

For Chinese UI copy, use:

```text
阿里云百炼通义万相 Wan2.7
```

Specific known strings to update:

```text
src/app/page.tsx Chinese subhead:
选择图片类型、尺寸、风格、场景和留白要求，再写下主体。PromptCanvas 会把这些信息整理成专业 prompt，并交给阿里云百炼通义万相 Wan2.7 生成图片。

src/app/page.tsx English subhead:
Choose image type, size, style, scene, and whitespace, then describe your subject. PromptCanvas turns the inputs into a professional prompt and sends it to Alibaba Cloud Bailian Wan2.7.

src/components/create-form.tsx Chinese generationFailed:
生成失败，请检查百炼配置、模型权限或稍后重试。

src/components/create-form.tsx English generationFailed:
Generation failed. Check Bailian configuration, model access, or try again later.
```

- [ ] **Step 5: Verify no provider copy remains in app source**

Run:

```powershell
npm.cmd test -- src/app/page.test.tsx
rg -n "OpenAI|GPT Image|GPTImage|gpt-image" src .env.example docs/env.example README.md
```

Expected: page tests PASS. `rg` returns no matches in app source, env examples, or README. Historical specs under `docs/superpowers/specs` may still mention OpenAI for design history and are not part of this check.

- [ ] **Step 6: Commit**

Run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add src README.md .env.example docs/env.example
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "chore: update UI copy for Bailian"
```

---

### Task 7: Full Test And Build Verification

**Files:**
- Modify only files required by failing tests discovered in this task.

- [ ] **Step 1: Run all tests**

Run:

```powershell
npm.cmd test
```

Expected: all tests PASS. If a test fails because it still expects OpenAI copy or OpenAI environment variables, update that test and the related source so it expects Bailian.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Verify provider source cleanup**

Run:

```powershell
rg -n "openai-images|createOpenAIClient|OPENAI_API_KEY|OPENAI_IMAGE_MODEL|OPENAI_PROXY_URL|GPT Image|GPTImage" src package.json package-lock.json .env.example docs/env.example README.md
```

Expected: no matches.

- [ ] **Step 5: Commit verification fixes**

If Tasks 7.1 through 7.4 required source or test edits, run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add .
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "test: finish Bailian migration verification"
```

If no files changed, do not create an empty commit.

---

### Task 8: Local Browser Verification

**Files:**
- Modify only files required by browser verification failures.

- [ ] **Step 1: Start local dev server**

Run from `C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage2.0_neidi`:

```powershell
npm.cmd run dev -- --port 3002
```

Keep this session running until browser verification is complete.

- [ ] **Step 2: Open the app in the browser**

Use the browser tool to open:

```text
http://127.0.0.1:3002/?locale=zh
```

Expected: home page loads without console errors and shows Bailian/Wan2.7 provider copy.

- [ ] **Step 3: Verify create page**

Open:

```text
http://127.0.0.1:3002/create?locale=zh
```

Expected: create page loads. Prompt preview works when typing a subject. The visible generation failure copy mentions Bailian, not OpenAI.

- [ ] **Step 4: Verify source copy through browser text extraction**

Use browser text extraction or page evaluation to confirm:

```text
document.body.innerText.includes("OpenAI") === false
document.body.innerText.includes("GPT Image") === false
document.body.innerText.includes("百炼") === true
```

Expected: all three conditions pass on the home page and create page.

- [ ] **Step 5: Stop dev server and commit browser fixes**

Stop the dev server cleanly. If browser verification required source edits, run:

```powershell
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" add .
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" commit -m "fix: polish Bailian local preview"
```

If no files changed, do not create an empty commit.

---

## Final Verification Checklist

Run this final sequence before reporting completion:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
rg -n "openai-images|createOpenAIClient|OPENAI_API_KEY|OPENAI_IMAGE_MODEL|OPENAI_PROXY_URL|GPT Image|GPTImage" src package.json package-lock.json .env.example docs/env.example README.md
& "C:\Users\Admin\Desktop\Codex Folder\Superpowers\WebImage\tools\PortableGit\cmd\git.exe" status --short
```

Expected:

- Tests PASS.
- TypeScript PASS.
- Build PASS.
- Provider cleanup search has no matches.
- Git status is clean, except for files intentionally left uncommitted by user instruction.

## Spec Coverage

- New project folder and no changes to old `WebImage`: Task 1.
- Provider adapter replacement: Tasks 2, 3, and 4.
- Reference image signed URL flow: Task 4.
- Explicit aspect ratio mapping: Task 3.
- Bailian environment variables and defaults: Task 2.
- User-facing provider copy: Task 6.
- Bailian error handling: Task 5.
- Existing data model and credits preserved: Task 4 and full test run.
- Verification with tests, typecheck, build, and browser: Tasks 7 and 8.
