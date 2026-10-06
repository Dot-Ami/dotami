/**
 * Builds a small, valid .xlsx file in memory for tests (and, later, the browser tests), so no binary
 * fixture has to live in the repo and each test can say exactly what is in its workbook.
 *
 * An .xlsx is a zip of XML parts. This writes the minimum Excel itself needs: the content-type list,
 * the package and workbook relationships, the workbook, one part per sheet, shared strings and a
 * stylesheet with two cell formats (0 = General, 1 = a date, built-in format 14). Depends on fflate
 * only.
 */

import { strToU8, zipSync } from "fflate";

/**
 * One cell: text, a number, a calendar date ("YYYY-MM-DD", stored as Excel's serial number with the
 * date format), a formula with the value Excel last calculated for it, or null for an empty cell.
 */
export type XlsxCell =
  string | number | { date: string } | { formula: string; value: number } | null;

export interface XlsxSheetSpec {
  name: string;
  rows: XlsxCell[][];
  /** Where the first cell goes, like "C3". Defaults to "A1". */
  origin?: string;
  /** Merged ranges like "A5:A7". Only the top-left cell should carry a value, as in Excel. */
  merges?: string[];
}

export interface XlsxOptions {
  /** Use Excel's 1904 date system (some old Mac workbooks). */
  date1904?: boolean;
  /** Add xl/vbaProject.bin, which is what makes a workbook "macro-enabled". */
  withMacros?: boolean;
}

/** "XML-safe" text, for element content and attribute values alike. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 1 -> "A", 27 -> "AA". */
function columnLetters(column: number): string {
  let letters = "";
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

/** "C3" -> { row: 3, column: 3 }. */
function parseOrigin(origin: string): { row: number; column: number } {
  const m = origin.match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`bad origin ${origin}`);
  const column = [...m[1]].reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
  return { row: Number(m[2]), column };
}

/** Excel's serial number for a calendar day (valid from 1900-03-01, which every test date is). */
function dateSerial(isoDate: string, date1904: boolean): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dayMs = 24 * 60 * 60 * 1000;
  // Serial 0 is 1899-12-30 in the 1900 system (Excel counts a 29 Feb 1900 that never existed) and
  // 1904-01-01 in the 1904 system.
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return Math.round((Date.UTC(y, m - 1, d) - epoch) / dayMs);
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

export function makeXlsx(sheets: XlsxSheetSpec[], opts: XlsxOptions = {}): Uint8Array {
  const date1904 = opts.date1904 === true;

  // Every text cell points into one shared list of strings.
  const sharedStrings: string[] = [];
  const sharedIndex = new Map<string, number>();
  const stringIndex = (text: string): number => {
    let i = sharedIndex.get(text);
    if (i === undefined) {
      i = sharedStrings.length;
      sharedStrings.push(text);
      sharedIndex.set(text, i);
    }
    return i;
  };

  const sheetXml = (spec: XlsxSheetSpec): string => {
    const origin = parseOrigin(spec.origin ?? "A1");
    const rowXml: string[] = [];

    spec.rows.forEach((cells, rowOffset) => {
      const rowNumber = origin.row + rowOffset;
      const cellXml: string[] = [];

      cells.forEach((cell, colOffset) => {
        if (cell === null) return; // no element: Excel doesn't write empty cells either
        const ref = `${columnLetters(origin.column + colOffset)}${rowNumber}`;

        if (typeof cell === "string") {
          cellXml.push(`<c r="${ref}" t="s"><v>${stringIndex(cell)}</v></c>`);
        } else if (typeof cell === "number") {
          cellXml.push(`<c r="${ref}"><v>${cell}</v></c>`);
        } else if ("date" in cell) {
          // s="1" is the date format in styles.xml below.
          cellXml.push(`<c r="${ref}" s="1"><v>${dateSerial(cell.date, date1904)}</v></c>`);
        } else {
          cellXml.push(`<c r="${ref}"><f>${esc(cell.formula)}</f><v>${cell.value}</v></c>`);
        }
      });

      // A row with no cells gets no element, leaving a gap the reader has to pad.
      if (cellXml.length > 0) rowXml.push(`<row r="${rowNumber}">${cellXml.join("")}</row>`);
    });

    const merges = spec.merges?.length
      ? `<mergeCells count="${spec.merges.length}">${spec.merges
          .map((ref) => `<mergeCell ref="${esc(ref)}"/>`)
          .join("")}</mergeCells>`
      : "";

    return `${XML_HEADER}<worksheet xmlns="${MAIN_NS}"><sheetData>${rowXml.join("")}</sheetData>${merges}</worksheet>`;
  };

  // Sheets first: building them fills `sharedStrings`, which is written after.
  const sheetParts = sheets.map(sheetXml);

  const files: Record<string, Uint8Array> = {};

  files["[Content_Types].xml"] = strToU8(
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      (opts.withMacros
        ? `<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>`
        : "") +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join("") +
      `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `</Types>`,
  );

  files["_rels/.rels"] = strToU8(
    `${XML_HEADER}<Relationships xmlns="${PKG_REL_NS}">` +
      `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  );

  files["xl/workbook.xml"] = strToU8(
    `${XML_HEADER}<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
      (date1904 ? `<workbookPr date1904="1"/>` : "") +
      `<sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("")}</sheets></workbook>`,
  );

  files["xl/_rels/workbook.xml.rels"] = strToU8(
    `${XML_HEADER}<Relationships xmlns="${PKG_REL_NS}">` +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="${REL_NS}/sharedStrings" Target="sharedStrings.xml"/>` +
      `<Relationship Id="rId${sheets.length + 2}" Type="${REL_NS}/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  );

  sheetParts.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });

  files["xl/sharedStrings.xml"] = strToU8(
    `${XML_HEADER}<sst xmlns="${MAIN_NS}" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
      sharedStrings.map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join("") +
      `</sst>`,
  );

  // Format 0 = General, format 1 = numFmtId 14 (the built-in short date).
  files["xl/styles.xml"] = strToU8(
    `${XML_HEADER}<styleSheet xmlns="${MAIN_NS}">` +
      `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="2">` +
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
      `<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
      `</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`,
  );

  if (opts.withMacros) {
    // Not a real VBA project; the reader only looks for the part's presence.
    files["xl/vbaProject.bin"] = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2, 3, 4]);
  }

  return zipSync(files);
}
