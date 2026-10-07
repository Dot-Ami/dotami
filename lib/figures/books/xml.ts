/**
 * [8h] A small, strict XML reader for books written by a program (GnuCash).
 *
 * Why not the browser's DOMParser: it isn't there in the tests (so the code that runs in the window
 * would not be the code that is tested), and it builds the whole book as a tree in memory. Why not
 * a library: the only XML parser already installed (saxen) arrives only as a dependency of the
 * spreadsheet reader, which itself copies its source rather than importing it, and has no types.
 * This one is about a hundred lines and walks the text once, calling back as tags open and close.
 *
 * It reads a deliberately small subset of XML, and refuses anything outside it instead of guessing:
 * no document type declaration, no entities beyond the five built-in ones and numeric character
 * references (so no entity can expand into more text), no processing instructions after the
 * leading <?xml?> line, a single root element, tags that match, nesting no deeper than
 * MAX_DEPTH. A GnuCash book never needs anything else.
 *
 * Refusals carry a fixed reason, never any of the file's own text, so nothing from a book can leak
 * into a message or a log.
 */

export type XmlRefusalReason =
  /** Not well-formed: cut off, mismatched tags, stray text, a bad character reference. */
  | "malformed"
  /** A <!DOCTYPE …>, which could pull in entities or other files. */
  | "doctype"
  /** An entity other than the built-in five (&amp; &lt; &gt; &quot; &apos;). */
  | "entity"
  /** Declared as something other than UTF-8. */
  | "encoding"
  /** Markup this reader doesn't handle (a processing instruction after the first line). */
  | "unsupported";

export class XmlRefusal extends Error {
  constructor(readonly reason: XmlRefusalReason) {
    super(`XML refused: ${reason}`);
  }
}

export type XmlAttributes = Readonly<Record<string, string>>;

export interface XmlHandlers {
  /** A tag opened. `name` is as written, prefix included ("act:name"). */
  open(name: string, attributes: XmlAttributes): void;
  /** The matching tag closed (also called right after open for <tag/>). */
  close(name: string): void;
  /** Text inside an element, entities already decoded; may be only whitespace between tags. */
  text(text: string): void;
}

/** Deep enough for any book (GnuCash nests about ten levels), shallow enough to bound the stack. */
export const MAX_DEPTH = 100;

