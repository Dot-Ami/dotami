# Security policy

DotAmi is self-hosted, single-user software that runs on your own machine against a database
you own. It has no accounts, no hosted instance and no telemetry. Even so, it reads files
from disk (an optional statute store), talks to a database, and renders content from
community-contributed catalogs — so bugs with a security edge are possible.

## Reporting a vulnerability

Please **do not open a public issue** for anything that could put a user's machine or data at
risk. Use GitHub's private reporting instead:

**Security → Report a vulnerability** on the repository page
(`github.com/Dot-Ami/dotami/security/advisories/new`).

Include what you found, how to reproduce it, and what you think the impact is. You will get
an acknowledgement within a week. Once a fix is released, you will be credited in the
advisory unless you ask not to be.

## In scope

- Anything that lets a catalog entry, a citation URL, a statute-store response or a saved
  venture execute code, read files it should not, or reach the network.
- Injection through `DATABASE_URL`, `LAW_STORE_PATH` or the intake's free text.
- Dependency vulnerabilities with a reachable path in this app.

## Out of scope

- The correctness of a tax or legal statement. That is a **Wrong citation** issue, not a
  vulnerability — and it is very welcome as one.
- Running a multi-user hosted instance. DotAmi has no authentication or tenant isolation and
  says so; exposing it to other people is not a supported configuration.
