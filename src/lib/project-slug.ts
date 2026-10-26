/**
 * Shareable case URLs use `/work/:slug`.
 * The slug is slugified from the title (ASCII runs plus Mandarin pinyin).
 * It does not depend on a cover folder, and it never falls back to `p` + id.
 */
import { pinyinOf } from "./pinyin-dict";

const SLUG_MAX = 80;

export type CaseSlugSource = {
  id: number;
  title: string;
  coverUrl?: string | null;
  coverImage?: string | null;
};

function stableToken(value: string) {
  let hash = 5381;
  for (const char of value) {
    hash = Math.imul(hash, 33) ^ (char.codePointAt(0) ?? 0);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** ASCII letters and digits stay together; each Han character becomes one syllable. */
function slugifyTitle(title: string) {
  const normalized = title.normalize("NFKC").normalize("NFKD").replace(/\p{M}/gu, "");
  const parts: string[] = [];
  let ascii = "";
  const flushAscii = () => {
    const token = ascii.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (token) parts.push(token);
    ascii = "";
  };
  for (const char of normalized) {
    if (/[A-Za-z0-9]/.test(char)) {
      ascii += char;
      continue;
    }
    flushAscii();
    const reading = pinyinOf(char);
    if (reading) parts.push(reading);
  }
  flushAscii();
  const slug = parts.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.length > SLUG_MAX
    ? slug.slice(0, SLUG_MAX).replace(/-[^-]*$/, "")
    : slug;
}

function baseSlug(project: CaseSlugSource) {
  return slugifyTitle(project.title) || `case-${stableToken(project.title.normalize("NFKC"))}`;
}

function claim(base: string, used: Set<string>) {
  let generation = 1;
  while (generation < 1000) {
    const suffix = generation === 1 ? "" : `-${generation}`;
    const trimmed = base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "");
    const slug = `${trimmed}${suffix}`;
    if (slug && !used.has(slug)) {
      used.add(slug);
      return slug;
    }
    generation += 1;
  }
  const suffix = `-${stableToken(base)}`;
  const slug = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
  used.add(slug);
  return slug;
}

/** Earliest id keeps the base slug. Later collisions append -2, -3, and so on. */
export function projectSlug(
  project: CaseSlugSource,
  projects: readonly CaseSlugSource[] = [project]
) {
  const list = projects.some(item => item.id === project.id)
    ? projects
    : [...projects, project];
  const used = new Set<string>();
  const assigned = new Map<number, string>();
  for (const item of [...list].sort((a, b) => a.id - b.id)) {
    if (assigned.has(item.id)) continue;
    assigned.set(item.id, claim(baseSlug(item), used));
  }
  return assigned.get(project.id) ?? claim(baseSlug(project), used);
}

export function projectPath(
  project: CaseSlugSource,
  projects?: readonly CaseSlugSource[]
) {
  return `/work/${projectSlug(project, projects)}`;
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
  return projects.find(project => projectSlug(project, projects) === key);
}

/** Home and a case link are the same page with a modal, so scrolling should stay put. */
export function isCaseSurface(pathname: string) {
  return pathname === "/" || pathname === "/work" || pathname.startsWith("/work/");
}

/**
 * Closing a case always returns to the work section.
 * History back restores `/` without `#work` and the scroll offset from before
 * the dialog opened, so the work list stays wherever the reader had left it.
 */
export function caseCloseHref() {
  return "/#work";
}

/**
 * Moving between the homepage and a case keeps the current offset.
 * A hash such as `#work` asks for alignment instead.
 */
export function keepsStoredCaseScroll(
  previousPath: string,
  pathname: string,
  hash: string
) {
  return (
    previousPath !== pathname &&
    isCaseSurface(previousPath) &&
    isCaseSurface(pathname) &&
    hash.length === 0
  );
}
