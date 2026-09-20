# CI and Snyk Code

GitHub Actions workflow: [.github/workflows/ci.yml](../../.github/workflows/ci.yml).

## Jobs

| Job | Purpose |
| --- | --- |
| **quality** | `npm ci` → `prisma generate` → `typecheck` → `lint` → `test` → `build` (dummy `DATABASE_URL` for Prisma during `next build`; no Postgres service required). |
| **snyk-code** | `snyk code test` on the repository checkout. |

Triggers: `push` and `pull_request` targeting **`main`** or **`master`**.

## Repository secret: `SNYK_TOKEN`

1. In [Snyk](https://app.snyk.io/), open **Account settings** → **Auth token** (or run `snyk config get api` after `snyk auth` locally).
2. In GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: **`SNYK_TOKEN`**, value: your Snyk API token.
4. Re-run failed workflow runs on **Actions** after saving.

Until `SNYK_TOKEN` is set, the **snyk-code** job fails authentication (not the same as “issues found”).

## Fork pull requests

GitHub does **not** expose repository secrets to workflows triggered from forks. Contributors opening PRs from forks will see the **snyk-code** job fail unless you adopt a different pattern (e.g. org-level triage, `pull_request_target` with extreme care, or Snyk’s own GitHub integration). The **quality** job still runs without secrets.

## Local parity with the quality job

With a valid `DATABASE_URL` in `.env` (see [.env.example](../../.env.example)) so `next build` can load Prisma:

```bash
npm ci
npm run ci:quality
```

This mirrors the **quality** job (generate, typecheck, lint, test, build). The same script is the expected pre-push sanity check before promotion. It does **not** run Snyk; for that:

```bash
snyk auth   # once per machine
snyk code test
```

See [CLAUDE.md](../../CLAUDE.md) § Verification Baseline for the full promotion checklist.
