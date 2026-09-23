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

## How the repository and the app are protected

- **Pull requests:** every change runs the same gate (`prisma generate → typecheck → lint →
  test → build`) and a DCO sign-off check. While the repository variable `DEPENDENCY_REVIEW`
  is set to `on`, GitHub's dependency review also runs and fails a PR that introduces a
  package with a known high or critical vulnerability, or a licence the project cannot ship;
  when the variable is unset that job does not run. `main` cannot be
  force-pushed or deleted; merges are squash-only. Workflows run with a read-only token, use
  only GitHub-owned or verified actions, pinned to commit hashes.
- **Dependencies:** Dependabot alerts and security-update PRs are on; routine bumps arrive
  weekly as one grouped PR. Secret scanning with push protection is on.
- **The app:** every page carries a per-request **Content-Security-Policy** (`middleware.ts`):
  scripts only from this origin or carrying the request's nonce (`'strict-dynamic'`, no
  `'unsafe-inline'`), connections/images/fonts/frames/forms same-origin, `object-src 'none'`,
  `frame-ancestors 'none'`. Every response also carries `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy` and a restrictive `Permissions-Policy`. Fonts
  are committed to the repo and served from this origin — no page view contacts a third
  party. Write routes accept only same-origin `application/json` bodies, with a byte cap and
  a per-client rate limit (`lib/api/`). Links built from data the app did not write render
  only as absolute `https:` URLs (`lib/http/safe-url.ts`). The statute-store lookup runs as
  a child process with allow-listed arguments and a minimal environment — the database URL
  and any API key never reach it.
- **Your machine:** `npm run dev` binds to `127.0.0.1` only. Pass `-- -H 0.0.0.0` if you
  knowingly want the dev server reachable from your network.

Contract tests for the above: `tests/security-hardening.spec.ts`. Independent scanners run on
2026-09-20/21: gitleaks (history + tree, `.gitleaks.toml`), Snyk Open Source and Snyk Code
(`.snyk`), Anthropic's Claude Code security review; CodeQL runs in CI while the repository is
public (`.github/workflows/codeql.yml`).

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
