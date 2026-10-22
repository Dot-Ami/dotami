import { countReadByAPerson, howCheckedWords, oldestRead, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { isNotSaid, salesTargetField } from "@/lib/scenarios/not-said";

import type { PlaybookSkeleton } from "./types";

function escapeYamlScalar(value: string): string {
  if (/[:#\n\r]/.test(value) || value.startsWith('"') || value.startsWith("'")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return value;
}

function formatProfileBlock(profile: PlaybookSkeleton["profile"]): string {
  // What a picked future was saved without is written "not said", never as the intake's starting values.
  // Each sales target is said or not on its own (2026-10-21): Keep on the what-if gives the first year only.
  const target = (year: 1 | 3, dollars: number) => (isNotSaid(profile, salesTargetField(year)) ? "not said" : dollars.toLocaleString("en-CA"));
  const lines = [
    `- **Name:** ${profile.name}`,
    `- **Type:** ${isNotSaid(profile, "venture-type") ? "not said" : profile.type}`,
    `- **Province:** ${profile.province}`,
    `- **Target revenue Y1 (CAD):** ${target(1, profile.targetRevenueY1)}`,
    `- **Target revenue Y3 (CAD):** ${target(3, profile.targetRevenueY3)}`,
    `- **Structure:** ${profile.structure}`,
    // "not-said": a future picked on Pick a future before anyone asked (2026-10-12).
    `- **Employment status:** ${profile.employmentStatus === "not-said" ? "not said" : profile.employmentStatus}`,
    `- **Hire-first lens:** ${profile.hireFirst ? "yes" : "no"}`,
  ];

  return lines.join("\n");
}

/**
 * Renders the full playbook markdown: front matter, deterministic catalog slices,
 * citations, disclaimer. S2.5.4h: catalog facts only, no LLM narrative.
 */
export function renderPlaybookMarkdown(skeleton: PlaybookSkeleton): string {
  const citations = skeleton.sections.flatMap((s) => s.citations);
  // The key keeps its old name for anything that reads it, but it is the oldest day one of these
  // sources was read, by anyone; a tool check is not a read (docs/engines/citations.md). The next
  // line says how many of them a person is recorded as having read.
  const oldestVerified = oldestRead(citations);

  const frontMatter = [
    "---",
    `title: ${escapeYamlScalar(`${skeleton.profile.name} — DotAmi playbook`)}`,
    `scenario_id: ${escapeYamlScalar(skeleton.scenarioId)}`,
    `catalog_last_verified: ${oldestVerified ? escapeYamlScalar(oldestVerified) : "n/a"}`,
    ...(citations.length > 0 ? [`sources_read_by_a_person: ${countReadByAPerson(citations)} of ${citations.length}`] : []),
    "generator: dotami-playbook",
    "---",
    "",
  ].join("\n");

  // An untouched default says so, as its chip does on the map (issue #5): this document goes to an
  // accountant, who would otherwise read the default as the person's choice.
  const decisionLines = skeleton.decisions.map(
    (d) =>
      `- **${d.label}:** ${d.selectedLabel}${d.decided ? "" : " (default, not picked yet)"} (\`${d.selectedNodeId}\`)`,
  );

  const body: string[] = [
    `# ${skeleton.profile.name} — venture playbook`,
    "",
    "> Planning information from the DotAmi catalog, not tax or legal advice.",
    "",
    "## Venture profile",
    "",
    formatProfileBlock(skeleton.profile),
    "",
    "## Active branch selections",
    "",
    ...decisionLines,
    "",
  ];

  for (const section of skeleton.sections) {
    body.push(`## ${section.heading}`, "");
    body.push(
      `*Stage key:* \`${section.stageKey}\` · *Nodes:* ${section.nodes.map((n) => n.nodeId).join(", ")}`,
      "",
    );

    body.push("### Catalog signals (deterministic)", "");

    for (const slice of section.nodes) {
      body.push(`#### ${slice.label}`, "");
      body.push("**Trigger**", "", slice.trigger, "");
      body.push("**Description**", "", slice.description, "");
      body.push("**Tax impact**", "", slice.taxImpact, "");
      body.push("**Lens — tax**", "", slice.lensTax, "");
      body.push("**Lens — legal**", "", slice.lensLegal, "");
      body.push("**Financial impact (summary)**", "", slice.financialSummary, "");

      if (slice.projectionNotes.length > 0) {
        body.push("**Projection notes (from catalog)**", "");

        for (const note of slice.projectionNotes) {
          body.push(`- ${note}`);
        }

        body.push("");
      }
    }

    if (section.citations.length > 0) {
      body.push("### Citations", "");

      for (const c of section.citations) {
        body.push(
          `- [${c.title}](${c.url}) — ${c.authority} / ${c.jurisdiction} · ${howCheckedWords(c)}`,
        );
        // A tool check's words go under its line, so the reader can see what was found on the page.
        for (const quote of toolCheckQuotes(c)) body.push(`  - *Words found on the page:* "${quote}"`);
        body.push(`  - *Note:* ${c.note}`);
      }

      body.push("");
    }

    // On a road written for all of Canada, the step panel's line for the other provinces' pages left out (task 28d).
    if (section.sourcesLeftOut) body.push(words.panel.sourcesOtherProvinces(section.sourcesLeftOut), "");
  }

  body.push("---", "", skeleton.disclaimer, "");

  return frontMatter + body.join("\n");
}
