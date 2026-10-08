/**
 * [8h] Test helpers: invented GnuCash books, built in code — no real person's books are ever used.
 *
 * Two kinds:
 *  - gnucashXml(): a builder that writes a book the way GnuCash lays it out (gnucash-v2.rnc order),
 *    for tests that need a book with a particular shape;
 *  - GOLDEN_BOOK_XML: one book written out by hand, so the reader isn't only ever tested against
 *    the same understanding of the format that the builder has.
 * Every name, amount and date below is made up.
 */
import { gzipSync, strToU8 } from "fflate";

export interface FxAccount {
  /** A short handle the transactions use to point at this account. */
  key: string;
  name: string;
  /** act:type as GnuCash writes it: INCOME, BANK, ... */
  type: string;
  /** The handle of the parent account; the root account when left out. */
  parent?: string;
  /** The account's own commodity; CURRENCY/CAD when left out, none at all when null. */
  commodity?: { space: string; id: string } | null;
}

export interface FxSplit {
  /** An account's handle. */
  account: string;
  /** "num/denom", as GnuCash writes it: "-12500/100". */
  quantity: string;
  /** Defaults to the quantity. */
  value?: string;
}

export interface FxTransaction {
  /** The calendar day, YYYY-MM-DD. */
  date: string;
  /** What GnuCash writes after the day; "10:59:00 +0000" (neutral time) when left out. */
  time?: string;
  description?: string;
  splits: FxSplit[];
}

export interface FxBook {
  accounts: FxAccount[];
  transactions: FxTransaction[];
  /** Scheduled transactions' lines, written inside gnc:template-transactions. */
  templateTransactions?: FxTransaction[];
  /** The book's "features", by name. */
  features?: string[];
}

const NAMESPACES = [
  "gnc",
  "act",
  "book",
  "cd",
  "cmdty",
  "price",
  "slot",
  "split",
  "sx",
  "trn",
  "ts",
  "fs",
  "bgt",
  "recurrence",
  "lot",
  "addr",
  "owner",
  "billterm",
  "bt-days",
  "bt-prox",
  "cust",
  "employee",
  "entry",
  "invoice",
  "job",
  "order",
  "taxtable",
  "tte",
  "vendor",
];

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The opening <gnc-v2 …> tag with every prefix declared, as GnuCash writes it. */
export function gncOpenTag(): string {
  const decls = NAMESPACES.map((p) => `     xmlns:${p}="http://www.gnucash.org/XML/${p}"`).join(
    "\n",
  );
  return `<gnc-v2\n${decls}>`;
}

