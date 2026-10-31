"use client";

import { useId } from "react";

import { Pill } from "@/components/ui";
import { sourcesLine, writtenForAllOfCanada, type FutureCard } from "@/lib/front-door/futures";
import { pickWords as words } from "@/lib/front-door/words";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

/**
 * One future's card on Pick a future (docs/ui-spec/futures/_index.md, "A card"): its name, what it holds, where
 * it is written for, counts only, and how its sources were checked, with its **Look inside**. Since 2026-10-22
 * (step 3 of the three steps) a card can carry one more line about the person's pick of job (`jobLine`: *Written
 * for Cabinetmakers (72311).*, or *Not written for Barbers. …*), read as part of the card's description.
 *
 * The federal road's card (task 28d, docs/ui-spec/futures/04-outside-alberta.md) also says the person's own
 * province's steps aren't on it. Its heading is a level 2 heading in one list, or level 3 under a group's own
 * heading (outside Alberta: *Written for all of Canada*, *Written for Alberta*).
 */
export function FutureCardItem({
  card,
  level = 2,
  headingSize = "text-title",
  personPlace,
  personPlaceLabel,
  jobLine,
  opening,
  onLookInside,
}: {
  card: FutureCard;
  /** 2 in a list with no heading of its own; 3 under a group's heading. */
  level?: 2 | 3;
  /** The heading's size: the title size, or on the intake page the lead size it already draws (call 37 of 2026-10-22). */
  headingSize?: "text-title" | "text-lead";
  personPlace: Province | null;
  personPlaceLabel: string;
  jobLine?: string | null;
  opening: string | null;
  onLookInside: () => void;
}) {
  const headingId = useId();
  const jobLineId = useId();
  const Heading = level === 2 ? "h2" : "h3";
  // A road's places are read as plain strings: "CA" means it is written for all of Canada.
  const places: readonly string[] = card.writtenFor;
  const forYourPlace = places.includes("CA") || (personPlace !== null && places.includes(personPlace));
  const writtenFor = card.writtenFor.map((p) => (p === "CA" ? words.allOfCanada : (PROVINCE_LABELS[p as Province] ?? p))).join(", ");
  return (
    <li aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-rule bg-ink2 p-5">
      <Heading id={headingId} className={`font-serif ${headingSize} font-bold leading-snug tracking-tight text-paper`}>
        {card.label}
      </Heading>
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.kind[card.kind]}</p>
      <p className="text-body text-stone">
        {words.writtenFor(writtenFor)}
        {forYourPlace ? null : <> {words.youSaid(personPlaceLabel)}</>}
      </p>
      {/* The federal road's own line: the person's province's steps aren't on it (task 28d). */}
      {writtenForAllOfCanada({ provinces: card.writtenFor }) ? <p className="text-body text-stone">{words.federalOnly(personPlaceLabel)}</p> : null}
      {jobLine ? (
        <p id={jobLineId} className="text-body text-paper-dim">
          {jobLine}
        </p>
      ) : null}
      <p className="text-body tabular-nums text-paper-dim">{words.counts(card.steps, card.skillsListed, card.requirementsListed, card.officialFees, card.linesToPrice)}</p>
      <p className="text-body leading-snug text-stone">
        {words.sourcesLead}{" "}
        {sourcesLine(card.sources).map((part, i) => (
          <span key={part.text} className={part.checkFirst ? "text-amber" : undefined}>
            {i > 0 ? " · " : ""}
            {part.text}
          </span>
        ))}
      </p>
      {/* What "checked by a tool only" means, for a newcomer (the screen review of 2026-10-23), where it shows. */}
      {card.sources.tool > 0 ? <p className="text-body leading-snug text-stone">{words.sources.toolMeans}</p> : null}
      <div className="mt-auto flex justify-end">
        <Pill
          variant="maple"
          aria-label={words.lookInsideName(card.label)}
          aria-describedby={jobLine ? jobLineId : undefined}
          onClick={onLookInside}
          disabled={opening !== null}
        >
          {opening === card.roadId ? words.opening : words.lookInside}
        </Pill>
      </div>
    </li>
  );
}
