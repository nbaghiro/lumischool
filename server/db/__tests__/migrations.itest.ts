import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { open, ownerUrl, type Store } from "../client";
import { apply } from "../migrations/migrate";
import { must, prepare } from "./test-db";

const reason = await prepare();
const admin = reason === null ? open() : null;
const name = `lumischool_migration_${process.pid}`;
const password = "local_migration_test";
const dir = mkdtempSync(join(tmpdir(), "lumischool-migrations-"));
cpSync(new URL("../migrations/", import.meta.url), dir, { recursive: true });
const journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8")) as {
    version: string;
    dialect: string;
    entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[];
};
const baseTime = must(journal.entries.at(-1), "initial migration").when;
let url = "";
let owner: Store | null = null;

function add(tag: string, sql: string): void {
    const idx = journal.entries.length;
    writeFileSync(join(dir, `${tag}.sql`), sql);
    journal.entries.push({ idx, version: "7", when: baseTime + idx, tag, breakpoints: true });
    writeFileSync(join(dir, "meta/_journal.json"), JSON.stringify(journal));
}

before(async () => {
    if (!admin) return;
    await admin.raw.unsafe(
        `create role "${name}" login password '${password}' nosuperuser bypassrls createdb createrole`,
    );
    await admin.raw.unsafe(`create database "${name}" owner "${name}"`);
    const target = new URL(ownerUrl());
    target.username = name;
    target.password = password;
    target.pathname = `/${name}`;
    url = target.toString();
    owner = open(url);
});

after(async () => {
    if (owner) await owner.close();
    if (admin) {
        try {
            await admin.raw.unsafe(`drop database if exists "${name}" with (force)`);
            await admin.raw.unsafe(`drop role if exists "${name}"`);
        } finally {
            await admin.close();
        }
    }
    rmSync(dir, { recursive: true, force: true });
});

describe("forward migrations on an ordinary Postgres owner", { skip: reason ?? false }, () => {
    const db = () => must(owner, "migration owner");

    it("builds an empty database without superuser privileges", async () => {
        const [role] = await db()
            .raw`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
        assert.equal(role?.rolsuper, false);
        assert.equal(role?.rolbypassrls, true);
        await apply(url, dir);
        const tables = await db().raw`select relname, relrowsecurity, relforcerowsecurity
            from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`;
        assert.equal(tables.length, 9);
        assert.ok(tables.every((t) => t.relrowsecurity && t.relforcerowsecurity));
        const [fn] = await db()
            .raw`select to_regprocedure('kid_login_lookup(text,text,text,text)') as name`;
        assert.ok(fn?.name);
    });

    it("serializes concurrent runs and records an applied migration only once", async () => {
        await Promise.all([apply(url, dir), apply(url, dir)]);
        const rows = await db().raw`select * from drizzle.__drizzle_migrations`;
        assert.equal(rows.length, 2);
    });

    it("preserves existing rows across an upgrade and a corrective migration", async () => {
        add(
            "0001_probe",
            "CREATE TABLE migration_probe (id integer PRIMARY KEY, value text NOT NULL);",
        );
        await apply(url, dir);
        await db().raw`insert into migration_probe values (1, 'kept')`;
        add("0002_add_note", "ALTER TABLE migration_probe ADD COLUMN note text DEFAULT 'draft';");
        await apply(url, dir);
        add(
            "0003_correct_note",
            "ALTER TABLE migration_probe ALTER COLUMN note SET DEFAULT 'ready';",
        );
        await apply(url, dir);
        await db().raw`insert into migration_probe (id, value) values (2, 'new')`;
        const rows = await db().raw`select * from migration_probe order by id`;
        assert.deepEqual(
            [...rows],
            [
                { id: 1, value: "kept", note: "draft" },
                { id: 2, value: "new", note: "ready" },
            ],
        );
        await apply(url, dir);
        const history = await db().raw`select * from drizzle.__drizzle_migrations`;
        assert.equal(history.length, 5);
    });

    it("rolls back a failed batch without recording it and releases its lock", async () => {
        add(
            "0004_failure",
            "ALTER TABLE migration_probe ADD COLUMN abandoned text;\n--> statement-breakpoint\nSELECT missing_migration_function();",
        );
        await assert.rejects(apply(url, dir));
        const columns = await db().raw`select column_name from information_schema.columns
            where table_schema = 'public' and table_name = 'migration_probe'`;
        assert.ok(columns.every((c) => c.column_name !== "abandoned"));
        assert.equal((await db().raw`select * from drizzle.__drizzle_migrations`).length, 5);
        // Failed migrations were never applied and can be corrected before retrying.
        writeFileSync(
            join(dir, "0004_failure.sql"),
            "ALTER TABLE migration_probe ADD COLUMN completed boolean;",
        );
        await apply(url, dir);
        assert.equal((await db().raw`select * from drizzle.__drizzle_migrations`).length, 6);
    });
});
