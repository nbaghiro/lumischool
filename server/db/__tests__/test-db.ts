// Builds a test database from the real migration files and points both roles at it. With no
// database the suites skip; with LUMISCHOOL_REQUIRE_DB=1 they fail instead, which is what CI sets.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LOCAL_APP_URL, open, ownerUrl, reachable, type Store } from "../client";
import { apply } from "../migrations/migrate";
import { TABLES } from "../schema";

const ROLES = readFileSync(
    fileURLToPath(new URL("../migrations/local-roles.sql", import.meta.url)),
    "utf8",
);

/**
 * One database per test process, `lumischool_test_<pid>`, so two runs at once (two agents, or a person
 * and an agent) never drop the database the other is using. A run leaves its database behind, and the
 * next run drops every one whose process has ended.
 */
const NAME = `lumischool_test_${process.pid}`;
const PREFIX = "lumischool_test_";

const alive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error instanceof Error && "code" in error && error.code === "EPERM";
    }
};

const withDatabase = (url: string, name: string): string => {
    const u = new URL(url);
    u.pathname = `/${name}`;
    return u.toString();
};

/** The value, or a failure naming what was missing, for a row a test has just made sure exists. */
export function must<T>(value: T | null | undefined, what: string): T {
    if (value === null || value === undefined) throw new Error(`${what} is missing`);
    return value;
}

/** Prepares the test database, or says why it cannot. Exits the process when a database is required. */
export async function prepare(): Promise<string | null> {
    const admin = ownerUrl();
    const appAdmin = process.env.APP_DATABASE_URL || LOCAL_APP_URL;
    const where = admin.replace(/:\/\/[^@]*@/, "://");

    const unreachable = await reachable(admin);
    if (unreachable !== null) {
        const reason = `no database at ${where} (${unreachable}). Run npm run db:up`;
        if (process.env.LUMISCHOOL_REQUIRE_DB === "1") {
            process.stderr.write(`LUMISCHOOL_REQUIRE_DB=1 and ${reason}\n`);
            process.exit(1);
        }
        process.stdout.write(`skipping the store tests: ${reason}\n`);
        return reason;
    }

    // The test database is built from nothing on every run. It is disposable, and a database that
    // persists across runs is one that can hold a schema the tree no longer has: when the initial
    // migration was replaced, the old test database still had the old tables, and applying the new
    // file on top of them failed. `with (force)` ends any connection a crashed run left open.
    const owner = open(admin);
    try {
        const left = await owner.raw.unsafe<{ datname: string }[]>(
            String.raw`select datname from pg_database where datname like 'lumischool\_test%'`,
        );
        for (const { datname } of left) {
            // the one shared database runs before this one used, which nothing uses now
            const shared = datname === "lumischool_test";
            const pid = Number(datname.slice(PREFIX.length));
            const ended = !Number.isInteger(pid) || pid <= 0 || !alive(pid);
            if (shared || (datname.startsWith(PREFIX) && (datname === NAME || ended)))
                await owner.raw.unsafe(`drop database if exists "${datname}" with (force)`);
        }
        await owner.raw.unsafe(`create database "${NAME}"`);
        await owner.raw.unsafe(ROLES);
    } finally {
        await owner.close();
    }

    const testOwner = withDatabase(admin, NAME);
    await apply(testOwner);
    process.env.DATABASE_URL = testOwner;
    process.env.APP_DATABASE_URL = withDatabase(appAdmin, NAME);
    return null;
}

/** Empties every table, as the owner, which bypasses row-level security. */
export async function truncate(owner: Store): Promise<void> {
    await owner.raw.unsafe(
        `truncate table ${TABLES.map((t) => `"${t}"`).join(", ")} restart identity cascade`,
    );
}

/** The Postgres error code of a rejected query, for asserting which rule refused it. */
export function codeOf(error: unknown): string | undefined {
    const e = error as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code;
}

/** Codes the tests assert on. */
export const PG = {
    /** A foreign key did not find its row: here, a `(family, kid)` pair that does not exist. */
    foreignKey: "23503",
    /** A unique constraint. */
    unique: "23505",
    /** A check constraint, or the last-parent rule, which raises with the same code. */
    check: "23514",
    /** `new row violates row-level security policy`. */
    policy: "42501",
    /** `permission denied`, which shares its code with a policy refusal. */
    denied: "42501",
} as const;
