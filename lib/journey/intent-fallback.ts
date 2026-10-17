import type { IntakeGoalId } from "@/lib/journey/types";
import { PROVINCES, type Province, type VentureType } from "@/lib/scenarios/types";

import { ACTIVITY_TAXONOMY, type ActivityTag, type IntentParseResult } from "./intent";

/**
 * Deterministic keyword fallback for the intent parse — used when there is no
 * ANTHROPIC_API_KEY or the LLM call fails. The free-text box must NEVER dead-end.
 * Pure and unit-tested; keep synonyms lowercase.
 *
 * It proposes only what the words state (CLAUDE.md: never derive a fact about the person). The confirm
 * screen shows every proposal for the person to keep or change, but a proposal the words don't support
 * still reads as DotAmi knowing something it was never told, so a keyword counts only where its context
 * says it is the person's own work, place or purchase (2026-10-17, the idea harness's findings): not the
 * customers' trade ("an app for HVAC outfits"), not the person's day job ("I work retail"), not a tool
 * they use ("my bank app", "an AI assistant"), not a city that is also a name or sits in another country.
 * Missing something is safe: the person adds it on the confirm screen. Proposing something unsaid is not.
 */

// The ways people spell ride-sharing. On their own they also fit someone building a rideshare app, and
// the CRA's rule is about the drivers who give the rides, so they count only in a phrase about driving.
const RIDE_SHARE_SPELLINGS = ["ride-share", "ride share", "rideshare", "ride-sharing", "ride sharing", "ridesharing"];
const RIDE_SHARE_DRIVING = RIDE_SHARE_SPELLINGS.flatMap((w) => [
  `${w} driv`, `drive ${w}`, `driving ${w}`, `drive for a ${w}`, `driving for a ${w}`,
]);

/**
 * Keywords that stop counting when the next word makes them another thing: "drive for uber" is
 * driving passengers, "drive for uber eats" is food delivery, which the CRA counts separately from
 * ride-sharing (its example driver's Uber Eats income goes toward the general $30,000 total);
 * "real estate photography" is photography; "machine learning" is no machine; a Labrador retriever is a dog.
 */
const NOT_FOLLOWED_BY: Readonly<Record<string, readonly string[]>> = {
  "drive for uber": ["eats"],
  "driving for uber": ["eats"],
  "drive uber": ["eats"],
  "driving uber": ["eats"],
  "real estate": ["photography", "photographer", "photographers", "photo", "photos", "video", "videography", "marketing", "software", "app", "website"],
  machine: ["learning"],
  labrador: ["retriever", "retrievers"],
};

const TAG_SYNONYMS: Record<ActivityTag, string[]> = {
  // "app", "apps", "platform", "website(s)" and "game(s)" also need the context in ONLY_IF below: people
  // name the apps and websites they use far more often than ones they build.
  "Software / SaaS": [
    "software", "saas", "app", "platform", "api", "website", "web design", "web develop", "web app",
    "video game", "game", "indie game", "game studio", "game dev", "tech startup", "developer", "coding",
    "programmer",
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
    "repair",
  ],
  "Content / streaming": [
    "youtube", "stream", "podcast", "tiktok", "content", "blog", "twitch", "video channel",
    "newsletter",
  ],
  // No bare "shop": a shop is as often a workshop (a cabinetmaker's, a machine shop, an auto repair or
  // barber shop) as a place that sells things, so only the shops that sell.
  "E-commerce / retail": [
    "online shop", "shop online", "gift shop", "coffee shop", "craft shop", "flower shop", "thrift shop",
    "store", "ecommerce", "e-commerce", "etsy", "amazon",
    "shopify", "resell", "dropship", "retail", "sell online", "online sales", "boutique",
  ],
  Manufacturing: ["manufactur", "fabricat", "factory", "3d print", "product line", "assembly"],
  "Real estate": ["real estate", "rental", "airbnb", "property", "landlord", "flipping houses"],
  "Creator / influencer": ["influencer", "creator", "instagram", "brand deal", "sponsorship"],
  "Healthcare / wellness": [
    "massage", "therapy", "fitness", "personal train", "wellness", "nutrition", "clinic", "yoga",
  ],
  // No bare "uber": the CRA counts Uber Eats food delivery separately from driving passengers, and the
  // Uber phrases here don't count before "eats" (NOT_FOLLOWED_BY). No bare "taxi" either: keywords
  // match from the start of a word, so it would also catch "taxidermy". No bare "rideshare": see
  // RIDE_SHARE_DRIVING.
  "Ride-share or taxi driving": [
    ...RIDE_SHARE_DRIVING,
    "taxi driv", "taxi operat", "taxi business", "taxi company", "drive a taxi", "driving a taxi",
    "drive taxi", "driving taxi", "my taxi", "cab driv", "drive a cab", "driving a cab", "lyft",
    "uber driv", "drive for uber", "driving for uber", "drive uber", "driving uber",
  ],
};

