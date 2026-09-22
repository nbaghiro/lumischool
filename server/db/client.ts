// The only file in server/db/ that opens a connection. `open` is the owner, for migrations, the
// catalogue and tests; `withFamily` is the app role's one way in. .docs/db.md says why its settings
// are transaction-local and why neither handle connects at import time.

import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

/** The owner, on the container in docker-compose.yml. */
export const LOCAL_URL = "postgres://lumischool:lumischool@localhost:8502/lumischool";

/** The app role, on the same container. Its local login comes from server/db/migrations/local-roles.sql. */
export const LOCAL_APP_URL = "postgres://lumischool_app:lumischool_app@localhost:8502/lumischool";

/** The owner's URL. `DATABASE_URL` for anything that is not the local container. */
export function ownerUrl(): string {
    return process.env.DATABASE_URL || LOCAL_URL;
}

/** The app role's URL. `APP_DATABASE_URL` for anything that is not the local container. */
function appUrl(): string {
    return process.env.APP_DATABASE_URL || LOCAL_APP_URL;
}

/**
 * How long the app role waits, from the environment: `DB_CONNECT_TIMEOUT` seconds for a connection,
 * which is long enough for a database that sleeps when idle to wake, and `DB_STATEMENT_TIMEOUT`
 * milliseconds for any one statement, which ends a query or a lock wait that would otherwise hold a
 * request open for good.
 */
function limits(): { connect: number; statement: number } {
    const read = (name: string, fallback: number): number => {
        const given = process.env[name];
        if (given === undefined || given === "") return fallback;
        const n = Number(given);
        if (!Number.isInteger(n) || n <= 0)
            throw new Error(`${name} must be a whole number above zero, not "${given}"`);
        return n;
    };
    return {
        connect: read("DB_CONNECT_TIMEOUT", 10),
        statement: read("DB_STATEMENT_TIMEOUT", 10_000),
    };
}

type Database = PostgresJsDatabase<typeof schema>;

export interface Store {
    db: Database;
    /** The driver, for the handful of things drizzle has no expression for. */
    raw: postgres.Sql;
    close: () => Promise<void>;
}

/**
 * Postgres notices go to the console, except the two the migrator produces on every run after the
 * first ("schema drizzle already exists", "relation __drizzle_migrations already exists"), which are
 * its idempotence working as designed and would otherwise make `db:migrate` look like it failed.
 */
function onnotice(notice: postgres.Notice): void {
    if (notice.code === "42P06" || notice.code === "42P07") return;
    process.stderr.write(`postgres: ${notice.severity} ${notice.message}\n`);
}

/**
 * prepare:false because a pooler in transaction mode rejects prepared statements, and it costs
 * nothing on a direct connection. Neon has one.
 */
function connect(url: string, connectTimeout?: number): Store {
    const raw = postgres(url, {
        prepare: false,
        onnotice,
        ...(connectTimeout === undefined ? {} : { connect_timeout: connectTimeout }),
    });
    return { db: drizzle(raw, { schema }), raw, close: () => raw.end({ timeout: 5 }) };
}

/**
 * An owner connection, for migrations, the catalogue and test setup. The caller closes it. The owner
 * bypasses row-level security, so nothing that serves a request may use this.
 */
export function open(url: string = ownerUrl()): Store {
    return connect(url);
}

/**
 * Whether the owner can reach the database, and the reason when it cannot. The tests use this to skip
 * cleanly rather than fail when there is no Docker.
 */
export async function reachable(url: string = ownerUrl()): Promise<string | null> {
    const probe = postgres(url, { prepare: false, connect_timeout: 2, onnotice: () => {} });
    try {
        await probe`select 1`;
        return null;
    } catch (error) {
        // A refused connection carries its reason in `code` and an empty `message`.
        return (error as { code?: string }).code || (error as Error).message || "unreachable";
    } finally {
        await probe.end({ timeout: 2 });
    }
}

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

declare const inFamily: unique symbol;

/**
 * A transaction that `withFamily` opened. The store's own operations take this type rather than a
 * plain transaction, so passing them an owner connection, which would bypass row-level security, is
 * a type error rather than a quiet leak.
 */
export type FamilyTx = Tx & { readonly [inFamily]: true };

export interface Scope {
    /** The family whose rows this work may see. null before anyone has chosen one, which sees none. */
    family: string | null;
    /** The signed-in user, when there is one. `users` rows are readable through it. */
    user?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkScope(scope: Scope): void {
    for (const [name, value] of [
        ["family", scope.family],
        ["user", scope.user ?? null],
    ] as const) {
        if (value !== null && !UUID.test(value))
            throw new Error(`withFamily: ${name} must be a uuid or null`);
    }
}

let app: { store: Store; statement: number } | null = null;

/**
 * Runs `work` as the app role, inside one transaction, with `app.family`, `app.user` and the statement
 * timeout set for that transaction only, so none of them outlives it on a pooled connection or depends
 * on a pooler passing connection settings on. Everything it returns is whatever `work` returns;
 * everything it throws rolls the transaction back.
 */
export async function withFamily<T>(scope: Scope, work: (tx: FamilyTx) => Promise<T>): Promise<T> {
    checkScope(scope);
    if (!app) {
        const wait = limits();
        app = { store: connect(appUrl(), wait.connect), statement: wait.statement };
    }
    const statement = String(app.statement);
    return app.store.db.transaction(async (tx) => {
        await tx.execute(
            sql`select set_config('app.family', ${scope.family ?? ""}, true), set_config('app.user', ${scope.user ?? ""}, true), set_config('statement_timeout', ${statement}, true)`,
        );
        return work(tx as FamilyTx);
    });
}

/**
 * Moves a transaction `withFamily` opened to another scope until it ends or moves again. Two steps of
 * signing in need it: starting a family, which learns who the person is only inside its transaction,
 * and ending the session a person held in one family in the transaction that opens their session in
 * another (`endHeld` in server/db/keys.ts), which moves back before it returns.
 */
export async function setScope(tx: FamilyTx, scope: Scope): Promise<void> {
    checkScope(scope);
    await tx.execute(
        sql`select set_config('app.family', ${scope.family ?? ""}, true), set_config('app.user', ${scope.user ?? ""}, true)`,
    );
}

/** One trivial statement as the app role, for the health check. */
export async function ping(): Promise<void> {
    await withFamily({ family: null }, (tx) => tx.execute(sql`select 1`));
}

/** Closes the app role's pool, for scripts and tests that are finished. */
export async function closeApp(): Promise<void> {
    const handle = app;
    app = null;
    if (handle) await handle.store.close();
}
