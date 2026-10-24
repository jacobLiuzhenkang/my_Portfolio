import { caseMarkdown, recentCaseLayout } from "../contracts/project-content";
import {
  recentProjectBaselines,
  recentDetailedProjectBaselines,
} from "./recent-project-baselines";

type CaseCopy = { description: string; content: string };
export type RecentProjectKind = keyof typeof recentProjectBaselines;

/** Match only known imports, including their previous Markdown layout migration. */
export function isKnownRecentCase(content: string, kind: RecentProjectKind) {
  return [
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
  return { patch, customFieldsKept };
}
