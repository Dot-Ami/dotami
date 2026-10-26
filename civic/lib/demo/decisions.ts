import type { Authority, Decision } from "../model";

/**
 * The two decisions in the demo issue, made by two different bodies under two different laws.
 * Keeping them apart matters: residents often aim at the council when the air question belongs
 * to the provincial board, and the other way round.
 */
export const AUTHORITIES: Authority[] = [
  {
    id: "council",
    entityId: "meadowmere-council",
    jurisdictionId: "meadowmere",
    decides:
      "Whether to pass Bylaw 2030-14, which would allow a metals recovery facility on the East Industrial Lands.",
    cannotDecide: [
      "Air emission limits: those belong to the Environmental Review Board's approval.",
      "Whether to approve the facility itself: under the bylaw that is a later decision of the Development Authority.",
    ],
    basis: [
      { sourceId: "bylaw-2030-14", passageId: "s1" },
      { sourceId: "bylaw-2030-14", passageId: "s4-2" },
    ],
  },
  {
    id: "board",
    entityId: "env-board",
    jurisdictionId: "westmark",
    decides:
      "Whether to issue the air emissions approval, with or without conditions, or to refuse it.",
    cannotDecide: ["Land use: zoning is the council's."],
    basis: [
      { sourceId: "env-act", passageId: "s70-1" },
      { sourceId: "board-notice", passageId: "decision-options" },
    ],
  },
  {
    id: "integrity",
    entityId: "integrity-commissioner",
    jurisdictionId: "meadowmere",
    decides:
      "Whether a councillor's conduct meets the Code of Conduct, when asked for advice or a complaint is made.",
    cannotDecide: ["Whether the bylaw passes."],
    basis: [{ sourceId: "code-of-conduct", passageId: "advice-and-complaints" }],
  },
];

