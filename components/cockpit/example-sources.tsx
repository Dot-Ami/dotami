"use client";

import type { ReactNode } from "react";

import { cockpitWords } from "@/lib/cockpit/words";
import type { ExampleFuture } from "@/lib/examples";
import { priceSummary, softwareSummaries, toolsTotalCents } from "@/lib/examples/stats";
import type { Statistic } from "@/lib/examples/types";

const words = cockpitWords.example.sources;

/** The panel's id, for the banner button's aria-controls. */
export const EXAMPLE_SOURCES_ID = "example-sources";

/** A source's link: opens in a new tab, never loaded by the page itself. */
function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-spruce underline underline-offset-2 hover:text-paper">
      {children}
    </a>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{children}</h3>;
}

/** The words seen on the page, word for word, in quotation marks. */
function Seen({ quote }: { quote: string }) {
  return <q className="text-[10.5px] text-stone-dim">{quote}</q>;
}

function StatisticRow({ stat }: { stat: Statistic }) {
  return (
    <li className="rounded-sm border border-rule-soft bg-ink p-2">
      <p className="text-[11.5px] text-paper">{stat.what}</p>
      <p className="text-[11.5px] tabular-nums text-paper">{words.statistic(stat.value, stat.unit, stat.period)}</p>
      <p className="text-[10.5px] text-paper-dim">
        <SourceLink href={stat.url}>{stat.source}</SourceLink> · {words.seen(stat.seenOn)}
      </p>
      <Seen quote={stat.quote} />
      <p className="text-[10.5px] text-stone">{stat.caveat}</p>
    </li>
  );
}

/**
 * "Where these numbers come from" (docs/ui-spec/example/_index.md; since 2026-10-14): every number the
 * example shows and how it is worked out, then every price and statistic behind it with its link, the words
 * seen and the day, then what stayed blank and what was seen but not used. Every average is worked out here
 * by lib/examples/stats.ts from the listed prices, the same function the example's own numbers come from.
 *
 * The tools are listed in the data's order (the Alberta curriculum's), never sorted by price: information,
 * not a ranking. Each tool's prices fold under its average (a native <details>, remembered nowhere).
 */
