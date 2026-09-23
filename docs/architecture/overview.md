# DotAmi Architecture Overview

Last updated: 2026-09-22

## Layer map

```mermaid
flowchart TB
  Landing["/ (free-text front door)"] --> Intake["/intake (about you - confirm - ground it)"]
  Intake --> Cockpit["/cockpit (the map)"]
  Ventures["/ventures (saved ideas)"] --> Cockpit
  Cockpit --> Brain["lib/brain (deterministic rules engine)"]
  Intake --> Brain
  Brain --> engines
  subgraph engines [Read-only catalogs lib/engines/*/v2026]
    CFE[CFE lifecycle]
    Structure[Structure]
    Grants[Grants]
    Writeoffs[Write-offs]
    Compliance[Compliance]
    Templates[Templates]
    Risk[Risk]
  end
  Brain --> DB[(PostgreSQL: the person's answers only)]
  Cockpit -. optional .-> Law["law store (statute text)"]
```

## Routes

| Route | Layer | Key components |
|-------|-------|----------------|
| `/` | Discovery | `components/discovery/landing-page` |
| `/intake` | Discovery | `components/discovery/intake-page` |
| `/cockpit` | Cockpit | `components/cockpit/cockpit-page` |
| `/ventures` | Ideas | `components/ventures/ventures-page` |

## Folder layout

```
lib/
  engines/
    shared/types.ts       # EngineCitation, EngineCatalog, Province
    cfe/v2026/            # lifecycle nodes
    structure/v2026/      # entity ladder
    grants/v2026/
    writeoffs/v2026/
    compliance/v2026/
    templates/v2026/
    index.ts              # barrel export
  paths/v2026/            # exploration path catalog + scoring
  scenarios/              # user scenario state (Postgres-backed)
  journey/                # cross-route intake draft (sessionStorage)
  cfe/                    # shim re-export → engines/cfe (legacy imports)

components/
  discovery/
  exploration/
  cockpit/
  shared/                 # ui primitives, journey-provider
  node-detail-panel.tsx
  lens-chat-panel.tsx
  playbook-export-panel.tsx
```

## State boundaries

- **Engines:** read-only catalogs; never in Postgres
- **Scenario:** user profile + branch state in Postgres via Prisma
- **Journey draft:** intake + archetype selection in sessionStorage

## Stack

Next.js 15 App Router (15.5.24+, since 2026-09-20), React 19, TypeScript, Tailwind, Prisma, PostgreSQL, Recharts.
Self-hosted; no hosting provider is assumed. The optional intake parser is the only model call
(`ANTHROPIC_API_KEY`, off by default). React Flow, dagre and the Lens chat were removed in 2026-09.