export const DECISIONS: Decision[] = [
  {
    id: "bylaw-2030-14",
    issueId: "corvane-meadowmere",
    title: "Bylaw 2030-14: rezoning the East Industrial Lands",
    instrument: "Land use bylaw amendment",
    authorityId: "council",
    jurisdictionId: "meadowmere",
    stage: "proposed",
    stageBasis: [
      { sourceId: "council-minutes", passageId: "first-reading" },
      { sourceId: "bylaw-2030-14", passageId: "s6" },
    ],
    provisions: [
      {
        id: "redesignation",
        label: "s. 1: the redesignation",
        original: { sourceId: "bylaw-2030-14", passageId: "s1" },
        plainLanguage:
          "The land shown on the bylaw's map would move from light to heavy industrial zoning.",
        force: "binding-if-enacted",
        effectiveDate: null,
        uncertainty:
          "Schedule A (the map) is not among the reviewed excerpts, so which parcels are included hasn't been checked.",
        expertReviewNeeded: false,
      },
      {
        id: "definition",
        label: "s. 2(c): what a Metals Recovery Facility is",
        original: { sourceId: "bylaw-2030-14", passageId: "s2c" },
        plainLanguage:
          "The definition covers recovering metals from batteries or electronics, and storing the material waiting to be processed.",
        force: "binding-if-enacted",
        definitions: ["Metals Recovery Facility"],
        effectiveDate: null,
        uncertainty: "None noted.",
        expertReviewNeeded: false,
      },
      {
        id: "discretionary-use",
        label: "s. 4.2: discretionary, not automatic",
        original: { sourceId: "bylaw-2030-14", passageId: "s4-2" },
        plainLanguage:
          "Passing the bylaw would not approve the facility itself. The Town's Development Authority would still decide, and could attach conditions.",
        force: "binding-if-enacted",
        effectiveDate: null,
        uncertainty:
          "Whether residents can take part in the later Development Authority decision isn't in the reviewed sources.",
        expertReviewNeeded: true,
      },
      {
        id: "coming-into-force",
        label: "s. 6: when it would take effect",
        original: { sourceId: "bylaw-2030-14", passageId: "s6" },
        plainLanguage:
          "Nothing in the bylaw has effect until Council passes it after third reading.",
        force: "binding-if-enacted",
        effectiveDate: null,
        uncertainty: "None noted.",
        expertReviewNeeded: false,
      },
    ],
    timeline: [
      {
        id: "open-house",
        date: "2029-12-15",
        dateCertainty: "fixed",
        title: "Applicant's open-house feedback closed",
        description: "The applicant accepted feedback forms until this date.",
        source: { sourceId: "open-house-notice", passageId: "feedback" },
        interventionPoint: true,
      },
      {
        id: "first-reading",
        date: "2030-02-11",
        dateCertainty: "fixed",
        title: "First reading",
        description: "Council gave the bylaw first reading and scheduled a public hearing.",
        source: { sourceId: "council-minutes", passageId: "first-reading" },
      },
      {
        id: "written-deadline",
        date: "2030-03-18",
        dateCertainty: "scheduled",
        title: "Written submissions due (noon)",
        description: "Submissions received by the Town Clerk by noon go into the hearing agenda.",
        source: { sourceId: "council-minutes", passageId: "hearing-scheduled" },
        interventionPoint: true,
      },
      {
        id: "hearing",
        date: "2030-03-25",
        dateCertainty: "scheduled",
        title: "Public hearing (6:00 p.m.)",
        description:
          "Anyone may speak for up to five minutes. After it closes, Council may not receive new information.",
        source: { sourceId: "council-minutes", passageId: "hearing-scheduled" },
        interventionPoint: true,
      },
      {
        id: "second-third",
        date: null,
        dateCertainty: "unknown",
        title: "Second and third reading",
        description: "No date set. The bylaw takes effect only if passed at third reading.",
        source: { sourceId: "bylaw-2030-14", passageId: "s6" },
      },
    ],
  },
  {
    id: "air-approval",
    issueId: "corvane-meadowmere",
    title: "Air emissions approval, file WERB-2030-0117",
    instrument: "Environmental approval under the Environmental Protection Act",
    authorityId: "board",
    jurisdictionId: "westmark",
    stage: "consultation-open",
    stageBasis: [{ sourceId: "board-notice", passageId: "who-may-file" }],
    provisions: [
      {
        id: "board-power",
        label: "Act s. 70(1): what the Board may do",
        original: { sourceId: "env-act", passageId: "s70-1" },
        plainLanguage:
          "The Board can approve emissions and attach any conditions it thinks appropriate. This is in force now.",
        force: "binding",
        effectiveDate: "2024-01-01",
        uncertainty:
          "The Act's excerpts don't say what the Board must weigh, for example an applicant's history elsewhere.",
        expertReviewNeeded: true,
      },
      {
        id: "conditions-bind",
        label: "Act s. 70(4): conditions are binding",
        original: { sourceId: "env-act", passageId: "s70-4" },
        plainLanguage:
          "If the Board writes a condition into the approval, the company must follow it and it can be enforced.",
        force: "binding",
        enforcement: "Part 9 of the Act (not among the reviewed excerpts).",
        effectiveDate: "2024-01-01",
        uncertainty: "Penalties under Part 9 not reviewed.",
        expertReviewNeeded: false,
      },
      {
        id: "guideline-status",
        label: "Guideline s. 1.3: what the 0.050 µg/m³ value is",
        original: { sourceId: "air-guideline", passageId: "status" },
        plainLanguage:
          "The guideline value is not a legal limit. It becomes binding on the company only if the Board writes it into the approval as a condition.",
        force: "guidance",
        effectiveDate: null,
        uncertainty: "None noted.",
        expertReviewNeeded: false,
      },
      {
        id: "appeal",
        label: "Act s. 73: who can appeal",
        original: { sourceId: "env-act", passageId: "s73" },
        plainLanguage:
          "Only someone who filed a statement of concern, and is directly affected, can appeal the Board's decision, within 30 days of notice of it.",
        force: "binding",
        effectiveDate: "2024-01-01",
        uncertainty: '"Directly affected" is decided by the Board case by case.',
        expertReviewNeeded: true,
      },
    ],
    timeline: [
      {
        id: "application-filed",
        date: "2030-01-28",
        dateCertainty: "fixed",
        title: "Application filed",
        description:
          "The applicant filed for an air emissions approval, with the air quality assessment.",
        source: { sourceId: "approval-application", passageId: "controls" },
      },
      {
        id: "notice",
        date: "2030-02-20",
        dateCertainty: "fixed",
        title: "Notice of application published",
        description: "Opens the 30-day window for statements of concern.",
        source: { sourceId: "board-notice", passageId: "who-may-file" },
      },
      {
        id: "soc-deadline",
        date: "2030-03-22",
        dateCertainty: "scheduled",
        title: "Statements of concern due",
        description:
          "30 days from the notice date. Filing one is also what keeps a right of appeal open.",
        source: { sourceId: "board-notice", passageId: "who-may-file" },
        interventionPoint: true,
      },
      {
        id: "board-decision",
        date: null,
        dateCertainty: "unknown",
        title: "Board decision",
        description: "No date published. Approve, approve with conditions, or refuse.",
        source: { sourceId: "board-notice", passageId: "decision-options" },
      },
      {
        id: "appeal-window",
        date: null,
        dateCertainty: "unknown",
        title: "Appeal window (30 days after notice of decision)",
        description:
          "Open only to people who filed a statement of concern and are directly affected.",
        source: { sourceId: "env-act", passageId: "s73" },
        interventionPoint: true,
      },
    ],
  },
];
