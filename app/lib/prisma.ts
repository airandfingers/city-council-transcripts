import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

/**
 * Prisma clients. The default export talks to Neon over HTTP; `prismaTx` is a
 * conventional (TCP) client kept for the few operations that need a transaction.
 *
 * WHY (FIX-NEON-HTTP-ADAPTER-001): the default Prisma client holds a real,
 * persistent Postgres connection open for as long as the serverless instance
 * that created it stays warm — independent of how much traffic it serves. Neon
 * bills compute by *active time* and its free-plan scale-to-zero is a fixed 5
 * minutes, so a held-open connection blocks auto-suspend no matter how idle the
 * app is. Measured live 2026-09-22: one connection open 28+ minutes having run a
 * single `SELECT 1` health check, while the endpoint never suspended. Caching
 * reads (FIX-NEON-COMPUTE-CACHING-001) cut query volume but could not fix this,
 * because the cost is the open connection, not the queries.
 *
 * `PrismaNeonHTTP` issues each query as an independent HTTPS request, so there
 * is no connection to hold open between queries and nothing to close between
 * requests. Page-serving instances — the ones real traffic keeps warm — hold no
 * connection at all, which is what lets the compute suspend.
 *
 * WHY NOT `PrismaNeon` (the WebSocket adapter shown in most guides): Neon's docs
 * are explicit that "WebSocket connections can't outlive a single request...
 * Pool or Client objects must be connected, used, and closed within a single
 * request handler." As a module-scope singleton it would either error on stale
 * sockets or recreate the held-open problem this exists to remove; done properly
 * it would force all ~21 importers to change shape. HTTP needs neither.
 */

const connectionString = process.env.DATABASE_URL ?? "";

/**
 * Local development runs against the Docker Postgres in docker-compose.yml
 * (`.env.local`/`.env.docker`), and Neon's driver speaks to a Neon endpoint over
 * HTTPS rather than the Postgres wire protocol — it cannot talk to a plain local
 * server. So the adapter is used only for real Neon hosts; everything else keeps
 * the stock client for both exports.
 */
const isNeonHost = /@[^/]*\.neon\.tech(?::\d+)?\//.test(connectionString);

// No `globalThis` singleton guard, matching this file's long-standing behavior:
// a fresh client per dev hot-reload keeps schema changes visible immediately.
// That's also harmless on the Neon path, which holds no connection to leak.
const prisma = isNeonHost
  ? new PrismaClient({ adapter: new PrismaNeonHTTP(connectionString, {}) })
  : new PrismaClient();

export default prisma;

/**
 * Transaction-capable client. **Use this for `upsert`, `createMany`,
 * `updateMany`, any nested relation write, and any `$transaction`.**
 *
 * Prisma opens an implicit transaction for those, and `PrismaNeonHTTP` rejects
 * `startTransaction()` outright ("Transactions are not supported in HTTP mode").
 * Verified empirically against the live database before this shipped, rather
 * than assumed — `create`, `update`, `delete`, `deleteMany` and every read
 * (including deep relation loads, `count`, and `groupBy`) work fine over HTTP;
 * `upsert`, `createMany` and `updateMany` do not. A mistake here fails loudly at
 * request time with that error, not silently — and the build never touches the
 * database, so it won't be caught by `next build`.
 *
 * This is deliberately a *conventional* TCP client, so it does hold a connection
 * once used. That's an accepted, bounded trade: only the ~10 call sites that
 * need it touch it, all on cron/admin/subscribe paths that run rarely — never on
 * the hot read paths that keep instances warm. It is created lazily, so an
 * instance that only serves reads never constructs it and never connects.
 *
 * Nothing in this app was ever atomic across statements (there are no
 * `$transaction` calls), so splitting work across the two clients changes no
 * existing guarantee.
 */
let txClient: PrismaClient | undefined;

function getTxClient(): PrismaClient {
  // Off Neon, one plain client serves both roles — no reason for a second.
  txClient ??= isNeonHost ? new PrismaClient() : prisma;
  return txClient;
}

export const prismaTx: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getTxClient();
    const value = Reflect.get(client, prop) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
