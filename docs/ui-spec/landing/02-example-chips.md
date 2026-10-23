# Example chips

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-07-02

## What it is

Three pill buttons under the free-text box: "I want to monetize a hobby" / "I'm already
running a business — show me the write-off rules for it" / "I don't know what to start yet — show
me what's available". Since 2026-10-23 they are in the words file (`frontDoorWords.examplePrompts`,
`lib/front-door/words.ts`), and the second no longer says "optimize my write-offs", which read as a
promise about the person's taxes.

## What it does (behavior on interact)

`onClick` → `setText(prompt)`. That's it — fills the textarea, does not submit, does not
call any API. The user still has to hit `Map it →`.

## Why it exists (user purpose)

Shows the box can take any phrasing, not just "typical" venture descriptions — nudges
people who freeze on a blank box.

## State touched

Local `text` state only. No journey state, no API call.

## Data source

`frontDoorWords.examplePrompts` in `lib/front-door/words.ts` (the component held them as
`EXAMPLE_PROMPTS` until 2026-10-23). Not a catalog/engine value: example copy, held to the words
files' checks (no verdict, no times).
