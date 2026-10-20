// Scores the AI intake parser against the idea corpus, on the developer's OWN key (S2.5.29f).
//
//   ANTHROPIC_API_KEY=… npm run eval:intent              every corpus idea through the model
//   npm run eval:intent -- --fallback                     the keyword parser instead (called directly), no key, nothing sent
//   npm run eval:intent -- --limit 40                     the first 40 ideas only
//   npm run eval:intent -- --ids idea-v1-0003,idea-v1-0010
//
// What it does: each idea's words (tests/fixtures/ideas/v1.ts) go through the same code the app runs for the
// front door's box, app/api/intent/parse/route.ts (the model call with its fixed field lists, then `sanitize`,
// which keeps only tags, provinces and goals the app knows), by calling that route's handler in this process
// with a plain Request. The answer is scored against what a careful reader expects for the idea: its kinds of
// work (`tags`), the province its words name (`named`), and whether it says the person is buying equipment
// (`buys`). A table is printed (agree / parser-only / expected-only per field) and written to
// test-results/intent-eval.md, with the ids of the ideas that disagreed; the ideas' words are never written
// anywhere, only sent to the model the key belongs to.
//
// Never in CI: it costs money and needs a key. It exits 0 with a note when CI is set, and it isn't part of
// `npm test` (vitest reads tests/**/*.spec.ts only). The route's own rate limit (30 calls a minute) applies, so
// a full run waits on it and takes about 13 minutes; the script says where it is every ten ideas.
//
// Later this file also hosts the Lens question set (phase 5 of the plan of 2026-10-17): the same loop, scoring
// the Lens's answers to a fixed list of questions on the developer's own model, never in CI.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
  console.log("eval:intent never runs in CI: it calls a model on a developer's own key. Nothing done.");
  process.exit(0);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const fallback = flag("--fallback");
const limit = option("--limit") ? Number(option("--limit")) : Infinity;
const only = option("--ids")?.split(",").map((s) => s.trim()).filter(Boolean);
const out = option("--out") ?? path.join("test-results", "intent-eval.md");

if (fallback) {
  // The route runs the keyword parser when no key is set: make sure none is, so nothing is sent.
  delete process.env.ANTHROPIC_API_KEY;
} else if (!process.env.ANTHROPIC_API_KEY) {
  console.error("eval:intent needs ANTHROPIC_API_KEY in the environment (your own key; it is never read from a file here).");
  console.error("To score the keyword parser instead, which sends nothing: npm run eval:intent -- --fallback");
  process.exit(1);
}

// Loaded after the checks above, so a run that refuses never loads the model client.
const { IDEAS_V1, RETIRED_IDEA_IDS } = await import("../tests/fixtures/ideas/v1.ts");
const { POST } = await import("../app/api/intent/parse/route.ts");
const { parseIntentFallback } = await import("../lib/journey/intent-fallback.ts");
const { DEFAULT_INTENT_ANTHROPIC_MODEL } = await import("../lib/providers/llm/constants.ts");

const ideas = IDEAS_V1.filter((idea) => idea.words.trim().length > 0)
  .filter((idea) => !RETIRED_IDEA_IDS.includes(idea.id))
  .filter((idea) => !only || only.includes(idea.id))
  .slice(0, limit);
