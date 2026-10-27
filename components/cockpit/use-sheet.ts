"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/**
 * The cockpit's sheets on a phone (docs/architecture/future-cockpit.md § 2, "Folding and phone width"):
 * below 768 px the venture details and the right-hand panel open as full-width sheets over the page. A
 * sheet that covers the page has to take the keyboard with it, or Tab walks through buttons nobody can
 * see. While one is open: focus goes to its first control, Tab and Shift+Tab go round inside it, Escape
 * closes it, and when it closes focus goes back to the button that opened it. The page behind is made
 * inert by the cockpit (so a screen reader doesn't wander there either).
 */

/** Tailwind's `max-md`: the width below which the rail and the panel are sheets. */
const PHONE = "(width < 48rem)";

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True below 768 px. The server draws for a wide window, where nothing is a sheet. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The controls inside the sheet that are drawn now, in Tab order (a sheet holds no positive tabindex). */
function drawnControls(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

/** True when focus is somewhere a person can still see it: drawn, and not the page itself. */
function focusIsDrawn(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body && active.isConnected && active.getClientRects().length > 0;
}

/**
 * `also`, when given, is a box drawn outside the sheet that belongs with it while it is open (the failed-save bar
 * on a phone, which sits over the panel's sheet): Tab and Shift+Tab go round the sheet's controls and then its.
 */
export function useSheet(
  open: boolean,
  sheet: RefObject<HTMLElement | null>,
  onClose: () => void,
  also?: RefObject<HTMLElement | null>,
): void {
  // What had focus before the sheet opened. Kept across a sheet folding and opening again, so it still
  // points at the card or button the person started from.
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // While the sheet is closed, the last thing that took focus: the browser may already have moved focus off
  // the button that opened the sheet (the page behind turns inert in the same drawing) by the time the
  // effect below runs.
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const record = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) lastFocused.current = event.target;
    };
    document.addEventListener("focusin", record);
    return () => document.removeEventListener("focusin", record);
  }, [open]);

  useEffect(() => {
    const root = sheet.current;
    if (!open || !root) return;

    const active = document.activeElement;
    if (!root.contains(active)) {
      const before = lastFocused.current;
      opener.current =
        active instanceof HTMLElement && active !== document.body ? active : before && !root.contains(before) ? before : opener.current;
      drawnControls(root)[0]?.focus();
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as Node | null;
      const extra = also?.current ?? null;
      const within = (node: Node | null) => node !== null && (root.contains(node) || (extra?.contains(node) ?? false));
      // A dialog drawn over the sheet (the agree prompt) has its own keys.
      const inSheet = within(target);
      if (event.key === "Escape" && inSheet) {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab" || !(inSheet || target === document.body)) return;
      // The sheet's own controls, then the ones in `also`: the ring Tab goes round.
      const inner = drawnControls(root);
      const outer = extra ? drawnControls(extra) : [];
      const controls = [...inner, ...outer];
      if (controls.length === 0) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      const now = document.activeElement;
      // The step between the two boxes is taken here too: in the page's order they aren't next to each other.
      const lastInner = inner[inner.length - 1];
      const firstOuter = outer[0];
      if (event.shiftKey && (now === first || !within(now))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (now === last || !within(now))) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && lastInner && firstOuter && now === lastInner) {
        event.preventDefault();
        firstOuter.focus();
      } else if (event.shiftKey && lastInner && firstOuter && now === firstOuter) {
        event.preventDefault();
        lastInner.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      // Closed (or folded to its bar): unless focus already sits on something drawn, give it back to what
      // opened the sheet, if that is still on the page.
      const back = opener.current;
      if (!focusIsDrawn() && back && back.isConnected && back.getClientRects().length > 0) back.focus();
    };
  }, [open, sheet, also]);
}
