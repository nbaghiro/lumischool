import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import { addKid, at, Browser, local, sessionInto, startFamily, text } from "./browser";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

describe("family deletion", { skip: reason ?? false }, () => {
    const { config, outbox } = local();
    beforeEach(async () => {
        if (owner) await truncate(owner);
    });

    it("requires exact confirmation and deletes only this family, preserving cross-family browser access", async () => {
        assert.ok(owner);
        const parent = new Browser(config);
        const a = await startFamily(parent, outbox, {
            email: "delete@example.test",
            name: "Parent",
            family: "First",
        });
        const kid = await addKid(parent, "Maya", 1);
        const child = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [kid], tab: true },
        });
        const other = new Browser(config);
        const b = await startFamily(other, outbox, {
            email: "delete@example.test",
            name: "Parent",
            family: "Second",
        });
        other.jar.set("ls_browser", text(parent.jar.get("ls_browser")));
        await sessionInto(other, b.family, b.user);
        const otherKid = await addKid(other, "Theo", 1);
        const otherChild = await other.call("POST", "/api/kid-sessions", {
            body: { kids: [otherKid], tab: true },
        });
        const remove = (family: string, name: string) =>
            parent.call("POST", "/api/family/delete", { body: { family, name } });
        assert.equal((await remove(b.family, "Second")).status, 400);
        assert.equal((await remove(a.family, "wrong")).status, 400);
        assert.equal((await remove(a.family, "First")).status, 204);
        assert.equal((await parent.call("GET", "/api/me")).status, 401);
        assert.equal(
            (await parent.call("GET", "/api/kid", { kid: text(at(child.body, "credential")) }))
                .status,
            401,
        );
        assert.equal((await other.call("GET", "/api/me")).status, 200);
        assert.equal(
            (await other.call("GET", "/api/kid", { kid: text(at(otherChild.body, "credential")) }))
                .status,
            200,
        );
        const listed = await other.call("GET", "/api/kid-sessions");
        assert.equal(listed.status, 200);
        assert.equal(at(listed.body, "views", 0, "kid"), otherKid);
        for (const table of ["families", "kids", "members", "events", "keys", "content"]) {
            const column = table === "families" ? "id" : "family_id";
            const rows: { n: number }[] = await owner.raw.unsafe<{ n: number }[]>(
                `select count(*)::int as n from ${table} where ${column} = $1`,
                [a.family],
            );
            assert.equal(rows[0]?.n, 0, table);
        }
        const users = await owner.raw`select id from users where id = ${a.user}`;
        assert.equal(users.length, 1);
    });

    it("requires recent email authentication and rejects children", async () => {
        assert.ok(owner);
        const parent = new Browser(config);
        const a = await startFamily(parent, outbox, {
            email: "old@example.test",
            name: "Parent",
            family: "First",
        });
        const kid = await addKid(parent, "Maya", 1);
        const child = await parent.call("POST", "/api/kid-sessions", {
            body: { kids: [kid], tab: true },
        });
        const body = { family: a.family, name: "First" };
        assert.equal(
            (
                await parent.call("POST", "/api/family/delete", {
                    body,
                    kid: text(at(child.body, "credential")),
                })
            ).status,
            403,
        );
        await owner.raw`update keys set created_at = utc_iso(now() - interval '11 minutes') where family_id = ${a.family} and kind = 'session'`;
        const stale = await parent.call("POST", "/api/family/delete", { body });
        assert.equal(stale.status, 403);
        assert.equal(at(stale.body, "error"), "fresh-sign-in");
        assert.equal((await parent.call("GET", "/api/me")).status, 200);
    });
});
