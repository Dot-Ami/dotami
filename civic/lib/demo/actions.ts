import type { ActionRoute, NoRoute, OutcomeEntry } from "../model";

/**
 * Action routes for the demo issue. Each one names the body that receives it, the process and the
 * passage that sets the process out, who may use it, and its limits. Effort figures are rough
 * guesses by the demo team and say so; nobody has measured them.
 *
 * Deadlines are checked by lib/rules/deadlines.ts against the demo clock: a date is shown as
 * something to act on only when it is still ahead AND was checked against its source recently.
 */
const ISSUE = "corvane-meadowmere";

export const ACTION_ROUTES: ActionRoute[] = [
  {
    id: "statement-of-concern",
    issueId: ISSUE,
    decisionId: "air-approval",
    kind: "statement-of-concern",
    title: "File a statement of concern with the Environmental Review Board",
    scale: "either",
    desiredOutcome:
      "The Board obtains modelling of start-up, shutdown and upset conditions, and background MX-7 levels, before it decides; or makes them conditions of any approval.",
    authorityId: "board",
    receivedById: "env-board",
    process: {
      description:
        "A written statement to the Board about file WERB-2030-0117, saying how you are directly affected and what you want the Board to consider.",
      basis: [
        { sourceId: "board-notice", passageId: "who-may-file" },
        { sourceId: "board-notice", passageId: "what-to-include" },
      ],
    },
    jurisdictionId: "westmark",
    eligibility:
      "People who are directly affected by the application. The Board decides who is; living near the site may be relevant, but this prototype can't tell you whether you qualify.",
    eligibilityBasis: [{ sourceId: "board-notice", passageId: "who-decides-affected" }],
    deadline: {
      date: "2030-03-22",
      label: "Statements must be received by the Board",
      source: { sourceId: "board-notice", passageId: "who-may-file" },
      derivation:
        "30 days from the notice date of 20 February 2030 is 22 March 2030. The notice gives the rule, not the date.",
      lastVerifiedOn: "2030-03-11",
    },
    evidenceRequired: [
      "Your name and mailing address (the Board asks for them; this prototype doesn't).",
      "How you are directly affected.",
      "The concerns you want considered, ideally pointing to the passages they rest on.",
    ],
    effort: "Roughly 1 to 2 hours (a guess, not measured).",
    limitations: [
      "The Board isn't obliged to do what a statement asks.",
      "The Board decides whether you are directly affected.",
    ],
    unknowns: [
      "Whether the Board publishes the names of people who file. Ask the Board before you send.",
    ],
    nextStep:
      "Draft it below. The draft stays in this browser; you review it and send it yourself.",
    followUp:
      "Keep a copy and the date you sent it. Filing one is what keeps a right of appeal open, so watch for the Board's decision notice.",
    restsOnClaims: ["upset-conditions", "emissions-safe", "below-guideline-normal"],
    destinationLabel:
      "Westmark Environmental Review Board, file WERB-2030-0117 (fictional: there is no real address)",
    draftTemplate:
      "To the Westmark Environmental Review Board, re file WERB-2030-0117.\n\nHow I am directly affected: [say where you live, work or study in relation to the site, in your own words].\n\nMy concerns:\n1. The air quality assessment says start-up, shutdown and upset conditions were not modelled (section 3.2).\n2. Background MX-7 concentrations were not added to the predicted values (section 3.3).\n3. Table 5 gives no predicted value for East Meadowmere Elementary School, which the report names as a sensitive receptor (section 3.4).\n\nI ask the Board to obtain this information before deciding, or to make it a condition of any approval.",
  },
  {
    id: "written-submission",
    issueId: ISSUE,
    decisionId: "bylaw-2030-14",
    kind: "written-submission",
    title: "Send a written submission for the Bylaw 2030-14 public hearing",
    scale: "either",
    desiredOutcome:
      "Councillors have your view, and the questions that remain open, in the hearing agenda before they vote.",
    authorityId: "council",
    receivedById: "town-clerk",
    process: {
      description:
        "A written submission to the Town Clerk, included in the hearing agenda if received in time.",
      basis: [
        { sourceId: "council-minutes", passageId: "hearing-scheduled" },
        { sourceId: "hearing-procedure", passageId: "written" },
      ],
    },
    jurisdictionId: "meadowmere",
    eligibility: "Anyone. The hearing procedure doesn't limit who may write.",
    eligibilityBasis: [{ sourceId: "hearing-procedure", passageId: "written" }],
    deadline: {
      date: "2030-03-18",
      time: "12:00",
      label: "Received by the Town Clerk by noon",
      source: { sourceId: "council-minutes", passageId: "hearing-scheduled" },
      lastVerifiedOn: "2030-02-12",
    },
    evidenceRequired: [
      "None required. Pointing to the passages your points rest on makes them easier to weigh.",
    ],
    effort: "Roughly 30 minutes to an hour (a guess, not measured).",
    limitations: [
      "The rezoning decides land use, not air emissions. Air questions belong to the Board.",
      "After the hearing closes, Council may not receive new information.",
    ],
    unknowns: [],
    nextStep: "Confirm the deadline with the Town Clerk: it was last checked a month ago.",
    followUp: "Check that your submission appears in the published hearing agenda.",
    restsOnClaims: ["rezoning-approved"],
    destinationLabel: "Town Clerk, Town of Meadowmere (fictional: there is no real address)",
    draftTemplate:
      "To the Town Clerk, for the public hearing on Bylaw 2030-14.\n\nMy view: [your view, in your own words].\n\nQuestions I ask Council to consider before third reading:\n1. [your question]",
  },
  {
    id: "speak-at-hearing",
    issueId: ISSUE,
    decisionId: "bylaw-2030-14",
    kind: "speak-at-hearing",
    title: "Speak at the public hearing on Bylaw 2030-14",
    scale: "individual",
    desiredOutcome: "Councillors hear directly from residents before they decide.",
    authorityId: "council",
    receivedById: "meadowmere-council",
    process: {
      description: "Attend the hearing and speak for up to five minutes.",
      basis: [
        { sourceId: "council-minutes", passageId: "hearing-scheduled" },
        { sourceId: "hearing-procedure", passageId: "any-person" },
      ],
    },
    jurisdictionId: "meadowmere",
    eligibility: "Any person.",
    eligibilityBasis: [{ sourceId: "hearing-procedure", passageId: "any-person" }],
    deadline: {
      date: "2030-03-25",
      time: "18:00",
      label: "The hearing",
      source: { sourceId: "council-minutes", passageId: "hearing-scheduled" },
      lastVerifiedOn: "2030-03-11",
    },
    evidenceRequired: [],
    effort: "An evening, plus preparation (a guess, not measured).",
    limitations: [
      "Five minutes per speaker.",
      "This is the last point at which Council may receive new information on the bylaw.",
    ],
    unknowns: ["Whether speakers must register in advance (not in the reviewed sources)."],
    nextStep: "Ask the Town Clerk whether speakers register in advance.",
    followUp: "The minutes of the hearing will record who spoke.",
    restsOnClaims: ["rezoning-approved"],
    destinationLabel: "Meadowmere Town Council, in person (fictional)",
  },
  {
    id: "records-request",
    issueId: ISSUE,
    decisionId: "air-approval",
    kind: "records-request",
    title: "Request the Board's records on upset-condition modelling",
    scale: "either",
    desiredOutcome:
      "Find out whether any modelling of start-up, shutdown or upset conditions exists for this file, or was asked for.",
    authorityId: "board",
    receivedById: "env-board",
    process: {
      description:
        "A freedom of information request to the Board, as a public body, for the records described.",
      basis: [
        { sourceId: "foi-act", passageId: "s7" },
        { sourceId: "foi-act", passageId: "s11" },
      ],
    },
    jurisdictionId: "westmark",
    eligibility: "Any person.",
    eligibilityBasis: [{ sourceId: "foi-act", passageId: "s7" }],
    evidenceRequired: [
      "A description of the records you want, specific enough to find them.",
      "The W$25 initial fee.",
    ],
    effort:
      "Under an hour to file; the answer can take 30 days or more (a guess for filing, the Act for the wait).",
    limitations: [
      "A response is due within 30 days, which may come after the statement-of-concern window closes. File the statement first.",
      "Information that would reveal a third party's trade secrets must be withheld.",
    ],
    unknowns: [],
    nextStep:
      "One has already been filed by the working group (see the outcome log). Check before filing a duplicate.",
    followUp: "Log the response date and what was released or withheld.",
    restsOnClaims: ["upset-conditions"],
    destinationLabel: "Westmark Environmental Review Board, information access office (fictional)",
  },
  {
    id: "integrity-question",
    issueId: ISSUE,
    decisionId: "bylaw-2030-14",
    kind: "oversight-request",
    title: "Ask the Integrity Commissioner about the Ward 2 declaration",
    scale: "individual",
    desiredOutcome:
      "The question of a conflict is answered by the body that decides it, instead of argued about.",
    authorityId: "integrity",
    receivedById: "integrity-commissioner",
    process: {
      description:
        "A written complaint to the Integrity Commissioner, setting out the facts relied on, signed.",
      basis: [
        { sourceId: "code-of-conduct", passageId: "advice-and-complaints" },
        { sourceId: "code-of-conduct", passageId: "complaint-form" },
      ],
    },
    jurisdictionId: "meadowmere",
    eligibility: "Any person.",
    eligibilityBasis: [{ sourceId: "code-of-conduct", passageId: "advice-and-complaints" }],
    evidenceRequired: [
      "The facts relied on: here, the declaration recorded in the minutes of 11 February 2030.",
      "Your signature.",
    ],
    effort: "About an hour (a guess, not measured).",
    limitations: [
      "This asks a question; it doesn't establish anything. Don't present it as a finding.",
      "Stick to the recorded facts. Speculation about the person's motives doesn't belong in it.",
    ],
    unknowns: [
      "How long the Commissioner takes, and whether findings are published (not in the reviewed sources).",
    ],
    nextStep: "Read the declaration in the minutes, then decide whether to ask.",
    followUp: "Log whether and when the Commissioner responds.",
    restsOnClaims: ["ward2-conflict"],
    destinationLabel: "Meadowmere Integrity Commissioner (fictional)",
  },
  {
    id: "contact-councillor",
    issueId: ISSUE,
    decisionId: "bylaw-2030-14",
    kind: "contact-representative",
    title: "Write to your ward councillor or the Mayor",
    scale: "individual",
    desiredOutcome: "Your representative knows your view and your questions before third reading.",
    authorityId: "council",
    receivedById: "meadowmere-council",
    process: {
      description: "Email or phone through the Town's directory.",
      basis: [{ sourceId: "contact-page", passageId: "contact" }],
    },
    jurisdictionId: "meadowmere",
    eligibility: "Residents of the ward, for a ward councillor; any resident, for the Mayor.",
    eligibilityBasis: [{ sourceId: "contact-page", passageId: "contact" }],
    evidenceRequired: [],
    effort: "Under 30 minutes (a guess, not measured).",
    limitations: ["A letter to a councillor is not the same as a hearing submission."],
    unknowns: [
      "Whether letters sent straight to councillors become part of the hearing record. Ask the Town Clerk.",
    ],
    nextStep:
      "If you want your view in the hearing record, use the written submission instead or as well.",
    followUp: "Note whether you get a reply.",
    restsOnClaims: [],
    destinationLabel: "Your ward councillor or the Mayor, Town of Meadowmere (fictional)",
  },
  {
    id: "open-house-feedback",
    issueId: ISSUE,
    decisionId: "bylaw-2030-14",
    kind: "feedback-form",
    title: "Send feedback through the applicant's open-house form",
    scale: "individual",
    desiredOutcome: "The applicant summarises residents' feedback in its application.",
    authorityId: "council",
    receivedById: "corvane-recovery",
    process: {
      description: "A feedback form run by the applicant, not a public body.",
      basis: [{ sourceId: "open-house-notice", passageId: "feedback" }],
    },
    jurisdictionId: "meadowmere",
    eligibility: "Anyone.",
    eligibilityBasis: [{ sourceId: "open-house-notice", passageId: "feedback" }],
    deadline: {
      date: "2029-12-15",
      label: "Forms accepted until",
      source: { sourceId: "open-house-notice", passageId: "feedback" },
      lastVerifiedOn: "2029-11-20",
    },
    evidenceRequired: [],
    effort: "Closed.",
    limitations: ["Run by the applicant: it is not a step in either public decision."],
    unknowns: [],
    nextStep: "Closed. Kept here so the record of what was possible stays complete.",
    followUp: "",
    restsOnClaims: [],
    destinationLabel: "Corvane Metals Recovery Ltd. (fictional)",
  },
];

