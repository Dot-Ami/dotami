import { typedWayWords } from "./words";

/**
 * The typed way's screens in order (docs/ui-spec/intake/_index.md): the intake's About you, Confirm and Ground it,
 * then Pick a future's three steps on the same page (the maintainer's call 1 of 2026-10-21). One numbering runs
 * from the first to the last, so the person never sees "3 of 3" and then "1 of 3" (the screen review of
 * 2026-10-23). Step 2 is one screen whichever part it shows (area, region, or the short screen outside Alberta).
 */
export const TYPED_WAY_SCREENS = ["about", "confirm", "ground", "work", "where", "pick"] as const;
export type TypedWayScreen = (typeof TYPED_WAY_SCREENS)[number];

/**
 * "n of total · name" for a screen of the typed way. `startsAtAbout` is false for a person with a saved idea,
 * whose intake opens on Confirm (issue #38): the count then starts there and has one screen fewer.
 */
export function typedWayCount(screen: TypedWayScreen, startsAtAbout: boolean): string {
  const screens: readonly TypedWayScreen[] = startsAtAbout ? TYPED_WAY_SCREENS : TYPED_WAY_SCREENS.filter((s) => s !== "about");
  const index = screens.indexOf(screen);
  // About you reached by Back from a count that started at Confirm: its name alone, never a number out of range.
  if (index === -1) return typedWayWords.names[screen];
  return typedWayWords.count(index + 1, screens.length, typedWayWords.names[screen]);
}
