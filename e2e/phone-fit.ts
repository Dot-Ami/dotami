/**
 * Phone width (docs/ui-spec/README.md, "The layout rule"; the screen review of 2026-10-23 found the ideas page
 * 415 px wide and Your expenses 429 px wide in a 375 px window, and the cockpit's gauges in a sideways strip):
 * what a 375 px window can't show without scrolling sideways. Run in the page by `e2e/phone-width.spec.ts`, so
 * it must stand alone.
 *
 * Two things are read:
 * - `page`: how far the page itself is wider than the window (0 when it fits);
 * - `wide`: every drawn element whose right edge is past the window's and that no box around it clips (a box
 *   that scrolls its own content sideways, like the road, holds what is past its edge on purpose), named so a
 *   failure says what pushed the page out.
 */
export interface SidewaysReport {
  page: number;
  wide: string[];
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
  const wide: string[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Half a pixel of slack, for sub-pixel layout.
    if (r.right <= width + 0.5 || clipped(el)) continue;
    const name = (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
    wide.push(`${el.tagName.toLowerCase()} r=${Math.round(r.right)} ${name}`);
  }
  return { page: Math.max(0, document.documentElement.scrollWidth - width), wide };
}
