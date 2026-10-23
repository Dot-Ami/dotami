"use client";

import { useEffect, useId, useRef, useState } from "react";

import { aboutJobKicker, copyText, quoted, rulesLead, wageBlock, wageContextLine, type WageBlock } from "@/lib/about-job/text";
import type { AboutJobView } from "@/lib/about-job/types";
import { aboutJobWords as words } from "@/lib/about-job/words";
import { ALBERTA_ECONOMIC_REGIONS, DONT_KNOW_REGION, regionNameOnScreen } from "@/lib/engines/research-kit/v2026/economic-regions";
import { whereStepWords } from "@/lib/front-door/words";

/**
 * *About this job* (docs/ui-spec/cockpit/about-this-job.md; task 25h), in the cockpit's right-hand panel, opened
 * from the goal bar's Look closer menu once the person has picked a job. Four rows in a fixed order: the
 * government's "Employment requirements" for the job's group, quoted word for word under a line saying they are
 * its words; the wages Job Bank publishes for the group, the row labelled with the level its own source code
 * gives; a plain line that business counts aren't in this version; and the general pages to look the job up
 * yourself, with the job's name and code as text to copy (never in a link's address).
 *
 * The rows are one component (`AboutThisJobRows`), drawn in the panel here and, since task 28c, in place on Pick a
 * future's step 3 when no road is written for the picked job (components/front-door/about-job-in-place.tsx;
 * docs/ui-spec/futures/03-road-match.md, case B), with no Close there: nothing to close back to.
 *
 * It only shows, apart from the region's **Change** (Alberta only, in the cockpit): it changes nothing on the
 * road, gives no receipt, and no rule reads it. Everything it draws comes from `view`, which the server builds
 * (lib/about-job/view.ts), so the 2 MB NOC and wage modules never reach the browser; the words are
 * lib/about-job/words.ts, put together by lib/about-job/text.ts.
 *
 * The quoted lines are drawn inside quote marks, as text, right after the lead line, so the screen checks read
 * them as the government's quote (tests/helpers/official-quotes.ts): nothing may stand between the lead line
 * and the quote but the group's own sub-headings.
 */

/** On a phone the quote folds after this many lines (the spec's "Show all n lines"). */
const PHONE_LINES = 5;

const linkClass = "break-words text-body text-maple hover:underline";

/**
 * One wage block: the row's label, the line saying which row this is (top block only, under the label as the
 * spec's row 2 puts it; first when a row with no figures has no label), its lines, then the row a "not published"
 * note points to.
 */
function WageRows({ block, context, nested = false }: { block: WageBlock; context?: string; nested?: boolean }) {
  return (
    <div className={nested ? "mt-1 border-l border-rule pl-3" : undefined} {...(block.row ? { "data-wage-row": block.row.geography.code } : {})}>
      {block.label ? <p className="font-semibold text-paper">{block.label}</p> : null}
      {/* A gap under it, so the row's figures don't run on from the sentence. */}
      {context ? <p className="mb-2 text-body text-stone">{context}</p> : null}
      {block.lines.map((line) => (
        <p key={line} className="text-body text-paper-dim">
          {line}
        </p>
      ))}
      {block.then ? <WageRows block={block.then} nested /> : null}
    </div>
  );
}

/** True when a block, or the block a note points to, shows a row's figures. */
const showsFigures = (block: WageBlock | null): boolean => block !== null && (block.row !== null || showsFigures(block.then));

/**
 * The region's **Change** (docs/ui-spec/cockpit/about-this-job.md, row 2): the region drop-down in place, the same
 * list and why-line as Pick a future's step 2b (Alberta's eight economic regions in Statistics Canada's code order,
 * then *I don't know*), opened from its button, kept only with **Keep this answer**. Nothing is picked for the
 * person: the drop-down opens on their own answer, or on *Choose one* when none is kept.
 */
