# Section 02 — The venture

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: chip set + text inputs

Last updated: 2026-06-11  
Workshop status: **Signed off — Phase 4 intake workshop**

## What it is

Wizard **step 2** — describes what kind of venture the user is building.

## What it does (behavior on interact)

| Control | Behavior |
|---------|----------|
| Venture type chips | Single-select: `service`, `product`, or `side-gig` → `intake.ventureType` |
| Activity tags | Multi-select chips → `intake.activityTags[]` |
| Describe it | Optional text → `intake.description` |
| Venture name | Optional text → `intake.name` (defaults to "My Venture" in scenario if empty) |

All updates are immediate in journey state. Live preview on the right updates node count/profile as fields change.

Workshop direction:

- Venture type stays single-select because it is the clearest first branch for the map.
- Activity tags stay multi-select and plain-language; they are not expert taxonomies.
- Description and venture name stay optional. Description can later help AI/backend labeling, but Phase 4 does not parse free text.
- The right preview should show **what this venture shape may unlock**: likely write-offs, grant/program hints, compliance checks, and next-map branches tied to selected tags.

## Why it exists (user purpose)

Venture shape drives which CFE nodes, paths, and engine annotations surface. Type + tags narrow the map without requiring expert knowledge.

Step 2 should feel like the user has already earned a first map, not just filled in a profile. A service consultant, SaaS builder, manufacturer, or creator should see different sourced hints as soon as the venture type/tags are selected.

## Copy (current labels)

- Section title: *The venture*
- Venture type — pick one
- Activity tags — what kind of work? pick all that apply
- Describe it — optional
- Venture name — optional

Activity tags: Software / SaaS, AI / ML / R&D, Consulting, Trades, Content / streaming, E-commerce / retail, Manufacturing, Real estate, Creator / influencer, Healthcare / wellness

## Immediate-value preview requirements

When Step 2 fields change, the live preview should eventually surface cards such as:

- `Home office expenses may apply` when service/side-gig + consulting/creator/work-from-home-like tags are selected.
- `R&D / SR&ED lens may matter` when software, AI/ML/R&D, or manufacturing tags are selected.
- `Inventory / COGS tracking may matter` when product, e-commerce, retail, or manufacturing tags are selected.
- `Professional services write-offs may apply` when consulting/service tags are selected.

Each card must use compass language (`may apply`, `if this applies`) and include a reputable source chip when available.

## State touched (field names only)

- `intake.ventureType`
- `intake.activityTags[]`
- `intake.description`
- `intake.name`

## Downstream consumers (where the data goes today)

- **`buildScenarioFromIntake`** — profile name, type, province, revenue, hireFirst, employment
- **`/explore`** — activity tags + province in path scoring criteria
- **Live preview** — scenario graph node list

## Cleanup / open questions

- Activity tag list is static for Phase 4; engine-driven tag ranking is Phase 5+.
- Describe field is not parsed into structured fields yet; future backend/AI can label it into goal/path tags.
- Walkthrough vs cockpit edit parity remains a future settings/edit-surface question.

## Backend wiring

TBD — to be specified later. Backend should map venture type + activity tags into preview-card candidates without changing the Phase 4 control surface.