export function ExampleSources({ example }: { example: ExampleFuture }) {
  const sources = example.sources;
  if (!sources) return null;
  const { data } = sources;
  const person = example.person;
  const stat = (id: string | null) => data.statistics.find((s) => s.id === id) ?? null;
  const income = stat(sources.incomeWantedFrom);
  const whatIf = stat(sources.whatIfFrom);
  const software = softwareSummaries(data.software, data.softwareCategories);

  return (
    <section
      id={EXAMPLE_SOURCES_ID}
      aria-label={words.open}
      className="max-h-[60vh] overflow-y-auto border-b border-amber/40 bg-ink2 px-4 py-3 text-[12px] leading-snug text-paper-dim md:px-[22px]"
    >
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber">{words.open}</h2>
      <p className="mt-1 max-w-3xl">{words.intro(person, data.seenOn)}</p>

      <Heading>{words.numbersHeading(person)}</Heading>
      <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-4">
        {sources.toolsLineId ? <li>{words.tools(person, toolsTotalCents(data.tools), data.tools.length)}</li> : null}
        {income && example.kept.incomeWanted ? (
          <li>
            {words.income(person, example.kept.incomeWanted.amountCents, income.inSentence ?? income.what, income.period)}{" "}
            <SourceLink href={income.url}>{words.page}</SourceLink>
          </li>
        ) : null}
        {whatIf && example.whatIfFirstYearSalesDollars !== null ? (
          <li>
            {words.whatIf(person, example.whatIfFirstYearSalesDollars, whatIf.inSentence ?? whatIf.what, whatIf.period)}{" "}
            <SourceLink href={whatIf.url}>{words.page}</SourceLink>
          </li>
        ) : null}
        <li>{words.blank(person)}</li>
      </ul>

      <Heading>{words.toolsHeading}</Heading>
      <p className="mt-1 max-w-3xl">{words.toolsOrder}</p>
      <p className="mt-1 max-w-3xl text-[11px] text-stone">{data.tier}</p>
      <p className="mt-2 text-[11px] text-paper">{words.officialHeading}</p>
      <ul className="mt-0.5 space-y-0.5 text-[11px]">
        {data.officialSources.map((o) => (
          <li key={o.url}>
            <SourceLink href={o.url}>{o.label}</SourceLink>
          </li>
        ))}
      </ul>
      <ul className="mt-2 space-y-1.5">
        {data.tools.map((tool) => {
          const sum = priceSummary(tool.prices.map((p) => p.priceCents));
          return (
            <li key={tool.id} className="rounded-sm border border-rule-soft bg-ink p-2">
              <details>
                <summary className="cursor-pointer">
                  <span className="font-semibold text-paper">{tool.item}</span>
                  <span className="block pl-4 tabular-nums text-paper-dim">
                    {words.average(sum.count, sum.meanCents, sum.medianCents, sum.lowCents, sum.highCents)}
                  </span>
                </summary>
                <p className="mt-1.5 text-[11px]">
                  {words.named} {tool.official.mention} <Seen quote={tool.official.quote} />{" "}
                  <SourceLink href={tool.official.url}>{words.page}</SourceLink>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {tool.prices.map((p) => (
                    <li key={p.seller} className="border-l border-rule pl-2 text-[11px]">
                      <span className="font-semibold tabular-nums text-paper">{words.price(p.priceCents)}</span> · {p.seller} ·{" "}
                      {words.seen(p.seenOn)} · <SourceLink href={p.url}>{words.page}</SourceLink>
                      <span className="block">{p.product}</span>
                      <Seen quote={p.quote} />
                      {p.caution ? (
                        <span className="block text-amber">
                          {words.caution} {p.caution}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      <Heading>{words.softwareHeading}</Heading>
      {data.softwareCategories.map((category) => {
        const summary = software.find((s) => s.category === category.id)!;
        const plans = data.software.filter((s) => s.category === category.id);
        return (
          <div key={category.id} className="mt-2">
            <p className="font-semibold text-paper">{category.label}</p>
            <p className="tabular-nums">
              {summary.monthly
                ? words.softwareAverage(
                    summary.monthly.count,
                    summary.monthly.meanCents,
                    summary.monthly.medianCents,
                    summary.monthly.lowCents,
                    summary.monthly.highCents,
                  )
                : words.softwareNoPaid}
            </p>
            <ul className="mt-1 space-y-1">
              {plans.map((plan) => (
                <li key={`${plan.product} ${plan.plan}`} className="border-l border-rule pl-2 text-[11px]">
                  <span className="font-semibold tabular-nums text-paper">
                    {plan.per === "free" ? words.per.free : words.per[plan.per](plan.priceCents)}
                  </span>{" "}
                  · {plan.product}, {plan.plan} · {words.seen(plan.seenOn)} · <SourceLink href={plan.url}>{words.page}</SourceLink>
                  <span className="block">{plan.note}</span>
                  <Seen quote={plan.quote} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {(["earnings", "industry", "space"] as const).map((group) => (
        <div key={group}>
          <Heading>{words.groups[group]}</Heading>
          <ul className="mt-1 space-y-1.5">
            {data.statistics
              .filter((s) => s.group === group)
              .map((s) => (
                <StatisticRow key={s.id} stat={s} />
              ))}
          </ul>
        </div>
      ))}

      <Heading>{words.notPricedHeading}</Heading>
      <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-4">
        {data.notPriced.map((n) => (
          <li key={n.what}>
            <span className="text-paper">{n.what}:</span> {n.why}
          </li>
        ))}
      </ul>
      <Heading>{words.leftOutHeading}</Heading>
      <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-4">
        {data.leftOut.map((n) => (
          <li key={n.what}>
            <span className="text-paper">{n.what}:</span> {n.why}
          </li>
        ))}
      </ul>
    </section>
  );
}
