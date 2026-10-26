import type { Entity, Jurisdiction } from "../model";

/**
 * The demo world. Every place, body, company and document in it is invented. The timeline is set
 * in 2030 on purpose, so that no date in the demo can be mistaken for a real, current deadline.
 *
 * The demo clock is "today" inside that world. Deadline states (open, check the date, closed) are
 * worked out against it, never against the real date, so the demo reads the same whenever it runs.
 */
export const DEMO_CLOCK = "2030-03-12";

export const DEMO_NOTICE =
  "Demo data. Every place, organisation, document, quotation, figure and date in this prototype is invented. None of it describes a real decision, and no deadline here is real.";

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: "westmark",
    name: "Province of Westmark (fictional)",
    level: "provincial",
    fictional: true,
  },
  {
    id: "meadowmere",
    name: "Town of Meadowmere (fictional)",
    level: "municipal",
    parentId: "westmark",
    fictional: true,
  },
  {
    id: "northern-region",
    name: "Northern Region (fictional, outside Westmark)",
    level: "regional",
    fictional: true,
  },
];

export const ENTITIES: Entity[] = [
  {
    id: "corvane-recovery",
    name: "Corvane Metals Recovery Ltd. (fictional)",
    kind: "company",
    jurisdictionId: "westmark",
    description: "The applicant: proposes to build and run the metals recovery facility.",
    fictional: true,
  },
  {
    id: "corvane-holdings",
    name: "Corvane Holdings plc (fictional)",
    kind: "holding-company",
    description: "The applicant's parent company, listed on a stock exchange.",
    fictional: true,
  },
  {
    id: "ardent-peak",
    name: "Ardent Peak Asset Management (fictional)",
    kind: "asset-manager",
    description: "An investment manager whose client funds hold shares in Corvane Holdings.",
    fictional: true,
  },
  {
    id: "northline",
    name: "Northline Environmental Consulting (fictional)",
    kind: "consultancy",
    description: "Prepared the air quality assessment filed with the application.",
    fictional: true,
  },
  {
    id: "meadowmere-council",
    name: "Meadowmere Town Council (fictional)",
    kind: "council",
    jurisdictionId: "meadowmere",
    description: "Elected council of the Town of Meadowmere. Decides land use bylaws.",
    fictional: true,
  },
  {
    id: "town-clerk",
    name: "Town Clerk, Town of Meadowmere (fictional office)",
    kind: "public-office",
    jurisdictionId: "meadowmere",
    description: "Receives written submissions for public hearings and keeps the hearing record.",
    fictional: true,
  },
  {
    id: "mayor",
    name: "Mayor of Meadowmere (fictional office)",
    kind: "public-office",
    jurisdictionId: "meadowmere",
    description: "Chairs council meetings. The demo names the office, not a person.",
    fictional: true,
  },
  {
    id: "ward2-councillor",
    name: "Councillor for Ward 2 (fictional office)",
    kind: "public-office",
    jurisdictionId: "meadowmere",
    description: "One of seven councillors. The demo names the office, not a person.",
    fictional: true,
  },
  {
    id: "integrity-commissioner",
    name: "Meadowmere Integrity Commissioner (fictional office)",
    kind: "oversight-office",
    jurisdictionId: "meadowmere",
    description: "Advises on and inquires into councillors' conduct under the council's code.",
    fictional: true,
  },
  {
    id: "env-board",
    name: "Westmark Environmental Review Board (fictional)",
    kind: "regulator",
    jurisdictionId: "westmark",
    description: "Decides applications for approvals to release substances into the air.",
    fictional: true,
  },
  {
    id: "env-ministry",
    name: "Westmark Ministry of Environment (fictional)",
    kind: "ministry",
    jurisdictionId: "westmark",
    description: "Publishes the province's ambient air quality guidelines.",
    fictional: true,
  },
  {
    id: "health-office",
    name: "Westmark Office of the Chief Medical Officer of Health (fictional)",
    kind: "ministry",
    jurisdictionId: "westmark",
    description: "Asked by the Town to comment on the application's health effects.",
    fictional: true,
  },
  {
    id: "northern-regulator",
    name: "Northern Region Environmental Regulator (fictional)",
    kind: "regulator",
    jurisdictionId: "northern-region",
    description: "Regulator in another jurisdiction, where the parent group runs another facility.",
    fictional: true,
  },
  {
    id: "jobs-forward",
    name: "Meadowmere Jobs Forward (fictional)",
    kind: "community-group",
    jurisdictionId: "meadowmere",
    description: "A local group that supports the facility and runs information sessions.",
    fictional: true,
  },
  {
    id: "working-group",
    name: "East Meadowmere Residents' Working Group (fictional)",
    kind: "community-group",
    jurisdictionId: "meadowmere",
    description: "Residents organising around the application. The coalition workspace is theirs.",
    fictional: true,
  },
  {
    id: "school",
    name: "East Meadowmere Elementary School (fictional)",
    kind: "school",
    jurisdictionId: "meadowmere",
    description: "Primary school about 450 m north-east of the proposed stack.",
    fictional: true,
  },
  {
    id: "river-valley-daily",
    name: "River Valley Daily (fictional)",
    kind: "news-outlet",
    description: "Local news outlet.",
    fictional: true,
  },
  {
    id: "meadowmere-matters",
    name: "Meadowmere Matters blog (fictional)",
    kind: "online-account",
    description: "A local opinion blog.",
    fictional: true,
  },
  {
    id: "meadowmere-watch",
    name: "@MeadowmereWatch (fictional account)",
    kind: "online-account",
    description: "A social media account that posts about local politics.",
    fictional: true,
  },
  {
    id: "reposting-accounts",
    name: "Two other social accounts (fictional)",
    kind: "online-account",
    description: "Accounts that reposted @MeadowmereWatch's clip with their own captions.",
    fictional: true,
  },
];

/**
 * "Where are you?" without an address. A person picks the nearest description; the choice stays
 * in their browser and only changes which parts of a page are shown first.
 */
export const PLACES = [
  { id: "near-site", label: "East Meadowmere, within about 1 km of the site" },
  { id: "meadowmere", label: "Elsewhere in Meadowmere" },
  { id: "westmark", label: "Elsewhere in Westmark" },
  { id: "elsewhere", label: "Outside Westmark" },
] as const;

export type PlaceId = (typeof PLACES)[number]["id"];
