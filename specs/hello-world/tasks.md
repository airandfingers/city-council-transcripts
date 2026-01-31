---
spec: hello-world
phase: tasks
total_tasks: 11
created: 2026-01-30T00:00:00Z
---

# Tasks: Hello World Page

## Execution Context
- **Priority**: Ship fast - POC first, polish later
- **Additional context**: No, let's proceed

## Phase 1: Make It Work (POC)

Focus: Replace 66-line starter page with minimal "Hello World". Validate via lint+build.

- [x] 1.1 Replace page.tsx with Hello World component
  - **Do**:
    1. Open `/Users/aarony/city-council-transcripts/app/page.tsx`
    2. Delete all 66 lines (entire file contents)
    3. Replace with 3-line component:
       ```typescript
       export default function Home() {
         return <div>Hello World</div>;
       }
       ```
    4. Save file
  - **Files**: `/Users/aarony/city-council-transcripts/app/page.tsx`
  - **Done when**: File contains only 3 lines with minimal Server Component
  - **Verify**: `cat /Users/aarony/city-council-transcripts/app/page.tsx | wc -l` outputs 3
  - **Commit**: `feat(home): replace starter page with Hello World component`
  - _Requirements: FR-1, FR-2, FR-3, FR-4, AC-1.4, AC-2.1, AC-2.2_
  - _Design: Implementation Steps 1-3_

- [x] 1.2 [VERIFY] Lint validation: npm run lint
  - **Do**: Run ESLint to verify no violations
  - **Verify**: `npm run lint` exits 0
  - **Done when**: Zero ESLint errors or warnings
  - **Commit**: None (or `fix(home): address lint issues` if fixes needed)
  - _Requirements: FR-6, AC-2.4_

- [x] 1.3 [VERIFY] Build validation: npm run build
  - **Do**: Run production build to verify TypeScript strict mode compliance
  - **Verify**: `npm run build` exits 0
  - **Done when**: Build completes successfully with no type errors
  - **Commit**: None (or `fix(home): fix type errors` if fixes needed)
  - _Requirements: FR-5, AC-2.3, NFR-1_

- [ ] 1.4 Manual browser verification
  - **Do**:
    1. Start dev server: `npm run dev`
    2. Open browser to `http://localhost:3000`
    3. Verify "Hello World" text displays
    4. Toggle system dark mode (macOS: System Preferences > Display)
    5. Verify text remains visible in both modes
    6. Check browser console for errors (should be none)
  - **Files**: None
  - **Done when**: "Hello World" visible in browser, both light and dark mode, zero console errors
  - **Verify**: Manual visual inspection (no automated browser testing available)
  - **Commit**: None
  - _Requirements: AC-1.1, AC-1.2, AC-1.3, US-1_
  - _Design: Implementation Steps 6-8_

- [ ] 1.5 POC Checkpoint
  - **Do**: Verify all POC success criteria met via quality commands
  - **Done when**: `npm run lint && npm run build` passes with exit 0
  - **Verify**: `npm run lint && npm run build` (chained commands)
  - **Commit**: `feat(home): complete Hello World POC`
  - _Requirements: Success Criteria section_

## Phase 2: Refactoring

Focus: N/A - Component already minimal (3 lines). No refactoring needed.

**Skipped**: Implementation is trivial and follows all Next.js patterns. No extraction or error handling required.

## Phase 3: Testing

Focus: N/A - No test infrastructure exists per .progress.md learnings.

**Skipped**: Package.json has no test commands. Manual browser verification completed in Phase 1.4.

## Phase 4: Quality Gates

- [ ] 4.1 [VERIFY] Full local CI: npm run lint && npm run build
  - **Do**: Run complete local validation suite
  - **Verify**: Both commands pass:
    - `npm run lint` (ESLint validation)
    - `npm run build` (TypeScript + Next.js build)
  - **Done when**: Both commands exit 0
  - **Commit**: `fix(home): address final quality issues` (if fixes needed)
  - _Requirements: FR-5, FR-6, AC-2.3, AC-2.4_

