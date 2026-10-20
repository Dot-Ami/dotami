/**
 * Finds text a component writes itself instead of taking it from a words file (lib/cockpit/words.ts for the
 * cockpit): the words a person reads or a screen reader says, written straight into the component. The
 * words files are what the words tests read (verdict words in tests/cockpit-screen.spec.ts, time words in
 * tests/idea-invariants.spec.ts), so a sentence written in a component is a sentence those tests never see.
 * tests/cockpit-own-words.spec.ts runs this over every file in components/cockpit/ (the maintainer's story
 * S2.5.30e, 2026-10-17).
 *
 * It reads the TypeScript syntax tree, so a comment is never text, and reports:
 *
 * - every JSX text node that holds a letter (`<p>Save now</p>`, `<span>· fork</span>`);
 * - every string written out (a quoted string, a plain template, and the fixed parts of a template with
 *   `${…}` in it) that reads as a sentence or a label: a capitalised word ("Export", "Not set"), two or more
 *   plain words ("no rule yet", ", opens detail"), an apostrophe, or a full stop, question mark or ellipsis
 *   at its end; and any string, one lowercase word included ("done"), held under a property named for what
 *   it is (label, title, text, placeholder, …).
 *
 * It leaves alone what is never read as words: class names (className and class attributes, `cn(…)`
 * arguments, a `className` property), ids and the attributes that hold ids or tokens (id, key, href, src,
 * data-*, aria-controls, role, type, …; aria-label and title are words and are NOT left alone), module
 * names in imports, the "use client" directive, string literal types, what an Error is made with and what
 * is written to the console (for programmers, never shown on a screen), what a value is compared with
 * (`=== "done"`, `case "step":`; a string beside `??`, `+`, `&&` or `||` is shown, so it is read), and
 * anything that looks like a path or an address. A string that is one lowercase word with no hint from its
 * property name ("step", "told") is an id as often as a label, so it is left alone too. Beyond that, each
 * file may carry an explicit allowance in the spec, with the reason.
 */
import ts from "typescript";

/** One piece of text a component wrote itself. */
export interface OwnWords {
  /** 1-based line in the file. */
  line: number;
  /** The text as written. */
  text: string;
  /** Where it sat: "jsx text", `attribute aria-label`, `property label`, "string", "template". */
  where: string;
}

/**
 * Attributes whose values are tokens, ids or code, never words a person reads. aria-label, title, alt and
 * placeholder are words, so they are not here.
 */
const TOKEN_ATTRIBUTES = new Set([
  "className",
  "class",
  "style",
  "id",
  "key",
  "ref",
  "href",
  "src",
  "type",
  "role",
  "name",
  "htmlFor",
  "for",
  "rel",
  "target",
  "method",
  "action",
  "inputMode",
  "autoComplete",
  "autoCapitalize",
  "enterKeyHint",
  "lang",
  "dir",
  "pattern",
  "viewBox",
  "d",
  "points",
  "transform",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "xmlns",
  "preserveAspectRatio",
  "aria-controls",
  "aria-labelledby",
  "aria-describedby",
  "aria-owns",
  "aria-activedescendant",
  "aria-pressed",
  "aria-expanded",
  "aria-hidden",
  "aria-live",
  "aria-current",
  "aria-selected",
  "aria-haspopup",
  "aria-disabled",
  "aria-checked",
  "aria-modal",
  "aria-atomic",
  "aria-orientation",
  "aria-sort",
  "aria-busy",
  "aria-relevant",
  "aria-invalid",
  "aria-required",
  "aria-level",
  "aria-setsize",
  "aria-posinset",
  "aria-valuemin",
  "aria-valuemax",
  "aria-valuenow",
]);

/** Object properties whose values are class names or tokens. */
const TOKEN_PROPERTIES = new Set(["className", "class", "style", "id", "key", "href", "src", "kind", "variant", "size", "region"]);

