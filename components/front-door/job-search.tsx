"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { JobSearch, JobSearchHit } from "@/lib/engines/oasis/v2026/title-search";
import { OASIS_ATTRIBUTION, OASIS_LICENCE_URL } from "@/lib/engines/oasis/v2026/licence";
import {
  groupHeading,
  groupOrderLine,
  leftOutLine,
  matchedLine,
  onlyLeftOutWords,
  partHeading,
  searchBoxStatusLine,
  showGroupName,
  showsEnglishOnly,
} from "@/lib/front-door/job-search-lines";
import { jobStepWords as words } from "@/lib/front-door/words";
import { cn } from "@/lib/utils/cn";

/** A short pause after the last key before the search runs, so the status line isn't read on every key. */
const PAUSE_MS = 250;

/**
 * The one job picker (docs/ui-spec/futures/01-whats-closest-to-your-work.md): a search box over the government's
 * example job titles, and the jobs whose titles hold the person's words, grouped by how many they hold, each
 * group labelled, in code order inside, DotAmi's word list's finds in their own last group. Used by step 1 of the
 * three steps (Pick a future and the intake) and by the cockpit's skills list, so there is one search.
 *
 * The search runs on DotAmi's own server (`POST /api/jobs/search`), so the titles never go into the page's code;
 * only the types are imported here. Nothing is picked until the person clicks a job: no job is pre-selected,
 * highlighted or ordered by anything but the count of their words and the government's code. The typed words stay
 * in the box, in the page's memory, and are never kept.
 */
export function JobSearchBox({
  onPick,
  disabled = false,
  compact = false,
  attribution = true,
}: {
  onPick: (job: { code: string; label: string }) => void;
  disabled?: boolean;
  /** The cockpit's narrow panel: smaller spacing, the same words and results. */
  compact?: boolean;
  /** Draw the licence's attribution line with the results; the cockpit's skills list draws its own. */
  attribution?: boolean;
}) {
  const boxId = useId();
  const hintId = useId();
  const [query, setQuery] = useState("");
  // The answer, with the words it answers, so an answer to older words is never shown under newer ones.
  const [answer, setAnswer] = useState<{ query: string; search: JobSearch } | null>(null);
  // The words whose search couldn't run, so the failure line is said for those words only: new words search
  // again, and the line says it is looking while they do.
  const [failedQuery, setFailedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim() === "") {
      setAnswer(null);
      setFailedQuery(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/jobs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(String(res.status));
          const body = (await res.json()) as { search: JobSearch };
          setAnswer({ query, search: body.search });
          setFailedQuery(null);
        } catch {
          if (!controller.signal.aborted) setFailedQuery(query);
        }
      })();
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const search = answer && answer.query === query ? answer.search : null;
  const typed = query.trim() !== "";
  const notSearched = search ? leftOutLine(search) : null;
  // When every word typed was left out, *Not searched* comes first: it is the reason nothing is listed.
  const notSearchedFirst = search !== null && onlyLeftOutWords(search);
  const notSearchedLine = notSearched ? <p className="text-body text-stone">{notSearched}</p> : null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      <div>
        <label htmlFor={boxId} className={cn("block text-paper", compact ? "text-body" : "mb-1.5 text-lead")}>
          {words.boxLabel}
        </label>
        <input
          id={boxId}
          type="search"
          aria-describedby={hintId}
          value={query}
          disabled={disabled}
          maxLength={200}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-rule bg-ink text-paper outline-hidden focus:border-maple-soft",
            compact ? "mt-1 px-2 py-1 text-body" : "px-3 py-2 text-lead",
          )}
        />
        <p id={hintId} className="mt-1 text-body text-stone-dim">
          {words.boxHint}
        </p>
      </div>

      {notSearchedFirst ? notSearchedLine : null}
      {/* One polite line: that DotAmi is looking while a search waits, then what the list holds (the searching
          line stays the same while the person types, so it isn't read again on every key). */}
      <p role="status" className="text-body text-stone">
        {searchBoxStatusLine({ typed, compact, failed: failedQuery === query, search })}
      </p>

      {notSearchedFirst ? null : notSearchedLine}
      {search && showsEnglishOnly(search) ? <p className="text-body text-stone">{words.englishOnly}</p> : null}
      {search?.state === "results" ? <Groups key={query} search={search} disabled={disabled} compact={compact} onPick={onPick} /> : null}

      {search?.state === "results" ? (
        <div className="space-y-1 text-body text-stone">
          <p>{words.wordStart}</p>
          <p>{words.source}</p>
          {attribution ? (
            <p>
              {OASIS_ATTRIBUTION}{" "}
              <a href={OASIS_LICENCE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-paper">
                {words.licence}
              </a>
            </p>
          ) : null}
        </div>
      ) : compact ? null : (
        <p className="text-body text-stone-dim">{words.source}</p>
      )}
    </div>
  );
}

