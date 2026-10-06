#!/usr/bin/env bash
# Builds one "batch" PR from several open PRs, so production deploys once per
# batch instead of once per PR (see docs/batch-merges.md).
#
# Every production deploy starts with an empty page cache, and warm-cache.yml
# re-renders the whole site from Neon: ~80-85 MB of the free plan's 5 GB/month
# transfer, plus a compute wake, whatever the PR changed (measured 2026-10-06).
#
# Usage:
#   scripts/batch-prs.sh              # every open PR labelled batch-ready
#   scripts/batch-prs.sh 92 93 85     # these PRs, in this order
#   SKIP_GATES=1 scripts/batch-prs.sh # don't run npm run test:gates
#   DRY_RUN=1 scripts/batch-prs.sh    # build the branch locally; don't push or open the PR
#
# Merge the batch PR by hand with "Create a merge commit" (NOT squash or
# rebase). That keeps each PR's commits on main, so GitHub marks every
# included PR as merged by itself.
set -euo pipefail

LABEL="batch-ready"
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty; commit or stash first." >&2
  exit 1
fi

if [ "$#" -gt 0 ]; then
  prs=("$@")
else
  # Oldest first, so earlier work merges first.
  prs=()
  while read -r n; do [ -n "$n" ] && prs+=("$n"); done \
    < <(gh pr list --label "$LABEL" --state open --json number -q 'sort_by(.number) | .[].number')
fi
if [ -z "${prs[*]:-}" ]; then
  echo "No PRs to batch (none labelled $LABEL)." >&2
  exit 1
fi

git fetch -q origin --prune
branch="batch/$(date +%Y-%m-%d)"
if git rev-parse -q --verify "refs/heads/$branch" >/dev/null || git ls-remote -q --exit-code --heads origin "$branch" >/dev/null; then
  branch="$branch-$(date +%H%M)"
fi
git checkout -q -b "$branch" origin/main
echo "Building $branch from origin/main ($(git rev-parse --short HEAD))"

list=""
for n in "${prs[@]}"; do
  read -r state base title < <(gh pr view "$n" --json state,baseRefName,title -q '[.state, .baseRefName, .title] | @tsv')
  if [ "$state" != "OPEN" ] || [ "$base" != "main" ]; then
    echo "  skip #$n: state=$state base=$base" >&2
    continue
  fi
  # pull/N/head works for branches in this repo, Dependabot's and forks alike.
  git fetch -q origin "pull/$n/head:batch-src-$n"
  if ! git merge -q --no-ff --no-edit -m "Merge PR #$n: $title" "batch-src-$n"; then
    git merge --abort
    git checkout -q main
    git branch -q -D "$branch"
    for ref in $(git for-each-ref --format='%(refname:short)' 'refs/heads/batch-src-*'); do git branch -q -D "$ref"; done
    echo "Conflict merging #$n into the batch. Rebase #$n on main (or drop it) and run again." >&2
    exit 1
  fi
  echo "  + #$n $title"
  list+="- #$n $title"$'\n'
done
for ref in $(git for-each-ref --format='%(refname:short)' 'refs/heads/batch-src-*'); do git branch -q -D "$ref"; done

if [ -z "$list" ]; then
  echo "Nothing merged into the batch." >&2
  exit 1
fi

if [ -z "${SKIP_GATES:-}" ]; then
  npm run test:gates
fi

if [ -n "${DRY_RUN:-}" ]; then
  echo "DRY_RUN: $branch built locally, not pushed."
  exit 0
fi

git push -q -u origin "$branch"
body="Batch merge: one production deploy for these PRs (docs/batch-merges.md).

$list
**Merge with \"Create a merge commit\"** (not squash or rebase), so GitHub marks each PR above as merged.

Gates: $([ -z "${SKIP_GATES:-}" ] && echo "\`npm run test:gates\` passed on the combined branch" || echo "skipped (SKIP_GATES=1)")."
gh pr create --base main --head "$branch" --title "batch: $(date +%Y-%m-%d) ($(echo "$list" | grep -c '^- ') PRs)" --body "$body"
