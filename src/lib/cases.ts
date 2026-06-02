import type { Locale } from "./presets";

export type CaseSubmissionStatus = "none" | "submitted" | "approved" | "rejected";

export type PublicCaseExample = {
  id: string;
  title: string;
  subject: string;
  prompt: string;
  imageUrl: string;
  tags: string[];
  createdAt?: string;
};

export function normalizeCaseTags(value: string | string[] | null | undefined) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of source) {
    const tag = item.trim();
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function caseStatusLabel(status: CaseSubmissionStatus | null | undefined, locale: Locale = "zh") {
  const normalized = status ?? "none";
  const labels = {
    zh: {
      none: "未提交",
      submitted: "待审核",
      approved: "已采用",
      rejected: "未采用"
    },
    en: {
      none: "Not submitted",
      submitted: "Pending review",
      approved: "Accepted",
      rejected: "Rejected"
    }
  } satisfies Record<Locale, Record<CaseSubmissionStatus, string>>;

  return labels[locale][normalized];
}

export const fallbackCaseExamples: PublicCaseExample[] = [
  {
    id: "fallback-product",
    title: "High-end Product Visual",
    subject: "Minimal skincare bottle on a stone base",
    prompt: "Create a premium product image for a skincare bottle, studio lighting, clean stone texture, soft shadows, controlled top whitespace, commercial product photography.",
    imageUrl: "https://picsum.photos/seed/promptcanvas-case-product/960/960",
    tags: ["product", "studio", "1:1"]
  },
  {
    id: "fallback-social-cover",
    title: "Social Campaign Cover",
    subject: "Outdoor coffee cup with warm morning light",
    prompt: "Create a warm social media cover image for a coffee brand, outdoor scene, natural light, inviting lifestyle mood, leave right-side whitespace for copy.",
    imageUrl: "https://picsum.photos/seed/promptcanvas-case-social/960/720",
    tags: ["social cover", "lifestyle", "4:5"]
  },
  {
    id: "fallback-poster",
    title: "Event Poster Concept",
    subject: "Modern creative workshop poster",
    prompt: "Create a bold event poster concept, modern composition, strong focal subject, cinematic lighting, high contrast, clear negative space for title placement.",
    imageUrl: "https://picsum.photos/seed/promptcanvas-case-poster/900/1200",
    tags: ["poster", "event", "3:2"]
  }
];
