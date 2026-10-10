/**
 * [8i] Whether DotAmi may still ask the graphics chip to draw a HEIC photo in this session.
 *
 * A HEIC that crashes the decoder can take Chromium's graphics process down with it, and after three
 * such crashes in a short window Chromium switches hardware graphics off for the rest of the session.
 * So DotAmi never retries: after one failure (a decoder error, a time-out, the worker dying) it stops
 * showing HEIC photos until it is restarted (a condition of the maintainer's choice of option D,
 * docs/connectors/heic-decoder-review.md § What was chosen).
 *
 * Two places remember it:
 *   - this page, in memory (gone on a reload, so also:)
 *   - in the desktop app, the main process (desktop/main.mjs), which also hears about every crash of
 *     the graphics process ('child-process-gone', type 'GPU') and keeps the answer until the app
 *     quits. The page asks it through `window.dotamiDesktop`, the two calls desktop/window-preload.cjs
 *     exposes. DotAmi run from source in a browser has no such bridge; the page's memory is all there is.
 */

/** What desktop/window-preload.cjs puts on the window; absent outside the desktop app. */
interface DesktopBridge {
  heicStopped(): Promise<boolean>;
  heicFailed(): void;
}

const bridge = (): DesktopBridge | null => {
  const candidate = typeof window === "undefined" ? undefined : (window as unknown as { dotamiDesktop?: Partial<DesktopBridge> }).dotamiDesktop;
  return candidate && typeof candidate.heicStopped === "function" && typeof candidate.heicFailed === "function" ? (candidate as DesktopBridge) : null;
};

let stoppedHere = false;

/** True once a HEIC failed in this page, or the desktop app says one failed (or its graphics process stopped). */
export async function heicStopped(): Promise<boolean> {
  if (stoppedHere) return true;
  const desktop = bridge();
  if (!desktop) return false;
  try {
    return (await desktop.heicStopped()) === true;
  } catch {
    // The app can't answer: don't risk the graphics chip.
    return true;
  }
}

/** Records a failure here and, in the desktop app, in the main process. */
export function heicFailed(): void {
  stoppedHere = true;
  try {
    bridge()?.heicFailed();
  } catch {
    // The page's own memory already holds it.
  }
}

/** For the tests: forget a failure recorded in this page. */
export function __resetHeicSessionForTests(): void {
  stoppedHere = false;
}
