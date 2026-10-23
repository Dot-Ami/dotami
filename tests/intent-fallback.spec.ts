import { describe, expect, it } from "vitest";

import { parseIntentFallback } from "@/lib/journey/intent-fallback";

describe("intent fallback matcher", () => {
  it("maps the verification scenario: video game studio in Winnipeg + PC write-off", () => {
    const r = parseIntentFallback("A video game studio in Winnipeg, I want to write off my PC");
    expect(r.activityTags).toContain("Software / SaaS");
    expect(r.province).toBe("MB");
    expect(r.capitalPurchasePlanned).toBe(true);
    expect(r.goals).toContain("write-offs");
    expect(r.source).toBe("fallback");
    expect(r.unmapped).toHaveLength(0);
  });

  it("maps trades + vehicle", () => {
    const r = parseIntentFallback("I do renovations in Calgary and want my truck to count");
    expect(r.activityTags).toContain("Trades");
    expect(r.province).toBe("AB");
    expect(r.capitalPurchasePlanned).toBe(true);
  });

  it("detects side-gig framing and hobby monetization", () => {
    const r = parseIntentFallback("Turn my weekend woodworking hobby into something official");
    expect(r.ventureType).toBe("side-gig");
    expect(r.activityTags).toContain("Trades");
  });

  it("never guesses a province from tone", () => {
    const r = parseIntentFallback("A SaaS app for accountants");
    expect(r.province).toBeNull();
  });

  it("is honest about unmappable ventures", () => {
    const r = parseIntentFallback("I'm inventing a brand new team sport league");
    // "invention" hits AI/R&D? "inventing" contains "invention"? No — "inventing" does not
    // contain "invention". Whatever maps, the contract is: no silent drop.
    if (r.activityTags.length === 0) {
      expect(r.unmapped.length).toBeGreaterThan(0);
    }
    expect(r.rawLabel.toLowerCase()).toContain("sport");
  });

  it("discover-now from uncertainty", () => {
    const r = parseIntentFallback("I don't know where to start, just show me what's available");
    expect(r.goals).toContain("discover-now");
  });

  it("keeps labels short", () => {
    const r = parseIntentFallback("x".repeat(300));
    expect(r.rawLabel.length).toBeLessThanOrEqual(80);
  });

  it("maps bike repair van in Calgary to Trades and not AI / ML / R&D", () => {
    const r = parseIntentFallback("A mobile bike repair van in Calgary — I drive to people's homes and offices and fix their bikes on the spot.");
    expect(r.activityTags).toContain("Trades");
    expect(r.activityTags).not.toContain("AI / ML / R&D");
    expect(r.province).toBe("AB");
    // Until 2026-10-17 "van" alone proposed "Equipment / vehicle purchase on the path". The words name a
    // van the person has, not one they are buying, so nothing is proposed (the idea harness's finding).
    expect(r.capitalPurchasePlanned).toBe(false);
  });

  it("maps short phrase 'bike repair van in Calgary' to Trades and not AI / ML / R&D", () => {
    const r = parseIntentFallback("bike repair van in Calgary");
    expect(r.activityTags).toContain("Trades");
    expect(r.activityTags).not.toContain("AI / ML / R&D");
    expect(r.province).toBe("AB");
    expect(r.capitalPurchasePlanned).toBe(false);
  });

  it("does not treat carpenter as a vehicle purchase", () => {
    const r = parseIntentFallback("I am an independent carpenter building custom tables");
    expect(r.activityTags).toContain("Trades");
    expect(r.capitalPurchasePlanned).toBe(false); // "car" in "carpenter" should not trigger vehicle
  });

  it("does not light AI / ML / R&D from words containing 'ai' as substring", () => {
    const samples = [
      "Residential interior painting and staining",
      "Hair and nail salon studio",
      "Retail clothing boutique",
      "Personal fitness training coach",
      "Industrial equipment maintenance and repair",
    ];
    for (const text of samples) {
      const r = parseIntentFallback(text);
      expect(r.activityTags, `Text "${text}" should not match AI / ML / R&D`).not.toContain("AI / ML / R&D");
    }
  });

  it("lights AI / ML / R&D on actual standalone AI and A.I. tokens", () => {
    expect(parseIntentFallback("An applied AI assistant for law firms").activityTags).toContain("AI / ML / R&D");
    expect(parseIntentFallback("Building a.i. agents and tools").activityTags).toContain("AI / ML / R&D");
    expect(parseIntentFallback("Machine learning research and development").activityTags).toContain("AI / ML / R&D");
  });

  it("does not trigger capital purchases on substrings like 'van' in advance or 'pc' in space", () => {
    const r1 = parseIntentFallback("Advance consulting on business strategy");
    expect(r1.capitalPurchasePlanned).toBe(false);

    const r2 = parseIntentFallback("Interior space planning and decorating");
    expect(r2.capitalPurchasePlanned).toBe(false);
  });
});

