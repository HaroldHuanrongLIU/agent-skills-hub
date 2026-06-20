# CLI 用量追踪 — GA4 / Plausible / Cloudflare 建报表

CLI 的设计原则是**零后端、零内置埋点**(信任层定位)。所以"有多少人下载并使用 CLI"靠三层**匿名外部信号**拼出来,不在 CLI 里发任何 telemetry。

| 层 | 信号 | 含义 | 在哪看 |
|---|---|---|---|
| 1 安装/运行 | npm 下载数 | `npx @agentskillshub/cli` 拉包次数 | npm downloads API(下方 one-liner) |
| 2 活跃搜索 | 索引文件请求数 | 每次 search 后 TTL 过期会探测 `search-index-meta.json`;首次/变更下 `.json.gz` | Cloudflare(需域名走 CF 代理) |
| 3 转化点击 | 带 `?ref=cli` 的 skill 页流量 | 多少 CLI 用户真的点进了 skill 页 | GA4 / Plausible(本页重点) |

站点现状:`frontend/index.html` 已挂 **GA4**(`G-0F5GCX6MCV`)+ **Plausible**(`agentskillshub.top`)。两套都能做第 3 层。

---

## 现状:CLI 已打 UTM 参数(0.2.6+)

CLI **0.2.6 起**给每个 skill 链接打 `?utm_source=cli&utm_medium=cli`(0.2.5 用的是 `?ref=cli`,已废弃)。

为什么是 UTM 而不是 `ref`:**GA4 / Plausible 都不会把任意 `ref` 参数自动归因到"来源"** —— 它们只认 `utm_*`。用了 UTM 后,你**什么报表都不用建**:

- GA4 自动把它算进 **Traffic acquisition → Session source/medium = `cli / cli`**
- Plausible 自动进 **Sources → UTM Sources → `cli`**

```js
// bin/ash.mjs — HUB_SKILL(已落地)
const HUB_SKILL = (full) => `${BASE}/skill/${full}/?utm_source=cli&utm_medium=cli`;
```

> 下面优先看「零建表」路径。文末保留 `ref=cli` 的手建报表法,仅供仍在用 0.2.5 旧版的用户参考。

---

## GA4

### 默认(utm,0.2.6+)— 零建表
CLI 已带 `utm_source=cli`,直接看:
1. GA4 → **Reports → Acquisition → Traffic acquisition**。
2. 主维度选 **Session source / medium** → 找 `cli / cli` 那行。
3. 列里看 **Sessions / Engaged sessions / Conversions**。这就是 CLI 带来的站点访问。
4. (可选)把它存成书签报表:右上 **Save → Save as new report**。

### 旧版 `ref=cli`(仅 0.2.5)— Exploration 手建
1. GA4 → 左侧 **Explore → 空白 Blank**。
2. **DIMENSIONS** 点 `+` → 加 **Page location**(和 **Page path + query string**)。
3. **METRICS** 点 `+` → 加 **Views / Total users / Sessions**。
4. 把 Page location 拖到 **Rows**,Views/Users 拖到 **Values**。
5. **FILTERS** → 选 `Page location` → **contains** → `ref=cli` → Apply。
6. 现在表里只剩 CLI 来的 skill 页,按 Views 排序看哪些 skill 被点最多。
7. 右上改名"CLI clickthroughs",自动保存。

> 注意 GA4 的 **Page path and screen class** 维度会**去掉**查询串,所以一定要用 **Page location**(完整 URL,含 `?ref=cli`)做过滤。

---

## Plausible(更简单)

Plausible 已加载 `script.outbound-links.js`,自带出站链接追踪。看 CLI 转化:

### 默认(utm,0.2.6+)
1. Plausible dashboard → 右上 **Sources** 卡 → 切到 **UTM Sources** 标签 → 找 `cli`。
2. 直接看 Visitors / Bounce / Visit duration。

### 旧版 `ref=cli`(仅 0.2.5)
Plausible 默认**不索引查询参数**。两种办法:
- **简单**:Filter → **Page** → `contains` → `ref=cli`(若你的套餐支持 query 过滤)。
- **彻底**:在 Plausible **Settings → Custom Properties** 里允许 `ref`,或干脆改用 utm(走 B)。

---

## Cloudflare(第 2 层:活跃搜索量,可选)

只有当 `agentskillshub.top` 的 DNS **走 Cloudflare 代理(橙云)**时才有日志。先确认:

```bash
# 看响应头有没有 Cloudflare 的 server/cf-ray
curl -sI https://agentskillshub.top/search-index-meta.json | grep -iE "server:|cf-ray"
```

- **有 `cf-ray`** → 域名在 CF:进 Cloudflare dashboard → **Analytics & Logs → Web Analytics**(或 GraphQL Analytics),按 path 过滤:
  - `/search-index-meta.json` 的请求数 ≈ **每日搜索次数**(每次 search 过 15min TTL 后都会探测一次这个 77B 文件)。
  - `/search-index.json.gz` 的请求数 ≈ **首次安装 + 索引更新后的重新下载**次数。
- **没有 `cf-ray`**(GitHub Pages 直出) → 拿不到 fetch 日志。要这层数据就把域名 DNS 挂到 Cloudflare 开代理(免费档够用),或保留现状只靠第 1、3 层。

> 协同点:0.2.5 把 TTL 降到 15min 后,`meta.json` 基本是"每次搜索一次"的心跳,套上 CF 后它就是你的**每日搜索量**指标,完全匿名。

---

## 第 1 层:npm 下载数(立刻可用,无需配置)

```bash
# 上周下载量
curl -s "https://api.npmjs.org/downloads/point/last-week/@agentskillshub/cli" | python3 -m json.tool

# 按天拉一段区间(画趋势)
curl -s "https://api.npmjs.org/downloads/range/2026-06-01:2026-06-30/@agentskillshub/cli" \
  | python3 -c "import json,sys; [print(d['day'], d['downloads']) for d in json.load(sys.stdin)['downloads']]"
```

> 口径注意:`npx` 每次运行可能拉包(取决于本地缓存),CI / 镜像也会计入,所以这是"运行量"的**上限代理**,不是去重用户数。配合第 3 层的点击数一起看更准。

---

## 一句话总览

- **CLI 转化(点击)** → CLI 0.2.6+ 已带 `utm_source=cli`:GA4「Traffic acquisition」找 `cli / cli`,Plausible「UTM Sources」找 `cli`,零建表。
- **搜索量(非点击)** → 把域名挂 Cloudflare,看 `search-index-meta.json` 的请求数。
- **安装量** → npm downloads API,一条 curl。
