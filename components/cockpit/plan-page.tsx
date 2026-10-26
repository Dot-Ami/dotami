import Link from "next/link";
import type { ReactNode } from "react";

import { PrintButton } from "@/components/cockpit/print-button";
import { PageQuotes } from "@/components/shared/page-quotes";
import type { PlanSource, PlanStep, PlanView } from "@/lib/cockpit/plan";
import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * Your plan (docs/ui-spec/plan/_index.md, issue #41): one idea's plan drawn from `buildPlan`'s lines, to
 * read on screen and to print. Every sentence comes from the view (lib/cockpit/plan.ts) or the words file;
 * this file only lays them out.
 *
 * On paper (Tailwind's `print:` variant, and app/globals.css for the page around it): the bar with Back and
 * Print is gone, the sheet is black on white, each section after the first starts a new page, a step
 * isn't split across pages, and every link is printed as its address, because the address is its text.
 */

const SECTION_IDS = ["words", "road", "steps", "skills", "money", "told", "notAdvice"] as const;
type SectionId = (typeof SECTION_IDS)[number];

/** A link whose text is its own address, so a printed page shows where it goes. */
function Address({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="break-all text-spruce underline underline-offset-2 print:text-black print:no-underline">
      {url}
    </a>
  );
}

function Source({ source }: { source: PlanSource }) {
  return (
    <div className="text-body leading-snug text-ink/80 print:text-black">
      <p>
        {source.title} · <Address url={source.url} />
      </p>
      <p>{source.checked}</p>
      {/* The page's own words, after their label (the official-quote component, 2026-10-23). */}
      <PageQuotes quotes={source.quotes} layout="lines" />
    </div>
  );
}

function Section({ id, index, children }: { id: SectionId; index: number; children: ReactNode }) {
  const headingId = `plan-${id}`;
  return (
    <section
      // A block the clutter limit counts (docs/ui-spec/README.md, "The layout rule").
      data-region={headingId}
      aria-labelledby={headingId}
      // A new page for every section after the first, on paper only.
      className={`border-t border-ink/15 pt-6 print:border-t-0 ${index > 0 ? "print:break-before-page" : ""}`}
    >
      <h2 id={headingId} className="mb-3 font-serif text-xl font-bold tracking-tight">
        {words.plan.sections[id]}
      </h2>
      {children}
    </section>
  );
}

function Step({ step }: { step: PlanStep }) {
  return (
    // The contents list at the top of Each step links here; scroll-mt keeps the step's name clear of the window's edge.
    <article id={`plan-step-${step.id}`} className="scroll-mt-4 rounded-sm border border-ink/15 p-4 print:break-inside-avoid print:border-black/30">
      <h4 className="font-serif text-title font-bold">{step.label}</h4>
      <p className="text-body">{step.summary}</p>
      <p className="mt-2 text-body">
        {step.status} · {step.state}
      </p>
      <p className="text-body text-ink/80 print:text-black">{step.because}</p>

      <p className="mt-3 text-body font-semibold">{step.doneWhenTitle}</p>
      {step.doneWhen.length > 0 ? (
        <ul className="mt-1 space-y-2">
          {step.doneWhen.map((line) => (
            <li key={line.text}>
              <p className="text-body">
                <span aria-hidden="true">{line.ticked ? words.plan.tickBox.on : words.plan.tickBox.off}</span> {line.text} ({line.mark})
              </p>
              <div className="pl-5">
                <Source source={line.source} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {step.skills.length > 0 ? (
        <>
          <p className="mt-3 text-body font-semibold">{words.panel.skills}</p>
          <ul className="mt-1 list-disc pl-5 text-body">
            {step.skills.map((skill) => (
              <li key={skill.label}>
                {skill.label}: {skill.mark}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {step.costCount ? <p className="mt-3 text-body">{step.costCount}</p> : null}

      {step.officialLinks.length > 0 ? (
        <>
          <p className="mt-3 text-body font-semibold">{words.panel.officialLinks}</p>
          <ul className="mt-1 space-y-0.5 text-body">
            {step.officialLinks.map((link) => (
              <li key={link.url}>
                {link.label}: <Address url={link.url} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {step.sources.length > 0 ? (
        <>
          <p className="mt-3 text-body font-semibold">{words.plan.sources}</p>
          <ul className="mt-1 space-y-1.5">
            {step.sources.map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <Source source={source} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {step.sourcesLeftOut ? <p className="mt-1 text-body text-ink/80 print:text-black">{step.sourcesLeftOut}</p> : null}
    </article>
  );
}

export function PlanPage({ view, backHref }: { view: PlanView; backHref: string }) {
  return (
    <div className="plan-page px-4 py-6 print:p-0">
      {/* The bar: on screen only. data-region marks the blocks the clutter limit counts. */}
      <div data-plan-bar="" data-region="plan-bar" className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="font-mono text-body text-stone transition hover:text-paper">
          {words.plan.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body text-stone">{words.plan.printHelp}</span>
          <PrintButton label={words.plan.print} />
        </div>
      </div>

      <article className="mx-auto grid max-w-[820px] gap-6 rounded-md bg-paper p-6 text-body leading-relaxed text-ink md:p-10 print:max-w-none print:rounded-none print:bg-white print:p-0 print:text-black">
        <header data-region="plan-header">
          <p className="font-mono text-small uppercase tracking-[0.14em] text-ink/70 print:text-black">{view.title}</p>
          <h1 className="mt-1 font-serif text-display font-bold leading-tight tracking-tight">{view.ideaName}</h1>
          <p className="mt-1 text-body text-ink/80 print:text-black">{view.made}</p>
          {/* The standing line on page 1 as well as the last page, for a page handed over on its own. */}
          <p className="mt-2 text-body italic text-ink/80 print:text-black">{view.notAdvice}</p>
        </header>

        <Section id="words" index={0}>
          {view.words.map((said) => (
            <blockquote key={said.line} className="mb-3">
              <p className="font-serif text-title italic">“{said.text}”</p>
              <p className="text-body text-ink/80 print:text-black">{said.line}</p>
            </blockquote>
          ))}
          {view.wordsNone ? <p>{view.wordsNone}</p> : null}
          {view.target ? <p className="mt-2">{view.target}</p> : null}
        </Section>

        <Section id="road" index={1}>
          <p>{view.road.future}</p>
          <p>{view.road.picked}</p>
          {view.road.where.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <ul className="mt-2 list-disc pl-5">
            {view.road.endings.map((ending) => (
              <li key={ending}>{ending}</li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">{words.plan.gauges}</h3>
          {/* Two by two from 1024 px and on paper; one under another below that (2026-10-23), so on a tablet the
              contents list under Each step starts below the first window, which may hold only the bar's two
              controls (e2e/budgets.ts). */}
          <dl className="mt-1 grid gap-2 lg:grid-cols-2 print:grid-cols-2">
            {view.road.gauges.map((gauge) => (
              <div key={gauge.label} className="rounded-sm border border-ink/15 p-3 print:break-inside-avoid print:border-black/30">
                <dt className="font-mono text-small uppercase tracking-[0.1em] text-ink/70 print:text-black">{gauge.label}</dt>
                <dd>{gauge.value}</dd>
                {gauge.lines.map((line) => (
                  <dd key={line} className="text-body text-ink/80 print:text-black">
                    {line}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </Section>

        <Section id="steps" index={2}>
          {/* The contents list of the plan's steps, each a link to its step (the screen review of 2026-10-23: the
              plan was 42,553 px tall on a phone). At the top of the steps rather than of the plan: the plan's first
              window may hold two controls (e2e/budgets.ts), and a link per step there would be far more. */}
          <nav aria-label={words.plan.contents} className="mb-4 print:hidden">
            <p className="font-semibold">{words.plan.contents}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {view.steps.columns
                .flatMap((column) => column.steps)
                .map((step) => (
                  <li key={step.id}>
                    <a href={`#plan-step-${step.id}`} className="text-spruce underline underline-offset-2">
                      {step.label}
                    </a>
                  </li>
                ))}
            </ol>
          </nav>
          <p className="mb-3 text-body italic">{view.steps.order}</p>
          <div className="grid gap-5">
            {view.steps.columns.map((column) => (
              <div key={column.label}>
                <h3 className="font-serif text-title font-bold">{column.label}</h3>
                <p className="mb-2 text-body">{column.summary}</p>
                <div className="grid gap-3">
                  {column.steps.map((step) => (
                    <Step key={step.id} step={step} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="skills" index={3}>
          <h3 className="font-semibold">{words.lists.roadItemsTitle}</h3>
          {view.skills.roadNone ? <p>{view.skills.roadNone}</p> : null}
          <ul className="mt-1 list-disc pl-5">
            {view.skills.road.map((skill) => (
              <li key={skill.label}>
                {skill.label} ({skill.kind}): {skill.mark}
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">{words.lists.ownTitle}</h3>
          {view.skills.ownNone ? <p>{view.skills.ownNone}</p> : null}
          <ul className="mt-1 list-disc pl-5">
            {view.skills.own.map((skill) => (
              <li key={skill.label}>
                {skill.label}: {skill.mark} · {skill.day}
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">{words.lists.job.title}</h3>
          {view.skills.noJob ? <p>{view.skills.noJob}</p> : null}
          {view.skills.job ? (
            <>
              <p>{view.skills.job.title}</p>
              <ul className="mt-1 list-disc pl-5">
                {view.skills.job.items.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.mark}
                  </li>
                ))}
              </ul>
              <p className="mt-1">{view.skills.job.notMarked}</p>
              <p className="mt-1 text-body text-ink/80 print:text-black">{view.skills.job.attribution}</p>
            </>
          ) : null}
        </Section>

        <Section id="money" index={4}>
          <ul className="mb-3 list-disc pl-5">
            {view.money.sums.map((sum) => (
              <li key={sum}>{sum}</li>
            ))}
          </ul>
          {view.money.none ? <p>{view.money.none}</p> : null}
          <div className="grid gap-4">
            {view.money.byStep.map((group) => (
              <div key={group.step} className="print:break-inside-avoid">
                <h3 className="font-semibold">{group.step}</h3>
                {group.note ? <p className="text-body italic">{group.note}</p> : null}
                <ul className="mt-1 space-y-2">
                  {group.lines.map((line) => (
                    <li key={line.lineId} className="rounded-sm border border-ink/15 p-2 print:border-black/30">
                      <p className="flex flex-wrap justify-between gap-x-4">
                        <span>{line.label}</span>
                        {/* A blank has no amount at all, never $0: its kind says it isn't priced yet. */}
                        <span className="font-mono tabular-nums">{line.amount ?? ""}</span>
                      </p>
                      <p className="text-body uppercase tracking-wider text-ink/70 print:text-black">{line.kind}</p>
                      {line.note ? <p className="text-body">{line.note}</p> : null}
                      {line.source ? (
                        <div className="mt-1">
                          <Source source={line.source} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="told" index={5}>
          {view.told.none ? <p>{view.told.none}</p> : null}
          <ul className="space-y-2">
            {view.told.rows.map((row) => (
              <li key={row.said} className="print:break-inside-avoid">
                <p>
                  {row.said} · <span className="text-ink/80 print:text-black">{row.day}</span>
                </p>
                {row.unlocked.length > 0 ? (
                  <ul className="list-disc pl-5 text-body text-ink/80 print:text-black">
                    {row.unlocked.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="notAdvice" index={6}>
          <p>{view.notAdvice}</p>
        </Section>
      </article>
    </div>
  );
}

/**
 * The data file couldn't be read just now (locked by another program, say). The idea may well be there,
 * so the page says the read failed and nothing changed, never that the idea is gone, and offers the way
 * back to the same idea's cockpit.
 */
export function PlanReadFailed({ backHref }: { backHref: string }) {
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-[620px] text-center">
        <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.plan.title}</p>
        <p className="mt-3 text-lead text-paper-dim">{words.plan.readFailed}</p>
        <Link href={backHref} className="mt-4 inline-block text-body text-maple hover:underline">
          {words.plan.back}
        </Link>
      </div>
    </div>
  );
}

/** No idea with that id: say so, and offer every saved idea. */
export function PlanNotFound() {
  return (
    <div className="plan-page px-4 py-10">
      <div className="mx-auto max-w-[620px] text-center">
        <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.plan.title}</p>
        <p className="mt-3 text-lead text-paper-dim">{words.plan.notFound}</p>
        <Link href="/ventures" className="mt-4 inline-block text-body text-maple hover:underline">
          {words.allFutures}
        </Link>
      </div>
    </div>
  );
}
