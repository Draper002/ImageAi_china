# WebImage2.0 内地版百炼生图设计

日期：2026-05-31

## 概要

在 `WebImage2.0_neidi` 文件夹中建设一版新网站。新网站以现有 `WebImage` MVP 为基础，保留现有产品范围和用户流程，但把图片生成模型提供方从 OpenAI 改为阿里云大模型服务平台百炼。

实施时应把现有应用结构复制到 `WebImage2.0_neidi`，但必须排除本地构建产物、依赖目录、日志、密钥文件、临时截图和工具缓存。原 `WebImage` 文件夹不能修改。

## 已确认范围

保留现有 MVP 功能：

- 首页。
- 生图页面。
- 登录和注册。
- 生成历史。
- 积分系统。
- 新用户赠送 2 个积分。
- 每成功生成 1 张图片扣 1 个积分。
- 升级/充值占位入口，不接真实支付。
- 保留 1 张可选参考图上传。
- 继续使用 Supabase Auth、Postgres 和私有 Storage。

本次只改图片生成提供方，以及直接相关的配置、文案、测试和文档。

## 非目标

- 不接真实支付。
- 不做后台管理系统。
- 不做复杂 SEO 或内容管理。
- 不做图片编辑器、蒙版编辑、本地编辑工具或背景移除。
- 不做多模型 UI。
- 不做多参考图 UI。
- 不做异步任务队列或高级任务面板。
- 本轮不做品牌重设计。

## 推荐实现方式

使用 provider adapter 替换方案：

1. 把 `WebImage` 复制到 `WebImage2.0_neidi`。
2. 删除 `openai` 和 `https-proxy-agent` 依赖。
3. 用 `src/lib/bailian-images.ts` 替换 `src/lib/openai-images.ts`。
4. 更新 `/api/generate`，改为调用 `createBailianClient` 和 `generateImage`。
5. 把 OpenAI 环境变量改名为百炼环境变量。
6. 更新用户可见的模型提供方文案和错误提示。
7. 保持数据库、Storage、积分、登录和 UI 结构不变。

这个方案改动集中，能避免第一版内地站引入不必要的多 provider 抽象。

## 百炼 API

使用阿里云百炼的通义万相 Wan2.7 图片生成和编辑能力。

官方参考文档：

- https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-and-editing-api-reference
- https://www.alibabacloud.com/help/en/model-studio/get-api-key

默认接口地址：

```text
https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

默认模型：

```text
wan2.7-image-pro
```

模型必须保持可配置，通过 `BAILIAN_IMAGE_MODEL` 设置；未设置时使用默认值 `wan2.7-image-pro`。

重要约束：

- 北京和新加坡的 API Key 与 endpoint 分区独立，不能混用。
- 提示词支持中文和英文。
- 提示词最多 5,000 字符。
- 参考图输入可以是公网 URL 或 Base64 data URL。
- 参考图大小限制 20 MB。
- 参考图格式支持 JPEG、JPG、PNG、BMP、WebP。
- 如果不传 `n`，API 可能默认生成多张图；网站必须固定传 `n: 1`。
- 生成结果 URL 只保留 24 小时，必须及时下载并保存到自己的 Storage。

## 请求结构

provider wrapper 应构造同步多模态请求：

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

如果有参考图，在提示词附近加入图片 URL：

```json
{
  "role": "user",
  "content": [
    { "image": "https://signed-reference-url" },
    { "text": "submitted prompt" }
  ]
}
```

有参考图时应省略 `thinking_mode`，因为官方文档说明该参数主要在无图输入时生效。

## 参考图流程

保留当前 UI 和上传校验行为。

带参考图的后端生成流程：

1. 解析并校验表单输入。
2. 创建生成记录。
3. 预留 1 个积分。
4. 把参考图上传到现有 Supabase 私有桶 `reference-images`。
5. 为已保存的参考图创建短期 signed URL。
6. 把 signed URL 作为图片输入传给百炼。
7. 拿到百炼返回的生成图片 URL 后立即下载图片。
8. 把下载到的图片字节保存到现有 Supabase 私有桶 `generated-images`。
9. 把生成记录标记为 `succeeded`，并返回一个用于前端展示的 signed URL。

如果百炼调用失败或生成图片下载失败，必须退回已预留积分，并把生成记录标记为 `failed`。

## 画面比例映射

不要直接使用通用 `2K`，因为无图输入时它会生成方图。为了保留现有 1:1、4:5、16:9、9:16、3:2 选择器，需要显式映射像素尺寸：

| UI 比例 | 百炼 size |
| --- | --- |
| `1:1` | `1536*1536` |
| `4:5` | `1344*1680` |
| `16:9` | `1664*936` |
| `9:16` | `936*1664` |
| `3:2` | `1728*1152` |

这些尺寸应保持在官方文档允许的像素范围内，适用于文生图和带图输入场景。

## 环境变量

必填：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BAILIAN_API_KEY
NEXT_PUBLIC_APP_URL
```

