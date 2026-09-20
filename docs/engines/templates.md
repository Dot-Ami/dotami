# Templates Engine — Reasoning Conventions

Catalog: `lib/engines/templates/v2026/references.ts` (~6 refs as of 2026-07-02) · Priority: **low**

## What it holds

Vetted external document references (registration forms, agreement templates, filing
guides) rendered in the cockpit templates rail.

## The one hard rule

**DotAmi never generates binding documents.** Templates entries are *pointers with prep
notes* — link out to the authoritative source (registry, CRA form, vetted provider) and
tell the user what to prepare before they use it. Any feature idea that has DotAmi filling
in, assembling, or emitting a legal/tax document is out of scope at every version and
violates the "prep tool for your accountant and lawyer" positioning. Decline and flag.

## How it should reason (target — thin by design)

Relevance filtering only: show references whose context (structure, province, activity,
active CFE nodes) matches the profile. A sole prop in AB shouldn't see federal
incorporation articles at the top. Reuses the same predicate DSL; no states beyond
show/don't-show — a template is never "yellow".

## Authoring rules

1. `externalUrl` must point at the authoritative source (government registry, CRA form
   page) or an explicitly vetted provider — no blogspam, no SEO content farms.
2. `prepNote` is compass-voiced: what information the user should gather, what decisions
   the document forces, what to ask the professional.
3. Risk chips don't attach to templates (`risk: null` in the unlock contract), but a
   template can *reference* a decision that carries risk — the risk lives on the strategy
   entry, not the pointer.
4. Lowest verification burden of the six engines, but link rot is real — `lastVerified`
   still applies; a dead registry link in the cockpit is an embarrassment.
