# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

Okovision is a tool to monitor Okofen boiler. Monorepo with two independent apps:
- `backend/` — Node.js + Express + TypeScript API, Prisma ORM, PostgreSQL.
- `frontend/` — React + Vite + TypeScript SPA, vanilla CSS (no Tailwind).

Automation is handled by `SchedulerService` (cron-based and DAG dependency-trigger-based), tracked as `SchedulerRun` history.

## Git Workflow (mandatory, non-negotiable)

- Any work on a GitHub issue or issue group — or any new feature — happens on its own isolated branch, never directly on `dev`.
- That branch must be tested before it can be merged.
- Before opening a PR, run the relevant test suite(s) locally (`npm run test:backend` and/or `npm run test:frontend` depending on what changed) — never open a PR without having run them.
- Every PR description must include a short test result summary (e.g. `Backend: 42 passed`, `Frontend: 12 passed`) as justification that the branch was tested. CI (`.github/workflows/test.yml`) re-runs both suites on every PR as a second check.
- Only Xavier can approve/perform the merge into `dev`. No autonomous merging.

## Security Rules (mandatory, non-negotiable)

- **No hardcoded secrets** — env vars only.
- **Auth**: JWT in HttpOnly + Secure + SameSite=Strict cookies. Never store tokens in localStorage.
- **DB access**: Prisma only, never raw/string-concatenated SQL.
- **Input validation**: Zod schemas on every API input.
- Passwords hashed with bcrypt (12 rounds).

## Testing

- Uses **Vitest**. Add tests for logic you touch in the transformation/auth paths when practical.

## Dependency Policy

- **Stable releases only** — never adopt an RC, beta, alpha, canary, or other pre-release package version, even to fix a known issue. Wait for the stable release.

## Language Conventions

- Code (identifiers, comments, JSDoc, log messages) and git commit messages: **English**.
- Documentation (`README.md`, `docs/*.md`): **French and English** — match that when editing existing docs.
- Product UI is bilingual (`frontend/src/locales/en.ts` / `fr.ts`); add new user-facing strings to both locale files, never hardcode UI text.

## Reference Deployment Redeploy (after a fix, for Xavier to test)

- Okovision runs containerized (Docker Compose: `postgres` + `backend` + `frontend`) so any Pellematic Touch owner can self-host it — no host/port/secret is ever hardcoded in the app or `docker-compose.yml`, only `.env`.
- Xavier's own dogfooding instance runs on his QNAP NAS via Container Station — connection details, QNAP-specific quirks (no `git`, Docker binary off `$PATH`, manual `docker compose` plugin install, port 8180 not 8080), and the redeploy procedure are documented in the `devops-engineer` agent definition (`.claude/agents/devops-agent.md`), not here, since that's operational info about Xavier's infra rather than the product.
- Once a fix/feature is implemented (and its branch tested), the **`devops-engineer` agent** redeploys that reference instance proactively — don't wait for Xavier to ask. Default to a targeted rebuild of the affected service(s). Full teardown (wiping the Postgres volume) is only for when the test explicitly requires a clean-slate instance — not the default after every fix.

## Notes

- CI runs backend + frontend test suites on every PR/push to `dev`/`main` (`.github/workflows/test.yml`, GitHub Actions). Not a hard merge gate yet — branch protection is blocked by GitHub plan limits on this private repo (revisit if upgraded).

## Global Directives (never delete this lines)
- CLAUDE.md is auto-updated when necessary with relevant information, keeping the file as short as possible