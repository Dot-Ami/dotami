"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import { CantKeepNote } from "@/components/cockpit/example-mode";
import { postJson } from "@/components/ventures/agree-prompt";
import { Pill } from "@/components/ui";
import { isCalendarDay, opensFromDesktop, safeLink, WATCHED_LIMITS } from "@/lib/landscape/links";
import type { AdLink, WatchedBusinessView } from "@/lib/landscape/watched";
import { AD_COST_READ_FROM, AD_LIBRARIES, landscapeWords as words } from "@/lib/landscape/words";

/**
 * "Others in this line of work" (docs/ui-spec/cockpit/landscape.md; docs/architecture/competitive-landscape.md
 * § 6.2), in the cockpit's right-hand panel, one thing at a time like Compare. Built 2026-10-17 as the smallest
 * host for "Businesses you're watching", which the maintainer released that day, so it holds three things only:
 * what their ads cost (the fixed "not published" line, with plain links to the two ad libraries), the person's
 * own list, and the footer. Official counts, the area and industry questions and *Where to look* are their own
 * later tasks.
 *
 * The list is the person's own notes: shown in the order added, never counted against anything, never checked,
 * nothing a business wrote copied in (call 9 A). Every link is http or https only (checked here before sending,
 * by the storage on the way in and again on the way out) and opens in the person's browser with
 * rel="noopener noreferrer"; DotAmi itself requests none of them. The panel talks only to DotAmi's own server,
 * through the page-only routes under /api/futures/<idea id>/watched.
 *
 * On the invented example there is no saved idea: nothing is read, the list stays empty and says why (§ 6.4),
 * and "+ Add a business" is disabled with the example's own note.
 */

/** An ad link row in the form, as typed: checked only when the form is saved. */
interface AdLinkDraft {
  key: number;
  url: string;
  seenOn: string;
}

interface Draft {
  name: string;
  url: string;
  note: string;
  adLinks: AdLinkDraft[];
}

/** Which form is open: none, the add form, or the edit form of one business. */
type FormState = null | { kind: "add" } | { kind: "edit"; id: string };

const heading = "font-mono text-label uppercase tracking-[0.14em] text-stone-dim";
const field = "mt-1 w-full rounded-md border border-rule bg-ink px-2 py-1.5 text-body text-paper focus:border-maple focus:outline-none";
const labelText = "text-body text-stone";
const linkClass = "break-all text-body text-maple hover:underline";
const disabledPill = "disabled:cursor-not-allowed disabled:opacity-50";

/** The person's own link, opened in their browser; DotAmi never requests it. Only http/https reach here. */
function OutsideLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

/** A link from the person's list, with a word when the desktop app wouldn't open it (http, not https). */
function KeptLink({ href }: { href: string }) {
  return (
    <>
      <OutsideLink href={href}>{href}</OutsideLink>
      {opensFromDesktop(href) ? null : <span className="ml-1 text-small text-stone"> ({words.watched.httpOnly})</span>}
    </>
  );
}

