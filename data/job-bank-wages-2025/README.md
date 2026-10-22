# Job Bank wages 2025: the file DotAmi imports

One file of the government of Canada's *Wages* dataset (Job Bank's published wages), as downloaded on
2026-10-21 from
[the dataset's page on open.canada.ca](https://open.canada.ca/data/en/dataset/adad580f-76b0-4502-bd05-20c125de9116)
(publisher: Employment and Social Development Canada; date published 2017-09-25; record modified 2025-11-19;
one file per year, 2012 to 2025). Contains information licensed under the
[Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).

| File | Revision date | Size | Rows |
|---|---|---|---|
| `2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv` | 2025-11-19 (every row's `Revision_Date_Date_revision`) | 17,981,889 bytes as downloaded, UTF-8 with a byte-order mark, "\r\n" line endings | 44,376, plus the header |

## What the file says about itself

The dataset's record describes it this way: the wages "are specific to an occupation and provide information
on the earnings of workers at the regional level. Wages for most occupations are also provided at the national
and provincial level." The record publishes no data dictionary; the file's 22 column names, in English and
French, are its own description of its columns:

`NOC_CNP, NOC_Title_eng, NOC_Title_fra, prov, ER_Code_Code_RE, ER_Name, Nom_RE, Low_Wage_Salaire_Minium,
Median_Wage_Salaire_Median, High_Wage_Salaire_Maximal, Average_Wage_Salaire_Moyen,
Quartile1_Wage_Salaire_Quartile1, Quartile3_Wage_Salaire_Quartile3, Source2025_NHQ, Data_Source_E,
Data_Source_F, Reference_Period, Revision_Date_Date_revision, Annual_Wage_Flag_Salaire_annuel, Wage_Comment_E,
Wage_Comment_F, EmployeesWithNonWageBenefit_Pct`

What they hold, counted over the whole file (research 25s, read 2026-10-20; the shapes are checked again by the
importer on every run):

- Every one of the 516 job groups (`NOC_72311`) has one row in each of 86 geographies: Canada (`ER00`), a
  province (`ER48` Alberta) or an economic region (`ER4830` Calgary). Prince Edward Island, Yukon, the
  Northwest Territories and Nunavut have one code each (`ER1110`, `ER6010`, `ER6110`, `ER6210`) and no
  two-digit one. The file spells Yukon `YK`, the Northwest Territories `NWT` and Prince Edward Island `PEI`.
- **The source code (`Source2025_NHQ`) says what a row really is**, whatever geography it sits under: `CAN`
  national, `PR` a province-wide figure, `ER` an economic region's own figure ("LFS 2023-24 PR NOC5" under
  Calgary is an Alberta-wide figure). `N/A` marks a row with no published figures (19,982 rows); most of those
  carry a comment pointing to the provincial or national row.
- `Annual_Wage_Flag_Salaire_annuel` is 1 where the figures are annual, 0 where they are hourly.
  `Reference_Period` differs by row (`2023-2024`, `2024`, `2021`, `NA`).

## What DotAmi keeps, and what it leaves out

`node scripts/import-job-bank-wages.mjs` turns the file into `lib/engines/wages/v2026/data.ts`. For every row
it keeps the job group, the geography code with its province code and English name, the source code word for
word, the method (`Data_Source_E`), whether the figures are hourly or annual, **low, median and high as the
file's own text** (empty stays empty), the reference period, the English comment and the revision date. The
level is read from the source code by `lib/engines/wages/v2026/levels.ts`, never from the region's name.

It leaves out the average and the two quartiles (the panel shows low, median and high), the French columns,
and `EmployeesWithNonWageBenefit_Pct` (its definition isn't cited; research 25s, open question 4). The file has
no outlook columns, and the maintainer's K5 B of 2026-10-16 keeps outlook ratings out of DotAmi anyway.

## How it is kept

The file is committed as downloaded, so the import can be redone and checked offline: git stores it
compressed (about 1 MB; `gzip` makes it 980,128 bytes), and the module made from it is checked against it on
every pull request. It is kept as downloaded, except for line endings: the official file ends its lines with
"\r\n" (the downloaded bytes' SHA-256 is `7bd29fb41b2a84eb61a4dbf49bfb63651a8a694c62ce42ac69cb785679d66328`), git
stores it with "\n" (17,937,512 bytes), and a Windows checkout may write "\r\n" back. The import evens line
endings out and drops the byte-order mark before it hashes or reads, so its pinned SHA-256 is that of the
official file's text either way. `--check` (and `npm run data:check`, in CI inside
`npm run ci:quality`, and `tests/wages-import.spec.ts`) fails if the file isn't the one pinned for it or the
module isn't exactly what it makes. `--download` fetches a fresh copy first and writes it only when its SHA-256
is the one pinned in the script's `WAGE_FILES`, and only when it is UTF-8 with its byte-order mark; anything
else is not written, and the script says what it expected and what it got. Taking a new year's file means
updating that pinned value by hand, on purpose. The dataset's record gives no next-release date; the 2025 file
came on 2025-11-19.

The licence line and the dataset's title come from its card in the source registry
(`lib/engines/research-kit/v2026/registry.ts`, card `job-bank-wages`); the reading, pins and header are the
research kit's import core, `scripts/lib/import-kit.mjs`. Nothing in this folder ships with the app; the module
made from it does, with its licence line, and no screen shows a wage yet. Job Bank's own pages are never
fetched (their terms bar scripts: the registry's `job-bank-pages` card). The government does not endorse
DotAmi or anyone's use of this data.