/** Object properties whose values are words a person reads, whatever they look like ("done" is a chip's label). */
const WORD_PROPERTIES = new Set([
  "label",
  "title",
  "text",
  "placeholder",
  "heading",
  "help",
  "note",
  "caption",
  "message",
  "line",
  "summary",
  "description",
  "ariaLabel",
  "alt",
  "banner",
  "question",
  "why",
  "answer",
]);

/** Calls whose string arguments are class names. */
const CLASS_CALLS = new Set(["cn", "clsx", "classNames", "twMerge"]);

/** Calls whose string arguments are for programmers: never on a screen. */
const PROGRAMMER_CALLS = new Set(["Error", "TypeError", "RangeError", "warn", "error", "log", "info", "debug", "assert"]);

/**
 * Tailwind's one-word utilities. A class string outside a className attribute ("text-stone border
 * border-rule" in a lookup table) is told from a sentence by its plain words: hyphenated and colon-marked
 * classes are never plain words, and these are the plain words a class string can hold.
 */
const UTILITY_WORDS = new Set([
  "flex",
  "grid",
  "block",
  "inline",
  "hidden",
  "contents",
  "relative",
  "absolute",
  "fixed",
  "sticky",
  "static",
  "truncate",
  "italic",
  "uppercase",
  "lowercase",
  "capitalize",
  "underline",
  "overline",
  "border",
  "rounded",
  "shadow",
  "transition",
  "invisible",
  "visible",
  "collapse",
  "container",
  "group",
  "peer",
  "isolate",
  "antialiased",
  "resize",
  "table",
  "grow",
  "shrink",
  "ring",
  "outline",
  "blur",
  "filter",
  "inert",
  "transform",
  "animate",
  "cursor",
  "select",
]);

/**
 * The operators that compare a value with a code value (`state === "done"`, `"id" in row`). A string on
 * either side of one is a token. Every other binary operator (`??`, `+`, `&&`, `||`, …) passes its string on
 * to be shown, so a string beside one of those is read as words.
 */
const COMPARISONS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.InKeyword,
]);