const GOAL_KEYWORDS: Record<IntakeGoalId, string[]> = {
  "write-offs": ["write off", "write-off", "writeoff", "deduct", "tax break", "expense", "claim"],
  "replace-income": ["replace my income", "quit my job", "full time", "full-time", "leave my job", "main income"],
  "scale-ccpc": ["incorporat", "corporation", "ccpc", "scale", "grow into", "holdco", "employees"],
  "discover-now": ["don't know", "dont know", "not sure", "no idea", "what's available", "whats available", "where to start", "ideas", "monetize", "monetise", "turn into a business", "make money from"],
};

/** The provinces' and territories' own names: a place in Canada whatever else the sentence says. */
const PROVINCE_NAMES: Record<Province, string[]> = {
  AB: ["alberta"],
  BC: ["british columbia"],
  MB: ["manitoba"],
  NB: ["new brunswick"],
  NL: ["newfoundland", "labrador"],
  NS: ["nova scotia"],
  NT: ["northwest territories"],
  NU: ["nunavut"],
  ON: ["ontario"],
  PE: ["prince edward island", "pei"],
  QC: ["quebec", "québec"],
  SK: ["saskatchewan"],
  YT: ["yukon"],
};

/** Cities, each in one province. A city alone names its province only when nothing else names another. */
const CITIES: Record<Province, string[]> = {
  AB: ["calgary", "edmonton", "red deer", "lethbridge"],
  BC: ["vancouver", "victoria", "kelowna", "surrey", "burnaby"],
  MB: ["winnipeg", "brandon"],
  NB: ["fredericton", "moncton", "saint john"],
  NL: ["st. john's", "st johns"],
  NS: ["halifax", "dartmouth"],
  NT: ["yellowknife"],
  NU: ["iqaluit"],
  ON: ["toronto", "ottawa", "hamilton", "mississauga", "london ontario", "kitchener"],
  PE: ["charlottetown"],
  QC: ["montreal", "montréal", "laval", "gatineau"],
  SK: ["saskatoon", "regina"],
  YT: ["whitehorse"],
};

/**
 * Cities that are also people's first names ("Victoria and I…", "my sister Regina"): they name a place only
 * after a word that puts the person there ("in Regina", "to Victoria") or with their province beside them
 * ("Victoria BC").
 */
const NAME_LIKE_CITIES = new Set(["victoria", "regina", "brandon", "hamilton"]);
const PLACE_WORD_BEFORE = /\b(?:in|from|near|around|to|outside|at|of)\s+$/;

/**
 * Places outside Canada, read in two spots only (2026-10-17, the review of PR #182): right after a Canadian
 * city's name, where they say the city is another one ("Surrey, England", "Vancouver, Washington", "Saint
 * John, US Virgin Islands"), and after "moving to", where the person is leaving Canada. Anywhere else they
 * say nothing about where the person is: "customers in the United States", "tea from India", "fine china",
 * "my partner Virginia". Not "america" (North America includes Canada) and not a bare "us" (the pronoun).
 */
