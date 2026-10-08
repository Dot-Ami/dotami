# Sage 50 Canadian — getting sales figures out by export

Status: 2026-10-08. **Tested on practice files only** (invented files shaped from Sage's help pages,
never a real export). Nothing here connects to Sage 50; the person exports a report and drops it on
"Add from a file".

## What it is

Sage 50 Canadian (formerly Simply Accounting) is a desktop accounting program: the company's data
sits in a file on the person's own computer or office network. There is no Sage MCP server or
command-line tool for it ([the connectors research](README.md#the-five-packages-four-ways-in-read-2026-09-24)).

Only the export route exists: the person exports a report themselves (this page).

## The export route

What Sage's own Canadian help says, read 2026-10-08:

1. Open the report. For sales by customer and date, the Customer Sales report, Detail version:
   it shows quantity, revenue, cost of goods sold, profit, and markup or margin
   ([Customer Sales report][sales-report], Release 2024), and the Detail version lets the person
   choose its columns, show corrections, and include or leave out freight and other amounts
   ([its options][sales-options], Release 2024).
2. Click **Export** on the report viewer's toolbar, pick a folder and a name, open **Save as type**
   and choose the file type, then **Save** ([Export a report][export-steps], Release 2026, published
   June 10, 2026).
3. Choose **.csv**. The types offered are .csv, .htm, .pdf, .xls and .txt
   ([export formats][export-types], Release 2026, published June 10, 2026). The Excel choice is the
   old .xls format, which DotAmi refuses ("That's an older Excel file (.xls) or one locked with a
   password. Open it in Excel, save a copy as .xlsx without a password, and drop that copy."), so a
   .csv is the one step route. An .xls opened in Excel and saved as .xlsx also works.
4. Drop the .csv on "Add from a file", check the date and amount columns DotAmi picks, and check
   the monthly totals before agreeing to them.

Things to check, from the same pages:

- **Revenue includes what the report was set to include.** Freight and "other amounts" are options;
  whichever was ticked is in the Revenue column.
- **Dates follow the company's date setting.** Short dates look like 12-03-05 in Sage's own example
  and the order of month, day and year can be changed ([dates, 2016 help][dates-2016]); the setting is
  used on screen and in reports ([date format][date-format], Release 2024). DotAmi reads a four-digit
  year; **a two-digit year is not read today** (a known gap, pinned by a test). Whether the setting
  offers a four-digit year is not said on the pages read.
- **French.** Sage 50 switches between English and French ([switch language][language], 2023); what
  the report's column titles become in French is not documented. **A French export with several
  comma-decimal columns ("1 000,00") is not read today** (a known gap, pinned by a test: the commas
  win over the semicolons when DotAmi works out how the file is split). The English practice file
  reads.

## What DotAmi keeps

The same as for every file: the file is read in the app's window and never sent or kept; only the
monthly totals the person agrees to are saved, with the row count and the file's name
([figures privacy review](../architecture/figures-privacy-review.md)).

## How it was tested

[`tests/fixtures/packages/sage-50-canadian.ts`](../../tests/fixtures/packages/sage-50-canadian.ts):
three invented Customer Sales Detail files (English with 07-14-2026 dates, the same with 07-14-26,
and a French one in windows-1252 with semicolons), run through the screen's own steps by
[`tests/figures-file-packages.spec.ts`](../../tests/figures-file-packages.spec.ts), which also checks
that an old .xls is refused with the sentence above. Every column title is assumed: the help pages
list what the report shows, not its titles. See [practice-files.md](practice-files.md).

[sales-report]: https://help-sage50.na.sage.com/en-ca/core/2024/Content/Reports_Forms/SalesCustomers/CustomerSalesReport.htm
[sales-options]: https://help-sage50.na.sage.com/en-ca/core/2024/Content/Reports_Forms/SalesCustomers/ModifyCustomerSalesReport.htm
[export-steps]: https://help-sage50.na.sage.com/en-ca/core/2026/Content/Reports_Forms/ExportReport.htm
[export-types]: https://help-sage50.na.sage.com/en-ca/core/2026/Content/Reports_Forms/ExportingReports.htm
[dates-2016]: https://help-sage50.na.sage.com/en-ca/2016/core/Content/System_Settings-ss/ss-co-xx-Dates.htm
[date-format]: https://help-sage50.na.sage.com/en-ca/core/2024/Content/System_Settings/General/ChangeDateFormatLongShort.htm
[language]: https://help-sage50.na.sage.com/en-ca/core/2023/Content/CommonTasks/SwitchLanguage.htm
