# Example chips

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-07-02

## What it is

Three pill buttons under the free-text box (`EXAMPLE_PROMPTS`, hardcoded in the
component): "I want to monetize a hobby" / "I'm already running a business — optimize my
write-offs" / "I don't know what to start yet — show me what's available".

## What it does (behavior on interact)

`onClick` → `setText(prompt)`. That's it — fills the textarea, does not submit, does not
call any API. The user still has to hit `Map it →`.

## Why it exists (user purpose)

Shows the box can take any phrasing, not just "typical" venture descriptions — nudges
people who freeze on a blank box.

## State touched

Local `text` state only. No journey state, no API call.

## Data source

Hardcoded array in the component (`EXAMPLE_PROMPTS`). Not a catalog/engine value — flagged
per `docs/engines/README.md` § duplication only if these ever needed to reflect real
taxonomy/engine data; today they're just example copy, so hardcoding is fine.
