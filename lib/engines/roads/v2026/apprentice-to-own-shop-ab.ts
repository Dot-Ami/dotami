import { feeLine } from "../../fees/v2026";
import { MAINTAINER_READ, type PageRead } from "../../shared/maintainer-reads";
import type { CitationAuthority, EngineCitation, Province } from "../../shared/types";
import { keepRecordsStep } from "./keep-records";
import type { NamedCostLine, Road, SkillItem } from "./types";
import { newestReadDate } from "./validate";

/**
 * Road 1, the first written future (decision 1 of 2026-10-11): "From apprentice to your own shop
 * (Alberta)". One road shows a career and a business together: finish your training, get certified,
 * then a fork (stay employed, or open your own shop), and the shop's first years; after its last
 * column it joins road 0 at "Incorporating". Design: docs/architecture/future-cockpit.md § 6 ("The
 * first written future as built"). The example trade is Cabinetmaker, Alberta's official name for it.
 *
 * Every source here has a tool check (option B, docs/engines/citations.md): each quote was found word
 * for word on its live page by `node scripts/check-quotes.mjs --url … --quote …` on CHECKED_ON (the
 * citations added when its blanks were looked up again, on BLANKS_CHECKED_ON). Three of its CRA pages
 * were read in full by the maintainer on 2026-10-25 (the GST/HST and payroll pages here, and the records
 * page of ./keep-records.ts): their citations carry his read, which wins on screen, and the road's own
 * `lastVerified` is that day, worked out from its sources. No other page has a read on record, so no other
 * citation has a read date. A line says only what its quotes say; anything a page doesn't state
 * (Alberta's registry fees, which sit in a catalogue that stops tools; a wage figure; a WCB rate) is a
 * named line or left out, never guessed, and a named line for a fee says in its label why it has no amount.
 *
 * Its official fees are written once, in the official fees catalog (lib/engines/fees/v2026/, since
 * 2026-10-12): each fee line here names its fee by id through `feeLine`, which copies the amount, source
 * and condition, so no amount is typed in this file.
 *
 * Since 2026-10-14 the shop's business part starts with "Keep your records from day one"
 * (./keep-records.ts, shared with road 0, its sources checked by the tool that day): first in "Open the
 * doors", reached only from "Open your own shop", so road evaluation puts it on the path once the person
 * picks the shop and off it if they stay employed. No rule code reads it; the `next` arrows decide.
 */

/** The day scripts/check-quotes.mjs found every quote below on its page, except those checked on BLANKS_CHECKED_ON. */
const CHECKED_ON = "2026-10-12";

/**
 * The day the road's named blanks were looked up again (build list item 19): the tool found the quotes of
 * the citations made with it on that day.
 */
const BLANKS_CHECKED_ON = "2026-10-15";

interface Page {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  /** What the page is, in one line; the quotes say what this entry relies on. */
  note: string;
  /** A read of the whole page, when one is on record: every citation of the page carries it. */
  read?: Readonly<PageRead>;
}

const TRADESECRETS = "https://tradesecrets.alberta.ca";

// Alberta's apprenticeship and trades pages (Tradesecrets, run by Alberta Apprenticeship and Industry
// Training), alberta.ca, the CRA, WCB-Alberta and BizPaL. Each page once; each citation below picks
// the quotes it relies on.
const PAGES = {
  profile: {
    title: "Cabinetmaker trade profile (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/trades-in-alberta/profiles/0361/`,
    note: "Alberta's profile of the Cabinetmaker trade: its programs, periods, hours, exams, certification and who may do its restricted work.",
  },
  apply: {
    title: "Apply for an Apprenticeship Education Program (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/become-an-apprentice/apply-for-apprenticeship/`,
    note: "How to apply to become a registered apprentice in Alberta, what to have ready, and the application fee.",
  },
  rap: {
    title: "Registered Apprenticeship Program (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/start-in-high-school/registered-apprenticeship-program/`,
    note: "Starting an apprenticeship while in high school.",
  },
  cts: {
    title: "Career and Technology Studies (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/start-in-high-school/career-and-technology-studies/`,
    note: "High-school apprenticeship pathways, and the Prior Learning Assessment that can give credit for one.",
  },
  sponsorshipAgreements: {
    title: "Sponsorship Agreements (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/apprentice-services/sponsorship-agreeements/`,
    note: "The apprenticeship education agreement between an apprentice and a sponsor.",
  },
  sponsor: {
    title: "Sponsor an Apprentice (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/sponsor-an-apprentice/`,
    note: "What a sponsor must be and provide, how a sponsorship is confirmed, and a sponsor's duties.",
  },
  eligibility: {
    title: "Eligibility and Entrance Requirements (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/get-started/become-an-apprentice/eligibility-and-entrance-requirements/`,
    note: "Who can register as an apprentice, the entrance requirements for classes, and the sponsorship agreement.",
  },
  classroom: {
    title: "About Classroom Instruction (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/apprentice-services/classroom-instruction/about-classroom-instruction/`,
    note: "How apprentices' classroom instruction works.",
  },
  tuition: {
    title: "Tuition and Fees (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/apprentice-services/classroom-instruction/about-classroom-instruction/pay-for-classes/`,
    note: "Each school sets its own apprentice tuition; the other costs apprentices pay during classes.",
  },
  tqWorkExperience: {
    title: "Trades Qualifier, Work Experience Program: program details (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/trades-qualifier-programs/qualify-based-on-work-experience/program-details/`,
    note: "Qualifying for an Alberta certificate on work experience in the trade, without an apprenticeship.",
  },
  tqExams: {
    title: "Trades Qualifier Exams (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/trades-qualifier-programs/trades-qualifier-exams/`,
    note: "The Trades Qualifier exams, rewrites and the time allowed.",
  },
  tqCredential: {
    title: "Trades Qualifier, Recognized Credential Program: program details (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/trades-qualifier-programs/qualify-for-alberta-certification/program-details/`,
    note: "Qualifying for an Alberta certificate with a recognized trade certificate from outside Alberta.",
  },
  certificationThroughApprenticeship: {
    title: "Certification through Apprenticeship Education (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/certification-through-apprenticeship/`,
    note: "How an apprenticeship ends in journeyperson certification.",
  },
  classesOfIndividuals: {
    title: "Classes of Individuals – Cabinetmaker (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/trades-in-alberta/profiles/0361/classes-of-individuals/`,
    note: "The classes of individuals who may perform the Cabinetmaker trade's restricted activities.",
  },
  scopeOfProfession: {
    title: "Scope of Profession – Cabinetmaker (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/trades-in-alberta/profiles/0361/scope-of-profession/`,
    note: "What the Cabinetmaker trade covers, and its restricted activities.",
  },
  redSeal: {
    title: "Red Seal Endorsement (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/interprovincial-red-seal/`,
    note: "Writing the interprovincial Red Seal exam from Alberta, and applying for it.",
  },
  blueSeal: {
    title: "Blue Seal Program (Tradesecrets, Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: `${TRADESECRETS}/become-certified/business-competencies-blue-seal/`,
    note: "The Achievement in Business Competencies (Blue Seal) certificate: who can apply, how, and the fee.",
  },
  registerName: {
    title: "Register a business name (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/register-business-name",
    note: "Registering a trade name or partnership in Alberta: the forms, the name rules, and what it costs.",
  },
  businessNames: {
    title: "Business names (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/business-names",
    note: "Alberta's business-name rules, including when an email address is required.",
  },
  findRegistry: {
    title: "Find a business registry (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/find-business-registry",
    note: "Registry agents who record business registrations, and their service fees.",
  },
  commonBusinessNumber: {
    title: "Common Business Number program in Alberta (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/common-business-number-program-in-alberta",
    note: "In Alberta, registering a business also gets it a federal business number.",
  },
  craBusinessNumber: {
    title: "When you need a business number (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/business-number-program-account/need-bn.html",
    note: "What a business number is, when a business needs one, and the provinces that issue it on registration.",
  },
  bizpal: {
    title: "BizPaL",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://bizpal.ca/",
    note: "The permit and licence finder run by the federal, provincial and territorial, and municipal governments.",
  },
  bizpalFaq: {
    title: "BizPaL frequently asked questions",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://bizpal.ca/en/faq/",
    note: "What BizPaL covers, and what to do where a municipality isn't on it.",
  },
  craGstRegister: {
    title: "When to register for and start charging the GST/HST (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html",
    note: "The CRA's small-supplier tests, and when a business must or may register for the GST/HST.",
    // The maintainer read it in full on 2026-10-25 (docs/engines/citations.md).
    read: MAINTAINER_READ,
  },
  wcbWorkerCoverage: {
    title: "Worker coverage (WCB-Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/worker-coverage.html",
    note: "When an Alberta employer must open a WCB account for its workers.",
  },
  wcbPersonalCoverage: {
    title: "Personal coverage (WCB-Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/personal-coverage.html",
    note: "Optional workers' compensation coverage for business owners, and what it costs.",
  },
  craPayroll: {
    title: "Determine if you need to register for a payroll account (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html",
    note: "Who must register for a CRA payroll account, and by when.",
    // The maintainer read it in full on 2026-10-25 (docs/engines/citations.md).
    read: MAINTAINER_READ,
  },
} as const satisfies Record<string, Page>;

