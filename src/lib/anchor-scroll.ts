/** Space kept between the sticky header and an anchored section. */
export const ANCHOR_GAP = 12;

export function anchorClearance(headerHeight: number, gap = ANCHOR_GAP) {
  return Math.max(0, headerHeight) + gap;
}

/** Document offset that places the target just below the sticky header. */
export function anchorScrollTop(
  scrollY: number,
  targetViewportTop: number,
  headerHeight: number,
  gap = ANCHOR_GAP
) {
  return scrollY + targetViewportTop - anchorClearance(headerHeight, gap);
}

/**
 * Lenis subtracts the target's `scroll-margin-top` and then adds `offset`.
 * Returning `margin - clearance` lands on the same pixel as `anchorScrollTop`.
 */
export function lenisAnchorOffset(
  scrollMarginTop: number,
  headerHeight: number,
  gap = ANCHOR_GAP
) {
  const margin = Number.isFinite(scrollMarginTop) ? scrollMarginTop : 0;
  return margin - anchorClearance(headerHeight, gap);
}

/**
 * A case dialog sets `dialog-open`, which hides overflow and stops Lenis.
 * Scrolling in that frame is ignored or clamped back to the hero.
 */
export function anchorScrollReady(hasTarget: boolean, dialogOpen: boolean) {
  return hasTarget && !dialogOpen;
}
