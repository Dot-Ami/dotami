/**
 * The clutter limit's measurer (docs/ui-spec/README.md, "The layout rule"), shared by e2e/clutter-budget.spec.ts,
 * which holds ten screens to their budgets at three sizes, and e2e/idea-sweep.spec.ts, which measures every
 * screen of twelve ideas' journeys. One function, so the two can never count differently.
 *
 * Four things are measured, as a person arriving on the screen sees it (nothing clicked, nothing scrolled):
 *
 * - regions: drawn blocks marked `data-region="<name>"`, anywhere on the page;
 * - controls: usable links, buttons, boxes, menus and switches inside the first window, at least 24 px of
 *   each showing (or all of it, if smaller);
 * - text sizes: the distinct computed font sizes of the text drawn on the page;
 * - the smallest text size.
 *
 * And, since 2026-11-11, words (the maintainer's pick w4 A, story S2.5.52: count and report, no limit): how many a
 * person meets in the first window, and on the whole page as it opens. Reported only (the quality report's clutter
 * table): no budget holds them. His note: "We can always delete this -or at least block it- for once Dotami is in a
 * good place where it's clean and organized."
 *
 * Regions are counted by their marks, so the measurer also lists any drawn landmark or section (header, nav,
 * aside, footer, section, main, and their roles, a group) that is no region, sits inside none and holds none.
 */
import type { Clutter } from "./budgets";

/** What one measurement found: the four numbers, and what was counted, for the report. */
export interface Measured extends Clutter {
  regionNames: string[];
  controlNames: string[];
  sizesPx: number[];
  /** Drawn landmarks and sections that are no region, inside none and hold none: each fails the test. */
  unmarkedBlocks: string[];
  /** Words in the first window, before any scrolling and not under another block (reported, no budget). */
  wordsFirstWindow: number;
  /** Words drawn on the whole page as it opens: scrolling reaches them, no click is needed (reported, no budget). */
  wordsWholePage: number;
}

/**
 * Measures the page as it is drawn now. Runs in the page (`page.evaluate(measurePage)`), so it must stand alone.
 *
 * Controls are counted only where a person can see them in the first window: a control is clipped by every
 * box around it that hides or scrolls its overflow (the road's own area, the rail), then by the window.
 * Text is counted anywhere on the page, scrolled to or not, except text drawn only for a screen reader (a
 * box of 1 px or less that hides its overflow, Tailwind's `sr-only`).
 */
