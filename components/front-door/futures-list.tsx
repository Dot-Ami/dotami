"use client";

import { useId, useState } from "react";

import { Pill } from "@/components/ui";
import { groupedForPlace, sourcesLine, writtenForAllOfCanada, type FutureCard } from "@/lib/front-door/futures";
import { pickWords as words } from "@/lib/front-door/words";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

/** A card written for all of Canada ("CA"): the federal steps, and no province's own (the listing's own rule). */
const forAllOfCanada = (card: FutureCard) => writtenForAllOfCanada({ provinces: card.writtenFor });

/**
 * *Pick a future*'s list of futures (docs/ui-spec/futures/_index.md, step 3), one region (`futures`).
 *
 * For an Albertan (no future written for all of Canada is listed): one list, in the catalog's order, as since
 * 2026-10-12. For a person outside Alberta (task 28d, docs/ui-spec/futures/04-outside-alberta.md): first
 * *Written for all of Canada*, the federal road's card, which also says the person's own province's steps
 * aren't written yet; then *Written for Alberta*, folded behind one button so the person's own place comes
 * first and the controls stay within the limit (one **Look inside** and the button, where there were two
 * **Look inside**). Opened, the Alberta cards show as before, each with *Written for Alberta. You said …*.
 * Nothing is ranked: each group keeps the order the futures were written in.
 */
export function FuturesList({
  cards,
  personPlace,
  personPlaceLabel,
  opening,
  onLookInside,
}: {
  cards: readonly FutureCard[];
  personPlace: Province | null;
  personPlaceLabel: string;
  /** The road being opened, so its button says so and every other waits. */
  opening: string | null;
  onLookInside: (roadId: string) => void;
}) {
  const canadaId = useId();
  const albertaId = useId();
  const albertaListId = useId();
  const [albertaShown, setAlbertaShown] = useState(false);
  // The two groups by the rule tests/front-door.spec.ts checks (groupedForPlace), each in the catalog's order.
  const groups = groupedForPlace(cards.map((card) => ({ card, provinces: card.writtenFor })));
  const canada = groups.canada.map(({ card }) => card);
  const elsewhere = groups.elsewhere.map(({ card }) => card);
  const item = (card: FutureCard, level: 2 | 3) => (
    <FutureCardItem
      key={card.roadId}
      card={card}
      level={level}
      personPlace={personPlace}
      personPlaceLabel={personPlaceLabel}
      opening={opening}
      onLookInside={() => onLookInside(card.roadId)}
    />
  );

  if (canada.length === 0) {
    // data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule").
    return (
      <ul data-region="futures" aria-label={words.listLabel} className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => item(card, 2))}
      </ul>
    );
  }

  return (
    <div data-region="futures" className="space-y-6">
      <div className="space-y-3">
        <h2 id={canadaId} className="font-mono text-small uppercase tracking-[0.14em] text-stone">
          {words.canadaHeading}
        </h2>
        <ul aria-labelledby={canadaId} className="grid gap-4 md:grid-cols-2">
          {canada.map((card) => item(card, 3))}
        </ul>
      </div>
      {elsewhere.length > 0 ? (
        <div className="space-y-3">
          <h2 id={albertaId} className="font-mono text-small uppercase tracking-[0.14em] text-stone">
            {words.albertaHeading}
          </h2>
          <Pill
            variant="ghost"
            aria-expanded={albertaShown}
            aria-controls={albertaListId}
            onClick={() => setAlbertaShown((shown) => !shown)}
          >
            {albertaShown ? words.hideAlberta : words.showAlberta(elsewhere.length)}
          </Pill>
          <ul id={albertaListId} hidden={!albertaShown} aria-labelledby={albertaId} className="grid gap-4 md:grid-cols-2">
            {elsewhere.map((card) => item(card, 3))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FutureCardItem({
  card,
  level,
  personPlace,
  personPlaceLabel,
  opening,
  onLookInside,
}: {
  card: FutureCard;
  /** 2 in the one list an Albertan sees; 3 under a group's heading. */
  level: 2 | 3;
  personPlace: Province | null;
  personPlaceLabel: string;
  opening: string | null;
  onLookInside: () => void;
}) {
  const headingId = useId();
  const Heading = level === 2 ? "h2" : "h3";
  // A road's places are read as plain strings: "CA" means it is written for all of Canada.
  const places: readonly string[] = card.writtenFor;
  const forYourPlace = places.includes("CA") || (personPlace !== null && places.includes(personPlace));
  const writtenFor = card.writtenFor
    .map((p) => (p === "CA" ? words.allOfCanada : (PROVINCE_LABELS[p as Province] ?? p)))
    .join(", ");
  return (
    <li aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-rule bg-ink2 p-5">
      <Heading id={headingId} className="font-serif text-title font-bold leading-snug tracking-tight text-paper">
        {card.label}
      </Heading>
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.kind[card.kind]}</p>
      <p className="text-body text-stone">
        {words.writtenFor(writtenFor)}
        {forYourPlace ? null : <> {words.youSaid(personPlaceLabel)}</>}
      </p>
      {/* The federal road's own line: the person's province's steps aren't on it (task 28d). */}
      {forAllOfCanada(card) ? <p className="text-body text-stone">{words.federalOnly(personPlaceLabel)}</p> : null}
      <p className="text-body tabular-nums text-paper-dim">
        {words.counts(card.steps, card.skillsListed, card.officialFees, card.linesToPrice)}
      </p>
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
        <Pill variant="maple" aria-label={words.lookInsideName(card.label)} onClick={onLookInside} disabled={opening !== null}>
          {opening === card.roadId ? words.opening : words.lookInside}
        </Pill>
      </div>
    </li>
  );
}
