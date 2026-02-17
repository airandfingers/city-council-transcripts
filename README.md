# City Council Transcripts

A Next.js 16 (App Router) application for browsing city council meeting transcripts.

## Quick Start

```bash
npm install          # install dependencies
npm run hooks:install # set up git pre-push hook
npm run dev          # start dev server at http://localhost:3000
```

## NPM Scripts

| Script                  | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start development server                        |
| `npm run build`         | Production build                                |
| `npm run lint`          | ESLint                                          |
| `npm run typecheck`     | TypeScript type-check (no emit)                 |
| `npm run test:quick`    | Lint + typecheck                                |
| `npm run test:gates`    | Run all quality gates (lint, build, E2E)        |
| `npm run test:prepush`  | Same as `test:gates`; used by the pre-push hook |
| `npm run hooks:install` | Point git to `.githooks/` for the pre-push hook |

## Project Structure

```
app/                  # Next.js App Router pages, layouts, components
  lib/                # Server-only data functions (dummy seed data)
  components/         # Shared React components
  [state]/[city]/     # Dynamic city routes
tests/
  e2e/                # Playwright E2E test scripts (app-owned)
scripts/
  validate/           # Quality-gate wrapper scripts + manifest
    gates.json        # Gate registry (id → command)
    run-gates.mjs     # Gate runner (--all or --id <gate>)
skills/
  webapp-testing/     # Vendored Anthropic webapp-testing skill (read-only)
    scripts/          #   with_server.py helper for E2E server lifecycle
    examples/         #   Reference Playwright patterns
specs/                # Feature specifications (requirements + design docs)
.ralph/               # Ralph autonomous agent config
  PROMPT.md           # Loop behavior and gate-first workflow rules
  @AGENT.md           # Build/test commands and quality standards
  @fix_plan.md        # Current task queue
.githooks/            # Git hooks (pre-push)
CLAUDE.md             # Claude Code contextual guidance
```

## Quality Gates

Every push runs `npm run test:prepush`, which executes all registered gates from `scripts/validate/gates.json`. Gates include lint, build, and Playwright E2E checks.

To bypass the pre-push hook when needed:

```bash
git push --no-verify
```

## Development Workflow

This project uses a **gate-first** development pattern:

1. **Specs** define what to build (`specs/<feature>/requirements.md` + `design.md`).
2. **Quality gates** are written first to encode acceptance criteria as executable pass/fail checks.
3. **Implementation** follows, iterated until all gates pass.
4. **`npm run test:gates`** validates the iteration before committing.

For autonomous agent loops (Ralph), see `.ralph/PROMPT.md` for operating rules and `.ralph/@AGENT.md` for full build/test/quality standards.
