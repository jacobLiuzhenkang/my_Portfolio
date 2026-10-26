/** Shareable case URLs use `/work/:slug`. The slug prefers the local cover folder. */

const COVER_FOLDER = /\/images\/([a-z0-9-]+)\//i;

const TITLE_SLUGS: Array<[RegExp, string]> = [
  [/viform/i, "viform"],
  [/sac|微光成炬/, "sac"],
  [/memoring/i, "memoring"],
  [/食刻/, "shike"],
  [/到家/, "seashine"],
  [/IP\s*形象|吉祥物/, "ip"],
  [/平面设计/, "other"],
];

export type CaseSlugSource = {
  id: number;
  title: string;
  coverUrl?: string | null;
  coverImage?: string | null;
};

function folderSlug(value: string | null | undefined) {
  if (!value || /^https?:\/\//i.test(value)) return null;
  const folder = value.match(COVER_FOLDER)?.[1]?.toLowerCase();
  return folder && /^[a-z0-9-]{2,40}$/.test(folder) ? folder : null;
}

function titleSlug(title: string) {
  for (const [pattern, slug] of TITLE_SLUGS) {
    if (pattern.test(title)) return slug;
  }
  return null;
}

export function projectSlug(project: CaseSlugSource) {
  return (
    folderSlug(project.coverImage) ??
    folderSlug(project.coverUrl) ??
    titleSlug(project.title) ??
    `p${project.id}`
  );
}

export function projectPath(project: CaseSlugSource) {
  return `/work/${projectSlug(project)}`;
}

export function caseSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/work\/([^/]+)\/?$/);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function findProjectBySlug<T extends CaseSlugSource>(
  projects: readonly T[],
  slug: string | undefined
) {
  if (!slug) return undefined;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  const key = decoded.trim().toLowerCase();
  if (!key) return undefined;
  return projects.find(project => {
    const canonical = projectSlug(project);
    return (
      canonical === key || String(project.id) === key || `p${project.id}` === key
    );
  });
}

/** Home and a case link are the same page with a modal, so scrolling should stay put. */
export function isCaseSurface(pathname: string) {
  return pathname === "/" || pathname === "/work" || pathname.startsWith("/work/");
}

export function readHistoryIndex() {
  const history = (globalThis as { history?: { state?: { idx?: unknown } | null } })
    .history;
  const index = history?.state?.idx;
  return typeof index === "number" ? index : 0;
}

/** A direct visit has no in-app entry to return to; closing replaces the URL instead. */
export function caseCloseUsesHistoryBack(
  historyIndex: number,
  openedAtIndex: number | null
) {
  return (
    openedAtIndex != null && historyIndex === openedAtIndex && historyIndex > 0
  );
}
