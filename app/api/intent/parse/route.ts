import Anthropic from "@anthropic-ai/sdk";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { ACTIVITY_TAXONOMY, type IntentParseResult } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import type { IntakeGoalId } from "@/lib/journey/types";
import { DEFAULT_INTENT_ANTHROPIC_MODEL } from "@/lib/providers/llm/constants";
import { PROVINCES, type Province } from "@/lib/scenarios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Translates the user's own words into the structured profile the engines understand.
 * Compass rule applied to AI: this returns SUGGESTIONS — the intake confirm screen is
 * where the user decides. Rules decide; AI translates and explains.
 *
 * Falls back to the deterministic keyword matcher (lib/journey/intent-fallback.ts) when
 * no API key is configured or the model call fails — the free-text box never dead-ends.
 */

const GOAL_IDS: IntakeGoalId[] = ["replace-income", "write-offs", "scale-ccpc", "discover-now"];
const MAX_TEXT_LENGTH = 2000;
/** `{ text }` payloads are tiny; this is generous headroom over `MAX_TEXT_LENGTH` in bytes. */
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

const INTENT_TOOL: Anthropic.Tool = {
  name: "report_intent",
  description:
    "Report the structured venture profile suggested by the user's free-text description.",
  input_schema: {
    type: "object",
    properties: {
      ventureType: { type: "string", enum: ["service", "product", "side-gig"] },
      activityTags: {
        type: "array",
        items: { type: "string", enum: [...ACTIVITY_TAXONOMY] },
        description: "Closest matching activity tags from the fixed taxonomy. Empty if none fit.",
      },
      rawLabel: {
        type: "string",
        description: "Short label of the venture in the user's own words (max 80 chars).",
      },
      goals: { type: "array", items: { type: "string", enum: GOAL_IDS } },
      province: {
        type: ["string", "null"],
        enum: [...PROVINCES, null],
        description: "Two-letter code ONLY if the text names a Canadian place. Never guess.",
      },
      capitalPurchasePlanned: {
        type: "boolean",
        description: "True if the text mentions buying/owning equipment, vehicles, computers, or tools.",
      },
      unmapped: {
        type: "array",
        items: { type: "string" },
        description: "Meaningful fragments that do not fit the taxonomy — be honest, do not force-fit.",
      },
    },
    required: ["ventureType", "activityTags", "rawLabel", "goals", "province", "capitalPurchasePlanned", "unmapped"],
  },
};

const SYSTEM_PROMPT = `You translate a founder's free-text description of what they want to build (or write off) into a structured venture profile, using the report_intent tool.

Rules:
- Map to the CLOSEST taxonomy tags; a video game studio is "Software / SaaS"; furniture making is "Trades". If nothing fits, leave activityTags empty and put the fragment in unmapped — never force-fit.
- Only set province when the text names a Canadian province, territory, or city (Canada is the only jurisdiction mapped today). Never guess from tone.
- goals: infer only what the text supports (wanting deductions → write-offs; quitting a job → replace-income; incorporating/scaling → scale-ccpc; "no idea what to start" → discover-now).
- These are suggestions the user will confirm — do not editorialize, do not add advice.`;

function sanitize(result: Record<string, unknown>, text: string): IntentParseResult {
  const fallback = parseIntentFallback(text);
  const tags = Array.isArray(result.activityTags)
    ? result.activityTags.filter((t): t is string => (ACTIVITY_TAXONOMY as readonly string[]).includes(t as string))
    : [];
  const goals = Array.isArray(result.goals)
    ? result.goals.filter((g): g is IntakeGoalId => (GOAL_IDS as string[]).includes(g as string))
    : [];
  const province = (PROVINCES as readonly string[]).includes(result.province as string)
    ? (result.province as Province)
    : null;
  const ventureType =
    result.ventureType === "product" || result.ventureType === "side-gig" || result.ventureType === "service"
      ? result.ventureType
      : fallback.ventureType;
  const rawLabel =
    typeof result.rawLabel === "string" && result.rawLabel.trim().length > 0
      ? result.rawLabel.trim().slice(0, 80)
      : fallback.rawLabel;
  const unmapped = Array.isArray(result.unmapped)
    ? result.unmapped.filter((u): u is string => typeof u === "string" && u.trim().length > 0).slice(0, 5)
    : [];

  return {
    ventureType,
    activityTags: tags,
    rawLabel,
    goals,
    province,
    capitalPurchasePlanned: result.capitalPurchasePlanned === true || fallback.capitalPurchasePlanned,
    unmapped,
    source: "llm",
  };
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`intent-parse:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let text = "";
  try {
    const body = await readJsonWithLimit<{ text?: unknown }>(request, MAX_BODY_BYTES);
    text = `${body.text ?? ""}`.trim();
  } catch (error) {
    if (error instanceof RequestRejectedError) return rejectedResponse(error);
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (text.length === 0) {
    return Response.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(parseIntentFallback(text));
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: DEFAULT_INTENT_ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [INTENT_TOOL],
      tool_choice: { type: "tool", name: "report_intent" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
      return Response.json(parseIntentFallback(text));
    }

    return Response.json(sanitize(toolUse.input as Record<string, unknown>, text));
  } catch {
    return Response.json(parseIntentFallback(text));
  }
}