可选配置，有应用默认值：

```text
BAILIAN_IMAGE_MODEL=wan2.7-image-pro
BAILIAN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

如果这些可选变量缺失，应用应使用上面的默认值。`.env.example` 仍应显式展示它们，方便部署时切换模型或地域 endpoint。

从示例和代码中移除 OpenAI 专用变量：

```text
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
OPENAI_PROXY_URL
```

## 用户可见文案

本版本先继续使用 `PromptCanvas` 作为产品名。

替换模型提供方文案：

- `OpenAI` 改为 `阿里云百炼` 或 `Bailian`。
- `GPT Image` / `GPT Image-2` 改为 `通义万相 Wan2.7`。

中文是默认和主要语言。英文 locale 可以保留，因为现有项目已经支持；但本轮不做完整的国内市场文案重写。

## 错误处理

把模型提供方错误映射更新为百炼相关提示。

常见用户可见错误：

- 百炼 API Key 缺失或无效。
- API Key 和 endpoint 地域不匹配。
- 账号余额、额度或限流不足。
- 模型不可用或账号没有模型权限。
- 百炼无法访问参考图 URL。
- 百炼请求超时或网络失败。
- 百炼响应中缺少图片输出。
- 下载百炼返回的图片 URL 失败，或返回内容不是图片。

错误信息不能暴露 API Key、signed URL、包含密钥的原始 provider payload，或私有 Storage 路径。

## 数据模型

保持当前数据库结构不变：

- `profiles`
- `credit_ledger`
- `generations`
- `reference-images` 私有 Storage bucket
- `generated-images` 私有 Storage bucket

第一版不需要新增 provider 专用数据库字段。

## 测试

更新 provider 相关测试，同时保留现有业务行为测试。

必需测试：

- `src/lib/bailian-images.test.ts`
  - 能构造纯文本百炼请求，请求包含 `n: 1`、`watermark: false` 和明确尺寸。
  - 能构造带参考图请求，请求包含 image content，并且不包含 `thinking_mode`。
  - 正确映射画面比例到已确认尺寸。
  - 能从 `output.choices[].message.content[]` 中取出第一张图片 URL。
  - 能下载生成图片字节。
  - 当响应没有图片 URL 时抛出清晰错误。
- `src/lib/env.test.ts`
  - 必填变量改为百炼变量，不再要求 OpenAI 变量。
  - 如果 `getEnv` 实现了默认值，验证默认模型为 `wan2.7-image-pro`。
- `src/lib/generation-errors.test.ts`
  - 验证百炼鉴权、地域、额度、权限、URL 和超时错误能映射为清晰中文提示。
- `src/app/api/generate/route.test.ts`
  - 保持成功生成、积分预留、图片保存、失败退款逻辑不变。

至少运行：

```text
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

## 验证

实现完成后：

1. 从 `WebImage2.0_neidi` 启动本地开发服务器。
2. 用浏览器打开首页和生图页。
3. 确认页面文案不再出现 OpenAI 或 GPT Image。
4. 确认只填主体时可以调用百炼 wrapper，可以用 mock 或真实凭据验证。
5. 确认参考图生成会把 signed image URL 传给 provider wrapper。
6. 确认生成结果保存到 Supabase Storage，而不是直接使用百炼临时 URL。

## 已确认决策

用户已确认：

- 使用 provider adapter 替换方案。
- 保留参考图上传。
- 模型可配置，默认 `wan2.7-image-pro`。

进入实施计划前，不需要再确认额外产品范围。