// The idea harness's findings of 2026-10-17 (tests/fixtures/ideas/known-gaps.ts until this change): the
// parser proposes only what the words state. The sentences marked with an idea number are from the corpus
// (tests/fixtures/ideas/v1.ts); the others are new.
describe("a province only when the words name one place in Canada", () => {
  it("proposes none when a place outside Canada is named with a Canadian city's name", () => {
    for (const text of [
      "Surrey, England — I want to do dog grooming", // 218
      "Victoria, Australia: start a surf school", // 219
      "Hamilton, New Zealand, plumbing business", // 220
      "Brandon, Florida — lawn care business", // 237
      "I live in Saint John, US Virgin Islands and want a boat tour company", // 242
      "Moving my bakery from London, Ontario to Portland, Oregon",
      "food truck in Austin, Texas", // 215
    ]) {
      expect(parseIntentFallback(text).province, text).toBeNull();
    }
  });

  it("proposes none when two provinces are named: the person picks", () => {
    for (const text of [
      "moving from Winnipeg to Regina, I'm a carpenter", // 179
      "moving to Yellowknife from Alberta to drive a fuel truck, maybe own one later", // 189
      "Red Seal cabinetmaker from Ontario, moved to Lethbridge, want to open a shop", // 275
      "A cleaning company in Halifax, then one in Moncton",
    ]) {
      expect(parseIntentFallback(text).province, text).toBeNull();
    }
  });

  it("never reads a person's name as a city, and never picks by the provinces' order", () => {
    // 269: Victoria is the person's partner; Halifax is the place. Before, BC won because it comes before NS.
    expect(parseIntentFallback("Victoria and I want to run a cleaning company in Halifax").province).toBe("NS");
    // 270: Regina is the person's sister; Red Deer is the place.
    expect(parseIntentFallback("my sister Regina and I bake bread on weekends in Red Deer").province).toBe("AB");
    expect(parseIntentFallback("my partner Brandon and I want to start a dog-walking business").province).toBeNull();
  });

  it("still reads a Canadian place said plainly, a name-like city included", () => {
    const cases: [string, string][] = [
      ["teach yoga in the park on Saturdays, Victoria BC, I'm a full-time accountant", "BC"], // 36
      ["drywall and taping brandon manitoba", "MB"], // 123
      ["three hair salons in Regina, each its own company", "SK"], // 103
      ["3D printing figurines to sell at conventions, I'm in Hamilton", "ON"], // 322
      ["moving my art studio to Victoria", "BC"], // 190
      ["notre entreprise fabrique des meubles à Laval", "QC"], // 78
      ["J'ai envie de lancer mon studio d'illustration à Québec", "QC"], // 10
      ["Une boulangerie dans l'Ontario", "ON"],
      ["landscaping and lawn care in Surrey, me and a truck", "BC"], // 52
      ["I'm in Minneapolis but my customers are in Winnipeg, selling hockey gear", "MB"], // 230: no state or country named
      ["Calgary, Alberta: a mobile dog groomer", "AB"],
    ];
    for (const [text, province] of cases) expect(parseIntentFallback(text).province, text).toBe(province);
  });
});

