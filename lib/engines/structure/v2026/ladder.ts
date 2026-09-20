import type { StructureStep } from "./types";

const LAST_VERIFIED = "2026-06-08";

export const structureLadderV2026 = [
  {
    id: "structure-sole-prop",
    label: "Sole proprietorship",
    entityType: "sole-prop",
    trigger: "First commercial activity without incorporating.",
    description:
      "A sole proprietorship is the default structure when one owner carries on business personally. If revenue begins, this unlocks business income reporting on the personal return and direct personal liability for obligations.",
    taxImpact:
      "Net business income flows to the owner on Schedule T2125. Eligible expenses reduce net income. No separate corporate tax return.",
    lensAnnotations: {
      tax: "If the venture earns income without incorporating, this unlocks sole-prop reporting without separate corporate filings.",
      legal:
        "If operating under a trade name, this unlocks provincial business-name registration checks while liability stays with the proprietor.",
    },
    citations: [
      {
        title: "Sole proprietorship",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA overview of sole proprietorship reporting and obligations.",
      },
    ],
    transitionTrigger: "GST/HST registration required or elected when thresholds or business needs apply.",
    nextSteps: ["structure-sole-prop-gst"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "structure-sole-prop-gst",
    label: "Sole prop + GST/HST",
    entityType: "sole-prop-gst",
    trigger: "Voluntary registration or mandatory $30K small-supplier threshold exceeded.",
    description:
      "GST/HST registration changes cash-flow timing and customer pricing. If registration is active, it unlocks charging/collecting GST/HST and claiming input tax credits on eligible business purchases.",
    taxImpact:
      "Registered sole props remit net GST/HST. ITCs can offset GST/HST paid on business inputs. Small-supplier status ends once mandatory registration applies.",
    lensAnnotations: {
      tax: "If ITCs on startup costs matter, voluntary registration before $30K may unlock earlier credit claims — subject to filing and remittance obligations.",
      legal:
        "If contracts require a GST number, registration may unlock B2B eligibility regardless of the small-supplier threshold.",
    },
    citations: [
      {
        title: "Register for a GST/HST account",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/register-account.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on registering for GST/HST.",
      },
      {
        title: "When to register for GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA small-supplier and mandatory registration thresholds.",
      },
    ],
    transitionTrigger: "Net income, liability, SR&ED, or SBD planning may favour incorporation.",
    nextSteps: ["structure-ccpc"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "structure-ccpc",
    label: "Canadian-controlled private corporation (CCPC)",
    entityType: "ccpc",
    trigger: "Incorporation filed federally or provincially; CCPC status confirmed.",
    description:
      "A CCPC is a separate legal person. If incorporation is active, it unlocks limited liability separation, corporate tax rates, potential SBD on active business income, and enhanced SR&ED ITC access subject to limits.",
    taxImpact:
      "Corporate income taxed at corporate rates. Salary/dividend extraction creates personal tax. SBD may apply to qualifying active business income up to the business limit.",
    lensAnnotations: {
      tax: "If net income exceeds sole-prop efficiency, incorporation may unlock SBD and income-splitting structures — with added compliance cost.",
      legal:
        "If customer or supplier contracts require a corporation, or liability exposure grows, incorporation may unlock contractual and risk containment options.",
    },
    citations: [
      {
        title: "Corporation income tax",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA corporate income tax overview.",
      },
      {
        title: "Small business deduction",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/small-business-deduction.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA SBD guidance for CCPCs.",
      },
    ],
    transitionTrigger: "Retained earnings, IP, or multiple ventures may favour a holding company.",
    nextSteps: ["structure-holdco"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "structure-holdco",
    label: "Holding company (Holdco)",
    entityType: "holdco",
    trigger: "Significant retained earnings, IP portfolio, or multiple operating entities.",
    description:
      "A holding company owns shares of one or more operating companies. If a Holdco is in play, it unlocks dividend upstreaming, potential creditor protection for retained earnings, and estate planning structures — with professional setup required.",
    taxImpact:
      "Inter-corporate dividends may flow tax-free between connected Canadian corporations subject to rules. RDTOH and integration affect personal extraction.",
    lensAnnotations: {
      tax: "If retained earnings accumulate in Opco, a Holdco may unlock deferral and dividend planning — subject to anti-avoidance rules.",
      legal:
        "If asset separation or succession planning is relevant, a Holdco may unlock structural options that require legal and tax counsel.",
    },
    citations: [
      {
        title: "Intercorporate dividends",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA framing for dividends between connected corporations.",
      },
    ],
    transitionTrigger: "Estate freeze or family succession planning.",
    nextSteps: ["structure-family-trust"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "structure-family-trust",
    label: "Family trust",
    entityType: "family-trust",
    trigger: "Estate freeze, succession, or income splitting among family members with professional advice.",
    description:
      "A family trust holds property for beneficiaries. If a trust is established, it unlocks estate freeze mechanics, potential multiplication of SBD access, and succession planning — with strict TOSI and attribution rules.",
    taxImpact:
      "Trust income taxed at top marginal rates unless allocated to beneficiaries. TOSI may apply to dividends from related businesses.",
    lensAnnotations: {
      tax: "If multiple family members participate in the venture, a trust may unlock allocation planning — subject to TOSI and attribution.",
      legal:
        "If long-term succession is the goal, a family trust may unlock freeze structures that require formal legal documentation.",
    },
    citations: [
      {
        title: "Tax on split income (TOSI)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/tfsa/tax-on-split-income.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA TOSI rules affecting dividends to related persons.",
      },
    ],
    transitionTrigger: "v2+ estate planning depth; not a v1 default path.",
    nextSteps: [],
    provinces: ["AB", "BC", "ON", "CA"],
  },
] satisfies StructureStep[];

export type StructureStepId = (typeof structureLadderV2026)[number]["id"];
