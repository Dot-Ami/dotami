/**
 * Where every amount comes from (S2.5.29c, tests/helpers/number-provenance.ts): an official fee, the
 * person's own number, a threshold a citation quotes, or a sum of those; and, for *About this job* (29i), a
 * wage the government publishes, on the wage row that shows it with its source code, level and period. Each
 * kind of source is shown to pass, and the controls show an amount from nowhere fails, and a wage anywhere
 * but its own row (in a cost, a total or a gauge) fails too.
 */
import { describe, expect, it } from "vitest";

import { officialFeesV2026 } from "@/lib/engines/fees/v2026";

import {
  amountsIn,
  officialFeeAmounts,
  provenanceOf,
  quotedOfficialAmounts,
  uncitedAmounts,
  wageLevelOf,
  wageRowProblems,
  WAGE_ROW_PLACE,
  type AmountLedger,
  type PublishedWageRow,
} from "./helpers/number-provenance";

const fee = (id: string) => officialFeesV2026.find((f) => f.id === id)!.amountCents;

/** A run's ledger: the official fees, two fees on its road, and the person's savings, quote and yearly income. */
const ledger: AmountLedger = {
  officialFees: officialFeeAmounts(),
  yours: [800_000, 185_000, 6_000_000],
  quotedThresholds: quotedOfficialAmounts(),
  addable: [fee("fee-ab-apprenticeship-application"), fee("fee-ab-cabinetmaker-practical-exam"), 185_000],
  publishedWageRows: [],
};

describe("amountsIn", () => {
  it("reads every dollar amount as the formatter writes it, with cents and a minus", () => {
    expect(amountsIn("$150 official fees, then $1,250.50 and -$1,200. Over $30,000.")).toEqual([
      { cents: 15_000, written: "$150" },
      { cents: 125_050, written: "$1,250.50" },
      { cents: -120_000, written: "-$1,200" },
      { cents: 3_000_000, written: "$30,000" },
    ]);
  });

  it("reads no amount where there is none", () => {
    expect(amountsIn("4 periods, 1,360 hours, 50k a year")).toEqual([]);
  });
});

describe("provenanceOf", () => {
  it("knows an official fee from the fees catalog", () => {
    expect(provenanceOf(fee("fee-ab-apprenticeship-application"), ledger)).toBe("official-fee");
  });

  it("knows the person's own number", () => {
    expect(provenanceOf(800_000, ledger)).toBe("yours");
  });

  it("knows the CRA's $30,000, which a citation quotes from its page", () => {
    expect(quotedOfficialAmounts()).toContain(3_000_000);
    expect(provenanceOf(3_000_000, ledger)).toBe("quoted-threshold");
  });

  it("knows a sum of official fees and the person's quote", () => {
    const sum = fee("fee-ab-apprenticeship-application") + fee("fee-ab-cabinetmaker-practical-exam") + 185_000;
    expect(provenanceOf(sum, ledger)).toBe("sum");
  });

  it("knows the person's savings minus such a sum (the money gauge's difference)", () => {
    const difference = 800_000 - (fee("fee-ab-apprenticeship-application") + 185_000);
    expect(provenanceOf(difference, ledger)).toBe("difference");
  });

  it("control: an amount from nowhere has no source", () => {
    expect(provenanceOf(432_100, ledger)).toBeNull();
    // A sum needs two lines: one fee plus a number nobody gave is still from nowhere.
    expect(provenanceOf(fee("fee-ab-apprenticeship-application") + 1_00, ledger)).toBeNull();
  });
});

describe("uncitedAmounts", () => {
  it("passes a plan's lines whose amounts all have a source", () => {
    expect(
      uncitedAmounts(
        [
          { where: "gauge", text: `$310 official fees (2 lines) · $1,850 your numbers (1 line)` },
          { where: "rule", text: "taxable supplies over $30,000 in a single calendar quarter" },
        ],
        ledger,
      ),
    ).toEqual([]);
  });

  it("control: names an amount DotAmi made up, and where it is", () => {
    expect(uncitedAmounts([{ where: "plan › money", text: "Typical start-up cost: $4,321" }], ledger)).toEqual([
      "plan › money: $4,321 in “Typical start-up cost: $4,321”",
    ]);
  });
});

// Real rows of Job Bank's 2025 wage file, as research 25s read them on 2026-10-20 (docs/ui-spec/cockpit/
// about-this-job.md, row 2's examples): figures in cents, hourly.
const cabinetmakersCalgary: PublishedWageRow = {
  noc: "72311",
  regionCode: "ER4830",
  sourceCode: "EI 2023-24 ER NOC5",
  level: "economic-region",
  period: "2023-2024",
  per: "hour",
  lowCents: 1_800,
  medianCents: 2_300,
  highCents: 3_000,
};
// Shown under Calgary, but its code says it is an Alberta-wide figure.
const hairstylistsCalgary: PublishedWageRow = {
  noc: "63210",
  regionCode: "ER4830",
  sourceCode: "LFS 2023-24 PR NOC5",
  level: "province",
  period: "2023-2024",
  per: "hour",
  lowCents: 1_500,
  medianCents: 1_923,
  highCents: 2_600,
};
const withWages: AmountLedger = { ...ledger, publishedWageRows: [cabinetmakersCalgary, hairstylistsCalgary] };
const wageLine = "Hourly · low $18.00 · median $23.00 · high $30.00";
const onTheRow = `picked › ${WAGE_ROW_PLACE} › figures`;

