"use client";

import { useId } from "react";

import { Pill } from "@/components/ui";
import { sourcesLine, type FutureCard } from "@/lib/front-door/futures";
import { pickWords as words } from "@/lib/front-door/words";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

/**
 * One future's card on Pick a future (docs/ui-spec/futures/_index.md, "A card"): its name, what it holds, where
 * it is written for, counts only, and how its sources were checked, with its **Look inside**. Since 2026-10-22
 * (step 3 of the three steps) a card can carry one more line about the person's pick of job (`jobLine`: *Written
 * for Cabinetmakers (72311).*, or *Not written for Barbers. …*), read as part of the card's description.
 */
export function FutureCardItem({
  card,
  personPlace,
  personPlaceLabel,
  jobLine,
  opening,
  onLookInside,
}: {
  card: FutureCard;
  personPlace: Province | null;
  personPlaceLabel: string;
  jobLine?: string | null;
  opening: string | null;
  onLookInside: () => void;
}) {
  const headingId = useId();
  const jobLineId = useId();
  // A road's places are read as plain strings: "CA" means it is written for all of Canada.
  const places: readonly string[] = card.writtenFor;
  const forYourPlace = places.includes("CA") || (personPlace !== null && places.includes(personPlace));
  const writtenFor = card.writtenFor.map((p) => (p === "CA" ? words.allOfCanada : (PROVINCE_LABELS[p as Province] ?? p))).join(", ");
  return (
    <li aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-rule bg-ink2 p-5">
      <h2 id={headingId} className="font-serif text-title font-bold leading-snug tracking-tight text-paper">
        {card.label}
      </h2>
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.kind[card.kind]}</p>
      <p className="text-body text-stone">
        {words.writtenFor(writtenFor)}
        {forYourPlace ? null : <> {words.youSaid(personPlaceLabel)}</>}
      </p>
      {jobLine ? (
        <p id={jobLineId} className="text-body text-paper-dim">
          {jobLine}
        </p>
      ) : null}
      <p className="text-body tabular-nums text-paper-dim">{words.counts(card.steps, card.skillsListed, card.officialFees, card.linesToPrice)}</p>
      <p className="text-body leading-snug text-stone">
        {words.sourcesLead}{" "}
        {sourcesLine(card.sources).map((part, i) => (
          <span key={part.text} className={part.checkFirst ? "text-amber" : undefined}>
            {i > 0 ? " · " : ""}
            {part.text}
          </span>
        ))}
      </p>
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
