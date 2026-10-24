import { buildPlan, type PlanArgs, type PlanSource } from "@/lib/cockpit/plan";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { citationsForPlace, type Road } from "@/lib/engines/roads/v2026";
import { countReadByAPerson, howCheckedWords, oldestRead, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";

import { formatProfileBlock } from "./render-markdown";

/**
 * Export (the cockpit's playbook panel), since the pre-release fix of 2026-10-23: the road the person is looking
 * at, as markdown for their accountant or lawyer. Until then Export printed the tax map's catalog stages for the
 * scenario's branch picks, whatever road was on screen, so the apprentice road's export held none of its own
 * steps (review 30f, gap 22).
 *
 * It is built from the same run as *Your plan* (`buildPlan`, lib/cockpit/plan.ts), so the two can't disagree:
 * every step of the road, column by column, with its state and the person's status, its done-when lines (ticked
 * or not, each with its source), its cost lines (an official fee with its amount and source, the person's own
 * agreed quote, or a named line with no amount, never $0), its official links, and its sources for the idea's
 * place (the federal pages and its own province's, as the step panel draws them), with the count of the rest.
 * A road 0 step that is a stage of the tax map keeps that stage's own catalog fields under it.
 *
 * Pure, so the panel builds it in the browser from what the cockpit already holds; a what-if on screen is
 * never part of it (`buildPlan` leaves it out, as the plan does).
 */
export function renderRoadExport(args: PlanArgs): string {
  const plan = buildPlan(args);
  const { road, scenario } = args.input;
  const place = scenario.profile.province;
  const e = words.exportDoc;
  const nodeById = new Map(cfeNodesV2026.map((node) => [node.id as string, node]));
  const stepById = new Map(road.steps.map((step) => [step.id, step]));
  const costsByStep = new Map(plan.money.byStep.map((group) => [group.stepId, group]));

  // Every source the export prints, each page once, for the front matter's read count.
  const printed = new Map<string, EngineCitation>();
  for (const citation of exportedCitations(road, place)) if (!printed.has(citation.url)) printed.set(citation.url, citation);
  const all = [...printed.values()];
  const oldest = oldestRead(all);

  const frontMatter = [
    "---",
    `title: ${yamlScalar(e.title(args.ideaName))}`,
    `scenario_id: ${yamlScalar(scenario.id)}`,
    `road: ${yamlScalar(road.id)}`,
    `catalog_last_verified: ${oldest ? yamlScalar(oldest) : "n/a"}`,
    ...(all.length > 0 ? [`sources_read_by_a_person: ${countReadByAPerson(all)} of ${all.length}`] : []),
    "generator: dotami-playbook",
    "---",
    "",
  ];

  const body: string[] = [`# ${e.heading(args.ideaName)}`, "", `> ${e.lead}`, "", plan.made, ""];

  // The person's own words, word for word with their days.
  body.push(`## ${words.plan.sections.words}`, "");
  if (plan.wordsNone) body.push(plan.wordsNone, "");
  for (const said of plan.words) body.push(`> ${said.text}`, `> — ${said.line}`, "");
  if (plan.target) body.push(plan.target, "");

  body.push(`## ${e.profile}`, "", formatProfileBlock(scenario.profile), "");

  // The road: the goal bar's line, who picked it, where you are, each fork's ending and the four gauges.
  body.push(`## ${words.plan.sections.road}`, "", plan.road.future, "", plan.road.picked, "");
  for (const line of plan.road.where) body.push(`- ${line}`);
  if (plan.road.where.length > 0) body.push("");
  for (const ending of plan.road.endings) body.push(`- ${ending}`);
  body.push("", `### ${words.plan.gauges}`, "");
  for (const gauge of plan.road.gauges) {
    body.push(`- **${gauge.label}:** ${gauge.value}`);
    for (const line of gauge.lines) body.push(`  - ${line}`);
  }
  body.push("");

  // Each step, column by column, every one of them, in the order the road shows them.
  body.push(`## ${words.plan.sections.steps}`, "", words.plan.order, "");
  for (const column of plan.steps.columns) {
    body.push(`## ${column.label}`, "", column.summary, "");
    for (const step of column.steps) {
      body.push(`### ${step.label}`, "", step.summary, "", `*${step.status}* · *${step.state}*`, "", step.because, "");

      body.push(`**${step.doneWhenTitle}**`, "");
      for (const line of step.doneWhen) {
        body.push(`- ${line.ticked ? words.plan.tickBox.on : words.plan.tickBox.off} ${line.text} (${line.mark})`);
        body.push(`  - *${e.source}:* ${sourceLine(line.source)}`);
        for (const quote of line.source.quotes) body.push(`    - *${e.wordsFound}:* "${quote}"`);
      }
      if (step.doneWhen.length > 0) body.push("");

      if (step.skills.length > 0) {
        body.push(`**${e.skills}**`, "");
        for (const skill of step.skills) body.push(`- ${skill.label} (${skill.mark})`);
        body.push("");
      }

      const costs = costsByStep.get(step.id);
      if (costs) {
        body.push(`**${e.costs}**`, "");
        if (costs.note) body.push(costs.note, "");
        for (const line of costs.lines) {
          // A line with no number has no amount at all: never printed as $0.
          body.push(`- ${line.label}: ${line.amount ?? e.noAmount} (${line.kind})${line.note ? ` · ${line.note}` : ""}`);
          if (line.source) body.push(`  - *${e.source}:* ${sourceLine(line.source)}`);
        }
        body.push("");
      }

      if (step.officialLinks.length > 0) {
        body.push(`**${e.officialLinks}**`, "");
        for (const link of step.officialLinks) body.push(`- [${link.label}](${link.url})`);
        body.push("");
      }

      // A road 0 step that is a stage of the tax map: that stage's own fields, as Export printed them before.
      const node = nodeById.get(step.id);
      if (node) {
        body.push(`**${e.catalog}**`, "");
        body.push(`- *${e.trigger}:* ${node.trigger}`);
        body.push(`- *${e.description}:* ${node.description}`);
        body.push(`- *${e.taxImpact}:* ${node.taxImpact}`);
        body.push(`- *${e.lensTax}:* ${node.lensAnnotations.tax}`);
        body.push(`- *${e.lensLegal}:* ${node.lensAnnotations.legal}`);
        body.push(`- *${e.financialSummary}:* ${node.financialImpact.summary}`);
        // The catalog's notes, as the step panel's "More about this stage" lists them.
        if (node.financialImpact.projectionNotes.length > 0) {
          body.push(`- *${e.projectionNotes}:*`);
          for (const note of node.financialImpact.projectionNotes) body.push(`  - ${note}`);
        }
        body.push("");
      }

      // The step's sources for the idea's place, with how each was checked and the words a tool found.
      const sources = citationsForPlace(road, stepById.get(step.id)?.citations ?? [], place).shown;
      if (sources.length > 0) {
        body.push(`#### ${e.citations}`, "");
        for (const c of sources) {
          body.push(`- [${c.title}](${c.url}) — ${c.authority} / ${c.jurisdiction} · ${howCheckedWords(c)}`);
          for (const quote of toolCheckQuotes(c)) body.push(`  - *${e.wordsFound}:* "${quote}"`);
          body.push(`  - *${e.note}:* ${c.note}`);
        }
        body.push("");
      }
      if (step.sourcesLeftOut) body.push(step.sourcesLeftOut, "");
    }
  }

  // Start-up money's sums, as the gauge shows them.
  body.push(`## ${words.plan.sections.money}`, "");
  for (const sum of plan.money.sums) body.push(`- ${sum}`);
  if (plan.money.none) body.push(plan.money.none);
  body.push("");

  // What you've told DotAmi, row for row as the cockpit's left list.
  body.push(`## ${words.plan.sections.told}`, "");
  if (plan.told.none) body.push(plan.told.none, "");
  for (const row of plan.told.rows) {
    body.push(`- ${row.said} · ${row.day}`);
    for (const line of row.unlocked) body.push(`  - ${line}`);
  }
  body.push("", "---", "", plan.notAdvice, "");

  return frontMatter.join("\n") + body.join("\n");
}

/** Every source the export can print for this road and place: the steps' (for the place), the done-when lines' and the fees'. */
function exportedCitations(road: Road, place: string): EngineCitation[] {
  return road.steps.flatMap((step) => [
    ...citationsForPlace(road, step.citations, place).shown,
    ...step.doneWhen.map((line) => line.citation),
    ...step.costs.flatMap((line) => (line.kind === "official-fee" ? [line.citation] : [])),
  ]);
}

function sourceLine(source: PlanSource): string {
  return `[${source.title}](${source.url}) · ${source.checked}`;
}

function yamlScalar(value: string): string {
  if (/[:#\n\r]/.test(value) || value.startsWith('"') || value.startsWith("'")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

