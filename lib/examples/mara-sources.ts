import type { ExampleSources, ListedPrice, SoftwarePlan, Statistic, ToolPriced } from "./types";

/**
 * Where Mara's numbers come from (the maintainer, 2026-10-14, option A: "ground Mara's example in real,
 * cited numbers where they exist; numbers nothing real can supply stay blank"). Every entry was seen on
 * 2026-10-14 and then checked a second time, by fetching the page again and finding the price or figure in
 * its words; entries that second check didn't confirm are not here, and `leftOut` says which and why.
 *
 * A review couldn't re-open four sellers' pages; on 2026-10-27 they were opened again. Every Busy Bee Tools,
 * Autodesk and QuickBooks price was the same as on 2026-10-14. Autodesk draws its prices with a script, so a
 * browser showed them ("CA$940 /YEAR (OR CA$120 /MONTH)" on the personal-use page) where a plain fetch saw
 * no amount. Lee Valley's page showed a bot check that was not bypassed, so that day its clamp price still
 * rested on the two checks of 2026-10-14. On 2026-10-29 the maintainer opened that page in his own browser
 * and wrote down the price, "85", and the item line, “Item 17F7340, Bessey 40" K Body REVO Clamp”: a
 * person's look at the same $85.00, recorded in the entry's note (an entry has no field for a person's
 * check, and its seen day stays the day of the two checks). Each entry still shows the words and the day it
 * was first seen; the one page whose words had changed around the same price, Busy Bee's planer (now in
 * stock), says both days in its note, and Lee Valley's clamp's note says that a person looked on 2026-10-29.
 *
 * These are not legal citations. lib/engines/shared/'s citation types name only government sources and back
 * a rule the engine reasons with; these are sellers' listed prices, software makers' plans and published
 * statistics behind an invented person's numbers, and no rule reads them. Their averages are worked out in
 * lib/examples/stats.ts, never typed here.
 *
 * "Recommending tools", as the maintainer asked, is built as information: twelve of the tools the trade's
 * official descriptions name, picked for this example (the sources name more; `notPriced` says which), in
 * the order the Alberta curriculum teaches them, with what Canadian sellers list them for. Never "buy this",
 * never ranked, never called the trade's whole list (CLAUDE.md, "Information and options, never a verdict").
 */

const SEEN = "2026-10-14";

const ALBERTA_CURRICULUM = "https://tradesecrets.alberta.ca/SOURCES/PDFs/curriculum_guides/036_outline.pdf";
const RED_SEAL = "https://www.red-seal.ca/_conf/assets/custom/docms/cabinetmaker/rsos-eng.pdf";
const NOC = "https://noc.esdc.gc.ca/Structure/NOCProfile?GocTemplateCulture=en-CA&code=72311&version=2021.0";

/** A price as seen, in cents. */
const p = (seller: string, url: string, product: string, priceCents: number, quote: string, caution?: string): ListedPrice => ({
  seller,
  url,
  product,
  priceCents,
  quote,
  seenOn: SEEN,
  ...(caution ? { caution } : {}),
});

// ---- Tools ---------------------------------------------------------------------------------------------

