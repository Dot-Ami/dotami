"use client";

import { FoldButton } from "@/components/cockpit/folding";
import { LookCloserMenu, type LookCloserItem } from "@/components/cockpit/look-closer-menu";
import { gaugeView, type GaugeId } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import type { Road } from "@/lib/engines/roads/v2026";
import { landscapeWords } from "@/lib/landscape/words";
import type { RoadEvaluation } from "@/lib/roads";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * The top of the cockpit (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"): the
 * person's own first sentence, word for word and dated; their yearly target only when they agreed to
 * one, labelled theirs; the future by its road's name (on a road written for other places than the
 * idea's, which map is drawn instead); and four gauges from road evaluation, each tagged with where its
 * numbers come from. Counts and sums only: no gauge says whether a number is enough. Clicking a gauge
 * opens its overlay and its list; clicking it again closes them.
 *
 * Folding (2026-10-12, "Folding and phone width"): given `onToggleFold`, the bar has a button to fold it.
 * Folded, it shows one line: the four gauges as buttons with their name and value (the lines under each
 * in the button's title), and the button to show it all again. The gauges still open their lists from
 * there. The open bar stays on the page behind the line, hidden, the same as every other folded region.
 *
 * The calm first view (2026-10-17, S2.5.30c): what the bar can open in the right-hand panel (Compare, Others
 * in this line of work, and later About this job) shares one "Look closer" menu instead of a button each.
 * The cockpit draws it under its header in one strip, but it is still a region of its own for the clutter
 * limit, as the layout rule defines one (docs/ui-spec/cockpit/07-goal-bar.md).
 *
 * 2026-10-20: the menu also shows the folded legend and what-if bar (`toShow`), whose buttons were at the end
 * of Next on your road, and the folded line carries the menu too, between the gauges and the show button.
 */

/** The bar's id, for its fold button's aria-controls. */
const GOAL_BAR_ID = "cockpit-goal-bar";

const GAUGES: GaugeId[] = ["steps", "skills", "money", "date"];

export function GoalBar({
  road,
  evaluation,
  scenario,
  firstWords,
  destination = null,
  target,
  active,
  onGauge,
  onCompare,
  onLandscape,
  folded = false,
  onToggleFold,
  person = null,
  targetFrom = null,
  toShow = [],
}: {
  /**
   * What folds under the map that the Look closer menu shows (2026-10-20): the legend and the what-if bar,
   * each given only while it is folded. After the right-hand panel's items, in the menu open or folded.
   */
  toShow?: readonly LookCloserItem[];
  /**
   * Opens "Others in this line of work" in the right-hand panel (2026-10-17; docs/ui-spec/cockpit/landscape.md).
   * The page gives it on every road, so the button shows wherever the bar is open.
   */
  onLandscape?: () => void;
  /**
   * On an example whose target is a published statistic (2026-10-14): which one and when, said in place of
   * "agreed". Null otherwise.
   */
  targetFrom?: { what: string; period: string } | null;
  /**
   * An invented example person's name (docs/ui-spec/example/_index.md): the words, target, tags and money
   * are then labelled theirs, never the viewer's. Null on a person's own future.
   */
  person?: string | null;
  /**
   * Opens "Compare the two endings" (part 2, 2026-10-12). The button shows only when it is given, and the
   * page gives it only on a road with a fork whose own pick, not the rules, puts steps on or off the path
   * (lib/cockpit/told.ts `forksToCompare`, the maintainer's answer of 2026-10-13): not on today's Alberta
   * road.
   */
  onCompare?: () => void;
  road: Road;
  evaluation: RoadEvaluation;
  /** The idea: its place, and the map's own chips for the Steps gauge's next step. */
  scenario: Scenario;
  /** The sentence typed on the front door for this idea, as kept: word for word, with its day. */
  firstWords: { text: string; saidAt: string } | null;
  /**
   * The person's newest answer to "where do you want to be", word for word with its day. Shown only when
   * the idea has no first sentence of its own, as an idea picked on Pick a future has none (2026-10-12).
   */
  destination?: { text: string; saidAt: string } | null;
  /** The yearly income the person agreed to, with the day agreed; null when there is none. */
  target: { amountCents: number; agreedOn: string } | null;
  active: GaugeId | null;
  onGauge: (gauge: GaugeId) => void;
  /** Folded to one line (only when `onToggleFold` is given). */
  folded?: boolean;
  /** Folds or shows the bar; left out, the bar has no fold button (as other screens and tests draw it). */
  onToggleFold?: () => void;
}) {
  const view = gaugeView(evaluation, road, scenario, person);
  // Each gauge's name and the tag saying whose numbers they are; on an example, the example person's.
  const gaugeLabel = (id: GaugeId) => (person && id === "date" ? words.example.theirs.dateLabel(person) : words.gauges[id].label);
  const gaugeTag = (id: GaugeId) => (person ? words.example.theirs.tags(person)[id] : words.gauges[id].tag);
  // A road written for all of Canada ("CA") covers every province; otherwise the idea's own must be listed.
  const place = scenario.profile.province;
  // An idea's province can be one no road names yet (MB, QC…), so the list is read as plain strings.
  const roadPlaces: readonly string[] = road.provinces;
  const writtenForThisPlace = roadPlaces.includes(place) || roadPlaces.includes("CA");
  // The idea's own sentence wins; the person's destination stands in only when there is none.
  const shownWords = firstWords
    ? { text: firstWords.text, line: words.goal.yourWords(firstWords.saidAt) }
    : destination
      ? { text: destination.text, line: person ? words.example.theirs.destination(person, destination.saidAt) : words.goal.destination(destination.saidAt) }
      : null;

  const isFolded = folded && onToggleFold !== undefined;
  // "Look closer": the things the bar opens in the right-hand panel, in one menu, in the order they came;
  // then what folds under the map (2026-10-20). In the folded line too, so the legend and the what-if bar
  // are never more than the menu away.
  const lookCloser: LookCloserItem[] = [
    ...(onCompare ? [{ id: "compare", label: words.compare.region, onSelect: onCompare }] : []),
    ...(onLandscape ? [{ id: "landscape", label: landscapeWords.open, onSelect: onLandscape }] : []),
    ...toShow,
  ];

  return (
    // data-region: one of the cockpit's regions the clutter limit counts (docs/ui-spec/README.md).
    <section id={GOAL_BAR_ID} data-region="goal-bar" aria-label={words.goal.region}>
      {isFolded ? (
        // One line: the gauges by name and value, scrolling sideways inside the line when they don't fit.
        <div className="flex min-w-0 items-center gap-2 px-5 py-1.5">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {GAUGES.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={active === id}
                onClick={() => onGauge(id)}
                // The lines the one line leaves out (what a sum covers, what is left out of it), on hover.
                title={[view[id].value, ...view[id].lines].join(" · ")}
                className={`flex max-w-[300px] shrink-0 items-center gap-1.5 rounded-md border bg-ink px-2 py-0.5 text-left transition hover:border-spruce-line max-md:min-h-8 ${
                  active === id ? "border-maple" : "border-rule"
                }`}
              >
                <span className="shrink-0 font-mono text-label uppercase tracking-[0.1em] text-stone">{gaugeLabel(id)}</span>
                <span className="truncate text-body tabular-nums text-paper">{view[id].value}</span>
              </button>
            ))}
          </div>
          <LookCloserMenu items={lookCloser} />
          <FoldButton folded region="goal" label={words.folds.goal.show} controls={GOAL_BAR_ID} onClick={onToggleFold} />
        </div>
      ) : null}
      {/* The open bar. Folded, it stays on the page, hidden, so folding never removes anything. */}
      <div hidden={isFolded} className="grid gap-2.5 px-5 py-3">
        {shownWords ? <p className="font-serif text-title italic leading-snug text-paper">“{shownWords.text}”</p> : null}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-stone">
          {shownWords ? <span>{shownWords.line}</span> : null}
          {target ? (
            <span>
              {person
                ? targetFrom
                  ? words.example.theirs.targetFrom(person, target.amountCents, targetFrom.what, targetFrom.period)
                  : words.example.theirs.target(person, target.amountCents, target.agreedOn)
                : words.goal.target(target.amountCents, target.agreedOn)}
            </span>
          ) : null}
          <span>
            {writtenForThisPlace ? words.goal.future(road.label) : words.goal.drawnOnly(road.label, road.provinces, place)}
          </span>
          <LookCloserMenu items={lookCloser} />
          {onToggleFold ? (
            <FoldButton folded={false} region="goal" label={words.folds.goal.fold} controls={GOAL_BAR_ID} onClick={onToggleFold} className="ml-auto" />
          ) : null}
        </p>
        {/* Four across at any width: on a narrow window the row scrolls sideways inside the bar rather than
            stacking, so the bar stays one row tall, the map keeps its room and the page never scrolls sideways. */}
        <div className="grid auto-cols-[minmax(190px,1fr)] grid-flow-col gap-2.5 overflow-x-auto">
          {GAUGES.map((id) => {
            const gauge = view[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active === id}
                onClick={() => onGauge(id)}
                className={`grid content-start gap-0.5 rounded-md border bg-ink px-3 py-2 text-left transition hover:border-spruce-line ${
                  active === id ? "border-maple" : "border-rule"
                }`}
              >
                <span className="flex justify-between gap-2 font-mono text-label uppercase tracking-[0.1em] text-stone">
                  {gaugeLabel(id)}
                  <span className="normal-case tracking-normal text-stone-dim">{gaugeTag(id)}</span>
                </span>
                <span className="text-body tabular-nums text-paper">{gauge.value}</span>
                {gauge.lines.map((line) => (
                  <span key={line} className="text-body text-stone">
                    {line}
                  </span>
                ))}
                {gauge.invite ? <span className="text-body text-amber">{gauge.invite}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