/**
 * A citation of one page, checked by the tool on CHECKED_ON: the quotes are the exact words it found
 * there. It carries a read only when the page has one on record (its `read`), never otherwise.
 */
function checked(page: Page, ...quotes: string[]): EngineCitation {
  return checkedOn(CHECKED_ON, page, ...quotes);
}

/** The same, for a citation whose quotes the tool found on another day. */
function checkedOn(day: string, page: Page, ...quotes: string[]): EngineCitation {
  const { title, authority, jurisdiction, url, note, read } = page;
  const toolCheck = { checkedOn: day, quotes };
  return read
    ? { title, authority, jurisdiction, url, note, ...read, toolCheck }
    : { title, authority, jurisdiction, url, note, toolCheck };
}

/** A cost line the person prices; never an amount here. */
function named(id: string, label: string, nameSource?: EngineCitation): NamedCostLine {
  return nameSource ? { id, kind: "named", label, nameSource } : { id, kind: "named", label };
}

/** Where the classroom cost lines' names come from: the Tuition and Fees page. */
function tuitionPage(): EngineCitation {
  return checked(
    PAGES.tuition,
    "Each school may set its own apprentice tuition and materials fees rates.",
    "Apprentices also pay for books, parking, student association fees, facility fees, materials, and consumables during their classroom instruction.",
  );
}

// Quotes used more than once, kept in one place so two citations of the same words can't drift.
const Q = {
  applicationFee: "A $150 non-refundable application fee is required.",
  periodHours: "1360 hours work experience per period",
  sponsorAgreement: "Before you begin working as a registered apprentice, you need to have an agreement with a sponsor.",
  agreementToEarnHours: "To earn on-the-job hours, you need an Apprenticeship Education Agreement with a sponsor.",
  theoryAttemptIncluded: "Your first attempt at the theory exam is included in your application fee.",
  practicalExam: "Pass a practical exam ($160.00).",
  eighteenMonths:
    "You must complete and pass all required exams and complete all program requirements within 18 months of your application approval date.",
  tqWorkFee: "Pay the non-refundable $450 (Canadian) application fee.",
  tqCredentialFee: "Pay the non-refundable $150 (CAD) application fee.",
  outsideCertificate: "Submit a copy of a recognized trade certificate from outside Alberta.",
  notExpiring:
    "Ensure your recognized trade certificate is not expired and will not expire for a minimum of 6 weeks from the date of your application.",
  certificationOptional:
    "working at a journeyperson level in the opinion of your employer (journeyperson certification optional).",
  holdsCertificate: "any individual who holds a trade certificate in the designated trade;",
  periodYear: "Each period designed to take ~1 year",
  legalAdvice:
    "If you need help deciding if a sole proprietorship, partnership or corporation is the best form of business, we highly recommended you get legal advice.",
  asnBlueSeal: "and have, or have applied for, an Alberta Student Number (ASN).",
  blueSealHours: "have completed at least 150 hours of study though any combination of:",
  gstFourQuarters: "over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).",
  gstSoleProprietor:
    "If you are a sole proprietor, include the total amount of all revenues (before expenses) from your worldwide taxable supplies from all your businesses and those of your associates (if they were associated at the beginning of the particular calendar quarter).",
  gstPartnership:
    "If you are a partnership or a corporation, include the total amount of all revenues (before expenses) from your worldwide taxable supplies and those of your associates (if they were associated at the beginning of the particular calendar quarter).",
  redSealApply: "Complete, pay for, and submit your application following the prompts on the screen.",
  blueSealFee: "There is a $150.00 non-refundable application fee.",
  proofOfFiling: "it will be entered into the Corporate Registry and you will get a proof of filing.",
  noCostBn: "There is no cost to obtain a business number.",
  notAllInclusive: "the BizPaL database is not all inclusive.",
  cityHall: "To acquire the permits and licences from your municipality, you may contact your local city hall.",
  wcbFifteenDays:
    "If you operate in an industry that's required to have workers' compensation coverage (a mandatory industry), you must open a WCB-Alberta account within 15 days of hiring your first worker.",
  payrollEmployer: "You are required to register for a payroll account if you are an employer",
  legalEntity: "a legal entity recognized in Alberta",
  scheduleOneWages: "As a sponsor, you must ensure your apprentices are paid wages in accordance with Schedule 1.",
} as const;

// ---- Skill items: the legal requirements on this road --------------------------------------------

const SKILL_ASN = "skill-ab-alberta-student-number";
const SKILL_AGREEMENT = "skill-ab-apprenticeship-education-agreement";
// Skill item ids are skill-<place>-…, so a person's mark on one is easy to trace to where it applies.
const SKILL_OUTSIDE_CERTIFICATE = "skill-ab-recognized-outside-trade-certificate";

/**
 * Things an official page says a person must hold or have for a step. The Journeyperson Certificate is
 * not one: the trade profile says certification in this trade is optional.
 */