const tools: ToolPriced[] = [
  {
    id: "table-saw",
    item: "Table saw (10-inch cabinet saw, 3 HP, single-phase)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, H \"Table, Panel and Computer Numerical Controlled (CNC) Saws\", 20% of the section (PDF p.18). Also the Red Seal Occupational Standard, Cabinetmaker (PDF p.38), and NOC 72311's main duties (\"power saws\").",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use table, panel, and CNC saws.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/magnum-industrial-10-inch-3hp-cabinet-saw-with-storage-drawer.html", "Magnum Industrial 10\" 3HP Cabinet Saw with Storage Drawer, model 51-260, 3 HP 230 V. Sale price; regular $3,499.99", 269995, "Model Number: 51-260 $2,699.95 $3,499.99 You save $800.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/10in-3hp-cabinet-table-saw-craftex-cx", "Craftex CX213 10\" 3 HP 220 V single-phase cabinet saw (page title: '10\" 3HP INDUSTRIAL CABINET TABLE SAW CSA - Busy Bee Tools'). Sale price; regular $3,099.00", 299900, "In Stock Online $2,999.00 $3,099.00"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/stallion-3-hp-10-cabinet-saw-w-30-deluxe-fence/", "Stallion 3 HP 10\" Cabinet Saw w/30\" Deluxe Fence. Sale price; original $3,149.95", 299995, "Original price was: $3,149.95. $ 2,999.95 Current price is: $2,999.95."),
      p("Federated Tool Supply", "https://federatedtool.com/sawstop-3hp-professional-table-saw-w-36-rails-pcs31230-tgp236/", "SawStop PCS31230-TGP236 3 HP Professional Cabinet Saw with 36\" rails, with a flesh-sensing safety brake", 535900, "Write a Review $5,359.00 Weight: 493.00 LBS", "A premium model, about 1.8 times the other three sellers' prices; it pulls the average up (the median is less moved)."),
    ],
  },
  {
    id: "jointer",
    item: "Jointer (8-inch, floor-standing)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, L \"Jointers and Thickness Planers\", 12% (PDF p.18). NOC 72311's main duties name jointers; the Red Seal standard lists them among stationary power tools (PDF p.38).",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use and maintain jointers and thickness planers.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/magnum-industrial-8-quot-jointer.html", "Magnum Industrial 8\" Jointer, model MI-81360, 2 HP 230 V, helical cutterhead. Sale price; regular $3,199.99", 269995, "Model Number: MI-81360 $2,699.95 $3,199.99 You save $500.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/jointer-8in-3hp-4-knive-cutterhead-csa-cx08", "Craftex CX08 8\" 3 HP jointer, 4-knife cutterhead (page title: '8\"JOINTER 3HP - Busy Bee Tools'). Sale price; regular $1,799.00", 172900, "In Stock Online $1,729.00 $1,799.00"),
      p("Federated Tool Supply", "https://federatedtool.com/king-8-industrial-jointer-kc-80fx/", "King Canada KC-80FX 8\" Parallelogram Jointer, 220 V single-phase", 179900, "Write a Review $1,799.00 Weight: 394.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/scorpion-8%e2%80%b3-helical-parallelogram-jointer/", "Scorpion 8\" Helical Parallelogram Jointer, 3 HP 230 V. Sale price; original $4,999.95", 469995, "Original price was: $4,999.95. $ 4,699.95 Current price is: $4,699.95.", "A premium helical parallelogram model, about twice the others' prices."),
    ],
  },
  {
    id: "thickness-planer",
    item: "Thickness planer (15-inch, floor-standing)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, L \"Jointers and Thickness Planers\" (PDF p.18). The Red Seal standard lists planers among stationary power tools (PDF p.38).",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use and maintain jointers and thickness planers.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/king-industrial-15-quot-thickness-planer.html", "King Industrial 15\" Thickness Planer, KC-385FX, 3 HP 220 V single-phase. Sale price; regular $2,299.99; limited quantity online", 197999, "Model Number: KC-385FX $1,979.99 $2,299.99 You save $320.00"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/planer-15in-3hp-3-knive-cutterhead-csa-cx15", "Craftex CX15 15\" 3 HP planer, 3-knife cutterhead (page title: '15\" PLANER 3HP - Busy Bee Tools'). Clearance; regular $2,199.00", 179997, "This item will ship once back in stock $1,799.97 $2,199.00", "A clearance price. On 2026-10-14 the page said the item was out of stock and not available for shipping (store pickup only); on 2026-10-27 it said in stock online, at the same price."),
      p("Federated Tool Supply", "https://federatedtool.com/king-canada-kc-385fx-15-industrial-planer/", "King Canada KC-385FX 15\" Industrial Planer, 220 V single-phase", 199900, "Write a Review $1,999.00 Weight: 630.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/scorpion-15-3-hp-helical-thickness-planer/", "Scorpion 15\" 3 HP Helical Thickness Planer. Sale price; original $5,299.95", 499995, "Original price was: $5,299.95. $ 4,999.95 Current price is: $4,999.95.", "A premium helical model, about 2.5 times the others' prices."),
    ],
  },
  {
    id: "bandsaw",
    item: "Bandsaw (14-inch, floor-standing)",
    official: {
      mention: "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, J \"Band Saws\" (PDF p.18). The Red Seal standard lists band saws (PDF p.62).",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use band saws.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/magnum-industria-14-wood-band-saw.html", "Magnum Industrial 14\" Wood Band Saw, MI-91340, 1.5 HP 120/240 V. Sale price; regular $999.99", 79995, "Model Number: MI-91340 $799.95 $999.99 You save $200.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/14-deluxe-pro-bandsaw-bbpbs14n", "Busy Bee BBPBS14N 14\" Deluxe Pro Bandsaw, 1.75 HP, 13\" resaw. Sale price; regular $1,999.00", 129900, "In Stock Online $1,299.00 $1,999.00"),
      p("Princess Auto", "https://www.princessauto.com/en/product/14-in-2-speed-band-saw/PA0009283102/9283102", "Powerfist 14 in. 2-Speed Band Saw, SKU 9283102, 120 V 9.5 A, cuts wood and metal", 109999, "Shop All Products by Powerfist $1,099.99 A levy may be applied to this product.", "A wood-and-metal saw filed under metal fabrication, and the page doesn't say it is floor-standing: the price is real, the class match is in doubt."),
      p("Federated Tool Supply", "https://federatedtool.com/king-kc-1402fx-14-wood-bandsaw/", "King Canada KC-1402FX 14\" Wood Bandsaw, 1 HP 120 V", 99999, "Write a Review $999.99 Weight: 170.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/stallion-14-1-5-hp-band-saw/", "Stallion 14\" 1.5 HP Band Saw, 115/230 V. Sale price; original $1,399.95", 134995, "Original price was: $1,399.95. $ 1,349.95 Current price is: $1,349.95."),
    ],
  },
  {
    id: "drill-press",
    item: "Drill press (floor-standing, 14-17-inch)",
    official: {
      mention: "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, K \"Drill Presses\" (PDF p.18).",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use and maintain drill presses.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/magnum-industrial-17-quot-drill-press.html", "Magnum Industrial 17\" Drill Press, model 76-350, 1 HP 110 V. Sale price; regular $949.99", 79995, "Model Number: 76-350 $799.95 $949.99 You save $150.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/14in-drill-press-craftex-cx-series-csa", "Craftex CX614 14\" floor drill press, 3/4 HP. Clearance; regular $799.00. Busy Bee lists no 17\" floor model", 49997, "Final sale, no returns or exchanges Sale In Stock Online $499.97 $799.00", "A clearance price on a 14-inch model."),
      p("Princess Auto", "https://www.princessauto.com/en/product/12-speed-17-in-floor-drill-press/PA0009437187/9437187", "Powerfist 12-Speed 17 in. Floor Drill Press, SKU 9437187, 120 V 15 A", 99999, "Shop All Products by Powerfist $999.99 Add to Cart"),
      p("Federated Tool Supply", "https://federatedtool.com/king-16-speed-17-drill-press-kc-118fc/", "King Canada KC-118FC 17\" Floor Model Drill Press, 1 HP, 16 speed", 89900, "Write a Review $899.00 Weight: 200.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/bullett-17-floor-model-esc-drill-press/", "Bullett 17\" Floor Model 'Esc' Drill Press. Sale price; original $1,349.95", 129995, "Original price was: $1,349.95. $ 1,299.95 Current price is: $1,299.95."),
    ],
  },
  {
    id: "router",
    item: "Router (2-1/4 HP fixed + plunge base kit, corded)",
    official: {
      mention: "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, F \"Portable Power Tools\", item 5 (PDF p.17). The Red Seal standard lists routers among portable power tools (PDF p.36).",
      url: ALBERTA_CURRICULUM,
      quote: "Demonstrate the operation, application and maintenance of routers.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/dewalt-2-1-4-hp-fixed-plunge-router-kit.html", "DeWalt DW618PK 2-1/4 HP Fixed/Plunge Router Kit. Sale price; regular $399.99", 31995, "Model Number: DW618PK $319.95 $399.99 You save $80.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/router-2hp-fixed-base-and-plunge-base", "DeWalt DW618PK 2-1/4 HP router, fixed and plunge base", 36999, "Free shipping In Stock Online $369.99"),
      p("Federated Tool Supply", "https://federatedtool.com/dewalt-2-1-4-maximum-motor-hp-electronic-vs-fixed-base-plunge-base-router-combo-kit-dw618pk/", "DeWalt DW618PK 2-1/4 HP fixed/plunge router combo kit", 36900, "Write a Review $369.00 Weight: 22.55 LBS"),
    ],
  },
  {
    id: "random-orbit-sander",
    item: "Random-orbit sander (5-inch, corded)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, F \"Portable Power Tools\", item 4 (PDF p.17). NOC 72311's main duties: \"Sand wooden surfaces and apply veneer, stain or polish to finished products\". The Red Seal standard names orbital sanders (PDF p.108-109).",
      url: ALBERTA_CURRICULUM,
      quote: "Demonstrate the operation, application and maintenance of portable power sanders.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/makita-5-quot-random-orbital-sander.html", "Makita BO5030 5\" Random Orbital Sander, at the maker's minimum advertised price (MAP)", 10900, "Model Number: BO5030 MAP $109.00"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/sander-5in-random-orbital-makita", "Makita BO5030 5\" random orbital sander", 10900, "SANDER 5\" RANDOM ORBITAL MAKITA In Stock Online $109.00"),
      p("Federated Tool Supply", "https://federatedtool.com/makita-bo5030-5-random-orbit-sander/", "Makita BO5030 5\" Random Orbit Sander", 10900, "Write a Review $109.00 Weight: 4.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/bosch-5-random-orbit-sander-w-hook-loop-pad/", "Bosch 5\" Random Orbit Sander w/Hook/Loop Pad, 120 V. Sale price; original $109.95", 8995, "Original price was: $109.95. $ 89.95 Current price is: $89.95."),
    ],
  },
  {
    id: "dust-collector",
    item: "Dust collector (2 HP, single-stage)",
    official: {
      mention:
        "Red Seal Occupational Standard, Cabinetmaker (2021), sub-tasks A-2.01.09P \"use dust collector\" and A-2.01.10P \"maintain dust collection system\" (PDF p.36; again for stationary equipment, PDF p.37). The Alberta curriculum doesn't name dust collection as a topic of its own.",
      url: RED_SEAL,
      quote: "dust collector is used while operating portable power and pneumatic tools",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/magnum-industrial-2-hp-dust-collector.html", "Magnum Industrial 2 HP Dust Collector, model 11-300, 220 V single-phase, bag filter. Sale price; regular $699.99", 64995, "Model Number: 11-300 $649.95 $699.99 You save $50.04"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/2hp-dust-collector-canister-filter", "Busy Bee BBDC2 2 HP dust collector with canister filter. Sale price; regular $899.00", 64850, "In Stock Online $648.50 $899.00"),
      p("Princess Auto", "https://www.princessauto.com/en/product/2-hp-industrial-shop-dust-collector/PA0008654444/8654444", "Powerfist 2 HP Industrial Shop Dust Collector, SKU 8654444, 120 V 16 A, 1,790 CFM, 35-micron filter", 49999, "Shop All Products by Powerfist $499.99 Add to Cart"),
      p("Federated Tool Supply", "https://federatedtool.com/king-canada-kc-3109c-1-200-cfm-2-hp-dust-collector/", "King Canada KC-3109C 1,200 CFM 2 HP Dust Collector, bag filter", 59900, "Write a Review $599.00 Weight: 148.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/dustfx-hr-series-2hp-2-micron-dust-collector/", "DustFX HR Series 2HP 2 Micron Dust Collector, single stage. Sale price; original $849.95", 79995, "Original price was: $849.95. $ 799.95 Current price is: $799.95."),
    ],
  },
  {
    id: "bar-clamp",
    item: "Parallel-jaw bar clamp (40-inch, price for one clamp)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, D \"Assembly, Dismantling and Clamping Tools\", item 3 \"Apply clamping techniques\" (PDF p.17). NOC 72311's main duties: \"fit parts and subassemblies together to form complete unit using glue and clamps\". The Red Seal standard lists clamps (PDF p.52). They name clamps in general, not this kind; a glue-up needs several, and this is the price of one.",
      url: ALBERTA_CURRICULUM,
      quote: "Outcome: Use assembly, dismantling and clamping tools.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/bessey-3-3-4-40-inch-k-body-revolution-parallel-bar-clamp.html", "Bessey KRE3540 3-3/4\" x 40\" K Body REVOlution Parallel Bar Clamp, at MAP", 8495, "Model Number: KRE3540 MAP $84.95"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/clamp-k-body-revo-40in-1700-lbs", "Bessey KRE3540 40\" K Body REVO bar clamp", 8495, "BESSEY 40\" K BODY REVO BAR CLAMP In Stock Online $84.95"),
      p("Federated Tool Supply", "https://federatedtool.com/bessey-kre3540-clamp-woodworking-parallel-clamp-k-body-revolution-40-in-x-3-75-in-1700-lb/", "Bessey KRE3540 K Body REVOlution parallel clamp, 40 in.", 8495, "Write a Review $84.95 Weight: 7.65 LBS"),
      p("Lee Valley", "https://www.leevalley.com/en-ca/shop/tools/hand-tools/clamps/bar/110648-bessey-k-body-revo-clamps-model-kre?item=17F7340", "Bessey K Body REVO Clamp (Model KRE), 40\" length, item 17F7340; the price shows once the 40\" length is picked, which this link does. Stock shown as 'Online: Limited'", 8500, "LENGTH: 12\" 18\" 24\" 31\" 40\" 50\" 60\" 82\" 98\" $85.00", "A person saw this price too: DotAmi's maintainer opened this page in their own browser on 2026-10-29 and saw $85, with the item line “Item 17F7340, Bessey 40\" K Body REVO Clamp”. A tool's check on 2026-10-27 met a bot check, which was not bypassed."),
    ],
  },
  {
    id: "air-compressor",
    item: "Air compressor (60-gallon stationary, 240 V single-phase)",
    official: {
      mention:
        "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, G \"Pneumatic Tools and Fasteners\" (PDF p.17). The Red Seal standard lists compressors among pneumatic tools and equipment (PDF p.36).",
      url: ALBERTA_CURRICULUM,
      quote: "Demonstrate maintenance procedures for compressors and pneumatic powered equipment.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/flex-air-compressor-6-5hp-3cyl-60-gal-18-5cfm.html", "Flex Air Tools 6.5 HP 60 Gallon Air Compressor, FA-5160V2, 208/240 V single-phase. Sale price; regular $1,799.99", 159995, "Model Number: FA-5160V2 $1,599.95 $1,799.99 You save $200.04", "The page doesn't say whether 6.5 HP is peak or running; at 23 A it is at the top of the single-phase range."),
      p("Princess Auto", "https://www.princessauto.com/en/product/60-gallon-stationary-electric-air-compressor/PA0009563727/9563727", "DEWALT 60 Gallon Stationary Electric Air Compressor, SKU 9563727, 230 V, 3.7 peak HP, vertical tank", 134999, "Shop All Products by DEWALT $1,349.99 Add to Cart"),
      p("Federated Tool Supply", "https://federatedtool.com/king-canada-kc-6160v3-stationary-6-5-peak-hp-60-gallon-air-compressor/", "King Canada KC-6160V3 Stationary 6.5 Peak HP 60 Gallon Air Compressor, 208/240 V single-phase", 119900, "Write a Review $1,199.00 Weight: 270.00 LBS", "The page's title says KC-6160V3 and its SKU line says KINKC-6160V2: the page itself disagrees on the model."),
    ],
  },
  {
    id: "mitre-saw",
    item: "Mitre saw (10-12-inch sliding compound, corded)",
    official: {
      mention: "Alberta Cabinetmaker Curriculum Guide 0361 (2022), First Period, Section Two, F \"Portable Power Tools\", item 2 (PDF p.17). The Red Seal standard lists mitre saws among portable power tools (PDF p.36).",
      url: ALBERTA_CURRICULUM,
      quote: "portable power saws, including circular, jig (sabre), reciprocating and mitre saws.",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/dewalt-12-inch-dual-bevel-sliding-compound-mitre-saw.html", "DeWalt DWS779 12\" Dual Bevel Sliding Compound Mitre Saw, at MAP", 69900, "Model Number: DWS779 MAP $699.00"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/makita-10in-dual-sliding-compound-miter", "Makita LS1019L 10\" dual sliding compound mitre saw", 89900, "MAKITA 10\" DUAL SLIDING COMPOUND MITER In Stock Online $899.00"),
      p("Federated Tool Supply", "https://federatedtool.com/makita-ls1019-10-sliding-compound-mitre-saw/", "Makita LS1019 10\" Sliding Compound Mitre Saw", 79900, "Write a Review $799.00 Weight: 75.00 LBS"),
      p("Canadian Woodworker", "https://www.canadianwoodworker.com/product/bosch-12-axial-glide-compound-miter-saw-corded/", "Bosch 12\" Axial Glide Compound Miter Saw, corded. Sale price; original $849.95", 79995, "Original price was: $849.95. $ 799.95 Current price is: $799.95."),
    ],
  },
  {
    id: "hvlp-spray",
    item: "HVLP spray system (2-stage turbine)",
    official: {
      mention:
        "Red Seal Occupational Standard, Cabinetmaker (2021), PDF p.41. The Alberta curriculum also covers spray equipment: Second Period, Section Four (Wood Finishing), C \"Application of Finishing Materials\" (PDF p.24).",
      url: RED_SEAL,
      quote: "spray systems include: high volume low pressure (HVLP), airless, low volume low pressure (LVLP)",
    },
    prices: [
      p("KMS Tools", "https://www.kmstools.com/fuji-spray-semi-pro-2-hvlp-spray-system.html", "Fuji Spray Semi-PRO 2 HVLP Spray System, model 2202", 67900, "Model Number: 2202 $679.00 In Stock Online"),
      p("Busy Bee Tools", "https://www.busybeetools.com/products/semi-pro-2-stage-system-fuji", "Fuji Spray Semi-PRO 2-stage system, SKU 2202. Back-ordered", 67900, "This item will ship once back in stock $679.00"),
      p("ARDEC", "https://ardec.ca/en/p/489/hobby-pro-2-hvlp-system", "Fuji Spray Hobby-PRO 2 HVLP System, SKU 2250, 1400 W 2-stage turbine, made in Canada", 67900, "Usually ships within 4 to 6 business days $679.00 Free Delivery on orders over $90", "Fuji's own page calls this its DIY series, not the Semi-PRO 2 the other two sellers list; the price is the same, so the average is not moved."),
    ],
  },
];

