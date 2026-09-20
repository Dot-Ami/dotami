import type { IntakeGoalId } from "@/lib/journey/types";
import type { Province, VentureType } from "@/lib/scenarios/types";

import { ACTIVITY_TAXONOMY, type ActivityTag, type IntentParseResult } from "./intent";

/**
 * Deterministic keyword fallback for the intent parse — used when there is no
 * ANTHROPIC_API_KEY or the LLM call fails. The free-text box must NEVER dead-end.
 * Pure and unit-tested; keep synonyms lowercase.
 */

const TAG_SYNONYMS: Record<ActivityTag, string[]> = {
  "Software / SaaS": [
    "software", "saas", "app", "web", "website", "platform", "api", "video game", "game",
    "gaming", "indie game", "tech startup", "developer", "coding", "program",
  ],
  "AI / ML / R&D": [
    "ai", "a.i", "machine learning", "ml model", "llm", "research", "r&d", "prototype",
    "invention", "robotics", "experiment",
  ],
  Consulting: [
    "consult", "coach", "advis", "freelanc", "agency", "marketing services", "bookkeep",
    "accounting services", "design services", "tutor",
  ],
  Trades: [
    "plumb", "electric", "carpent", "renovat", "construction", "weld", "hvac", "landscap",
    "contractor", "roofing", "painting", "woodwork", "furniture", "handyman", "mechanic",
  ],
  "Content / streaming": [
    "youtube", "stream", "podcast", "tiktok", "content", "blog", "twitch", "video channel",
    "newsletter",
  ],
  "E-commerce / retail": [
    "shop", "store", "ecommerce", "e-commerce", "etsy", "amazon", "resell", "dropship",
    "retail", "sell online", "online sales", "boutique",
  ],
  Manufacturing: ["manufactur", "fabricat", "factory", "3d print", "product line", "assembly"],
  "Real estate": ["real estate", "rental", "airbnb", "property", "landlord", "flipping houses"],
  "Creator / influencer": ["influencer", "creator", "instagram", "brand deal", "sponsorship"],
  "Healthcare / wellness": [
    "massage", "therapy", "fitness", "personal train", "wellness", "nutrition", "clinic", "yoga",
  ],
};

const GOAL_KEYWORDS: Record<IntakeGoalId, string[]> = {
  "write-offs": ["write off", "write-off", "writeoff", "deduct", "tax break", "expense", "claim"],
  "replace-income": ["replace my income", "quit my job", "full time", "full-time", "leave my job", "main income"],
  "scale-ccpc": ["incorporat", "corporation", "ccpc", "scale", "grow into", "holdco", "employees"],
  "discover-now": ["don't know", "dont know", "not sure", "no idea", "what's available", "whats available", "where to start", "ideas", "monetize", "monetise", "turn into a business", "make money from"],
};

const PROVINCE_KEYWORDS: Record<Province, string[]> = {
  AB: ["alberta", "calgary", "edmonton", "red deer", "lethbridge"],
  BC: ["british columbia", "vancouver", "victoria", "kelowna", "surrey", "burnaby"],
  MB: ["manitoba", "winnipeg", "brandon"],
  NB: ["new brunswick", "fredericton", "moncton", "saint john"],
  NL: ["newfoundland", "labrador", "st. john's", "st johns"],
  NS: ["nova scotia", "halifax", "dartmouth"],
  NT: ["northwest territories", "yellowknife"],
  NU: ["nunavut", "iqaluit"],
  ON: ["ontario", "toronto", "ottawa", "hamilton", "mississauga", "london ontario", "kitchener"],
  PE: ["prince edward island", "pei", "charlottetown"],
  QC: ["quebec", "québec", "montreal", "montréal", "laval", "gatineau"],
  SK: ["saskatchewan", "saskatoon", "regina"],
  YT: ["yukon", "whitehorse"],
};

const CAPITAL_KEYWORDS = [
  "equipment", "gpu", "computer", "workstation", "pc", "laptop", "truck", "vehicle", "car",
  "van", "tools", "machine", "gear", "camera", "rig", "server", "printer",
];

const SIDE_GIG_KEYWORDS = ["side gig", "side hustle", "side-gig", "hobby", "weekend", "part time", "part-time", "evenings"];
const PRODUCT_KEYWORDS = ["product", "sell", "shop", "store", "manufactur", "device", "hardware", "game"];

function detectVentureType(text: string, tags: string[]): VentureType {
  if (SIDE_GIG_KEYWORDS.some((k) => text.includes(k))) return "side-gig";
  if (
    tags.includes("E-commerce / retail") ||
    tags.includes("Manufacturing") ||
    PRODUCT_KEYWORDS.some((k) => text.includes(k))
  ) {
    return "product";
  }
  return "service";
}

function cleanLabel(raw: string): string {
  const firstSentence = raw.trim().split(/[.\n!?]/)[0] ?? "";
  const label = firstSentence.trim().replace(/\s+/g, " ");
  return label.length > 80 ? `${label.slice(0, 77)}…` : label;
}

export function parseIntentFallback(rawText: string): IntentParseResult {
  const text = rawText.toLowerCase();

  const activityTags = ACTIVITY_TAXONOMY.filter((tag) =>
    TAG_SYNONYMS[tag].some((syn) => text.includes(syn)),
  );

  const goals = (Object.keys(GOAL_KEYWORDS) as IntakeGoalId[]).filter((goal) =>
    GOAL_KEYWORDS[goal].some((k) => text.includes(k)),
  );

  const province =
    (Object.keys(PROVINCE_KEYWORDS) as Province[]).find((code) =>
      PROVINCE_KEYWORDS[code].some((k) => text.includes(k)),
    ) ?? null;

  const capitalPurchasePlanned = CAPITAL_KEYWORDS.some((k) => text.includes(k));

  return {
    ventureType: detectVentureType(text, activityTags),
    activityTags,
    rawLabel: cleanLabel(rawText),
    goals,
    province,
    capitalPurchasePlanned,
    unmapped: activityTags.length === 0 && rawText.trim().length > 0 ? [cleanLabel(rawText)] : [],
    source: "fallback",
  };
}