export const skillItemsApprenticeToOwnShopAB: readonly SkillItem[] = [
  {
    id: SKILL_ASN,
    label: "Alberta Student Number",
    kind: "legal-requirement",
    howToGetIt: {
      text: "Look it up, or ask for one, through the link on the apprenticeship application page.",
      citation: checked(PAGES.apply, "Lookup or request your number here"),
    },
    citations: [
      checked(PAGES.apply, "Alberta Student Number: Required if this is your first time applying for an AIT program or service."),
      checked(
        PAGES.tqWorkExperience,
        "You will need a basic Alberta.ca Account and an Alberta Student Number to begin your application",
      ),
      // The other two steps that need it: the Recognized Credential route and the Blue Seal.
      checked(
        PAGES.tqCredential,
        "You will need a basic Alberta.ca Account and an Alberta Student Number to begin your application.",
      ),
      checked(PAGES.blueSeal, Q.asnBlueSeal),
    ],
  },
  {
    id: SKILL_AGREEMENT,
    label: "An apprenticeship education agreement with a sponsor",
    kind: "legal-requirement",
    howToGetIt: {
      text: "Find a business willing to be your sponsor, and give its details when you apply.",
      citation: checked(
        PAGES.eligibility,
        "Find a business or organization willing to provide you with paid-on-the-job mentorship in your trade, and ask them to become your sponsor.",
        "Submit your sponsor's information during the application process to initiate your sponsorship agreement.",
      ),
    },
    citations: [checked(PAGES.eligibility, Q.sponsorAgreement)],
  },
  {
    id: SKILL_OUTSIDE_CERTIFICATE,
    label: "A recognized trade certificate from outside Alberta",
    kind: "legal-requirement",
    citations: [checked(PAGES.profile, Q.outsideCertificate), checked(PAGES.tqCredential, Q.notExpiring)],
  },
];

// ---- The road ------------------------------------------------------------------------------------