// ---- Software ------------------------------------------------------------------------------------------

const s = (
  category: SoftwarePlan["category"],
  product: string,
  plan: string,
  url: string,
  priceCents: number,
  per: SoftwarePlan["per"],
  note: string,
  quote: string,
): SoftwarePlan => ({ category, product, plan, url, priceCents, per, note, quote, seenOn: SEEN });

const SKETCHUP = "https://sketchup.trimble.com/en/plans-and-pricing";
const FUSION = "https://www.autodesk.com/ca-en/products/fusion-360/overview";
const FUSION_PERSONAL = "https://www.autodesk.com/ca-en/products/fusion-360/personal";
const QUICKBOOKS = "https://quickbooks.intuit.com/ca/pricing/";
const XERO = "https://www.xero.com/ca/pricing-plans/";
const FRESHBOOKS = "https://www.freshbooks.com/en-ca/pricing";
const WAVE = "https://www.waveapps.com/pricing";

const software: SoftwarePlan[] = [
  // SketchUp prints its annual plans by the month; they are billed once a year, so they stay out of the
  // month-to-month average, the same as Fusion's annual plan.
  s("design", "SketchUp (Trimble)", "Go, annual", SKETCHUP, 1508, "month-billed-yearly", "A monthly figure for a plan billed once a year, with '$ CAD' picked in the page's currency menu; tax excluded. Not in the average of plans billed month to month. Go runs on iPad and the web only, with no desktop modeler.", "Go Annual $15.08 CAD per month / per user / billed annually"),
  s("design", "SketchUp (Trimble)", "Pro, annual", SKETCHUP, 4658, "month-billed-yearly", "A monthly figure for a plan billed once a year; tax excluded. Not in the average of plans billed month to month. Includes the desktop modeler and LayOut 2D drawings.", "Pro Annual $46.58 CAD per month / per user / billed annually"),
  s("design", "SketchUp (Trimble)", "Go, monthly", SKETCHUP, 2899, "month", "Billed month to month; tax excluded.", "Go Monthly $28.99 CAD per user / monthly"),
  s("design", "SketchUp (Trimble)", "Pro, monthly", SKETCHUP, 13999, "month", "Billed month to month; tax excluded.", "Pro Monthly $139.99 CAD per user / monthly"),
  s("design", "SketchUp (Trimble)", "SketchUp Free (web)", "https://sketchup.trimble.com/en/plans-and-pricing/sketchup-free", 0, "free", "Browser only. Whether a business may use it was not checked.", "SketchUp Free is the simplest free 3D modeling software on the web"),
  s("design", "Autodesk Fusion", "Annual", FUSION, 94000, "year", "Autodesk Canada's store, in CA$; the same page also says CA$79/month, billed annually.", "CA$940/year for 1 user (pay annually)"),
  s("design", "Autodesk Fusion", "Monthly", FUSION_PERSONAL, 12000, "month", "Billed month to month, in CA$.", "CA$940 /YEAR (OR CA$120 /MONTH)"),
  s("design", "Autodesk Fusion", "Fusion for personal use", FUSION_PERSONAL, 0, "free", "Free, but not for a business: non-commercial projects only, and the page says it is not for company environments.", "For personal, non-commercial projects only. Limited to individuals generating less than $1,000 USD annually"),
  s("cut-lists", "CutList Optimizer", "Free", "https://www.cutlistoptimizer.com/", 0, "free", "Limited to 5 calculations a day and 5 saved items.", "Allowed calculations 5per day unlimited unlimited"),
  s("cut-lists", "MaxCut", "Community Edition", "https://maxcutsoftware.com/pricing-subscription-plans/", 0, "free", "A free Windows download with basic cut-list features.", "COMMUNITY EDITION FREE our gift to you FREE DOWNLOAD"),
  s("cut-lists", "optiCutter", "Free", "https://www.opticutter.com/", 0, "free", "Up to 5 stock sizes and 20 panel sizes.", "Free EUR 0 / forever"),
  s("bookkeeping", "QuickBooks Online Canada (Intuit)", "EasyStart", QUICKBOOKS, 3000, "month", "The regular price; a promotion showed $3/mo. In CAD (the page's own data says so); taxes not included.", "EasyStart Build your financial foundation Was $30 $3/mo Save 90% for 6 months*"),
  s("bookkeeping", "QuickBooks Online Canada (Intuit)", "Plus", QUICKBOOKS, 11000, "month", "The regular price; a promotion showed $11/mo. Up to 5 users; taxes not included.", "Plus Boost efficiency and profitability Was $110 $11/mo Save 90% for 6 months*"),
  s("bookkeeping", "QuickBooks Online Canada (Intuit)", "Lite (solo and freelance)", QUICKBOOKS, 2000, "month", "A 'starts at' regular price; a promotion showed $2/mo. Taxes not included.", "QuickBooks Lite starts at $20 $2/mo Invoices and payments"),
  s("bookkeeping", "Xero Canada", "Starter", XERO, 2500, "month", "Prices in Canadian dollars, taxes excluded; a promotion showed $5 a month. Limited to 20 invoices and 5 bills.", "Then $25 per month Good for sole traders, new businesses, and the self-employed"),
  s("bookkeeping", "Xero Canada", "Standard", XERO, 6000, "month", "Prices in Canadian dollars, taxes excluded; a promotion showed $12 a month.", "Then $60 per month Good for growing small businesses."),
  s("bookkeeping", "Xero Canada", "Premium", XERO, 8000, "month", "Prices in Canadian dollars, taxes excluded; a promotion showed $16 a month.", "Then $80 per month Good for established businesses."),
  s("bookkeeping", "FreshBooks Canada", "Lite", FRESHBOOKS, 2600, "month", "The regular price; a promotion showed $1.00 CAD/mo. Invoices up to 5 clients.", "$1.00 CAD/mo for one year Was $26.00 | Save $25.00"),
  s("bookkeeping", "FreshBooks Canada", "Plus", FRESHBOOKS, 4200, "month", "The regular price; a promotion showed $8.40 CAD/mo. Invoices up to 50 clients.", "80% Off for 3 Months Was $42.00 | Save $100.80"),
  s("bookkeeping", "FreshBooks Canada", "Premium", FRESHBOOKS, 7200, "month", "The regular price; a promotion showed $14.40 CAD/mo. Unlimited clients.", "80% Off for 3 Months Was $72.00 | Save $172.80"),
  s("bookkeeping", "Wave", "Starter", WAVE, 0, "free", "Unlimited estimates, invoices, bills and bookkeeping records; card payments are charged per transaction.", "This is the place. $0 Get started now"),
  s("bookkeeping", "Wave", "Pro, monthly", WAVE, 2500, "month", "The page shows $19 USD and $25 CAD a month; the CAD figure is used. Plus applicable taxes.", "$25 CAD/month Billed monthly Get started now"),
  s("bookkeeping", "Wave", "Pro, annual", WAVE, 25000, "year", "Shown beside $190 USD a year; the CAD figure is used.", "$250 CAD/year Billed annually Get started now"),
];

