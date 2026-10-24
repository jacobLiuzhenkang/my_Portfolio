# Guestbook Implementation Plan

> Inline execution in this session; no subagents. The user approved immediate anonymous publishing and requested malicious-content and prompt-injection protection.

**Goal:** Add a public, persistent, photo-and-text guestbook with likes, comments, reports and owner moderation.

**Architecture:** React/tRPC/Hono reuse the current public layout, PostgreSQL and private Blob. New guestbook tables isolate visitor identity and content from administrator files; writes use database transactions, persistent limits and strict ownership. Image uploads use bounded staging, server validation/re-encoding and an independent local Docker media volume.

**Tech Stack:** Existing React 19, TypeScript, Hono, tRPC, PostgreSQL/pg, Vercel Blob; sharp for bounded image decoding and WebP re-encoding.

## Global Constraints

- All local install/build/runtime/migration tasks stay in Docker. Keep existing cloud resources on free plans.
- No AI invocation or raw HTML/Markdown rendering of visitor content. Do not log visitor message bodies.
- Preserve existing portfolio records, PDF, and mobile side drawer; migrate additively and back up production before applying.
- Public page `/guestbook`; text 2000 chars, comments 500 chars, 9 images, each 2 MiB and post total 12 MiB.
- Normal content immediate; suspicious content held for review. Reports require manual moderation; no automatic hide by report count.

### Task 1: Persistence and security boundary

Files: `db/guestbook-schema.ts`, `db/guestbook.sql`, `scripts/migrate-guestbook.mjs`, `server/queries/connection.ts`, `server/guestbook/security.ts`, `server/guestbook/security.test.ts`, `contracts/guestbook.ts`.

- [ ] Add independent visitors/posts/media/likes/comments/reports/limits/settings tables and additive transaction migration.
- [ ] Export shared `getPool()`; all guestbook SQL uses `$1` parameters and the existing verified TLS pool.
- [ ] Implement `moderateText(text): string[]`, `assertSameOrigin(req): void`, cookie parsing and typed bounds.
- [ ] Tests: malformed cookies anonymous; foreign or missing Origin forbidden; prompt-like text flagged; normal AI discussion allowed; no raw HTML rendering anywhere.
- [ ] Run `npm run check` and targeted Vitest in Docker.

### Task 2: Data and image service

Files: `server/guestbook/service.ts`, `server/guestbook/media.ts`, `server/guestbook/routes.ts`, `server/guestbook/router.ts`.

- [ ] Implement random visitor sessions, atomic persistent limits, idempotent posts/comments/likes, reports, moderation and ownership.
- [ ] Implement upload reservation/finalization, budget accounting, bounded raster decoding, metadata-free WebP and expired-upload cleanup.
- [ ] Expose `guestbook.feed/identity/createPost/setLike/comments/comment/remove/report/adminList/moderate/block/settings/prepareImage/finalizeImage` and stable `/api/guestbook/media/:id`.
- [ ] Integrate new router and REST routes without changing current content/storage privileges.
- [ ] Exercise two visitors and an administrator using HTTP integration checks, including concurrent likes, cross-account deletion denial and suspicious-comment quarantine.

### Task 3: Public experience and moderation UI

Files: `src/pages/Guestbook.tsx`, `src/components/guestbook/*`, `src/components/admin/GuestbookManager.tsx`, `src/guestbook.css`, `src/App.tsx`, `src/components/PortfolioUI.tsx`, `src/components/PublicLayout.tsx`, `src/pages/Admin.tsx`, `vercel.json`.

- [ ] Build single-column photo feed, draft-preserving composer, image viewer, comments, reversible likes, report/retract controls and empty/error states.
- [ ] Add public and side-drawer navigation plus a contact entry. Maintain the same public background canvas and motion preference.
- [ ] Add admin moderation with explicit untrusted-data labeling, reported/held content, restore/hide/block and emergency pause.
- [ ] Verify 320px/391px/tablet/desktop, keyboard/dialog focus, scrolling and static mode.

### Task 4: Verification and publication

Files: `scripts/check-guestbook.mjs`, `SECURITY.md`, `AGENTS.md`, `README.md`, local verification record.

- [ ] Test real upload/normalization, spoofed image rejection, quotas, persistent data, repeated like idempotence, source/ownership checks, reports and administrator isolation.
- [ ] Run typecheck, focused ESLint, full tests, build; review security and lifecycle edge cases inline.
- [ ] Back up cloud database; apply additive migration twice and compare existing content counts/hash.
- [ ] Push preview, verify, publish main and verify real website/API/media/PDF; remove disposable test content.
