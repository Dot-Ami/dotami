/**
 * Call 35 of 2026-10-22 (an Alberta future picked from outside Alberta is an honest ending while both labels
 * stay on screen) is checked by the idea harness on its model of the card (tests/helpers/idea-invariants.ts
 * `honestAlbertaPick`). This test closes the gap between that model and the screen: it draws the card the
 * person clicked with the component Pick a future draws (components/front-door/future-card.tsx), its job line
 * from the same function the screen uses (`cardJobLine`), and finds every label the harness read for it in what
 * the component drew: *Written for Alberta.*, *You said Ontario.* and, with a pick of job, the card's job line.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FutureCardItem } from "@/components/front-door/future-card";
import { roadsV2026, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { futureCards } from "@/lib/front-door/futures";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { cardJobLine } from "@/lib/front-door/road-match";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { pickedChoice, runIdea, stepsChoice } from "./helpers/idea-pipeline";

const idea = (id: string) => IDEAS_V1.find((i) => i.id === id)!;

/** The text a person reads in the drawn markup: tags dropped, the entities React writes turned back. */
function shownText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

describe("the card an Alberta future is picked from outside Alberta says what the harness reads (call 35)", () => {
  // Ontario: a job with no road of its own (idea 0022, road 0's card) and a skipped job (idea 0361, road 1's card).
  for (const id of ["idea-v1-0022", "idea-v1-0361"]) {
    it(`${id}: every label the harness read on the clicked card is in the component's output`, () => {
      const target = idea(id);
      const province = target.place as Province;
      const steps = stepsChoice(target, "picked");
      const pick = pickedChoice(target);
      expect(pick?.by).toBe("card");
      const road = roadsV2026.find((r) => r.id === pick?.roadId)!;
      expect(road.provinces).toEqual(["AB"]);
      expect(province).not.toBe("AB");

      const card = futureCards([road], skillItemsV2026, province)[0]!;
      const jobLine = cardJobLine(road, steps.job, steps.match, roadJobNames([road]));
      const html = renderToStaticMarkup(
        createElement(FutureCardItem, {
          card,
          personPlace: province,
          personPlaceLabel: PROVINCE_LABELS[province],
          jobLine,
          opening: null,
          onLookInside: () => {},
        }),
      );
      const text = shownText(html);

      const at = `picked › steps › road › card ${road.id}`;
      const read = runIdea(target, { probeQuestions: false }).pieces.filter((p) =>
        [`${at} › written for`, `${at} › you said`, `${at} › job line`].includes(p.where),
      );
      // Written for and You said always; the job line only with a pick of job (none after Skip).
      expect(read.map((p) => p.where.split(" › ").pop())).toEqual(steps.job ? ["written for", "you said", "job line"] : ["written for", "you said"]);
      for (const piece of read) expect(text).toContain(piece.text);
      if (steps.job) expect(jobLine).toBeTruthy();
      else expect(jobLine).toBeNull();
    });
  }
});
