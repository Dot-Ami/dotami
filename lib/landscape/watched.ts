import type { Prisma, PrismaClient, WatchedBusiness } from "@prisma/client";

import { requireVenture } from "@/lib/figures/store";
import { dayOnThisComputer } from "@/lib/futures/person";
import { isRecord } from "@/lib/futures/types";

import { isCalendarDay, LINK_MAX, safeLink, WATCHED_LIMITS } from "./links";
import { landscapeWords } from "./words";

/**
 * Businesses you're watching (docs/architecture/competitive-landscape.md § 6.2 item 5, § 7; task S2.5.23i, released
 * by the maintainer on 2026-10-17): the person's own list for one idea. Each business is kept exactly as the
 * person gave it: the name as typed, a link if they have one, their note, and the ads they saw, each with the
 * day they say they saw it. DotAmi checks none of it against anything, no rule reads it, it is never counted
 * against anything, and nothing here makes a request. The list is shown in the order the person added it.
 *
 * Links are http: or https: only (lib/landscape/links.ts `safeLink`), checked on the way in and again on the
 * way out, so a row edited by hand in the data file can't put a `javascript:` link on the screen.
 *
 * Why the ad links are a JSON list on the row rather than a table of their own: they are only ever read and
 * written with their business (the form sends the whole business), never looked up on their own, and go
 * wherever it goes (deleted with it, and with its idea). A child table would add a second table to the
 * privacy inventory, the Delete menu and every migration for no query that needs it. SQLite has no list
 * columns, so the list is JSON, read back defensively below.
 */

/** The caps (lib/landscape/links.ts `WATCHED_LIMITS`, shared with the form on screen). */
export const WATCHED_NAME_MAX = WATCHED_LIMITS.name;
export const WATCHED_NOTE_MAX = WATCHED_LIMITS.note;
export const WATCHED_LINK_MAX = LINK_MAX;
export const WATCHED_AD_LINKS_MAX = WATCHED_LIMITS.adLinks;
export const WATCHED_PER_IDEA_MAX = WATCHED_LIMITS.perIdea;

export { safeLink } from "./links";

/** An ad the person saw: its link and the day they saw it (YYYY-MM-DD, as they set it). */
export interface AdLink {
  url: string;
  seenOn: string;
}

export interface WatchedBusinessView {
  id: string;
  nameAsTyped: string;
  url: string | null;
  note: string | null;
  adLinks: AdLink[];
  /** The day the person added it, on this computer. */
  addedOn: string;
  /** The day it was last changed, on this computer. */
  updatedOn: string;
}

/** The caller sent something the storage refuses; the message is plain English and repeats nothing the person typed. */
export class WatchedInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchedInputError";
  }
}

/** The business isn't on that idea's list (or isn't there at all). */
export class WatchedNotFoundError extends Error {
  constructor() {
    super(landscapeWords.errors.notFound);
    this.name = "WatchedNotFoundError";
  }
}

const errors = landscapeWords.errors;

/** The stored ad links read back: anything malformed, or any link that isn't http or https, is dropped, never guessed at. */
function readAdLinks(value: Prisma.JsonValue): AdLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || !isCalendarDay(item.seenOn)) return [];
    const url = safeLink(item.url);
    return url ? [{ url, seenOn: item.seenOn }] : [];
  });
}

const toView = (row: WatchedBusiness): WatchedBusinessView => ({
  id: row.id,
  nameAsTyped: row.nameAsTyped,
  // Checked again on the way out: only an http or https link ever reaches the screen.
  url: row.url === null ? null : safeLink(row.url),
  note: row.note,
  adLinks: readAdLinks(row.adLinks),
  addedOn: dayOnThisComputer(row.addedAt),
  updatedOn: dayOnThisComputer(row.updatedAt),
});

/** What a business is kept as, once every field is checked. */
interface CheckedBusiness {
  nameAsTyped: string;
  url: string | null;
  note: string | null;
  adLinks: AdLink[];
}

/**
 * Checks a business as the form or an API caller sends it: `{ nameAsTyped, url?, note?, adLinks? }`. The name
 * is required; the rest may be left out, null or empty, which keeps none. An edit sends the whole business
 * again, so a field left out of an edit is cleared, never kept from before.
 */
