import type { TemplateReference } from "./types";

const LAST_VERIFIED = "2026-06-08";

export const templateReferencesV2026 = [
  {
    id: "template-t2125",
    label: "T2125 — Statement of Business Activities",
    docType: "tax-form",
    description:
      "CRA form for reporting business income and expenses on a personal tax return (sole proprietors).",
    prepNote:
      "Prep tool only: gather revenue, expense categories, and CCA schedules before filing with your accountant.",
    externalUrl:
      "https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2125.html",
    citations: [
      {
        title: "Form T2125",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2125.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA T2125 form page.",
      },
    ],
  },
  {
    id: "template-shareholder-agreement",
    label: "Shareholder agreement (reference)",
    docType: "corporate",
    description:
      "Governance document among shareholders — rights, vesting, dispute resolution, exit terms.",
    prepNote:
      "Take draft terms to your lawyer. DotAmi does not generate binding corporate documents.",
    externalUrl: "https://ised-isde.canada.ca/site/corporations-canada/en",
    citations: [
      {
        title: "Corporations Canada",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/corporations-canada/en",
        lastVerified: LAST_VERIFIED,
        note: "Federal incorporation reference for corporate structure context.",
      },
    ],
  },
  {
    id: "template-contractor-nda",
    label: "Contractor NDA (reference)",
    docType: "contract",
    description:
      "Non-disclosure agreement for contractors and freelancers accessing confidential venture information.",
    prepNote:
      "Review with your lawyer before engagement. Templates here are orientation only.",
    externalUrl: "https://www.canada.ca/en/services/business/start.html",
    citations: [
      {
        title: "Starting a business",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/services/business/start.html",
        lastVerified: LAST_VERIFIED,
        note: "Federal business start hub for commercial context.",
      },
    ],
  },
  {
    id: "template-business-name-registration",
    label: "Provincial business name registration",
    docType: "registration",
    description:
      "Operating name registration when carrying on business under a name other than the legal entity name.",
    prepNote:
      "Check provincial registry requirements before customer-facing launch.",
    externalUrl: "https://www.alberta.ca/register-business-name",
    citations: [
      {
        title: "Register a business name",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/register-business-name",
        lastVerified: LAST_VERIFIED,
        note: "Alberta business name registration.",
      },
    ],
  },
] satisfies TemplateReference[];

export type TemplateReferenceId = (typeof templateReferencesV2026)[number]["id"];
