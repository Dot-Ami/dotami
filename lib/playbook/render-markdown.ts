import type { PlaybookSkeleton } from "./types";

function escapeYamlScalar(value: string): string {
  if (/[:#\n\r]/.test(value) || value.startsWith('"') || value.startsWith("'")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return value;
}

function formatProfileBlock(profile: PlaybookSkeleton["profile"]): string {
  const lines = [
    `- **Name:** ${profile.name}`,
    `- **Type:** ${profile.type}`,
    `- **Province:** ${profile.province}`,
    `- **Target revenue Y1 (CAD):** ${profile.targetRevenueY1.toLocaleString("en-CA")}`,
    `- **Target revenue Y3 (CAD):** ${profile.targetRevenueY3.toLocaleString("en-CA")}`,
    `- **Structure:** ${profile.structure}`,
    `- **Employment status:** ${profile.employmentStatus}`,
    `- **Hire-first lens:** ${profile.hireFirst ? "yes" : "no"}`,
  ];

  return lines.join("\n");
}

/**
 * Renders the full playbook markdown: front matter, deterministic catalog slices,
 * citations, disclaimer. S2.5.4h: catalog facts only, no LLM narrative.
 */
export function renderPlaybookMarkdown(skeleton: PlaybookSkeleton): string {
  const citationDates = skeleton.sections.flatMap((s) => s.citations.map((c) => c.lastVerified));
  const oldestVerified = citationDates.length > 0 ? [...citationDates].sort()[0] : undefined;

  const frontMatter = [
    "---",
    `title: ${escapeYamlScalar(`${skeleton.profile.name} — DotAmi playbook`)}`,
    `scenario_id: ${escapeYamlScalar(skeleton.scenarioId)}`,
    `catalog_last_verified: ${oldestVerified ? escapeYamlScalar(oldestVerified) : "n/a"}`,
    "generator: dotami-playbook",
    "---",
    "",
  ].join("\n");

  const decisionLines = skeleton.decisions.map(
    (d) =>
      `- **${d.label}:** ${d.selectedLabel} (\`${d.selectedNodeId}\`)`,
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
          `- [${c.title}](${c.url}) — ${c.authority} / ${c.jurisdiction} · verified ${c.lastVerified}`,
        );
        body.push(`  - *Note:* ${c.note}`);
      }

      body.push("");
    }
  }

  body.push("---", "", skeleton.disclaimer, "");

  return frontMatter + body.join("\n");
}
