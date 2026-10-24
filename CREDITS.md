# Visual asset credits

## Scroll scene imagery

- `public/images/motion/chrome-sculpture.avif` — “Abstract chrome sculpture on black background”, Unsplash. Source: https://unsplash.com/photos/abstract-chrome-sculpture-on-black-background-vmvlYqgURY4
- `public/images/motion/future-city.jpg` — Futuristic city at night with neon lights, Nat / Unsplash. Source image: https://images.unsplash.com/photo-1672872476232-da16b45c9001
- `public/images/motion/black-glass-product.avif` — “Black Glass 3D Elements as Abstract Product Background”, Viktor Hanacek / picjumbo. Source: https://picjumbo.com/black-glass-3d-elements-as-abstract-product-background/

Unsplash License: https://unsplash.com/license
picjumbo terms: https://picjumbo.com/faq-and-terms/

Project imagery under `public/images/seashine`, `memoring`, `shike`, `ip`, and `other` belongs to the portfolio owner’s existing project archive.

## Current project screenshots

- `public/images/viform/workspace.png` — captured from the actual local VIFORM “开始创作” page in light mode on 2026-10-24, selected by the portfolio owner. The image does not claim live provider output or commercial deployment. No generation job was submitted for this screenshot.
  Public product entry supplied by the owner: https://ecom-aigc-web.laidianbanlv.cn/viform/#/portal . Browser access verified on 2026-10-24.
- `public/images/sac/home.png` and `guide.png` — actual SAC project review screenshots, from the project’s 2026-10-20 layout checks. The review frontend does not imply that production registration and submission services are open.

### Illustrated case studies (2026-10-24)

All added images were inspected before use and encoded as WebP in the existing Docker runtime, at up to 1600 px width. Existing project screenshots and evaluation images were reused; no model generation was submitted for this revision.

VIFORM images come from `/Users/liuzhenkang/Desktop/workspace/opencut-work/VIFORM-AI/ecom-aigc-hub/output/`:

- `viform/apps.webp` ← `playwright/creation-apps-simplified-desktop.png`: local application directory, categories and favorites.
- `viform/settings.webp` ← `playwright/prompt-assist-commerce.png`: local product facts and creative settings, with an example requirement.
- `viform/reference-upload.webp` / `reference-library.webp` ← `playwright/reference-image-picker-upload.png` / `reference-image-picker-library.png`: local reference picker and example assets.
- `viform/batch.webp` ← `playwright/button-groups-after-batch.png`: deliberately simulated partial failure for UI verification. It does not demonstrate recolor accuracy or provider reliability.
- `viform/results.webp` ← `playwright/creation-results-desktop-light.png`: UI acceptance fixture with multiple image and text outputs; not a real generation claim.
- `viform/task.webp` ← `playwright/project-task-detail-final.png`: local project task detail, requirements and history.
- `viform/watermark.webp` ← `playwright/watermark-preview-20261023.jpg`: watermark preview test on project demonstration media.
- `viform/comparison.webp` ← `recolor-nano-banana2-20261022/key-cases.jpg`: actual saved comparison of original images, previous output and a candidate configuration. Relative differences are visible, but this is not stable feature acceptance.

SAC images come from `/Users/liuzhenkang/Desktop/工作目录/workspace-zhnglian/其他工作内容/SAC活动落地页/output/`, except the newly captured form views:

- `sac/storyboard.webp` ← `xiamen-city-keyframes-20261019/八镜总览.jpg`: the project's authored city visual keyframe board; not documentary photography evidence.
- `sac/participation.webp` ← `checks/requirements-round2-20261020/desktop-about.png`: participation support chapter from the review frontend.
- `sac/gallery.webp` ← `checks/rectification-20261020/desktop-gallery.png`: review gallery with explicitly marked demonstration entries.
- `sac/registration.webp`, `submission.webp`, `authorization.webp` ← read-only browser captures of `https://sac.liuzhenkang.cn/register` and `/submit` on 2026-10-24. Empty form views, missing agreement notice and disabled submission state were checked. No information was entered or submitted.

Paths in this section are relative to `public/images/`. Captions in the case studies distinguish iteration interfaces, UI verification samples and actual effect comparisons.

## Jacob identity and responsive archive covers

- The owner selected Jacob concept 1 for website use and kept concepts 1 and 3 under `design/branding/jacob/concepts/`. Initial concepts were made with the built-in image_gen tool; the production SVG wordmark and J symbol in `public/brand/jacob/` are clean, editable paths and Bézier curves based on concept 1, with no embedded raster image or font dependency. PNG/icon files are exported from those SVG sources in Docker.
- `public/images/{seashine,memoring,shike,ip,other}/cover-adapted-v1*.webp` are AI-assisted cover compositions based on the owner's original project archive covers. Separate 4:3, 16:10 and 2:1 exports fit the actual card containers. These thumbnail compositions may reinterpret small screen or illustration details; original case images remain the authoritative project archive. They do not add claims about delivered features, hardware manufacture or client outcomes.
- Sources, generation prompts, framing revisions and export sizes are recorded in `design/project-covers/`; the original cover files, project body text, galleries and database records were preserved.

## Design research

Reading hierarchy: https://brittanychiang.com/ ; project responsibility labels: https://dennissnellenberg.com/work ; motion research: https://lab.aengel.io/webgpu-fluid-particles/ . These are references for design principles; their source code, graphics and branding are not copied. The shared WebGL field is implemented in this project.
