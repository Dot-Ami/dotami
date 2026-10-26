import Link from "next/link";

import { formatDate } from "@/lib/dates";
import type { RouteView } from "@/lib/query";
import { VERIFICATION_MAX_AGE_DAYS } from "@/lib/rules/deadlines";

import { ActionDrafter } from "./action-drafter";
import { KindLabel, Pill, StatusBadge } from "./badges";
import { Quote } from "./quote";

const SCALE: Record<RouteView["scale"], string> = {
  individual: "One person",
  coalition: "A group",
  either: "One person or a group",
};

export function ActionCard({ route, issueId }: { route: RouteView; issueId: string }) {
  const check = route.deadline?.check;
  return (
    <article
      id={route.id}
      className="scroll-mt-24 rounded border border-line bg-card p-4"
      data-route={route.id}
      data-deadline-state={check?.state ?? "none"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <KindLabel kind="action" />
        <Pill>{SCALE[route.scale]}</Pill>
        {check?.state === "open" && (
          <Pill tone="act">Open: date checked {check.checkedDaysAgo} day(s) ago</Pill>
        )}
        {check?.state === "check-date" && (
          <Pill tone="warn">Check this date before relying on it</Pill>
        )}
        {check?.state === "closed" && <Pill>Closed</Pill>}
      </div>
      <h3 className="mt-2 text-lg font-semibold">{route.title}</h3>

      <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted">Outcome sought</dt>
        <dd>{route.desiredOutcome}</dd>
        <dt className="text-muted">Who receives it</dt>
        <dd>
          {route.receivedBy}
          {route.authority && route.authority.name !== route.receivedBy && (
            <span className="text-muted"> (for: {route.authority.name})</span>
          )}
        </dd>
        <dt className="text-muted">Process</dt>
        <dd>{route.process.description}</dd>
        <dt className="text-muted">Jurisdiction</dt>
        <dd>{route.jurisdiction}</dd>
        <dt className="text-muted">Who may use it</dt>
        <dd>{route.eligibility}</dd>
        <dt className="text-muted">Deadline</dt>
        <dd data-testid={`deadline-${route.id}`}>
          {route.deadline ? (
            <>
              {check?.state === "open" ? (
                <strong>
                  {formatDate(route.deadline.date)}
                  {route.deadline.time && `, ${route.deadline.time}`}
                </strong>
              ) : (
                <span>
                  {formatDate(route.deadline.date)}
                  {route.deadline.time && `, ${route.deadline.time}`}
                </span>
              )}{" "}
              ({route.deadline.label}).{" "}
              <span className="text-muted">Demo date, not a real deadline.</span>
              <span className="block text-muted">
                {route.deadline.lastVerifiedOn
                  ? `Last checked against its source on ${formatDate(route.deadline.lastVerifiedOn)}.`
                  : "Never checked against its source."}
                {check?.state === "check-date" &&
                  ` That is more than ${VERIFICATION_MAX_AGE_DAYS} days ago, so it isn't shown as a current deadline.`}
                {check?.state === "closed" && " It has passed."}
              </span>
              {route.deadline.derivation && (
                <span className="block text-muted">
                  How it was worked out: {route.deadline.derivation}
                </span>
              )}
            </>
          ) : (
            "No fixed deadline."
          )}
        </dd>
        {route.evidenceRequired.length > 0 && (
          <>
            <dt className="text-muted">What it needs</dt>
            <dd>
              <ul className="list-disc pl-5">
                {route.evidenceRequired.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt className="text-muted">Effort</dt>
        <dd>{route.effort}</dd>
        {route.limitations.length > 0 && (
          <>
            <dt className="text-muted">Limits</dt>
            <dd>
              <ul className="list-disc pl-5">
                {route.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {route.unknowns.length > 0 && (
          <>
            <dt className="text-muted">Not known</dt>
            <dd>
              {route.unknowns.map((u) => (
                <p key={u}>
                  <KindLabel kind="unresolved">Unknown</KindLabel> {u}
                </p>
              ))}
            </dd>
          </>
        )}
        {route.restsOn.length > 0 && (
          <>
            <dt className="text-muted">Rests on</dt>
            <dd>
              <ul className="space-y-1">
                {route.restsOn.map((c) => (
                  <li key={c.id}>
                    <StatusBadge status={c.status} />{" "}
                    <Link href={`/issues/${issueId}/claims/${c.id}`}>{c.proposition}</Link>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt className="text-muted">Next step</dt>
        <dd>{route.nextStep}</dd>
        {route.followUp && (
          <>
            <dt className="text-muted">Follow-up</dt>
            <dd>{route.followUp}</dd>
          </>
        )}
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Where this process is set out
        </summary>
        <div className="mt-2 space-y-2">
          {[...route.processBasis, ...route.eligibilityBasis]
            .filter((p, i, all) => all.findIndex((q) => q.href === p.href) === i)
            .map((p) => (
              <Quote key={p.href} passage={p} compact />
            ))}
        </div>
      </details>

      {route.draftTemplate && check?.state !== "closed" && (
        <div className="mt-3">
          <ActionDrafter
            route={{
              id: route.id,
              title: route.title,
              destinationLabel: route.destinationLabel,
              draftTemplate: route.draftTemplate,
            }}
          />
        </div>
      )}
    </article>
  );
}
