# 站内埋点 A / B 期

管理员登录后选择「数据」，或访问 `/admin?tab=analytics`。可切换近 7 / 30 天；接口支持 `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }`，首尾日期均包含，最大 366 天，时区为北京时间。

## 事件与口径

- `page_view`：公开路由首次进入或 pathname/search 改变；页内锚点不重复计数。
- `case_open`：案例数据就绪并选中，支持点击弹层与直接访问 `/work/:slug`。
- `pdf_view`：用户展开全文后 iframe 的 load 事件；封面预览不计数。浏览器 load 不能证明 PDF 实际阅读成功或阅读时长。
- `outbound_click`：点击案例的「查看项目演示」。

UV 为日期区间内所有事件的匿名 visitor_id 去重数，PV 为 page_view 数。每日 UV 不应直接累加成区间 UV。来源、地区、设备按 PV 统计。作品榜分别统计 case_open / pdf_view，最多 10 个作品。来源优先 utm_source，其次站外 referrer hostname，最后直接访问；图表明确仅展示 Top 10。地区显示平台国家、省州代码，缺失为未知地区。无事件的日期补零。

## 存储与隐私

Drizzle 表定义：`db/analytics-schema.ts`。独立可重复执行迁移：`db/analytics.sql` / `scripts/migrate-analytics.mjs`。只新增 analytics_events 和时间、事件时间、案例时间索引，不操作现有表。不自动执行生产迁移；生产操作仍需振康批准并先做私有备份。

不保存姓名、邮箱、原始 IP、完整 UA、完整 referrer URL、PDF 地址、任意 meta、路径查询参数。访客 UUID 在 localStorage，session UUID 在 sessionStorage；清除存储或换设备会被视为新访客，禁用存储时跳过采集。UTM 仅保留三个限定长度字段，请勿在活动参数中放个人信息。

只接受公开路径白名单，拒绝 `/admin` 前缀及未知事件。使用现有 publicQuery 同源 mutation 校验；overview 使用 adminQuery。单批 1–20 条；公开接口 body 上限 64 KiB。过滤常见 bot UA，每访客每分钟最多 120 条，Vercel 上另按其可信转发 IP 做短期 SHA-256 哈希限流，不保存原始 IP。限流 Map 最多 10000 个键并清理到期项；多实例重启或并发扩容会重置各实例额度，无法完全阻止伪造 UUID 的垃圾事件。

Geo 仅在 Vercel 读取平台覆盖的 `x-vercel-ip-country` / `x-vercel-ip-country-region`，其他部署留空；没有外部 GeoIP 查询、付费 SDK、分析 SaaS。VPN、代理及平台定位会影响精度。忽略未知平台的自报 geo 头。

## Docker 本地验证

所有依赖、构建、测试和服务必须在 Docker 中运行。以下假定已经提供本地 PostgreSQL `postgres` 服务和临时开发环境变量，切勿使用生产数据库运行测试。

```sh
# 在既有开发 Docker 容器内
npm ci
node scripts/migrate-analytics.mjs
npm run check
npm run test
# 聚合集成测试：仅连接一次性本地 PostgreSQL 容器的 analytics_test 数据库（该测试会清空其中 analytics_events）
ANALYTICS_TEST_DB=1 npm run test -- server/analytics/aggregation.test.ts
npm run dev -- --host 0.0.0.0
```

打开首页、成长页、案例，展开完整 PDF，然后登录 `/admin?tab=analytics`。检查四张卡片、日趋势、作品榜、来源环图、地区条形图；切换近 30 天。无事件应展示「公开站有访问后将显示」。注销后 overview 应返回 UNAUTHORIZED；带跨站 Origin 的 track 应拒绝；采集接口失败时公开浏览应继续可用。可用 DevTools Network 检查 beacon 的 SuperJSON `{ json: [event] }` POST；没有公开可见追踪条。

本期不包含 C 期的 CSV 导出、UTM 活动配置、排除名单 UI，也不包含实时推送。没有日汇总或自动保留期删除，查询在数据库内聚合、限制日期和榜单；未来数据增大后需另行评估保留期和日汇总。不会在本期修改留言板、CSP、公开布局或 WebGL。

## B 期：单案例 / PDF 漏斗

在「数据」总览作品榜选择作品按钮，同一 tab 内进入详情；可返回总览并保留近 7 / 30 天选择。支持 `/admin?tab=analytics&project=<slug>` 深链与刷新。`analytics.project` 沿用 adminQuery，未登录拒绝，日期与总览一致。未知 slug 返回 slug 标题和零值，不报 500。

卡片 UV 是该 slug 所有相关事件的 visitor_id 去重数，其余卡片和日趋势为事件次数。漏斗在同一日期区间、同一 slug 内按访客逐步取交集：有 case_open → 同时有 pdf_view → 同时有 outbound_click。重复事件只计一人；不要求时间顺序，不是严格顺序路径归因。相邻转化率分母为零时显示「—」。未提供演示或无演示事件时第三步为零。没有打开记录显示中文空态，趋势仍补齐全部日期。

来源 Top 10 与设备仅统计该 slug 区间内相关事件的次数（不是 PV 或漏斗访客数），来源依次使用 utm_source、referrer_host、直接访问。本期未修改公开采集、事件口径、表结构或案例正文。

本地测试包含 project 的 UNAUTHORIZED / BAD_REQUEST，以及一次性 PostgreSQL fixture 的重复访客、漏斗交集、跨 slug / 日期隔离、北京时间补零、未知 slug 和零分母。集成测试须按上文显式设置 ANALYTICS_TEST_DB=1，只允许本地 analytics_test。
