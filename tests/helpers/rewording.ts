import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { PROVINCE_LABELS, PROVINCES, type Province } from "@/lib/scenarios/types";

import type { Idea } from "../fixtures/ideas/v1";
import { stepsChoice } from "./idea-pipeline";

/**
 * Task 37b: the corpus's ideas reworded the ways people really write, each checked to keep what the person is
 * shown: the province the words name (what the intake's place question starts on), the job the person finds on
 * step 1 by typing the kind of work (the same job, found the same way, in the same group), and the roads step 3
 * lists with the person's click. Rewording is the person's own typing, so nothing here is DotAmi's to change: the
 * words go into the same pipeline (tests/helpers/idea-pipeline.ts `stepsChoice`, the parser the app runs without
 * an AI key, as in CI).
 */

/** Cities the corpus names, each with its province: the "city for province" rewording swaps one for the other. */
export const CITIES: Readonly<Record<string, Province>> = {
  Calgary: "AB",
  Edmonton: "AB",
  "Red Deer": "AB",
  Lethbridge: "AB",
  Canmore: "AB",
  Vancouver: "BC",
  Victoria: "BC",
  Kelowna: "BC",
  Kamloops: "BC",
  Nanaimo: "BC",
  Surrey: "BC",
  Winnipeg: "MB",
  Brandon: "MB",
  Fredericton: "NB",
  Moncton: "NB",
  "St. John's": "NL",
  Halifax: "NS",
  Dartmouth: "NS",
  Yellowknife: "NT",
  Iqaluit: "NU",
  Toronto: "ON",
  Ottawa: "ON",
  Hamilton: "ON",
  Mississauga: "ON",
  Kitchener: "ON",
  Charlottetown: "PE",
  Montréal: "QC",
  Montreal: "QC",
  Laval: "QC",
  Gatineau: "QC",
  Sherbrooke: "QC",
  Saskatoon: "SK",
  Regina: "SK",
  Whitehorse: "YT",
};

/** Words that name a place, which a typo never touches (a misspelt city is a different word, not a typo test). */
const PLACE_WORDS = new Set(
  [...Object.keys(CITIES), ...Object.values(PROVINCE_LABELS), "Québec", "Quebec", "Canada", "Lloydminster", "Ontario"]
    .flatMap((name) => name.split(/\s+/))
    .map((word) => fold(word)),
);

/** Lower case, without accents: how two spellings of one word compare. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** The person's words in French, written by hand for a few corpus ideas: the door box as a French speaker fills it. */
export const FRENCH: Readonly<Record<number, string>> = {
  1: "Je veux lancer une entreprise mobile de réparation de vélos à Calgary",
  4: "Je veux vendre du pain au levain fait dans ma cuisine à Ottawa",
  7: "ouvrir un salon de toilettage pour chiens à Winnipeg",
  9: "un petit café au bord de l'eau à Halifax, café et pâtisseries",
  18: "déneigement à Yellowknife, il me faudrait un camion avec une charrue",
  21: "entreprise de ménage à Calgary 🧽✨",
  29: "infirmière le jour, je conduis pour Lyft quelques soirs par semaine à Mississauga",
  32: "préparation de déclarations de revenus au printemps, je suis adjointe administrative à Regina le reste de l'année",
  36: "j'enseigne le yoga au parc le samedi, Victoria BC, je suis comptable à temps plein",
  45: "je vends des photos d'aurores boréales en ligne, Whitehorse, je travaille pour le territoire",
  46: "Je fais mon apprentissage d'ébéniste à Edmonton et je construis des meubles les fins de semaine, un jour je veux mon propre atelier",
  51: "Je suis plombier à mon compte à Calgary depuis un an, mon chiffre d'affaires approche du seuil de la TPS",
  80: "mon entreprise de plomberie et de chauffage à Saskatoon est incorporée et compte 9 employés",
  84: "notre boulangerie à Moncton est incorporée et nous voulons ouvrir un deuxième magasin",
};

/**
 * Two letters swapped in the middle of the longest word (six letters or more) that names no place, or null. In words
 * written in mixed case a capitalised word is a name ("Islands" in "US Virgin Islands"), so only a word starting in
 * lower case is misspelt; in words written all in capitals, any word not a place's.
 */
