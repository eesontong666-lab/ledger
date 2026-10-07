// 版本与更新。每个人装的是一份独立的副本；.github/workflows/update.yml 每天把它更新成原始代码库的样子。
// 这里负责告诉用户：你现在是哪一版、原始代码库最新是哪一版。

export const UPSTREAM_REPO = "eesontong666-lab/ledger";
const ONE_HOUR = 60 * 60;

export type VersionInfo = {
  /** 这一份装在哪个 GitHub 仓库（owner/repo）。手动部署的没有。 */
  repo: string | null;
  /** 这一份现在对应原始代码库的哪个版本（短 sha）。还没自动更新过、或手动部署的是 null。 */
  current: string | null;
  /** 原始代码库的最新版本；查不到时是 null */
  latest: { sha: string; date: string } | null;
  status: "latest" | "behind" | "unknown";
  /** 这一份本身就是原始代码库 */
  isOriginal: boolean;
};

export async function getVersionInfo(): Promise<VersionInfo> {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  const repo = owner && slug ? `${owner}/${slug}` : null;
  const isOriginal = repo === UPSTREAM_REPO;

  // 自动更新产生的提交叫 “Update to <版本>”；原始代码库自己部署时就是它自己的提交
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  const fromUpdate = message.match(/^Update to ([0-9a-f]{7,40})/)?.[1] ?? null;
  const current = (isOriginal ? process.env.VERCEL_GIT_COMMIT_SHA : fromUpdate)?.slice(0, 7) ?? null;

  let latest: VersionInfo["latest"] = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${UPSTREAM_REPO}/commits/main`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: ONE_HOUR },
    });
    if (res.ok) {
      const data = (await res.json()) as { sha?: string; commit?: { committer?: { date?: string } } };
      if (data.sha) latest = { sha: data.sha.slice(0, 7), date: data.commit?.committer?.date ?? "" };
    }
  } catch {
    // 查不到就显示“不确定”
  }

  const status = !latest || !current ? "unknown" : latest.sha === current ? "latest" : "behind";
  return { repo, current, latest, status, isOriginal };
}

/** 给还没有自动更新任务的旧安装用：打开 GitHub 的“新增文件”页面，内容已经填好，按一下 Commit 就装上 */
export async function addUpdaterUrl(repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${UPSTREAM_REPO}/main/.github/workflows/update.yml`, {
      next: { revalidate: ONE_HOUR },
    });
    if (!res.ok) return null;
    const yaml = await res.text();
    return `https://github.com/${repo}/new/main?filename=${encodeURIComponent(".github/workflows/update.yml")}&value=${encodeURIComponent(yaml)}`;
  } catch {
    return null;
  }
}
