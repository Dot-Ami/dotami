import { CRA_WHEN_TO_REGISTER_TOOL_CHECK, CRA_WHEN_TO_REGISTER_URL } from "@/lib/engines/compliance/v2026/gst-official-words";
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
    trigger:
      "Registering by choice, or taxable supplies over $30,000 in a single calendar quarter or over the previous four (or fewer) consecutive calendar quarters (the CRA's small-supplier tests).",
    description:
      "GST/HST registration changes cash-flow timing and customer pricing. If registration is active, it unlocks charging/collecting GST/HST and claiming input tax credits on eligible business purchases.",
    taxImpact:
      "Registered sole props remit net GST/HST. ITCs can offset GST/HST paid on business inputs. Small-supplier status ends once mandatory registration applies.",
    lensAnnotations: {
      tax: "If ITCs on startup costs matter, registering voluntarily before either of the CRA's $30,000 tests is met may unlock earlier credit claims — subject to filing and remittance obligations.",
      legal:
        "If contracts require a GST number, registration may unlock B2B eligibility regardless of the small-supplier threshold.",
    },
    citations: [
      {
        title: "Register as a resident with a Canadian business",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/gst-hst-businesses/register-account.html, read 2026-06-08) answered
        // 404 on 2026-10-13. The CRA's GST/HST page now sends registering to Business Registration
        // Online on this page; a tool found this sentence, which names GST/HST accounts, on it that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/business-number-program-account/how-register/resident.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "Registering online is the fastest and easiest way to get a business number (BN) and certain CRA program accounts such as GST/HST and payroll.",
          ],
        },
        note: "CRA guidance on registering for GST/HST.",
      },
      {
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        // The old address (…/when-register.html) answers 404 since at least 2026-10-06; this rung's
        // wording now follows the page's two tests, which a tool found there on 2026-10-12 (option B;
        // no person has read the page).
        url: CRA_WHEN_TO_REGISTER_URL,
        toolCheck: CRA_WHEN_TO_REGISTER_TOOL_CHECK,
        note: "CRA small-supplier tests and mandatory registration (page details 2026-06-16).",
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
        title: "Corporation tax rates",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old overview (…/topics/corporations/corporation-income-tax.html, read 2026-06-08)
        // answered 404 on 2026-10-13. The rates this rung relies on are on this CRA page; a tool found
        // these words on it that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html",
        toolCheck: { checkedOn: "2026-10-13", quotes: ["The basic rate of Part I tax is 38% of your taxable income"] },
        note: "CRA corporate income tax overview.",
      },
      {
        title: "Small business deduction",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/corporation-income-tax/small-business-deduction.html, read
        // 2026-06-08) answered 404 on 2026-10-13. The CRA's T2 guide explains the deduction at line 430
        // on this page; a tool found these words on it that day.
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "throughout the tax year may be able to claim the small business deduction",
            "reduces Part I tax that the corporation would otherwise have to pay.",
          ],
        },
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
        // Moved: the old address (…/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html,
        // read 2026-06-08) answered 404 on 2026-10-13. The CRA's T2 guide explains the deduction for
        // dividends from other Canadian corporations at line 320 on this page; a tool found these
        // words on it that day.
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-3-page-3-t2-return.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "When calculating taxable income, you can deduct, under section 112, any of the following types of taxable dividends received:",
            "dividends from a taxable Canadian corporation, or from a corporation resident in Canada and controlled by the receiving corporation",
          ],
        },
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
        title: "Line 40424 – Tax on split income",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/tax-free-savings-account/tfsa/tax-on-split-income.html, read
        // 2026-06-08) answered 404 on 2026-10-13. The CRA's line 40424 page states the tax on split
        // income (TOSI) as it is law today (the glossary cites it too); its income-sprinkling guidance
        // page explains the same tax, but as the draft proposals of December 13, 2017, so it isn't used
        // here. A tool found these words on the line 40424 page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40424-federal-tax-on-split-income.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "Tax on split income (TOSI) is a special tax that applies to certain income received from a related business.",
            "Split income includes taxable dividends on shares of a corporation (other than shares of a class listed on a designated stock exchange and those of a mutual fund corporation) that you received directly, or through a partnership or a trust (other than a mutual fund trust).",
          ],
        },
        note: "CRA TOSI rules affecting dividends to related persons.",
      },
    ],
    transitionTrigger: "v2+ estate planning depth; not a v1 default path.",
    nextSteps: [],
    provinces: ["AB", "BC", "ON", "CA"],
  },
] satisfies StructureStep[];

export type StructureStepId = (typeof structureLadderV2026)[number]["id"];
