"use client";

import { useEffect, useRef, useState } from "react";

import { aboutJobKicker, copyText, quoted, rulesLead, wageBlock, wageContextLine, type WageBlock } from "@/lib/about-job/text";
import type { AboutJobView } from "@/lib/about-job/types";
import { aboutJobWords as words } from "@/lib/about-job/words";

/**
 * *About this job* (docs/ui-spec/cockpit/about-this-job.md; task 25h), in the cockpit's right-hand panel, opened
 * from the goal bar's Look closer menu once the person has picked a job. Four rows in a fixed order: the
 * government's "Employment requirements" for the job's group, quoted word for word under a line saying they are
 * its words; the wages Job Bank publishes for the group, the row labelled with the level its own source code
 * gives; a plain line that business counts aren't in this version; and the general pages to look the job up
 * yourself, with the job's name and code as text to copy (never in a link's address).
 *
 * It only shows: it changes nothing on the road, gives no receipt, and no rule reads it. Everything it draws
 * comes from `view`, which the server builds (lib/about-job/view.ts), so the 2 MB NOC and wage modules never
 * reach the browser; the words are lib/about-job/words.ts, put together by lib/about-job/text.ts.
 *
 * The quoted lines are drawn inside quote marks, as text, right after the lead line, so the screen checks read
 * them as the government's quote (tests/helpers/official-quotes.ts): nothing may stand between the lead line
 * and the quote but the group's own sub-headings.
 */

/** On a phone the quote folds after this many lines (the spec's "Show all n lines"). */
const PHONE_LINES = 5;

const linkClass = "break-words text-body text-maple hover:underline";

/** One wage block: the row's label, its lines, then the row a "not published" note points to. */
function WageRows({ block, nested = false }: { block: WageBlock; nested?: boolean }) {
  return (
    <div className={nested ? "mt-1 border-l border-rule pl-3" : undefined} {...(block.row ? { "data-wage-row": block.row.geography.code } : {})}>
      {block.label ? <p className="font-semibold text-paper">{block.label}</p> : null}
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

export function AboutThisJobPanel({ view, onClose }: { view: AboutJobView; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [allLines, setAllLines] = useState(false);

  // Focus moves to the panel's heading when it opens, so a screen reader starts at its name.
  useEffect(() => {
    heading.current?.focus();
  }, [view.job.code]);

  const lead = rulesLead(view);
  const entries = view.rules.entries;
  const lineCount = entries.filter((e) => e.kind === "line").length;
  const wages = wageBlock(view.wages.shown);

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
        <p className="text-body text-stone">{wageContextLine(view.wages.context)}</p>
        <WageRows block={wages} />
        {showsFigures(wages) ? <p className="text-body text-stone">{words.wages.lowHigh}</p> : null}
        <p className="text-body text-paper-dim">{words.wages.notYours}</p>
        <p className="text-small text-stone">
          {words.wages.source} {view.wages.credit}
        </p>
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
    </section>
  );
}
