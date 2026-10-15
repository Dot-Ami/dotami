/**
 * Words that would turn the example's information into a verdict or an unsourced judgement (CLAUDE.md,
 * "Information and options, never a verdict"; docs/ui-spec/example/_index.md). Shared by the unit test
 * (tests/example-sources.spec.ts, over the words, the data and the example's components) and the browser
 * test (e2e/example-future.spec.ts, over the rendered banner, goal bar, what-if bar and panel), so the two
 * never drift apart.
 *
 * Widened 2026-10-14 after review: "great value, a must-have" and "our top choice" passed the first list.
 * Bare "pick" and "must" are left out on purpose: the cockpit says "Mara's pick of job" and a statistic says
 * an apprentice "must be paid", neither a verdict. tests/example-sources.spec.ts has a control for every
 * word here, and one for each ordinary phrase that must not match.
 */
export const VERDICT =
  /\b(recommend\w*|best|should|must[- ]have|must[- ]buy|top (pick|choice)|our (pick|choice)|ideal|go-to|worth (it|buying|the money|every)|essential|(great|good) value|value for money|ranked|ranking|winner|favou?rite|core)\b/i;

/**
 * Framing that presents a pick made for the example as what the trade or every shop uses. The tools and
 * software listed are a pick for this example; the sources name more (2026-10-14, after review).
 */
export const FRAMING = /\b(the trade's own list|a small (professional )?shop (buys|uses))\b/i;
