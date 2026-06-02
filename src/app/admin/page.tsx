import Link from "next/link";
import { Cross2Icon } from "@radix-ui/react-icons";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { caseStatusLabel } from "@/lib/cases";
import { getAdminDashboardData, yuanFromCents } from "@/lib/admin-dashboard";
import { adminLogin, adminLogout, isAdminAuthenticated, markGenerationAsCase, rewardUser } from "./actions";

export const dynamic = "force-dynamic";

type AdminSearchParams = {
  error?: string | string[];
  userId?: string | string[];
};

type AdminPageProps = {
  searchParams?: Promise<AdminSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedUserId = firstParam(params.userId) ?? "";
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLogin error={firstParam(params.error)} />;
  }

  const dashboard = await getAdminDashboardData({ selectedUserId: selectedUserId || undefined });

  return (
    <main id="main-content" className="admin-page min-h-[100dvh] px-4 py-5">
      <div className="mx-auto max-w-[1440px]">
        <nav className="nav compact-nav">
          <Link className="brand" href="/"><span className="logo">P</span>PromptCanvas</Link>
          <TopNav locale="zh" />
          <form action={adminLogout}>
            <Button type="submit" variant="secondary">退出后台</Button>
          </form>
        </nav>

        <header className="admin-hero">
          <Badge variant="accent">Admin</Badge>
          <h1>管理员后台</h1>
          <p>查看用户积分、充值、使用情况，筛选生图历史，采用案例并发放积分奖励。</p>
        </header>

        <section className="admin-section">
          <div className="section-title">
            <div>
              <h2>注册用户</h2>
              <p>累计充值只统计已支付订单，使用积分来自生成扣费流水。</p>
            </div>
          </div>
          <div className="admin-user-table">
            <div className="admin-table-head">
              <span>用户</span>
              <span>当前积分</span>
              <span>充值金额</span>
              <span>充值积分</span>
              <span>已使用</span>
              <span>奖励</span>
              <span>生图</span>
              <span>奖励操作</span>
            </div>
            {dashboard.users.map((user) => (
              <div className="admin-table-row" key={user.userId}>
                <span className="break-all">
                  <strong>{user.email}</strong>
                  <small>{new Date(user.joinedAt).toLocaleDateString("zh-CN")}</small>
                </span>
                <span>{user.credits}</span>
                <span>{yuanFromCents(user.paidCents)}</span>
                <span>{user.purchasedCredits}</span>
                <span>{user.usedCredits}</span>
                <span>{user.rewardCredits}</span>
                <span>{user.generationCount}</span>
                <form className="admin-inline-form" action={rewardUser}>
                  <input name="userId" type="hidden" value={user.userId} />
                  <input aria-label={`奖励积分 ${user.email}`} name="amount" min="1" step="1" type="number" placeholder="积分" />
                  <input aria-label={`奖励备注 ${user.email}`} name="note" type="text" placeholder="备注" />
                  <button type="submit">发放</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="section-title">
            <div>
              <h2>生图历史</h2>
              <p>筛选用户后可查看对应生图结果，并把优秀结果标记为案例。</p>
            </div>
            <form className="admin-filter" action="/admin">
              <select name="userId" defaultValue={dashboard.selectedUserId}>
                <option value="">全部用户</option>
                {dashboard.users.map((user) => (
                  <option value={user.userId} key={user.userId}>{user.email}</option>
                ))}
              </select>
              <Button type="submit" variant="secondary">筛选</Button>
            </form>
          </div>

          <div className="admin-generation-grid">
            {dashboard.generations.map((generation) => (
              <article className="admin-generation-card" key={generation.id}>
                {generation.imageUrl ? (
                  <img src={generation.imageUrl} alt={generation.subject} />
                ) : (
                  <div className="admin-empty-image"><Cross2Icon /></div>
                )}
                <div className="admin-generation-body">
                  <div className="example-tags">
                    <span>{generation.status}</span>
                    <span>{caseStatusLabel(generation.case_submission_status as never)}</span>
                    {generation.deleted_at ? <span>用户已删除</span> : null}
                  </div>
                  <h3>{generation.subject}</h3>
                  <p>{generation.userEmail}</p>
                  <small>{new Date(generation.created_at).toLocaleString("zh-CN")}</small>
                  <div className="admin-prompt">{generation.prompt_preview_zh || generation.submitted_prompt}</div>
                  <form className="admin-case-form" action={markGenerationAsCase}>
                    <input name="generationId" type="hidden" value={generation.id} />
                    <input name="title" type="text" placeholder="案例标题，默认使用主体" defaultValue={generation.subject} />
                    <input name="tags" type="text" placeholder="标签，用逗号分隔" defaultValue={[generation.aspect_ratio, generation.style].filter(Boolean).join(", ")} />
                    <input name="rewardCredits" min="0" step="1" type="number" placeholder="奖励积分" defaultValue={generation.case_rewarded_at ? 0 : 5} />
                    <button type="submit">标记为案例</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminLogin({ error }: { error?: string }) {
  return (
    <main id="main-content" className="admin-login min-h-[100dvh] px-4 py-5">
      <form className="admin-login-card" action={adminLogin}>
        <Badge variant="accent">Admin</Badge>
        <h1>管理员登录</h1>
        <p>输入后台密码后查看用户、积分、充值和案例审核。</p>
        <input name="password" type="password" placeholder="请输入管理员密码" autoComplete="current-password" />
        {error === "invalid" ? <span>密码不正确，请重新输入。</span> : null}
        <Button type="submit" variant="accent">进入后台</Button>
      </form>
    </main>
  );
}
