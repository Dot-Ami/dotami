"use client";

import { Pill } from "@/components/ui";
import { sortStatementsNewestFirst, STATEMENT_MAX_CHARS, type PersonStatement } from "@/lib/person/types";
import { useCallback, useEffect, useState } from "react";

/**
 * "In your words" — what DotAmi holds about the person, shown back verbatim (S2.5.4a).
 *
 * One component, two mounts: the intake "About you" screen (`variant="full"`) and the
 * cockpit left rail (`variant="rail"`). Reads GET /api/person/statements (typed rows +
 * the vault, newest first) and appends via POST. Deliberately holds NO venture state and
 * never touches the journey draft — the evaluator cannot see anything here, by construction.
 *
 * Fail-soft is on-surface: no database → "saving is off" and the statement stays in this
 * tab (sessionStorage) tagged as unsaved; no vault → one line saying so. An empty list is
 * never silently indistinguishable from "couldn't load".
 */

type Availability = { available: boolean; reason?: string };

interface StatementsPayload {
  statements: PersonStatement[];
  db: Availability;
  vault: Availability;
}

const UNSAVED_KEY = "dotami-person-unsaved";

function readUnsaved(): PersonStatement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(UNSAVED_KEY);
    return raw ? (JSON.parse(raw) as PersonStatement[]) : [];
  } catch {
    return [];
  }
}

function writeUnsaved(items: PersonStatement[]) {
  try {
    sessionStorage.setItem(UNSAVED_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked — the in-memory list still renders for this page life.
  }
}

/** The person's LOCAL calendar day — `toISOString()` is UTC and reads as tomorrow in the evening anywhere west of UTC. */
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA"); // en-CA formats as YYYY-MM-DD
}

function sourceLabel(s: PersonStatement): string {
  if (s.source === "vault") return `vault · ${s.sourceRef}`;
  return s.persisted === false ? "typed · not saved" : "typed here";
}

