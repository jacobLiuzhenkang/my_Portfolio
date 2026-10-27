# 联系私信 P0

首页（共享页脚也在成长页和公开留言板显示）联系表单通过 `contact.submit` 写入独立 `guestbook_messages`。没有公开查询、邮件、Webhook、回复和删除功能。原公开墙及其发布规则不变。

管理员沿用现有登录会话，在「联系留言」（也可 `/admin?tab=contact`）分页查看，每页 50 条。new/read/spam 可互转；垃圾不删除也不隐藏，仍供管理员查看。所有字段为不可信纯文本，接口标记 `untrustedContent: true`，不解析 HTML/Markdown、不调用 AI。

## 迁移

合并后仍须经授权在部署环境运行 `npm run guestbook-messages:migrate`，并在生产迁移前做私有备份。脚本只增量建表和索引，不覆盖 `db/guestbook.sql`，不修改现有记录。本次未迁移生产、未合并、未部署。迁移前表单会报告失败，后台显示迁移提示。

## 反垃圾及限制

- 同源 Origin 必须存在；tRPC contact 请求（含混合批次）受 64 KiB 上限约束。
- honeypot 非空静默成功且不写入；客户端打开时间不足 3 秒或在未来则拒绝。客户端时间可伪造，该措施仅为低成本阻挡。
- 每个 IP 和规范化邮箱各 5 次/小时；进程内 Map 最多 10000 个键，满时拒绝，过期回收。成功通过校验的写入尝试消耗额度，DB 失败亦然。
- IP 仅信任 Vercel 覆写的 `x-vercel-forwarded-for`；本地/其他部署共享一个网络桶。键为随机进程盐 HMAC，不保存明文 IP，数据库亦不保存 IP/UA。
- 内存限流在冷启动/重启时重置，多个 serverless 实例不共享额度；不保证分布式全局限流。沿用现有免费资源，不新增外部服务。
- 邮箱只校验格式，不验证归属；未增加验证码或通知。

## 验证

在不挂载环境文件、不传数据库凭据的 Docker Node 22 容器执行 check/test。contact 测试以模拟 DB 覆盖输入校验、静默丢弃、时间、同源、限流、分页、未登录拒绝与三种状态流转；不使用真实 Neon。真实数据库连通、生产迁移和实机视觉交互仍须上线流程验收。

本次结果：`npm run check` 通过；`npm run test` 102 通过、1 跳过（现有 analytics 真实 DB 测试），新增 contact 8 项全部通过；`npm run build` 通过（有 bundle size 提示）。尚未做浏览器截图/实机交互验收，未验证真实 DB 迁移。
