import { describe, expect, it } from "vitest";

import { situationWordsIn } from "@/lib/front-door/situation-words";
import { pickWords } from "@/lib/front-door/words";

import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";

/**
 * The words Pick a future quotes back from the sentence a person typed (lib/front-door/situation-words.ts; the
 * maintainer's pick s1 D of 2026-11-11). Two ways to get it wrong, and the second is the worse one: missing a
 * person who wrote about closing (they are told nothing, as before), and quoting words that weren't about their
 * own business, which reads as DotAmi knowing something it was never told.
 */
describe("the person's own words about closing, pausing, selling or being behind", () => {
  it("quotes the words as typed, the first in the sentence", () => {
    const quoted: [string, string][] = [
      ["closing my retail store in Calgary and want to know what to file", "closing"],
      ["I want to close my online store properly", "close"],
      ["I think I want to take it and close the agency properly", "close"],
      ["We CLOSED DOWN our bakery last spring", "CLOSED DOWN"],
      ["we closed up shop in March", "closed up shop"],
      ["winding down my trucking corporation in Red Deer, selling the trucks", "winding down"],
      ["winding up the family corporation after dad retired", "winding up"],
      ["dissolving our partnership", "dissolving"],
      ["shutting down my placer mining claim in the Yukon", "shutting down"],
      ["the restaurant lost money so I shut it down", "shut it down"],
      ["pausing production at my small furniture manufacturing shop in Edmonton", "pausing"],
      ["putting my catering business on hold while I'm on leave", "putting my catering business on hold"],
      ["I'm selling the company I built over 20 years in Calgary", "selling"],
      ["sold my shop and want to know what happens with GST", "sold"],
      ["farmer near Yorkton, I'm behind on everything, GST, books, all of it", "behind on"],
      ["outfitter in the Northwest Territories, two years behind on filings", "behind on"],
      ["catching up on my GST returns for my cleaning business", "catching up on"],
      ["I never registered for GST even though I passed $30,000 last year", "never registered"],
      ["online store in Halifax, I never charged HST", "never charged"],
      ["I hired two people at my restaurant in Winnipeg and never set up payroll", "never set up payroll"],
      ["restaurant in Summerside, haven't filed HST in a year", "haven't filed"],
      ["my holdco in Calgary hasn’t filed for two years", "hasn’t filed"],
      ["B&B in Twillingate, haven't done taxes since I opened", "haven't done"],
      ["welder in Fort McMurray, made 50k on the side and didn't report it", "didn't report"],
      ["Uber driver in Surrey, I didn't know I had to register for GST from day one", "didn't know I had to register"],
      ["trucker in Grande Prairie, three years of returns not filed", "not filed"],
      // The first words in the sentence win, wherever their rule sits in the list.
      ["I never filed, and now I'm closing my shop", "never filed"],
      // Typed over two lines: quoted with one space.
      ["I am winding\n   down my studio", "winding down"],
    ];
    for (const [sentence, words] of quoted) expect(situationWordsIn(sentence), sentence).toBe(words);
  });

  it("quotes nothing where the same words are about something else", () => {
    const notAboutIt = [
      // Two test ideas a first, loose list quoted (2026-11-10): near a threshold, and a job that is finished.
      "I'm a self-employed plumber in Calgary, been running for a year, revenue is getting close to the GST line",
      "the app builds the parts list and writes the invoice when the job is closed",
      // Closing things that aren't the business.
      "closing my books for the year takes me a week",
      "we are closing our seed round next month",
      "I close the deal and then invoice the client",
      "closing costs on my rental property in Kelowna",
      "my bank closed my account",
      // Winding down, pausing and shutting down that aren't about the business.
      "I make candles to wind down after work and want to sell them",
      "I always wind up working weekends at my salon",
      "paused my subscription to the accounting software",
      "the mine I worked at shut down, so I want my own welding rig",
      // Selling what the business sells, not the business.
      "sell my carvings online from Iqaluit",
      "I bottle my hot sauce and sell it to stores in Edmonton",
      "selling our company merch at markets",
      "I want to sell my shop's leftover stock online",
      "selling my farm produce at the Saturday market",
      // Behind on, or never did, something that isn't a filing.
      "I'm behind on orders for my Etsy shop",
      "behind on rent for my studio",
      "I never claimed to be an expert, but I can fix bikes",
      "I never reported to a boss and want to keep it that way",
      "I never charged friends for haircuts, now I want to",
      "I never finished my apprenticeship",
      "I haven't done this before",
      "the name didn't register to me as taken",
      // Moving and starting are not closing.
      "moving my plumbing business from Ontario to Alberta next year",
      "retiring to PEI and want a small gift shop",
      "",
      "   ",
    ];
    for (const sentence of notAboutIt) expect(situationWordsIn(sentence), sentence).toBeNull();
    expect(situationWordsIn(null)).toBeNull();
    expect(situationWordsIn(undefined)).toBeNull();
  });

  it("is quoted from the test ideas only where the idea is about closing, pausing, selling or being behind", () => {
    const elsewhere = IDEAS_V1.filter((idea) => idea.people !== "moves-pauses-closes" && idea.people !== "already-behind")
      .map((idea) => ({ id: idea.id, words: situationWordsIn(idea.words) }))
      .filter((found) => found.words !== null);
    expect(elsewhere).toEqual([]);
  });

  it("misses three of the 33 test ideas no road is written for, and may only miss fewer", () => {
    // The corpus's closing, pausing, selling and catch-up ideas with a place, a business and no road written for them.
    const the33 = IDEAS_V1.filter(
      (idea) =>
        (idea.people === "moves-pauses-closes" || idea.people === "already-behind") &&
        idea.road === "none-written-yet" &&
        idea.lookingFor !== "career" &&
        idea.place !== "not-said",
    );
    expect(the33).toHaveLength(33);
    const missed = the33.filter((idea) => situationWordsIn(idea.words) === null).map((idea) => Number(idea.id.slice(-4)));
    // 189: moving to another territory, which the sentence on screen doesn't name. 203: typed in French, and the list
    // is English only. 252: an unlicensed daycare, which DotAmi must not quote back as being behind.
    expect(missed).toEqual([189, 203, 252]);
  });

  it("the quoted line holds no verdict and no time, whatever the list quotes", () => {
    for (const idea of IDEAS_V1) {
      const words = situationWordsIn(idea.words);
      if (!words) continue;
      const line = pickWords.youWrote(words);
      expect(findVerdicts(line), line).toEqual([]);
      expect(findTimeWords(line, []), line).toEqual([]);
      // The person's words are quoted once, and the sentence about what isn't written follows, said once.
      expect(line).toBe(`You wrote “${words}”. ${pickWords.skippedNoneFor}`);
    }
  });
});