const OUTSIDE_CANADA = [
  "united states", "usa", "u.s.", "u.s.a", "virgin islands", "puerto rico",
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida",
  "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska",
  "nevada", "new hampshire", "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota", "tennessee",
  "texas", "utah", "vermont", "virginia", "washington", "west virginia", "wisconsin", "wyoming",
  "england", "scotland", "wales", "northern ireland", "ireland", "uk", "united kingdom", "britain",
  "australia", "new zealand", "india", "pakistan", "philippines", "china", "japan", "korea", "vietnam",
  "france", "germany", "italy", "spain", "portugal", "netherlands", "poland", "ukraine", "mexico", "brazil",
  "jamaica", "haiti", "nigeria", "kenya", "south africa", "dubai", "singapore", "hong kong",
];
// Escaped here rather than with `escape` below, which isn't defined yet when these lines run.
const OUTSIDE_CANADA_NAMES = OUTSIDE_CANADA.map((place) => place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
/** Right after a city: "Surrey, England", "Saint John, U.S. Virgin Islands", "Hamilton New Zealand". */
const CITY_OUTSIDE_CANADA = new RegExp(`^,?\\s+(?:the\\s+)?(?:u\\.?s\\.?\\s+)?(?:${OUTSIDE_CANADA_NAMES})(?![a-z0-9])`);
/** Moving there: "moving … to Portland, Oregon", "relocating to the United States". */
const MOVING_OUT_OF_CANADA = new RegExp(
  `\\b(?:move|moves|moved|moving|relocat\\w*)\\b[^.!?;\\n]*?\\bto\\s+(?:the\\s+)?(?:[a-z'’-]+(?:\\s+[a-z'’-]+)?,\\s+)?(?:${OUTSIDE_CANADA_NAMES})(?![a-z0-9])`,
);

/** Equipment, vehicles and tools: proposed as a purchase only with words that say one (`statesAPurchase`). */
const CAPITAL_KEYWORDS = [
  "equipment", "gpu", "computer", "workstation", "pc", "laptop", "truck", "vehicle", "car",
  "van", "tools", "machine", "machines", "machinery", "gear", "camera", "rig", "server", "printer", "speakers", "trailer",
];

const SIDE_GIG_KEYWORDS = ["side gig", "side hustle", "side-gig", "hobby", "weekend", "part time", "part-time", "evenings"];
const PRODUCT_KEYWORDS = ["product", "sell", "shop", "store", "manufactur", "device", "hardware", "game"];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where a keyword appears: the start and end of each match in the (lowercased) text, the end running on to
 * the end of the word, so "tutoring" ends after "ing". Short keywords (3 letters or fewer) match a whole
 * word, plural allowed, and never right after an apostrophe: the "ai" of the French "J'ai" (I have) is not AI.
 * Longer ones match from the start of a word.
 */
function keywordHits(text: string, keyword: string): { start: number; end: number }[] {
  const escaped = escape(keyword);
  let pattern: RegExp;
  if (keyword.length <= 3) {
    pattern = new RegExp(`(?:^|[^a-z0-9'’])(${escaped}s?)(?=[^a-z0-9]|$)`, "g");
  } else {
    const cancelledBy = NOT_FOLLOWED_BY[keyword];
    // A whole-word match whose next word isn't one of the cancelling ones. The regex tries every place
    // the keyword appears, so "drive for uber eats and drive for uber" still matches the second.
    const next = cancelledBy ? `(?![a-z0-9])(?!\\s+(?:${cancelledBy.map(escape).join("|")})(?![a-z0-9]))` : "";
    pattern = new RegExp(`(?:^|[^a-z0-9])(${escaped})${next}`, "g");
  }
  const hits: { start: number; end: number }[] = [];
  for (const m of text.matchAll(pattern)) {
    const start = m.index + m[0].length - m[1].length;
    let end = start + m[1].length;
    while (end < text.length && /[a-z0-9]/.test(text[end])) end += 1;
    hits.push({ start, end });
  }
  return hits;
}

function matchesKeyword(text: string, keyword: string): boolean {
  return keywordHits(text, keyword).length > 0;
}

/** The words around one match, inside its own sentence (or, with commas as breaks, its own clause). */
interface Around {
  before: string;
  word: string;
  after: string;
}

function around(text: string, hit: { start: number; end: number }, breaks: RegExp): Around {
  let from = hit.start;
  while (from > 0 && !breaks.test(text[from - 1])) from -= 1;
  let to = hit.end;
  while (to < text.length && !breaks.test(text[to])) to += 1;
  return { before: text.slice(from, hit.start), word: text.slice(hit.start, hit.end), after: text.slice(hit.end, to) };
}

const SENTENCE_BREAK = /[.!?;\n]/;
const CLAUSE_BREAK = /[.!?;,\n]/;

/**
 * Work that isn't the person's own, for every kind of work but driving (whose keywords are whole phrases
 * like "drive for uber"): the job the person has now ("I work retail", "I work at a feed store"), and,
 * except for retail, the customers' work ("an app for small HVAC outfits", "software to clinics"). Selling
 * to stores is retail itself (a maker's wholesale), so a store after "for" or "sell … to" still counts. "For"
 * that names the person's own ("for my studio"), one thing ("an idea for an AI tool") or what a company of
 * theirs does ("one for landscaping, one for snow removal") isn't a customer.
 */
function notThePersonsWork({ before }: Around, tag: ActivityTag): boolean {
  const dayJob = /\bwork(?:s|ing)?\s+(?:(?:in|at|for)\s+)?(?:(?:a|an|the)\s+(?:\S+\s+)?)?$/.test(before);
  if (dayJob) return true;
  if (tag === "E-commerce / retail") return false;
  const forCustomers =
    /\bfor\s+(?!(?:my|our|a|an)\b)(?:\S+\s+){0,3}$/.test(before) &&
    !/\b(?:one|company|companies|business|businesses|corporation|firm|idea|plan)\s+for\s+(?:\S+\s+){0,3}$/.test(before);
  const soldTo = /\bsell\w*\b.*\bto\s+(?:\S+\s+){0,2}$/.test(before);
  return forCustomers || soldTo;
}

/** A verb of making something, a few words before it ("building a rideshare app", "make video games"). */
const MADE_BEFORE =
  /\b(?:build|builds|building|built|make|makes|making|develop|develops|developing|design|designs|designing|launch|launching|create|creating|code|coding|program|programming|ship|shipping)\s+(?:\S+\s+){0,3}$/;

/** "app", "platform": the person's own ("my own app", "an app that…", "building an app"), not one they use. */
function anAppTheyMake({ before, after }: Around): boolean {
  if (MADE_BEFORE.test(before)) return true;
  if (/^s?\s+(?:that|which|for|to help|startup|start-up|business|company|idea|development|developer)\b/.test(after)) return true;
  const used = /\b(?:through|via|using|use|uses|on|in|with|from|by|into)\s+(?:an|my|our|their|the)\s+$/.test(before);
  return !used && /\b(?:an|my|our|own)\s+$/.test(before);
}

/**
 * Context a keyword needs before it counts. Without these, "my bank app", "bookings on two websites",
 * "stream video games" and "outdoor education programs" were read as building software.
 */
const ONLY_IF: Readonly<Record<string, (a: Around) => boolean>> = {
  app: anAppTheyMake,
  platform: anAppTheyMake,
  website: (a) => MADE_BEFORE.test(a.before) || /^\s+(?:for|design|development|developer|builder)\b/.test(a.after),
  game: (a) => MADE_BEFORE.test(a.before),
  "video game": (a) => MADE_BEFORE.test(a.before) || /^s?\s+(?:studio|company|startup|business|developer|development)\b/.test(a.after),
};

/** Context that stops one keyword counting. */
const UNLESS: Readonly<Record<string, (a: Around) => boolean>> = {
  // An AI tool the person uses: "I code with an AI assistant", "my AI agent suggests".
  ai: (a) => /\b(?:with|using|use|uses|my|our)\s+(?:an?\s+)?$/.test(a.before) && /^\s+(?:assistant|agent|tool|chatbot|helper)s?\b/.test(a.after),
  "a.i": (a) => /\b(?:with|using|use|uses|my|our)\s+(?:an?\s+)?$/.test(a.before) && /^\.?\s+(?:assistant|agent|tool|chatbot|helper)s?\b/.test(a.after),
  // A contractor in another line of work: "IT contractor", "an independent contractor".
  contractor: (a) => /\b(?:it|i\.t\.|software|tech|independent|government|freelance|data|web|security)\s+$/.test(a.before),
  // Paintings are pictures: "I sell paintings", "oil painting", "painting portraits".
  painting: (a) =>
    a.word === "paintings" ||
    /\b(?:oil|watercolou?r|acrylic|portrait|landscape|art)\s+$/.test(a.before) ||
    /^\s+(?:portraits?|landscapes?|pictures?|murals?|classes|lessons|on canvas)\b/.test(a.after),
  // A way people pay or reach a business, not being a creator: "deposits through Instagram".
  instagram: (a) => /\b(?:through|via|by|over|using|on)\s+$/.test(a.before),
  // A tutoring app is software, not tutoring: "an AI tutor app".
  tutor: (a) => /^\s+(?:app|apps|software|platform|bot|chatbot|tool)\b/.test(a.after),
};

const RIDE_SHARE: ActivityTag = "Ride-share or taxi driving";

function tagNamed(text: string, tag: ActivityTag): boolean {
  return TAG_SYNONYMS[tag].some((keyword) =>
    keywordHits(text, keyword).some((hit) => {
      const a = around(text, hit, SENTENCE_BREAK);
      if (ONLY_IF[keyword] && !ONLY_IF[keyword](a)) return false;
      if (UNLESS[keyword]?.(a)) return false;
      return tag === RIDE_SHARE || !notThePersonsWork(a, tag);
    }),
  );
}

function cityNamed(text: string, city: string, province: Province): boolean {
  // "Surrey, England" is another Surrey. The rest of the text, not the sentence: "U.S." has full stops.
  const hits = keywordHits(text, city).filter((hit) => !CITY_OUTSIDE_CANADA.test(text.slice(hit.end)));
  if (!NAME_LIKE_CITIES.has(city)) return hits.length > 0;
  // "Victoria BC", "Brandon, Manitoba": the province beside it says it is the place.
  const beside = [province.toLowerCase(), ...PROVINCE_NAMES[province]].map(escape).join("|");
  const besideIt = new RegExp(`^,?\\s+(?:${beside})(?![a-z0-9])`);
  return hits.some((hit) => {
    const a = around(text, hit, SENTENCE_BREAK);
    return PLACE_WORD_BEFORE.test(a.before) || besideIt.test(a.after);
  });
}

/**
 * The province the words name, or null. Only one place in Canada, named unambiguously: a city named as
 * one outside Canada doesn't count ("Surrey, England"), none when the person is moving out of Canada
 * ("moving to Portland, Oregon"), none when two provinces are named ("from Winnipeg to Regina": the
 * person picks), and a city only when nothing names another province. Never by the order the provinces
 * are listed in. A place outside Canada named anywhere else ("customers in the United States") changes
 * nothing.
 */
function provinceNamed(text: string): Province | null {
  if (MOVING_OUT_OF_CANADA.test(text)) return null;
  const named = PROVINCES.filter(
    (code) => PROVINCE_NAMES[code].some((name) => matchesKeyword(text, name)) || CITIES[code].some((city) => cityNamed(text, city, code)),
  );
  return named.length === 1 ? named[0] : null;
}

/**
 * Words that say the person is buying, leasing, needs, or wants to write off what comes after them, at
 * most two words before it. Groups: the words before the verb, the verb, the words between it and the
 * thing. "financ" only as the verb: "financial advice" buys nothing.
 */
const PURCHASE_BEFORE =
  /^([\s\S]*?)\b(buy|buys|buying|bought|purchas\w*|lease|leases|leasing|leased|financ(?:e|es|ed|ing)|need|needs|needed|upgrad\w*|replace|replacing|invest\w*\s+in|write\s+off|write-off|writeoff|writing\s+off|deduct\w*|claim\w*|want\s+my\s+own|receipts?\s+for)\s+((?:\S+\s+){0,2})$/;
/** The same said after it: "want my truck to count", "my laptop as a write-off". */
const PURCHASE_AFTER = /^\s+(?:to\s+count|to\s+be\s+written\s+off|as\s+a\s+write-?off|written\s+off|as\s+an\s+expense)\b/;
/** A purchase ruled out just before the verb: "I don't need", "no need to buy", "won't be buying". */
const RULED_OUT = /\b(?:don[’']?t|do\s+not|doesn[’']?t|does\s+not|didn[’']?t|did\s+not|won[’']?t|will\s+not|wouldn[’']?t|would\s+not|not|never|no|without)\s+(?:\S+\s+){0,3}$/;
/** Someone else needs it: "people who need a van", "customers need". */
const SOMEONE_ELSE = /\b(?:who|that|people|customers|clients|folks|families|businesses|they|others)\s+$/;
/** "Need" of something the person has: "I need my car to get to clients". */
const OWN_ALREADY = /^(?:my|our|his|her|their|your)\s/;
const NEEDS = new Set(["need", "needs", "needed"]);
/** A plural noun right after the thing makes the thing a describer: "car windshields", "truck parts". */
const DESCRIBES_NEXT_WORD = /^\s([a-z]{2,}[^s\W]s)(?![a-z0-9'’])/;
const NOT_A_PLURAL = new Set([
  "this", "thus", "plus", "always", "perhaps", "sometimes", "towards", "afterwards", "besides", "whereas",
  "lens", "chassis", "series", "news",
]);

/**
 * "Equipment / vehicle purchase on the path", proposed only when the words say so: "buying a used truck",
 * "need to buy brewing equipment", "I want to write off my PC". A vehicle or tool only named ("trucker",
 * "selling the trucks", "my own car", "I fix computers", "camping gear" the person reviews) says nothing
 * about buying one, and neither do words that rule it out ("I don't need any equipment"), one the person
 * has ("I need my car"), one someone else needs ("people who need a van") or a part of one ("I replace
 * car windshields"). The review of PR #182, 2026-10-17.
 */
function statesAPurchase(text: string): boolean {
  return CAPITAL_KEYWORDS.some((keyword) =>
    keywordHits(text, keyword).some((hit) => {
      const a = around(text, hit, CLAUSE_BREAK);
      const next = DESCRIBES_NEXT_WORD.exec(a.after);
      if (next && !NOT_A_PLURAL.has(next[1])) return false;
      if (PURCHASE_AFTER.test(a.after)) return true;
      const said = PURCHASE_BEFORE.exec(a.before);
      if (!said) return false;
      const [, lead, verb, between] = said;
      if (RULED_OUT.test(lead) || SOMEONE_ELSE.test(lead)) return false;
      return !(NEEDS.has(verb) && OWN_ALREADY.test(between));
    }),
  );
}

function detectVentureType(text: string, tags: string[]): VentureType {
  if (SIDE_GIG_KEYWORDS.some((k) => matchesKeyword(text, k))) return "side-gig";
  if (
    tags.includes("E-commerce / retail") ||
    tags.includes("Manufacturing") ||
    PRODUCT_KEYWORDS.some((k) => matchesKeyword(text, k))
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

  const activityTags = ACTIVITY_TAXONOMY.filter((tag) => tagNamed(text, tag));

  const goals = (Object.keys(GOAL_KEYWORDS) as IntakeGoalId[]).filter((goal) =>
    GOAL_KEYWORDS[goal].some((k) => matchesKeyword(text, k)),
  );

  return {
    ventureType: detectVentureType(text, activityTags),
    activityTags,
    rawLabel: cleanLabel(rawText),
    goals,
    province: provinceNamed(text),
    capitalPurchasePlanned: statesAPurchase(text),
    unmapped: activityTags.length === 0 && rawText.trim().length > 0 ? [cleanLabel(rawText)] : [],
    source: "fallback",
  };
}