function typo(text: string): string | null {
  const mixed = /\p{Ll}/u.test(text);
  const words = [...text.matchAll(/\p{L}{6,}/gu)].filter((m) => !PLACE_WORDS.has(fold(m[0])) && (!mixed || /^\p{Ll}/u.test(m[0])));
  const longest = words.reduce<RegExpMatchArray | null>((best, m) => (!best || m[0].length > best[0].length ? m : best), null);
  if (!longest || longest.index === undefined) return null;
  const w = longest[0];
  const swapped = `${w.slice(0, 2)}${w[3]}${w[2]}${w.slice(4)}`;
  return `${text.slice(0, longest.index)}${swapped}${text.slice(longest.index + w.length)}`;
}

/**
 * The words with their parts in another order: the last clause first, or the place moved to the front; null if
 * neither. A comma before a capitalised word isn't a break between clauses but inside a place ("Surrey, England",
 * "Saint John, US Virgin Islands"), so the words are never cut there.
 */
function reordered(text: string): string | null {
  const clauses = text.split(/,\s+(?!\p{Lu})/u);
  if (clauses.length >= 2) return [clauses.at(-1)!, ...clauses.slice(0, -1)].join(", ");
  const place = /^(.*\S)\s+((?:in|near|from|around|outside|out of|at|à)\s+\S.*)$/iu.exec(text);
  return place ? `${place[2]}, ${place[1]}` : null;
}

export const REWORDINGS = ["upper case", "lower case", "typo", "word order", "emoji", "no accents", "city for province", "French"] as const;
export type Rewording = (typeof REWORDINGS)[number];

/**
 * One rewording of one idea: the words typed into the front door's box, and the kind of work typed into step 1's
 * search (the same rewording, where it reads as one: the French and city-for-province ones change the door's words
 * only, since step 1's search has English titles only and the kind of work names no place). Null where the
 * rewording doesn't apply (no city to swap, nothing accented, no French written).
 */
export function reword(idea: Idea, how: Rewording): { words: string; work: string; expected?: Province } | null {
  const n = Number(idea.id.slice(-4));
  switch (how) {
    case "upper case":
      return { words: idea.words.toUpperCase(), work: idea.work.toUpperCase() };
    case "lower case":
      return { words: idea.words.toLowerCase(), work: idea.work.toLowerCase() };
    case "typo": {
      const words = typo(idea.words);
      return words ? { words, work: typo(idea.work) ?? idea.work } : null;
    }
    case "word order": {
      const words = reordered(idea.words);
      const parts = idea.work.split(/\s+/);
      return words ? { words, work: parts.length > 1 ? [...parts].reverse().join(" ") : idea.work } : null;
    }
    case "emoji":
      return { words: `🚀 ${idea.words} 🙌`, work: `${idea.work} 🛠️` };
    case "no accents": {
      const strip = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "");
      return strip(idea.words) !== idea.words || strip(idea.work) !== idea.work ? { words: strip(idea.words), work: strip(idea.work) } : null;
    }
    case "city for province": {
      // Only where the words name one place, a city of the corpus's, and the parser reads it: then its province is the
      // one place the swapped words name. Words naming two places ("moving from Winnipeg to Regina", "Victoria and I
      // … in Halifax") or a place outside Canada say something else once a city becomes a province.
      if (!(PROVINCES as readonly string[]).includes(idea.place)) return null;
      // The city's name as a whole word: found as plain text, then the letters on either side checked (no pattern is
      // built from the name, so a dot or a quote in it, "St. John's", means only itself).
      const named = (city: string) => {
        for (let at = idea.words.indexOf(city); at !== -1; at = idea.words.indexOf(city, at + 1)) {
          const before = idea.words.slice(0, at);
          const after = idea.words.slice(at + city.length);
          if (!/\p{L}$/u.test(before) && !/^\p{L}/u.test(after)) return true;
        }
        return false;
      };
      const cities = Object.keys(CITIES).filter(named);
      const provinces = Object.values(PROVINCE_LABELS).filter((label) => fold(idea.words).includes(fold(label)));
      if (cities.length !== 1 || provinces.length > 0) return null;
      const province = CITIES[cities[0]!]!;
      if (parseIntentFallback(idea.words).province !== province) return null;
      return { words: idea.words.replaceAll(cities[0]!, PROVINCE_LABELS[province]), work: idea.work, expected: province };
    }
    case "French":
      return FRENCH[n] ? { words: FRENCH[n]!, work: idea.work } : null;
  }
}