const road: Road = {
  id: "road-apprentice-to-own-shop-ab",
  label: "From apprentice to your own shop (Alberta)",
  kind: "both",
  provinces: ["AB"],
  // Written for cabinetmakers: its trade steps are Alberta's Cabinetmaker trade (0361), NOC 2021 group 72311.
  codes: { occupations: ["72311"] },
  columns: [
    {
      id: "col-shop-training",
      label: "Finish your training",
      summary: "Three ways to the certificate, side by side: an apprenticeship, or one of two Trades Qualifier routes.",
      steps: [
        "step-shop-register-apprentice",
        "step-shop-sponsor-hours",
        "step-shop-classroom-exams",
        "step-shop-tq-work-experience",
        "step-shop-tq-recognized-credential",
      ],
    },
    {
      id: "col-shop-certified",
      label: "Certified",
      summary: "Your journeyperson certificate, optional endorsements, and the choice between staying employed and your own shop.",
      steps: [
        "step-shop-journeyperson-certificate",
        "step-shop-red-seal",
        "step-shop-stay-employed",
        "step-shop-open-own-shop",
        "step-shop-blue-seal",
      ],
      forkId: "fork-shop-employed-or-own",
    },
    {
      id: "col-shop-open",
      label: "Open the doors",
      summary: "Keep your records from day one, register your business name, receive your business number, and check permits and licences.",
      steps: ["step-shop-keep-records", "step-shop-register-name", "step-shop-business-number", "step-shop-permits-licence"],
    },
    {
      id: "col-shop-first-years",
      // "First years on your own" until 2026-10-23: a span of time in DotAmi's own words (NO TIMES).
      label: "Running your own shop",
      summary: "GST/HST, your first hire, and training an apprentice of your own.",
      steps: ["step-shop-gst-small-supplier", "step-shop-first-hire", "step-shop-sponsor-apprentice"],
    },
  ],
  steps: [
    // ---- Finish your training
    {
      id: "step-shop-register-apprentice",
      label: "Register as a Cabinetmaker apprentice",
      summary:
        "You sign up online as a registered apprentice and pay the application fee; the program has 4 periods (levels).",
      next: ["step-shop-sponsor-hours"],
      doneWhen: [
        {
          id: "dw-shop-apply-online",
          text: "Your online application is submitted through your Alberta.ca Account.",
          citation: checked(PAGES.apply, "Use your Alberta.ca Account to access the online application."),
        },
        {
          id: "dw-shop-apply-fee-paid",
          text: "The $150 application fee is paid within 45 days, or the application is deleted.",
          citation: checked(
            PAGES.apply,
            Q.applicationFee,
            "You have 45 days to make your payment, or your application will be deleted.",
          ),
        },
        {
          id: "dw-shop-apply-sponsor-approves",
          text: "If you have a sponsor, they confirm your application by email within 30 days.",
          citation: checked(
            PAGES.apply,
            "If you have a sponsor, they will receive an email to confirm their sponsorship after you submit your application.",
            "They have 30 days to approve this before your application is deleted.",
          ),
        },
        {
          id: "dw-shop-start-rap",
          text: "Or, in high school (15 or older, with a parent's or guardian's consent): you applied through the free Registered Apprenticeship Program (RAP) application, and are a registered apprentice while still a student.",
          citation: checked(
            PAGES.rap,
            "RAP students are both full-time high school students and registered apprentices.",
            "RAP is open to senior high school students aged 15 and older with the informed consent of a parent or guardian.",
            "Complete the free online RAP application with Apprenticeship and Industry Training (AIT)",
          ),
        },
        {
          id: "dw-shop-start-cts",
          text: "(Optional) You completed a Career and Technology Studies (CTS) apprenticeship pathway and sent a Prior Learning Assessment application; a mark of 70% or higher on its exam earns credit for first-period classes. The application is free on a first attempt within three years of finishing high school.",
          citation: checked(
            PAGES.cts,
            "Complete a Career and Technology Studies (CTS) Apprenticeship Pathway.",
            "Submit a Prior Learning Assessment CTS application for your trade.",
            "There is no fee for this application if it is your first attempt and you completed high school within the last three years.",
            "Receive a mark of 70% or higher to earn credit for first-period* apprenticeship classroom instruction.",
          ),
        },
      ],
      needs: [SKILL_ASN],
      costs: [
        feeLine(
          "cost-shop-apprentice-application",
          "Apprenticeship application fee (non-refundable; your sponsor may pay it)",
          "fee-ab-apprenticeship-application",
        ),
        named("cost-shop-living-while-training", "Money to live on while you train"),
      ],
      officialLinks: [
        { label: "Apply for an Apprenticeship Education Program", url: PAGES.apply.url },
        { label: "Registered Apprenticeship Program (high school)", url: PAGES.rap.url },
        { label: "Career and Technology Studies (high school)", url: PAGES.cts.url },
      ],
      citations: [
        checked(
          PAGES.profile,
          "4-Period Apprenticeship Program",
          "Apprenticeship Education Program",
          "4 periods (levels)",
          Q.periodYear,
          Q.certificationOptional,
        ),
        checked(PAGES.apply, "Use your Alberta.ca Account to access the online application.", Q.applicationFee),
      ],
    },
    {
      id: "step-shop-sponsor-hours",
      label: "Get a sponsor and earn your on-the-job hours",
      summary: "You work for a sponsor under a qualified mentor and earn your hours, signed off in your record book.",
      next: ["step-shop-classroom-exams"],
      doneWhen: [
        {
          id: "dw-shop-sponsor-agreement",
          text: "You have an apprenticeship education agreement with a sponsor.",
          citation: checked(PAGES.sponsorshipAgreements, Q.agreementToEarnHours),
        },
        {
          id: "dw-shop-period-hours",
          text: "In each period, you earned 1,360 hours of work experience and showed competence in the record book's activities.",
          citation: checked(
            PAGES.profile,
            Q.periodHours,
            "Demonstrate competence in activities outlined in the record book to receive credit.",
          ),
        },
        {
          id: "dw-shop-record-book-upload",
          text: "At the end of each year, your signed-off record book pages are uploaded to your MyTradesecrets account.",
          citation: checked(
            PAGES.sponsor,
            "At the end of each year, have the apprentice upload their signed-off record book pages to their MyTradesecrets account.",
          ),
        },
      ],
      needs: [SKILL_AGREEMENT],
      costs: [named("cost-shop-hand-tools", "Hand tools")],
      officialLinks: [{ label: "Sponsorship Agreements", url: PAGES.sponsorshipAgreements.url }],
      citations: [
        checked(PAGES.profile, Q.periodHours, "Sponsorship agreement required to earn hours.", "Must be completed with a qualified mentor."),
        checked(PAGES.eligibility, Q.sponsorAgreement),
      ],
    },
    {
      id: "step-shop-classroom-exams",
      label: "Classroom instruction and period exams",
      summary:
        "Each period, you spend 8 weeks in class at NAIT (the Northern Alberta Institute of Technology) or SAIT (the Southern Alberta Institute of Technology) and pass a theory exam.",
      next: ["step-shop-journeyperson-certificate"],
      doneWhen: [
        {
          id: "dw-shop-entrance",
          text: "Before your first period in class, you meet the trade's entrance requirements, such as English 10-2 and Math 10-3, or the entrance exam.",
          citation: checked(PAGES.profile, "English 10-2 and Math 10-3", "or Entrance Exam"),
        },
        {
          id: "dw-shop-classroom-weeks",
          text: "You attended 8 weeks of classroom instruction in each period, at NAIT or SAIT.",
          citation: checked(PAGES.profile, "8 weeks classroom instruction per period", "Offered at NAIT and SAIT"),
        },
        {
          id: "dw-shop-period-theory-exam",
          text: "You passed the theory exam that completes each period.",
          citation: checked(PAGES.profile, "Theory exam required to complete each period"),
        },
      ],
      needs: [],
      costs: [
        // Named from the Tuition and Fees page; each school sets its own amounts, so none is given here.
        named("cost-shop-tuition", "Tuition (set by your school)", tuitionPage()),
        named("cost-shop-books", "Books", tuitionPage()),
        named("cost-shop-parking", "Parking", tuitionPage()),
        named("cost-shop-student-association-fees", "Student association fees", tuitionPage()),
        named("cost-shop-facility-fees", "Facility fees", tuitionPage()),
        named("cost-shop-materials-consumables", "Materials and consumables", tuitionPage()),
        named("cost-shop-living-in-class", "Money to live on while in class"),
      ],
      officialLinks: [{ label: "Tuition and Fees", url: PAGES.tuition.url }],
      citations: [
        checked(PAGES.profile, "8 weeks classroom instruction per period", "Offered at NAIT and SAIT", "Theory exam required to complete each period"),
        checked(PAGES.classroom, "As an apprentice, you're required to attend a period of classroom instruction annually."),
        checked(
          PAGES.eligibility,
          "You must meet them before you enroll in your first period classroom instruction.",
          "Take an entrance exam to show you're ready.",
          "Submit a GED or CAEC",
        ),
      ],
    },
    {
      id: "step-shop-tq-work-experience",
      label: "Trades Qualifier: qualify on your work experience",
      summary: "If you already have years in the trade but no certificate, you can qualify on that experience without an apprenticeship.",
      next: ["step-shop-journeyperson-certificate"],
      doneWhen: [
        {
          id: "dw-shop-tqwe-experience",
          text: "You can show 72 months and 8,160 hours of verifiable Cabinetmaker work experience.",
          citation: checked(PAGES.profile, "Complete 72 months and 8160 hours of verifiable Cabinetmaker work experience."),
        },
        {
          id: "dw-shop-tqwe-full-time",
          text: "Those months and hours count full-time work (more than 30 hours a week); part-time work is counted by the trade's approved industry average.",
          citation: checked(
            PAGES.tqWorkExperience,
            "Minimum required months and hours are calculated on full-time (more than 30 hours per week) employment in the trade.",
            "will be calculated according to the approved industry average (months and hours) of the trade.",
          ),
        },
        {
          id: "dw-shop-tqwe-employer",
          text: "You have a current Alberta employer in the trade, or had one within a year of applying.",
          citation: checked(
            PAGES.tqWorkExperience,
            "You must have a current Alberta employer in your trade or have been employed with an Alberta employer in your trade within a year of the application date.",
          ),
        },
        {
          id: "dw-shop-tqwe-applied",
          text: "You applied and paid the $450 application fee.",
          citation: checked(PAGES.tqWorkExperience, Q.tqWorkFee),
        },
        {
          id: "dw-shop-tqwe-theory",
          text: "You passed the theory exam (your first attempt is included in the application fee).",
          citation: checked(PAGES.tqExams, Q.theoryAttemptIncluded),
        },
        {
          id: "dw-shop-tqwe-practical",
          text: "You passed the practical exam.",
          citation: checked(PAGES.profile, Q.practicalExam),
        },
        {
          id: "dw-shop-tqwe-18-months",
          text: "You finished every requirement within 18 months of your application's approval date.",
          citation: checked(PAGES.tqExams, Q.eighteenMonths),
        },
      ],
      needs: [SKILL_ASN],
      costs: [
        feeLine(
          "cost-shop-tqwe-application",
          "Trades Qualifier (work experience) application fee (non-refundable)",
          "fee-ab-trades-qualifier-work-experience-application",
        ),
        feeLine("cost-shop-tqwe-practical", "Practical exam, Cabinetmaker", "fee-ab-cabinetmaker-practical-exam"),
        named(
          "cost-shop-tqwe-rewrite",
          "Exam rewrite fee, if you rewrite (the page gives no amount)",
          checked(PAGES.tqExams, "A new exam rewrite fee will be required."),
        ),
        named(
          "cost-shop-tqwe-panel-interview",
          "Panel interview, only if your experience can't otherwise be verified (the page gives no amount)",
          checked(PAGES.tqWorkExperience, "Additional fees apply."),
        ),
      ],
      officialLinks: [{ label: "Trades Qualifier, Work Experience Program", url: PAGES.tqWorkExperience.url }],
      citations: [
        checked(
          PAGES.profile,
          "If you have experience in the trade but do not hold an Alberta Journeyperson Certificate, you may be eligible for the Trades Qualifier Program.",
        ),
        checked(PAGES.tqWorkExperience, Q.tqWorkFee),
      ],
    },
    {
      id: "step-shop-tq-recognized-credential",
      label: "Trades Qualifier: qualify with a certificate from outside Alberta",
      summary: "If you hold a recognized trade certificate from outside Alberta, you can qualify for the Alberta certificate.",
      next: ["step-shop-journeyperson-certificate"],
      doneWhen: [
        {
          id: "dw-shop-tqrc-submitted",
          text: "You sent a copy of your recognized trade certificate from outside Alberta.",
          citation: checked(PAGES.profile, Q.outsideCertificate),
        },
        {
          id: "dw-shop-tqrc-not-expiring",
          text: "Your certificate isn't expired, and won't expire for at least 6 weeks from the day you apply.",
          citation: checked(PAGES.tqCredential, Q.notExpiring),
        },
        {
          id: "dw-shop-tqrc-applied",
          text: "You applied and paid the $150 application fee.",
          citation: checked(PAGES.tqCredential, Q.tqCredentialFee),
        },
        {
          id: "dw-shop-tqrc-theory",
          text: "You passed the theory exam (your first attempt is included in the application fee).",
          citation: checked(PAGES.tqExams, Q.theoryAttemptIncluded),
        },
        {
          id: "dw-shop-tqrc-practical",
          text: "You passed the practical exam.",
          citation: checked(PAGES.profile, Q.practicalExam),
        },
        {
          id: "dw-shop-tqrc-18-months",
          text: "You finished every requirement within 18 months of your application's approval date.",
          citation: checked(PAGES.tqExams, Q.eighteenMonths),
        },
      ],
      needs: [SKILL_ASN, SKILL_OUTSIDE_CERTIFICATE],
      costs: [
        feeLine(
          "cost-shop-tqrc-application",
          "Trades Qualifier (recognized credential) application fee (non-refundable)",
          "fee-ab-trades-qualifier-recognized-credential-application",
        ),
        feeLine("cost-shop-tqrc-practical", "Practical exam, Cabinetmaker", "fee-ab-cabinetmaker-practical-exam"),
        // Conditional, and typed so in the catalog (onlyIf): a total leaves it out unless the person says
        // they'll rewrite.
        feeLine(
          "cost-shop-tqrc-rewrite",
          "Exam rewrite fee for a second attempt (only if you fail an exam)",
          "fee-ab-trades-qualifier-recognized-credential-rewrite",
        ),
      ],
      officialLinks: [{ label: "Trades Qualifier, Recognized Credential Program", url: PAGES.tqCredential.url }],
      citations: [checked(PAGES.profile, Q.outsideCertificate), checked(PAGES.tqCredential, Q.tqCredentialFee)],
    },

    // ---- Certified
    {
      id: "step-shop-journeyperson-certificate",
      label: "Journeyperson Certificate",
      summary:
        "Each way to train ends in the same Alberta Journeyperson Certificate in Cabinetmaker (the trade profile calls certification in this trade optional); tick the line for yours.",
      next: ["step-shop-red-seal", "step-shop-stay-employed", "step-shop-open-own-shop"],
      doneWhen: [
        {
          id: "dw-shop-jp-apprenticeship",
          text: "Apprenticeship: you finished your apprenticeship and graduated.",
          citation: checked(
            PAGES.certificationThroughApprenticeship,
            "When you graduate from your apprenticeship, you'll earn your journeyperson certification.",
          ),
        },
        {
          id: "dw-shop-jp-tqwe",
          text: "Trades Qualifier, work experience: you finished every requirement within 18 months, and your certificate was mailed to you.",
          citation: checked(
            PAGES.tqWorkExperience,
            "If you complete all Trades Qualifier - Work Experience program requirements within 18 months, your journeyperson certificate and wallet card is mailed to you.",
          ),
        },
        {
          id: "dw-shop-jp-tqrc",
          text: "Trades Qualifier, recognized credential: you finished every requirement within 18 months, and your certificate was mailed to you.",
          citation: checked(
            PAGES.tqCredential,
            "If you complete all Trades Qualifier - Recognized Credential program requirements within 18 months, your journeyperson certificate and wallet card is mailed to you.",
          ),
        },
      ],
      needs: [],
      costs: [],
      officialLinks: [],
      citations: [
        // Certification in this trade is optional; holding a certificate is one of the classes allowed
        // to do the trade's restricted work.
        checked(PAGES.profile, "4 periods (levels)", Q.certificationOptional),
        checked(PAGES.classesOfIndividuals, Q.holdsCertificate),
      ],
    },
    {
      id: "step-shop-red-seal",
      label: "Red Seal endorsement (optional)",
      summary: "An optional interprovincial endorsement you can add to your certificate by passing the Red Seal exam.",
      next: ["step-shop-stay-employed", "step-shop-open-own-shop"],
      doneWhen: [
        {
          id: "dw-shop-red-seal-apprentice",
          text: "As an apprentice: you wrote the Red Seal exam after completing every requirement for your Alberta certificate (your instructors give the details in your final period).",
          citation: checked(
            PAGES.redSeal,
            "Alberta Apprentices in Red Seal trades have the opportunity to write the Red Seal exam after they complete all requirements for Alberta journeyperson certification.",
            "Instructors will provide details during the final period of classroom instruction.",
          ),
        },
        {
          id: "dw-shop-red-seal-later",
          text: "Or, already certified: you applied to write the Red Seal exam later.",
          citation: checked(
            PAGES.redSeal,
            "If you didn't earn your endorsement when you were first certified, you can apply to write the Red Seal exam at any time afterward.",
          ),
        },
        {
          id: "dw-shop-red-seal-third-try",
          text: "If you've already tried the exam two or more times: you did at least 40 hours of more study and sent a Training Plan with your application.",
          citation: checked(
            PAGES.redSeal,
            "If you have already attempted the Red Seal exam two or more times, you are required to provide at least 40 hours of additional study or upgrading.",
            "You will need to complete and submit a Training Plan with your Interprovincial Red Seal Application.",
          ),
        },
        {
          // Writing or applying isn't the endorsement: this line is what makes the step done.
          id: "dw-shop-red-seal-passed",
          text: "You passed the Red Seal exam, so you hold a trade certificate with a Red Seal (if you don't pass, your application is cancelled and you send a new one).",
          citation: checked(
            PAGES.redSeal,
            "Tradespeople who hold a trade certificate with a Red Seal have demonstrated that they have met the national standard in that trade.",
            "If you are unsuccessful in your Red Seal exam, your application will be cancelled and you will need to submit another Interprovincial Red Seal Application",
          ),
        },
      ],
      needs: [],
      costs: [
        // Priced on Tradesecrets' Apply Online page since 2026-10-15 (build list item 19); the Red Seal page
        // itself gives no amount. Conditional in the catalog: the application is the way for a certified
        // person, and the page names no fee for an apprentice writing it in their final period.
        feeLine(
          "cost-shop-red-seal-application",
          "Red Seal application fee (only if you apply after you're certified)",
          "fee-ab-red-seal-application",
        ),
      ],
      officialLinks: [{ label: "Red Seal Endorsement", url: PAGES.redSeal.url }],
      citations: [
        checked(PAGES.profile, "Red Seal Endorsement (optional)", "Red Seal exam option in final period"),
        checked(PAGES.redSeal, Q.redSealApply),
      ],
    },
    {
      id: "step-shop-stay-employed",
      label: "Stay employed as a certified Cabinetmaker",
      summary: "You keep working for an employer as a journeyperson, and can mentor apprentices.",
      next: ["step-shop-blue-seal"],
      doneWhen: [
        {
          id: "dw-shop-employed-certificate",
          text: "You hold your Journeyperson Certificate.",
          citation: checked(PAGES.classesOfIndividuals, Q.holdsCertificate),
        },
        {
          id: "dw-shop-employed-mentor",
          text: "(Optional) You mentor an apprentice: an employer needs a journeyperson mentor in the same trade to employ one.",
          citation: checked(
            PAGES.sponsor,
            "To employ an apprentice, an employer needs to also employ a journeyperson mentor (in the same trade as the apprentice) to provide instruction, guidance, and supervision.",
          ),
        },
      ],
      needs: [],
      costs: [],
      officialLinks: [],
      // The trade's own pages: who may do its restricted work, and that certification is optional.
      citations: [checked(PAGES.classesOfIndividuals, Q.holdsCertificate), checked(PAGES.profile, Q.certificationOptional)],
    },
    {
      id: "step-shop-open-own-shop",
      label: "Open your own shop",
      // A step's `next` names steps on this road only, so the way to a corporation is said in words:
      // incorporating sits on road 0, where this road joins it (roadStartingAnyBusinessAB, its
      // "Incorporating" column; a test keeps these names in step with road 0).
      summary:
        "You decide to work for yourself. The next columns open the shop as a sole proprietorship or partnership; if you choose a corporation, see Incorporating on Starting any business in Alberta, where this road joins it.",
      // Records from the shop's first expense: its own step, first in the next column (2026-10-14).
      next: ["step-shop-register-name", "step-shop-blue-seal", "step-shop-keep-records"],
      // Where the person opens a business of their own: its panel offers "Others in this line of work" (2026-10-17).
      opensABusiness: true,
      doneWhen: [
        {
          id: "dw-shop-own-certificate",
          text: "You hold a trade certificate, so you are in a class of people allowed to do the trade's restricted work.",
          citation: checked(PAGES.classesOfIndividuals, Q.holdsCertificate),
        },
        {
          id: "dw-shop-own-business-form",
          text: "You've chosen a business form (sole proprietorship, partnership or corporation); if you need help deciding, alberta.ca highly recommends legal advice.",
          citation: checked(PAGES.registerName, Q.legalAdvice),
        },
        {
          id: "dw-shop-own-no-shield",
          text: "You know that a sole proprietor or partners are personally responsible for the business's debts and obligations.",
          citation: checked(
            PAGES.registerName,
            "That means the sole proprietor or partners are personally responsible for the debts and obligations of the business.",
          ),
        },
      ],
      needs: [],
      costs: [
        named("cost-shop-space-deposit", "Shop space deposit"),
        named("cost-shop-machines-tools", "Woodworking machines and tools"),
        named("cost-shop-insurance", "Insurance"),
        named("cost-shop-vehicle", "Vehicle"),
        named("cost-shop-first-materials", "First materials"),
        named("cost-shop-design-software", "Design or CAD software"),
        named(
          "cost-shop-lawyer-business-form",
          "Legal advice on the business form (if you want help choosing)",
          checked(PAGES.registerName, Q.legalAdvice),
        ),
        named("cost-shop-living-while-starting", "Money to live on while starting"),
      ],
      officialLinks: [{ label: "Register a business name", url: PAGES.registerName.url }],
      citations: [
        // The profile's "Authorized Individuals" box: who may do the restricted work. How it applies
        // to a self-employed person isn't stated there, so the road says no more than it does.
        checked(PAGES.profile, "To perform restricted activities, you must be:", "a registered apprentice, or", Q.certificationOptional),
        checked(PAGES.scopeOfProfession, "fabricating and installing millwork;", "installing millwork and cabinets on site;"),
        checked(PAGES.classesOfIndividuals, Q.holdsCertificate),
      ],
    },
    {
      // Shown under both endings in the content; written once here so its ids are kept once.
      id: "step-shop-blue-seal",
      label: "Blue Seal certificate (optional)",
      summary: "An optional Alberta certificate for business skills, after at least 150 hours of approved study.",
      next: [],
      doneWhen: [
        {
          id: "dw-shop-blue-seal-study",
          text: "You completed at least 150 hours of study through approved programs, courses in the approved subject areas from a recognized training provider, or both.",
          citation: checked(
            PAGES.blueSeal,
            Q.blueSealHours,
            "approved programs of study and/or",
            "courses in one or more of the 18 approved subject areas through a recognized training provider",
          ),
        },
        {
          id: "dw-shop-blue-seal-credential",
          text: "You hold an Alberta Journeyperson Certificate, an Alberta Occupational Certificate, or a credential recognized in Alberta.",
          citation: checked(
            PAGES.blueSeal,
            "an Alberta Journeyperson Certificate, or",
            "an Alberta Occupational Certificate, or",
            "a credential recognized in Alberta",
          ),
        },
        {
          id: "dw-shop-blue-seal-asn",
          text: "You have, or have applied for, an Alberta Student Number.",
          citation: checked(PAGES.blueSeal, Q.asnBlueSeal),
        },
        {
          id: "dw-shop-blue-seal-applied",
          text: "You applied online through your MyTradesecrets account.",
          citation: checked(
            PAGES.blueSeal,
            "Log in to your MyTradesecrets account.",
            "Complete and submit the online Achievement in Business Competencies (Blue Seal) Application.",
          ),
        },
        {
          id: "dw-shop-blue-seal-transcripts",
          text: "You attached your transcripts and supporting documents.",
          citation: checked(PAGES.blueSeal, "attach a copy of your transcripts and supporting documentation clearly indicating:"),
        },
        {
          id: "dw-shop-blue-seal-fee",
          text: "You paid the $150.00 application fee.",
          citation: checked(PAGES.blueSeal, Q.blueSealFee),
        },
      ],
      needs: [SKILL_ASN],
      costs: [
        feeLine("cost-shop-blue-seal-application", "Blue Seal application fee (non-refundable)", "fee-ab-blue-seal-application"),
        named("cost-shop-blue-seal-study", "Approved programs or courses (the page gives no cost)"),
      ],
      officialLinks: [{ label: "Blue Seal Program", url: PAGES.blueSeal.url }],
      citations: [
        checked(
          PAGES.blueSeal,
          "drive to succeed in managerial, supervisory, entrepreneurial or other leadership roles.",
          Q.blueSealHours,
        ),
      ],
    },

    // ---- Open the doors
    keepRecordsStep(
      {
        step: "step-shop-keep-records",
        what: "dw-shop-records-what",
        everyTransaction: "dw-shop-records-every-transaction",
        how: "dw-shop-records-how",
        whereHowLong: "dw-shop-records-where-how-long",
      },
      [],
    ),
    {
      id: "step-shop-register-name",
      label: "Register your business name",
      summary:
        "You register a trade name (sole proprietorship) or a partnership, and get proof of filing; if you chose a corporation, see Incorporating on Starting any business in Alberta instead.",
      next: ["step-shop-business-number"],
      doneWhen: [
        {
          id: "dw-shop-name-ending",
          text: "You picked a name that doesn't end in 'limited', 'incorporated' or 'corporation', and doesn't use their short forms (such as Ltd., Inc. or Corp.) or their French forms.",
          citation: checked(
            PAGES.registerName,
            "cannot use the words 'limited', 'incorporated' or 'corporation' at the end of the business name",
            "cannot use the abbreviated forms of these words (such as Ltd., Inc., or Corp., or the French forms/abbreviations of those words)",
          ),
        },
        {
          id: "dw-shop-name-report",
          text: "(Optional) You got a Business Name Report.",
          citation: checked(PAGES.registerName, "This step is recommended, but not mandatory."),
        },
        {
          id: "dw-shop-name-form",
          text: "You filled in the Declaration of Trade Name (sole proprietorship), or the Declaration of Partnership (partnership).",
          citation: checked(
            PAGES.registerName,
            "If you are registering a trade name or sole proprietorship, use the Declaration of Trade Name.",
            "If you are registering a partnership, use the Declaration of Partnership and, if needed, the Special Authority to Execute a Declaration.",
          ),
        },
        {
          id: "dw-shop-name-proof",
          text: "It was entered into the Corporate Registry and you got proof of filing (registering doesn't make the name yours).",
          citation: checked(
            PAGES.registerName,
            Q.proofOfFiling,
            "Registering a business name does not grant any right of ownership of the name.",
          ),
        },
        {
          id: "dw-shop-name-email",
          text: "You gave an email address, which registering a business name requires.",
          citation: checked(PAGES.businessNames, "An email address is required when", "or registering a business name"),
        },
      ],
      needs: [],
      costs: [
        // The government fee's amount sits only in Alberta's Registry Agent Product Catalogue, a PDF whose
        // open.alberta.ca page stops tools with a human check (looked up again on 2026-10-15, build list
        // item 19); alberta.ca's own pages say the fee exists and point to the catalogue, with no amount. It
        // stays named until a person reads it there. The agent's service fee is set by each agent, and the
        // Business Name Report comes from NUANS members, not the government: no official amount for either.
        named(
          "cost-shop-name-government-fee",
          "Government fee to register the name (the amount is in Alberta's Registry Agent Product Catalogue)",
          checkedOn(
            BLANKS_CHECKED_ON,
            PAGES.registerName,
            "Service providers will charge a government fee and a service fee to register your business name.",
            "See the Registry agent product catalogue.",
          ),
        ),
        named(
          "cost-shop-name-service-fee",
          "Registry agent's service fee (set by your agent)",
          checked(PAGES.findRegistry, "Service fees are not regulated and may vary from one agent to another."),
        ),
        named(
          "cost-shop-name-report",
          "Business Name Report (optional; provided by authorized NUANS members; the page gives no amount)",
          checkedOn(BLANKS_CHECKED_ON, PAGES.registerName, "Step 2: Get a Business Name Report", "The report is provided by authorized NUANS members."),
        ),
      ],
      officialLinks: [
        { label: "Register a business name", url: PAGES.registerName.url },
        { label: "Find a business registry", url: PAGES.findRegistry.url },
      ],
      citations: [
        checked(PAGES.registerName, "There are 4 types of business names registered under the Partnership Act:", Q.proofOfFiling),
      ],
    },
    {
      id: "step-shop-business-number",
      label: "Your business number arrives",
      summary: "In Alberta, registering your business name also gets you a federal business number, by email, at no cost.",
      next: ["step-shop-permits-licence"],
      doneWhen: [
        {
          id: "dw-shop-bn-email",
          text: "You got the email with your business number, or you keep using the one you already have.",
          citation: checked(
            PAGES.commonBusinessNumber,
            "You will receive an email when your federal business number is issued, unless one has previously been assigned to you as an individual or corporation.",
            "In that case, you will use the business number you already have.",
          ),
        },
      ],
      needs: [],
      costs: [
        feeLine("cost-shop-business-number", "Business number", "fee-ab-business-number"),
      ],
      officialLinks: [],
      citations: [
        checked(PAGES.commonBusinessNumber, Q.noCostBn),
        checked(
          PAGES.craBusinessNumber,
          "A business number (BN) is used as a standard identifier for your business or legal entity.",
          "You will receive a BN when you register or incorporate with the following provinces:",
        ),
      ],
    },
    {
      id: "step-shop-permits-licence",
      label: "Check permits and your municipal business licence",
      summary: "You find the permits and licences your kind of work and place need, and ask your municipality about its own.",
      next: ["step-shop-gst-small-supplier", "step-shop-first-hire"],
      doneWhen: [
        {
          id: "dw-shop-permits-bizpal",
          text: "If your municipality is on BizPaL: you searched it for your place and kind of work, knowing its list isn't complete.",
          citation: checked(
            PAGES.bizpalFaq,
            Q.notAllInclusive,
            "You will still have to conduct additional research to ensure that your business is regulatory compliant.",
          ),
        },
        {
          id: "dw-shop-permits-city-hall",
          text: "If your municipality isn't on BizPaL: you contacted your local city hall about the permits and licences it needs, and applied for them.",
          citation: checked(PAGES.bizpalFaq, "What can I do if my municipality is not on BizPaL?", Q.cityHall),
        },
      ],
      needs: [],
      costs: [
        named("cost-shop-municipal-licence", "Municipal business licence fee (your municipality)"),
        named("cost-shop-other-permits", "Other permits listed for your place"),
      ],
      officialLinks: [{ label: "BizPaL", url: PAGES.bizpal.url }],
      citations: [
        checked(PAGES.bizpal, "Search for the permits and licences you may need to start or grow your business."),
        checked(PAGES.bizpalFaq, Q.notAllInclusive, Q.cityHall),
      ],
    },

    // ---- Running your own shop
    {
      id: "step-shop-gst-small-supplier",
      label: "GST/HST: the small-supplier test",
      summary:
        "You watch your taxable revenues against the small-supplier tests of the CRA (the Canada Revenue Agency), and register for GST/HST (the Goods and Services Tax / Harmonized Sales Tax) when the CRA says you have to (or earlier, by choice).",
      next: [],
      doneWhen: [
        {
          // What counts is wider than this shop's sales: the CRA counts every business, and associates.
          id: "dw-shop-gst-checked",
          text: "You checked your taxable revenues against both of the CRA's tests: a single calendar quarter on its own, and the previous four (or fewer) consecutive calendar quarters. What counts is all revenues before expenses from your worldwide taxable supplies, and those of your associates (the CRA's word); as a sole proprietor, from all your businesses, not just this shop. A calendar quarter is three months starting on the first of January, April, July or October.",
          citation: checked(
            PAGES.craGstRegister,
            "in a single calendar quarter.",
            Q.gstFourQuarters,
            Q.gstSoleProprietor,
            Q.gstPartnership,
            "Calendar quarter means a period of three months beginning on the first day of January, April, July, or October in each calendar year.",
          ),
        },
        {
          id: "dw-shop-gst-registered",
          text: "If those revenues went over $30,000 in a single calendar quarter, you registered (the CRA says you must); if they went over $30,000 across the previous four (or fewer) quarters, you registered (the CRA says you have to).",
          citation: checked(
            PAGES.craGstRegister,
            "You are no longer a small supplier and have to charge GST/HST on the supply that made you exceed $30,000 within the calendar quarter.",
            "You must register for the GST/HST.",
            Q.gstFourQuarters,
            "You are no longer a small supplier at the end of the month following the quarter in which you exceed $30,000.",
            "You have to register for the GST/HST.",
          ),
        },
        {
          id: "dw-shop-gst-voluntary",
          text: "(Optional) You registered by choice before you had to.",
          citation: checked(
            PAGES.craGstRegister,
            "You may choose to register voluntarily if you make taxable sales, leases, or other supplies in Canada.",
          ),
        },
      ],
      needs: [],
      costs: [],
      officialLinks: [{ label: "When to register for and start charging the GST/HST", url: PAGES.craGstRegister.url }],
      citations: [
        checked(
          PAGES.craGstRegister,
          "You have to register for a GST/HST account if both situations apply:",
          "You are not a small supplier",
          Q.gstSoleProprietor,
        ),
        checked(PAGES.craBusinessNumber, "You need a GST/HST, payroll or another CRA program account"),
      ],
    },
    {
      id: "step-shop-first-hire",
      label: "Hiring your first worker",
      summary:
        "When you hire, you register a CRA payroll account, and an account with WCB-Alberta (the Workers' Compensation Board of Alberta) if your industry must have coverage.",
      next: ["step-shop-sponsor-apprentice"],
      doneWhen: [
        {
          id: "dw-shop-hire-wcb",
          text: "If your industry must have workers' compensation coverage, you opened a WCB-Alberta account within 15 days of hiring your first worker.",
          citation: checked(PAGES.wcbWorkerCoverage, Q.wcbFifteenDays),
        },
        {
          id: "dw-shop-hire-wcb-unsure",
          text: "If you weren't sure whether your industry is one that doesn't need coverage, you applied for a WCB account or asked WCB.",
          citation: checked(
            PAGES.wcbWorkerCoverage,
            "there are some industries that aren't required to have coverage.",
            "If you're not sure if you're in an exempt industry, please apply for a WCB account or contact us to find out.",
          ),
        },
        {
          id: "dw-shop-hire-payroll",
          text: "You registered a CRA payroll account before your first remittance was due.",
          citation: checked(
            PAGES.craPayroll,
            Q.payrollEmployer,
            "You have to register for a payroll account before the first remittance due date.",
          ),
        },
        {
          id: "dw-shop-hire-personal-coverage",
          text: "(Optional) You decided about WCB personal coverage for yourself: as the owner, you aren't covered automatically, only your workers are.",
          citation: checked(
            PAGES.wcbPersonalCoverage,
            "If you're a business owner, you're not automatically covered by workers' compensation benefits—only your workers are.",
            "To ensure you are covered we have optional personal coverage available.",
          ),
        },
      ],
      needs: [],
      costs: [
        named("cost-shop-wages", "Wages"),
        // Two WCB lines, because the pages back two different costs: the premium for your workers, and
        // optional personal coverage for you as the owner (the only page with a cost sentence).
        named("cost-shop-wcb-premium", "WCB premium for your workers (your quote)"),
        named(
          "cost-shop-wcb-personal-coverage",
          "WCB personal coverage for yourself, if you choose it (your quote)",
          checked(PAGES.wcbPersonalCoverage, "Cost will vary based on the amount of coverage you purchase and the industry you're in."),
        ),
        named("cost-shop-payroll-bookkeeping", "Payroll software or bookkeeping"),
      ],
      officialLinks: [
        { label: "WCB-Alberta: worker coverage", url: PAGES.wcbWorkerCoverage.url },
        { label: "CRA: register for a payroll account", url: PAGES.craPayroll.url },
      ],
      citations: [checked(PAGES.wcbWorkerCoverage, Q.wcbFifteenDays), checked(PAGES.craPayroll, Q.payrollEmployer)],
    },
    {
      id: "step-shop-sponsor-apprentice",
      label: "Sponsor your own apprentice (optional)",
      summary: "Your shop trains the next apprentice as their sponsor, with a journeyperson mentor in the same trade.",
      next: [],
      doneWhen: [
        {
          id: "dw-shop-sponsor-own-eligible",
          text: "Your business is a legal entity recognized in Alberta and can give the apprentice appropriate paid employment, a journeyperson mentor, and encouragement through the program.",
          citation: checked(
            PAGES.sponsor,
            Q.legalEntity,
            "appropriate paid employment",
            "a journeyperson mentor for guidance, feedback, and assessment",
            "encouragement to progress through the apprenticeship programs",
          ),
        },
        {
          id: "dw-shop-sponsor-own-confirmed",
          text: "The apprentice named you as sponsor, and you confirmed through the emailed link.",
          citation: checked(PAGES.sponsor, "you'll get an email with a link to confirm your sponsorship of the apprentice"),
        },
        {
          id: "dw-shop-sponsor-own-ratio",
          // A ceiling ("may employ two"), not a quota: one apprentice with one mentor is fine.
          text: "You have no more than two apprentices for each assigned mentor.",
          citation: checked(PAGES.profile, "Employers may employ two apprentices for every one assigned mentor (2:1)."),
        },
        {
          id: "dw-shop-sponsor-own-wages",
          text: "You pay your apprentices wages in line with Schedule 1 of Alberta's Apprenticeship Education and Industry Training Programs Regulation (its pages 20 and 21).",
          citation: checked(
            PAGES.sponsor,
            Q.scheduleOneWages,
            "Review the required apprentice wages in Schedule 1 (pages 20 and 21) of the Apprenticeship Education and Industry Training Programs Regulation.",
          ),
        },
      ],
      needs: [],
      costs: [named("cost-shop-apprentice-wages", "Apprentice wages")],
      officialLinks: [{ label: "Sponsor an Apprentice", url: PAGES.sponsor.url }],
      citations: [checked(PAGES.sponsor, Q.legalEntity, Q.scheduleOneWages)],
    },
  ],
  forks: [
    {
      id: "fork-shop-employed-or-own",
      label: "Stay employed or open your own shop",
      sides: ["step-shop-stay-employed", "step-shop-open-own-shop"],
    },
  ],
  // Worked out below from its sources' reads, as roadFromCfe does for road 0.
  lastVerified: "",
  joins: { roadId: "road-starting-any-business-ab", columnId: "tier-3-incorporating" },
};
// The newest day any of its sources was read (the maintainer's reads of 2026-10-25), never typed by hand, so it
// can't fall behind a newer read; a tool check is not a read, so a road with none would stay "".
road.lastVerified = newestReadDate(road) ?? "";

export const roadApprenticeToOwnShopAB: Road = road;
