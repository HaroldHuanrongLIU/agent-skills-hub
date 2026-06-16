import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useStats } from "../hooks/useStats";

interface Collection {
  key: string;
  to: string;
  emoji: string;
  zh: string;
  en: string;
  zhDesc: string;
  enDesc: string;
  /** category name to pull a live count from stats.categories (optional) */
  catCount?: string;
  accent: string;
}

// Themed, hand-curated entry points — NOT a duplicate of the category grid.
// Each leans on a Trust angle (audited / quality / enterprise) so the row
// reinforces our differentiation rather than re-listing buckets.
const COLLECTIONS: Collection[] = [
  {
    key: "safe-mcp",
    to: "/category/mcp-server/",
    emoji: "🛡",
    zh: "MCP 服务器",
    en: "MCP Servers",
    zhDesc: "已安全评级",
    enDesc: "Security-graded",
    catCount: "mcp-server",
    accent: "hover:border-emerald-300 dark:hover:border-emerald-600/60",
  },
  {
    key: "claude-skills",
    to: "/category/claude-skill/",
    emoji: "⚡",
    zh: "Claude Skills",
    en: "Claude Skills",
    zhDesc: "Claude Code 必备",
    enDesc: "Built for Claude Code",
    catCount: "claude-skill",
    accent: "hover:border-indigo-300 dark:hover:border-indigo-600/60",
  },
  {
    key: "top-quality",
    to: "/#top-rated",
    emoji: "🏆",
    zh: "质量标杆",
    en: "Top Quality",
    zhDesc: "质量分最高",
    enDesc: "Highest-scored",
    accent: "hover:border-amber-300 dark:hover:border-amber-600/60",
  },
  {
    key: "trending",
    to: "/#trending",
    emoji: "🔥",
    zh: "本周飙升",
    en: "Trending",
    zhDesc: "增速最快",
    enDesc: "Fastest-rising",
    accent: "hover:border-orange-300 dark:hover:border-orange-600/60",
  },
  {
    key: "enterprise",
    to: "/enterprise/",
    emoji: "🏢",
    zh: "企业级",
    en: "Enterprise",
    zhDesc: "部署前审计 + 合规",
    enDesc: "Pre-deploy audit",
    accent: "hover:border-purple-300 dark:hover:border-purple-600/60",
  },
];

export function CuratedCollections() {
  const { lang } = useI18n();
  const { categories } = useStats();
  const isZh = lang === "zh";

  const countFor = (cat?: string) =>
    cat ? categories.find((c) => c.name === cat)?.count : undefined;

  return (
    <section className="max-w-6xl mx-auto px-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {isZh ? "精选合集" : "Curated Collections"}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {COLLECTIONS.map((c) => {
          const count = countFor(c.catCount);
          return (
            <Link
              key={c.key}
              to={c.to}
              className={`group flex flex-col gap-1 p-3.5 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)] transition-colors ${c.accent}`}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {isZh ? c.zh : c.en}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isZh ? c.zhDesc : c.enDesc}
                {typeof count === "number" && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {" · "}
                    {count.toLocaleString()}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
