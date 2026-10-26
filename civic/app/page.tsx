import Link from "next/link";

import { Pill } from "@/components/badges";
import { PlacePicker } from "@/components/place-picker";
import { StatusLegend } from "@/components/status-legend";
import { formatDate } from "@/lib/dates";
import { JURISDICTIONS } from "@/lib/demo/world";
import { searchIssues } from "@/lib/query";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; where?: string }>;
}) {
  const { q = "", where = "" } = await searchParams;
  const results = searchIssues(q, where);
  const searched = q.trim() !== "" || where !== "";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          What is being decided, what can be established, and who can change it?
        </h1>
        <p className="mt-2 max-w-3xl text-muted">
          Pick a public decision. See what each source says, what the evidence actually supports,
          what is still unknown, who has the authority to decide, and the verified ways people can
          take part, with what happened when they did.
        </p>
      </section>

      <form
        role="search"
        action="/"
        className="flex flex-col gap-3 rounded border border-line bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="q" className="block font-semibold">
            Search issues
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="for example: air quality, rezoning, school"
            className="mt-1 w-full rounded border border-line bg-paper p-2"
          />
        </div>
        <div>
          <label htmlFor="where" className="block font-semibold">
            Jurisdiction
          </label>
          <select
            id="where"
            name="where"
            defaultValue={where}
            className="mt-1 w-full rounded border border-line bg-paper p-2"
          >
            <option value="">Any</option>
            {JURISDICTIONS.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-doc px-4 py-2 font-semibold text-white dark:text-black"
        >
          Search
        </button>
      </form>

      <section aria-labelledby="results">
        <h2 id="results" className="text-lg font-semibold">
          {searched ? `Results (${results.length})` : "Issues in this prototype"}
        </h2>
        {results.length === 0 ? (
          <div className="mt-2 rounded border border-open bg-open-bg p-4" data-testid="no-results">
            <p className="font-semibold">No issue matches{q ? ` “${q}”` : ""}.</p>
            <p className="mt-1 text-sm">
              This prototype holds one researched demo issue and one listed but unresearched one. It
              can&rsquo;t tell you anything about a topic it has no reviewed evidence for, and it
              doesn&rsquo;t guess. <Link href="/">Show all issues</Link>.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-3">
            {results.map((issue) => (
              <li key={issue.id} className="rounded border border-line bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/issues/${issue.id}`} className="text-lg font-semibold">
                    {issue.title}
                  </Link>
                  {issue.state === "intake-only" ? (
                    <Pill tone="open">Not researched yet</Pill>
                  ) : (
                    <Pill tone="doc">Researched (demo)</Pill>
                  )}
                </div>
                <p className="mt-1">{issue.oneLine}</p>
                <p className="mt-1 text-sm text-muted">
                  {issue.jurisdictions.join(" · ")}
                  {issue.lastReviewedOn &&
                    ` · ${issue.claimCount} claims · last reviewed ${formatDate(issue.lastReviewedOn)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlacePicker />
      <StatusLegend />
    </div>
  );
}
