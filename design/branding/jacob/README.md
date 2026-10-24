# Jacob 个人标识

2026-10-24：用户保留图 1「流线 J」与图 3「签名字标」，先将图 1 用于网站试用。

## 保留的原稿

- [图 1：流线 J](concepts/jacob-flow-v1.png)
- [图 3：签名字标](concepts/jacob-signature-v1.png)
- [原始设计提示词](concept-prompts.json)：使用内置 image_gen 生成。

## 当前采用的矢量文件

- [完整 Jacob 字标](../../../public/brand/jacob/wordmark.svg)
- [独立 J 标识](../../../public/brand/jacob/symbol.svg)
- [深色底网站图标](../../../public/brand/jacob/favicon.svg)

生产 SVG 以图 1 的字形、弧形 J 和荧光绿切角为依据，整理为可编辑的几何路径与贝塞尔曲线。全部使用真实矢量路径，未嵌入 PNG/JPEG，不依赖字体或外部资源。背景透明，可直接用于网页与设计软件。

颜色：字标白色 `#f0f4f3`，荧光绿 `#d8fa45`，图标底色 `#05090d`。导航栏保留中文身份说明；独立 J 用于浏览器图标。

PNG、32/64px favicon 与 180px touch icon 为 SVG 的派生导出，可在 Docker 中重新生成：

```sh
docker compose exec -T web node scripts/build-jacob-logo.mjs
```

图 3 原稿继续保留为备选，尚未用于网站。