export function LandscapePanel({
  ventureId,
  canSave,
  isExample,
  today,
  onClose,
}: {
  /** The saved idea the list belongs to; null on the example or an idea not saved yet (nothing is read). */
  ventureId: string | null;
  /** False while nothing can be kept (the example, or an idea not saved yet): the add button is disabled. */
  canSave: boolean;
  isExample: boolean;
  /** The person's own day, YYYY-MM-DD: where a new ad link's day starts, and the latest day it may be. */
  today: string;
  onClose: () => void;
}) {
  const [businesses, setBusinesses] = useState<WatchedBusinessView[] | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reads the list as kept, so what is shown after a change is what the data file holds, not what was sent.
  const load = useCallback(async () => {
    if (!ventureId) return;
    try {
      const res = await fetch(`/api/futures/${encodeURIComponent(ventureId)}/watched`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setBusinesses(((await res.json()) as { businesses: WatchedBusinessView[] }).businesses);
      setReadFailed(false);
    } catch {
      setReadFailed(true);
    }
  }, [ventureId]);

  useEffect(() => {
    setBusinesses(null);
    setForm(null);
    setStatus("");
    setError(null);
    void load();
  }, [load]);

  const shown = ventureId ? (businesses ?? []) : [];
  // Adding needs a saved idea and a list read back, so the new one lands at the end of what is kept.
  const canAdd = canSave && ventureId !== null && businesses !== null && !readFailed;

  /** Adds (editing null) or edits a business; resolves to the server's refusal, or null once kept and read back. */
  async function save(payload: unknown, editing: string | null): Promise<string | null> {
    if (!ventureId) return words.errors.shape;
    const idea = encodeURIComponent(ventureId);
    const result = editing
      ? await postJson(`/api/futures/${idea}/watched/${encodeURIComponent(editing)}`, payload)
      : await postJson(`/api/futures/${idea}/watched`, payload);
    if (!result.ok) return result.error;
    await load();
    setForm(null);
    setStatus(editing ? words.watched.saved : words.watched.added);
    return null;
  }

  async function remove(id: string) {
    if (!ventureId) return;
    const result = await postJson(`/api/futures/${encodeURIComponent(ventureId)}/watched/${encodeURIComponent(id)}/remove`, {});
    setConfirming(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await load();
    setStatus(words.watched.removed);
  }

  return (
    <section aria-label={words.region} className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-body leading-snug max-lg:border-l-0">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold leading-tight text-paper">{words.region}</h2>
        <button type="button" onClick={onClose} aria-label={words.close} className="rounded-full border border-rule px-2.5 py-1 text-lead text-stone hover:bg-ink2">
          ×
        </button>
      </div>

      {/* What their ads cost: v1's fixed line, where it was read, and the two libraries as plain links. */}
      <div className="mt-5 space-y-2">
        <h3 className="font-semibold text-paper">{words.adCost.heading}</h3>
        <p className="text-body text-paper-dim">{words.adCost.line}</p>
        <p className="text-body text-stone">
          {words.adCost.readFrom}{" "}
          {AD_COST_READ_FROM.map((link, i) => (
            <span key={link.url}>
              {i > 0 ? " · " : null}
              <OutsideLink href={link.url}>{link.label}</OutsideLink>
            </span>
          ))}
        </p>
        <p className="text-body text-paper-dim">{words.adCost.libraries}</p>
        <ul className="space-y-1">
          {AD_LIBRARIES.map((link) => (
            <li key={link.url}>
              <OutsideLink href={link.url}>{`${link.label} ↗`}</OutsideLink>
            </li>
          ))}
        </ul>
        <p className="text-body text-stone">{words.adCost.linksOnly}</p>
      </div>

      {/* Businesses you're watching: the person's own list, in the order added. */}
      <div className="mt-6 space-y-2">
        <h3 className="font-semibold text-paper">{words.watched.heading}</h3>
        <p className="text-body text-paper-dim">{words.watched.line}</p>
        <p className="text-body text-stone">{words.watched.yoursOnly}</p>
        {isExample ? <p className="text-body text-paper-dim">{words.watched.exampleEmpty}</p> : null}
        {!canSave ? <CantKeepNote className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber" /> : null}
        {readFailed ? (
          <p role="alert" className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
            {words.watched.notRead}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
            {error}
          </p>
        ) : null}
        <p role="status" className="text-body text-paper-dim">
          {status}
        </p>

        {ventureId && businesses === null && !readFailed ? <p className="text-body text-stone">{words.watched.loading}</p> : null}
        {/* Always drawn, so the list is there to find even when it is empty (the example's stays empty). */}
        <ul aria-label={words.watched.listName} className="space-y-3">
          {shown.map((b) =>
            form?.kind === "edit" && form.id === b.id ? (
              <li key={b.id} className="rounded-md border border-maple/60 bg-ink2 p-3">
                <BusinessForm
                  name={words.watched.editForm(b.nameAsTyped)}
                  start={{
                    name: b.nameAsTyped,
                    url: b.url ?? "",
                    note: b.note ?? "",
                    adLinks: b.adLinks.map((ad, i) => ({ key: i, url: ad.url, seenOn: ad.seenOn })),
                  }}
                  today={today}
                  onSave={(payload) => save(payload, b.id)}
                  onCancel={() => setForm(null)}
                />
              </li>
            ) : (
              <li key={b.id} className="rounded-md border border-rule bg-ink2 p-3">
                <BusinessRow
                  business={b}
                  canChange={canAdd}
                  confirming={confirming === b.id}
                  onEdit={() => {
                    setConfirming(null);
                    setStatus("");
                    setForm({ kind: "edit", id: b.id });
                  }}
                  onAskRemove={() => setConfirming(b.id)}
                  onKeep={() => setConfirming(null)}
                  onRemove={() => void remove(b.id)}
                />
              </li>
            ),
          )}
        </ul>
        {ventureId && businesses !== null && businesses.length === 0 ? <p className="text-body text-stone">{words.watched.empty}</p> : null}

        {form?.kind === "add" ? (
          <div className="rounded-md border border-maple/60 bg-ink2 p-3">
            <BusinessForm
              name={words.watched.addForm}
              start={{ name: "", url: "", note: "", adLinks: [] }}
              today={today}
              onSave={(payload) => save(payload, null)}
              onCancel={() => setForm(null)}
            />
          </div>
        ) : (
          <Pill
            size="small"
            variant="ghost"
            disabled={!canAdd}
            className={disabledPill}
            onClick={() => {
              setConfirming(null);
              setStatus("");
              setForm({ kind: "add" });
            }}
          >
            {words.watched.add}
          </Pill>
        )}
      </div>

      <p className="mt-8 border-t border-rule pt-3 text-body text-stone">{words.footer}</p>
    </section>
  );
}

/** One business as kept: its name, link, note and ad links, with Edit and Remove (asked once more). */
function BusinessRow({
  business,
  canChange,
  confirming,
  onEdit,
  onAskRemove,
  onKeep,
  onRemove,
}: {
  business: WatchedBusinessView;
  canChange: boolean;
  confirming: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="break-words font-semibold text-paper">{business.nameAsTyped}</h4>
      {business.url ? (
        <p>
          <KeptLink href={business.url} />
        </p>
      ) : null}
      {/* The person's own words, line breaks kept. */}
      {business.note ? <p className="whitespace-pre-wrap break-words text-body text-paper-dim">{business.note}</p> : null}
      {business.adLinks.length > 0 ? (
        <div>
          <p className={heading}>{words.watched.adLinks}</p>
          {business.adLinks.map((ad, i) => (
            <p key={`${i}-${ad.url}`} className="text-body text-paper-dim">
              <KeptLink href={ad.url} /> <span className="text-stone">· {words.watched.seen(ad.seenOn)}</span>
            </p>
          ))}
        </div>
      ) : null}
      {confirming ? (
        <div className="space-y-1.5 rounded-sm border border-amber/40 bg-amber/5 p-2">
          <p className="text-body text-amber">{words.watched.confirmRemove(business.nameAsTyped)}</p>
          <div className="flex gap-1.5">
            <Pill size="small" variant="ghost" onClick={onRemove}>
              {words.watched.yesRemove}
            </Pill>
            <Pill size="small" variant="ghost" onClick={onKeep}>
              {words.watched.keep}
            </Pill>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5 pt-1">
          <Pill size="small" variant="ghost" disabled={!canChange} className={disabledPill} aria-label={words.watched.editFor(business.nameAsTyped)} onClick={onEdit}>
            {words.watched.edit}
          </Pill>
          <Pill size="small" variant="ghost" disabled={!canChange} className={disabledPill} aria-label={words.watched.removeFor(business.nameAsTyped)} onClick={onAskRemove}>
            {words.watched.remove}
          </Pill>
        </div>
      )}
    </div>
  );
}

/**
 * The add and edit form: a name (required), a link, a note, and ad links each with the day seen. The day starts
 * on today and is the person's to change. Checked here with the storage's own rules before anything is sent, so
 * a javascript: link is refused on screen; the server checks again and its words are shown if it refuses.
 */
function BusinessForm({
  name,
  start,
  today,
  onSave,
  onCancel,
}: {
  /** The form's accessible name: "Add a business" or "Edit <name>". */
  name: string;
  start: Draft;
  today: string;
  /** Sends the business; resolves to the server's refusal, or null once kept. */
  onSave: (payload: { nameAsTyped: string; url: string | null; note: string | null; adLinks: AdLink[] }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(start);
  const [nextKey, setNextKey] = useState(start.adLinks.length);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** The same rules as lib/landscape/watched.ts, so the person hears why before anything leaves the form. */
  function check(): { payload: Parameters<typeof onSave>[0] } | { problem: string } {
    const nameAsTyped = draft.name.trim();
    if (nameAsTyped.length === 0 || nameAsTyped.length > WATCHED_LIMITS.name) return { problem: words.errors.name(WATCHED_LIMITS.name) };
    let url: string | null = null;
    if (draft.url.trim() !== "") {
      url = safeLink(draft.url);
      if (url === null) return { problem: words.errors.link };
    }
    const adLinks: AdLink[] = [];
    for (const ad of draft.adLinks) {
      // A row left with no link is dropped, not refused: the person opened it and changed their mind.
      if (ad.url.trim() === "") continue;
      const adUrl = safeLink(ad.url);
      if (adUrl === null) return { problem: words.errors.link };
      if (!isCalendarDay(ad.seenOn) || ad.seenOn > today) return { problem: words.errors.seenOn };
      adLinks.push({ url: adUrl, seenOn: ad.seenOn });
    }
    return { payload: { nameAsTyped, url, note: draft.note.trim() === "" ? null : draft.note, adLinks } };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const checked = check();
    if ("problem" in checked) {
      setProblem(checked.problem);
      return;
    }
    setSaving(true);
    const refused = await onSave(checked.payload);
    setSaving(false);
    setProblem(refused);
  }

  const setAd = (key: number, change: Partial<AdLinkDraft>) =>
    setDraft((d) => ({ ...d, adLinks: d.adLinks.map((ad) => (ad.key === key ? { ...ad, ...change } : ad)) }));

  return (
    <form aria-label={name} onSubmit={submit} noValidate className="space-y-2.5">
      <label className="block">
        <span className={labelText}>{words.watched.name}</span>
        <input
          className={field}
          value={draft.name}
          maxLength={WATCHED_LIMITS.name}
          aria-describedby={`${id}-name-hint`}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <span id={`${id}-name-hint`} className="mt-0.5 block text-small text-stone">
          {words.watched.nameHint}
        </span>
      </label>
      <label className="block">
        <span className={labelText}>{words.watched.link}</span>
        <input className={field} type="url" inputMode="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
      </label>
      <label className="block">
        <span className={labelText}>{words.watched.note}</span>
        <textarea className={`${field} min-h-16`} value={draft.note} maxLength={WATCHED_LIMITS.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      </label>

      <fieldset className="space-y-2">
        <legend className={heading}>{words.watched.adLinks}</legend>
        {draft.adLinks.map((ad, i) => (
          <div key={ad.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <label className="block">
              <span className={labelText}>{words.watched.adLink(i + 1)}</span>
              <input className={field} type="url" inputMode="url" value={ad.url} onChange={(e) => setAd(ad.key, { url: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelText}>{words.watched.seenOn(i + 1)}</span>
              <input className={field} type="date" max={today} value={ad.seenOn} onChange={(e) => setAd(ad.key, { seenOn: e.target.value })} />
            </label>
            <div className="col-span-2">
              <button
                type="button"
                className="text-body text-stone underline decoration-rule underline-offset-4 hover:text-paper"
                onClick={() => setDraft((d) => ({ ...d, adLinks: d.adLinks.filter((x) => x.key !== ad.key) }))}
              >
                {words.watched.removeAdLink(i + 1)}
              </button>
            </div>
          </div>
        ))}
        {draft.adLinks.length < WATCHED_LIMITS.adLinks ? (
          <Pill
            size="small"
            variant="ghost"
            onClick={() => {
              // A new ad link's day starts on today; the person can change it.
              setDraft((d) => ({ ...d, adLinks: [...d.adLinks, { key: nextKey, url: "", seenOn: today }] }));
              setNextKey((k) => k + 1);
            }}
          >
            {words.watched.addAdLink}
          </Pill>
        ) : null}
      </fieldset>

      {problem ? (
        <p role="alert" className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
          {problem}
        </p>
      ) : null}
      <div className="flex gap-1.5">
        <Pill type="submit" size="small" variant="maple-out" disabled={saving} className={disabledPill}>
          {saving ? words.watched.saving : words.watched.save}
        </Pill>
        <Pill size="small" variant="ghost" onClick={onCancel}>
          {words.watched.cancel}
        </Pill>
      </div>
    </form>
  );
}
