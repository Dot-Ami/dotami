import type { Relationship, RelationshipType } from "../model";

/**
 * What each relationship type means, and what it does not. Shown next to every relationship, so
 * "holds shares for clients" can never be read as "owns", and "funded" never as "controls".
 */
export const RELATIONSHIP_TYPES: Record<
  RelationshipType,
  { label: string; means: string; doesNotMean: string }
> = {
  ownership: {
    label: "Owns",
    means: "Holds the shares or title in its own right.",
    doesNotMean: "That the owner directs day-to-day decisions, unless the evidence shows it.",
  },
  "beneficial-ownership": {
    label: "Beneficial owner of",
    means: "Ultimately benefits from the holding, even if it is held in another name.",
    doesNotMean: "Legal title, or control.",
  },
  "assets-managed-for-clients": {
    label: "Manages client holdings in",
    means: "Invests other people's money, which is held in the company's shares.",
    doesNotMean: "That the manager owns the company. The clients' money is the clients'.",
  },
  "voting-authority": {
    label: "Can vote shares in",
    means: "Has authority to vote a stated share of the votes at shareholder meetings.",
    doesNotMean: "Ownership, or how the votes have been or will be used.",
  },
  "board-role": {
    label: "Sits on the board of",
    means: "Holds a seat on the governing board.",
    doesNotMean: "That the person or body acts for the organisation outside that role.",
  },
  employment: {
    label: "Employed by",
    means: "Works or worked for the organisation, for the stated period.",
    doesNotMean: "A continuing interest after the employment ended.",
  },
  funding: {
    label: "Funded",
    means: "Gave the stated money, for the stated purpose.",
    doesNotMean: "That the funder directs what the recipient does or says.",
  },
  contract: {
    label: "Contracted",
    means: "Paid for specified work under an agreement.",
    doesNotMean: "Agreement with the client's views, or wider involvement.",
  },
  partnership: {
    label: "Partner of",
    means: "A declared, formal joint undertaking.",
    doesNotMean: "Shared ownership or a common position on everything.",
  },
  "event-participation": {
    label: "Took part in an event with",
    means: "Attended or spoke at the same event.",
    doesNotMean: "Agreement, coordination or any other relationship.",
  },
  "public-endorsement": {
    label: "Publicly endorsed",
    means: "Stated public support.",
    doesNotMean: "Funding, coordination, or that the endorser was asked to.",
  },
};

export const RELATIONSHIPS: Relationship[] = [
  {
    id: "holdings-owns-recovery",
    type: "ownership",
    fromId: "corvane-holdings",
    toId: "corvane-recovery",
    detail: "Corvane Holdings plc owns all of Corvane Metals Recovery Ltd.",
    period: { asOf: "2029-12-31" },
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "subsidiary",
        stance: "supports",
        note: "Stated as a wholly owned subsidiary.",
      },
    ],
    status: "supported",
    doesNotEstablish: ["Who makes the decisions about the Meadowmere facility."],
  },
  {
    id: "ardent-manages-holdings",
    type: "assets-managed-for-clients",
    fromId: "ardent-peak",
    toId: "corvane-holdings",
    detail:
      "Funds and accounts managed by Ardent Peak held 8.2% of Corvane Holdings' ordinary shares on behalf of their clients.",
    period: { asOf: "2029-12-31" },
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "major-shareholders",
        stance: "supports",
        note: "Stated in the major shareholders section.",
      },
    ],
    status: "supported",
    doesNotEstablish: [
      "That Ardent Peak owns Corvane Holdings or the applicant.",
      "Any involvement by Ardent Peak in the Meadowmere project.",
    ],
  },
  {
    id: "ardent-votes-holdings",
    type: "voting-authority",
    fromId: "ardent-peak",
    toId: "corvane-holdings",
    detail:
      "Ardent Peak has discretionary voting authority over 5.1% of Corvane Holdings' ordinary shares.",
    period: { asOf: "2029-12-31" },
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "major-shareholders",
        stance: "supports",
        note: "Stated in the same passage.",
      },
    ],
    status: "supported",
    doesNotEstablish: ["How those votes have been used.", "Control: 5.1% of votes is a minority."],
  },
  {
    id: "recovery-funds-jobs-forward",
    type: "funding",
    fromId: "corvane-recovery",
    toId: "jobs-forward",
    detail:
      "Corvane Metals Recovery Ltd. contributed W$45,000 in 2029 to support Meadowmere Jobs Forward's information sessions.",
    period: { from: "2029-01-01", to: "2029-12-31" },
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "community-investment",
        stance: "supports",
        note: "The company's report.",
      },
      {
        sourceId: "jobs-forward-site",
        passageId: "supporters",
        stance: "supports",
        note: "The group's own disclosure.",
      },
    ],
    status: "supported",
    doesNotEstablish: [
      "That the applicant directs the group.",
      "What share of the group's money this is.",
    ],
  },
  {
    id: "recovery-contracts-northline",
    type: "contract",
    fromId: "corvane-recovery",
    toId: "northline",
    detail: "Northline prepared the air quality assessment for the applicant.",
    evidence: [
      {
        sourceId: "air-assessment",
        passageId: "cover",
        stance: "supports",
        note: "The report's cover names Northline as author and the applicant as client.",
      },
    ],
    status: "supported",
    doesNotEstablish: [
      "That the assessment is wrong. Applicant-commissioned assessments are the normal process.",
    ],
  },
  {
    id: "ward2-employed-recovery",
    type: "employment",
    fromId: "ward2-councillor",
    toId: "corvane-recovery",
    detail:
      "The current holder of the office worked for Corvane Metals Recovery Ltd. until June 2028, as they declared at council.",
    period: { to: "2028-06-30" },
    evidence: [
      {
        sourceId: "council-minutes",
        passageId: "ward2-declaration",
        stance: "supports",
        note: "The Councillor's own declaration, in the minutes.",
      },
    ],
    status: "supported",
    doesNotEstablish: [
      "A continuing financial interest.",
      "A conflict of interest under the code: that is for the Integrity Commissioner.",
    ],
  },
];
