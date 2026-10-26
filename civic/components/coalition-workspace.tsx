"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatDate } from "@/lib/dates";
import { DEMO_CLOCK } from "@/lib/demo/world";
import { clearAll, load, save, type PersonalLogEntry } from "@/lib/local-store";
import type { ClaimStatus, CoalitionSeed } from "@/lib/model";
import { checkText, type Finding } from "@/lib/rules/moderation";

import { KindLabel, Pill, StatusBadge } from "./badges";

/**
 * A working group's space, mocked locally: it starts from the seed in lib/demo/coalition.ts and
 * whatever a viewer adds lives only in their own browser. No accounts, no sharing, no one else
 * sees it. Everything typed goes through the same check as drafts (lib/rules/moderation.ts).
 */
type Task = CoalitionSeed["tasks"][number];
type Note = { id: string; date: string; by: string; text: string };
type Disagreement = CoalitionSeed["disagreements"][number];

interface Local {
  tasks: Task[];
  milestones: Record<string, boolean>;
  notes: Note[];
  disagreements: Disagreement[];
  disclosure: string;
}

export interface StatementCheckView {
  id: string;
  kind: "fact" | "ask" | "view";
  text: string;
  proposedBy: string;
  ok: boolean;
  problems: string[];
  cautions: string[];
  basis: { label: string; href: string }[];
}

export interface CoalitionProps {
  seed: CoalitionSeed;
  objectiveRoute: { title: string; href: string };
  claims: { id: string; proposition: string; status: ClaimStatus; href: string }[];
  statement: {
    title: string;
    paragraphs: StatementCheckView[];
    reviewsDone: number;
    reviewsNeeded: number;
    ready: boolean;
  };
  outcomes: { id: string; date: string; whatWasDone: string; response: string; result: string }[];
}

const empty = (seed: CoalitionSeed): Local => ({
  tasks: seed.tasks,
  milestones: {},
  notes: [],
  disagreements: [],
  disclosure: "",
});