// ---- Statistics ----------------------------------------------------------------------------------------

const ALIS_WAGES = "https://alis.alberta.ca/occinfo/wages-and-salaries-in-alberta/cabinetmakers/72311/";
const ALIS_WAGES_SOURCE = "Government of Alberta, alis OCCinfo, 'Cabinetmakers: Wages and Salaries in Alberta'";
const ALIS_WSS = "2023 Alberta Wage and Salary Survey";
const ALIS_CAVEAT =
  "Employees only, at employers believed to have 8 or more employees, full-time and part-time; leaves out overtime, tips, benefits, profit shares and bonuses. Reliability A (high). What employees earn, not what a shop owner takes home.";
const JOB_BANK = "https://www.jobbank.gc.ca/marketreport/wages-occupation/16991/AB";
const JOB_BANK_SOURCE = "Government of Canada, Job Bank, 'Cabinetmaker in Alberta | Wages'";
const JOB_BANK_PERIOD = "Reference period 2023-2024; wages updated November 19, 2025";
const JOB_BANK_CAVEAT = "Hourly employee wages, from Employment Insurance Survey data. The page doesn't say which percentiles Low and High are.";
const ISED_33711_REV = "https://ised-isde.canada.ca/app/ixb/cis/performance/rev/33711";
const ISED_33711_PCT = "https://ised-isde.canada.ca/app/ixb/cis/performance/33711";
const ISED_33711_SOURCE = "Innovation, Science and Economic Development Canada, Canadian Industry Statistics, NAICS 33711 Wood kitchen cabinet and counter top manufacturing (Statistics Canada financial performance data)";
const ISED_33712_REV = "https://ised-isde.canada.ca/app/ixb/cis/performance/rev/33712";
const ISED_33712_SOURCE = "Innovation, Science and Economic Development Canada, Canadian Industry Statistics, NAICS 33712 Household and institutional furniture manufacturing";
// ISED's own address for the report (the old www.ic.gc.ca one only redirects here). The report is drawn
// through ISED's form in a session, so it opens in a browser, which keeps cookies; a tool that drops them
// gets ISED's "Error 500" page instead (seen 2026-10-14 after review).
const ISED_337123 = "https://ised-isde.canada.ca/app/ixb/fpd-dpf/profilestart?cd=337123&lang=eng";
const ISED_337123_LINK = "The link opens ISED's report through its own form, which needs the browser's cookies on; if it shows an error page, open it again.";
const ISED_337123_SOURCE = "Innovation, Science and Economic Development Canada, Financial Performance Data, NAICS 337123 Other wood household furniture manufacturing";
const ISED_PERIOD = "Data year 2024";
const ISED_SCOPE = "An average over existing small and medium businesses of every age with $30,000 to $5,000,000 of yearly revenue, across Canada, not a first-year figure.";
const CW_EDMONTON =
  "https://assets.cushmanwakefield.com/-/media/cw/marketbeat-pdfs/2026/q2/canada/edmonton_americas_industrial_marketbeat_q22026.pdf?rev=5ab4024d9fb8410b9e9691eae95ae8e4";