// The maintainer's call a-call-14 (2026-10-23): French place words are read as places, the way English ones are.
describe("a place said in French, the way one said in English is read", () => {
  it("reads a name-like city after a French place word, as after an English one", () => {
    const cases: [string, string][] = [
      ["je suis adjointe administrative à Regina le reste de l'année", "SK"], // 32, in French
      ["un salon de thé à Victoria", "BC"],
      ["une entreprise de toiture à Brandon", "MB"],
      ["je répare des vélos à Hamilton", "ON"],
      ["un atelier dans Hamilton", "ON"],
      ["pas d'accent: je donne des cours de yoga a Victoria, Colombie-Britannique", "BC"],
    ];
    for (const [text, province] of cases) expect(parseIntentFallback(text).province, text).toBe(province);
  });

  it("reads the provinces' French names, with or without their accents and hyphens", () => {
    const cases: [string, string][] = [
      ["une boulangerie au Québec", "QC"],
      ["une boulangerie au Quebec", "QC"],
      ["un food truck en Alberta", "AB"],
      ["un studio de yoga en Colombie-Britannique", "BC"],
      ["un studio de yoga en colombie britannique", "BC"],
      ["une ferme au Nouveau-Brunswick", "NB"],
      ["la pêche en Nouvelle-Écosse", "NS"],
      ["la peche en Nouvelle Ecosse", "NS"],
      ["des visites guidées à Terre-Neuve", "NL"],
      ["un gîte à l'Île-du-Prince-Édouard", "PE"],
      ["un gite a l'ile du prince edouard", "PE"],
      ["des tours de motoneige dans les Territoires du Nord-Ouest", "NT"],
    ];
    for (const [text, province] of cases) expect(parseIntentFallback(text).province, text).toBe(province);
  });

  it("still reads a first name as a person in French, and still names no province for Lloydminster or two places", () => {
    for (const text of [
      "Victoria et moi voulons ouvrir une boulangerie", // Victoria is a person here
      "ma sœur Regina fait des gâteaux",
      "je cultive une terre neuve près de chez moi", // new land, not the province
      "a Victoria sponge cake business", // the English article "a" puts no one anywhere
      "je veux ouvrir une boulangerie à Lloydminster",
      "de Winnipeg à Regina", // two provinces: the person picks
    ]) {
      expect(parseIntentFallback(text).province, text).toBeNull();
    }
  });
});

describe("a kind of work only when the words say it is the person's own", () => {
  const tagsOf = (text: string) => parseIntentFallback(text).activityTags;

  it("a workshop, a barber shop or the person's day job is not retail", () => {
    for (const text of [
      "guitar lessons out of my apartment in Moncton, I work retail", // 38
      "keep bees and sell honey at the farmers market, I work at a feed store near Lacombe", // 41
      "I'm doing my cabinetmaker apprenticeship in Edmonton and build furniture on weekends, want my own shop one day", // 46
      "incorporated machine shop in Nisku doing oilfield parts", // 83
      "I own an auto repair shop and a separate towing company in Medicine Hat", // 95
      "barber shop in lloydminster", // 122
      "cabinet maker. want my own shop. edmonton", // 274
      "TikTok creator doing comedy, I work in retail in Calgary, brand deals coming in", // 345
    ]) {
      expect(tagsOf(text), text).not.toContain("E-commerce / retail");
    }
    for (const text of [
      "closing an online store in Halifax",
      "I sell on Etsy and at markets in Edmonton",
      "Retail clothing boutique",
      "bottle my hot sauce and sell it to stores in Edmonton", // 325: selling to stores is retail
      "CEO and owner of three franchise coffee shops in Calgary", // 87
      "I want to open a store selling board games",
    ]) {
      expect(tagsOf(text), text).toContain("E-commerce / retail");
    }
  });

  it("an app, a website, a game or a program the person uses is not software", () => {
    for (const text of [
      "stream video games on Twitch after work in Yellowknife", // 47
      "I sell on Etsy and at markets in Edmonton, sales are in three apps and a notebook", // 157
      "massage therapist in Calgary, records in a spreadsheet, a shoebox and my bank app", // 159
      "bed and breakfast in Charlottetown, bookings on two websites", // 169
      "I run outdoor education programs for schools in Whitehorse", // 296
      "drive for a ride-share app on weekends in Whitehorse", // 306
      "I also rent out my lighting gear to other DJs sometimes and they pay me through an app", // 260
      "Abby is registered for GST/HST as a commercial ridesharing driver operating in Ontario using the Uber platform.",
    ]) {
      expect(tagsOf(text), text).not.toContain("Software / SaaS");
    }
    for (const text of [
      "A video game studio in Winnipeg, I want to write off my PC",
      "I have an app idea for splitting rent with roommates", // 262
      "I'm building a rideshare app for university students",
      "an AI tutor app for kids learning to read, I'm in Calgary", // 340
      "we did logos and websites for local shops", // 195
      "freelance developer in Calgary", // 162
      "I make indie games on weekends",
      "my own app for dog walkers",
    ]) {
      expect(tagsOf(text), text).toContain("Software / SaaS");
    }
  });

  it("“ai” in French, or an AI tool the person uses, is not an AI business", () => {
    for (const text of [
      "J'ai envie de lancer mon studio d'illustration à Québec", // 10
      "J'ai deux compagnies à Montréal, une en construction et une en immobilier", // 100
      "command-line tool for farmers' grain tickets; I'm in Lethbridge and I code with an AI assistant", // 137
      "My AI agent suggests a podcast network for Alberta small towns", // 141
    ]) {
      expect(tagsOf(text), text).not.toContain("AI / ML / R&D");
    }
    for (const text of ["An applied AI assistant for law firms", "I have an idea for an AI tool that schedules shifts for restaurants in Calgary", "my AI startup"]) {
      expect(tagsOf(text), text).toContain("AI / ML / R&D");
    }
  });

  it("the customers' trade, an IT contractor or a painter of pictures is not the trades", () => {
    for (const text of [
      "My agent summarised my idea: a SaaS that tracks equipment maintenance for small oilfield contractors in Alberta.", // 131
      "The product is a field service app for small HVAC and plumbing outfits in Calgary and Edmonton.", // 155
      "IT contractor in Calgary, invoices in QuickBooks and some in Excel", // 170
      "painter in Dawson City, I sell paintings to tourists and never filed", // 213
      "bookkeeping for contractors in Red Deer",
    ]) {
      expect(tagsOf(text), text).not.toContain("Trades");
    }
    for (const text of [
      "Residential interior painting and staining",
      "general contractor doing renovations in Calgary",
      "two companies in Fredericton: one for landscaping, one for snow removal", // 357
      "I work as an electrician and want my own business",
    ]) {
      expect(tagsOf(text), text).toContain("Trades");
    }
  });

  it("the others the harness found: real estate photography, software sold to clinics, Instagram deposits, a tutoring app", () => {
    expect(tagsOf("weekend real estate photography while I keep my job in Red Deer")).not.toContain("Real estate"); // 31
    expect(tagsOf("I'm a real estate agent in Regina")).toContain("Real estate");
    expect(tagsOf("my corporation sells scheduling software to clinics, Edmonton")).not.toContain("Healthcare / wellness"); // 71
    expect(tagsOf("a physiotherapy clinic in Calgary")).toContain("Healthcare / wellness");
    expect(tagsOf("tattoo artist in Edmonton renting a station, deposits through Instagram")).not.toContain("Creator / influencer"); // 174
    expect(tagsOf("Instagram influencer with brand deals")).toContain("Creator / influencer");
    expect(tagsOf("an AI tutor app for kids learning to read, I'm in Calgary")).not.toContain("Consulting"); // 340
    expect(tagsOf("math tutoring for high school students")).toContain("Consulting");
  });
});

