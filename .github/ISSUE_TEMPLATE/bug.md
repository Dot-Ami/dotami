---
name: Bug (something in the app is wrong or broken)
about: A screen, a card, a save, a crash — anything that behaves differently than it reads
title: "bug: <what goes wrong>"
labels: bug
---

## What you did

The steps, in order. If it started from the intake, the sentence you typed helps a lot —
the parser is deterministic, so the same words reproduce the same map.

## What happened

What you saw. A screenshot of the card or screen is worth a paragraph.

## What you expected instead

One line.

## Your setup

- Node version (`node -v`), PostgreSQL version, operating system
- Did `npm run ci:quality` pass before you hit this? If it failed, the last 20 lines.

## Anything in the console or the server log

Paste the error if there is one. "No error, it just showed the wrong thing" is a fine answer.

---

*A wrong figure, a lapsed program or a dead link is not this template — use **Wrong citation**,
which asks for the source that shows the correct state.*
