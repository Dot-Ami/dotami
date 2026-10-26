"use client";

import Link from "next/link";

import type { IssueView } from "@/lib/query";
import { PLACES } from "@/lib/demo/world";
import { locatorText } from "@/lib/locator";
import { usePlace } from "@/lib/place";

import { CONFIDENCE_LABEL, Pill } from "./badges";

/** Who might be affected, with the person's own place (if they set one) shown first. */
export function AffectedList({ groups }: { groups: IssueView["affected"] }) {
  const place = usePlace();
  const ordered = place
    ? [...groups].sort((a, b) => Number(b.zones.includes(place)) - Number(a.zones.includes(place)))
    : groups;
  const label = PLACES.find((p) => p.id === place)?.label;
  return (
    <div>
      <p className="text-sm text-muted" aria-live="polite">
        {label ? (
          <>
            Shown first for where you said you are: <strong>{label}</strong>.{" "}
            <Link href="/">Change</Link>
          </>
        ) : (
          <>
            You haven&rsquo;t said where you are, so every group is shown in the same order.{" "}
            <Link href="/">Set a place</Link>
          </>
        )}
      </p>
      <ul className="mt-2 space-y-2">
        {ordered.map((g) => (
          <li
            key={g.id}
            className={`rounded border bg-card p-3 ${place && g.zones.includes(place) ? "border-doc" : "border-line"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong>{g.group}</strong>
              <Pill
                tone={
                  g.confidence === "documented"
                    ? "doc"
                    : g.confidence === "not-assessed"
                      ? "plain"
                      : "open"
                }
              >
                Confidence: {CONFIDENCE_LABEL[g.confidence]}
              </Pill>
            </div>
            <p className="mt-1">{g.how}</p>
            {g.basis.length > 0 && (
              <p className="mt-1 text-sm text-muted">
                Based on:{" "}
                {g.basis.map((b, i) => (
                  <span key={b.href}>
                    {i > 0 && "; "}
                    <Link href={b.href}>
                      {b.sourceTitle.split(":")[0]}, {locatorText(b.locator)}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
