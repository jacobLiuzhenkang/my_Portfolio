# 刘振康 · 个人网站

## Docker 本地运行

```sh
docker compose up -d
```

访问 http://localhost:3000 。网站、依赖与 MySQL 均在 Docker 中运行；主机源码只读挂载，容器启动时复制源码。修改源文件后运行 `docker compose restart web`。启动不会覆盖现有后台内容；停止用 `docker compose down`，保留数据卷。

现有数据库如需应用本次定向内容更新，在容器启动后显式运行：

```sh
docker compose exec -T web npm run content:update
```

升级按原始文案逐字段比对，保留自定义文字，按名称、封面或正文识别已存在的新案例。原有五个项目不会删除。后台同时修改了新案例的名称、封面和正文时，升级前应人工核对案例身份。

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
