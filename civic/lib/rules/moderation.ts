/**
 * A check run on anything a person writes in the coalition workspace or a draft, before it is
 * kept or handed over. It looks for the things a civic space must not carry: other people's
 * contact details or home addresses (doxxing), and wrongdoing stated as fact about someone.
 *
 * It is a pattern check, so it misses things and flags some innocent text. A flag blocks the post
 * with a reason and a way to rephrase; it never edits the text itself. A real deployment would add
 * human moderation behind it, not replace it with this.
 */
export type FindingKind = "email" | "phone" | "street-address" | "personal-details" | "accusation";

export interface Finding {
  kind: FindingKind;
  match: string;
  message: string;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Phone-number shapes (3-3-4 digits, optional country code and brackets), not any run of digits:
// "any seven digits" flagged file numbers like WERB-2030-0117, which drafts must be able to cite.
const PHONE =
  /(?<![\w-])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-])/g;
const STREET =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Crescent|Cres|Way|Boulevard|Blvd|Court|Ct|Place|Pl|Close|Terrace)\b\.?/g;
const PERSONAL =
  /\b(?:lives at|home address|where (?:he|she|they) lives?|(?:his|her|their) (?:kids?|children)'s school|licen[cs]e plate)\b/gi;
const ACCUSATION =
  /\b(?:corrupt(?:ion)?|bribe[sd]?|bribery|criminal|crook(?:ed)?|liars?|lied|fraud(?:ulent)?|kickbacks?|paid off|in (?:the|their) pocket)\b/gi;

const MESSAGES: Record<FindingKind, string> = {
  email: "Remove the email address. Don't post anyone's contact details here, your own included.",
  phone: "Remove the phone number. Don't post anyone's contact details here, your own included.",
  "street-address": "Remove the street address. Don't post where anyone lives or can be found.",
  "personal-details":
    "Remove personal details about where someone lives, their family or their car.",
  accusation:
    "This states wrongdoing as fact. If it's a question, ask it as one and link the evidence. If it's an allegation, the place for it is the body that decides (for a councillor's conduct, the Integrity Commissioner).",
};

export function checkText(text: string): Finding[] {
  const findings: Finding[] = [];
  const add = (kind: FindingKind, pattern: RegExp) => {
    for (const match of text.matchAll(pattern))
      findings.push({ kind, match: match[0].trim(), message: MESSAGES[kind] });
  };
  add("email", EMAIL);
  add("phone", PHONE);
  add("street-address", STREET);
  add("personal-details", PERSONAL);
  add("accusation", ACCUSATION);
  return findings;
}