describe("a published job fact: a wage the government publishes", () => {
  it("reads the geography level from the row's source code, never from its region's name", () => {
    expect(wageLevelOf("EI 2023-24 ER NOC5")).toBe("economic-region");
    expect(wageLevelOf("SAE 2024 ER NOC5")).toBe("small-area");
    expect(wageLevelOf("LFS 2023-24 PR NOC5")).toBe("province");
    expect(wageLevelOf("JUDGE PR 2024 NOC5")).toBe("province");
    expect(wageLevelOf("LFS 2023-24 CAN NOC5")).toBe("canada");
    for (const code of ["CIHI 2023-24", "JUDGE 2024", "Yukon 2023-24", "LFS 2023-24 ATL NOC5"]) expect(wageLevelOf(code), code).toBe("not-stated");
    // A row with no figures has no source at all.
    expect(wageLevelOf("N/A")).toBeNull();
    expect(wageLevelOf("")).toBeNull();
  });

  it("passes a wage on About this job's wage row that shows its row, with its source code, level and period", () => {
    expect(wageRowProblems(cabinetmakersCalgary)).toEqual([]);
    expect(provenanceOf(2_300, withWages, { where: onTheRow, text: wageLine, wageRow: cabinetmakersCalgary })).toBe("published-job-fact");
    expect(uncitedAmounts([{ where: onTheRow, text: wageLine, wageRow: cabinetmakersCalgary }], withWages)).toEqual([]);
    // The province's row shown under Calgary, labelled by its own code: its figures, with cents, pass too.
    const hair = "Hourly · low $15.00 · median $19.23 · high $26.00";
    expect(uncitedAmounts([{ where: onTheRow, text: hair, wageRow: hairstylistsCalgary }], withWages)).toEqual([]);
  });

  it("control: the same wage line shown without its row has no source", () => {
    expect(uncitedAmounts([{ where: onTheRow, text: wageLine }], withWages)).toEqual([
      `${onTheRow}: $18.00 in “${wageLine}”`,
      `${onTheRow}: $23.00 in “${wageLine}”`,
      `${onTheRow}: $30.00 in “${wageLine}”`,
    ]);
  });

  it("control: a row without its source code, with a level its code doesn't give, or without its period, cites nothing", () => {
    const rows: [string, PublishedWageRow][] = [
      ["no source code", { ...cabinetmakersCalgary, sourceCode: "N/A" }],
      // The Calgary label on a row whose code says Alberta-wide: the screen would say the wrong area.
      ["the wrong level", { ...hairstylistsCalgary, level: "economic-region" }],
      ["no period", { ...cabinetmakersCalgary, period: "NA" }],
    ];
    for (const [what, row] of rows) {
      expect(wageRowProblems(row), what).toHaveLength(1);
      const ledgerWithIt: AmountLedger = { ...ledger, publishedWageRows: [row] };
      const text = `median $${(row.medianCents! / 100).toFixed(2)}`;
      expect(uncitedAmounts([{ where: onTheRow, text, wageRow: row }], ledgerWithIt), what).toHaveLength(1);
    }
  });

  it("control: a row the run never read from the wage file (figures made up in the screen's code) cites nothing", () => {
    const madeUp = { ...cabinetmakersCalgary, medianCents: 2_500 };
    expect(uncitedAmounts([{ where: onTheRow, text: "median $25.00", wageRow: madeUp }], withWages)).toHaveLength(1);
  });

  it("control: a wage added into a cost, a total or a gauge has no source", () => {
    const application = fee("fee-ab-apprenticeship-application");
    const pieces = [
      // A cost line that took the median wage as a cost: not the wage row's place, even with the row on it.
      { where: "picked › plan › money › a planted line", text: "Your time: $23.00", wageRow: cabinetmakersCalgary },
      // A total that adds the wage to an official fee: a wage is never a line a sum adds up.
      { where: onTheRow, text: `Fee plus a day's median: $${((application + 2_300) / 100).toFixed(2)}`, wageRow: cabinetmakersCalgary },
      // The money gauge counting a wage as the person's number.
      { where: "picked › gauges › money", text: "$23.00 your numbers (1 line)" },
      // A yearly figure turned into income on a gauge.
      { where: "picked › gauges › income", text: "$47,840 a year at the median" },
    ];
    expect(uncitedAmounts(pieces, withWages)).toHaveLength(4);
  });
});