const CW_EDMONTON_SOURCE = "Cushman & Wakefield Edmonton Research, 'Edmonton Industrial Marketbeat Q2 2026'";
const CBRE_CALGARY = "https://mktgdocs.cbre.com/2299/caf96f5f-26c2-4177-97bd-b2616473d3fc-1472007596/Calgary_Industrial__Figures_Q2.pdf";
const CBRE_CALGARY_SOURCE = "CBRE Research, 'Calgary Industrial Figures Q2 2026' (PDF), Figure 6, row 'Calgary Total'";

const st = (x: Omit<Statistic, "seenOn">): Statistic => ({ ...x, seenOn: SEEN });

const statistics: Statistic[] = [
  // Earnings
  st({ id: "alis-yearly-average", group: "earnings", what: "Average yearly salary of employed cabinetmakers (NOC 72311) in Alberta, all industries", value: "$52,255.00", unit: "CAD per year", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "In Alberta, Cabinetmakers earn an average of $24.50/hour or $52,255.00/year.", caveat: `The page states this yearly figure itself; nothing is converted. ${ALIS_CAVEAT}`, amountCents: 5_225_500, inSentence: "the average yearly salary of employed cabinetmakers in Alberta (alis, Government of Alberta)" }),
  st({ id: "alis-hourly-average", group: "earnings", what: "Average hourly wage of employed cabinetmakers in Alberta, overall", value: "$24.50", unit: "CAD per hour", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "In Alberta, Cabinetmakers earn an average of $24.50/hour or $52,255.00/year.", caveat: ALIS_CAVEAT }),
  st({ id: "alis-hourly-median", group: "earnings", what: "Median hourly wage of employed cabinetmakers in Alberta, overall (low, the 5th percentile, $19.00; high, the 95th, $32.63)", value: "$24.00", unit: "CAD per hour", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "Overall $19.00 $32.63 $24.50 $24.00", caveat: ALIS_CAVEAT }),
  st({ id: "alis-hourly-starting", group: "earnings", what: "Average starting (entry-level) hourly wage of cabinetmakers in Alberta", value: "$19.89", unit: "CAD per hour", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "Starting $16.00 $27.00 $19.89 $18.00", caveat: "Pay offered for entry-level positions; not an apprentice rate." }),
  st({ id: "alis-hourly-top", group: "earnings", what: "Average hourly wage of the top-paid cabinetmakers in Alberta", value: "$31.63", unit: "CAD per hour", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "Top $22.00 $40.00 $31.63 $33.00", caveat: "The page's 'Top' pay: average pay offered to top-paid employees." }),
  st({ id: "alis-weekly-hours", group: "earnings", what: "Average weekly hours of cabinetmakers in Alberta", value: "40.9", unit: "hours per week", period: ALIS_WSS, source: ALIS_WAGES_SOURCE, url: ALIS_WAGES, quote: "Average Hours 40.9 Per Week", caveat: "The same employees as the wage figures." }),
  st({ id: "jobbank-ab-median", group: "earnings", what: "Median hourly wage for cabinetmakers in Alberta", value: "23.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Alberta 18.00 23.00 30.00", caveat: JOB_BANK_CAVEAT }),
  st({ id: "jobbank-ab-low", group: "earnings", what: "Low hourly wage for cabinetmakers in Alberta", value: "18.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Alberta 18.00 23.00 30.00", caveat: JOB_BANK_CAVEAT }),
  st({ id: "jobbank-ab-high", group: "earnings", what: "High hourly wage for cabinetmakers in Alberta", value: "30.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Alberta 18.00 23.00 30.00", caveat: JOB_BANK_CAVEAT }),
  st({ id: "jobbank-edmonton", group: "earnings", what: "Cabinetmaker hourly wages, Edmonton Region (low / median / high)", value: "18.00 / 23.00 / 29.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Edmonton Region 18.00 23.00 29.00", caveat: "Several other Alberta regions show n/a for data reasons, and the page points them to the provincial figure." }),
  st({ id: "jobbank-calgary", group: "earnings", what: "Cabinetmaker hourly wages, Calgary Region (low / median / high)", value: "18.00 / 23.00 / 30.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Calgary Region 18.00 23.00 30.00", caveat: JOB_BANK_CAVEAT }),
  st({ id: "jobbank-canada", group: "earnings", what: "Cabinetmaker hourly wages, Canada (low / median / high), for comparison", value: "19.00 / 24.00 / 31.00", unit: "CAD per hour", period: JOB_BANK_PERIOD, source: JOB_BANK_SOURCE, url: JOB_BANK, quote: "Canada 19.00 24.00 31.00", caveat: "A national row on the Alberta page." }),
  st({ id: "apprentice-period-2", group: "earnings", what: "The least a second-year (period 2) cabinetmaker apprentice in Alberta must be paid, as a share of the lowest-paid Cabinetmaker journeyperson's rate at the same company", value: "65%", unit: "percent of that journeyperson's rate", period: "The current trade profile (page footer (c) 2007-2026)", source: "Government of Alberta, Tradesecrets, 'Tradesecrets - Cabinetmaker', Wages (citing the AEITP Regulation)", url: "https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361/", quote: "Period 1: 55% Period 2: 65% Period 3: 75% Period 4: 85%", caveat: "A minimum percentage, not a dollar amount. The alis profile gives the same percentages and says apprentices provide their own tools." }),
  st({ id: "alis-employed", group: "earnings", what: "People employed as cabinetmakers (NOC 72311) in Alberta", value: "1,745", unit: "people", period: "2024-2026 Alberta Short-Term Employment Forecast", source: "Government of Alberta, alis OCCinfo, 'Cabinetmaker: Occupations in Alberta'", url: "https://alis.alberta.ca/occinfo/occupations-in-alberta/occupation-profiles/cabinetmaker/", quote: "1,745 Employed in AB", caveat: "The same section rates the job market 'Cool'; the profile says cabinetmakers are employed in custom shops or own their own business." }),
  // Industry. The first is shown beside Mara's numbers as context, never as one of them (the maintainer's
  // pick A, 2026-10-15; it was her what-if until then), so it carries its amount and a sentence's words.
  st({ id: "ised-33712-revenue", group: "industry", what: "Average yearly revenue of small and medium household and institutional furniture makers (NAICS 33712), Canada", value: "610.3", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33712_SOURCE, url: ISED_33712_REV, quote: "Total revenue 610.3 C 52.5 135.5 403.4 1,849.9 100.0", caveat: `NOT a first-year figure. ${ISED_SCOPE} 1,825 businesses. Revenue-quartile averages (thousands): 52.5, 135.5, 403.4 and 1,849.9. NAICS 33712 includes other wood household furniture along with upholstered, non-wood and institutional furniture.`, amountCents: 61_030_000, inSentence: "the average yearly revenue of small and medium household and institutional furniture makers in Canada (NAICS 33712, ISED)" }),
  st({ id: "ised-33712-profit", group: "industry", what: "Average net profit before income tax, NAICS 33712 small and medium businesses, Canada", value: "34.1", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33712_SOURCE, url: ISED_33712_REV, quote: "Net profit/loss 34.1 B 8.9 19.9 31.5 75.8 100.0", caveat: `${ISED_SCOPE} For an unincorporated business it includes the owners' salaries and withdrawals. 71.6% were profitable.` }),
  st({ id: "ised-33712-rent", group: "industry", what: "Average rent paid, NAICS 33712 small and medium businesses, Canada", value: "31.6", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33712_SOURCE, url: ISED_33712_REV, quote: "Rent 31.6 C 4.5 11.6 32.0 78.5 64.7", caveat: "Only 64.7% reported rent. Rent covers land, buildings, machinery and equipment, not shop space alone; 5.2% of revenue in the percentage view." }),
  st({ id: "ised-337123-margin", group: "industry", what: "Average net profit margin, other wood household furniture makers (NAICS 337123), Canada", value: "6.2", unit: "percent of revenue", period: ISED_PERIOD, source: ISED_337123_SOURCE, url: ISED_337123, quote: "Net profit/loss 6.2 B -15.7 3.7 16.1 46.3 100.0", caveat: `${ISED_SCOPE} 1,271 businesses; purchases, materials and sub-contracts are 42.6% of revenue in the same report. ${ISED_337123_LINK}` }),
  st({ id: "ised-337123-rent-share", group: "industry", what: "Rent as a share of revenue, NAICS 337123, Canada", value: "4.9", unit: "percent of revenue", period: ISED_PERIOD, source: ISED_337123_SOURCE, url: ISED_337123, quote: "Rent 4.9 C 7.9 4.1 4.2 3.0 64.4", caveat: `64.4% reported rent. ${ISED_337123_LINK}` }),
  st({ id: "ised-33711-revenue", group: "industry", what: "Average yearly revenue of small and medium wood kitchen cabinet and counter top makers (NAICS 33711), Canada", value: "747.5", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_REV, quote: "Total revenue 747.5 C 63.0 200.1 592.7 2,134.1 100.0", caveat: `NOT a first-year figure. ${ISED_SCOPE} 2,797 businesses. Revenue-quartile averages (thousands): 63.0, 200.1, 592.7 and 2,134.1.` }),
  st({ id: "ised-33711-profit", group: "industry", what: "Average net profit before income tax, NAICS 33711 small and medium businesses, Canada", value: "55.4", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_REV, quote: "Net profit/loss 55.4 C 8.1 21.6 40.5 151.4 100.0", caveat: `${ISED_SCOPE} For an unincorporated business it includes the owners' salaries and withdrawals.` }),
  st({ id: "ised-33711-non-profitable", group: "industry", what: "Share of NAICS 33711 small and medium businesses that were not profitable, Canada", value: "26.0", unit: "percent of businesses", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_REV, quote: "Non-Profitable Percentage of businesses (%) 26.0", caveat: "Not profitable: expenses more than revenue in the data year. Businesses of every age, not new ones." }),
  st({ id: "ised-33711-rent", group: "industry", what: "Average rent paid, NAICS 33711 small and medium businesses, Canada", value: "39.8", unit: "thousands of CAD per year, average per business", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_REV, quote: "Rent 39.8 C 5.1 17.8 42.4 93.8 68.6", caveat: "Only 68.6% reported rent. Rent covers land, buildings, machinery and equipment, not shop space alone." }),
  st({ id: "ised-33711-rent-share", group: "industry", what: "Rent as a share of revenue, NAICS 33711, Canada", value: "5.3", unit: "percent of revenue", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_PCT, quote: "Rent 5.3 C 7.9 5.7 3.9 3.1 68.6", caveat: "68.6% reported rent." }),
  st({ id: "ised-33711-materials-share", group: "industry", what: "Purchases, materials and sub-contracts as a share of revenue, NAICS 33711, Canada", value: "41.4", unit: "percent of revenue", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_PCT, quote: "Purchases, materials and sub-contracts 41.4 C 44.9 44.1 40.8 27.0 90.6", caveat: "The same view: cost of sales 57.2%, wages and benefits 15.4%, insurance 1.0%, advertising 0.8%, utilities and telephone 1.5% of revenue." }),
  st({ id: "ised-33711-margin", group: "industry", what: "Average net profit margin, NAICS 33711 small and medium businesses, Canada", value: "7.4", unit: "percent of revenue", period: ISED_PERIOD, source: ISED_33711_SOURCE, url: ISED_33711_PCT, quote: "Net profit/loss 7.4 C -11.8 3.7 14.0 38.3 100.0", caveat: "Profit-margin quartile averages: -11.8%, 3.7%, 14.0% and 38.3%." }),
  // Space
  st({ id: "cbre-calgary-net", group: "space", what: "Calgary industrial net asking rent, whole market", value: "$11.24", unit: "CAD per square foot, net asking", period: "Q2 2026", source: CBRE_CALGARY_SOURCE, url: CBRE_CALGARY, quote: "$11.24 PSF Net Asking Rate", caveat: "An asking rate, not signed leases; net, before taxes, maintenance and insurance. The report doesn't say per year or per month. Small-bay options under 10,000 sq. ft. fell 25.1% year over year, the same report says." }),
  st({ id: "cbre-calgary-tmi", group: "space", what: "Calgary industrial taxes, maintenance and insurance on top of net rent, whole market", value: "$5.04", unit: "CAD per square foot", period: "Q2 2026", source: CBRE_CALGARY_SOURCE, url: CBRE_CALGARY, quote: "4,843,981 $11.24 $5.04 $16.28", caveat: "The row's last three columns: net asking rent, TMI, gross asking rent." }),
  st({ id: "cbre-calgary-gross", group: "space", what: "Calgary industrial gross asking rent (net plus taxes, maintenance and insurance), whole market", value: "$16.28", unit: "CAD per square foot, gross asking", period: "Q2 2026", source: CBRE_CALGARY_SOURCE, url: CBRE_CALGARY, quote: "4,843,981 $11.24 $5.04 $16.28", caveat: "CBRE states the gross figure itself." }),
  st({ id: "cw-edmonton-net", group: "space", what: "Edmonton region industrial average net rent, all submarkets", value: "$11.72", unit: "CAD per square foot, net", period: "Q2 2026", source: CW_EDMONTON_SOURCE, url: CW_EDMONTON, quote: "average net rents increased 1.4% YOY to $11.72 psf in Q2 2026", caveat: "Net, before the additional costs (the report's AVG ADDITIONAL RATE, $4.99, listed below); it doesn't say per year or per month. The whole region, warehouses included. CBRE's national report says Edmonton rents rose 3.3% in Q3 2026, so this may now be low." }),
  st({ id: "cw-edmonton-additional", group: "space", what: "Edmonton region industrial average additional rate on top of net rent, all submarkets", value: "$4.99", unit: "CAD per square foot", period: "Q2 2026", source: CW_EDMONTON_SOURCE, url: CW_EDMONTON, quote: "EDMONTON TOTALS ... $11.72 $4.99 $16.71", caveat: "The MARKET STATISTICS table's row EDMONTON TOTALS, its last three columns: AVG NET RENTAL RATE, AVG ADDITIONAL RATE, AVG GROSS RATE. The report doesn't say what the additional rate covers." }),
  st({ id: "cw-edmonton-gross", group: "space", what: "Edmonton region industrial average gross rent (net plus the additional rate), all submarkets", value: "$16.71", unit: "CAD per square foot, gross", period: "Q2 2026", source: CW_EDMONTON_SOURCE, url: CW_EDMONTON, quote: "EDMONTON TOTALS ... $11.72 $4.99 $16.71", caveat: "Cushman & Wakefield states the gross figure itself, in the same row." }),
  st({ id: "cw-edmonton-nw", group: "space", what: "Edmonton Northwest/Central industrial submarket average net rent", value: "$10.13", unit: "CAD per square foot, net", period: "Q2 2026", source: CW_EDMONTON_SOURCE, url: CW_EDMONTON, quote: "8.4% YOY, to $10.13 per square foot", caveat: "One submarket only." }),
  st({ id: "cbre-edmonton-deals", group: "space", what: "Share of Edmonton industrial lease deals of 25,000 sq. ft. and under", value: "91.2", unit: "percent of the deal count", period: "Q2 2026", source: "CBRE Research, 'Edmonton Industrial Figures Q2 2026'", url: "https://www.cbre.com/insights/figures/edmonton-industrial-figures-q2-2026", quote: "Transactions of 25,000 sq. ft. and under accounted for 91.2% of total deal count", caveat: "A count of deals, not a typical workshop size." }),
  st({ id: "cbre-canada-net", group: "space", what: "Canada industrial net asking rent, for comparison", value: "$14.77", unit: "CAD per square foot, net asking", period: "Q3 2026", source: "CBRE Research, 'Canada Industrial Figures Q3 2026'", url: "https://www.cbre.com/insights/figures/canada-industrial-figures-q3-2026", quote: "decreased 2.4% year-over-year to $14.77 per sq. ft. in Q3 2026", caveat: "National, not Alberta." }),
];