/** Questions people ask that have no verified route. Said plainly, so they aren't answered with a made-up one. */
export const NO_ROUTES: NoRoute[] = [
  {
    id: "frostmere-penalty",
    issueId: ISSUE,
    question: "Can we get the parent company penalised for the 2019 Frostmere release?",
    why: "The order was made by a regulator in another jurisdiction and was closed in 2020. Nothing in the reviewed sources gives anyone in Meadowmere or Westmark a process to reopen it.",
    basis: [{ sourceId: "enforcement-order", passageId: "closed" }],
    couldBeResearched: [
      "Whether the Westmark Board considers an applicant's compliance history when it decides (the Act's excerpts don't say).",
    ],
  },
  {
    id: "ardent-votes",
    issueId: ISSUE,
    question: "Can we make Ardent Peak use its votes against the project?",
    why: "Ardent Peak votes shares in the parent company for its clients. No public process in Meadowmere or Westmark covers how a fund manager votes, and the reviewed sources describe none.",
    basis: [{ sourceId: "annual-report", passageId: "major-shareholders" }],
    couldBeResearched: [
      "Whether Ardent Peak publishes a voting policy or voting record.",
      "Whether the parent's shareholders vote on individual projects at all (usually they don't).",
    ],
  },
];

export const OUTCOMES: OutcomeEntry[] = [
  {
    id: "feb-questions",
    issueId: ISSUE,
    date: "2030-02-11",
    whatWasDone:
      "Three East Meadowmere residents asked at council whether the assessment covered upset conditions and the school.",
    response:
      "Council directed administration to ask the public-health office for comments before the hearing.",
    result: "partly-met",
    source: { sourceId: "council-minutes", passageId: "health-request" },
  },
  {
    id: "health-office-reply",
    issueId: ISSUE,
    date: "2030-03-01",
    whatWasDone: "The Town asked the Office of the Chief Medical Officer of Health for comments.",
    response: "The office expects to comment before the hearing; its review isn't complete.",
    result: "pending",
    source: { sourceId: "health-letter", passageId: "not-yet" },
  },
  {
    id: "foi-filed",
    issueId: ISSUE,
    date: "2030-03-05",
    actionRouteId: "records-request",
    whatWasDone:
      "The working group filed a records request with the Board for any upset-condition modelling.",
    response: "Acknowledged on 6 March. Response due by 4 April 2030.",
    result: "acknowledged",
    source: { sourceId: "working-group-log", passageId: "foi-ack" },
  },
];
