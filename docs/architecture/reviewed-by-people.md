# Reviewed by people: a count of the people who have read a source (planned, not built)

Last updated: 2026-11-11 (written on the maintainer's w2, story S2.5.52; nothing here is built)

## Why this file exists

On 2026-11-11 the maintainer took the line saying how a source was checked off every screen
([engines/citations.md](../engines/citations.md), § No screen says it). In the same note he asked for its
replacement to be planned for later, whole:

> I don't think we even need this. Its just more to read for the sake of it. If anything, this is a super useful tool for me as the developer for when I need to review something while building-> and it could also be useful as a back-end tool for when a real human HAS read something, and then that data could be cached and thre could be a ticker that says "Reviewed by 'x' amount of users", or " 'x' + user have read this". But there's really no need to have this line at all. Please plan out this feature for the back-end when we have users and set-up our analytics, but get rid of it for now. Make sure to update docs for a future build for when we actually start working on our back-end and analytics stories and tasks.

This is that plan. It waits for the stories it needs: a server, and the analytics he has picked how to run
(the maintainer's tracker, story S2.5.45 and its free-server tasks). Nothing here is decided beyond his words.

## What it would show

Under a source, one short line that counts people, never a verdict on the source: *Reviewed by 12 people*, or
*12 people have read this*. It counts reads a person marked themselves, on the official page's own source, not
visits, and says nothing about whether the page is right.

## What it needs (none of it exists yet)

1. **A way for a person to say they read a page.** A control beside the source (*I read this page*), which
   records the citation's id and the day, in the person's own data file first. Like every other answer, it
   can be taken back and deleted (his ruling of 2026-11-11, delete anything, anywhere).
2. **A server that adds the reads up.** DotAmi runs on the person's computer and sends nothing today
   (`lib/privacy/inventory.ts`). A count across people needs a server that receives a read, keeps a running
   total per citation, and serves the totals back. What it receives would be the citation's id and nothing
   about the person: no account, no address, no idea. Whether one person can be counted twice, and how that
   is stopped without knowing who they are, is a design question for that story.
3. **Consent first.** Sending a read anywhere is data leaving the computer: off until the person turns it on,
   after a plain warning, listed in the privacy inventory and the privacy log, and in the privacy policy before
   it ships. Questions about it go to the maintainer's lawyer list, never answered here.
4. **The cache.** The totals come back as one file the app reads when it can, and the screen says the day the
   count was taken. With no server reachable, the line is simply not drawn.

## What stays as it is

- `lastVerified`, `readBy` and `toolCheck` in the catalogs: they say how DotAmi's own maintainers checked a
  source, for the tests and the quality report. A person's count would sit beside them, never replace them.
- The maintainer as developer: `/api/readout` and `npm run quality:report` still give how each source was
  checked (his note: "a super useful tool for me as the developer").

## Where it would land on screen

Under the source's link, as one line ([ui-spec/README.md](../ui-spec/README.md), the layout rule's fifth line:
one line first). It adds no region and no button except *I read this page*.
