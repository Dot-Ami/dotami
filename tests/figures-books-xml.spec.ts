/**
 * [8h] The strict XML reader (lib/figures/books/xml.ts): what it walks, and everything it refuses
 * instead of guessing at.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_DEPTH,
  walkXml,
  XmlRefusal,
  type XmlAttributes,
  type XmlRefusalReason,
} from "@/lib/figures/books/xml";

/** Walks `xml` and returns what the handlers saw, as one readable list. */
function events(xml: string): string[] {
  const seen: string[] = [];
  walkXml(xml, {
    open: (name, attrs) =>
      seen.push(`open ${name}${attrs.size ? " " + JSON.stringify(Object.fromEntries(attrs)) : ""}`),
    close: (name) => seen.push(`close ${name}`),
    text: (text) => {
      if (text.trim() !== "") seen.push(`text ${JSON.stringify(text)}`);
    },
  });
  return seen;
}

/** The reason an XML text was refused for, failing the test if it was accepted. */
function refusedFor(xml: string): XmlRefusalReason {
  try {
    walkXml(xml, { open: () => {}, close: () => {}, text: () => {} });
  } catch (error) {
    if (error instanceof XmlRefusal) return error.reason;
    throw error;
  }
  throw new Error("expected the XML to be refused");
}

describe("walkXml — what it reads", () => {
  it("calls back for tags, attributes and text in order", () => {
    expect(events(`<a x="1" y='two'><b>hi</b><c/></a>`)).toEqual([
      `open a {"x":"1","y":"two"}`,
      "open b",
      'text "hi"',
      "close b",
      "open c",
      "close c",
      "close a",
    ]);
  });

  it("keeps prefixed names and attributes as written", () => {
    expect(
      events(
        `<gnc-v2 xmlns:gnc="http://www.gnucash.org/XML/gnc"><gnc:book version="2.0.0"/></gnc-v2>`,
      ),
    ).toEqual([
      `open gnc-v2 {"xmlns:gnc":"http://www.gnucash.org/XML/gnc"}`,
      `open gnc:book {"version":"2.0.0"}`,
      "close gnc:book",
      "close gnc-v2",
    ]);
  });

  it("decodes the built-in entities and character references, in text and in attributes", () => {
    expect(
      events(`<a t="a &amp; b">x &lt;y&gt; &quot;z&quot; &apos;w&apos; &#65;&#x42;&#x1F600;</a>`),
    ).toEqual([`open a {"t":"a & b"}`, 'text "x <y> \\"z\\" \'w\' AB\u{1F600}"', "close a"]);
  });

  it("decodes only once: &amp;lt; is the text &lt;, not <", () => {
    expect(events(`<a>&amp;lt;</a>`)).toEqual(["open a", 'text "&lt;"', "close a"]);
  });

  it("takes CDATA as literal text and skips comments and the leading <?xml?> line", () => {
    expect(
      events(
        `<?xml version="1.0" encoding="UTF-8" ?><!-- hello --><a><![CDATA[1 < 2 & &amp;]]></a><!-- bye -->\n`,
      ),
    ).toEqual(["open a", 'text "1 < 2 & &amp;"', "close a"]);
  });

  it("allows a > inside text and inside an attribute value", () => {
    expect(events(`<a t="1>0">2 > 1</a>`)).toEqual([
      'open a {"t":"1>0"}',
      'text "2 > 1"',
      "close a",
    ]);
  });

  it("keeps attributes named __proto__ or constructor as plain attributes, touching no prototype", () => {
    const seen: XmlAttributes[] = [];
    walkXml(`<a __proto__="x" constructor="y" hasOwnProperty="z"/>`, {
      open: (_name, attrs) => seen.push(attrs),
      close: () => {},
      text: () => {},
    });
    expect(seen).toHaveLength(1);
    expect([...seen[0]]).toEqual([
      ["__proto__", "x"],
      ["constructor", "y"],
      ["hasOwnProperty", "z"],
    ]);
    // Nothing leaked onto every object.
    expect(({} as Record<string, unknown>).hasOwnProperty).toBe(Object.prototype.hasOwnProperty);
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it("allows spaces before the > of a closing tag and around the =", () => {
    expect(events(`<a  t = "1" ></a >`)).toEqual(['open a {"t":"1"}', "close a"]);
  });

  it("walks a deep document up to the depth limit", () => {
    const deep = "<a>".repeat(MAX_DEPTH) + "</a>".repeat(MAX_DEPTH);
    expect(events(deep)).toHaveLength(MAX_DEPTH * 2);
  });
});

describe("walkXml — what it refuses", () => {
  it("refuses a document type declaration, so no entity can ever be defined", () => {
    expect(refusedFor(`<!DOCTYPE a><a/>`)).toBe("doctype");
    expect(refusedFor(`<?xml version="1.0"?><!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>`)).toBe(
      "doctype",
    );
  });

  it("refuses a billion-laughs document before anything expands", () => {
    const laughs = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<lolz>&lol3;</lolz>`;
    expect(refusedFor(laughs)).toBe("doctype");
  });

  it("refuses an entity it doesn't know, a bare &, and a bad character reference", () => {
    expect(refusedFor(`<a>&nbsp;</a>`)).toBe("entity");
    expect(refusedFor(`<a>fish & chips</a>`)).toBe("entity");
    expect(refusedFor(`<a t="&custom;"/>`)).toBe("entity");
    expect(refusedFor(`<a>&#0;</a>`)).toBe("malformed");
    expect(refusedFor(`<a>&#xD800;</a>`)).toBe("malformed");
    expect(refusedFor(`<a>&#x110000;</a>`)).toBe("malformed");
  });

  it("refuses processing instructions after the first line", () => {
    expect(refusedFor(`<a><?php echo 1 ?></a>`)).toBe("unsupported");
    expect(refusedFor(`<?xml-stylesheet href="x"?><a/>`)).toBe("unsupported");
    expect(refusedFor(` <?xml version="1.0"?><a/>`)).toBe("unsupported"); // not at the very start
  });

  it("refuses an encoding other than UTF-8 and a version other than 1.0", () => {
    expect(refusedFor(`<?xml version="1.0" encoding="ISO-8859-1"?><a/>`)).toBe("encoding");
    expect(refusedFor(`<?xml version="1.1"?><a/>`)).toBe("malformed");
    expect(refusedFor(`<?xml encoding="utf-8"?><a/>`)).toBe("malformed");
  });

  it("refuses a document that is cut short, or has nothing in it", () => {
    for (const xml of [
      "",
      "   ",
      "<a>",
      "<a><b></b>",
      "<a",
      "<a x=",
      `<a x="1`,
      "<a><!-- never closed",
      "<a><![CDATA[never closed",
    ]) {
      expect(refusedFor(xml), JSON.stringify(xml)).toBe("malformed");
    }
  });

  it("refuses tags that don't match, text outside the root and a second root", () => {
    expect(refusedFor(`<a></b>`)).toBe("malformed");
    expect(refusedFor(`<a><b></a></b>`)).toBe("malformed");
    expect(refusedFor(`</a>`)).toBe("malformed");
    expect(refusedFor(`junk<a/>`)).toBe("malformed");
    expect(refusedFor(`<a/>junk`)).toBe("malformed");
    expect(refusedFor(`<a/><b/>`)).toBe("malformed");
    expect(refusedFor(`<a/><![CDATA[x]]>`)).toBe("malformed");
  });

  it("refuses badly written attributes", () => {
    expect(refusedFor(`<a x=1/>`)).toBe("malformed");
    expect(refusedFor(`<a x/>`)).toBe("malformed");
    expect(refusedFor(`<a x="1" x="2"/>`)).toBe("malformed");
    expect(refusedFor(`<a x="<"/>`)).toBe("malformed");
    expect(refusedFor(`<a x="1"y="2"/>`)).toBe("malformed"); // no space between attributes
    expect(refusedFor(`<a/ >`)).toBe("malformed");
  });

  it("refuses names it doesn't read (a digit first, a non-ASCII letter)", () => {
    expect(refusedFor(`<1a/>`)).toBe("malformed");
    expect(refusedFor(`<é/>`)).toBe("malformed");
    expect(refusedFor(`<>`)).toBe("malformed");
  });

  it("refuses nesting deeper than the limit", () => {
    const tooDeep = "<a>".repeat(MAX_DEPTH + 1) + "</a>".repeat(MAX_DEPTH + 1);
    expect(refusedFor(tooDeep)).toBe("malformed");
  });

  it("refuses with a fixed reason that carries nothing from the file", () => {
    try {
      walkXml(`<a>&secret-amount-98765;</a>`, { open: () => {}, close: () => {}, text: () => {} });
      throw new Error("expected a refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(XmlRefusal);
      expect((error as Error).message).toBe("XML refused: entity");
      expect((error as Error).message).not.toContain("98765");
    }
  });

  it("does not let a handler's own refusal be swallowed", () => {
    expect(() =>
      walkXml(`<a/>`, {
        open: () => {
          throw new Error("handler said no");
        },
        close: () => {},
        text: () => {},
      }),
    ).toThrow("handler said no");
  });
});