- [ ] 4.2 Create PR and verify CI
  - **Do**:
    1. Verify current branch is feature branch: `git branch --show-current`
    2. If on default branch (main), STOP and alert user
    3. Push branch: `git push -u origin $(git branch --show-current)`
    4. Create PR: `gh pr create --title "feat(home): replace Next.js starter with Hello World" --body "$(cat <<'EOF'
## Summary
- Replace 66-line Next.js starter page with 3-line Hello World component
- Remove all images, links, and boilerplate instructions
- Maintain Server Component pattern (no client JS)
- Pass lint and build validation

## Changes
- Modified `app/page.tsx` (66 lines → 3 lines, 95% reduction)

## Test Plan
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Manual browser verification at http://localhost:3000
- [x] Dark mode compatibility verified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"`
    5. If gh CLI unavailable, output instructions for manual PR creation
  - **Verify**: `gh pr checks --watch` (wait for CI completion, all checks pass)
  - **Done when**: PR created, all CI checks green
  - **Commit**: None

## Phase 5: PR Lifecycle

- [ ] 5.1 Monitor CI pipeline
  - **Do**:
    1. Check CI status: `gh pr checks`
    2. If any checks fail, read failure details
    3. Fix issues locally, commit, push
    4. Re-verify: `gh pr checks --watch`
  - **Done when**: All CI checks pass (green)
  - **Verify**: `gh pr checks` shows all ✓
  - **Commit**: `fix(ci): resolve CI failures` (if fixes needed)

- [ ] 5.2 Address code review comments
  - **Do**:
    1. Check for review comments: `gh pr view --comments`
    2. If comments exist, address each one:
       - Make requested code changes
       - Commit with descriptive message
       - Respond to comments: `gh pr comment --body "Fixed in <commit>"`
    3. Push changes: `git push`
    4. Re-verify CI: `gh pr checks --watch`
  - **Done when**: All review comments resolved, CI green
  - **Verify**: `gh pr view` shows "Approved" status
  - **Commit**: Various (depends on review feedback)

- [ ] 5.3 [VERIFY] Final validation before merge
  - **Do**:
    1. Verify zero test regressions (no tests exist, skip)
    2. Verify code modularity (3-line component, inherently modular)
    3. Verify CI green: `gh pr checks`
    4. Verify PR approved: `gh pr view`
  - **Done when**: All merge requirements met
  - **Verify**: `gh pr checks` all green, `gh pr view` shows approval
  - **Commit**: None

- [ ] 5.4 [VERIFY] AC checklist
  - **Do**: Programmatically verify each acceptance criterion met:
    1. AC-1.1: Check dev server shows "Hello World" (manual from 1.4)
    2. AC-1.2: No console errors (manual from 1.4)
    3. AC-1.3: Dark mode compatible (manual from 1.4)
    4. AC-1.4: No starter content: `grep -E "(Image|next\.svg|vercel\.svg|Deploy|Documentation)" /Users/aarony/city-council-transcripts/app/page.tsx` exits 1 (no matches)
    5. AC-2.1: Default export present: `grep "export default function Home" /Users/aarony/city-council-transcripts/app/page.tsx` exits 0
    6. AC-2.2: No "use client": `grep "use client" /Users/aarony/city-council-transcripts/app/page.tsx` exits 1 (not found)
    7. AC-2.3: TypeScript passes: `npm run build` exits 0
    8. AC-2.4: ESLint passes: `npm run lint` exits 0
  - **Verify**: All grep commands return expected exit codes, build/lint pass
  - **Done when**: All acceptance criteria verified via automated checks
  - **Commit**: None

## Notes

### POC Shortcuts Taken
- No automated browser testing (none exists in project)
- Dark mode verification manual (no programmatic test)
- Visual inspection required for AC-1.1, AC-1.2, AC-1.3

### Production TODOs
- None - implementation is minimal and production-ready
- No tests needed (no test infrastructure exists)
- No refactoring needed (3 lines already optimal)

### Verification Commands Discovered
- Lint: `npm run lint` (ESLint 9 with Next.js config)
- Build: `npm run build` (Next.js build with TypeScript validation)
- No test command (no test infrastructure)
- No separate typecheck command (handled by build)