export function CoalitionWorkspace({
  seed,
  objectiveRoute,
  claims,
  statement,
  outcomes,
}: CoalitionProps) {
  const key = `coalition:${seed.id}`;
  const [local, setLocal] = useState<Local>(empty(seed));
  const [personalLog, setPersonalLog] = useState<PersonalLogEntry[]>([]);
  useEffect(() => {
    setLocal({ ...empty(seed), ...load<Partial<Local>>(key, {}) });
    setPersonalLog(load<PersonalLogEntry[]>("personal-log", []));
  }, [key, seed]);

  function update(next: Local) {
    setLocal(next);
    save(key, next);
  }

  const roleLabel = (id: string) => seed.roles.find((r) => r.id === id)?.label ?? id;

  return (
    <div className="space-y-8">
      <section aria-labelledby="objective" className="rounded border border-act bg-act-bg p-4">
        <h2 id="objective" className="font-semibold">
          <KindLabel kind="action">Objective</KindLabel>
        </h2>
        <p className="mt-1 text-lg">{seed.objective}</p>
        <p className="mt-1 text-sm">
          Pursued through: <Link href={objectiveRoute.href}>{objectiveRoute.title}</Link>
        </p>
      </section>

      <section aria-labelledby="rules" className="rounded border border-line bg-card p-4 text-sm">
        <h2 id="rules" className="font-semibold">
          Ground rules (checked on everything typed here)
        </h2>
        <ul className="mt-1 list-disc pl-5">
          <li>No one&rsquo;s contact details, home address or family. Not even your own.</li>
          <li>
            Questions, not accusations. Allegations about a person go to the body that decides them.
          </li>
          <li>
            Facts in the position statement need evidence. Asks and views are labelled as asks and
            views.
          </li>
          <li>
            Everyone discloses relevant affiliations. Disagreements are logged, never deleted.
          </li>
        </ul>
      </section>

      <section aria-labelledby="statement">
        <h2 id="statement" className="text-xl font-semibold">
          {statement.title}
        </h2>
        <p className="mt-1 text-sm" data-testid="statement-readiness">
          <Pill tone={statement.ready ? "act" : "open"}>
            {statement.ready ? "Ready to send (after your own approval)" : "Not ready"}
          </Pill>{" "}
          Reviews: {statement.reviewsDone} of {statement.reviewsNeeded} · held back:{" "}
          {statement.paragraphs.filter((p) => !p.ok).length} paragraph(s)
        </p>
        <ol className="mt-3 space-y-3">
          {statement.paragraphs.map((p) => (
            <li
              key={p.id}
              className={`rounded border p-3 ${p.ok ? "border-line bg-card" : "border-warn bg-warn-bg"}`}
              data-paragraph={p.id}
              data-ok={p.ok}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <KindLabel
                  kind={
                    p.kind === "fact"
                      ? "documented"
                      : p.kind === "ask"
                        ? "action"
                        : "interpretation"
                  }
                >
                  {p.kind === "fact" ? "Stated as fact" : p.kind === "ask" ? "Ask" : "View"}
                </KindLabel>
                <span className="text-muted">Proposed by {p.proposedBy}</span>
                {!p.ok && <Pill tone="warn">Held back</Pill>}
              </p>
              <p className={`mt-1 ${p.ok ? "" : "line-through decoration-warn/60"}`}>{p.text}</p>
              {p.basis.length > 0 && (
                <p className="mt-1 text-sm">
                  Rests on:{" "}
                  {p.basis.map((b, i) => (
                    <span key={b.href}>
                      {i > 0 && "; "}
                      <Link href={b.href}>{b.label}</Link>
                    </span>
                  ))}
                </p>
              )}
              {p.problems.map((x) => (
                <p key={x} className="mt-1 text-sm text-warn" data-testid="paragraph-problem">
                  {x}
                </p>
              ))}
              {p.cautions.map((x) => (
                <p key={x} className="mt-1 text-sm text-open">
                  {x}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="evidence">
        <h2 id="evidence" className="text-xl font-semibold">
          Shared evidence
        </h2>
        <ul className="mt-2 space-y-1">
          {claims.map((c) => (
            <li key={c.id}>
              <StatusBadge status={c.status} /> <Link href={c.href}>{c.proposition}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="questions">
        <h2 id="questions" className="text-xl font-semibold">
          Open research questions
        </h2>
        <ul className="mt-2 space-y-2">
          {seed.questions.map((q) => (
            <li key={q.id} className="rounded border border-open bg-open-bg p-3">
              <p className="font-semibold">{q.question}</p>
              <p className="text-sm">{q.whyItMatters}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tasks">
        <h2 id="tasks" className="text-xl font-semibold">
          Roles and tasks
        </h2>
        <ul className="mt-1 text-sm text-muted">
          {seed.roles.map((r) => (
            <li key={r.id}>
              <strong className="text-ink">{r.label}:</strong> {r.does}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2" data-testid="task-list">
          {local.tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-2 rounded border border-line bg-card p-2"
            >
              <select
                aria-label={`Status of: ${t.title}`}
                value={t.status}
                onChange={(e) =>
                  update({
                    ...local,
                    tasks: local.tasks.map((x) =>
                      x.id === t.id ? { ...x, status: e.target.value as Task["status"] } : x,
                    ),
                  })
                }
                className="rounded border border-line bg-paper p-1 text-sm"
              >
                <option value="open">Open</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
              <span className={t.status === "done" ? "text-muted line-through" : ""}>
                {t.title}
              </span>
              <Pill>{roleLabel(t.roleId)}</Pill>
            </li>
          ))}
        </ul>
        <AddForm
          label="Add a task"
          testId="add-task"
          onAdd={(text) =>
            update({
              ...local,
              tasks: [
                ...local.tasks,
                { id: `local-${Date.now()}`, title: text, roleId: "researcher", status: "open" },
              ],
            })
          }
        />
      </section>

      <section aria-labelledby="members">
        <h2 id="members" className="text-xl font-semibold">
          Members and disclosed affiliations
        </h2>
        <p className="text-sm text-muted">
          Pseudonyms only. A role and a disclosure are what the group needs, not an identity.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {seed.members.map((m) => (
            <li key={m.id}>
              <strong>{m.pseudonym}</strong> ({roleLabel(m.roleId)}): {m.disclosure}
            </li>
          ))}
          {local.disclosure && (
            <li>
              <strong>You</strong> (this browser only): {local.disclosure}
            </li>
          )}
        </ul>
        <AddForm
          label="Your disclosure"
          testId="add-disclosure"
          button="Save"
          onAdd={(text) => update({ ...local, disclosure: text })}
        />
      </section>

      <section aria-labelledby="disagreements">
        <h2 id="disagreements" className="text-xl font-semibold">
          Corrections and disagreements
        </h2>
        <ul className="mt-2 space-y-2">
          {[...seed.disagreements, ...local.disagreements].map((d) => (
            <li key={d.id} className="rounded border border-line bg-card p-3 text-sm">
              <p className="text-muted">
                {formatDate(d.date)} · {d.by} · about: {d.about}
              </p>
              <p>{d.text}</p>
              {d.resolution && (
                <p className="mt-1">
                  <strong>Where it stands:</strong> {d.resolution}
                </p>
              )}
            </li>
          ))}
        </ul>
        <AddForm
          label="Log a disagreement or correction"
          testId="add-disagreement"
          onAdd={(text) =>
            update({
              ...local,
              disagreements: [
                ...local.disagreements,
                {
                  id: `local-${Date.now()}`,
                  date: DEMO_CLOCK,
                  by: "You",
                  about: "your note",
                  text,
                  resolution: "",
                },
              ],
            })
          }
        />
      </section>

      <section aria-labelledby="milestones">
        <h2 id="milestones" className="text-xl font-semibold">
          Milestones
        </h2>
        <ul className="mt-2 space-y-1">
          {seed.milestones.map((m) => {
            const done = local.milestones[m.id] ?? m.done;
            return (
              <li key={m.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) =>
                      update({
                        ...local,
                        milestones: { ...local.milestones, [m.id]: e.target.checked },
                      })
                    }
                  />
                  <span className={done ? "text-muted line-through" : ""}>
                    {m.title} · {m.date ? formatDate(m.date) : "date not known"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="outcomes">
        <h2 id="outcomes" className="text-xl font-semibold">
          Outcome log
        </h2>
        <ol className="mt-2 space-y-2 text-sm">
          {outcomes.map((o) => (
            <li key={o.id} className="rounded border border-line bg-card p-3">
              <p className="text-muted">{formatDate(o.date)}</p>
              <p>{o.whatWasDone}</p>
              <p>
                Response: {o.response} <Pill>{o.result.replace("-", " ")}</Pill>
              </p>
            </li>
          ))}
          {personalLog.map((p) => (
            <li
              key={p.id}
              className="rounded border border-doc bg-card p-3"
              data-testid="personal-log-entry"
            >
              <p className="text-muted">{formatDate(p.date)} · your own entry, this browser only</p>
              <p>{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="notes">
        <h2 id="notes" className="text-xl font-semibold">
          Notes
        </h2>
        <ul className="mt-2 space-y-2" data-testid="notes">
          {local.notes.map((n) => (
            <li key={n.id} className="rounded border border-line bg-card p-2 text-sm">
              <span className="text-muted">{n.by}:</span> {n.text}
            </li>
          ))}
        </ul>
        <AddForm
          label="Add a note"
          testId="add-note"
          onAdd={(text) =>
            update({
              ...local,
              notes: [
                ...local.notes,
                { id: `local-${Date.now()}`, date: DEMO_CLOCK, by: "You", text },
              ],
            })
          }
        />
      </section>

      <section className="rounded border border-line bg-card p-4 text-sm">
        <p>Everything you added here is kept only in this browser.</p>
        <button
          type="button"
          className="mt-2 rounded border border-warn px-3 py-1.5 text-warn"
          onClick={() => {
            clearAll();
            setLocal(empty(seed));
            setPersonalLog([]);
          }}
          data-testid="clear-local"
        >
          Clear everything this browser kept
        </button>
      </section>
    </div>
  );
}

/** A one-line input that runs the content check before anything is kept. */
function AddForm({
  label,
  onAdd,
  testId,
  button = "Add",
}: {
  label: string;
  onAdd: (text: string) => void;
  testId: string;
  button?: string;
}) {
  const [text, setText] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const id = `${testId}-input`;
  return (
    <form
      className="mt-3"
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = text.trim();
        const found = checkText(trimmed);
        setFindings(found);
        if (!trimmed || found.length) return;
        onAdd(trimmed);
        setText("");
      }}
    >
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded border border-line bg-paper p-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-line bg-card px-3 text-sm font-semibold"
        >
          {button}
        </button>
      </div>
      <div aria-live="polite">
        {findings.map((f, i) => (
          <p key={i} className="mt-1 text-sm text-warn" data-testid="blocked-reason">
            Not added. &ldquo;{f.match}&rdquo;: {f.message}
          </p>
        ))}
      </div>
    </form>
  );
}
