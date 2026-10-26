import type { CoalitionSeed } from "../model";

/**
 * The starting state of the demo coalition workspace. Members are pseudonyms: the workspace needs
 * roles and disclosures, not identities. Whatever a viewer adds is kept in their own browser only
 * (components/coalition/workspace.tsx); nothing is shared with anyone.
 *
 * Paragraph p4 of the position statement is in the seed on purpose: it states as fact something
 * the evidence doesn't establish, so the review check (lib/rules/statement.ts) holds it back.
 */
export const COALITION: CoalitionSeed = {
  id: "east-meadowmere-working-group",
  issueId: "corvane-meadowmere",
  name: "East Meadowmere Residents' Working Group (fictional)",
  objective:
    "Before the Environmental Review Board decides file WERB-2030-0117, get start-up, shutdown and upset conditions and background MX-7 levels assessed, or written into any approval as conditions.",
  objectiveActionId: "statement-of-concern",
  roles: [
    {
      id: "organiser",
      label: "Organiser",
      does: "Keeps the objective, the milestones and the outcome log.",
    },
    {
      id: "researcher",
      label: "Researcher",
      does: "Works on open questions; adds evidence with its passage.",
    },
    {
      id: "reviewer",
      label: "Reviewer",
      does: "Checks claims and statement paragraphs against their passages.",
    },
  ],
  members: [
    {
      id: "m-a",
      pseudonym: "Member A",
      roleId: "organiser",
      disclosure: "No relevant affiliations.",
    },
    {
      id: "m-b",
      pseudonym: "Member B",
      roleId: "researcher",
      disclosure: "Lives about 400 m from the site.",
    },
    {
      id: "m-c",
      pseudonym: "Member C",
      roleId: "reviewer",
      disclosure:
        "Worked as a laboratory technician for a different recycling company, 2019 to 2022.",
    },
  ],
  tasks: [
    {
      id: "t1",
      title: "Turn the statement-of-concern draft into a template members can adapt",
      roleId: "organiser",
      status: "doing",
    },
    {
      id: "t2",
      title: "Find out whether the Board considers compliance history",
      roleId: "researcher",
      status: "open",
    },
    {
      id: "t3",
      title: "Ask the Board whether it publishes the names of people who file",
      roleId: "researcher",
      status: "open",
    },
    {
      id: "t4",
      title: "Get an expert reading of Figure 4 at the school",
      roleId: "reviewer",
      status: "open",
      claimId: "below-guideline-normal",
    },
    {
      id: "t5",
      title: "File the records request for upset-condition modelling",
      roleId: "organiser",
      status: "done",
      claimId: "upset-conditions",
    },
  ],
  questions: [
    {
      id: "q1",
      question: "What is the model's own predicted value at the school?",
      whyItMatters: "The only figure we have is read off a log-scale chart.",
      claimIds: ["below-guideline-normal"],
    },
    {
      id: "q2",
      question: "What are background MX-7 levels in East Meadowmere?",
      whyItMatters: "Without them, nobody knows the total people would breathe.",
      claimIds: ["emissions-safe", "below-guideline-normal"],
    },
    {
      id: "q3",
      question: "Does the guideline's factor for differences among people cover young children?",
      whyItMatters: "The guideline says this hasn't been evaluated for MX-7.",
      claimIds: ["guideline-protects-children"],
    },
  ],
  statement: {
    title: "Draft position statement to the Environmental Review Board",
    reviewsNeeded: 2,
    reviews: [
      {
        by: "Member C",
        date: "2030-03-09",
        note: "p1 to p3 checked against their passages. p4 can't go in as written.",
      },
    ],
    paragraphs: [
      {
        id: "p1",
        kind: "fact",
        text: "The air quality assessment modelled normal operations only. Start-up, shutdown and upset conditions were not modelled.",
        proposedBy: "Member B",
        basis: [{ passage: { sourceId: "air-assessment", passageId: "scenarios" } }],
      },
      {
        id: "p2",
        kind: "fact",
        text: "Background MX-7 concentrations were not added to the predicted values.",
        proposedBy: "Member B",
        basis: [{ passage: { sourceId: "air-assessment", passageId: "background" } }],
      },
      {
        id: "p3",
        kind: "ask",
        text: "We ask the Board to obtain modelling of these conditions and of background levels before it decides, or to make them conditions of any approval.",
        proposedBy: "Member A",
        basis: [],
      },
      {
        id: "p4",
        kind: "fact",
        text: "The facility will expose children at East Meadowmere Elementary to unsafe levels of MX-7.",
        proposedBy: "Member B",
        basis: [{ claimId: "guideline-protects-children" }],
      },
    ],
  },
  disagreements: [
    {
      id: "d1",
      date: "2030-03-06",
      by: "Member C",
      about: "Reading Figure 4 at the school",
      text: "I read 0.041, not 0.038. Both are below the line, but the margin is smaller than our first note said.",
      resolution:
        "Both readings kept side by side. The claim stays at 'needs expert review' until someone qualified reads it or the consultant states the value.",
    },
  ],
  milestones: [
    { id: "ms1", title: "Questions raised at council", date: "2030-02-11", done: true },
    { id: "ms2", title: "Records request filed", date: "2030-03-05", done: true },
    { id: "ms3", title: "Statements of concern sent", date: "2030-03-22", done: false },
    { id: "ms4", title: "Public hearing", date: "2030-03-25", done: false },
    { id: "ms5", title: "Board decision", date: null, done: false },
  ],
};
