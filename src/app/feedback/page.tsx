import Link from "next/link";
import { ArrowRightIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/presets";

type FeedbackSearchParams = {
  locale?: string | string[];
};

type FeedbackPageProps = {
  searchParams?: Promise<FeedbackSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = firstParam(params.locale) === "en" ? "en" : "zh";
  const historyHref = locale === "en" ? "/history?locale=en" : "/history";
  const createHref = locale === "en" ? "/create?locale=en" : "/create";

  return (
    <main id="main-content" className="min-h-[100dvh] px-4 py-5">
      <div className="mx-auto max-w-[1080px]">
        <nav className="nav compact-nav">
          <Link className="brand" href="/"><span className="logo">P</span>PromptCanvas</Link>
          <TopNav locale={locale} />
          <div className="nav-actions">
            <Button asChild variant="accent"><Link href={historyHref}>提交案例 <ArrowRightIcon /></Link></Button>
          </div>
        </nav>

        <section className="feedback-hero">
          <Badge variant="accent">Rewards</Badge>
          <h1>反馈有礼</h1>
          <p>把你认为效果好的生成结果提交为案例。管理员采用后，系统会把奖励积分自动同步到你的账户。</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent"><Link href={historyHref}>从历史记录提交</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href={createHref}>先生成一张图</Link></Button>
          </div>
        </section>

        <section className="feedback-rules">
          {[
            ["1", "提交入口", "进入历史记录，选择某条成功生成的图片，点击“提交案例”。"],
            ["2", "审核采用", "管理员会在后台查看图片、提示词和生成信息，选择是否采用为公开案例。"],
            ["3", "积分奖励", "案例被采用后会自动记录奖励流水，并增加到你的当前积分里。"]
          ].map(([step, title, desc]) => (
            <article key={step}>
              <div className="feedback-step">
                <span>{step}</span>
                <CheckCircledIcon className="h-5 w-5" />
              </div>
              <h2>{title}</h2>
              <p>{desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