if (ideas.length === 0) {
  console.error("No ideas to score (check --ids / --limit).");
  process.exit(1);
}
const mode = fallback ? "keyword parser (no key, nothing sent)" : `model ${DEFAULT_INTENT_ANTHROPIC_MODEL}, on your key`;
console.log(`eval:intent: ${ideas.length} ideas, ${mode}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One idea through the route's handler, waiting out its rate limit (the same brake the app has). With
 * --fallback, the keyword parser is called directly: it is what the route answers with when no key is set,
 * and the brake is for the model call, not for a local function.
 */
async function parse(words) {
  if (fallback) return parseIntentFallback(words);
  for (;;) {
    const request = new Request("http://127.0.0.1/api/intent/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: words }),
    });
    const response = await POST(request);
    if (response.status === 429) {
      const wait = Number(response.headers.get("retry-after") ?? "5");
      await sleep(Math.max(1, wait) * 1000);
      continue;
    }
    if (!response.ok) throw new Error(`the parser route answered ${response.status}`);
    return response.json();
  }
}

/** Agree / parser-only / expected-only counts for one field. */
const tally = () => ({ agree: 0, parserOnly: 0, expectedOnly: 0 });
const score = { tags: tally(), tagSets: tally(), province: tally(), purchase: tally() };
const sources = { llm: 0, fallback: 0 };
/** Each idea that disagreed on something, by id and field, with the codes and tags (never the words). */
const disagreements = [];
const started = Date.now();

for (const [i, idea] of ideas.entries()) {
  const result = await parse(idea.words);
  sources[result.source === "llm" ? "llm" : "fallback"] += 1;
  const notes = [];

  // Kinds of work: tag by tag, and whether the whole set matched.
  const expected = new Set(idea.tags);
  const parsed = new Set(result.activityTags);
  for (const tag of expected) {
    if (parsed.has(tag)) score.tags.agree += 1;
    else score.tags.expectedOnly += 1;
  }
  for (const tag of parsed) if (!expected.has(tag)) score.tags.parserOnly += 1;
  const sameSet = expected.size === parsed.size && [...expected].every((t) => parsed.has(t));
  if (sameSet) score.tagSets.agree += 1;
  else {
    if ([...parsed].some((t) => !expected.has(t))) score.tagSets.parserOnly += 1;
    if ([...expected].some((t) => !parsed.has(t))) score.tagSets.expectedOnly += 1;
    notes.push(`tags: parser [${[...parsed].join(", ")}], expected [${[...expected].join(", ")}]`);
  }

  // The province: only one the words name (the harness's "nothing derived" rule, tests/helpers/idea-invariants.ts).
  // Two named ("moving from BC to Calgary"): the move's destination is right, and so is none, since the person picks.
  const named = idea.named;
  const proposed = result.province;
  const provinceOk = proposed === null ? named.length !== 1 : named.includes(proposed);
  if (provinceOk) score.province.agree += 1;
  else if (proposed !== null) {
    score.province.parserOnly += 1;
    notes.push(`province: parser ${proposed}, words name ${named.length ? named.join(", ") : "none"}`);
  } else {
    score.province.expectedOnly += 1;
    notes.push(`province: parser none, words name ${named.join(", ")}`);
  }

  // Buying equipment: only when the words say so.
  const buys = idea.buys === true;
  if (result.capitalPurchasePlanned === buys) score.purchase.agree += 1;
  else if (result.capitalPurchasePlanned) {
    score.purchase.parserOnly += 1;
    notes.push("purchase: parser yes, words don't say so");
  } else {
    score.purchase.expectedOnly += 1;
    notes.push("purchase: parser no, words say the person is buying");
  }

  if (notes.length > 0) disagreements.push({ id: idea.id, notes });
  if ((i + 1) % 10 === 0 || i + 1 === ideas.length) {
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`  ${i + 1}/${ideas.length} scored (${seconds} s)`);
  }
}

const row = (name, t, total) => `| ${name} | ${t.agree} | ${t.parserOnly} | ${t.expectedOnly} | ${total} |`;
const table = [
  "| Field | Agree | Parser only | Expected only | Of |",
  "|---|---|---|---|---|",
  row("Kinds of work, tag by tag", score.tags, score.tags.agree + score.tags.expectedOnly),
  row("Kinds of work, whole set", score.tagSets, ideas.length),
  row("Province", score.province, ideas.length),
  row("Buying equipment", score.purchase, ideas.length),
].join("\n");

const day = new Date().toISOString().slice(0, 10);
const report = [
  `# The intake parser against the idea corpus, ${day}`,
  "",
  `${ideas.length} ideas, ${mode}. Answers from the model: ${sources.llm}; from the keyword fallback: ${sources.fallback}${
    !fallback && sources.fallback > 0 ? " (the model call failed or gave nothing for these, and the route fell back)" : ""
  }.`,
  "",
  "\"Agree\" is what the parser and a careful reader both say; \"parser only\" is what the parser proposed and the words don't",
  "say (the \"nothing derived\" rule, the one that matters most); \"expected only\" is what the words say and the parser missed",
  "(the person adds it on the confirm screen). A province is right when the words name it, or none when they name none",
  "or two (the person picks).",
  "",
  table,
  "",
  `## Ideas that disagreed (${disagreements.length})`,
  "",
  "By id; the words are in tests/fixtures/ideas/v1.ts and are not copied here.",
  "",
  ...disagreements.map((d) => `- ${d.id}: ${d.notes.join("; ")}`),
  "",
].join("\n");

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, report);
console.log(`\n${table}\n\n${disagreements.length} ideas disagreed on something. Written to ${out}.`);