/** The groups that hold a job: the first open, each later one a button that opens it in place. */
function Groups({
  search,
  disabled,
  compact,
  onPick,
}: {
  search: JobSearch;
  disabled: boolean;
  compact: boolean;
  onPick: (job: { code: string; label: string }) => void;
}) {
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set(search.groups.filter((g) => g.open).map((g) => g.kind)));
  const headings = useRef(new Map<string, HTMLHeadingElement | null>());
  const [focusKind, setFocusKind] = useState<string | null>(null);

  // Opening a group moves focus to its heading (docs/ui-spec/futures/01-whats-closest-to-your-work.md).
  useEffect(() => {
    if (focusKind) headings.current.get(focusKind)?.focus();
  }, [focusKind]);

  const toggle = (kind: string, open: boolean) => {
    setOpened((was) => {
      const now = new Set(was);
      if (open) now.add(kind);
      else now.delete(kind);
      return now;
    });
    setFocusKind(open ? kind : null);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {search.groups.map((group) => {
        const heading = groupHeading(group, search.searched.length);
        if (!opened.has(group.kind)) {
          return (
            <button
              key={group.kind}
              type="button"
              onClick={() => toggle(group.kind, true)}
              className="w-full rounded-lg border border-dashed border-rule px-3 py-2 text-left text-body text-paper-dim hover:border-maple-soft"
            >
              {showGroupName(group)}
            </button>
          );
        }
        return (
          <div key={group.kind}>
            <h3
              tabIndex={-1}
              ref={(el) => void headings.current.set(group.kind, el)}
              className={cn("font-serif font-bold tracking-tight text-paper outline-hidden", compact ? "text-body" : "text-lead")}
            >
              {words.groupCount(heading, group.total)}
            </h3>
            <p className="text-body text-stone">{groupOrderLine(group)}</p>
            {group.parts.length === 0 ? (
              <>
                <ul className="mt-1.5 space-y-1.5">
                  {group.jobs.map((hit) => (
                    <JobButton key={hit.code} hit={hit} disabled={disabled} compact={compact} onPick={onPick} />
                  ))}
                </ul>
                {group.total > group.jobs.length ? <p className="mt-1.5 text-body text-stone">{words.capped(group.jobs.length, group.total)}</p> : null}
              </>
            ) : (
              // Whole words first (a-call-11): each part under its own heading, the whole group open together.
              group.parts.map((part) => {
                const hits = group.jobs.filter((hit) => hit.part === part.kind);
                return (
                  <div key={part.kind} className="mt-2">
                    <h4 className="text-body font-semibold text-paper-dim">{words.groupCount(partHeading(part.kind), part.total)}</h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {hits.map((hit) => (
                        <JobButton key={hit.code} hit={hit} disabled={disabled} compact={compact} onPick={onPick} />
                      ))}
                    </ul>
                    {part.total > hits.length ? <p className="mt-1.5 text-body text-stone">{words.cappedPart(hits.length, part.total)}</p> : null}
                  </div>
                );
              })
            )}
            {group.open ? null : (
              <button type="button" onClick={() => toggle(group.kind, false)} className="mt-1.5 border-b border-rule-soft text-body text-stone hover:text-paper">
                {words.hideGroup(group.total)}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** One job: a button with its name and code, and under it where the person's words were found, heard before the click. */
function JobButton({
  hit,
  disabled,
  compact,
  onPick,
}: {
  hit: JobSearchHit;
  disabled: boolean;
  compact: boolean;
  onPick: (job: { code: string; label: string }) => void;
}) {
  const describedBy = useId();
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-label={words.pickName(hit.label, hit.code)}
        aria-describedby={describedBy}
        onClick={() => onPick({ code: hit.code, label: hit.label })}
        className={cn(
          "w-full rounded-lg border border-rule-soft bg-ink2 text-left hover:border-maple-soft",
          compact ? "px-2 py-1" : "px-3 py-2",
        )}
      >
        <span className="block text-body font-semibold text-paper">{words.result(hit.label, hit.code)}</span>
        <span id={describedBy} className="mt-0.5 block font-mono text-small text-stone">
          {hit.matched ? (
            <>
              {matchedLine(hit.matched)}
              {hit.moreTitles > 0 ? ` ${words.matchedMore(hit.moreTitles)}` : ""}
            </>
          ) : null}
          {hit.viaWordList.map((via) => (
            <span key={`${via.word}·${via.title}`} className="mt-0.5 block">
              <span className="mr-1.5 rounded-sm border border-rule px-1 uppercase tracking-wider">{words.listChip}</span>
              {words.viaList(via.word, via.title)}
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}
