# WebImage2.0 Neidi Bailian Provider Design

Date: 2026-05-31

## Summary

Build `WebImage2.0_neidi` as a new website folder based on the existing `WebImage` MVP. The new site keeps the current product scope and user flows, but replaces the OpenAI image provider with Alibaba Cloud Model Studio Bailian.

The implementation should copy the existing application structure into `WebImage2.0_neidi`, excluding local build output, dependencies, logs, secrets, temporary screenshots, and tooling caches. The old `WebImage` folder must not be modified.

## Approved Scope

Keep the existing MVP features:

- Home page.
- Create image page.
- Login and registration.
- Generation history.
- Credit system.
- New-user 2-credit bonus.
- 1 credit charged for each successful generated image.
- Upgrade/recharge stub with no real payment.
- One optional reference image upload.
- Supabase Auth, Postgres, and private Storage.

Change only the image generation provider and directly related configuration, copy, tests, and documentation.

## Non-Goals

- No real payment.
- No admin system.
- No complex SEO or content management.
- No image editor, mask editing, local editing tools, or background removal.
- No multi-model UI.
- No multiple reference image UI.
- No queue or async task dashboard.
- No brand redesign in this iteration.

## Recommended Approach

Use a provider adapter replacement:

1. Copy `WebImage` into `WebImage2.0_neidi`.
2. Remove `openai` and `https-proxy-agent` dependencies.
3. Replace `src/lib/openai-images.ts` with `src/lib/bailian-images.ts`.
4. Update `/api/generate` to call `createBailianClient` and `generateImage`.
5. Rename provider environment variables from OpenAI to Bailian.
6. Update user-facing provider copy and error messages.
7. Keep database, storage, credit, auth, and UI structure unchanged.

This keeps the migration small and avoids building an unnecessary multi-provider abstraction for the first domestic version.

## Bailian API

Use Alibaba Cloud Model Studio Bailian Wan2.7 image generation and editing.

Official references:

- https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-and-editing-api-reference
- https://www.alibabacloud.com/help/en/model-studio/get-api-key

Default endpoint:

```text
https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

Default model:

```text
wan2.7-image-pro
```

The model must remain configurable through `BAILIAN_IMAGE_MODEL`, defaulting to `wan2.7-image-pro` if the variable is omitted where a default is appropriate.

Important provider constraints:

- Beijing and Singapore API keys and endpoints are separate and must not be mixed.
- Prompt text supports Chinese and English.
- Prompt text is limited to 5,000 characters.
- Reference image input can be a public URL or Base64 data URL.
- Reference image size limit is 20 MB.
- Supported reference image formats include JPEG, JPG, PNG, BMP, and WebP.
- The API defaults to multiple images if `n` is omitted; the site must send `n: 1`.
- Generated image result URLs are retained for only 24 hours and must be downloaded and saved promptly.

## Request Shape

The provider wrapper should build a synchronous multimodal request:

```json
{
  "model": "wan2.7-image-pro",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          { "text": "submitted prompt" }
        ]
      }
    ]
  },
  "parameters": {
    "size": "1536*1536",
    "n": 1,
    "watermark": false,
    "thinking_mode": true
  }
}
```

When a reference image exists, include the reference image before or near the prompt text:

```json
{
  "role": "user",
  "content": [
    { "image": "https://signed-reference-url" },
    { "text": "submitted prompt" }
  ]
}
```

For reference-image calls, `thinking_mode` should be omitted because the official documentation states it is effective only when image set mode is disabled and there is no image input.

## Reference Image Flow

Keep the current UI and upload validation behavior.

Backend generation flow with a reference image:

1. Parse and validate form input.
2. Create the generation record.
3. Reserve 1 credit.
4. Upload the reference image to the existing private Supabase `reference-images` bucket.
5. Create a short-lived signed URL for the stored reference image.
6. Send the signed reference URL to Bailian as the image input.
7. Download the generated image URL returned by Bailian immediately.
8. Save the downloaded image bytes to the existing private Supabase `generated-images` bucket.
9. Mark the generation as `succeeded` and return a signed URL for display.

If the Bailian call or result download fails, refund the reserved credit and mark the generation as `failed`.

## Aspect Ratio Mapping

Do not use generic `2K` for text-to-image because it produces square output without image input. Preserve the existing aspect ratio selector through explicit pixel dimensions:

| UI ratio | Bailian size |
| --- | --- |
| `1:1` | `1536*1536` |
| `4:5` | `1344*1680` |
| `16:9` | `1664*936` |
| `9:16` | `936*1664` |
| `3:2` | `1728*1152` |

These sizes stay within the documented pixel limits for both text-to-image and image-input scenarios.

## Environment Variables

Required:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BAILIAN_API_KEY
NEXT_PUBLIC_APP_URL
```

