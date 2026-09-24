// The policies as Postgres holds them: every table is declared in server/db/scope.ts or is `users`, and
// every policy on a family's table compares its family column with the setting.

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { closeApp, open, type Store } from "../client";
import { SCOPE, policySql } from "../scope";
import { must, prepare } from "./test-db";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

describe("the policies in the database", { skip: reason ?? false }, () => {
    const db = () => must(owner, "the owner connection");

    it("has a policy on every declared table that compares its family column with the setting, and no table left out", async () => {
        const policies = await db().raw<
            {
                tablename: string;
                policyname: string;
                cmd: string;
                qual: string | null;
                with_check: string | null;
            }[]
        >`
            select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname = 'public'`;
        const tables = await db().raw<{ relname: string }[]>`
            select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`;
        assert.deepEqual(
            tables.map((t) => t.relname).sort(),
            [...Object.keys(SCOPE), "users"].sort(),
            "every table is declared, or is users",
        );

        for (const [table, scope] of Object.entries(SCOPE)) {
            const own = policies.filter((p) => p.tablename === table);
            assert.ok(own.length > 0, `${table} has no policy`);
            for (const p of own) {
                const text = `${p.qual ?? ""} ${p.with_check ?? ""}`;
                if (table === "keys" && p.policyname === "detached_browser") {
                    assert.equal(p.qual, p.with_check);
                    assert.equal(p.cmd, "ALL");
                    assert.match(text, /kind = 'browser'/);
                    assert.match(text, /family_id IS NULL/);
                    assert.match(text, /originFamily/);
                    assert.match(text, /app_family\(\)/);
                    continue;
                }
                assert.match(
                    text,
                    new RegExp(`\\b${scope.family} = \\( SELECT app_family\\(\\)`),
                    `${table}.${p.cmd} does not compare ${scope.family} with app_family()`,
                );
            }
            if ("shared" in scope && scope.shared) {
                const read = own.find((p) => p.cmd === "SELECT");
                assert.match(
                    read?.qual ?? "",
                    /family_id IS NULL/,
                    `${table}'s read policy does not share the catalogue`,
                );
                assert.ok(
                    own
                        .filter((p) => p.cmd !== "SELECT")
                        .every((p) => !/IS NULL/.test(`${p.qual} ${p.with_check}`)),
                    `${table} lets someone write shared rows`,
                );
            }
        }
        const people = policies.filter((p) => p.tablename === "users");
        assert.equal(people.length, 4);
        for (const p of people)
            assert.match(`${p.qual ?? ""} ${p.with_check ?? ""}`, /app_user\(\)/);
    });
    it("matches the current policy definitions after replaying the migration history", async () => {
        await db().raw.begin(async (tx) => {
            const before =
                await tx`select tablename, policyname, permissive, roles, cmd, qual, with_check
                from pg_policies where schemaname = 'public' order by tablename, policyname`;
            for (const row of before) {
                await tx`drop policy ${tx(String(row.policyname))} on ${tx(String(row.tablename))}`;
            }
            await tx.unsafe(policySql().replaceAll("--> statement-breakpoint", ""));
            const expected =
                await tx`select tablename, policyname, permissive, roles, cmd, qual, with_check
                from pg_policies where schemaname = 'public' order by tablename, policyname`;
            assert.deepEqual([...before], [...expected]);
        });
    });
});