const NO_ATTRIBUTES: XmlAttributes = Object.freeze(Object.create(null) as Record<string, string>);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** A built-in entity or a numeric character reference. */
const ENTITY = /&(?:#x([0-9a-fA-F]{1,6})|#([0-9]{1,7})|(amp|lt|gt|quot|apos));/g;

const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const isNameStart = (c: number) =>
  (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58; // A-Z a-z _ :
const isNameChar = (c: number) => isNameStart(c) || (c >= 48 && c <= 57) || c === 45 || c === 46; // 0-9 - .

/** The characters XML 1.0 allows in a document (so &#0; or a lone surrogate is refused). */
function isXmlChar(code: number): boolean {
  return (
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0d ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}

/** Replaces the built-in entities and character references; refuses any other `&`. */
function decodeEntities(raw: string): string {
  if (raw.indexOf("&") === -1) return raw;
  // What is left after taking out every legal reference must hold no "&" at all.
  if (raw.replace(ENTITY, "").indexOf("&") !== -1) throw new XmlRefusal("entity");
  return raw.replace(ENTITY, (_all, hex?: string, dec?: string, named?: string) => {
    if (named !== undefined) return NAMED_ENTITIES[named];
    const code = hex !== undefined ? parseInt(hex, 16) : parseInt(dec as string, 10);
    if (!isXmlChar(code)) throw new XmlRefusal("malformed");
    return String.fromCodePoint(code);
  });
}

/** Reads the `<?xml …?>` line at the very start and returns the index just after it. */
function readDeclaration(xml: string): number {
  const end = xml.indexOf("?>");
  if (end === -1) throw new XmlRefusal("malformed");
  const decl = xml.slice(0, end);
  const version = decl.match(/\sversion\s*=\s*(["'])([^"']*)\1/);
  if (!version || version[2] !== "1.0") throw new XmlRefusal("malformed");
  const encoding = decl.match(/\sencoding\s*=\s*(["'])([^"']*)\1/);
  if (encoding && !/^utf-8$/i.test(encoding[2])) throw new XmlRefusal("encoding");
  return end + 2;
}

/**
 * Walks the document once, calling the handlers as it goes. Throws XmlRefusal for anything outside
 * the subset described above; whatever the handlers do with a tag is up to them (they may throw too).
 */
export function walkXml(xml: string, handlers: XmlHandlers): void {
  const length = xml.length;
  const stack: string[] = [];
  let sawRoot = false;
  let rootClosed = false;
  let at = 0;

  if (xml.startsWith("<?xml") && isSpace(xml.charCodeAt(5))) at = readDeclaration(xml);

  while (at < length) {
    const lt = xml.indexOf("<", at);
    const textEnd = lt === -1 ? length : lt;

    if (textEnd > at) {
      const raw = xml.slice(at, textEnd);
      if (stack.length > 0) {
        handlers.text(decodeEntities(raw));
      } else if (/[^ \t\r\n]/.test(raw)) {
        throw new XmlRefusal("malformed"); // text before or after the root element
      }
    }
    if (lt === -1) break;
    at = lt;

    const next = xml.charCodeAt(at + 1);

    if (next === 33 /* ! */) {
      if (xml.startsWith("<!--", at)) {
        const end = xml.indexOf("-->", at + 4);
        if (end === -1) throw new XmlRefusal("malformed");
        at = end + 3;
      } else if (xml.startsWith("<![CDATA[", at)) {
        const end = xml.indexOf("]]>", at + 9);
        if (end === -1 || stack.length === 0) throw new XmlRefusal("malformed");
        handlers.text(xml.slice(at + 9, end)); // CDATA is literal: no entities inside
        at = end + 3;
      } else if (xml.startsWith("<!DOCTYPE", at)) {
        throw new XmlRefusal("doctype");
      } else {
        throw new XmlRefusal("malformed");
      }
      continue;
    }

    if (next === 63 /* ? */) throw new XmlRefusal("unsupported");

    if (next === 47 /* / */) {
      // A closing tag: </name>, optionally with spaces before the >.
      let end = at + 2;
      if (!isNameStart(xml.charCodeAt(end))) throw new XmlRefusal("malformed");
      while (isNameChar(xml.charCodeAt(end))) end += 1;
      const name = xml.slice(at + 2, end);
      while (isSpace(xml.charCodeAt(end))) end += 1;
      if (xml.charCodeAt(end) !== 62 /* > */) throw new XmlRefusal("malformed");
      if (stack.pop() !== name) throw new XmlRefusal("malformed");
      handlers.close(name);
      if (stack.length === 0) rootClosed = true;
      at = end + 1;
      continue;
    }

    // An opening tag: <name attr="value" …> or <name …/>.
    if (!isNameStart(next) || rootClosed) throw new XmlRefusal("malformed");
    let end = at + 1;
    while (isNameChar(xml.charCodeAt(end))) end += 1;
    const name = xml.slice(at + 1, end);

    let attributes: XmlAttributes = NO_ATTRIBUTES;
    let selfClosing = false;
    for (;;) {
      const before = end;
      while (isSpace(xml.charCodeAt(end))) end += 1;
      const c = xml.charCodeAt(end);
      if (c === 62 /* > */) {
        end += 1;
        break;
      }
      if (c === 47 /* / */) {
        if (xml.charCodeAt(end + 1) !== 62) throw new XmlRefusal("malformed");
        selfClosing = true;
        end += 2;
        break;
      }
      // An attribute: it must be set apart from the tag name or the one before it by a space.
      if (end === before || !isNameStart(c)) throw new XmlRefusal("malformed");
      const nameStart = end;
      while (isNameChar(xml.charCodeAt(end))) end += 1;
      const attribute = xml.slice(nameStart, end);
      while (isSpace(xml.charCodeAt(end))) end += 1;
      if (xml.charCodeAt(end) !== 61 /* = */) throw new XmlRefusal("malformed");
      end += 1;
      while (isSpace(xml.charCodeAt(end))) end += 1;
      const quote = xml.charCodeAt(end);
      if (quote !== 34 && quote !== 39) throw new XmlRefusal("malformed");
      const close = xml.indexOf(quote === 34 ? '"' : "'", end + 1);
      if (close === -1) throw new XmlRefusal("malformed");
      const value = xml.slice(end + 1, close);
      if (value.indexOf("<") !== -1) throw new XmlRefusal("malformed");
      if (attributes === NO_ATTRIBUTES) attributes = Object.create(null) as Record<string, string>;
      if (attribute in attributes) throw new XmlRefusal("malformed"); // the same attribute twice
      (attributes as Record<string, string>)[attribute] = decodeEntities(value);
      end = close + 1;
    }

    sawRoot = true;
    if (stack.length >= MAX_DEPTH) throw new XmlRefusal("malformed");
    stack.push(name);
    handlers.open(name, attributes);
    if (selfClosing) {
      stack.pop();
      handlers.close(name);
      if (stack.length === 0) rootClosed = true;
    }
    at = end;
  }

  // Cut off before the root closed, or nothing there at all.
  if (!sawRoot || stack.length > 0) throw new XmlRefusal("malformed");
}
