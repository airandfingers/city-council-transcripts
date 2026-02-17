# Ralph Fix Plan

## Active Spec

- [ ] `specs/city-site-structure/requirements.md` reviewed and converted into implementation tasks

## High Priority (Gate-First)

- [ ] Add/adjust gate: `home-layout-content-e2e` and register in `scripts/validate/gates.json`
- [ ] Add/adjust gate: `city-page-content-e2e` and register in `scripts/validate/gates.json`
- [ ] Add/adjust gate: `routes-not-found-check` and register in `scripts/validate/gates.json`
- [ ] Add/adjust gate: `lint-check` and register in `scripts/validate/gates.json`
- [ ] Add/adjust gate: `build-check` and register in `scripts/validate/gates.json`
- [ ] Run targeted gates (`node scripts/validate/run-gates.mjs --id <gate-id>`) and verify expected pass/fail behavior

## High Priority (Implementation)

- [ ] Implement dummy city + meeting data functions with stable server-side contracts
- [ ] Implement static city params generation for App Router dynamic routes
- [ ] Implement city route 404 behavior for unknown params
- [ ] Implement Home page sections: city cards and About content
- [ ] Implement Home page Flexbox responsive behavior (2-column wide / 1-column narrow)
- [ ] Implement City page title, summary, and one-column meeting card list
- [ ] Implement meeting cards with transcript link target `#`

## Validation / Completion

- [ ] Run all gates: `node scripts/validate/run-gates.mjs --all`
- [ ] Fix failing gates until all pass
- [ ] Update `.ralph/@AGENT.md` with any new build/test commands or gate notes
- [ ] Mark completed items and commit with conventional commit message

## Completed

- [x] Project initialization
- [x] Initial gate runner scaffold (`scripts/validate/run-gates.mjs`)
- [x] Initial hello-world gate (`hello-world-e2e`)

## Notes

- Ralph must write/maintain gate scripts; human defines acceptance criteria.
- Keep iterations small: gate-first (red), implementation (green), then all-gates validation.
