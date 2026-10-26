/**
 * The data model. One evidence system, read by the website, the read-only API and (later) an MCP
 * server: all three go through lib/query.ts, never around it.
 *
 * Three rules shape every type here:
 *
 * 1. Quotations are never retyped. Anything shown as "the source says" or "original wording" is a
 *    PassageRef, and the screen renders the passage's own text. There is no field a person could
 *    type a quotation into, so a quotation can't drift from its source.
 * 2. Five things stay apart: what a source says (`assertedIn`, passages), what the evidence
 *    supports (`supportedConclusion`), our interpretation (`interpretation`), what is unknown
 *    (`unknowns`), and what action is justified (`actionJustified`).
 * 3. Every record in this prototype is invented. `fictional: true` travels with each one so no
 *    screen or API answer can drop the label by accident.
 */

/** A specific place in a specific source. The only way to point at evidence. */
export interface PassageRef {
  sourceId: string;
  passageId: string;
}

/** How confident we are in a proposition, from the evidence reviewed so far. */
export type ClaimStatus =
  "supported" | "partially-supported" | "contradicted" | "unresolved" | "insufficient-evidence";

// ---------------------------------------------------------------------------------------------
// Places and bodies
// ---------------------------------------------------------------------------------------------

export interface Jurisdiction {
  id: string;
  name: string;
  level: "municipal" | "provincial" | "regional";
  parentId?: string;
  fictional: true;
}

export type EntityKind =
  | "company"
  | "holding-company"
  | "asset-manager"
  | "regulator"
  | "ministry"
  | "council"
  | "public-office"
  | "oversight-office"
  | "community-group"
  | "consultancy"
  | "school"
  | "news-outlet"
  | "online-account";

/**
 * An organisation, or a public office. Private individuals are never entities: the demo names
 * offices ("Councillor for Ward 2"), not the people who hold them, and a real deployment would
 * keep it that way unless a person acts in a public role and the record names them in it.
 */
export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  jurisdictionId?: string;
  description: string;
  fictional: true;
}

/** A body that can change the outcome, and the limits of what it can decide. */
export interface Authority {
  id: string;
  entityId: string;
  decides: string;
  cannotDecide: string[];
  jurisdictionId: string;
  basis: PassageRef[];
}

// ---------------------------------------------------------------------------------------------
// Sources and evidence
// ---------------------------------------------------------------------------------------------

export type SourceKind =
  | "technical-report"
  | "guideline"
  | "law"
  | "proposed-law"
  | "regulatory-filing"
  | "regulatory-notice"
  | "council-record"
  | "video-transcript"
  | "annual-report"
  | "website"
  | "enforcement-record"
  | "patent-application"
  | "letter"
  | "news-report"
  | "blog-post"
  | "social-post";

export type Locator =
  | { kind: "page"; page: number }
  | { kind: "section"; section: string }
  | { kind: "table"; table: string; row?: string }
  | { kind: "figure"; figure: string }
  | { kind: "timestamp"; start: string; end: string }
  | { kind: "whole" };

/** What kind of statement a passage is. Matters most for speech: a prediction is not a promise. */
export type StatementType =
  | "factual-claim"
  | "prediction"
  | "opinion"
  | "recommendation"
  | "announcement"
  | "commitment"
  | "legal-text"
  | "procedure"
  | "record-of-decision";

export interface Speaker {
  label: string;
  /** How we know who spoke: named in the official record, inferred (say from), or not known. */
  identification: "named-in-record" | "inferred" | "unknown";
  note?: string;
}

export interface Passage {
  /** Unique within its source; also the #anchor on the source page. */
  id: string;
  locator: Locator;
  /** The source's own words, verbatim. */
  text: string;
  statementType?: StatementType;
  speaker?: Speaker;
  /**
   * Set when this passage restates or copies another (a repost, a clip, a news report of the
   * minutes). It is then not separate evidence: lib/rules/independence.ts follows it to the root.
   */
  repeats?: PassageRef;
}

/** A value read off a figure, and how it was read. */
export interface Extraction {
  id: string;
  label: string;
  x: number;
  value: number;
  unit: string;
  method: "reported-in-table" | "visually-estimated";
  /** For a visual estimate: the range the reader could not narrow further. */
  range?: [number, number];
  readBy: string;
  note: string;
}

export interface FigureSeries {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  style: "solid" | "dashed";
}

/** A chart from a source, kept with its units, scales, legend and the notes printed with it. */
export interface Figure {
  id: string;
  /** The passage holding the figure's caption, so the figure has a locator like any evidence. */
  captionPassageId: string;
  xAxis: { label: string; unit: string; scale: "linear" | "log"; min: number; max: number };
  yAxis: { label: string; unit: string; scale: "linear" | "log"; min: number; max: number };
  series: FigureSeries[];
  /** Points marked on the chart itself (receptors), as the source drew them. */
  markers: { x: number; label: string }[];
  extractions: Extraction[];
}