/** A plain word: letters, maybe an apostrophe, maybe one mark of punctuation after it. */
const PLAIN_WORD = /^[A-Za-z]+(?:['’][A-Za-z]+)?[,.;:!?…)]?$/;

/** Whether a string reads as a sentence or a label (see the file header). */
export function readsAsWords(text: string): boolean {
  const trimmed = text.trim();
  if (!/[A-Za-z]/.test(trimmed)) return false;
  // A path, an address, a hash, a mime type or a selector is not words.
  if (/^(?:[./]|@\/|#|https?:|mailto:|[\w-]+\/[\w-]+$)/.test(trimmed) || /:\/\//.test(trimmed)) return false;
  if (/^\[/.test(trimmed) && /\]$/.test(trimmed)) return false;
  // One camelCase or dotted name ("roadAhead", "whatIf", "notAdvice", "a.b") is a key, not words.
  if (/^[a-z][A-Za-z0-9.]*$/.test(trimmed)) return false;
  // A capitalised word ("Export", "Not set"), unless the whole string is one shouted token ("CAD", "GST").
  if (/[A-Z][a-z]/.test(trimmed)) return true;
  // An apostrophe inside a word ("doesn't"), or a sentence's end.
  if (/[a-z]['’][a-z]/.test(trimmed) || /[a-z][.!?…]$/.test(trimmed)) return true;
  // Two or more plain words that aren't Tailwind's one-word utilities.
  const plain = trimmed.split(/\s+/).filter((word) => PLAIN_WORD.test(word) && !UTILITY_WORDS.has(word.replace(/[,.;:!?…)]$/, "")));
  return plain.length >= 2;
}

/** The JSX attribute `node` is the value of, if any. */
function attributeAbove(node: ts.Node): ts.JsxAttribute | null {
  for (let up: ts.Node | undefined = node.parent; up; up = up.parent) {
    if (ts.isJsxAttribute(up)) return up;
    // Past the attribute's element, stop: an attribute of an outer element isn't this one's.
    if (ts.isJsxElement(up) || ts.isJsxSelfClosingElement(up) || ts.isSourceFile(up)) return null;
  }
  return null;
}

/** The name of the property `node` is the value of, if it is one (`{ label: "done" }`). */
function propertyAbove(node: ts.Node): string | null {
  const parent = node.parent;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = parent.name;
    return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
  }
  return null;
}

/** The name of the function `node` is a direct argument of (`cn("…")`, `new Error("…")`), if any. */
function callAbove(node: ts.Node): string | null {
  const parent = node.parent;
  if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.arguments?.includes(node as ts.Expression)) {
    const callee = parent.expression;
    if (ts.isIdentifier(callee)) return callee.text;
    if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  }
  return null;
}

/** Whether `node` sits where only a type is written (`"idle" | "dirty"`): nothing there is shown. */
function inType(node: ts.Node): boolean {
  for (let up: ts.Node | undefined = node.parent; up && !ts.isSourceFile(up); up = up.parent) {
    if (ts.isTypeNode(up) || ts.isInterfaceDeclaration(up) || ts.isTypeAliasDeclaration(up)) return true;
  }
  return false;
}

/** Whether this string is somewhere its words are never read by a person. */
function leftAlone(node: ts.Node): boolean {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) return true;
  if (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword) return true;
  // "use client" and the like.
  if (ts.isExpressionStatement(parent) && ts.isSourceFile(parent.parent)) return true;
  if (inType(node)) return true;
  // The key side of a property or an element access: `{ "not-for-me": … }`, `x["done"]`.
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
  // A case label or a comparison with a code value: `=== "done"`, `case "step":`. Only a comparison, though:
  // a string beside any other operator (`name ?? "Not set"`, `"Saved · " + name`, `busy && "Saving…"`,
  // `busy || "Edits save automatically."`) is what gets shown, so it is read like any other.
  if (ts.isCaseClause(parent)) return true;
  if (ts.isBinaryExpression(parent) && COMPARISONS.has(parent.operatorToken.kind)) return true;
  const attribute = attributeAbove(node);
  if (attribute) {
    const name = attribute.name.getText();
    if (TOKEN_ATTRIBUTES.has(name) || name.startsWith("data-")) return true;
  }
  const property = propertyAbove(node);
  if (property && TOKEN_PROPERTIES.has(property)) return true;
  const call = callAbove(node);
  if (call && (CLASS_CALLS.has(call) || PROGRAMMER_CALLS.has(call))) return true;
  return false;
}

/**
 * Every piece of text `source` (a .ts or .tsx file) writes itself. `file` names it for the parser and for
 * the report.
 */
export function ownWords(source: string, file = "component.tsx"): OwnWords[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX);
  const found: OwnWords[] = [];
  const lineOf = (node: ts.Node) => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  const add = (node: ts.Node, text: string, where: string) => found.push({ line: lineOf(node), text: text.trim(), where });

  const check = (node: ts.Node, text: string, where: string) => {
    if (leftAlone(node)) return;
    const property = propertyAbove(node);
    const attribute = attributeAbove(node);
    // JSX attributes are written kebab-case (aria-label); the property list is camelCase (ariaLabel).
    const attributeName = attribute?.name.getText().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const forced = (property && WORD_PROPERTIES.has(property)) || (attributeName !== undefined && WORD_PROPERTIES.has(attributeName));
    const placeName = attribute ? `attribute ${attribute.name.getText()}` : property ? `property ${property}` : where;
    if (forced ? /[A-Za-z]/.test(text) : readsAsWords(text)) add(node, text, placeName);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      // Entities are read as written: "doesn&apos;t" holds letters either way.
      if (/[A-Za-z]/.test(node.text)) add(node, node.text.replace(/\s+/g, " "), "jsx text");
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      check(node, node.text, ts.isStringLiteral(node) ? "string" : "template");
    } else if (ts.isTemplateExpression(node)) {
      // The fixed parts of `${a}: ${b}, opens detail`, each on its own, with `${…}` in place of the holes.
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
      if (!leftAlone(node) && parts.some((part) => readsAsWords(part))) {
        add(node, parts.join("${…}"), "template");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}
