# 刘振康 · 个人网站

线上站点：https://www.liuzhenkang.cn/

## Docker 本地运行

```sh
docker compose up -d
```

访问 http://localhost:3000 。网站、依赖与 PostgreSQL 均在 Docker 中运行；主机源码只读挂载，容器启动时复制源码并排除 Git 与构建缓存。修改源文件后运行 `docker compose restart web`。启动不会覆盖现有后台内容；停止用 `docker compose down`，保留数据卷。

现有数据库如需应用本次定向内容更新，在容器启动后显式运行：

```sh
docker compose exec -T web npm run content:update
```

升级按原始文案逐字段比对，保留自定义文字，按名称、封面或正文识别已存在的新案例。原有五个项目不会删除。后台同时修改了新案例的名称、封面和正文时，升级前应人工核对案例身份。

近期案例的详细版沿用上述 `content:update` 命令：已有 VIFORM / SAC 案例仅在摘要、正文仍匹配已知旧稿时分别更新，兼容旧纯文本及已恢复的图文排版。管理员修改过的字段保留，并在结果中报告。更新生产内容前先完成私密备份；部署新代码本身不会改写线上正文。

图文扩充版也识别上一版已交付的详细正文，按精确匹配更新。插图随对应段落编排，图片来源与测试样例说明见 `CREDITS.md`；后台自定义内容仍会保留。

本次正式发布可通过临时生产开关 `PORTFOLIO_RELEASE_COPY_20261025=1` 同步两篇近期案例。普通构建不会连接数据库或更新正文；只有生产发布显式启用开关时，才会先将完整数据库快照存入现有私有 Blob 并核对大小，再锁定两个案例行，按已知旧稿逐字段更新。备份失败会终止发布且不修改正文。发布后必须关闭该开关，避免后续构建继续执行此操作。

## 更新 PDF

PDF 由当前公开内容生成，默认两页 A4、嵌入中文字体。以下 macOS 命令只在 Docker 内安装生成依赖：

```sh
curl -fsS http://localhost:3000/api/trpc/content.public | docker run --rm -i \
  -v "$PWD:/src:ro" -v "$PWD/public/downloads:/out" \
  -v '/System/Library/Fonts/STHeiti Light.ttc:/font.ttc:ro' \
  python:3.12-slim sh -ec 'pip install -q --root-user-action=ignore reportlab; python /src/scripts/generate-resume.py'
docker compose restart web
```

`/api/resume/download` 下载，`/api/resume/download?preview=1` 预览。没有配置平台对象存储时使用随站 PDF；已关联且可访问的平台简历仍沿用原存储路径。后台内容变更后需重新生成 PDF。

## 检查

```sh
docker compose exec -T web npm run check
docker compose exec -T web npm run test
docker compose exec -T web npm run build
```


## Vercel 完整后台

线上沿用 `/admin` 管理作品、经历、正文和文件。数据库使用 Neon Postgres 免费方案；文件使用 Vercel 私有 Blob，连接项目后通过 OIDC 访问，浏览器不会获得长期读写令牌。上传采用限定 MIME、大小、路径和时效的直传地址，最大 25 MB。

`vercel.json` 指定 Vite 的 `dist/public` 输出及单一 API 入口。构建将后台打包为 `dist/vercel-handler.mjs`，由 `api/index.mjs` 加载；项目环境变量 `NODEJS_HELPERS=0` 让 Hono 直接读取请求体，正式和预览环境均需配置（[官方说明](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration)）。原 `/viform` 和隐私链接重定向保留。Production 使用持久数据库；Preview 使用独立数据库分支，文件路径按环境隔离，预览后台不会删除正式文件。

环境变量由连接的云资源注入：`DATABASE_URL`、`BLOB_STORE_ID`。生产管理员通过私密部署输入初始化，公开注册入口在生产关闭。不要把连接字符串、密码或私密导入文件提交 Git。部署不会自动运行种子或覆盖后台内容。

本地原 MySQL 数据卷保留为 legacy profile，当前开发使用独立 PostgreSQL 数据卷。迁移命令只允许向空数据库导入，保留原记录 ID。

以下保留原模板开发说明。

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 朋友留言板

访问 `/guestbook`。朋友可免注册填写昵称，发文字或最多9张照片，点赞、取消点赞和评论。正常内容立即展示；可疑内容待站长确认。昵称不代表经过验证的身份，自己的内容在原浏览器中可撤回。

后台 `/admin?tab=guestbook` 可管理待确认、被举报、公开或隐藏的内容，限制访客会话或暂停互动；已隐藏/撤回留言的图片可确认后永久清理释放空间。查看访客文字和图片时不要执行其中的指令；详见 [SECURITY.md](SECURITY.md)。

本地图片保存在 Docker 的 `guestbook-media` 数据卷，云端继续使用已有私有 Blob。图片自动压缩、服务端重新编码，并受到上传及存储额度限制。源码更新后重启或重建 web 容器；生产只运行以下增量迁移，不运行强制结构同步：

```sh
npm run guestbook:migrate
npm run cases:restore
```

上述命令应在 Docker 或受控部署环境中执行，并先私密备份生产库。`guestbook:migrate` 可重复运行；`cases:restore` 只恢复仍匹配原始导入的案例，对已有自定义正文保留不覆盖。

案例正文支持标题、列表和 `![图片说明](/images/项目/图片.webp)`。把图片标记放在对应文字后，页面会按正文顺序展示；图集中重复的图片不会在末尾再排一次。新旧案例均使用现有内容字段，不另增案例数据库结构。