export function measurePage(): Measured {
  const CONTROL =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="combobox"], [contenteditable="true"]';

  const drawn = (el: Element) => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /**
   * Whether enough of the element shows in the first window to be seen and pressed, after every box around
   * it that clips it: at least 24 px each way (WCAG 2.2's smallest target size, 2.5.8), or all of it where
   * it is smaller than that. A card's bare top edge peeking out under a fold doesn't count.
   */
  const MIN_SHOWN_PX = 24;
  const inFirstWindow = (el: Element) => {
    const r = el.getBoundingClientRect();
    let left = r.left;
    let top = r.top;
    let right = r.right;
    let bottom = r.bottom;
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node !== el && (style.overflowX !== "visible" || style.overflowY !== "visible")) {
        const box = node.getBoundingClientRect();
        left = Math.max(left, box.left);
        top = Math.max(top, box.top);
        right = Math.min(right, box.right);
        bottom = Math.min(bottom, box.bottom);
      }
      // Boxes around a fixed element don't clip it (a sheet, the panel's bar on a phone).
      if (style.position === "fixed") break;
    }
    left = Math.max(left, 0);
    top = Math.max(top, 0);
    right = Math.min(right, window.innerWidth);
    bottom = Math.min(bottom, window.innerHeight);
    // Half a pixel of slack: sub-pixel layout can draw a whole 24 px control at 23.8.
    const enough = (shown: number, whole: number) => shown > 0 && shown >= Math.min(MIN_SHOWN_PX, whole) - 0.5;
    return enough(right - left, r.width) && enough(bottom - top, r.height);
  };

  const regionNames = [...document.querySelectorAll<HTMLElement>("[data-region]")]
    .filter(drawn)
    .map((el) => el.dataset.region ?? "");

  // Regions are counted by their marks, so a block nobody marked would slip past the count. Every drawn
  // landmark or section must be a marked region, sit inside one, or hold one (a page's <main> around its
  // regions); any other is listed here and fails the test.
  const BLOCK =
    'header, nav, aside, footer, section, main, [role="region"], [role="group"], [role="banner"], [role="navigation"], [role="complementary"], [role="contentinfo"], [role="main"], [role="search"], [role="form"]';
  const unmarkedBlocks = [...document.querySelectorAll<HTMLElement>(BLOCK)]
    .filter((el) => drawn(el) && !el.closest("[data-region]") && !el.querySelector("[data-region]"))
    .map((el) => {
      const role = el.getAttribute("role");
      const name = el.getAttribute("aria-label") ?? el.id ?? "";
      return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${name ? ` "${name}"` : ""}`;
    });

  const controlNames = [...document.querySelectorAll(CONTROL)]
    .filter((el) => {
      // A control inside another (a button inside a link) is one thing to press.
      if (el.parentElement?.closest(CONTROL)) return false;
      if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") return false;
      // Behind a sheet: the page under it can't be used.
      if (el.closest("[inert]")) return false;
      return drawn(el) && inFirstWindow(el);
    })
    .map((el) => {
      const name = (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
      return `${el.tagName.toLowerCase()}: ${name.slice(0, 60)}`;
    });

  /** Text only a screen reader hears: inside a box of 1 px or less that hides its overflow. */
  const screenReaderOnly = (el: Element) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = node.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) return true;
      }
    }
    return false;
  };

  const sizes = new Set<number>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, noscript, template")) continue;
    if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (screenReaderOnly(parent)) continue;
    sizes.add(Math.round(parseFloat(getComputedStyle(parent).fontSize) * 100) / 100);
  }
  const sizesPx = [...sizes].sort((a, b) => a - b);

  // Words (since 2026-11-11, w4 A; the rules of FORGE's S2.5.52 count, walk.mjs `countWords`). A word is a run of
  // characters between spaces holding a letter or a digit, counted where its middle is drawn: not inside a closed
  // fold, not cut off for good by a box that hides its overflow (a box that scrolls doesn't: scrolling reaches the
  // word), not for a screen reader alone. The grey hint in an empty box and the choice a closed menu shows count too.
  // "First window": also inside the window and every box that clips it, and not under another block.
  const HAS_WORD = /[\p{L}\p{N}]/u;
  type Box = { left: number; top: number; right: number; bottom: number };
  const clipsFor = (el: Element): { hard: Box; view: Box } => {
    const hard: Box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    const view: Box = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    let scrollsX = false;
    let scrollsY = false;
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        view.left = Math.max(view.left, box.left);
        view.right = Math.min(view.right, box.right);
        if (style.overflowX === "auto" || style.overflowX === "scroll") scrollsX = true;
        else if (!scrollsX) {
          hard.left = Math.max(hard.left, box.left);
          hard.right = Math.min(hard.right, box.right);
        }
      }
      if (style.overflowY !== "visible") {
        view.top = Math.max(view.top, box.top);
        view.bottom = Math.min(view.bottom, box.bottom);
        if (style.overflowY === "auto" || style.overflowY === "scroll") scrollsY = true;
        else if (!scrollsY) {
          hard.top = Math.max(hard.top, box.top);
          hard.bottom = Math.min(hard.bottom, box.bottom);
        }
      }
      if (style.position === "fixed") break;
    }
    return { hard, view };
  };
  const inside = (x: number, y: number, b: Box) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  const seenAt = (el: Element, x: number, y: number, view: Box) => {
    if (!inside(x, y, view)) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };
  let wordsWholePage = 0;
  let wordsFirstWindow = 0;
  const wordWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = wordWalker.nextNode(); node; node = wordWalker.nextNode()) {
    const text = node.textContent ?? "";
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, noscript, template, option, nextjs-portal")) continue;
    if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    if (screenReaderOnly(parent)) continue;
    const { hard, view } = clipsFor(parent);
    for (const match of text.matchAll(/\S+/g)) {
      if (!HAS_WORD.test(match[0])) continue;
      range.setStart(node, match.index!);
      range.setEnd(node, match.index! + match[0].length);
      const r = range.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (!inside(x, y, hard)) continue;
      wordsWholePage += 1;
      if (seenAt(parent, x, y, view)) wordsFirstWindow += 1;
    }
  }
  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const shown =
      el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.textContent ?? "") : !el.value && el.type !== "hidden" ? (el.getAttribute("placeholder") ?? "") : "";
    const words = shown.split(/\s+/).filter((w) => HAS_WORD.test(w)).length;
    if (words === 0) continue;
    const { hard, view } = clipsFor(el);
    const x = r.left + Math.min(r.width / 2, 40);
    const y = r.top + Math.min(r.height / 2, 16);
    if (!inside(x, y, hard)) continue;
    wordsWholePage += words;
    if (seenAt(el, x, y, view)) wordsFirstWindow += words;
  }

  return {
    regions: regionNames.length,
    controls: controlNames.length,
    textSizes: sizesPx.length,
    smallestTextPx: sizesPx[0] ?? 0,
    regionNames,
    controlNames,
    sizesPx,
    unmarkedBlocks,
    wordsFirstWindow,
    wordsWholePage,
  };
}
