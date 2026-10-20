/**
 * The class names the type scale replaced on 2026-10-17 (the maintainer's story S2.5.30d; app/globals.css
 * `--text-label` … `--text-display`), old to new. The map's recordings in tests/fixtures/strategy-map/ were
 * made before it and are never re-recorded; tests/road-map.spec.ts reads them with the new names put in
 * for the old ones, so the recorded HTML is compared exactly, class names aside.
 */
export const TYPE_SCALE_RENAMES: Readonly<Record<string, string>> = {
  "text-[8px]": "text-label",
  "text-[8.5px]": "text-label",
  "text-[9px]": "text-label",
  "text-[9.5px]": "text-label",
  "text-[10px]": "text-small",
  "text-[10.5px]": "text-small",
  "text-[11px]": "text-body",
  "text-[11.5px]": "text-body",
  "text-[12px]": "text-body",
  "text-[12.5px]": "text-body",
  "text-[13px]": "text-body",
  "text-xs": "text-body",
  "text-[14px]": "text-lead",
  "text-[15px]": "text-lead",
  "text-sm": "text-lead",
  "text-[16px]": "text-title",
  "text-[17px]": "text-title",
  "text-[18px]": "text-title",
  "text-[19px]": "text-title",
  "text-base": "text-title",
  "text-lg": "text-title",
  "text-[20px]": "text-xl",
  "text-[22px]": "text-2xl",
  "text-[26px]": "text-display",
  "text-[28px]": "text-display",
  "text-[34px]": "text-4xl",
  "text-[46px]": "text-5xl",
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const OLD_NAME = new RegExp(`(?<![\\w-])(${Object.keys(TYPE_SCALE_RENAMES).map(escape).join("|")})(?![\\w-])`, "g");

/** `html` (or any text) with every old size class renamed to its named size. */
export function withTypeScaleNames(html: string): string {
  return html.replace(OLD_NAME, (old) => TYPE_SCALE_RENAMES[old]);
}
