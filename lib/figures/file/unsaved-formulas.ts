/**
 * [8c-3] Excel formulas saved with no value: where they are in each sheet.
 *
 * A program that writes an .xlsx can leave a formula's result for Excel to work out when the file
 * is opened; until Excel has done that and the file is saved again, the cell holds the formula and
 * no value (Xero's help: an Excel report with formulas may show 0.00 until Enable Editing). The
 * workbook library DotAmi reads with gives such a cell as empty, exactly like a cell with nothing
 * in it, and DotAmi never works a formula out itself (that would be guessing a number). So this
 * reads the sheets' XML once more for one fact only: which cells hold a formula with no saved
 * value. The screen then says "a formula Excel didn't save a value for" instead of "no amount".
 *
 * Pure: it gets the XML parts already unpacked (read-xlsx.ts unpacks them, inside the zip-bomb
 * limits it has already checked) and returns places, never a cell's text. Nothing is logged.
 *
 * It reads the XML with patterns rather than a full parser: it needs the order of the <sheet>
 * entries in the workbook, each relationship's Id and Target, and each cell's address and whether
 * it holds an <f> and a <v>. Element names may carry a namespace prefix (<x:c>), as files written by
 * some libraries do.
 */
import type { CellPlace } from "./types";

/** An element's attributes, as text: `<sheet name="A" r:id="rId1"/>` gives ` name="A" r:id="rId1"`. */
function elements(xml: string, name: string): string[] {
  const pattern = new RegExp(`<(?:[\\w.-]+:)?${name}\\b([^>]*)>`, "g");
  return [...xml.matchAll(pattern)].map((m) => m[1]);
}

/** One attribute's value, by its name without a prefix (`id` finds `r:id`). Undefined when absent. */
function attribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`(?:^|\\s)(?:[\\w.-]+:)?${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
  const m = attributes.match(pattern);
  if (!m) return undefined;
  return decodeEntities(m[1] ?? m[2] ?? "");
}

/** The five entities XML predefines, and numeric ones; enough for a part's path. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    if (lower === "quot") return '"';
    if (lower === "apos") return "'";
    const code = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/**
 * The zip path of every sheet, in the order the workbook lists them (the order the library returns
 * its sheets in). A sheet whose relationship can't be found gets null. Paths are resolved the way
 * read-excel-file resolves them: "/xl/worksheets/sheet1.xml" is taken from the root, anything else
 * is under "xl/".
 */
export function sheetPartPaths(workbookXml: string, relsXml: string): (string | null)[] {
  const targets = new Map<string, string>();
  for (const attributes of elements(relsXml, "Relationship")) {
    const id = attribute(attributes, "Id");
    const target = attribute(attributes, "Target");
    if (id !== undefined && target !== undefined) targets.set(id, target);
  }
  return elements(workbookXml, "sheet").map((attributes) => {
    const id = attribute(attributes, "id");
    const target = id === undefined ? undefined : targets.get(id);
    if (target === undefined) return null;
    return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  });
}

/** "C" -> 2, "AA" -> 26: a column's letters as a 0-based index. */
function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// A cell, self-closing or with content: <c r="H9"><f>F9*G9</f></c>. "c\b" never matches <col> or
// <cfRule>, since a letter follows the c there.
const CELL = /<(?:[\w.-]+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?c>)/g;
const FORMULA = /<(?:[\w.-]+:)?f\b/;
const VALUE = /<(?:[\w.-]+:)?v\b/;

/**
 * Every cell in one sheet's XML that holds a formula and no <v> element at all, 0-based, in the
 * order they appear. A formula with a saved value, even an empty one (a text formula that worked
 * out to ""), is not listed: Excel did work it out. A cell with no address is skipped (the library
 * can't place it either).
 */
export function unsavedFormulaPlaces(sheetXml: string): CellPlace[] {
  // Most sheets hold no formula at all; don't walk every cell of a large one for nothing.
  if (!FORMULA.test(sheetXml)) return [];
  const places: CellPlace[] = [];
  for (const m of sheetXml.matchAll(CELL)) {
    const inner = m[2];
    if (inner === undefined || !FORMULA.test(inner) || VALUE.test(inner)) continue;
    const address = attribute(m[1], "r")?.match(/^([A-Z]+)(\d+)$/);
    if (!address) continue;
    places.push({ row: Number(address[2]) - 1, column: columnIndex(address[1]) });
  }
  return places;
}
