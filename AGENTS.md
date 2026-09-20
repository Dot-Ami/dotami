# DotAmi — agent instructions

Follow `CLAUDE.md` first — it holds the philosophy, the hard constraints and the gate.

Orientation for a new agent or contributor:

1. `README.md` (what it is) → `CLAUDE.md` (the rules) → `CONTRIBUTING.md` (how content is
   written and cited).
2. Touching a catalog? Read `docs/engines/README.md` and the engine's own `docs/engines/<engine>.md`.
3. Touching a screen? Read the matching `docs/ui-spec/<page>/` file and update it in the same commit.
4. Run `npm run ci:quality` before claiming green. Stop the dev server first.

Key reminders:

- Catalog data only in `lib/engines/*/v2026/`. Never encode venture or tax knowledge in components.
- Every rule, rate, threshold or date carries a typed citation with `lastVerified`. No numbers from memory.
- Compass, not GPS. No rankings, no "you should", no profile of the person.
- Not legal or tax advice, and the app never says otherwise.
- Sign commits off (`git commit -s`) — see `DCO.md`.