export interface SourceDocument {
  id: string;
  title: string;
  kind: SourceKind;
  publisherId: string;
  /** Who paid for or commissioned it, when the source itself says so. */
  commissionedById?: string;
  publishedOn: string;
  retrievedOn: string;
  /** Always a demo:// address in this prototype: there is no real page behind any source. */
  originalUrl: string;
  archive: {
    archivedOn: string;
    /** SHA-256 of the archived text (lib/rules/integrity.ts canonicalText); checked on every view. */
    sha256: string;
  };
  versions: { version: string; date: string; note: string }[];
  /**
   * Set when this source copies or restates another one. Repeats of one claim are not independent
   * corroboration (lib/rules/independence.ts counts origins, not copies).
   */
  derivedFromId?: string;
  passages: Passage[];
  figures?: Figure[];
  fictional: true;
}

export type Stance = "supports" | "contradicts" | "qualifies" | "context";

export interface EvidenceLink extends PassageRef {
  stance: Stance;
  /** Why this passage bears on the claim. Our reading, shown as such. */
  note: string;
}

/** One question from the "is this exposure safe?" checklist, answered from the sources. */
export interface ScientificQuestion {
  question: string;
  answer: string;
  /** Whether the reviewed sources answer it, leave it open, or don't address it at all. */
  answered: "answered-by-source" | "not-addressed" | "unclear";
  basis?: PassageRef[];
}

export type ReviewState = "draft" | "in-review" | "needs-expert-review" | "reviewed";

export interface Review {
  state: ReviewState;
  reviews: {
    reviewer: string;
    expertise: "general" | "science" | "law";
    date: string;
    note: string;
  }[];
  corrections: { date: string; change: string; reason: string }[];
}

export type ClaimKind =
  "scientific" | "legal" | "factual" | "attribution" | "relationship" | "historical" | "prediction";

export interface Claim {
  id: string;
  issueId: string;
  /** The precise proposition being tested, worded so that evidence can bear on it. */
  proposition: string;
  kind: ClaimKind;
  /** Where the claim is made: what sources say. */
  assertedIn: PassageRef[];
  status: ClaimStatus;
  /** One line on why the status is what it is. */
  statusReason: string;
  evidence: EvidenceLink[];
  /** What the evidence supports, and no more. */
  supportedConclusion: string;
  /** Our interpretation, labelled as such wherever it is shown. */
  interpretation: string;
  unknowns: string[];
  /** What evidence would move the assessment, either way. */
  wouldChange: { toward: "support" | "contradict"; evidence: string }[];
  /** What the evidence justifies doing, which may be "nothing yet". */
  actionJustified: string;
  /** Separate propositions this one was split into, each assessed on its own. */
  splitInto?: string[];
  related?: string[];
  /** Values read off a figure that this claim's assessment depends on. */
  dependsOnExtractions?: string[];
  scientificQuestions?: ScientificQuestion[];
  /** High-stakes: about health, about a named office-holder's conduct, or decisive for an action. */
  highStakes: boolean;
  review: Review;
}

// ---------------------------------------------------------------------------------------------
// Relationships between organisations
// ---------------------------------------------------------------------------------------------

/**
 * Precise relationship types. There is deliberately no "controls", "owns" (unqualified),
 * "behind" or "linked to": each of those collapses several of these into one accusation.
 */
export type RelationshipType =
  | "ownership"
  | "beneficial-ownership"
  | "assets-managed-for-clients"
  | "voting-authority"
  | "board-role"
  | "employment"
  | "funding"
  | "contract"
  | "partnership"
  | "event-participation"
  | "public-endorsement";

export interface Relationship {
  id: string;
  type: RelationshipType;
  fromId: string;
  toId: string;
  /** The relationship in exact words: amounts, percentages, dates, as the evidence gives them. */
  detail: string;
  period?: { from?: string; to?: string; asOf?: string };
  evidence: EvidenceLink[];
  status: ClaimStatus;
  /** What this relationship does NOT show, spelled out next to it. */
  doesNotEstablish: string[];
}

// ---------------------------------------------------------------------------------------------
// Decisions, the law behind them, and their timelines
// ---------------------------------------------------------------------------------------------

/** Where a decision is. Only "enacted" and "in-force" mean a rule binds anyone yet. */
export type DecisionStage =
  | "application-filed"
  | "proposed"
  | "consultation-open"
  | "consultation-closed"
  | "decided-approved"
  | "decided-refused"
  | "enacted"
  | "in-force"
  | "under-appeal"
  | "withdrawn";

/**
 * How much a piece of text binds. "binding-if-enacted" is the honest label for proposed text:
 * it would bind, if passed, and doesn't yet.
 */
export type LegalForce = "binding" | "binding-if-enacted" | "guidance" | "procedure";

export interface Provision {
  id: string;
  label: string;
  /** The original wording, rendered from the passage. Never retyped. */
  original: PassageRef;
  plainLanguage: string;
  force: LegalForce;
  definitions?: string[];
  exemptions?: string[];
  enforcement?: string;
  /** null when the text has no effective date of its own (it depends on a later step). */
  effectiveDate: string | null;
  uncertainty: string;
  expertReviewNeeded: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string | null;
  /** fixed: it happened or the date is set in a record; tentative: expected; unknown: no date yet. */
  dateCertainty: "fixed" | "scheduled" | "tentative" | "unknown";
  title: string;
  description: string;
  source?: PassageRef;
  /** An event where the public can take part. */
  interventionPoint?: boolean;
}

