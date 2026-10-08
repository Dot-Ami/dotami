// Re-runs the checks behind docs/connectors/ofx-reader-review.md against the ofx-js that is
// installed, so a new version can be compared with what was read. Run it by hand:
//
//   node --max-old-space-size=4096 scripts/ofx-review-probe.mjs
//
// It prints what ofx-js does with odd input (the behaviours table) and how long it takes on large
// and hostile input (the timing table). It writes nothing and makes no request. A developer tool:
// it is not part of the app and is not copied into the installer.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseSync } from "ofx-js";

const require = createRequire(import.meta.url);
const pkgDir = require.resolve("ofx-js/package.json").replace(/package\.json$/, "");
const pkg = JSON.parse(readFileSync(`${pkgDir}package.json`, "utf8"));
const sha = createHash("sha256").update(readFileSync(`${pkgDir}ofx.js`)).digest("hex");
console.log(`node ${process.version}; ofx-js ${pkg.version}; ofx.js sha-256 ${sha}`);
console.log(`dependencies: ${JSON.stringify(pkg.dependencies ?? {})}\n`);

// ---- behaviours ---------------------------------------------------------------------------

function behaves(label, text) {
  let out;
  try {
    out = `returns ${JSON.stringify(parseSync(text).OFX)?.slice(0, 110)}`;
  } catch (error) {
    out = `throws "${String(error?.message).slice(0, 50)}"`;
  }
  console.log(`${label.padEnd(46)} ${out}`);
}

console.log("== What ofx-js does with odd input ==");
behaves("no <OFX> at all (a CSV)", "Date,Amount\n2026-01-01,5.00\n");
behaves("empty string", "");
behaves("two downloads, one after the other", "<OFX><A>1</A></OFX>\n<OFX><B>2</B></OFX>");
behaves("DOCTYPE and entity before <OFX>", '<!DOCTYPE OFX [<!ENTITY x "y">]>\n<OFX><A>&x;</A></OFX>');
behaves("DOCTYPE inside <OFX>", '<OFX><!DOCTYPE foo [<!ENTITY a "b">]><A>&a;</A></OFX>');
behaves("the five XML entities and a number", "<OFX><A>&lt;&gt;&amp;&quot;&apos;&#65;</A></OFX>");
behaves("CDATA", "<OFX><A><![CDATA[hi]]></A></OFX>");
behaves("SGML leaf with nothing after it", "<OFX>\n<A>\n<B>\n<C>5\n</A>\n</OFX>");
behaves("SGML text with a bare <", "<OFX>\n<N>A < B\n</OFX>");
behaves("SGML text with a bare &", "<OFX>\n<N>AT&T PAYMENT\n</OFX>");
behaves("XML value with spaces around it", "<OFX><A> 5 </A></OFX>");
behaves("one child, then two children", "<OFX><L><T>1</T></L></OFX>");
behaves("two children of the same name", "<OFX><L><T>1</T><T>2</T></L></OFX>");
behaves("a tag named __proto__", "<OFX><__proto__><x>1</x></__proto__></OFX>");
behaves("tags named constructor and toString", "<OFX><constructor>1</constructor><toString>2</toString></OFX>");
behaves("text after the closing </OFX>", "<OFX><A>1</A></OFX>JUNK<A>");
behaves("cut off before </OFX>", "<OFX><A>1</A>");
console.log(`Object.prototype still clean: ${Object.keys(Object.prototype).length === 0 && ({}).x === undefined}\n`);

// ---- timing -------------------------------------------------------------------------------

const MB = 1024 * 1024;
function time(label, text) {
  const started = performance.now();
  const heap = process.memoryUsage().heapUsed;
  let result = "ok";
  try {
    parseSync(text);
  } catch (error) {
    result = `throws ${error?.constructor?.name}`;
  }
  const ms = (performance.now() - started).toFixed(0).padStart(6);
  const used = ((process.memoryUsage().heapUsed - heap) / MB).toFixed(0).padStart(5);
  console.log(`${label.padEnd(46)} ${(text.length / MB).toFixed(1).padStart(5)} MB ${ms} ms  heap ${used} MB  ${result}`);
}

const transaction = (i, sgml) =>
  sgml
    ? `<STMTTRN>\n<TRNTYPE>CREDIT\n<DTPOSTED>20260105\n<TRNAMT>${(i % 1000) + 0.25}\n<FITID>F${i}\n<NAME>CUSTOMER ${i}\n<MEMO>Invoice ${i}\n</STMTTRN>\n`
    : `<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20260105</DTPOSTED><TRNAMT>${(i % 1000) + 0.25}</TRNAMT><FITID>F${i}</FITID><NAME>CUSTOMER ${i}</NAME><MEMO>Invoice ${i}</MEMO></STMTTRN>`;
const statement = (count, sgml) => {
  let body = "";
  for (let i = 0; i < count; i += 1) body += transaction(i, sgml);
  return `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>CAD</CURDEF><BANKTRANLIST>${body}</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
};

console.log("== How long ofx-js takes (this computer; compare runs, not absolute numbers) ==");
time("a real-looking XML statement, about 10 MB", statement(58_000, false));
time("a real-looking SGML statement, about 10 MB", statement(77_000, true));
time("2.5 million <A/> tags", `<OFX>${"<A/>".repeat(2_500_000)}</OFX>`);
time("1.6 million unclosed SGML leaves", `<OFX><A>\n${"<B>1\n".repeat(1_600_000)}</A></OFX>`);
time("3 million unclosed <A>1", `<OFX>${"<A>1".repeat(3_000_000)}`);
time("10 MB of dotted tag starts (<A.)", `<OFX>${"<A.".repeat(3 * MB)}`);
time("10 MB of spaces", `<OFX>${" ".repeat(10 * MB)}`);
time("10 MB of unclosed comment starts", `<OFX>${"<!--".repeat(2.5 * MB)}`);
time("a 40-character tag name (hours in <= 1.1.1)", `<OFX><${"A".repeat(40)}>1`);
time("nesting 5,000 deep", `<OFX>${"<A>".repeat(5000)}${"</A>".repeat(5000)}</OFX>`);
time("nesting 200,000 deep", `<OFX>${"<A>".repeat(200_000)}${"</A>".repeat(200_000)}</OFX>`);

// A crude random fuzz: structural fragments glued together. Looks for the one slow case.
let seed = 12345;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pieces = ["<", ">", "/", "A", "B", ".", "_", " ", "\n", "<A>", "</A>", "<B>", "<!--", "-->", "&amp;", "=", '"', "<A.B>", "<?xml", "-"];
let slowest = 0;
let threw = 0;
for (let run = 0; run < 20_000; run += 1) {
  let text = "<OFX>";
  const count = 5 + Math.floor(random() * 300);
  for (let k = 0; k < count; k += 1) text += pieces[Math.floor(random() * pieces.length)];
  const started = performance.now();
  try {
    parseSync(text);
  } catch {
    threw += 1;
  }
  slowest = Math.max(slowest, performance.now() - started);
}
console.log(`random fuzz, 20,000 inputs: ${threw} refused, slowest ${slowest.toFixed(2)} ms`);
