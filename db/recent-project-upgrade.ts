import { viformCommercialBaseline } from "./recent-commercial-baseline";
import { caseMarkdown, recentCaseLayout } from "../contracts/project-content";
import {
  recentProjectBaselines,
  recentDetailedProjectBaselines,
} from "./recent-project-baselines";

type CaseCopy = { description: string; content: string; tags?: string[] };
export type RecentProjectKind = keyof typeof recentProjectBaselines;

/** Match only known imports, including their previous Markdown layout migration. */
export function isKnownRecentCase(content: string, kind: RecentProjectKind) {
  return [
    ...(kind === "viform" ? [viformCommercialBaseline] : []),
    recentProjectBaselines[kind],
    recentDetailedProjectBaselines[kind],
  ].some(({ content: original }) =>
    [
      original,
      caseMarkdown(original),
      recentCaseLayout(original, kind),
    ].includes(content)
  );
}

/** Compare each field independently so an administrator's edits survive upgrades. */
export function planRecentProjectUpdate(
  existing: CaseCopy,
  next: CaseCopy,
  kind: RecentProjectKind
) {
  const patch: Partial<CaseCopy> = {};
  const customFieldsKept: (keyof CaseCopy)[] = [];
  if (existing.description !== next.description) {
    if (
      [
        ...(kind === "viform" ? [viformCommercialBaseline.description] : []),
        recentProjectBaselines[kind].description,
        recentDetailedProjectBaselines[kind].description,
      ].some(description => description === existing.description)
    )
      patch.description = next.description;
    else customFieldsKept.push("description");
  }
  if (existing.content !== next.content) {
    if (isKnownRecentCase(existing.content, kind)) patch.content = next.content;
    else customFieldsKept.push("content");
  }
  if (
    kind === "viform" &&
    existing.tags &&
    next.tags &&
    JSON.stringify(existing.tags) !== JSON.stringify(next.tags)
  ) {
    if (
      JSON.stringify(existing.tags) ===
      JSON.stringify(viformCommercialBaseline.tags)
    )
      patch.tags = next.tags;
    else customFieldsKept.push("tags");
  }
  return { patch, customFieldsKept };
}