// ---- What stayed blank, and what was seen but not used ------------------------------------------------

const notPriced = [
  { what: "Mara's savings", why: "Nothing real can supply one person's savings: Statistics Canada publishes household totals and averages, which can't set an individual's. Left blank on purpose." },
  { what: "Shop space deposit", why: "No official or reputable source was found for a typical industrial lease deposit in Alberta. The rents per square foot below are context, not a deposit." },
  { what: "Design or CAD software (a cost line on Open your own shop)", why: "The plans are monthly or yearly subscriptions and the cost line is one amount; picking a plan would be choosing for her. The plans are listed under Software." },
  { what: "Insurance, vehicle, first materials, legal advice on the business form, money to live on while starting (the other cost lines on Open your own shop)", why: "Not researched in this pass." },
  { what: "First-year sales of a new small furniture or cabinet shop", why: "No official Canadian source was found. Mara's what-if is the industry's average yearly revenue instead, labelled as that." },
  { what: "Income of a self-employed cabinetmaker or shop owner", why: "No official figure was found. Mara's yearly income goal is what employed cabinetmakers average, labelled as that." },
  { what: "A typical small workshop's size", why: "No official or Canadian source was found, so a rent per square foot can't become a monthly rent." },
  { what: "Alberta-only industry figures", why: "ISED's app has an Alberta view only behind its own form, which was not submitted; the figures here are for Canada. A person can pick Alberta at https://ised-isde.canada.ca/app/ixb/fpd-dpf/profilestart?lang=eng." },
  { what: "Hand tools (measuring and layout tools, hand planes, scrapers, chisels, gouges, knives, hand drills and saws)", why: "Named in the Alberta curriculum, but dozens of small items with no single shop-grade model to compare." },
  { what: "Shaper, mortiser, plate (biscuit) joiner, brad nailers and staplers, wood lathe, stationary sanders", why: "Named in NOC 72311 or the curriculum, but not among the twelve tools picked for this example." },
  { what: "Panel saw, CNC router, edge bander, wide-belt sander", why: "Named in the curriculum and the Red Seal standard, but production equipment, outside the mid-range class for a one-person start." },
];

