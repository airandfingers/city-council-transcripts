# Batch merges

**Rule:** don't merge PRs into `main` one at a time. Queue them, and once a week merge one batch PR that contains them all. Production then deploys once per batch.

## Why

Every production deploy starts with an empty page cache. `warm-cache.yml` then re-renders the whole site (~505 pages) from Neon. Measured on 2026-10-06, that costs **~80–85 MB of Neon transfer** (free plan: 5 GB/month) plus a compute wake, **however small the PR**. A docs-only change costs the same as a feature. Four deploys in one day (Oct 3) cost as much as about two weeks of normal traffic.

## Cadence

- **One batch a week, on Thursday.** That's at most ~4–5 deploys a month, about 0.4 GB of transfer.
- **Skip the week** if nothing in the queue changes what visitors see. Docs, scripts and CI-only PRs can wait for a week that has a real change.
- **Hold all batches** if Neon is near its monthly cap. Check `scripts/neon_usage.py` in city-council-transcriber, and hold above ~80% of either meter. After the cap, a deploy wipes the cache, nothing can rebuild it, and uncached pages return 500 until the month resets.
- **Exceptions, merge alone, right away:** the site is broken, there's a security fix, or there's a time-sensitive content fix (e.g. a wrong vote count on a page people are sharing). Say so in the PR description.

## How

1. **Open PRs as usual.** Each one is reviewed and passes checks on its own, against `main`.
2. **Queue it:** when a PR is approved and ready, add the **`batch-ready`** label instead of merging. Dependabot PRs too (they're grouped weekly, see `.github/dependabot.yml`).
3. **Build the batch (Thursday):**
   ```bash
   git checkout main && git pull --ff-only origin main
   scripts/batch-prs.sh          # every open batch-ready PR, oldest first
   # or: scripts/batch-prs.sh 92 93   # specific PRs, in this order
   ```
   It creates `batch/YYYY-MM-DD` from `origin/main` and merges each PR into it with a merge commit. It stops on a conflict: rebase that PR on `main` or drop it, then run again. It then runs `npm run test:gates` on the combined branch, pushes, and opens a PR listing everything included. Use `DRY_RUN=1` to build the branch locally without pushing.
4. **Merge the batch PR by hand with "Create a merge commit"**, not squash or rebase. That keeps each PR's commits on `main`, so GitHub marks every included PR as merged by itself. Then delete the `batch/` branch.
5. **One deploy, one warm.** `warm-cache.yml` runs after the production deploy as usual.

## Notes

- If a PR in the batch turns out to be bad after the deploy, revert its merge commit (`git revert -m 1 <sha>`) in a follow-up PR. That revert is an exception PR if the site is broken; otherwise it goes in the next batch.
- Preview deployments (each PR push) don't run the warm-up and don't share the production cache, so they don't cost Neon transfer the way production deploys do.
- Parked idea that would make deploys nearly free on Neon: cache transcript *data* in Vercel's Data Cache, which survives deploys (FIX-NEON-DEPLOY-DATA-CACHE-001, not built).