function checkBusiness(input: unknown, today: string): CheckedBusiness {
  if (!isRecord(input)) throw new WatchedInputError(errors.shape);

  const name = typeof input.nameAsTyped === "string" ? input.nameAsTyped.trim() : "";
  if (name.length === 0 || name.length > WATCHED_NAME_MAX) throw new WatchedInputError(errors.name(WATCHED_NAME_MAX));

  let url: string | null = null;
  if (input.url !== undefined && input.url !== null && !(typeof input.url === "string" && input.url.trim() === "")) {
    if (typeof input.url === "string" && input.url.trim().length > WATCHED_LINK_MAX) throw new WatchedInputError(errors.linkLong(WATCHED_LINK_MAX));
    url = safeLink(input.url);
    if (url === null) throw new WatchedInputError(errors.link);
  }

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") throw new WatchedInputError(errors.note(WATCHED_NOTE_MAX));
    // The person's words, word for word; only an all-blank note is kept as none.
    if (input.note.length > WATCHED_NOTE_MAX) throw new WatchedInputError(errors.note(WATCHED_NOTE_MAX));
    note = input.note.trim() === "" ? null : input.note;
  }

  const adLinks: AdLink[] = [];
  if (input.adLinks !== undefined && input.adLinks !== null) {
    if (!Array.isArray(input.adLinks) || input.adLinks.length > WATCHED_AD_LINKS_MAX) {
      throw new WatchedInputError(errors.adLinks(WATCHED_AD_LINKS_MAX));
    }
    for (const item of input.adLinks) {
      if (!isRecord(item)) throw new WatchedInputError(errors.link);
      const adUrl = safeLink(item.url);
      if (adUrl === null) throw new WatchedInputError(errors.link);
      // The day is the person's: any real day up to today. "Today" is this computer's, since DotAmi's
      // server runs on the person's own computer (dayOnThisComputer). YYYY-MM-DD compares as text.
      if (!isCalendarDay(item.seenOn) || item.seenOn > today) throw new WatchedInputError(errors.seenOn);
      adLinks.push({ url: adUrl, seenOn: item.seenOn });
    }
  }

  return { nameAsTyped: name, url, note, adLinks };
}

/** Every business on the idea's list, in the order the person added them. */
export async function listWatched(prisma: PrismaClient, ventureId: string): Promise<WatchedBusinessView[]> {
  await requireVenture(prisma, ventureId);
  const rows = await prisma.watchedBusiness.findMany({ where: { ventureId }, orderBy: [{ addedAt: "asc" }, { id: "asc" }] });
  return rows.map(toView);
}

/** Adds a business to the end of the idea's list; returns it as kept. */
export async function addWatched(prisma: PrismaClient, ventureId: string, input: unknown): Promise<WatchedBusinessView> {
  await requireVenture(prisma, ventureId);
  const checked = checkBusiness(input, dayOnThisComputer(new Date()));
  return prisma.$transaction(async (tx) => {
    // A cap per idea so a runaway program can't fill the data file; a person typing never meets it.
    if ((await tx.watchedBusiness.count({ where: { ventureId } })) >= WATCHED_PER_IDEA_MAX) {
      throw new WatchedInputError(errors.full(WATCHED_PER_IDEA_MAX));
    }
    const row = await tx.watchedBusiness.create({
      data: { ventureId, nameAsTyped: checked.nameAsTyped, url: checked.url, note: checked.note, adLinks: checked.adLinks as unknown as Prisma.InputJsonValue },
    });
    return toView(row);
  });
}

/** Replaces what is kept for one business on the idea's list; its place in the list and the day added stay. */
export async function editWatched(prisma: PrismaClient, ventureId: string, businessId: string, input: unknown): Promise<WatchedBusinessView> {
  await requireVenture(prisma, ventureId);
  const checked = checkBusiness(input, dayOnThisComputer(new Date()));
  // Scoped to the idea: a business id from another idea's list is "not on this list", never edited.
  const { count } = await prisma.watchedBusiness.updateMany({
    where: { id: businessId, ventureId },
    data: { nameAsTyped: checked.nameAsTyped, url: checked.url, note: checked.note, adLinks: checked.adLinks as unknown as Prisma.InputJsonValue },
  });
  if (count === 0) throw new WatchedNotFoundError();
  return toView(await prisma.watchedBusiness.findUniqueOrThrow({ where: { id: businessId } }));
}

/** Removes one business from the idea's list, for good. */
export async function removeWatched(prisma: PrismaClient, ventureId: string, businessId: string): Promise<void> {
  await requireVenture(prisma, ventureId);
  const { count } = await prisma.watchedBusiness.deleteMany({ where: { id: businessId, ventureId } });
  if (count === 0) throw new WatchedNotFoundError();
}