export function PersonStatements({ variant = "full" }: { variant?: "full" | "rail" }) {
  const [loaded, setLoaded] = useState<StatementsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState<PersonStatement[]>([]);
  const [draft, setDraft] = useState("");
  const [saidAt, setSaidAt] = useState(todayIso);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(variant === "full");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/person/statements", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLoaded((await res.json()) as StatementsPayload);
      setLoadError(null);
    } catch {
      setLoadError("Couldn't load what's on record — the server didn't answer.");
    }
  }, []);

  useEffect(() => {
    setUnsaved(readUnsaved());
    void load();
  }, [load]);

  async function handleKeep() {
    const text = draft.trim();
    if (text.length === 0 || saving) return;
    setSaving(true);
    setSaveNote(null);
    try {
      const res = await fetch("/api/person/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, saidAt }),
      });
      const json = (await res.json()) as { ok?: true; statement?: PersonStatement; error?: string };
      if (res.ok && json.statement) {
        setLoaded((prev) =>
          prev
            ? { ...prev, statements: sortStatementsNewestFirst([json.statement!, ...prev.statements]) }
            : prev,
        );
        setDraft("");
        setSaveNote("Kept, with the date.");
      } else if (res.status === 400) {
        setSaveNote(json.error ?? "Couldn't keep that.");
      } else {
        keepLocally(text, json.error);
      }
    } catch {
      keepLocally(text, undefined);
    } finally {
      setSaving(false);
    }
  }

  function keepLocally(text: string, reason?: string) {
    const local: PersonStatement = {
      id: `local:${Date.now()}`,
      text,
      saidAt,
      source: "typed",
      sourceRef: "this tab",
      recordedAt: new Date().toISOString(),
      persisted: false,
    };
    const next = [local, ...unsaved];
    setUnsaved(next);
    writeUnsaved(next);
    setDraft("");
    // The status line above already says why; keep this one short.
    setSaveNote(reason ? "Kept in this tab only." : "Server didn't answer — kept in this tab only.");
  }

  const statements = sortStatementsNewestFirst([...unsaved, ...(loaded?.statements ?? [])]);
  const isRail = variant === "rail";

  return (
    <div className={isRail ? "space-y-2.5" : "space-y-5"}>
      {/* Composer */}
      {composerOpen ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, STATEMENT_MAX_CHARS))}
            rows={isRail ? 3 : 4}
            placeholder={
              isRail
                ? "Something about you, in your words…"
                : "Anything you want DotAmi to know about you — how you work, what you won't do, what you're after. Your words, kept as-is."
            }
            className="w-full resize-y rounded-lg border border-rule bg-ink px-3 py-2.5 text-sm text-paper placeholder:text-stone-dim focus:border-maple focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
              Said on
              <input
                type="date"
                value={saidAt}
                max={todayIso()}
                onChange={(e) => setSaidAt(e.target.value)}
                className="rounded border border-rule bg-ink px-1.5 py-0.5 font-mono text-[11px] normal-case tracking-normal text-paper"
              />
            </label>
            <span className="font-mono text-[10px] text-stone-dim">
              {draft.length}/{STATEMENT_MAX_CHARS}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {isRail ? (
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="text-[10px] text-stone hover:text-paper"
                >
                  Cancel
                </button>
              ) : null}
              <Pill variant="maple" size="small" onClick={handleKeep} disabled={saving || draft.trim().length === 0}>
                {saving ? "Keeping…" : "Keep this"}
              </Pill>
            </div>
          </div>
          {saveNote ? (
            <p
              className={`text-[11px] ${
                saveNote.startsWith("Kept, with") ? "text-sage" : "text-amber"
              }`}
            >
              {saveNote}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="rounded border border-rule px-2 py-1 text-[10px] text-stone transition hover:border-maple-soft hover:text-paper"
        >
          + Add something
        </button>
      )}

      {/* Status lines — the guardrails, visible */}
      {loaded && !loaded.db.available ? (
        <p className="text-[11px] text-amber">{loaded.db.reason}</p>
      ) : null}
      {loaded && !loaded.vault.available ? (
        <p className="font-mono text-[10px] text-stone-dim">Vault: {loaded.vault.reason}</p>
      ) : null}
      {loadError ? <p className="text-[11px] text-amber">{loadError}</p> : null}

      {/* The record */}
      {statements.length === 0 ? (
        <p className="text-[11px] text-stone-dim">
          {loaded || loadError ? "Nothing on record yet." : "Loading what's on record…"}
        </p>
      ) : (
        <ul className={isRail ? "space-y-2" : "space-y-3"}>
          {statements.map((s) => {
            const open = expandedId === s.id;
            return (
              <li key={s.id} className="rounded-lg border border-rule-soft bg-ink px-3 py-2.5">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 whitespace-nowrap font-mono text-[10px] tracking-[0.08em] text-stone">{s.saidAt}</span>
                  <span
                    className={`min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.12em] ${
                      s.persisted === false ? "text-amber" : "text-stone-dim"
                    }`}
                  >
                    {sourceLabel(s)}
                  </span>
                  {s.body ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : s.id)}
                      className="ml-auto font-mono text-[11px] text-stone hover:text-paper"
                      aria-label={open ? "Collapse" : "Expand"}
                    >
                      {open ? "−" : "+"}
                    </button>
                  ) : null}
                </div>
                <p className={`mt-1 whitespace-pre-wrap font-serif text-paper ${isRail ? "text-[12.5px] leading-snug" : "text-[15px] leading-relaxed"}`}>
                  {s.text}
                </p>
                {open && s.body ? (
                  <p className="mt-2 whitespace-pre-wrap border-t border-rule-soft pt-2 text-[12px] leading-relaxed text-paper-dim">
                    {s.body}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-dim">
        Shown back as you said it · not scored · not summarised · newer sits above older
      </p>
    </div>
  );
}