Optional configuration with application defaults:

```text
BAILIAN_IMAGE_MODEL=wan2.7-image-pro
BAILIAN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

If these optional variables are missing, the app should use the values above. `.env.example` should still show them explicitly so deployments can override model or region endpoint without code changes.

Remove OpenAI-specific variables from examples and code:

```text
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
OPENAI_PROXY_URL
```

## User-Facing Copy

Keep `PromptCanvas` as the product name for this version.

Replace provider copy:

- `OpenAI` -> `阿里云百炼` or `Bailian`.
- `GPT Image` / `GPT Image-2` -> `通义万相 Wan2.7`.

Chinese text should be the default and primary copy. English locale may remain because the existing project already supports it, but this iteration does not need a domestic-market copy rewrite.

## Error Handling

Update provider error mapping to Bailian terms.

Common user-facing cases:

- Missing or invalid Bailian API key.
- Region mismatch between API key and endpoint.
- Insufficient account balance, quota, or rate limit.
- Model unavailable or no model permission.
- Reference image URL not accessible by Bailian.
- Bailian request timeout or network failure.
- Bailian response missing image output.
- Downloading the returned image URL fails or returns non-image content.

Errors must not expose API keys, signed URLs, raw provider payloads with secrets, or private storage paths.

## Data Model

Keep the current database schema unchanged:

- `profiles`
- `credit_ledger`
- `generations`
- `reference-images` private storage bucket
- `generated-images` private storage bucket

No new provider-specific database columns are required for the first version.

## Testing

Update provider-focused tests while preserving existing business behavior tests.

Required tests:

- `src/lib/bailian-images.test.ts`
  - Builds a text-only Bailian request with `n: 1`, `watermark: false`, and explicit size.
  - Builds a reference-image request with an image content item and no `thinking_mode`.
  - Maps aspect ratios to the approved sizes.
  - Extracts the first image URL from `output.choices[].message.content[]`.
  - Downloads generated image bytes.
  - Throws a clear error when no image URL is returned.
- `src/lib/env.test.ts`
  - Requires Bailian variables instead of OpenAI variables.
  - Accepts the default `wan2.7-image-pro` model behavior if implemented in `getEnv`.
- `src/lib/generation-errors.test.ts`
  - Maps Bailian auth, region, quota, permission, URL, and timeout failures to clear Chinese messages.
- `src/app/api/generate/route.test.ts`
  - Keeps successful generation, credit reservation, image storage, and failed-call refund behavior intact.

Run at least:

```text
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

## Verification

After implementation:

1. Start the local dev server from `WebImage2.0_neidi`.
2. Open the home page and create page in the browser.
3. Confirm provider copy no longer says OpenAI or GPT Image.
4. Confirm subject-only generation can call the Bailian wrapper with mocked or real credentials.
5. Confirm reference-image generation sends the signed image URL to the provider wrapper.
6. Confirm generated output is saved to Supabase Storage rather than using the temporary Bailian URL directly.

## Open Notes

The user confirmed:

- Use the provider adapter replacement approach.
- Keep the reference image upload.
- Make the model configurable with default `wan2.7-image-pro`.

No further product scope decisions are needed before writing the implementation plan.
