# Connectors — how figures from accounting software reach DotAmi

Status: research and decisions, 2026-09-24. Nothing here is built yet. The design this
builds on is [architecture/connectors-and-agents.md](../architecture/connectors-and-agents.md);
the roadmap entries are [§5](../roadmap.md#5-connecting-to-accounting-software-and-financial-records--locally)
and [§7](../roadmap.md#7-dotami-as-an-mcp-server--the-map-any-agent-can-read).

Every claim about a vendor below links the vendor's own page and the day it was read. Blogs,
directories and aggregators are not sources here. Where a vendor's own docs did not say
something, this page says *not confirmed* rather than filling the gap. Vendors change these
pages — if one is out of date, a PR that updates the row and the date is welcome.

## Decisions (2026-09-24, updated 2026-09-29)

Decisions 2, 4 and 5 changed on 2026-09-29 to match
[architecture/use-cases.md](../architecture/use-cases.md), which is the newer plan: the
person decides, and DotAmi warns.

1. **Excel and CSV files first, for every package.** Each of the five packages below lets a
   person export reports by hand, so one file importer covers all of them. It is the only
   route that needs no login, no developer account and no network.
2. **No keys by default; the person's own keys if they choose.** Logged-in connecting is done
   by the Lens (DotAmi's built-in agent, on the person's own model) or by the person's own
   agent (Claude Code, Claude Desktop, any MCP client), through the vendor's official MCP
   server or command-line tool where one exists. A person who wants that connection adds
   their own keys, after a warning; they are kept in the operating system's keychain, never in
   the database. Figures arrive as *proposed*, and only the person agreeing confirms one.
3. **DotAmi stores totals, not rows.** An import keeps a total per period, the row count and
   the file's name; the file is read in memory and not kept. Fewer stored rows, less to lose.
4. **Bank and card records are the person's call.** They are more sensitive than a profit and
   loss report, and the project doesn't recommend it, but a person may point DotAmi at a bank
   statement after a warning. What we found about banks is below under
   [Bank records](#bank-records--what-we-found).
5. **The built-in browser is the person's call under their vendor's terms.** The Lens can
   drive a browser inside the app (QuickBooks, Xero or email open in it) when the person
   switches it on. [The vendors' terms](#browser-automation--what-each-vendors-terms-say)
   differ and some forbid automation; DotAmi quotes them in the warning, and the person
   decides.

## The five packages, four ways in (read 2026-09-24)

| | Official MCP server | Public API | Official command-line tool | Hand export |
|---|---|---|---|---|
| QuickBooks Online | Yes — [intuit/quickbooks-online-mcp-server][qbo-mcp] | Yes — production access needs Intuit's [app assessment questionnaire][qbo-assess] | Yes — [intuit/intuit-cli-for-quickbooks][qbo-cli] | [Excel][qbo-export] |
| Xero | Yes — [XeroAPI/xero-mcp-server][xero-mcp], listed on [developer.xero.com/ai][xero-ai] | Yes — free Starter tier up to 5 connected organisations, paid above ([pricing][xero-price]) | Yes — [XeroAPI/xero-command-line][xero-cli] | [Excel / CSV][xero-export] |
| Wave | No official server found | Yes — [GraphQL API][wave-api], free "but we reserve the right to charge" ([API terms][wave-tos]) | None found | [CSV / PDF per report][wave-export]; [XLS/CSV account export][wave-bulk] |
| FreshBooks | No official server found | Yes — [OAuth app][fb-api]; app-store review applies to public listings ([requirements][fb-public]) | None found | [Excel / CSV][fb-export] |
| Sage Accounting (cloud) | No — Sage's official MCP servers are for [Sage Intacct][sage-intacct-mcp] and [Sage Operations][sage-ops-mcp], different products | Yes — [Accounting API v3.1][sage-api] | None found | [PDF / CSV / Excel][sage-export] |
| Sage 50 Canada (desktop) | No | [SDK][sage50-sdk]; reading through ODBC ([setup][sage50-odbc]), which can be limited per user to ["Read data"][sage50-rights] (read 2026-10-06) | None found | CSV / Excel (not confirmed on a Sage page we could read) |

Notes, from the same pages:

- **QuickBooks MCP server** runs locally as a subprocess of the agent, authenticates with
  OAuth 2.0, and has switches (`QUICKBOOKS_DISABLE_WRITE`, `_UPDATE`, `_DELETE`) that make it
  read-only. It exposes the Profit and Loss, General Ledger, Balance Sheet, Trial Balance and
  Cash Flow reports.
- **Xero command-line tool** logs in with OAuth 2.0 + PKCE (no client secret) and keeps tokens
  in the operating system's keychain.
- **Sage 50 Canada ODBC (corrected 2026-10-06).** This row used to link an article on Sage's
  United States knowledge base (solution 221924750012693). That article sets up
  the Pervasive database engine and talks about state and federal tax, so it describes a
  different product from the Canadian edition and has been removed. What Sage's own Canadian
  2026 help says instead: other programs open the company data through ODBC, using a MySQL
  Connector driver (version 3.51.14 or higher) and a Sage user name and password
  ([setup][sage50-odbc]); each user's third-party access right is "No data access", "Read
  data" or "Read and write data", and read and write isn't available for shared companies
  ([rights][sage50-rights]). Sage strongly discourages changing the data from outside Sage 50.
  Both pages are dated June 10, 2026 and were read 2026-10-06. Neither says whether Sage 50
  has to be running while another program reads the data.
- **Not confirmed in vendor docs:** whether the QuickBooks MCP server and command-line tool are
  supported for Canadian companies specifically (Intuit's [partner program][qbo-partner] names
  Canada, excluding Quebec); whether Xero's free tier needs certification before connecting your
  own organisation; whether FreshBooks API registration is free; the Sage 50 Canada export
  limits.

## Browser automation — what each vendor's terms say

Read 2026-09-24. Quoted, not interpreted — this page is not legal advice.

| Vendor | Where | What it says |
|---|---|---|
| Intuit (QuickBooks) | [Website terms][intuit-tos], *Prohibited Uses* — covers QuickBooks | Bars unauthorized access "including scraping, accessing, or downloading content that doesn't belong to you" |
| Xero | [Developer Platform terms][xero-dev-tos], §29 | Bars scraping "including with bots or browser automation". The [Canadian terms of use][xero-tos] have no such clause |
| Wave | [API terms][wave-tos] | Bars scraping any part of the website "except as explicitly permitted". Wave's general terms page did not load |
| FreshBooks | [Terms of service][fb-tos], §9 | "you may not use any data mining, robots or similar data gathering or extraction methods" |
| Sage | — | Sage's terms pages returned an error; not confirmed |

## Bank records — what we found

Bank and card records are the person's call (decision 4). This is where things stood on
2026-09-23:

- **No big Canadian bank publishes a customer API or MCP server.** We checked RBC, TD,
  Scotiabank, BMO, CIBC, National Bank, Desjardins and ATB and found only file downloads
  (CSV, and at most banks OFX/QFX or QuickBooks formats) and third-party aggregators.
- **Open banking is law but not live.** The Consumer-Driven Banking Act received Royal Assent in
  March 2026; draft regulations were published in the [Canada Gazette, Part I, 2026-06-27][gazette],
  which limits phase one to read-only access and gives no live date. Finance Canada's
  [Budget 2025 page][fin-cdb] says the Bank of Canada will oversee it and that a second phase
  (payments) follows 12 to 18 months of further consultation. An earlier [FCAC release][fcac-cdb]
  (2024) named FCAC as overseer — the two official pages disagree.
- **OFX** is maintained by the [Financial Data Exchange][fdx-ofx]; QFX is OFX plus Intuit-specific
  tags, so an OFX reader generally reads QFX. DotAmi's reader is built (no screen yet) on the free
  `ofx-js` package, read in full and pinned: [ofx-reader-review.md](ofx-reader-review.md).
- **hledger and Ledger journals** are plain text. DotAmi has its own reader (no screen yet),
  written from hledger's published manual rather than its GPL-3.0 code; what it reads and what it
  refuses: [journal-reader.md](journal-reader.md).
- **CRA has no public API.** Electronic GST/HST and income-tax filing goes through
  [CRA-certified software][cra-software] or [My Business Account][cra-mba]; an uncertified
  self-hosted app cannot transmit returns. DotAmi never files anyway.

## Adding a connector

One page per source at `docs/connectors/<name>.md`: what it is, how figures get from it to
DotAmi (a hand export, an official MCP server the person's agent uses, or a local read-only
adapter), which fact kinds it yields, what it stores and what it doesn't, and its status (idea ·
tested · in the repo). Test files are invented — never a real person's export.

[qbo-mcp]: https://github.com/intuit/quickbooks-online-mcp-server
[qbo-cli]: https://github.com/intuit/intuit-cli-for-quickbooks
[qbo-assess]: https://help.developer.intuit.com/s/article/New-app-assessment-process-FAQ
[qbo-partner]: https://www.intuitapppartners.com/
[qbo-export]: https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/export-reports-excel-quickbooks-online/L7iAoP97n_US_en_US
[intuit-tos]: https://www.intuit.com/legal/terms/en-us/website/
[xero-mcp]: https://github.com/XeroAPI/xero-mcp-server
[xero-cli]: https://github.com/XeroAPI/xero-command-line
[xero-ai]: https://developer.xero.com/ai
[xero-price]: https://developer.xero.com/pricing
[xero-export]: https://central.xero.com/0/article/Export-general-ledger-data-out-of-Xero
[xero-dev-tos]: https://developer.xero.com/xero-developer-platform-terms-conditions
[xero-tos]: https://www.xero.com/legal/terms/
[wave-api]: https://developer.waveapps.com/hc/en-us/articles/360020333332-Welcome-to-the-Wave-API
[wave-tos]: https://www.waveapps.com/legal/terms-of-service-api-by-wave
[wave-export]: https://support.waveapps.com/hc/en-us/articles/38600080764692-Export-a-report
[wave-bulk]: https://support.waveapps.com/hc/en-us/articles/4411360860692-Download-your-account-data
[fb-api]: https://www.freshbooks.com/api/start
[fb-public]: https://www.freshbooks.com/api/requirement-for-public-apps-on-the-freshbooks-app-store
[fb-export]: https://support.freshbooks.com/hc/en-us/articles/227478548-How-do-I-export-my-reports
[fb-tos]: https://www.freshbooks.com/policies/terms-of-service
[sage-intacct-mcp]: https://developer.sage.com/intacct/mcps/intacct-mcp/latest/intacct-mcp-server
[sage-ops-mcp]: https://developer.sage.com/operations/docs/latest/mcp-server/overview
[sage-api]: https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting
[sage-export]: https://help.sbc.sage.com/en-us/accounting/reporting/financial-reports/the-profit-and-loss-report.html
[sage50-sdk]: https://support.na.sage.com/selfservice/viewContent.do?externalId=13102&sliceId=1
[sage50-odbc]: https://help-sage50.na.sage.com/en-ca/core/2026/Content/System_Settings/Security/UseThirdPartySoftwareWithSage50Data.htm
[sage50-rights]: https://help-sage50.na.sage.com/en-ca/core/2026/Content/System_Settings/Security/UserRightsThirdPartyProducts.htm
[gazette]: https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html
[fin-cdb]: https://www.canada.ca/en/department-finance/programs/financial-sector-policy/open-banking-implementation/budget-2025-canadas-framework-for-consumer-driven-banking.html
[fcac-cdb]: https://www.canada.ca/en/financial-consumer-agency/news/2024/06/fcac-welcomes-new-mandate-to-oversee-canadas-consumer-driven-banking-framework.html
[fdx-ofx]: https://financialdataexchange.org/about-fdx/ofx-work-group/
[cra-software]: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/file-gst-hst-return/how-file/using-third-party-software.html
[cra-mba]: https://www.canada.ca/content/canadasite/en/revenue-agency/services/e-services/digital-services-businesses/business-account/about-business-account.html
