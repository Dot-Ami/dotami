# Glossary: short forms and terms you meet in DotAmi

Last updated: 2026-10-27 (twelve of its pages are among those the maintainer read in full on 2026-10-25;
*How each source was checked* says where that read is recorded); 2026-10-12.

DotAmi's cards, roads and settings use the words the government pages use: GST/HST, T2125, CCPC,
journeyperson and so on. This page says what each one means in a sentence or two, in plain words,
and links the official page the meaning comes from. It doesn't cover every short form yet: the ones
on screen it doesn't explain are listed under [Not explained here yet](#not-explained-here-yet). It
explains words; it doesn't say what anyone should do. For that, the cards show what each option
costs and unlocks, and an accountant or a lawyer can say what fits a person's own situation.

**How each source was checked.** Every link below was *checked by a tool on 2026-10-12*:
[`scripts/check-quotes.mjs`](../scripts/check-quotes.mjs) fetched the live page and found the quoted
words on it, word for word ([docs/engines/citations.md](engines/citations.md) explains the tool and
the maintainer's decision of 2026-10-11 behind it). The quotes are listed under each entry so anyone
can see what was checked. No person is recorded as having read these pages for this glossary; twelve
of them are pages the maintainer read in full on 2026-10-25 for the cards that cite them, a read
recorded on those cards' sources, not here ([docs/engines/citations.md](engines/citations.md), § The
maintainer's reads of 2026-10-25). A tool
check only shows the words are on the page; it doesn't read them for meaning. If a page has changed,
running the same command again shows it.

**Adding a term.** One or two plain sentences, no advice, a link to the official page the meaning
comes from, and a short phrase from that page that supports it. Run
`node scripts/check-quotes.mjs --url "<page>" --quote "<exact words>"`, and record the date it prints.
A term whose page the script can't check (a PDF, a page built only by JavaScript) is left out until a
person reads it. Terms are grouped by where you meet them, then listed alphabetically inside each group.

- [Tax and sales tax](#tax-and-sales-tax)
- [Ways to run a business, and registering it](#ways-to-run-a-business-and-registering-it)
- [Hiring](#hiring)
- [Funding programs](#funding-programs)
- [Apprenticeship and the trades (Alberta)](#apprenticeship-and-the-trades-alberta)
- [Skills and jobs](#skills-and-jobs)
- [DotAmi's own settings](#dotamis-own-settings)
- [Not explained here yet](#not-explained-here-yet)

## Tax and sales tax

### CCA (capital cost allowance)

Some things a business buys, such as a building, furniture or equipment, wear out over time. Their
cost isn't deducted all at once in the year they're bought; it's deducted a part at a time over
several years, and that yearly deduction is the capital cost allowance.

Source: [Claiming capital cost allowance (CCA)](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance.html)
(CRA). Checked by a tool on 2026-10-12: "you can deduct their cost over a period of several years";
"This yearly deduction is called a capital cost allowance (CCA)."

### CCPC (Canadian-controlled private corporation)

A type of corporation for tax purposes: a private corporation, resident in Canada, that isn't
controlled by people who live outside Canada or by public corporations. A corporation's type decides
which tax rates and deductions it can use; the small business deduction is one of them.

Source: [Type of corporation](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/type-corporation.html)
(CRA). Checked by a tool on 2026-10-12: "The corporation type determines whether or not the
corporation is entitled to certain rates and deductions."; "it is a private corporation"; "it is a
corporation that was resident in Canada"; "it is not controlled directly or indirectly by one or more
non-resident persons"; "it is not controlled directly or indirectly by one or more public
corporations".

The page lists a few more conditions than these.

### CRA (Canada Revenue Agency)

The federal agency that runs Canada's tax laws, and those of most provinces and territories.

Source: [About the Canada Revenue Agency (CRA)](https://www.canada.ca/en/revenue-agency/corporate/about-canada-revenue-agency-cra.html).
Checked by a tool on 2026-10-12: "The Canada Revenue Agency (CRA) administers tax laws for the
Government of Canada and for most provinces and territories."

### Eligible dividend

A taxable dividend a Canadian corporation pays to a resident of Canada and marks (designates) as an
eligible dividend. How much a corporation can pay as eligible dividends depends mostly on its status;
see [GRIP](#grip-general-rate-income-pool) and [LRIP](#lrip-low-rate-income-pool) below. Designating
too much brings a tax of its own, the Part III.1 tax.

Source: [Eligible dividends](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/eligible-dividends.html)
(CRA). Checked by a tool on 2026-10-12: "An eligible dividend is any taxable dividend paid to a
resident of Canada by a Canadian corporation that is designated by that corporation to be an eligible
dividend."; "A corporation's capacity to pay eligible dividends depends mostly on its status."; "Part
III.1 Tax on Excessive Eligible Dividend Designations".

### GAAR (general anti-avoidance rule)

A section of the federal Income Tax Act (section 245) that can take away a tax benefit. It applies to
an avoidance transaction, one where getting the tax benefit is one of the main purposes, when the
transaction misuses one of the Act's rules or goes against what the rules, taken together, are for. It
doesn't take away the tax benefits Parliament meant people to have. DotAmi's risk reads name it where
it may apply (`lib/engines/risk/v2026/triggers.ts`), and since 2026-10-24 quote four of the section's
phrases below (`lib/engines/risk/v2026/gaar-official-words.ts`; change one there and here together).

Source: [Income Tax Act, section 245](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html)
(Justice Laws). Checked by a tool on 2026-10-12: "This section of the Act contains the general
anti-avoidance rule"; "applies to deny the tax benefit of avoidance transactions that result directly
or indirectly either in a misuse of provisions of the Act"; "an abuse having regard to those
provisions read as a whole"; "obtaining the tax benefit is not one of the main purposes for
undertaking or arranging a transaction"; "while not preventing taxpayers from obtaining tax benefits
contemplated by Parliament".

### GRIP (general rate income pool)

A balance a Canadian-controlled private corporation (or a deposit insurance corporation) works out at
the end of its tax year. It generally reflects taxable income that didn't get the small business
deduction or another special tax rate, and the corporation can pay eligible dividends up to it without
paying Part III.1 tax. It's worked out on Schedule 53, filed with the T2 return.

Source: [General rate income pool (GRIP)](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/eligible-dividends/general-rate-income-pool-grip.html)
(CRA). Checked by a tool on 2026-10-12: "may pay eligible dividends to the extent of its general rate
income pool (GRIP) without incurring Part III.1 tax"; "The GRIP is a balance that generally reflects
taxable income that has not benefited from the small business deduction or any other special tax
rate."; "Use Schedule 53, General Rate Income Pool (GRIP) Calculation, to determine the GRIP and file
it with your T2 return."; "The GRIP is calculated at the end of the tax year."

### GST/HST (goods and services tax / harmonized sales tax)

The sales tax a registered business charges on what it sells and sends to the CRA. The GST is the
federal tax; the HST is the one charged in some provinces instead, and part of it is a provincial
portion. Which rate applies depends on the province or territory where the sale is made (the "place
of supply").

Sources: [GST/HST for businesses](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html)
(CRA). Checked by a tool on 2026-10-12: "the Goods and Services Tax (GST) and the Harmonized Sales Tax
(HST)". · [Charge and collect the GST/HST](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html)
(CRA). Checked by a tool on 2026-10-12: "The rate of tax to charge depends on the place of supply.";
"The rate for other taxable supplies depends on the province or territory."; "decreased the provincial
portion of the HST".

### ITC: two different credits with the same short form

- **Input tax credit (ITC)**: a business registered for the GST/HST gets back the GST/HST it paid on
  purchases and expenses for its business by claiming input tax credits.
- **Investment tax credit (ITC)**: one of the two SR&ED tax incentives (see SR&ED below).

Sources: [Input tax credits](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html)
(CRA). Checked by a tool on 2026-10-12: "As a GST/HST registrant, you recover the GST/HST paid or
payable on your purchases and expenses related to your commercial activities by claiming input tax
credits (ITCs)". · The SR&ED page under [SR&ED](#sred-scientific-research-and-experimental-development)
below: "Earn an investment tax credit (ITC)".

### LRIP (low rate income pool)

A balance that matters to a corporation resident in Canada that is neither a Canadian-controlled
private corporation nor a deposit insurance corporation. It is generally taxable income that got
certain lower (preferential) tax rates. While a corporation has an LRIP, it has to bring it down to
zero by paying ordinary dividends before it can pay an eligible dividend, or Part III.1 tax applies.
It's worked out on Schedule 54, filed with the T2 return.

Source: [Low rate income pool (LRIP)](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/eligible-dividends/low-rate-income-pool-lrip.html)
(CRA). Checked by a tool on 2026-10-12: "A corporation resident in Canada that is neither a
Canadian-controlled private corporation (CCPC) nor a deposit insurance corporation can pay eligible
dividends in any amount unless it has a low rate income pool (LRIP)."; "The corporation has to reduce
its LRIP to zero by paying out ordinary dividends before it can pay an eligible dividend, or it will
be subject to Part III.1 tax."; "The LRIP is generally made up of taxable income that has benefited
from certain preferential tax rates."; "Use Schedule 54, Low Rate Income Pool (LRIP) Calculation, to
determine the LRIP, throughout the year."; "File the completed schedule with your T2 return."

### PST (provincial sales tax, British Columbia)

A retail sales tax British Columbia charges when taxable goods, software or services are bought in
B.C. or brought into B.C. to use there, unless an exemption applies. (On Alberta, see Alberta's own page, below.)

Source: [B.C. provincial sales tax (PST)](https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst)
(Government of British Columbia). Checked by a tool on 2026-10-12: "Provincial sales tax (PST) is a
retail sales tax that applies when taxable goods, software or services are acquired in B.C. or
brought into B.C. for use in B.C., unless a specific exemption applies."

On Alberta: [About Tax and Revenue Administration](https://www.alberta.ca/about-tra) (Government of
Alberta). Checked by a tool on 2026-10-29: "Alberta has no sales tax." (the tool check is recorded on the
Alberta sales-tax card's source, `lib/engines/compliance/v2026/rules.ts`). Until 2026-10-29 this entry said
"Alberta has no PST" in DotAmi's own words, from that card, which no longer says it.

### RDTOH (refundable dividend tax on hand)

Two accounts a private corporation keeps: the eligible one (ERDTOH) and the non-eligible one
(NERDTOH). A Canadian-controlled private corporation adds to them part of the tax it pays on
investment income, and the tax it pays on dividends it receives. When the corporation pays taxable
dividends to its shareholders, all or part of the accounts may come back to it as a dividend refund.

Source: [T2 Corporation Income Tax Guide, chapter 6](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-6-pages-6-7-t2-return.html)
(CRA). Checked by a tool on 2026-10-12: "The calculation of a private corporation's dividend refund is
based on two accounts, the eligible refundable dividend tax on hand (ERDTOH) and the non-eligible
refundable dividend tax on hand (NERDTOH)."; "The ERDTOH and NERDTOH accounts only apply to
corporations that were private or subject corporations."; "CCPCs and substantive CCPCs generate NERDTOH
on the refundable portion of Part I tax they pay on investment income."; "They also generate both
ERDTOH and NERDTOH on the Part IV tax they pay on dividends they receive."; "All or part of the ERDTOH
and NERDTOH at the end of the tax year may be available as a refund if the corporation pays taxable
dividends to the shareholders during the tax year."

### SBD (small business deduction)

A deduction that lowers the federal income tax a corporation pays. Only a corporation that was a
CCPC for the whole tax year may be able to claim it.

Source: [T2 Corporation Income Tax Guide, chapter 4](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html)
(CRA). Checked by a tool on 2026-10-12: "Corporations that were Canadian-controlled private
corporations (CCPCs) throughout the tax year may be able to claim the small business deduction
(SBD)."; "The SBD reduces Part I tax that the corporation would otherwise have to pay."

### Small supplier (GST/HST)

For most businesses, a small supplier is one whose worldwide taxable sales (from all its businesses,
together with those of its associates) stay at $30,000 or less both in a single calendar quarter and
over four calendar quarters in a row. Charities and public institutions have tests of their own, on
the same page. A small supplier doesn't have to
register for the GST/HST but may choose to. Some businesses, such as taxi and ride-share drivers,
must register even as small suppliers; DotAmi's ride-share card cites that rule
(`lib/engines/compliance/v2026/ride-share-official-words.ts`).

Source: [When to register for and start charging the GST/HST](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html)
(CRA). Checked by a tool on 2026-10-12: "You have to register for a GST/HST account if both situations
apply:"; "Small supplier limit calculation for most businesses"; "Charities and public institutions";
"You do not exceed the $30,000"; "over four consecutive calendar quarters."; "in a single
calendar quarter."; "from your worldwide taxable supplies from all your businesses and those of your
associates"; "You may choose to register voluntarily if you make taxable sales, leases, or other
supplies in Canada."

The page puts a footnote number straight after "threshold" in its tests, so the tool checks the words
on each side of it, as DotAmi's catalogs do ([citations.md](engines/citations.md) § Tool checks in the
catalogs).

### SR&ED (scientific research and experimental development)

The federal tax incentives for businesses that do research and development in Canada. They come in
two forms: a deduction from income, and an investment tax credit. Corporations, individuals, trusts
and partnerships doing eligible work may be able to claim them.

Source: [Scientific Research and Experimental Development (SR&ED) tax incentives](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html)
(CRA). Checked by a tool on 2026-10-12: "The Scientific Research and Experimental Development (SR&ED)
tax incentives are intended to encourage businesses to conduct research and development in Canada.";
"Corporations, individuals, trusts, and partnerships that conduct eligible work may be able to claim
SR&ED tax incentives for the year."; "Claim a deduction against income"; "Earn an investment tax credit
(ITC)".

### T1 (the personal income tax and benefit return)

The yearly tax return a person files. A sole proprietor reports the business's income or loss on it.

Source: the CRA's [Sole proprietorship](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html)
page. Checked by a tool on 2026-10-12: "A sole proprietor pays taxes by reporting income (or loss) on a
T1 income tax and benefit return."

### T2 (the corporation income tax return)

The yearly tax return a corporation files, due no later than six months after the end of its tax
year, even when it owes no tax.

Source: the CRA's [Corporation](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html)
page. Checked by a tool on 2026-10-12: "A corporation has to file a T2 Corporation Income Tax Return no
later than six months after the end of every tax year, even if it does not owe taxes."

### T2125 (Statement of Business or Professional Activities)

The CRA form that reports a business's or a profession's income and expenses on a person's own tax
return. DotAmi's tax lines name its line numbers.

Source: [T2125 Statement of Business or Professional Activities](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2125.html)
(CRA). Checked by a tool on 2026-10-12: "Use the T2125 form to report either business or professional
income and expenses."

### T5 (the slip for investment income)

The slip that reports certain kinds of investment income paid to a resident of Canada, dividends
among them (both eligible dividends and the others). The one who pays files a T5 information return,
and gives each recipient a copy of their slip, by the last day of February after the calendar year;
the guide lists the payments that need no slip. DotAmi's road names it on its retained earnings step
(`lib/engines/roads/v2026/starting-any-business-ab.ts`).

Source: [T5 Guide: Return of Investment Income](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4015/t5-guide-return-investment-income.html)
(CRA). Checked by a tool on 2026-10-12: "If you make certain types of payments to a resident of
Canada, or if you receive certain types of payments as a nominee or agent for a person resident in
Canada, you have to prepare a T5 slip."; "eligible dividends and dividends other than eligible
dividends (including most deemed dividends)"; "You have to file a T5 information return by the last
day of February following the calendar year to which the information return applies."; "You must give
recipients a copy of their T5 slips, by the last day of February following the calendar year to which
the information return applies."; "Use this slip to report the various types of investment income that
residents of Canada have to report on their income tax and benefit return."; "You do not have to
prepare a T5 slip to report:"

### T661 (the SR&ED expenditures claim)

The CRA form used to claim SR&ED.

Source: [T661 Scientific Research and Experimental Development (SR&ED) Expenditures Claim](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t661.html)
(CRA). Checked by a tool on 2026-10-12: "Form to claim for Scientific Research and Experimental
Development (SR&ED) in Canada".

### TOSI (tax on split income)

A special tax on certain income a person receives from a related business. Split income includes,
for example, taxable dividends on shares of a corporation, other than shares listed on a stock
exchange; the page lists the other kinds, and the amounts that are excluded.

Source: [Line 40424 – Tax on split income](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40424-federal-tax-on-split-income.html)
(CRA). Checked by a tool on 2026-10-12: "Tax on split income (TOSI) is a special tax that applies to
certain income received from a related business."; "Split income includes taxable dividends on shares
of a corporation"; "other than shares of a class listed on a designated stock exchange"; "Excluded
amount from split income".

## Ways to run a business, and registering it

### BizPaL

A free government service that lists the permits and licences a business needs, from every level of
government, and how to get them. It says its own list isn't complete.

Source: [BizPaL frequently asked questions](https://bizpal.ca/en/faq/). Checked by a tool on
2026-10-12: "BizPaL is an online service that benefits Canadian businesses by helping them identify
which permits and licences they require and how to obtain them."; "generates a list of all required
permits and licences from all levels of government"; "BizPaL is a free service offered by the
government".

"Isn't complete" is BizPaL's own line, cited on DotAmi's BizPaL step
(`lib/engines/roads/v2026/starting-any-business-ab.ts`).

### BN (business number)

A number that identifies a business with the CRA and other governments. An unincorporated business
needs one only when it registers for a CRA program account (GST/HST or payroll, for example); in
Alberta, forming a corporation or registering a business name brings one, at no cost.

Sources: [When you need a BN](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/business-number-program-account/need-bn.html)
(CRA). Checked by a tool on 2026-10-12: "A business number (BN) is used as a standard identifier for
your business or legal entity."; "If your business is unincorporated, you only need a BN when you
register for program accounts with the Canada Revenue Agency (CRA)."; "You need a GST/HST, payroll or
another CRA program account". ·
[Common Business Number program in Alberta](https://www.alberta.ca/common-business-number-program-in-alberta)
(alberta.ca). Checked by a tool on 2026-10-12: "A federal, 9-digit business number is assigned after
forming a corporation or non-profit organization, or registering a business name."; "There is no cost
to obtain a business number."

### Corporation

A business that is a legal entity of its own, separate from its owners (its shareholders): it can
make contracts and own property in its own name. It files its own tax return, the T2.

Source: the CRA's [Corporation](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html)
page. Checked by a tool on 2026-10-12: "It can enter into contracts and own property in its own name,
separately and distinctly from its owners."; "The owners of these shares are shareholders."; and the
T2 sentence under [T2](#t2-the-corporation-income-tax-return) above.

### Incorporating (federally or in a province)

Creating a corporation. In Canada it can be done federally, through Corporations Canada, or in a
province, such as Alberta (Alberta's page is under [NUANS report](#nuans-report-alberta) below). DotAmi's
catalog lists both ways (`lib/engines/cfe/v2026/incorporation-routes.ts`).

Source: [Federal incorporation](https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation)
(Corporations Canada). Checked by a tool on 2026-10-12: "When incorporating, you create a new legal
entity called a corporation."; "Any business and not-for-profit operating in Canada can incorporate
federally."

### NUANS report (Alberta)

A name-search report. To incorporate in Alberta under a chosen name, the report is checked to make
sure no other corporation has the same or a too-similar name, and it holds the name for 90 days. A
"number name" (such as 9999999 Alberta Ltd.) needs no NUANS report.

Source: [Incorporate an Alberta corporation](https://www.alberta.ca/incorporate-alberta-corporation)
(alberta.ca). Checked by a tool on 2026-10-12: "You need to get an Alberta NUANS report and review it
to make sure there is no other corporation with an identical name or a name that is too similar to
your proposed corporation name."; "The NUANS report reserves the proposed name for 90 days."; "You do
not need a NUANS report when the proposed name will be a 'number name' assigned by Corporate Registry".

### Partnership

Two or more people (or corporations, trusts or partnerships) carrying on a business together. The
partnership itself pays no income tax: each partner reports their share of its income or loss on
their own return.

Source: the CRA's [Partnership](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/partnership.html)
page. Checked by a tool on 2026-10-12: "A partnership is an association or relationship between two or
more individuals, corporations, trusts, or partnerships that join together to carry on a trade or
business."; "each partner includes a share of the partnership income or loss on a personal, corporate,
or trust income tax return."

### Registry agent (Alberta)

An office Alberta authorizes to do most business registrations: a corporation, a trade name or a
partnership. Its service fees aren't regulated and may vary from one agent to another; some
registrations also have a government fee.

Source: [Find a business registry](https://www.alberta.ca/find-business-registry) (alberta.ca).
Checked by a tool on 2026-10-12: "Authorized registry agents can provide most registration services
for your corporation, trade name or partnership."; "Service fees are not regulated and may vary from
one agent to another."; "There is also a government fee for certain registrations."

### Sole proprietorship (sole proprietor)

A business owned by one person that isn't incorporated: the owner has no legal status separate from
the business. The owner receives all the profits, claims all the losses and carries the risks, which
reach their personal property and assets, and reports the business's income on their own T1 return.

Source: the CRA's [Sole proprietorship](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html)
page. Checked by a tool on 2026-10-12: "A sole proprietorship is an unincorporated business that is
owned by one individual."; "receives all the profits, claims all losses"; "does not have separate legal
status from the business"; "The risks extend even to your personal property and assets."; and the T1
sentence under [T1](#t1-the-personal-income-tax-and-benefit-return) above.

### Trade name (Alberta)

A name a person (or a corporation) does business under that isn't their own name. In Alberta,
registering one is how a sole proprietor's business name is registered.

Source: [Register a business name](https://www.alberta.ca/register-business-name) (alberta.ca).
Checked by a tool on 2026-10-12: "an individual does business under a name other than their own
personal name"; "a corporation does business under a name other than its legal name"; "A trade name is
also known as a sole proprietorship."

## Hiring

### CPP/EI (Canada Pension Plan / Employment Insurance)

Two federal programs an employer deducts from an employee's pay, along with income tax: CPP
contributions and EI premiums. The CRA can also give a CPP/EI ruling on whether a worker is an
employee or self-employed.

Sources: [Calculate payroll deductions and contributions](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions.html)
(CRA). Checked by a tool on 2026-10-12: "Learn about CPP contributions, EI premiums and income tax
deductions". · [CPP and EI rulings](https://www.canada.ca/en/revenue-agency/services/tax/canada-pension-plan-cpp-employment-insurance-ei-rulings.html)
(CRA). Checked by a tool on 2026-10-12: "How to get a Canada Pension Plan (CPP) and employment
insurance (EI) ruling to determine if a worker is an employee or self-employed".

### Payroll account

The CRA account an employer uses for the deductions it takes from employees' pay and sends to the CRA
(remits). It has to be opened before the first remittance is due: the 15th of the month after the
month the first deductions were taken, unless the CRA tells the employer to remit on a different
schedule.

Sources: [Determine if you need to register for a payroll account](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html)
(CRA). Checked by a tool on 2026-10-12: "You may need to register for a payroll account if you are:";
"The Canada Revenue Agency (CRA) generally considers you to be an employer if you:"; "Your first
remittance due date is the 15th day of the month following the month in which you began withholding
deductions from your employee's pay, unless the CRA tells you to remit using a different frequency.";
"If you did not open an account before hiring employees, you
still need to calculate deductions and remit them by the due date." ·
[Set up and manage employee payroll information](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee.html)
(CRA). Checked by a tool on 2026-10-12: "You have to register for a payroll account before the first
remittance due date."

### T4 (the employee's slip)

The slip an employer issues to an employee that shows all the remuneration (pay and other amounts)
it paid them in a calendar year. The page says when an employer has to issue one. DotAmi's map uses it in the words "T4 employment income"
(`lib/engines/cfe/v2026/nodes.ts`).

Source: [T4 slip – Information for employers](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/completing-filing-information-returns/t4-information-employers/t4-slip.html)
(CRA). Checked by a tool on 2026-10-12: "A T4 slip identifies all of the remuneration paid by an
employer to an employee during a calendar year."; "you must issue a T4 slip if any of the following
apply".

### TD1 (Personal Tax Credits Return)

The form a person fills out for their employer when they start a new job, or when they want more
income tax taken off their pay. The employer uses it to work out how much to take off (withhold). If
the person claims more than the basic personal amount, they fill out a provincial or territorial TD1
too. DotAmi's hiring step asks for the completed TD1 forms before the first pay
(`lib/engines/roads/v2026/starting-any-business-ab.ts`).

Source: [Get the completed TD1 forms from the individual](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee/filing-form-td1.html)
(CRA). Checked by a tool on 2026-10-12: "Employers and payers must get Form TD1, Personal Tax Credits
Return, when individuals start a new job or they want to increase income tax deductions."; "This is
used to calculate the amounts to withhold from their employment income or other income, such as
pension income."; "If more than the basic personal amount is claimed, the individual must also fill
out a provincial or territorial TD1 form."

### WCB-Alberta (the Workers' Compensation Board – Alberta)

Alberta's workers' compensation board. Its coverage protects workers and employers from the impacts
of injuries and illnesses at work. A business owner isn't covered automatically, only their workers;
personal coverage for the owner is optional.

Sources: [Worker coverage](https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/worker-coverage.html)
(WCB-Alberta). Checked by a tool on 2026-10-12: "Workers' compensation coverage protects workers and
employers from the impacts of workplace injuries and illnesses."; "The Workers' Compensation Board -
Alberta". · [Personal coverage](https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/personal-coverage.html)
(WCB-Alberta). Checked by a tool on 2026-10-12: "you're not automatically covered by workers'
compensation benefits"; "Personal coverage is optional coverage for people not automatically covered
through the workers' compensation system."

## Funding programs

### CSBFP (Canada Small Business Financing Program)

A federal program that makes it easier for small businesses to get loans from financial institutions,
by sharing the risk with the lender.

Source: [Canada Small Business Financing Program](https://ised-isde.canada.ca/site/canada-small-business-financing-program/en)
(Innovation, Science and Economic Development Canada). Checked by a tool on 2026-10-12: "The Canada
Small Business Financing Program makes it easier for small businesses to get loans from financial
institutions by sharing the risk with lenders."

### IRAP (NRC Industrial Research Assistance Program)

The National Research Council's program that helps small and medium-sized businesses innovate.

Source: [About the NRC Industrial Research Assistance Program](https://nrc.canada.ca/en/support-technology-innovation/about-nrc-industrial-research-assistance-program)
(National Research Council Canada). Checked by a tool on 2026-10-12: "The National Research Council
of Canada Industrial Research Assistance Program (NRC IRAP) is Canada's leading innovation assistance
program for small and medium-sized businesses."

## Apprenticeship and the trades (Alberta)

These are the words of the road *From apprentice to your own shop (Alberta)*, the first written
future in DotAmi's catalog (`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`; no screen shows it
yet).

### AIT (Apprenticeship and Industry Training) and Tradesecrets

AIT is short for Apprenticeship and Industry Training, the Alberta body a person applies to for an
apprenticeship or a Trades Qualifier program, and which schedules their exams. Tradesecrets
(tradesecrets.alberta.ca) is the Alberta website that explains its programs; the road's sources for
its apprenticeship and certification steps are its pages.

Sources: [Registered Apprenticeship Program](https://tradesecrets.alberta.ca/get-started/start-in-high-school/registered-apprenticeship-program/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Complete the free online RAP application with
Apprenticeship and Industry Training (AIT)". · [Trades Qualifier Exams](https://tradesecrets.alberta.ca/become-certified/trades-qualifier-programs/trades-qualifier-exams/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Once your application is approved, AIT will request
and schedule your theory exam." ·
[Certification through Apprenticeship Education](https://tradesecrets.alberta.ca/become-certified/certification-through-apprenticeship/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Learn all about apprenticeship education in the Get
Started section of Tradesecrets."

### Alberta Student Number (ASN)

A number AIT asks for the first time a person applies for one of its programs or services, such as an
apprenticeship or the Blue Seal.

Sources: [Apply for an Apprenticeship Education Program](https://tradesecrets.alberta.ca/get-started/become-an-apprentice/apply-for-apprenticeship/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Alberta Student Number: Required if this is your
first time applying for an AIT program or service." · [Blue Seal Program](https://tradesecrets.alberta.ca/become-certified/business-competencies-blue-seal/)
(Tradesecrets). Checked by a tool on 2026-10-12: "and have, or have applied for, an Alberta Student
Number (ASN)."

### Apprenticeship (Apprenticeship Education Program)

Learning a trade by working in it and going to school: hands-on work with a sponsor plus classroom
instruction, in periods.

Source: [Cabinetmaker trade profile](https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Apprenticeship blends hands-on work experience with
classroom learning, so you can build skills, knowledge, and a career all at once."

### Blue Seal (Achievement in Business Competencies)

An Alberta certificate showing that a certified tradesperson has also gone on to business education.

Source: [Blue Seal Program](https://tradesecrets.alberta.ca/become-certified/business-competencies-blue-seal/)
(Tradesecrets). Checked by a tool on 2026-10-12: "An Achievement in Business Competencies (Blue Seal)
Certificate is evidence that a certified tradesperson:"; "has continued a path towards business
education".

### Classroom instruction ("technical training")

The part of an apprenticeship spent in school. An apprentice attends a period of it each year.

Source: [About Classroom Instruction](https://tradesecrets.alberta.ca/apprentice-services/classroom-instruction/about-classroom-instruction/)
(Tradesecrets). Checked by a tool on 2026-10-12: 'is often referred to as "Technical Training"';
"It's the part of your apprenticeship spent in school."; "As an apprentice, you're required to attend a
period of classroom instruction annually."

### CTS (Career and Technology Studies)

High school courses that can count toward an apprenticeship: a student earns high school credit and a
head start toward journeyperson certification.

Source: [Career and Technology Studies](https://tradesecrets.alberta.ca/get-started/start-in-high-school/career-and-technology-studies/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Complete a Career and Technology Studies (CTS)
Apprenticeship Pathway."; "Earn high school credit while you get a head start toward your journeyperson
certification."

### Journeyperson (Journeyperson Certificate)

The certification a person earns by finishing an apprenticeship in Alberta; the Trades Qualifier
programs are another way to it.

Source: [Certification through Apprenticeship Education](https://tradesecrets.alberta.ca/become-certified/certification-through-apprenticeship/)
(Tradesecrets). Checked by a tool on 2026-10-12: "When you graduate from your apprenticeship, you'll
earn your journeyperson certification."

### Period

One level of an apprenticeship: on-the-job hours plus a stretch of classroom instruction, ending with a
theory exam. In the cabinetmaker trade a period is 1360 hours of work experience and 8 weeks in class,
and is meant to take about a year.

Source: [Cabinetmaker trade profile](https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361/)
(Tradesecrets). Checked by a tool on 2026-10-12: "1360 hours work experience per period"; "8 weeks
classroom instruction per period"; "Each period designed to take ~1 year"; "Theory exam required to
complete each period".

### RAP (Registered Apprenticeship Program)

A way to start an apprenticeship in high school: RAP students are full-time high school students and
registered apprentices at the same time.

Source: [Registered Apprenticeship Program](https://tradesecrets.alberta.ca/get-started/start-in-high-school/registered-apprenticeship-program/)
(Tradesecrets). Checked by a tool on 2026-10-12: "RAP students are both full-time high school
students and registered apprentices."

### Red Seal (Interprovincial Red Seal)

A national standard for a trade. A tradesperson whose certificate carries a Red Seal has met that
standard; in Alberta, apprentices in Red Seal trades can write the Red Seal exam once they've met
everything for journeyperson certification.

Source: [Red Seal Endorsement](https://tradesecrets.alberta.ca/become-certified/interprovincial-red-seal/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Tradespeople who hold a trade certificate with a Red
Seal have demonstrated that they have met the national standard in that trade."; "Alberta Apprentices
in Red Seal trades have the opportunity to write the Red Seal exam after they complete all requirements
for Alberta journeyperson certification."

### Sponsor (Apprenticeship Education Agreement)

The business or organization that gives an apprentice paid on-the-job training in the trade. Earning
on-the-job hours needs an Apprenticeship Education Agreement with a sponsor; an apprentice can change
sponsors and stay registered.

Sources: [Eligibility and Entrance Requirements](https://tradesecrets.alberta.ca/get-started/become-an-apprentice/eligibility-and-entrance-requirements/)
(Tradesecrets). Checked by a tool on 2026-10-12: "Find a business or organization willing to provide
you with paid-on-the-job mentorship in your trade, and ask them to become your sponsor." ·
[Sponsorship Agreements](https://tradesecrets.alberta.ca/apprentice-services/sponsorship-agreeements/)
(Tradesecrets). Checked by a tool on 2026-10-12: "To earn on-the-job hours, you need an Apprenticeship
Education Agreement with a sponsor."; "You can leave a sponsor partway through your apprenticeship and
remain a registered apprentice."

### Trades Qualifier

A way to journeyperson certification for someone who already has experience in the trade but no
Alberta Journeyperson Certificate. It ends in an exam.

Sources: [Cabinetmaker trade profile](https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361/)
(Tradesecrets). Checked by a tool on 2026-10-12: "If you have experience in the trade but do not hold
an Alberta Journeyperson Certificate, you may be eligible for the Trades Qualifier Program." ·
[Trades Qualifier Exams](https://tradesecrets.alberta.ca/become-certified/trades-qualifier-programs/trades-qualifier-exams/)
(Tradesecrets). Checked by a tool on 2026-10-12: "To earn certification through any of the Trades
Qualifier Programs, you'll need to pass an exam."

## Skills and jobs

### NOC (National Occupational Classification)

Canada's national system for describing jobs (occupations). OaSIS is built on it.

Source: [National Occupational Classification](https://noc.esdc.gc.ca/) (Employment and Social
Development Canada). Checked by a tool on 2026-10-12: "The National Occupational Classification (NOC)
is Canada's national system for describing occupations."

That OaSIS is built on the NOC is in the OaSIS dataset's record, cited in
[future-cockpit.md](architecture/future-cockpit.md), not on this page.

### OaSIS (Occupational and Skills Information System)

The government's list of the skills, abilities, knowledge and interests typically needed for 900
Canadian jobs. In DotAmi's design it shows only for the job the person picks, tagged *your pick of
job*; bringing the list into DotAmi isn't built yet.

Source: [Occupational and Skills Information System](https://noc.esdc.gc.ca/Oasis/OasisWelcome)
(Employment and Social Development Canada). Checked by a tool on 2026-10-12: "The Occupational and
Skills Information System (OaSIS) provides a comprehensive framework of the skills, abilities, personal
attributes, knowledge, and interests typically required for 900 Canadian occupations."

How DotAmi uses it is the maintainer's decision of 2026-10-11, in
[future-cockpit.md](architecture/future-cockpit.md) (decision 5A).

## DotAmi's own settings

### MCP (Model Context Protocol)

An open standard that lets AI applications connect to outside data and tools. A planned DotAmi setting,
*DotAmi's MCP server (outside agents)*, would use it to let an agent of the person's own read their
map and propose figures; it's off, and not built yet.

Source: [What is the Model Context Protocol (MCP)?](https://modelcontextprotocol.io/docs/getting-started/intro)
(the protocol's own documentation). Checked by a tool on 2026-10-12: "is an open-source standard for
connecting AI applications to external systems."

The setting's words are in DotAmi's settings catalog (`lib/settings/catalog.ts`).

## Not explained here yet

These short forms and terms appear on DotAmi's cards or road steps and have no entry yet. Each needs
an official page a tool or a person can check before it gets one (see *Adding a term* above). This
list is from a scan of the catalogs' words on 2026-10-12, so it may miss some.

- **Holdco and Opco** (a holding company and an operating company), on the structure cards
  (`lib/engines/structure/v2026/ladder.ts`; the Holdco card spells out "Holding company").
- **Dividend** itself, and the **family trust** card (`lib/engines/structure/v2026/ladder.ts`).
- **ITA** and **Reg.**, the short names a card's source links use for the Income Tax Act and its
  Regulations (`components/shared/citation-links.tsx`).
- **T4002**, the CRA guide named in a capital cost allowance source
  (`lib/engines/risk/v2026/triggers.ts`).
- **ISED**, **SME**, **ABTIC** and **CAJG**, on the funding cards (`lib/engines/grants/v2026/programs.ts`;
  ABTIC and CAJG are spelled out in their cards' names).
- **NAIT**, **SAIT**, **GED** and **CAEC**, on the apprenticeship road
  (`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`; NAIT and SAIT are spelled out there).
- **IP**, **R&D**, **B2B**, **AI / ML** and **CAD**, used in passing on cards and road steps.
