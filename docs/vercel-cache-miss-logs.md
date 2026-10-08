# Pulling Vercel request logs (cache misses)

**Who this is for:** anyone on the **airandfingers** Vercel team. Production lives there, and accounts outside the team can't read its logs.

**Why:** Neon's free plan bills every compute wake for at least 5 minutes. Since Oct 1 the transcriber touches Neon only once a day, but compute is still running 9–13 active hours a day. So the remaining wakes come from site requests that miss the cache. These logs show which URLs are missing the cache, and when.

## One-time setup (~2 min)

```bash
npm i -g vercel        # or use `npx vercel` in place of `vercel` below
vercel login           # log in with the account that's on the airandfingers team
vercel teams ls        # note the team's ID/slug (expected: airandfingers)
vercel project ls --scope airandfingers   # note the project name (expected: city-council-transcripts)
```

The script assumes the team slug is `airandfingers` and the project is `city-council-transcripts`. If either is different, set `VERCEL_SCOPE` / `VERCEL_PROJECT` on each command:

```bash
VERCEL_SCOPE=<team-slug> VERCEL_PROJECT=<project-name> npm run vercel:misses
```

## Run it

```bash
git checkout main && git pull --ff-only origin main
npm run vercel:misses                 # pulls the last 2h, saves it, prints a report
```

Vercel keeps request logs only for a short time (about 1 hour on Hobby, longer on paid plans), so a single run sees only a small slice. **To capture a full day**, leave it running:

```bash
npm run vercel:misses -- --watch      # pulls every 20 min, appends + dedupes, Ctrl-C to stop
npm run vercel:misses -- --report     # report on everything collected so far
```

If the team is on a plan that keeps logs longer, you can skip `--watch` and pull a whole day at once: `SINCE=24h npm run vercel:misses`.

## What to send back

Either one of these:

- the `--report` output (paste it), or
- the raw file, **`.vercel-logs/requests.jsonl`** (gitignored).

Each line contains the timestamp, path, status code, cache status (`HIT`/`MISS`/`STALE`/…), source (serverless/static) and deployment ID. There are **no IP addresses or user agents** in it.

## Reading the report

- **Serverless requests without a cache HIT** are the candidate Neon wakes. Static assets never touch the DB.
- **by route**: which page type is missing the cache (transcript, topic, city, API).
- **odd URL spellings**: query strings, `%xx`-encoded characters, uppercase letters and trailing slashes. These can bypass the cached canonical page (see FIX-NEON-ENCODED-PATH-REDIRECT-001).
- **per hour (UTC)**: compare it with `scripts/neon_usage.py --activity` in city-council-transcriber, which also uses UTC days.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `The specified scope does not exist` | Wrong team slug, or your login isn't on the team. Check `vercel whoami` / `vercel teams ls`. |
| `Project not found` | Set `VERCEL_PROJECT` to the name shown by `vercel project ls --scope <team>`. |
| `fetched 0` | No traffic in the window, or the logs already expired. Run with `--watch`. |
| `hit LIMIT=10000` | Raise `LIMIT`, or shorten `SINCE`. |
