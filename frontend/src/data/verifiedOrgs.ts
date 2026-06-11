/**
 * Verified Organizations — Hub-认证的机构（付费/官方合作）。
 *
 * 与「Organization Builders」(首页按 star 客观聚合的榜单) 严格区分:
 *   - Organization Builders → 纯数据驱动、免费、不可购买、不可人工干预。
 *   - Verified Organizations (本文件) → 经过 Hub 审计 + 商业合作的机构,
 *     带 ✓ 标识、专属展示位。展示 ≠ 排名:认证不会改变任何客观榜单/Trending。
 *
 * 加入规则(ALL of):
 *   1. 机构主动申请 / 官方合作意向已确认。
 *   2. 已通过 Hub 的 Skill 审计(安全 / 质量 / 维护 / 官方归属)。
 *   3. 商业条款已确认(年度认证)。
 *   4. 机构已同意公开展示的名称、logo、联系渠道、精选 Skill。
 *
 * 未经同意列出 = 失实陈述。每个机构一条,精选 Skill 用真实 repo_full_name。
 */

export interface VerifiedOrganization {
  /** GitHub org login (lowercase-insensitive match against author_name) */
  github: string;
  /** Public display name */
  name: string;
  /** Logo URL (GitHub org avatar is fine) */
  logo: string;
  /** One-line description of what the org's skills do */
  tagline: string;
  /** Year verified */
  since: string;
  /** Official website / skill marketplace */
  website?: string;
  /** Featured skill repo_full_names (link to /skill/<full_name>/) */
  skills: { repo: string; label: string }[];
}

/**
 * DORMANT until a deal is signed — the section hides itself when this array is
 * empty, so nothing publishes prematurely.
 *
 * 高德 (AMap / Alibaba) reached out 2026-06 asking to be officially featured.
 * To activate after terms are confirmed, uncomment the entry below. All three
 * skills are genuinely indexed in the catalog and verified working.
 */
export const VERIFIED_ORGANIZATIONS: VerifiedOrganization[] = [
  // {
  //   github: "AMap-Web",
  //   name: "高德地图 · AMap",
  //   logo: "https://avatars.githubusercontent.com/u/111416833?v=4",
  //   tagline:
  //     "官方地图与空间智能 Skill —— POI 搜索、路径规划、旅游规划、周边搜索、热力图可视化。",
  //   since: "2026",
  //   website: "https://lbs.amap.com/ai/skillzone",
  //   skills: [
  //     { repo: "AMap-Web/amap-lbs-skill", label: "amap-lbs-skill" },
  //     { repo: "AMap-Web/amap-skills", label: "amap-jsapi-skill" },
  //     { repo: "kaichen/amap-skill", label: "amap-skill" },
  //   ],
  // },
];

export function hasVerifiedOrgs(): boolean {
  return VERIFIED_ORGANIZATIONS.length > 0;
}

/** Lowercase set of verified-org github logins for O(1) badge checks. */
const VERIFIED_ORG_SET: Set<string> = new Set(
  VERIFIED_ORGANIZATIONS.map((o) => o.github.toLowerCase()),
);

export function isVerifiedOrgAuthor(
  authorName: string | null | undefined,
): boolean {
  if (!authorName) return false;
  return VERIFIED_ORG_SET.has(authorName.toLowerCase());
}