/** A GnuCash book as XML text. */
export function gnucashXml(book: FxBook): string {
  let counter = 0;
  const guids = new Map<string, string>();
  const fresh = () => (counter += 1).toString(16).padStart(32, "0");
  const guidFor = (key: string) => {
    let g = guids.get(key);
    if (!g) {
      g = fresh();
      guids.set(key, g);
    }
    return g;
  };

  const commodityXml = (c: { space: string; id: string }, indent = "") =>
    `${indent}<cmdty:space>${escapeXml(c.space)}</cmdty:space>\n${indent}<cmdty:id>${escapeXml(c.id)}</cmdty:id>`;

  const accountXml = (a: FxAccount, parentKey: string | null) => {
    const commodity = a.commodity === undefined ? { space: "CURRENCY", id: "CAD" } : a.commodity;
    return [
      `<gnc:account version="2.0.0">`,
      `  <act:name>${escapeXml(a.name)}</act:name>`,
      `  <act:id type="guid">${guidFor(a.key)}</act:id>`,
      `  <act:type>${a.type}</act:type>`,
      commodity
        ? `  <act:commodity>\n${commodityXml(commodity, "    ")}\n  </act:commodity>\n  <act:commodity-scu>100</act:commodity-scu>`
        : "",
      parentKey ? `  <act:parent type="guid">${guidFor(parentKey)}</act:parent>` : "",
      `</gnc:account>`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const transactionXml = (t: FxTransaction) => {
    const stamp = `${t.date} ${t.time ?? "10:59:00 +0000"}`;
    const splits = t.splits
      .map((s) =>
        [
          `    <trn:split>`,
          `      <split:id type="guid">${fresh()}</split:id>`,
          `      <split:reconciled-state>n</split:reconciled-state>`,
          `      <split:value>${s.value ?? s.quantity}</split:value>`,
          `      <split:quantity>${s.quantity}</split:quantity>`,
          `      <split:account type="guid">${guidFor(s.account)}</split:account>`,
          `    </trn:split>`,
        ].join("\n"),
      )
      .join("\n");
    return [
      `<gnc:transaction version="2.0.0">`,
      `  <trn:id type="guid">${fresh()}</trn:id>`,
      `  <trn:currency>\n${commodityXml({ space: "CURRENCY", id: "CAD" }, "    ")}\n  </trn:currency>`,
      `  <trn:date-posted>\n    <ts:date>${stamp}</ts:date>\n  </trn:date-posted>`,
      `  <trn:date-entered>\n    <ts:date>${t.date} 12:00:00 +0000</ts:date>\n  </trn:date-entered>`,
      `  <trn:description>${escapeXml(t.description ?? "Invented entry")}</trn:description>`,
      `  <trn:splits>\n${splits}\n  </trn:splits>`,
      `</gnc:transaction>`,
    ].join("\n");
  };

  const featuresXml = book.features?.length
    ? [
        `<book:slots>`,
        `  <slot>`,
        `    <slot:key>features</slot:key>`,
        `    <slot:value type="frame">`,
        ...book.features.map(
          (f) =>
            `      <slot>\n        <slot:key>${escapeXml(f)}</slot:key>\n        <slot:value type="string">described elsewhere</slot:value>\n      </slot>`,
        ),
        `    </slot:value>`,
        `  </slot>`,
        `</book:slots>`,
      ].join("\n")
    : "";

  const root: FxAccount = { key: "root", name: "Root Account", type: "ROOT", commodity: null };
  const commodities = new Map<string, { space: string; id: string }>();
  for (const a of book.accounts) {
    const c = a.commodity === undefined ? { space: "CURRENCY", id: "CAD" } : a.commodity;
    if (c) commodities.set(`${c.space}/${c.id}`, c);
  }

  const parts = [
    `<?xml version="1.0" encoding="utf-8" ?>`,
    gncOpenTag(),
    `<gnc:count-data cd:type="book">1</gnc:count-data>`,
    `<gnc:book version="2.0.0">`,
    `<book:id type="guid">${fresh()}</book:id>`,
    featuresXml,
    `<gnc:count-data cd:type="commodity">${commodities.size}</gnc:count-data>`,
    `<gnc:count-data cd:type="account">${book.accounts.length + 1}</gnc:count-data>`,
    `<gnc:count-data cd:type="transaction">${book.transactions.length}</gnc:count-data>`,
    ...[...commodities.values()].map(
      (c) =>
        `<gnc:commodity version="2.0.0">\n${commodityXml(c, "  ")}\n  <cmdty:get_quotes/>\n  <cmdty:quote_source>currency</cmdty:quote_source>\n  <cmdty:quote_tz/>\n</gnc:commodity>`,
    ),
    accountXml(root, null),
    ...book.accounts.map((a) => accountXml(a, a.parent ?? "root")),
    ...book.transactions.map(transactionXml),
    book.templateTransactions?.length
      ? `<gnc:template-transactions>\n${book.templateTransactions.map(transactionXml).join("\n")}\n</gnc:template-transactions>`
      : "",
    `</gnc:book>`,
    `</gnc-v2>`,
    "",
  ];
  return parts.filter((p) => p !== "").join("\n");
}

/** The same book the way GnuCash saves it by default: gzip-compressed. */
export function gnucashGz(xml: string): Uint8Array {
  return gzipSync(strToU8(xml));
}

/** A reusable little business: one CAD income account, one bank account, one USD income account. */
export function smallBook(overrides: Partial<FxBook> = {}): FxBook {
  return {
    accounts: [
      { key: "income", name: "Income", type: "INCOME" },
      { key: "sales", name: "Sales", type: "INCOME", parent: "income" },
      {
        key: "usd",
        name: "US Sales",
        type: "INCOME",
        parent: "income",
        commodity: { space: "CURRENCY", id: "USD" },
      },
      { key: "bank", name: "Chequing", type: "BANK" },
    ],
    transactions: [],
    ...overrides,
  };
}

/**
 * A book written out by hand, in the order GnuCash writes it, with a scheduled transaction and two
 * of the book's features. Invented: "Maple Test Studio" does not exist.
 *
 * What is in it (every amount in CAD):
 *   Income:Consulting   Jan 2026   sale   1,200.00
 *                       Feb 2026   sale   2,500.00, refund 300.00
 *   Income:Interest     Feb 2026          12.34
 *   Income:Consulting   Oct 2026   sale     999.00   (a month that hasn't ended on 2026-10-06)
 *   Assets:Chequing     the other side of each of the above
 *   A scheduled "Monthly retainer" of 500.00 into a template account
 */
export const GOLDEN_BOOK_XML = `<?xml version="1.0" encoding="utf-8" ?>
<gnc-v2
     xmlns:gnc="http://www.gnucash.org/XML/gnc"
     xmlns:act="http://www.gnucash.org/XML/act"
     xmlns:book="http://www.gnucash.org/XML/book"
     xmlns:cd="http://www.gnucash.org/XML/cd"
     xmlns:cmdty="http://www.gnucash.org/XML/cmdty"
     xmlns:price="http://www.gnucash.org/XML/price"
     xmlns:slot="http://www.gnucash.org/XML/slot"
     xmlns:split="http://www.gnucash.org/XML/split"
     xmlns:sx="http://www.gnucash.org/XML/sx"
     xmlns:trn="http://www.gnucash.org/XML/trn"
     xmlns:ts="http://www.gnucash.org/XML/ts"
     xmlns:fs="http://www.gnucash.org/XML/fs"
     xmlns:bgt="http://www.gnucash.org/XML/bgt"
     xmlns:recurrence="http://www.gnucash.org/XML/recurrence"
     xmlns:lot="http://www.gnucash.org/XML/lot"
     xmlns:addr="http://www.gnucash.org/XML/addr"
     xmlns:owner="http://www.gnucash.org/XML/owner"
     xmlns:billterm="http://www.gnucash.org/XML/billterm"
     xmlns:bt-days="http://www.gnucash.org/XML/bt-days"
     xmlns:bt-prox="http://www.gnucash.org/XML/bt-prox"
     xmlns:cust="http://www.gnucash.org/XML/cust"
     xmlns:employee="http://www.gnucash.org/XML/employee"
     xmlns:entry="http://www.gnucash.org/XML/entry"
     xmlns:invoice="http://www.gnucash.org/XML/invoice"
     xmlns:job="http://www.gnucash.org/XML/job"
     xmlns:order="http://www.gnucash.org/XML/order"
     xmlns:taxtable="http://www.gnucash.org/XML/taxtable"
     xmlns:tte="http://www.gnucash.org/XML/tte"
     xmlns:vendor="http://www.gnucash.org/XML/vendor">
<gnc:count-data cd:type="book">1</gnc:count-data>
<gnc:book version="2.0.0">
<book:id type="guid">b00000000000000000000000000000b1</book:id>
<book:slots>
  <slot>
    <slot:key>features</slot:key>
    <slot:value type="frame">
      <slot>
        <slot:key>Number Field Source</slot:key>
        <slot:value type="string">User specifies source of 'num' field'; either transaction number or split action (requires at least GnuCash 2.5.0)</slot:value>
      </slot>
      <slot>
        <slot:key>Account GUID based Bayesian data</slot:key>
        <slot:value type="string">Use account GUID as key for Bayesian data (requires at least GnuCash 2.6.12)</slot:value>
      </slot>
    </slot:value>
  </slot>
  <slot>
    <slot:key>remove-color-not-set-slots</slot:key>
    <slot:value type="string">true</slot:value>
  </slot>
</book:slots>
<gnc:count-data cd:type="commodity">1</gnc:count-data>
<gnc:count-data cd:type="account">8</gnc:count-data>
<gnc:count-data cd:type="transaction">6</gnc:count-data>
<gnc:count-data cd:type="schedxaction">1</gnc:count-data>
<gnc:commodity version="2.0.0">
  <cmdty:space>CURRENCY</cmdty:space>
  <cmdty:id>CAD</cmdty:id>
  <cmdty:get_quotes/>
  <cmdty:quote_source>currency</cmdty:quote_source>
  <cmdty:quote_tz/>
</gnc:commodity>
<gnc:account version="2.0.0">
  <act:name>Root Account</act:name>
  <act:id type="guid">a0000000000000000000000000000000</act:id>
  <act:type>ROOT</act:type>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Assets</act:name>
  <act:id type="guid">a0000000000000000000000000000001</act:id>
  <act:type>ASSET</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:slots>
    <slot>
      <slot:key>placeholder</slot:key>
      <slot:value type="string">true</slot:value>
    </slot>
  </act:slots>
  <act:parent type="guid">a0000000000000000000000000000000</act:parent>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Chequing</act:name>
  <act:id type="guid">a0000000000000000000000000000002</act:id>
  <act:type>BANK</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:parent type="guid">a0000000000000000000000000000001</act:parent>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Income</act:name>
  <act:id type="guid">a0000000000000000000000000000003</act:id>
  <act:type>INCOME</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:parent type="guid">a0000000000000000000000000000000</act:parent>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Consulting &amp; Design</act:name>
  <act:id type="guid">a0000000000000000000000000000004</act:id>
  <act:type>INCOME</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:parent type="guid">a0000000000000000000000000000003</act:parent>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Interest</act:name>
  <act:id type="guid">a0000000000000000000000000000005</act:id>
  <act:type>INCOME</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:parent type="guid">a0000000000000000000000000000003</act:parent>
</gnc:account>
<gnc:account version="2.0.0">
  <act:name>Expenses</act:name>
  <act:id type="guid">a0000000000000000000000000000006</act:id>
  <act:type>EXPENSE</act:type>
  <act:commodity>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </act:commodity>
  <act:commodity-scu>100</act:commodity-scu>
  <act:parent type="guid">a0000000000000000000000000000000</act:parent>
</gnc:account>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000001</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-01-15 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-01-15 18:20:11 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Invoice 1001 - brand refresh</trn:description>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000001</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>120000/100</split:value>
      <split:quantity>120000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000002</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-120000/100</split:value>
      <split:quantity>-120000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000004</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000002</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-02-10 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-02-10 15:02:44 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Invoice 1002 - website</trn:description>
  <trn:slots>
    <slot>
      <slot:key>notes</slot:key>
      <slot:value type="string">paid by e-transfer</slot:value>
    </slot>
  </trn:slots>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000003</split:id>
      <split:memo>deposit</split:memo>
      <split:reconciled-state>c</split:reconciled-state>
      <split:reconcile-date>
        <ts:date>2026-02-12 10:59:00 +0000</ts:date>
      </split:reconcile-date>
      <split:value>250000/100</split:value>
      <split:quantity>250000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000004</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-250000/100</split:value>
      <split:quantity>-250000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000004</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000003</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-02-20 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-02-20 09:10:00 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Refund on invoice 1002</trn:description>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000005</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-30000/100</split:value>
      <split:quantity>-30000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000006</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>30000/100</split:value>
      <split:quantity>30000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000004</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000004</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-02-28 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-03-01 08:00:00 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Savings interest</trn:description>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000007</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>1234/100</split:value>
      <split:quantity>1234/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000008</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-1234/100</split:value>
      <split:quantity>-1234/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000005</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000005</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-03-03 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-03-03 10:00:00 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Hosting fees</trn:description>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d0000000000000000000000000000009</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>4000/100</split:value>
      <split:quantity>4000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000006</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d000000000000000000000000000000a</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-4000/100</split:value>
      <split:quantity>-4000/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:transaction version="2.0.0">
  <trn:id type="guid">c0000000000000000000000000000006</trn:id>
  <trn:currency>
    <cmdty:space>CURRENCY</cmdty:space>
    <cmdty:id>CAD</cmdty:id>
  </trn:currency>
  <trn:date-posted>
    <ts:date>2026-10-15 10:59:00 +0000</ts:date>
  </trn:date-posted>
  <trn:date-entered>
    <ts:date>2026-10-01 10:00:00 +0000</ts:date>
  </trn:date-entered>
  <trn:description>Invoice 1003 - dated ahead</trn:description>
  <trn:splits>
    <trn:split>
      <split:id type="guid">d000000000000000000000000000000b</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>99900/100</split:value>
      <split:quantity>99900/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000002</split:account>
    </trn:split>
    <trn:split>
      <split:id type="guid">d000000000000000000000000000000c</split:id>
      <split:reconciled-state>n</split:reconciled-state>
      <split:value>-99900/100</split:value>
      <split:quantity>-99900/100</split:quantity>
      <split:account type="guid">a0000000000000000000000000000004</split:account>
    </trn:split>
  </trn:splits>
</gnc:transaction>
<gnc:template-transactions>
  <gnc:account version="2.0.0">
    <act:name>Template Root</act:name>
    <act:id type="guid">e0000000000000000000000000000000</act:id>
    <act:type>ROOT</act:type>
  </gnc:account>
  <gnc:account version="2.0.0">
    <act:name>e0000000000000000000000000000002</act:name>
    <act:id type="guid">e0000000000000000000000000000001</act:id>
    <act:type>BANK</act:type>
    <act:commodity>
      <cmdty:space>template</cmdty:space>
      <cmdty:id>template</cmdty:id>
    </act:commodity>
    <act:commodity-scu>1</act:commodity-scu>
    <act:parent type="guid">e0000000000000000000000000000000</act:parent>
  </gnc:account>
  <gnc:transaction version="2.0.0">
    <trn:id type="guid">f0000000000000000000000000000001</trn:id>
    <trn:currency>
      <cmdty:space>CURRENCY</cmdty:space>
      <cmdty:id>CAD</cmdty:id>
    </trn:currency>
    <trn:date-posted>
      <ts:date>2026-02-01 10:59:00 +0000</ts:date>
    </trn:date-posted>
    <trn:date-entered>
      <ts:date>2026-02-01 10:59:00 +0000</ts:date>
    </trn:date-entered>
    <trn:description>Monthly retainer</trn:description>
    <trn:splits>
      <trn:split>
        <split:id type="guid">f1000000000000000000000000000001</split:id>
        <split:reconciled-state>n</split:reconciled-state>
        <split:value>-50000/100</split:value>
        <split:quantity>-50000/100</split:quantity>
        <split:account type="guid">e0000000000000000000000000000001</split:account>
        <split:slots>
          <slot>
            <slot:key>sched-xaction</slot:key>
            <slot:value type="frame">
              <slot>
                <slot:key>account</slot:key>
                <slot:value type="guid">a0000000000000000000000000000004</slot:value>
              </slot>
            </slot:value>
          </slot>
        </split:slots>
      </trn:split>
    </trn:splits>
  </gnc:transaction>
</gnc:template-transactions>
<gnc:schedxaction version="2.0.0">
  <sx:id type="guid">9000000000000000000000000000002e</sx:id>
  <sx:name>Monthly retainer</sx:name>
  <sx:enabled>y</sx:enabled>
  <sx:autoCreate>n</sx:autoCreate>
  <sx:autoCreateNotify>n</sx:autoCreateNotify>
  <sx:advanceCreateDays>0</sx:advanceCreateDays>
  <sx:advanceRemindDays>0</sx:advanceRemindDays>
  <sx:instanceCount>1</sx:instanceCount>
  <sx:start>
    <gdate>2026-02-01</gdate>
  </sx:start>
  <sx:templ-acct type="guid">e0000000000000000000000000000001</sx:templ-acct>
  <sx:schedule>
    <gnc:recurrence>
      <recurrence:mult>1</recurrence:mult>
      <recurrence:period_type>month</recurrence:period_type>
      <recurrence:start>
        <gdate>2026-02-01</gdate>
      </recurrence:start>
    </gnc:recurrence>
  </sx:schedule>
</gnc:schedxaction>
</gnc:book>
</gnc-v2>
`;