describe("“Equipment / vehicle purchase on the path” only when the words say the person is buying one", () => {
  it("is not proposed for a vehicle or tool only named", () => {
    for (const text of [
      "start a YouTube channel reviewing camping gear from Grande Prairie", // 17
      "3D printing replacement parts for farm equipment near Medicine Hat", // 19
      "deliver groceries with my own car after work, Calgary", // 44
      "owner-operator trucker based in Winnipeg, hauling for a few companies", // 53
      "Drafted with my assistant: machine learning consulting for fisheries in British Columbia", // 135
      "hairdresser renting a chair in Winnipeg, I keep receipts in my car", // 160
      "trucker in Saskatoon, fuel receipts everywhere, log books in the truck", // 161
      "freelance developer in Calgary, invoices in three different tools, expenses on two credit cards", // 162
      "winding down my trucking corporation in Red Deer, selling the trucks", // 183
      "moving to Yellowknife from Alberta to drive a fuel truck, maybe own one later", // 189
      "I fix computers for people in Edmonton, it's my job now", // 271
      "rideshare driving in Calgary with my own car", // 348
      "president of our trucking company in Regina, 40 trucks", // 353
      "I want to be a truck driver in sudbury", // 117
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(false);
    }
  });

  it("is proposed when the words say buying, leasing, needing or writing one off", () => {
    for (const text of [
      "thinking about a taco food truck in Edmonton, buying a used truck this spring", // 2
      "a craft brewery in Canmore, need to buy brewing equipment", // 12
      "snow removal and plowing in Yellowknife, I'd need a truck with a plow", // 18
      "TOW TRUCK BUSINESS CALGARY NEED TO BUY TRUCK", // 127
      "fisherman in Newfoundland, settlement slips from the buyer and receipts for gear", // 167
      "came back to Alberta after working in the oil sands in Fort McMurray, want my own welding rig", // 187
      "I bought new speakers last year on my credit card", // 260
      "A video game studio in Winnipeg, I want to write off my PC",
      "I do renovations in Calgary and want my truck to count",
      "leasing a van for deliveries in Halifax",
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(true);
    }
  });

  // The review of PR #182 (2026-10-17): words that rule a purchase out, a vehicle the person already has,
  // or one the customers need said nothing about buying one, though the chip came on.
  it("is not proposed when the words rule a purchase out, or the vehicle is the person's own or a customer's", () => {
    for (const text of [
      "I don't need any equipment, just my skills",
      "I don't plan on buying a truck, I'll rent one",
      "No need to buy a vehicle, I bike",
      "I won’t be buying a van",
      "I need my car to get to clients, I do mobile dog grooming",
      "I replace car windshields for people in Calgary",
      "I help people who need a van for moving day",
      "I give financial advice on equipment leasing to farmers",
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(false);
    }
    for (const text of [
      "I'm buying a used truck for the business",
      "I need to buy a new laptop for school",
      "I need a van for my moving business",
      "I'm financing a truck through the dealer",
      "I need to replace my truck this year",
      "I'll need a camera and lights",
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(true);
    }
  });

  // The second review of PR #182 (2026-10-17): a purchase the words state was lost when more than two
  // words sat between the verb and the thing, or the verb was "get", which the keyword-only parser on main
  // still read.
  it("is proposed with a few describing words between the verb and the thing, or with “get”", () => {
    for (const text of [
      "I need to buy a brand new delivery van",
      "I'm going to buy a refurbished commercial espresso machine",
      "I need to purchase a commercial espresso machine",
      "I want to get a truck",
      "I'm getting a new laptop for work",
      "I need my own truck for the business",
      "I'm upgrading to a new camera",
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(true);
    }
  });

  // The same review: the stated rule is "only when the words say the person is buying", yet what customers
  // need done to their vehicles and a service of replacing or upgrading other people's machines still came
  // on as the person's purchase (main did the same; nothing to regress, but the rule says never).
  it("is not proposed for what the customers need done, a service on their machines, or words across a clause", () => {
    for (const text of [
      "Contractors need trucks detailed so I run a mobile detailing service",
      "Small farms need equipment repaired, I fix tractors in Lethbridge",
      "I replace computers for small offices in Calgary",
      "I upgrade gaming PCs for customers",
      "I get trucks detailed for dealerships",
      "I need to buy groceries for my van camping trips",
      "Offices need computers set up, that's my business",
    ]) {
      expect(parseIntentFallback(text).capitalPurchasePlanned, text).toBe(false);
    }
  });
});

// The review of PR #182 (2026-10-17): until then any of some ninety words for places outside Canada,
// anywhere in the words, dropped the province, a province named outright included.
describe("a place outside Canada drops only the Canadian city it is named with", () => {
  it("still reads a province or city in Canada when a place outside Canada is named elsewhere", () => {
    const cases: [string, string][] = [
      ["I'm based in Calgary and sell on Amazon to customers in the United States", "AB"],
      ["Ontario-based Etsy shop shipping mostly to the USA", "ON"],
      ["Selling maple syrup online from Quebec to customers in Texas", "QC"],
      ["I import tea from India and sell it in Toronto", "ON"],
      ["I sell fine china and antiques from my home in Edmonton", "AB"],
      ["I breed Maine Coon cats in Calgary", "AB"],
      ["My partner Virginia and I want to open a cafe in Edmonton", "AB"],
      ["I moved to Calgary from Texas and want to start a roofing company", "AB"],
    ];
    for (const [text, province] of cases) expect(parseIntentFallback(text).province, text).toBe(province);
  });

  // The second review of PR #182 (2026-10-17): the moving-out check paired a move word with any later "to"
  // in the sentence, so a person moving INTO Canada who sells to a place outside it lost their province.
  // The destination is the move's own: the first "to" after the move word.
  it("reads the province of a move into Canada when the sentence later sends something outside it", () => {
    const cases: [string, string][] = [
      ["I'm moving to Calgary to open a store that ships to the USA", "AB"],
      ["Moving to Edmonton and selling my art to Texas collectors", "AB"],
      ["We relocated to Winnipeg and export maple syrup to Japan", "MB"],
      ["Relocating to Halifax and selling online to buyers in the UK", "NS"],
      ["I moved from Texas to Calgary and ship to Florida", "AB"],
    ];
    for (const [text, province] of cases) expect(parseIntentFallback(text).province, text).toBe(province);
  });

  it("proposes none when the city is named as one outside Canada, or the person is moving out of Canada", () => {
    for (const text of [
      "Surrey, England — I want to do dog grooming",
      "landscaping in Surrey England",
      "a cafe in Vancouver, Washington",
      "I live in Saint John, U.S. Virgin Islands and want a boat tour company",
      "Moving my bakery from London, Ontario to Portland, Oregon",
      "relocating from Toronto to the United States to open a gym",
      "Moving from Calgary to Texas to open a shop",
      "I'm moving my bakery from Edmonton to Seattle, Washington",
      "We moved to the USA from Toronto",
    ]) {
      expect(parseIntentFallback(text).province, text).toBeNull();
    }
  });
});
