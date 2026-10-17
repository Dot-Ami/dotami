import type { InvariantId } from "../../helpers/idea-invariants";

/**
 * The known gaps: each idea and invariant (and subject) the idea harness (tests/idea-harness.spec.ts) finds
 * failing today, and why. It is a ratchet: the harness fails on any failure not listed here, and also on a
 * listed one that now passes, so this list only ever shrinks. When a story lands, remove its ideas here in
 * the same pull request.
 *
 * Two kinds:
 * - "planned": the feature that makes it pass is a story not built yet (phase 2 of the plan of 2026-10-17).
 * - "bug": today's code does something the binding rules say it never does. Each is a finding for the
 *   maintainer (listed in the pull request that added it), never a gap hidden here quietly.
 *
 * `ideas` are the corpus's permanent numbers (idea-v1-0001 is 1).
 */
export interface KnownGap {
  invariant: InvariantId;
  /** The failure's subject: a question's id, a line's place on screen, a tag, or "" when there is one. */
  subject: string;
  kind: "planned" | "bug";
  /** The story that fixes it, or, for a bug with none yet, who decides. */
  story: string;
  why: string;
  ideas: readonly number[];
}

const MAINTAINERS_CALL = "none yet: found by S2.5.29b, the maintainer's call";

export const KNOWN_GAPS: readonly KnownGap[] = [
  {
    invariant: "ends:road-written-for-place",
    subject: "",
    kind: "planned",
    story: "S2.5.28d (outside Alberta, honestly)",
    why: "Every typed idea is drawn on road 0, which is written for Alberta only, wherever the idea is. The plan's goal line says “written for AB; this idea is in …”, but every step still reads as Alberta's. 28d draws the federal steps that apply everywhere and says “Written for Alberta” with the person's own province named.",
    ideas: [
      3, 4, 5, 7, 9, 10, 11, 13, 15, 16, 18, 20, 22, 28, 29, 30, 32, 33, 35, 36, 37, 38, 40, 42, 43, 45, 47, 49, 50, 52, 53, 54, 56, 58,
      59, 60, 61, 63, 64, 66, 67, 69, 73, 75, 76, 78, 79, 80, 82, 84, 85, 86, 88, 91, 92, 94, 96, 97, 98, 100, 101, 102, 103, 105, 107,
      109, 111, 112, 113, 114, 115, 117, 119, 121, 123, 124, 126, 128, 129, 133, 135, 138, 140, 142, 145, 148, 150, 152, 154, 156, 158,
      160, 161, 163, 164, 165, 166, 167, 169, 171, 172, 173, 177, 179, 181, 182, 184, 185, 186, 188, 189, 190, 192, 194, 197, 198, 199,
      200, 202, 203, 206, 208, 210, 211, 212, 213, 245, 246, 247, 248, 249, 251, 254, 255, 260, 268, 269, 287, 288, 289, 290, 294, 295,
      296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321,
      322, 323, 324, 332, 334, 337, 346, 351, 352, 353, 354, 355, 356, 357,
    ],
  },
  {
    invariant: "ends:no-silent-fallback",
    subject: "",
    kind: "planned",
    story: "S2.5.28c (honest road match)",
    why: "Nothing matches a typed idea to a road, so an Alberta idea with no road written for it (a career, work the law forbids) and a cabinetmaker idea (road 1 is written for it) all land on road 0 with only “No future picked: this idea is drawn on the general road.” 28c puts the road written for the picked job first, or says “No road is written for this job yet”.",
    ideas: [8, 46, 125, 180, 193, 250, 252, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286],
  },
  {
    invariant: "ends:questions-change-something",
    subject: "incorporate-at",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "On road 0, “Not told yet” asks for the yearly sales at which the person would incorporate and says it unlocks “Incorporating” lighting from their own number, but the rule compares that number only with a third-year sales estimate (lib/brain/evaluate.ts computeNodeStates). With the intake's optional Year 3 box blank, which “Not told yet” never asks for, every answer leaves the step on “check first”, and the receipt says “Saved. Nothing on the road changed.”",
    ideas: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
      70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
      102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128,
      129, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155,
      156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182,
      183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208,
      209, 210, 211, 212, 213, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 260, 268, 269, 270, 271, 272, 273, 274,
      275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300,
      301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326,
      327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352,
      353, 354, 355, 356, 357,
    ],
  },
  {
    invariant: "ends:questions-change-something",
    subject: "map-pick:gstTiming",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "For ride-share and taxi ideas the rules colour both GST sides the same whichever is picked (registration is required from the first paid ride), yet “Not told yet” still asks “Your pick at “GST timing”” and says it unlocks the map reading the pick: either answer changes nothing.",
    ideas: [26, 29, 114, 151, 158, 197, 301, 306, 320, 347, 348],
  },
  {
    invariant: "ends:questions-change-something",
    subject: "equipment",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“Are you buying equipment, a vehicle or tools?” changes nothing for this idea: the equipment write-off cards are already shown because the parser tagged it “AI / ML / R&D” from the French “J'ai” (see the kind-of-work gap below).",
    ideas: [100],
  },
  {
    invariant: "no-time-words",
    subject: "plan › step step-shop-register-apprentice › summary",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "Road 1's first step says the program has 4 periods, “each designed to take about a year”: how long the training takes, not a requirement the person must meet, so “no times at all” (2026-10-17) rules it out. It paraphrases a tool-checked quote (“Each period designed to take ~1 year”).",
    ideas: [46, 193, 272, 273, 274, 275, 276, 277, 278, 279, 280],
  },
  {
    invariant: "nothing-derived:province",
    subject: "BC",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "The keyword parser reads a city name as British Columbia wherever it is: “Surrey, England”, “Victoria, Australia”, and “Victoria and I want to run a cleaning company in Halifax” (a person's name; Halifax, the place named, loses because the parser checks provinces in a fixed order, BC before NS).",
    ideas: [218, 219, 269],
  },
  {
    invariant: "nothing-derived:province",
    subject: "ON",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“Hamilton, New Zealand” is read as Ontario.",
    ideas: [220],
  },
  {
    invariant: "nothing-derived:province",
    subject: "MB",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“Brandon, Florida” is read as Manitoba.",
    ideas: [237],
  },
  {
    invariant: "nothing-derived:province",
    subject: "NB",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“Saint John, US Virgin Islands” is read as New Brunswick.",
    ideas: [242],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "E-commerce / retail",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“shop” and “store” are read as retail whatever they mean: a workshop (a cabinetmaker's, a machine shop, an auto repair shop, a barber shop), the customers' shops, or the store the person works at (“I work retail”, “I work at a feed store”).",
    ideas: [38, 41, 46, 83, 95, 122, 155, 191, 193, 195, 235, 274, 275, 278, 279, 324, 345],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Software / SaaS",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“app”, “website”, “game” and “program” are read as building software when the person only uses one: a bank app, a ride-share app, bookings on two websites, streaming video games, outdoor education programs.",
    ideas: [47, 157, 159, 169, 260, 296, 306],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "AI / ML / R&D",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“ai” matches the French “J'ai” (I have), and “I code with an AI assistant” or “my AI agent suggests” is read as an AI business.",
    ideas: [10, 100, 137, 141],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Trades",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“contractor” and “painting” are read as trades: an IT contractor, the customers who are oilfield contractors or HVAC outfits, a painter of pictures.",
    ideas: [131, 155, 170, 213],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Real estate",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "“real estate photography” is read as a real estate business.",
    ideas: [31],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Healthcare / wellness",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "Selling software to clinics is read as running one.",
    ideas: [71],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Creator / influencer",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "Taking deposits through Instagram is read as being an Instagram creator.",
    ideas: [174],
  },
  {
    invariant: "nothing-derived:kind-of-work",
    subject: "Consulting",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "An AI tutor app is read as tutoring services.",
    ideas: [340],
  },
  {
    invariant: "nothing-derived:equipment",
    subject: "",
    kind: "bug",
    story: MAINTAINERS_CALL,
    why: "Any vehicle or equipment word turns on “Equipment / vehicle purchase on the path” on the confirm screen, and the rules then read it (the capital cost cards): “trucker”, “selling the trucks”, “my own car”, “I fix computers”, “farm equipment” the person repairs, “camping gear” they review, even “machine learning”. Nothing in the words says the person is buying any.",
    ideas: [17, 19, 44, 52, 53, 77, 83, 89, 116, 117, 118, 120, 131, 135, 155, 160, 161, 162, 183, 189, 195, 201, 215, 230, 236, 245, 271, 348, 353],
  },
];
