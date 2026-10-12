/**
 * Waiting for a page drawn by the server to be taken over by React (hydrated), for the browser and
 * desktop tests.
 *
 * The server sends the front page already drawn, so its box can be typed into before the page's
 * scripts have run. A test that types then is testing "typed before the page finished loading",
 * whether it meant to or not: that is how the desktop test kept failing on CI's slower Windows
 * machines (three times on 10 and 11 October 2026, "Map it" greyed out with the words in the box).
 *
 * There is no sign on the page itself that React has taken over, and adding one only for tests would
 * put a test hook in the product. So this reads the property React attaches to every element it has
 * taken over (`__reactProps$<random>`, the element's current props). That is React's internal
 * detail: if a React update renames it, the wait times out with the message below instead of passing
 * by mistake.
 */
import { expect, type Locator } from "@playwright/test";

/** True once React has taken over this element. Runs in the page, so it must stand alone. */
export function ownedByReact(element: Element): boolean {
  return Object.keys(element).some((key) => key.startsWith("__reactProps$"));
}

/** Waits until React has taken over the element (the page has hydrated around it). */
export async function waitForReact(element: Locator, timeout = 60_000): Promise<void> {
  await expect
    .poll(() => element.evaluate(ownedByReact), {
      timeout,
      intervals: [50, 100, 250],
      message: "React never took over this element (or React no longer marks it with __reactProps$)",
    })
    .toBe(true);
}
