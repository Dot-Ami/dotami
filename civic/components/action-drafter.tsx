"use client";

import { useEffect, useMemo, useState } from "react";

import { DEMO_CLOCK } from "@/lib/demo/world";
import { load, save, type PersonalLogEntry } from "@/lib/local-store";
import type { ActionRoute } from "@/lib/model";
import {
  prepareHandoff,
  textFingerprint,
  unfilledPlaceholders,
  type Approval,
} from "@/lib/rules/approval";
import { checkText } from "@/lib/rules/moderation";

/**
 * Draft → review → approve → copy and send it yourself. The last step is the person's own: the
 * prototype has no way to send anything, and prepareHandoff (lib/rules/approval.ts) won't even
 * hand back final text until the person has approved this exact text for this destination.
 */
type Step = "closed" | "drafting" | "reviewing";

export function ActionDrafter({
  route,
}: {
  route: Pick<ActionRoute, "id" | "title" | "destinationLabel" | "draftTemplate"> &
    Partial<ActionRoute>;
}) {
  const draftKey = `draft:${route.id}`;
  const [step, setStep] = useState<Step>("closed");
  const [text, setText] = useState(route.draftTemplate ?? "");
  const [readIt, setReadIt] = useState(false);
  const [destinationOk, setDestinationOk] = useState(false);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setText(load(draftKey, route.draftTemplate ?? ""));
  }, [draftKey, route.draftTemplate]);

  const findings = useMemo(() => checkText(text), [text]);
  const placeholders = unfilledPlaceholders(text);
  // Only for the gate's verdict: approval is recorded explicitly below, never inferred.
  const gate = prepareHandoff(route as ActionRoute, text, approval);

  function edit(value: string) {
    setText(value);
    save(draftKey, value);
    setCopied(false);
  }

  function approve() {
    setApproval({
      routeId: route.id,
      confirmedDestination: destinationOk,
      confirmedText: readIt,
      fingerprint: textFingerprint(text),
    });
  }

  function logSent() {
    const log = load<PersonalLogEntry[]>("personal-log", []);
    log.push({
      id: `${Date.now()}`,
      date: DEMO_CLOCK,
      routeId: route.id,
      text: `I sent: ${route.title}`,
    });
    save("personal-log", log);
    setLogged(true);
  }

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStep("drafting")}
        className="rounded border border-act bg-act-bg px-3 py-1.5 font-semibold text-act"
        data-testid={`start-draft-${route.id}`}
      >
        Start a draft
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-act p-3" data-testid={`drafter-${route.id}`}>
      <p className="text-sm text-muted">
        Your draft stays in this browser. Rewrite it in your own words; the template is a starting
        point, not a script.
      </p>
      <label htmlFor={`draft-${route.id}`} className="mt-2 block font-semibold">
        Draft
      </label>
      <textarea
        id={`draft-${route.id}`}
        value={text}
        onChange={(e) => edit(e.target.value)}
        readOnly={step === "reviewing" && gate.allowed}
        rows={10}
        className="mt-1 w-full rounded border border-line bg-paper p-2 font-mono text-sm"
      />
      <div aria-live="polite" className="mt-1 space-y-1 text-sm">
        {placeholders.length > 0 && (
          <p className="text-open">
            {placeholders.length} part(s) in [square brackets] still to fill in or remove.
          </p>
        )}
        {findings.map((f, i) => (
          <p key={i} className="text-warn" data-testid="draft-finding">
            &ldquo;{f.match}&rdquo;: {f.message}
          </p>
        ))}
      </div>

      {step === "drafting" && (
        <button
          type="button"
          onClick={() => setStep("reviewing")}
          className="mt-2 rounded border border-line bg-card px-3 py-1.5 font-semibold"
        >
          Review before sending
        </button>
      )}

      {step === "reviewing" && (
        <div className="mt-3 rounded border border-line bg-card p-3">
          <h4 className="font-semibold">Check before anything leaves your hands</h4>
          <p className="mt-1 text-sm">
            It would go to: <strong>{route.destinationLabel}</strong>
          </p>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={destinationOk}
              onChange={(e) => setDestinationOk(e.target.checked)}
              data-testid="confirm-destination"
            />
            That is who I mean to send it to, and I will send it myself.
          </label>
          <label className="mt-1 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={readIt}
              onChange={(e) => setReadIt(e.target.checked)}
              data-testid="confirm-read"
            />
            I have read the whole text and it says what I mean.
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!readIt || !destinationOk}
              onClick={approve}
              className="rounded bg-act px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-black"
              data-testid="approve"
            >
              Approve this text
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("drafting");
                setApproval(null);
              }}
              className="rounded border border-line px-3 py-1.5"
            >
              Keep editing
            </button>
          </div>

          <div aria-live="polite" className="mt-3">
            {gate.allowed ? (
              <div className="rounded border border-act bg-act-bg p-3" data-testid="handoff">
                <p className="font-semibold">Approved. Nothing has been sent.</p>
                <p className="text-sm">
                  This prototype can&rsquo;t send anything, and a real version would never send
                  without asking. Copy the text and send it yourself through the official process.
                  (Here the destination is fictional, so there is nowhere to send it.)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-act px-3 py-1.5"
                    onClick={() =>
                      navigator.clipboard?.writeText(gate.handoff.text).then(
                        () => setCopied(true),
                        () => setCopied(false),
                      )
                    }
                  >
                    {copied ? "Copied" : "Copy text"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-line px-3 py-1.5"
                    onClick={logSent}
                    disabled={logged}
                    data-testid="log-sent"
                  >
                    {logged ? "Logged in this browser" : "I sent it myself: log it"}
                  </button>
                </div>
              </div>
            ) : (
              approval && (
                <ul className="list-disc pl-5 text-sm text-warn" data-testid="gate-reasons">
                  {gate.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
