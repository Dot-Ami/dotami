"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { useJourney } from "@/components/shared/journey-provider";
import { GhostLink, Pill, WordMark } from "@/components/ui";
import {
  generalRoadV2026,
  roadsV2026,
  skillItemsV2026,
  type Road,
} from "@/lib/engines/roads/v2026";
import { futureCards, listedRoads, sourcesLine, type FutureCard } from "@/lib/front-door/futures";
import { lookingForReceipt, placeName, provinceOfPlace } from "@/lib/front-door/receipts";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { pickWords as words } from "@/lib/front-door/words";
import { saveScenario } from "@/lib/journey/save-scenario";
import { STATEMENT_MAX_CHARS } from "@/lib/person/types";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

/** The roads this page lists (road 0 and the first written future; lib/front-door/futures.ts). */
const LISTED = listedRoads(roadsV2026);

/**
 * *Pick a future* (`/futures`; docs/ui-spec/futures/_index.md): the futures it lists, in the order the
 * catalog lists them, never ranked, each as counts of what its road holds and how its sources were
 * checked. Picking one saves a new idea on that road in one request (the place answered, the name typed or
 * the road's own, and the business / career / both answer, each kept with its moment) and opens the
 * cockpit on it. Nothing about the person is put in an address: the idea's id is the only thing there.
 */
export function PickFuturePage() {
  const router = useRouter();
  const { intake, setScenario, hydrated } = useJourney();
  const draft = intake.destination ?? {};
  const cards = useMemo(() => futureCards(LISTED, skillItemsV2026), []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  // The road being saved, so its button says so and every other waits.
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const noteId = useId();

  const place = draft.place;
  const placeLabel = place ? placeName(place) : null;

  /**
   * Saves the idea on `road`, then opens the cockpit on it. A future that couldn't be saved isn't opened,
   * and the page says `failed` (by default, that nothing was saved).
   */
  async function lookInside(road: Road, failed: string = words.saveFailed) {
    if (!place || opening) return;
    setOpening(road.id);
    setError(null);
    const scenario = scenarioForPickedFuture({ road, place, name }, crypto.randomUUID());
    // An unanswered question 2 is kept as no answer, never filled in.
    const saved = await saveScenario(
      scenario,
      firstSaveForPickedFuture(road, draft.lookingFor ?? null),
    );
    if (!saved.ok || !saved.ventureId) {
      setOpening(null);
      setError(failed);
      return;
    }
    setScenario(scenario);
    router.push(`/cockpit?venture=${encodeURIComponent(saved.ventureId)}`);
  }

  /** Keeps the note as one of the person's statements, then opens the general road the same way. */
  async function keepNote() {
    const typed = note.trim();
    if (typed.length === 0 || opening) return;
    setOpening(generalRoadV2026.id);
    setError(null);
    try {
      const res = await fetch("/api/person/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: typed, saidAt: new Date().toLocaleDateString("en-CA") }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setOpening(null);
        setError(body?.error ?? words.saveFailed);
        return;
      }
    } catch {
      setOpening(null);
      setError(words.saveFailed);
      return;
    }
    // The note is kept: empty the box, so pressing again can't keep it twice, and if the road can't be
    // opened, say the note is kept rather than "nothing was saved".
    setNote("");
    setOpening(null);
    await lookInside(generalRoadV2026, words.notHere.keptNotOpened);
  }

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col bg-ink">
      {/* data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule"). */}
      <nav data-region="nav" className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/start" tone="stone">
          {words.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">
          {words.navLabel}
        </p>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-8">
          <header data-region="intro">
            <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
              {words.heading}
            </h1>
            <p className="mt-2 text-lead text-paper-dim">{words.order}</p>
            {draft.lookingFor ? (
              <p className="mt-1 text-body text-stone">
                {lookingForReceipt(draft.lookingFor, LISTED)}
              </p>
            ) : null}
          </header>

          {!hydrated ? null : !place ? (
            <p data-region="no-place" className="rounded-lg border border-dashed border-rule p-6 text-lead text-stone">
              {words.noPlace}{" "}
              <Link href="/start" className="border-b border-rule-soft text-paper hover:text-maple">
                {words.noPlaceLink}
              </Link>
            </p>
          ) : (
            <>
              <div data-region="name-it" className="max-w-sm">
                <label
                  htmlFor={nameId}
                  className="mb-1.5 block font-mono text-small uppercase tracking-[0.14em] text-stone"
                >
                  {words.nameIt}
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-rule bg-ink px-3 py-2 text-lead text-paper focus:border-maple focus:outline-hidden"
                />
                <p className="mt-1 text-body text-stone-dim">{words.nameHint}</p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-lead text-amber"
                >
                  {error}
                </p>
              ) : null}

              <ul data-region="futures" aria-label={words.listLabel} className="grid gap-4 md:grid-cols-2">
                {cards.map((card) => {
                  const road = LISTED.find((r) => r.id === card.roadId)!;
                  return (
                    <FutureCardItem
                      key={card.roadId}
                      card={card}
                      personPlace={provinceOfPlace(place)}
                      personPlaceLabel={placeLabel!}
                      opening={opening}
                      onLookInside={() => void lookInside(road)}
                    />
                  );
                })}
              </ul>

              <section
                data-region="not-here"
                aria-labelledby={noteId}
                className="space-y-3 rounded-lg border border-rule bg-ink2 p-5"
              >
                <h2
                  id={noteId}
                  className="font-serif text-title font-bold tracking-tight text-paper"
                >
                  {words.notHere.label}
                </h2>
                <p className="text-body text-stone">{words.notHere.hint}</p>
                <textarea
                  aria-labelledby={noteId}
                  value={note}
                  maxLength={STATEMENT_MAX_CHARS}
                  rows={2}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full resize-y rounded-[10px] border border-rule bg-ink px-4 py-3 text-lead text-paper outline-hidden focus:border-maple-soft"
                />
                <div className="flex justify-end">
                  <Pill
                    variant="ghost"
                    onClick={() => void keepNote()}
                    disabled={opening !== null || note.trim().length === 0}
                  >
                    {words.notHere.button}
                  </Pill>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function FutureCardItem({
  card,
  personPlace,
  personPlaceLabel,
  opening,
  onLookInside,
}: {
  card: FutureCard;
  personPlace: Province | null;
  personPlaceLabel: string;
  opening: string | null;
  onLookInside: () => void;
}) {
  const headingId = useId();
  // A road's places are read as plain strings: "CA" means it is written for all of Canada.
  const places: readonly string[] = card.writtenFor;
  const forYourPlace =
    places.includes("CA") || (personPlace !== null && places.includes(personPlace));
  const writtenFor = card.writtenFor
    .map((p) => (p === "CA" ? words.allOfCanada : (PROVINCE_LABELS[p as Province] ?? p)))
    .join(", ");
  return (
    <li
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule bg-ink2 p-5"
    >
      <h2
        id={headingId}
        className="font-serif text-title font-bold leading-snug tracking-tight text-paper"
      >
        {card.label}
      </h2>
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">
        {words.kind[card.kind]}
      </p>
      <p className="text-body text-stone">
        {words.writtenFor(writtenFor)}
        {forYourPlace ? null : <> {words.youSaid(personPlaceLabel)}</>}
      </p>
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
        <Pill
          variant="maple"
          aria-label={words.lookInsideName(card.label)}
          onClick={onLookInside}
          disabled={opening !== null}
        >
          {opening === card.roadId ? words.opening : words.lookInside}
        </Pill>
      </div>
    </li>
  );
}
