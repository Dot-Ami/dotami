/**
 * Writes rows of text as CSV, the way a program saving a file does. A cell is quoted when it holds
 * the delimiter, a quote or a line break, and a quote inside it is doubled. A comma in a semicolon
 * file is not quoted ("1 234,56"), as a French Excel writes it.
 */
export function csv(rows: string[][], options: { delimiter?: string; eol?: string } = {}): string {
  const delimiter = options.delimiter ?? ",";
  const eol = options.eol ?? "\r\n";
  const cell = (text: string) =>
    /["\r\n]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
  // One line break after the last row, as most programs write.
  return rows.map((row) => row.map(cell).join(delimiter)).join(eol) + eol;
}