const leftOut = [
  { what: "Home Depot Canada, RONA, Home Hardware, Canadian Tire", why: "Their pages refused the request, showed a bot check that was not bypassed, or showed no price; none was used." },
  { what: "Mozaik (cabinet design and cut lists)", why: "Its plans are priced in US dollars, so they are not averaged with Canadian prices." },
  { what: "Paid plans of CutList Optimizer, MaxCut, CutList Plus fx and optiCutter", why: "Priced in US dollars, in euros, or with no currency stated by a US seller, so they are not averaged with Canadian prices; their free tiers are listed." },
  { what: "Portable 20-gallon compressors", why: "Only two of the sellers list that class; the 60-gallon class, with three, is priced instead." },
  { what: "An Edmonton industrial rent from Colliers, and one from CBRE's Edmonton report", why: "The Colliers figure was from a trade-press summary, not a Colliers page; CBRE's Edmonton PDF has no readable rent figure." },
  { what: "A Cabinet Makers Association benchmark survey", why: "Mostly US, and its page refused the request, so it could not be checked." },
];

/**
 * Mara's sources, as seen on 2026-10-14. The tools are in the order the Alberta curriculum's first period
 * teaches them (stationary machines, then portable tools, then the shop's own equipment), never by price.
 */
export const MARA_SOURCES: ExampleSources = {
  seenOn: SEEN,
  tier:
    "Mid-range, shop-grade, picked for this example: stationary, cast-iron, single-phase (120/240 V) machines and pro-brand corded tools, priced new. Benchtop, jobsite and cordless tools are left out, and so are industrial machines (3-phase, or 5 HP and up). Each tool is the same class at every seller. Each price is the listed online price in Canadian dollars on 2026-10-14, before GST and shipping; a sale, clearance or back-order is said beside it.",
  officialSources: [
    { label: "Alberta Advanced Education, Cabinetmaker Curriculum Guide 0361 (2022), on Tradesecrets", url: ALBERTA_CURRICULUM },
    { label: "Red Seal Occupational Standard - Cabinetmaker (CCDA/ESDC, 2021)", url: RED_SEAL },
    { label: "National Occupational Classification 2021, unit group 72311 Cabinetmakers", url: NOC },
  ],
  tools,
  softwareCategories: [
    { id: "design", label: "Design and drawing" },
    { id: "cut-lists", label: "Cut lists and sheet layout" },
    { id: "bookkeeping", label: "Bookkeeping and invoicing" },
  ],
  software,
  statistics,
  notPriced,
  leftOut,
};
