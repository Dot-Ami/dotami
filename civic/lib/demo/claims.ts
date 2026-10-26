import type { Claim } from "../model";

/**
 * The propositions the demo issue turns on. Each is worded precisely enough for evidence to bear
 * on it, and a broad claim ("the plant is safe") is split into the separate propositions it
 * bundles, each assessed on its own. Statuses are the demo team's assessment of invented
 * evidence: they show how the method behaves, not a finding about anything real.
 */
const ISSUE = "corvane-meadowmere";

export const CLAIMS: Claim[] = [
  {
    id: "emissions-safe",
    issueId: ISSUE,
    proposition:
      "Air emissions from the proposed facility will be safe for the people who live and go to school nearby.",
    kind: "scientific",
    assertedIn: [{ sourceId: "air-assessment", passageId: "summary" }],
    status: "unresolved",
    statusReason:
      "The assessment supports part of this under one scenario. Other parts weren't assessed, so the claim as a whole can't be settled yet.",
    evidence: [
      {
        sourceId: "air-assessment",
        passageId: "summary",
        stance: "supports",
        note: "The applicant's consultant concludes no health risk is expected, based on annual averages below the guideline.",
      },
      {
        sourceId: "air-assessment",
        passageId: "scenarios",
        stance: "qualifies",
        note: "The conclusion covers normal operations only. Start-up, shutdown and upset conditions were not modelled.",
      },
      {
        sourceId: "air-assessment",
        passageId: "background",
        stance: "qualifies",
        note: "Predicted values leave out MX-7 already in the air, so the total people would breathe is not known.",
      },
      {
        sourceId: "air-guideline",
        passageId: "mx7-children",
        stance: "qualifies",
        note: "The guideline's own basis says its adequacy for young children has not been evaluated.",
      },
      {
        sourceId: "health-letter",
        passageId: "not-yet",
        stance: "context",
        note: "The only independent public-health review asked for has not been completed.",
      },
    ],
    supportedConclusion:
      "Under normal operations, the applicant's model predicts annual averages below the provincial guideline at the nearest home and, read from a chart, at the school. That is all the reviewed evidence shows.",
    interpretation:
      '"Safe" here bundles at least four separate questions: normal operations, abnormal operations, total exposure including what is already in the air, and whether the guideline itself protects children. The assessment answers only the first. A conclusion of "no health risk" goes beyond what its own design can show.',
    unknowns: [
      "Concentrations during start-up, shutdown and upsets.",
      "Background MX-7 levels in East Meadowmere.",
      "Short-term (for example 24-hour) peaks: none are reported and there is no short-term guideline.",
      "Whether the guideline protects young children.",
      "What the Office of the Chief Medical Officer of Health will say.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence:
          "Upset-condition modelling and local background monitoring showing totals well below the guideline, and a public-health review agreeing.",
      },
      {
        toward: "contradict",
        evidence:
          "Modelling or monitoring showing totals above the guideline, or toxicology showing effects in children below it.",
      },
    ],
    actionJustified:
      "Asking the decision-makers to obtain the missing analyses before deciding. The evidence does not justify saying the facility is unsafe.",
    splitInto: ["below-guideline-normal", "upset-conditions", "guideline-protects-children"],
    highStakes: true,
    scientificQuestions: [
      {
        question: "Safe for whom?",
        answer:
          "The assessment names two receptors: the nearest residence and the school. It does not consider workers, and treats every receptor alike.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-assessment", passageId: "receptors" }],
      },
      {
        question: "Under what conditions?",
        answer:
          "Normal operations with the filters working as designed. Start-up, shutdown and upsets were not modelled.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-assessment", passageId: "scenarios" }],
      },
      {
        question: "At what dose, by what route, for how long?",
        answer:
          "Inhalation, as an annual average concentration. No short-term concentrations are reported. Background exposure is left out.",
        answered: "answered-by-source",
        basis: [
          { sourceId: "air-assessment", passageId: "averaging" },
          { sourceId: "air-assessment", passageId: "background" },
        ],
      },
      {
        question: "What kind of evidence: animal, human, laboratory, observational or modelled?",
        answer:
          "Exposure is modelled (no measurements). The guideline it is compared with rests on one long-term inhalation study in rats.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-guideline", passageId: "mx7-basis" }],
      },
      {
        question: "What endpoints were measured?",
        answer:
          "Lung effects in rats, in the study behind the guideline. No endpoint was measured for this facility.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-guideline", passageId: "mx7-basis" }],
      },
      {
        question: "Were vulnerable populations considered?",
        answer:
          "The guideline applies a factor of 10 for differences among people, but says its adequacy for young children has not been evaluated. Studies in children were not available.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-guideline", passageId: "mx7-children" }],
      },
      {
        question: "What uncertainty factors and assumptions were applied?",
        answer:
          "An overall factor of 300 (10 × 10 × 3) in the guideline. The model assumes the filters run at design efficiency.",
        answered: "answered-by-source",
        basis: [
          { sourceId: "air-guideline", passageId: "mx7-basis" },
          { sourceId: "air-assessment", passageId: "scenarios" },
        ],
      },
      {
        question: "What are the effect sizes and uncertainty intervals?",
        answer:
          "The excerpts reviewed give none: no effect size from the rat study and no uncertainty range on the modelled values.",
        answered: "not-addressed",
      },
      {
        question: "Funding and declared conflicts?",
        answer:
          "Prepared by a consultant for the applicant, and not peer reviewed. That is normal for an application and doesn't make it wrong, but it isn't an independent review.",
        answered: "answered-by-source",
        basis: [{ sourceId: "air-assessment", passageId: "cover" }],
      },
      {
        question: "Does the conclusion exceed what the study design supports?",
        answer:
          'Yes, in our reading: "not expected to pose a health risk" is drawn from a design that leaves out abnormal operations and background exposure.',
        answered: "unclear",
        basis: [{ sourceId: "air-assessment", passageId: "summary" }],
      },
      {
        question: "Are independent studies consistent or conflicting?",
        answer: "None reviewed yet. The public-health office's review is not complete.",
        answered: "not-addressed",
        basis: [{ sourceId: "health-letter", passageId: "not-yet" }],
      },
    ],
    review: {
      state: "in-review",
      reviews: [
        {
          reviewer: "Reviewer 1 (demo)",
          expertise: "general",
          date: "2030-03-04",
          note: "Checked every passage against the archived sources.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "below-guideline-normal",
    issueId: ISSUE,
    proposition:
      "Under the modelled normal-operations scenario, predicted annual average MX-7 at the nearest residence and at East Meadowmere Elementary is below the Westmark guideline of 0.050 µg/m³.",
    kind: "scientific",
    assertedIn: [{ sourceId: "air-assessment", passageId: "summary" }],
    status: "partially-supported",
    statusReason:
      "Supported for the residence by a value stated in Table 5. For the school, it rests on reading a log-scale chart, which needs expert review.",
    evidence: [
      {
        sourceId: "air-assessment",
        passageId: "table-5",
        stance: "supports",
        note: "Table 5 states 0.046 µg/m³ at the nearest residence: below 0.050, by about 8%.",
      },
      {
        sourceId: "air-assessment",
        passageId: "figure-4",
        stance: "supports",
        note: "Two readings of Figure 4 at 450 m give 0.038 and 0.041 µg/m³, both below the guideline line.",
      },
      {
        sourceId: "air-assessment",
        passageId: "receptors",
        stance: "context",
        note: "The school is named as a sensitive receptor, but Table 5 gives no value for it.",
      },
      {
        sourceId: "air-assessment",
        passageId: "background",
        stance: "qualifies",
        note: "These are the facility's contribution only. With background added, the margin at the residence could disappear.",
      },
    ],
    supportedConclusion:
      "The model's prediction for the residence is below the guideline (0.046 against 0.050). For the school, the chart suggests about 0.04, but no value is stated in the report.",
    interpretation:
      "The margin at the residence is small, and the comparison leaves out background MX-7. A below-guideline prediction is not the same as a below-guideline exposure.",
    unknowns: ["The school's predicted value as the model computed it.", "Background MX-7 levels."],
    wouldChange: [
      {
        toward: "support",
        evidence: "The modelled value for the school, stated by the consultant.",
      },
      {
        toward: "contradict",
        evidence: "A stated school value at or above 0.050, or a correction to Table 5.",
      },
    ],
    actionJustified:
      "Asking the Board to have the school's modelled value reported, rather than read from a chart.",
    dependsOnExtractions: ["residence-310", "school-450-r1", "school-450-r2"],
    highStakes: true,
    review: {
      state: "needs-expert-review",
      reviews: [
        {
          reviewer: "Reviewer 1 (demo)",
          expertise: "general",
          date: "2030-03-04",
          note: "First reading of Figure 4.",
        },
        {
          reviewer: "Reviewer 2 (demo)",
          expertise: "general",
          date: "2030-03-06",
          note: "Second reading disagrees by 0.003; logged.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "upset-conditions",
    issueId: ISSUE,
    proposition: "MX-7 stays below the guideline during start-up, shutdown and upset conditions.",
    kind: "scientific",
    assertedIn: [],
    status: "insufficient-evidence",
    statusReason: "These conditions were not modelled, so there is no evidence either way.",
    evidence: [
      {
        sourceId: "air-assessment",
        passageId: "scenarios",
        stance: "context",
        note: "The report says plainly that these conditions were not modelled.",
      },
    ],
    supportedConclusion: "Nothing. The question hasn't been studied in any reviewed source.",
    interpretation:
      "This is a gap, not a finding. It doesn't mean levels would be high during upsets; it means nobody has said.",
    unknowns: [
      "How often upsets happen at similar facilities.",
      "What emissions are during an upset.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence: "Upset-condition modelling, or monitoring data from comparable facilities.",
      },
      { toward: "contradict", evidence: "The same, showing levels above the guideline." },
    ],
    actionJustified:
      "Asking the Board to require upset-condition modelling, or approval conditions that cover upsets. A records request may show whether any such modelling exists.",
    highStakes: true,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-03-04", note: "" },
        {
          reviewer: "Reviewer 3 (demo)",
          expertise: "science",
          date: "2030-03-08",
          note: "Agree: absence of modelling, nothing more.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "guideline-protects-children",
    issueId: ISSUE,
    proposition:
      "The MX-7 guideline value is known to protect young children at the predicted concentrations.",
    kind: "scientific",
    assertedIn: [],
    status: "insufficient-evidence",
    statusReason: "The guideline's own basis says this hasn't been evaluated.",
    evidence: [
      {
        sourceId: "air-guideline",
        passageId: "mx7-basis",
        stance: "context",
        note: "The guideline comes from a rat study, with uncertainty factors applied.",
      },
      {
        sourceId: "air-guideline",
        passageId: "mx7-children",
        stance: "context",
        note: "Studies in children were not available, and the factor's adequacy for young children was not evaluated.",
      },
    ],
    supportedConclusion:
      "Only that the guideline includes a general factor meant to cover more sensitive people.",
    interpretation:
      "Not evaluated is not the same as unsafe. Animal findings don't carry straight over to children; the uncertainty factors exist because of that gap, and nobody has tested whether they are enough here.",
    unknowns: ["Whether children are more sensitive to MX-7 than adults, and by how much."],
    wouldChange: [
      {
        toward: "support",
        evidence: "Toxicological evaluation of MX-7 covering early-life exposure.",
      },
      {
        toward: "contradict",
        evidence: "Evidence of effects in young animals or children below the guideline.",
      },
    ],
    actionJustified:
      "Asking the public-health office to address children specifically in its review. Not a basis for saying children will be harmed.",
    related: ["emissions-safe"],
    highStakes: true,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-03-04", note: "" },
        {
          reviewer: "Reviewer 3 (demo)",
          expertise: "science",
          date: "2030-03-08",
          note: "Wording kept to what the guideline says.",
        },
      ],
      corrections: [
        {
          date: "2030-03-08",
          change:
            'Proposition reworded from "The guideline protects children" to "is known to protect young children".',
          reason: "The original wording invited a yes/no answer the evidence can't give.",
        },
      ],
    },
  },
  {
    id: "rezoning-approved",
    issueId: ISSUE,
    proposition: "Council has already approved the rezoning (Bylaw 2030-14).",
    kind: "legal",
    assertedIn: [
      { sourceId: "social-clip", passageId: "caption" },
      { sourceId: "repost-1", passageId: "caption" },
      { sourceId: "repost-2", passageId: "caption" },
      { sourceId: "council-video", passageId: "gallery-remark" },
    ],
    status: "contradicted",
    statusReason:
      "The council's own record shows first reading only, and the bylaw can't take effect before third reading.",
    evidence: [
      {
        sourceId: "council-minutes",
        passageId: "first-reading",
        stance: "contradicts",
        note: "Council gave the bylaw first reading: the first of three.",
      },
      {
        sourceId: "council-minutes",
        passageId: "hearing-scheduled",
        stance: "contradicts",
        note: "A public hearing is still to come.",
      },
      {
        sourceId: "bylaw-2030-14",
        passageId: "s6",
        stance: "contradicts",
        note: "The bylaw takes effect only once passed after third reading.",
      },
      {
        sourceId: "news-report",
        passageId: "lede",
        stance: "contradicts",
        note: "A local news report says the same as the minutes. It is a secondary source, not separate proof.",
      },
    ],
    supportedConclusion:
      "Bylaw 2030-14 has had first reading. It is proposed, not approved, and has no legal effect.",
    interpretation:
      "Four posts repeat this claim, but they trace back to one: the reposts copied the @MeadowmereWatch clip. Repetition isn't corroboration.",
    unknowns: ["How each councillor will vote at second and third reading."],
    wouldChange: [{ toward: "support", evidence: "Minutes recording second and third reading." }],
    actionJustified: "Taking part in the public hearing, which can still shape the decision.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-02-14", note: "" },
        {
          reviewer: "Reviewer 4 (demo)",
          expertise: "law",
          date: "2030-02-15",
          note: "Readings and coming-into-force confirmed against the bylaw.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "mayor-promised-jobs",
    issueId: ISSUE,
    proposition: "The Mayor promised that the facility will create 300 jobs.",
    kind: "attribution",
    assertedIn: [{ sourceId: "social-clip", passageId: "caption" }],
    status: "contradicted",
    statusReason:
      "The full recording shows the Mayor passing on the applicant's projection and saying it hadn't been verified.",
    evidence: [
      {
        sourceId: "council-video",
        passageId: "jobs-full",
        stance: "contradicts",
        note: "In full, the Mayor attributes the number to the applicant, calls it a projection, and says it is unverified.",
      },
      {
        sourceId: "social-clip",
        passageId: "clip-audio",
        stance: "context",
        note: "The four-second clip starts mid-sentence and ends before the qualification.",
      },
    ],
    supportedConclusion:
      "The Mayor repeated the applicant's projection of up to 300 jobs and said the Town hadn't verified it. That is a reported prediction, not a promise.",
    interpretation:
      "The clip isn't fabricated, but trimmed: the words in it are real and the meaning isn't. The caption turns an attributed, qualified prediction into a commitment.",
    unknowns: [],
    wouldChange: [
      {
        toward: "support",
        evidence: "Another recording in which the Mayor commits to the figure.",
      },
    ],
    actionJustified: "None needed beyond correcting the record where the clip is shared.",
    related: ["three-hundred-jobs"],
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        {
          reviewer: "Reviewer 1 (demo)",
          expertise: "general",
          date: "2030-02-14",
          note: "Clip timed against the full recording.",
        },
        {
          reviewer: "Reviewer 2 (demo)",
          expertise: "general",
          date: "2030-02-15",
          note: "Transcript passage re-checked against the audio.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "three-hundred-jobs",
    issueId: ISSUE,
    proposition: "The facility will create up to 300 jobs.",
    kind: "prediction",
    assertedIn: [{ sourceId: "approval-application", passageId: "jobs" }],
    status: "unresolved",
    statusReason: "It is the applicant's projection. No independent estimate has been reviewed.",
    evidence: [
      {
        sourceId: "approval-application",
        passageId: "jobs",
        stance: "supports",
        note: "The applicant projects up to 300 people at full operation.",
      },
      {
        sourceId: "council-video",
        passageId: "jobs-full",
        stance: "context",
        note: "The Town has said it has not verified the number.",
      },
    ],
    supportedConclusion:
      "The applicant projects up to 300 jobs at full operation. Nothing more is established.",
    interpretation:
      '"Up to" is a ceiling, and "at full operation" leaves the timing open. A projection can be tested later; it can\'t be confirmed now.',
    unknowns: [
      "The basis of the projection.",
      "How many jobs before full operation.",
      "How many would be local hires.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence:
          "The workforce plan behind the projection, or employment figures from comparable facilities.",
      },
      { toward: "contradict", evidence: "The same, pointing to far fewer jobs." },
    ],
    actionJustified: "Asking the applicant, through the hearing, for the basis of the projection.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-02-14", note: "" },
        { reviewer: "Reviewer 2 (demo)", expertise: "general", date: "2030-02-15", note: "" },
      ],
      corrections: [],
    },
  },
  {
    id: "ardent-owns-corvane",
    issueId: ISSUE,
    proposition: "Ardent Peak Asset Management owns Corvane, so the project is Ardent Peak's.",
    kind: "relationship",
    assertedIn: [{ sourceId: "blog-post", passageId: "ownership" }],
    status: "contradicted",
    statusReason:
      "The applicant is wholly owned by Corvane Holdings. Ardent Peak manages client funds that hold 8.2% of Corvane Holdings.",
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "subsidiary",
        stance: "contradicts",
        note: "The applicant's owner is Corvane Holdings plc.",
      },
      {
        sourceId: "annual-report",
        passageId: "major-shareholders",
        stance: "qualifies",
        note: "Ardent Peak's funds hold 8.2% on behalf of clients, with discretionary voting authority over 5.1%.",
      },
    ],
    supportedConclusion:
      "Funds managed by Ardent Peak hold 8.2% of the parent company's shares for their clients, and Ardent Peak can vote 5.1% of the shares. It does not own the applicant.",
    interpretation:
      "Managing clients' money that is invested in a company is not owning it, and 5.1% of the votes is far from control. Neither tells us whether Ardent Peak has any view on Meadowmere.",
    unknowns: [
      "How Ardent Peak has voted on any Corvane matter.",
      "Who the underlying clients are.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence: "Filings showing a controlling stake or a board appointment by Ardent Peak.",
      },
    ],
    actionJustified:
      "Correcting the claim where it is repeated. No action route on this exists locally.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-03-03", note: "" },
        {
          reviewer: "Reviewer 4 (demo)",
          expertise: "law",
          date: "2030-03-05",
          note: "Relationship types checked against the report's wording.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "ward2-conflict",
    issueId: ISSUE,
    proposition:
      "The Councillor for Ward 2 has a conflict of interest on Bylaw 2030-14 under the council's code.",
    kind: "legal",
    assertedIn: [{ sourceId: "blog-post", passageId: "conflict" }],
    status: "unresolved",
    statusReason:
      "Former employment is documented and was declared. Whether it amounts to a conflict under the code is for the Integrity Commissioner, and the facts that would decide it aren't public.",
    evidence: [
      {
        sourceId: "council-minutes",
        passageId: "ward2-declaration",
        stance: "context",
        note: "The Councillor declared employment with the applicant until June 2028, said it wasn't a pecuniary interest, and voted.",
      },
      {
        sourceId: "code-of-conduct",
        passageId: "pecuniary",
        stance: "context",
        note: "The code's test is whether the matter could reasonably be expected to affect the member's finances.",
      },
      {
        sourceId: "code-of-conduct",
        passageId: "advice-and-complaints",
        stance: "context",
        note: "The code gives the question to the Integrity Commissioner.",
      },
    ],
    supportedConclusion:
      "The Councillor worked for the applicant until June 2028, declared it at the meeting, and voted on first reading.",
    interpretation:
      "Past employment alone doesn't obviously meet the code's financial test. A continuing financial tie (a pension, shares, a job offer) might. We don't know whether one exists, and it isn't ours to decide. This is a question to put to the Commissioner, not an accusation to publish.",
    unknowns: ["Whether the Councillor has any continuing financial interest in the applicant."],
    wouldChange: [
      {
        toward: "support",
        evidence: "A continuing financial interest, or a finding by the Integrity Commissioner.",
      },
      {
        toward: "contradict",
        evidence: "Advice or a finding from the Commissioner that no conflict exists.",
      },
    ],
    actionJustified:
      "Asking the Integrity Commissioner, through the code's own process. Publishing it as settled is not justified.",
    highStakes: true,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-03-03", note: "" },
        {
          reviewer: "Reviewer 4 (demo)",
          expertise: "law",
          date: "2030-03-05",
          note: "Kept as a question; no finding about the person.",
        },
      ],
      corrections: [],
    },
  },
  {
    id: "jobs-forward-independent",
    issueId: ISSUE,
    proposition: "Meadowmere Jobs Forward is independent of the applicant.",
    kind: "relationship",
    assertedIn: [{ sourceId: "jobs-forward-site", passageId: "about" }],
    status: "unresolved",
    statusReason:
      "The applicant's funding is documented and disclosed. Whether the group is independent in how it decides isn't shown either way.",
    evidence: [
      {
        sourceId: "annual-report",
        passageId: "community-investment",
        stance: "qualifies",
        note: "The applicant contributed W$45,000 in 2029 for the group's information sessions.",
      },
      {
        sourceId: "jobs-forward-site",
        passageId: "supporters",
        stance: "qualifies",
        note: "The group discloses the applicant's funding itself.",
      },
    ],
    supportedConclusion:
      "The applicant funded the group's information sessions in 2029 (W$45,000), and both sides say so publicly.",
    interpretation:
      "Funding is a relationship worth knowing about when weighing what the group says. It does not show that the applicant directs the group, and the group's disclosure counts in its favour.",
    unknowns: [
      "Who decides the group's positions.",
      "How much of its funding comes from the applicant.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence:
          "Accounts showing the applicant's share of funding is small, or governance documents.",
      },
      {
        toward: "contradict",
        evidence: "Evidence that the applicant sets or approves the group's messages.",
      },
    ],
    actionJustified: "Noting the funding beside the group's statements. Nothing more.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 2 (demo)", expertise: "general", date: "2030-03-03", note: "" },
        { reviewer: "Reviewer 4 (demo)", expertise: "law", date: "2030-03-05", note: "" },
      ],
      corrections: [],
    },
  },
  {
    id: "parent-incident-2019",
    issueId: ISSUE,
    proposition:
      "In 2019, a facility run by the applicant's parent group released dust beyond its property line, leading to an enforcement order.",
    kind: "historical",
    assertedIn: [{ sourceId: "blog-post", passageId: "history" }],
    status: "supported",
    statusReason: "The regulator's order and the company's own report agree.",
    evidence: [
      {
        sourceId: "enforcement-order",
        passageId: "finding",
        stance: "supports",
        note: "The regulator found a visible dust release beyond the property line on 3 May 2019.",
      },
      {
        sourceId: "annual-report",
        passageId: "frostmere-incident",
        stance: "supports",
        note: "The company reports the same release and the order.",
      },
      {
        sourceId: "enforcement-order",
        passageId: "closed",
        stance: "context",
        note: "The order was closed in 2020 after the required works.",
      },
    ],
    supportedConclusion:
      "A dust release happened at the Frostmere facility in 2019, the regulator issued an order, and the order was closed in 2020.",
    interpretation:
      "Two independent records (the regulator's and the company's) agree. This is a fact about a different facility in another jurisdiction, and about 2019.",
    unknowns: [],
    wouldChange: [],
    actionJustified:
      "Asking whether the Board considers an applicant's compliance history. Not a basis for predicting what happens in Meadowmere.",
    related: ["history-will-repeat"],
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-02-19", note: "" },
        { reviewer: "Reviewer 2 (demo)", expertise: "general", date: "2030-02-20", note: "" },
      ],
      corrections: [],
    },
  },
  {
    id: "history-will-repeat",
    issueId: ISSUE,
    proposition: "The Meadowmere facility will have releases like the 2019 one at Frostmere.",
    kind: "prediction",
    assertedIn: [{ sourceId: "blog-post", passageId: "history" }],
    status: "insufficient-evidence",
    statusReason:
      "One past incident at a different site can't establish what will happen at this one.",
    evidence: [
      {
        sourceId: "enforcement-order",
        passageId: "finding",
        stance: "context",
        note: "The Frostmere release came from doors left open during loading of a feedstock building.",
      },
      {
        sourceId: "bylaw-2030-14",
        passageId: "s2c",
        stance: "context",
        note: "A Metals Recovery Facility, as the bylaw defines it, includes storing feedstock: the activity behind the Frostmere release.",
      },
    ],
    supportedConclusion:
      "Only that the Meadowmere facility would also store feedstock, the activity involved at Frostmere.",
    interpretation:
      "History is a reason to ask how feedstock handling will be controlled here. It isn't evidence that a release will happen.",
    unknowns: [
      "How feedstock storage at Meadowmere would be controlled.",
      "What conditions the Board would set.",
    ],
    wouldChange: [
      {
        toward: "support",
        evidence: "Plans for feedstock handling that repeat the Frostmere practice.",
      },
      {
        toward: "contradict",
        evidence: "Approval conditions covering feedstock storage, with monitoring.",
      },
    ],
    actionJustified:
      "Asking the Board to set conditions on feedstock storage. Not a basis for saying a release will happen.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 1 (demo)", expertise: "general", date: "2030-02-19", note: "" },
        { reviewer: "Reviewer 3 (demo)", expertise: "science", date: "2030-02-21", note: "" },
      ],
      corrections: [],
    },
  },
  {
    id: "patented-process",
    issueId: ISSUE,
    proposition:
      "The facility as applied for would use the high-temperature process in the parent group's patent application.",
    kind: "factual",
    assertedIn: [{ sourceId: "blog-post", passageId: "patent" }],
    status: "contradicted",
    statusReason: "The application describes a process with no thermal treatment.",
    evidence: [
      {
        sourceId: "approval-application",
        passageId: "process",
        stance: "contradicts",
        note: "The application says the process does not include thermal treatment.",
      },
      {
        sourceId: "patent-application",
        passageId: "claim-1",
        stance: "context",
        note: "The patent application claims a heating process at 300 to 450 °C.",
      },
      {
        sourceId: "patent-application",
        passageId: "assignee",
        stance: "context",
        note: "The application is published but not granted.",
      },
    ],
    supportedConclusion:
      "The parent group has applied to patent a heating process. The Meadowmere application describes a different process, without heat.",
    interpretation:
      "A patent application shows that someone claimed an idea. It doesn't show the idea works, has been used anywhere, or is planned for this site.",
    unknowns: ["Whether the parent group uses the patented process anywhere."],
    wouldChange: [
      { toward: "support", evidence: "An amended application adding thermal treatment." },
    ],
    actionJustified:
      "None beyond correcting the claim. Any change of process would be visible in an amended application.",
    highStakes: false,
    review: {
      state: "reviewed",
      reviews: [
        { reviewer: "Reviewer 2 (demo)", expertise: "general", date: "2030-02-19", note: "" },
        { reviewer: "Reviewer 3 (demo)", expertise: "science", date: "2030-02-21", note: "" },
      ],
      corrections: [],
    },
  },
];