export interface RegionChange {
  /** The region as kept (`Venture.economicRegion`: a code, "dont-know"), or null. */
  current: string | null;
  /** Keeps the answer; resolves to false when it couldn't be kept (the panel then says so and keeps what it had). */
  keep: (value: string) => Promise<boolean>;
}

function ChangeRegion({ change }: { change: RegionChange }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(change.current ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const selectId = useId();
  const whyId = useId();
  const orderId = useId();
  const select = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (open) select.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(change.current ?? "");
          setFailed(false);
          setOpen(true);
        }}
        className="mt-6 rounded-full border border-rule px-3 py-0.5 text-body text-paper hover:border-maple-soft"
      >
        {words.wages.changeName}
      </button>
    );
  }

  async function keep() {
    if (value === "" || saving) return;
    setSaving(true);
    setFailed(false);
    const ok = await change.keep(value);
    setSaving(false);
    if (ok) setOpen(false);
    else setFailed(true);
  }

  return (
    <div className="mt-6 space-y-2 rounded-lg border border-rule bg-ink2 p-3" data-region-change>
      <label htmlFor={selectId} className="block font-semibold text-paper">
        {whereStepWords.region.label}
      </label>
      <p id={whyId} className="text-body text-stone">
        {whereStepWords.region.why}
      </p>
      <select
        ref={select}
        id={selectId}
        aria-describedby={`${whyId} ${orderId}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-sm border border-rule bg-ink px-3 py-2 text-body text-paper outline-hidden focus:border-maple-soft"
      >
        <option value="">{whereStepWords.region.choose}</option>
        {ALBERTA_ECONOMIC_REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {regionNameOnScreen(r.name)}
          </option>
        ))}
        <option value={DONT_KNOW_REGION}>{whereStepWords.region.dontKnow}</option>
      </select>
      <p id={orderId} className="text-body text-stone-dim">
        {whereStepWords.region.order}
      </p>
      {failed ? (
        <p role="alert" className="text-body text-amber">
          {words.wages.changeFailed}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void keep()}
          disabled={value === "" || saving}
          className="rounded-full border border-maple bg-maple/10 px-3 py-0.5 text-body text-paper disabled:opacity-50"
        >
          {words.wages.changeKeep}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-rule px-3 py-0.5 text-body text-stone hover:text-paper">
          {words.wages.changeCancel}
        </button>
      </div>
    </div>
  );
}

/**
 * The four rows and the footer line, as the panel and step 3's no-road block both draw them. `regionChange` draws
 * the region's **Change**, only where the region question exists (Alberta in this version: never on a row shown
 * for a place outside it).
 */
export function AboutThisJobRows({ view, regionChange }: { view: AboutJobView; regionChange?: RegionChange }) {
  const [allLines, setAllLines] = useState(false);
  const lead = rulesLead(view);
  const entries = view.rules.entries;
  const lineCount = entries.filter((e) => e.kind === "line").length;
  const wages = wageBlock(view.wages.shown);
  const canChange = regionChange !== undefined && view.wages.context.kind !== "outside-alberta";

  return (
    <>
      {/* 1. Employment requirements: the government's words, quoted in full, labelled as its words. */}
      <div className="mt-5 space-y-2" data-about-row="rules">
        <h3 className="font-semibold text-paper">{words.rules.heading}</h3>
        {lead && entries.length > 0 ? (
          <>
            <p className="text-body text-stone">{lead}</p>
            <blockquote cite={view.rules.sourceUrl} data-official-quote="noc-2021-elements" className="space-y-1.5 border-l-2 border-rule pl-3">
              {entries.map((entry, i) => (
                <p
                  key={`${i}-${entry.text}`}
                  // The file's own spacing is kept (72311's double space before "or").
                  className={`whitespace-pre-wrap ${entry.kind === "subheading" ? "font-semibold text-paper" : "text-paper-dim"} ${
                    !allLines && i >= PHONE_LINES ? "max-md:hidden" : ""
                  }`}
                >
                  {entry.kind === "line" ? quoted(entry.text) : entry.text}
                </p>
              ))}
            </blockquote>
            {!allLines && entries.length > PHONE_LINES ? (
              <button type="button" onClick={() => setAllLines(true)} className="text-left text-body text-maple hover:underline md:hidden">
                {words.rules.showAll(lineCount)}
              </button>
            ) : null}
            {view.rules.groupHoldsOthers ? <p className="text-body text-paper-dim">{words.rules.groupNote}</p> : null}
          </>
        ) : (
          <p className="text-body text-paper-dim">{words.rules.none(view.group?.code ?? view.job.code.slice(0, 5))}</p>
        )}
        <p className="text-small text-stone">{words.rules.source(view.rules.readOn)}</p>
        <p className="text-small text-stone">{view.rules.licence}</p>
      </div>

      {/* 2. The wages Job Bank publishes for the group: the row's own level, period and method. */}
      <div className="mt-6 space-y-2" data-about-row="wages">
        <h3 className="font-semibold text-paper">{words.wages.heading}</h3>
        <WageRows block={wages} context={wageContextLine(view.wages.context)} />
        {showsFigures(wages) ? <p className="text-body text-stone">{words.wages.lowHigh}</p> : null}
        <p className="text-body text-paper-dim">{words.wages.notYours}</p>
        <p className="text-small text-stone">
          {words.wages.source} {view.wages.credit}
        </p>
        {/* The region's Change, at the row's end, named for what it changes (task 28h): the row's own lines first, so
            on a phone the sheet's first window holds no more than it did (the clutter row `cockpit-about-job`). */}
        {canChange ? <ChangeRegion key={regionChange.current ?? ""} change={regionChange} /> : null}
      </div>

      {/* 3. Business counts: not in this version, said plainly, with the area the person gave. */}
      <div className="mt-6 space-y-2" data-about-row="counts">
        <h3 className="font-semibold text-paper">{words.counts.heading}</h3>
        <p className="text-body text-paper-dim">{words.counts.notInVersion}</p>
        <p className="text-body text-stone">{view.area ? words.counts.yourArea(view.area) : words.counts.areaNotPicked}</p>
      </div>

      {/* 4. Where to look yourself: general pages, and the job's name and code as text to copy. */}
      <div className="mt-6 space-y-2" data-about-row="links">
        <h3 className="font-semibold text-paper">{words.links.heading}</h3>
        <p className="text-body text-paper-dim">{words.links.copy}</p>
        <p className="select-all break-words font-mono text-body text-paper">{copyText(view)}</p>
        <ul className="space-y-1">
          {view.links.pages.map((link) => (
            <li key={link.id}>
              <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={words.links.opensInBrowser(link.label)} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        {view.links.tradesecretsLeftOutFor ? <p className="text-body text-stone">{words.links.notAlberta(view.links.tradesecretsLeftOutFor)}</p> : null}
        <p className="text-body text-stone">{words.links.note}</p>
      </div>

      <p className="mt-8 border-t border-rule pt-3 text-body text-stone">{words.footer}</p>
    </>
  );
}

export function AboutThisJobPanel({ view, onClose, regionChange }: { view: AboutJobView; onClose: () => void; regionChange?: RegionChange }) {
  const heading = useRef<HTMLHeadingElement>(null);

  // Focus moves to the panel's heading when it opens, so a screen reader starts at its name.
  useEffect(() => {
    heading.current?.focus();
  }, [view.job.code]);

  return (
    <section aria-label={words.region} className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-body leading-snug max-lg:border-l-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-label uppercase tracking-[0.14em] text-stone-dim">{aboutJobKicker(view)}</p>
          <h2 ref={heading} tabIndex={-1} className="mt-1 font-serif text-title font-bold text-paper focus:outline-hidden">
            {words.region}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label={words.close} className="rounded-full border border-rule px-2.5 py-1 text-lead text-stone hover:bg-ink2">
          ×
        </button>
      </div>
      <AboutThisJobRows view={view} regionChange={regionChange} />
    </section>
  );
}