export interface Decision {
  id: string;
  issueId: string;
  title: string;
  instrument: string;
  authorityId: string;
  jurisdictionId: string;
  stage: DecisionStage;
  stageBasis: PassageRef[];
  provisions: Provision[];
  timeline: TimelineEvent[];
}

// ---------------------------------------------------------------------------------------------
// Action routes, outcomes, and the cases with no route
// ---------------------------------------------------------------------------------------------

export interface Deadline {
  /** ISO date; `time` when the source gives one. */
  date: string;
  time?: string;
  label: string;
  source: PassageRef;
  /** How the date was worked out, when the source gives a rule ("within 30 days") not a date. */
  derivation?: string;
  /** The day someone last checked this date against its source. Absent: never checked. */
  lastVerifiedOn?: string;
}

export type ActionKind =
  | "statement-of-concern"
  | "written-submission"
  | "speak-at-hearing"
  | "records-request"
  | "oversight-request"
  | "contact-representative"
  | "feedback-form";

export interface ActionRoute {
  id: string;
  issueId: string;
  decisionId?: string;
  kind: ActionKind;
  title: string;
  scale: "individual" | "coalition" | "either";
  desiredOutcome: string;
  /** The authority whose decision this route bears on. */
  authorityId: string;
  /** The body that actually receives it (an entity id): sometimes the same, sometimes a clerk or the applicant. */
  receivedById: string;
  process: { description: string; basis: PassageRef[] };
  jurisdictionId: string;
  eligibility: string;
  eligibilityBasis: PassageRef[];
  deadline?: Deadline;
  evidenceRequired: string[];
  /** A rough guess, labelled as one: nobody has measured it. */
  effort: string;
  limitations: string[];
  unknowns: string[];
  nextStep: string;
  followUp: string;
  /** The claims this action rests on, so a reader can see what it is (and isn't) based on. */
  restsOnClaims: string[];
  /** Who it would go to, in words. The prototype holds no real address for anything. */
  destinationLabel: string;
  /** A starting text for a draft, when a draft makes sense. The person rewrites it. */
  draftTemplate?: string;
}

/** A question people ask for which no verified action route exists. Said plainly, not hidden. */
export interface NoRoute {
  id: string;
  issueId: string;
  question: string;
  why: string;
  basis: PassageRef[];
  couldBeResearched: string[];
}

export interface OutcomeEntry {
  id: string;
  issueId: string;
  date: string;
  actionRouteId?: string;
  whatWasDone: string;
  response: string;
  result: "pending" | "acknowledged" | "partly-met" | "met" | "not-met" | "no-response";
  source?: PassageRef;
}

// ---------------------------------------------------------------------------------------------
// Issues and the coalition workspace's starting data
// ---------------------------------------------------------------------------------------------

export type Confidence = "documented" | "modelled" | "uncertain" | "projection" | "not-assessed";

export interface AffectedGroup {
  id: string;
  group: string;
  how: string;
  confidence: Confidence;
  basis: PassageRef[];
  claimIds: string[];
  /** The places (lib/demo/places.ts) for which this group is shown first. */
  zones: string[];
}

export interface Issue {
  id: string;
  title: string;
  /** "researched-demo": fully worked demo. "intake-only": listed, nothing reviewed yet. */
  state: "researched-demo" | "intake-only";
  jurisdictionIds: string[];
  tags: string[];
  oneLine: string;
  whatHappened: string;
  /** The question the issue page is built around. */
  keyQuestion: string;
  affected: AffectedGroup[];
  decisionIds: string[];
  claimIds: string[];
  lastReviewedOn?: string;
  fictional: true;
}

export interface CoalitionSeed {
  id: string;
  issueId: string;
  name: string;
  objective: string;
  objectiveActionId: string;
  roles: { id: string; label: string; does: string }[];
  members: { id: string; pseudonym: string; roleId: string; disclosure: string }[];
  tasks: {
    id: string;
    title: string;
    roleId: string;
    status: "open" | "doing" | "done";
    claimId?: string;
  }[];
  questions: { id: string; question: string; whyItMatters: string; claimIds: string[] }[];
  statement: PositionStatement;
  disagreements: {
    id: string;
    date: string;
    by: string;
    about: string;
    text: string;
    resolution: string;
  }[];
  milestones: { id: string; title: string; date: string | null; done: boolean }[];
}

export interface StatementParagraph {
  id: string;
  /** "fact" paragraphs state something as true and must rest on evidence; "ask" and "view" don't. */
  kind: "fact" | "ask" | "view";
  text: string;
  proposedBy: string;
  basis: { claimId?: string; passage?: PassageRef }[];
}

export interface PositionStatement {
  title: string;
  paragraphs: StatementParagraph[];
  reviewsNeeded: number;
  reviews: { by: string; date: string; note: string }[];
}
