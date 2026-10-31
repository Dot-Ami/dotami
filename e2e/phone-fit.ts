/**
 * Phone width (docs/ui-spec/README.md, "The layout rule"; the screen review of 2026-10-23 found the ideas page
 * 415 px wide and Your expenses 429 px wide in a 375 px window, and the cockpit's gauges in a sideways strip):
 * what a 375 px window can't show without scrolling sideways. Run in the page by `e2e/phone-width.spec.ts`, so
 * it must stand alone.
 *
 * Three things are read:
 * - `page`: how far the page itself is wider than the window (0 when it fits);
 * - `wide`: every drawn element whose right edge is past the window's and that no box around it clips, named so a
 *   failure says what pushed the page out;
 * - `scrolls`: every drawn box that scrolls its own content sideways (its overflow-x is auto or scroll and what it
 *   holds is wider than it), but the road, whose columns are swiped across on purpose (`data-region="road"`,
 *   components/cockpit/strategy-map.tsx). A sheet that scrolls down scrolls sideways too (overflow-y auto makes
 *   overflow-x auto), so content wider than the sheet is held inside it, past `wide`, and only this sees it (the
 *   review of #209's merge, 2026-10-26: until then a box like that was counted as clipping and nothing was said).
 */
export interface SidewaysReport {
  page: number;
  wide: string[];
  scrolls: string[];
}

export function sidewaysReport(): SidewaysReport {
  const width = window.innerWidth;
  const clipped = (el: Element) => {
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible") return true;
      if (style.position === "fixed") return false;
    }
    return false;
  };
  // The boxes meant to scroll sideways on a phone, and only these: the road's own area. Written here, not imported,
  // because this function runs in the page on its own.
  const SCROLLS_ON_PURPOSE = '[data-region="road"]';
  const nameOf = (el: Element) =>
    (el.getAttribute("aria-label") ?? el.getAttribute("data-region") ?? ((el as HTMLElement).innerText || el.id || ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
  const wide: string[] = [];
  const scrolls: string[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const overflowX = getComputedStyle(el).overflowX;
    // Half a pixel of slack, for sub-pixel layout.
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 0.5 && !el.matches(SCROLLS_ON_PURPOSE)) {
      scrolls.push(`${el.tagName.toLowerCase()} ${el.scrollWidth}>${el.clientWidth} ${nameOf(el)}`);
    }
    if (r.right <= width + 0.5 || clipped(el)) continue;
    wide.push(`${el.tagName.toLowerCase()} r=${Math.round(r.right)} ${nameOf(el)}`);
  }
  return { page: Math.max(0, document.documentElement.scrollWidth - width), wide, scrolls };
}
