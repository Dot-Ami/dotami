/**
 * Where every amount comes from (S2.5.29c, tests/helpers/number-provenance.ts): an official fee, the
 * person's own number, a threshold a citation quotes, or a sum of those. Each kind of source is shown to
 * pass, and the controls show an amount from nowhere fails.
 */
import { describe, expect, it } from "vitest";

import { officialFeesV2026 } from "@/lib/engines/fees/v2026";

import {
  amountsIn,
  officialFeeAmounts,
  provenanceOf,
  quotedOfficialAmounts,
  uncitedAmounts,
  type AmountLedger,
} from "./helpers/number-provenance";

const fee = (id: string) => officialFeesV2026.find((f) => f.id === id)!.amountCents;

/** A run's ledger: the official fees, two fees on its road, and the person's savings, quote and yearly income. */
const ledger: AmountLedger = {
  officialFees: officialFeeAmounts(),
  yours: [800_000, 185_000, 6_000_000],
  quotedThresholds: quotedOfficialAmounts(),
  addable: [fee("fee-ab-apprenticeship-application"), fee("fee-ab-cabinetmaker-practical-exam"), 185_000],
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
