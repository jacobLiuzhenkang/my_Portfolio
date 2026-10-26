import { describe, expect, it } from "vitest";
import {
  anchorClearance,
  anchorScrollReady,
  anchorScrollTop,
  lenisAnchorOffset,
} from "../../src/lib/anchor-scroll";

/** Lenis 1.3 adds offset after subtracting scroll-margin. NaN margin is 0. */
function lenisLanding(
  scrollY: number,
  targetViewportTop: number,
  scrollMarginTop: number,
  headerHeight: number
) {
  const margin = Number.isFinite(scrollMarginTop) ? scrollMarginTop : 0;
  return (
    targetViewportTop +
    scrollY -
    margin +
    lenisAnchorOffset(scrollMarginTop, headerHeight)
  );
}

describe("hash anchor alignment", () => {
  it("places #work just below the sticky header on both scroll paths", () => {
    const header = 78;
    const workTop = 880;
    const native = anchorScrollTop(0, workTop, header);
    expect(native).toBe(workTop - anchorClearance(header));
    expect(lenisLanding(0, workTop, 90, header)).toBe(native);
    expect(lenisLanding(40, 520, 80, 64)).toBe(anchorScrollTop(40, 520, 64));
    expect(lenisLanding(0, workTop, Number.NaN, header)).toBe(native);
  });

  it("waits until the case dialog releases the page scroll lock", () => {
    expect(anchorScrollReady(true, true)).toBe(false);
    expect(anchorScrollReady(true, false)).toBe(true);
    expect(anchorScrollReady(false, false)).toBe(false);
  });
});
