/**
 * Every sentence of "Others in this line of work", the cockpit panel of docs/architecture/competitive-landscape.md
 * § 6 (per-control behaviour: docs/ui-spec/cockpit/landscape.md). Built 2026-10-17 as the smallest host for
 * "Businesses you're watching" (§ 6.2 item 5, task S2.5.23i), which the maintainer released that day: "yah,
 * this is fine. Lets do it". So the panel holds only what their ads cost, the person's own list and the footer;
 * official counts, the area and industry questions and *Where to look* come with their own tasks.
 *
 * The words are the same on every road: they name no trade. tests/landscape-words.spec.ts checks every
 * sentence against the verdict words and the landscape's own list (crowded, saturated, room for you,
 * opportunity, gap, market share, per person, top, best-rated: tests/helpers/verdict-words.ts).
 */

/** A page the person opens themselves, in their own browser. No search words and nothing about them in the address. */
export interface PlainLink {
  label: string;
  url: string;
}

/**
 * The two ad libraries (competitive-landscape.md § 4.6): where anyone can look at a business's ads. Links only:
 * DotAmi fetches nothing from them (Meta needs its written permission for automated collection, and Google's
 * Center's terms weren't readable by our tools, § 4.6), and adds no search words, so the address says nothing
 * about the person or their idea.
 */
export const AD_LIBRARIES: readonly PlainLink[] = [
  { label: "Meta's Ad Library", url: "https://www.facebook.com/ads/library/" },
  { label: "Google's Ads Transparency Center", url: "https://adstransparency.google.com/" },
];

/**
 * The pages the "not published" line was read from, on 15 October 2026 (competitive-landscape.md § 4.6): Meta's
 * page says its library's spend figures are for social-issue, election and political ads; Google's says the
 * same of its spend data. Shown under the line, so the claim carries its sources and its day.
 */
export const AD_COST_READ_FROM: readonly PlainLink[] = [
  { label: "Meta's ad library tools page", url: "https://transparency.meta.com/researchtools/ad-library-tools/" },
  {
    label: "Google's post on its political ads data set",
    url: "https://cloud.google.com/blog/topics/developers-practitioners/how-get-started-political-ads-transparency-report-dataset",
  },
];

export const landscapeWords = {
  /** The panel's name, the button that opens it (goal bar and step panel), and its folded strip. */
  region: "Others in this line of work",
  open: "Others in this line of work",
  close: "Close",

  adCost: {
    heading: "What their ads cost",
    /** competitive-landscape.md § 6.2 item 4, word for word (v1, call 3 B; research-kit call K4 A). */
    line: "Meta and Google don't publish this for ordinary ads in Canada, as their pages read on 15 October 2026. DotAmi has no number for it.",
    readFrom: "Read on 15 October 2026:",
    libraries: "Their ads, in the public libraries:",
    linksOnly: "Each opens in your browser. DotAmi reads nothing from these pages, and the links carry nothing about you or this idea.",
  },

  watched: {
    /** § 6.2 item 5: the heading says the order, so no reader takes it for a ranking. */
    heading: "Businesses you're watching · in the order you added them",
    /** The list's accessible name. */
    listName: "Businesses you're watching",
    line: "DotAmi doesn't check these. They stay on this computer and no rule reads them.",
    /** Links and the person's own notes only (call 9 A): nothing a business wrote is copied here. */
    yoursOnly: "Your notes and links only: DotAmi copies nothing from a business's own pages.",
    /** § 6.4: the invented example's list stays empty. */
    exampleEmpty: "An invented person's list would mean inventing businesses, so this stays empty in the example.",
    empty: "None added yet.",
    add: "+ Add a business",
    addForm: "Add a business",
    editForm: (name: string) => `Edit ${name}`,
    name: "Name",
    nameHint: "As you'd write it. Kept as you type it.",
    link: "Link (optional)",
    note: "Your note (optional)",
    adLinks: "Ads you saw",
    adLink: (n: number) => `Ad link ${n}`,
    seenOn: (n: number) => `Day you saw ad link ${n}`,
    addAdLink: "+ Add an ad link",
    removeAdLink: (n: number) => `Remove ad link ${n}`,
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    edit: "Edit",
    editFor: (name: string) => `Edit ${name}`,
    remove: "Remove",
    removeFor: (name: string) => `Remove ${name}`,
    confirmRemove: (name: string) => `Remove “${name}”, with your note and its links? This can't be undone.`,
    yesRemove: "Yes, remove",
    keep: "Keep it",
    seen: (day: string) => `seen ${day}`,
    /** The desktop app opens only https links in the person's browser (desktop/main.mjs). */
    httpOnly: "an http link: the desktop app doesn't open these; copy it into your browser",
    added: "Added to your list.",
    saved: "Saved.",
    removed: "Removed from your list.",
    loading: "Reading your list…",
    notRead: "Your list couldn't be read just now. Nothing was changed.",
  },

  /** What the form says before anything is sent, and what the storage says when it refuses (lib/landscape/watched.ts). */
  errors: {
    name: (max: number) => `Give the business a name, up to ${max} characters.`,
    link: "A link has to start with http:// or https://.",
    linkLong: (max: number) => `A link can be up to ${max} characters.`,
    note: (max: number) => `A note can be up to ${max} characters.`,
    adLinks: (max: number) => `Up to ${max} ad links per business.`,
    seenOn: "Give the day you saw each ad, no later than today.",
    full: (max: number) => `This idea's list holds up to ${max} businesses.`,
    notFound: "That business isn't on this idea's list.",
    shape: "Send a business as its name, and a link, a note and ad links if you have them.",
    pageOnly: "Businesses you're watching can only be read and changed from DotAmi's own window. An outside agent can't reach them yet.",
  },

  /** § 6.2 item 6, word for word. */
  footer: "Facts from public sources, side by side. Nothing here says whether this line of work fits you. Not legal advice.",
} as const;
