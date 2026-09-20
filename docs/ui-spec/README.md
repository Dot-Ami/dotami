# UI behavior specs

Last updated: 2026-06-10

Per-page catalogs of **what each interactive control does and why** — purpose-first, backend wiring deferred until Phase 5.

## Convention

| Layer | Location | Purpose |
|-------|----------|---------|
| Design workshop | the dated S2.5.4 notes at the top of each `docs/ui-spec/<page>/` file | Page job, must-show/hide, maintainer sign-off |
| **UI behavior spec** | `docs/ui-spec/<page>/` | Control groups: behavior, copy, state fields, downstream consumers |
| Backend wiring | TBD in each control file | Postgres, APIs, validation — filled in Phase 5 |

## Folder structure

```
docs/ui-spec/
  README.md
  _control-template.md
  <page>/
    _index.md          # page overview + control index
    <control-group>.md # one file per logical control group
```

**One folder per page** (e.g. `intake/`, `landing/`, `explore/`, `cockpit/`).  
**One file per control group** — not one file per pixel (e.g. all four goal tiles live in `01-goals.md`).

## When to update

When adding, removing, or changing any clickable, form field, search bar, toggle, or nav control:

1. Update the matching `docs/ui-spec/<page>/<group>.md`
2. Update the dated note at the top of the page's `_index.md` if the page's purpose changed

## Template

Copy [\_control-template.md](./_control-template.md) for new control groups.
