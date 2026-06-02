import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fallbackCaseExamples, normalizeCaseTags, type PublicCaseExample } from "@/lib/cases";
import { hasSupabasePublicConfig } from "@/lib/env";
import type { Locale } from "@/lib/presets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ExamplesSearchParams = {
  locale?: string | string[];
};

type ExamplesPageProps = {
  searchParams?: Promise<ExamplesSearchParams>;
};

type CaseExampleRow = {
  id: string;
  title: string;
  subject: string;
  tags: string[] | null;
  prompt_preview_zh: string | null;
  submitted_prompt: string | null;
  generated_image_path: string;
  featured_at: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadCaseExamples(): Promise<PublicCaseExample[]> {
  if (!hasSupabasePublicConfig()) return fallbackCaseExamples;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("case_examples")
      .select("id,title,subject,tags,prompt_preview_zh,submitted_prompt,generated_image_path,featured_at")
      .eq("visibility", "public")
      .order("featured_at", { ascending: false })
      .limit(24)
      .returns<CaseExampleRow[]>();

    if (error || !data || data.length === 0) return fallbackCaseExamples;

    return Promise.all(data.map(async (item) => {
      const signed = await admin.storage.from("generated-images").createSignedUrl(item.generated_image_path, 60 * 10);
      return {
        id: item.id,
        title: item.title,
        subject: item.subject,
        prompt: item.prompt_preview_zh || item.submitted_prompt || item.subject,
        imageUrl: signed.data?.signedUrl ?? fallbackCaseExamples[0].imageUrl,
        tags: normalizeCaseTags(item.tags),
        createdAt: item.featured_at
      };
    }));
  } catch {
    return fallbackCaseExamples;
  }
}

export default async function ExamplesPage({ searchParams }: ExamplesPageProps) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = firstParam(params.locale) === "en" ? "en" : "zh";
  const examples = await loadCaseExamples();
  const createHref = locale === "en" ? "/create?locale=en" : "/create";

  return (
    <main id="main-content" className="min-h-[100dvh] px-4 py-5">
      <div className="mx-auto max-w-[1180px]">
        <nav className="nav compact-nav">
          <Link className="brand" href="/"><span className="logo">P</span>PromptCanvas</Link>
          <TopNav locale={locale} />
          <div className="nav-actions">
            <Button asChild variant="accent"><Link href={createHref}>开始生成 <ArrowRightIcon /></Link></Button>
          </div>
        </nav>

        <header className="examples-hero">
          <Badge variant="accent">Examples</Badge>
          <h1>案例赏析</h1>
          <p>参考真实可用的提示词和生成结果。你提交的优秀作品被采用后，会自动进入这里并获得积分奖励。</p>
        </header>

        <section className="examples-grid">
          {examples.map((example) => (
            <article className="example-card" key={example.id}>
              <img src={example.imageUrl} alt={example.title} />
              <div className="example-card-body">
                <div className="example-tags">
                  {example.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <h2>{example.title}</h2>
                <p className="example-subject">{example.subject}</p>
                <div className="example-prompt">
                  <span>提示词</span>
                  <p>{example.prompt}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