/** What the person is shown for some words: the province named, the job found on step 1, step 3's roads and click. */
export interface Trace {
  province: Province | null;
  job: string;
  group: string;
  roads: string;
}

/**
 * The typed way's three things for the words: the parser's province (the place question starts on it, and the
 * person keeps it; with none, they answer their own place), the job the person finds on step 1 for the kind of work
 * (`stepsChoice`'s search: by their words or, failing that, by the job's own name, and in which group), and the
 * roads step 3 lists for that place and job, with the click.
 */
export function trace(idea: Idea, words: string, work: string): Trace {
  const province = parseIntentFallback(words).province;
  const place = province ?? idea.place;
  const steps = stepsChoice({ ...idea, words, work, place }, "typed");
  // The job, and whether the person's own words find it (by "work") or only its own name does: the group listing it
  // ("all", "some" of the words) is said in the failure's detail, not held, since a misspelt word may match fewer.
  const job = steps.job ? `${steps.job.code}, found by ${steps.search!.by}` : "skipped";
  const group = steps.search ? ` in “${steps.search.group}”` : "";
  const click = steps.click.by === "left" ? "left" : `${steps.click.by} ${steps.click.roadId}`;
  return { province, job, group, roads: `${steps.offered.join(", ")} → ${click}` };
}

export interface RewordingFailure {
  ideaId: string;
  how: Rewording;
  what: "province" | "job" | "roads";
  detail: string;
}

export const rewordingKey = (f: Pick<RewordingFailure, "ideaId" | "how" | "what">) => `${f.ideaId} · ${f.how} · ${f.what}`;

/** Every rewording of every idea given, against the idea's own words: what changed. */
export function rewordingFailures(ideas: readonly Idea[], hows: readonly Rewording[] = REWORDINGS): RewordingFailure[] {
  const failures: RewordingFailure[] = [];
  for (const idea of ideas) {
    const original = trace(idea, idea.words, idea.work);
    for (const how of hows) {
      const r = reword(idea, how);
      if (!r) continue;
      const got = trace(idea, r.words, r.work);
      const expected = r.expected ?? original.province;
      const fail = (what: RewordingFailure["what"], was: string, now: string) =>
        failures.push({ ideaId: idea.id, how, what, detail: `${idea.id} · ${how}: “${r.words}” (${r.work}) ${what}: ${now}, where “${idea.words}” gives ${was}` });
      if (got.province !== expected) fail("province", expected ?? "none", got.province ?? "none");
      if (got.job !== original.job) fail("job", `${original.job}${original.group}`, `${got.job}${got.group}`);
      // A wrong province changes the roads too; that is the failure above, not a second one.
      if (got.province === expected && got.roads !== original.roads) fail("roads", original.roads, got.roads);
    }
  }
  return failures;
}

/**
 * Lloydminster sits on the Alberta–Saskatchewan border, and the city alone never says which side: its name must set
 * no province. Each idea's city swapped for it is held against the same words with the city swapped for "my town".
 */
export function lloydminsterProvinces(ideas: readonly Idea[], spellings: readonly string[] = ["Lloydminster", "lloydminster", "LLOYDMINSTER"]): string[] {
  const problems: string[] = [];
  for (const idea of ideas) {
    const city = Object.keys(CITIES).find((c) => idea.words.includes(c));
    if (!city || !(PROVINCES as readonly string[]).includes(idea.place)) continue;
    const without = parseIntentFallback(idea.words.replace(city, "my town")).province;
    for (const spelling of spellings) {
      const words = idea.words.replace(city, spelling);
      const got = parseIntentFallback(words).province;
      if (got !== without) problems.push(`${idea.id}: “${words}” names ${got ?? "none"}, where the words without a city name ${without ?? "none"}`);
    }
  }
  return problems;
}
