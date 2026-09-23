import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open } from "../db/client";
import { issueCode } from "../db/keys";
import { prepare, truncate } from "../db/__tests__/test-db";
import { app } from "../http";
import { Browser, local, ORIGIN, startFamily, sessionInto } from "./browser";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

describe("authentication hardening", { skip: reason ?? false }, () => {
    beforeEach(async () => {
        if (owner) await truncate(owner);
    });
    const issue = (ip: string | null = null) =>
        issueCode("sign-in", {
            hash: randomUUID(),
            email: `${randomUUID()}@example.test`,
            ip,
            accept: ["test"],
        });

    it("serializes network and global email budgets across distinct addresses", async () => {
        const network = await Promise.all(Array.from({ length: 30 }, () => issue("network")));
        assert.equal(network.filter(Boolean).length, 20);
        if (!owner) throw new Error("no database");
        await truncate(owner);
        await owner.raw`insert into keys (kind, hash, email) select 'sign-in', 'seed-' || n, 'seed-' || n || '@example.test' from generate_series(1, 499) n`;
        const global = await Promise.all(Array.from({ length: 12 }, () => issue()));
        assert.equal(global.filter(Boolean).length, 1);
    });

    it("allows bounded immediate delivery retries and invalidates failed challenges", async () => {
        const { config } = local();
        const browser = new Browser({
            ...config,
            send: async () => {
                throw new Error("transport down");
            },
        });
        for (let n = 0; n < 3; n++) {
            const answer = await browser.call("POST", "/api/auth/email/start", {
                body: { email: "retry@example.test", tab: true },
            });
            assert.equal(answer.status, 503);
            assert.deepEqual(answer.body, { error: "delivery-failed" });
        }
        assert.equal(
            (
                await browser.call("POST", "/api/auth/email/start", {
                    body: { email: "retry@example.test", tab: true },
                })
            ).status,
            429,
        );
        if (!owner) throw new Error("no database");
        const rows = await owner.raw<
            { detail: { accept: unknown } }[]
        >`select detail from keys where kind = 'sign-in'`;
        assert.equal(rows.length, 3);
        for (const row of rows) assert.deepEqual(row.detail.accept, []);
    });

    it("local requests ignore forwarded address headers", async () => {
        const { config } = local();
        const handle = app(config);
        for (let n = 0; n < 21; n++) {
            const res = await handle(
                new Request(`${ORIGIN}/api/auth/email/start`, {
                    method: "POST",
                    headers: {
                        origin: ORIGIN,
                        "content-type": "application/json",
                        "cf-connecting-ip": `198.51.100.${n}`,
                        "x-forwarded-for": `198.51.100.${n}`,
                    },
                    body: JSON.stringify({ email: `${randomUUID()}@example.test` }),
                }),
                "203.0.113.1",
            );
            assert.equal(res.status, n < 20 ? 202 : 429);
        }
    });

    it("Render ingress counts edge identities independently and never uses XFF or socket fallbacks", async () => {
        const { config } = local();
        const handle = app({ ...config, env: "production" });
        const post = (ip: string, forged: string) =>
            handle(
                new Request(`${ORIGIN}/api/auth/email/start`, {
                    method: "POST",
                    headers: {
                        origin: ORIGIN,
                        "content-type": "application/json",
                        "cf-connecting-ip": ip,
                        "x-forwarded-for": forged,
                    },
                    body: JSON.stringify({ email: `${randomUUID()}@example.test` }),
                }),
                "10.0.0.1",
            );
        for (let n = 0; n < 20; n++)
            assert.equal((await post("198.51.100.1", `203.0.113.${n}`)).status, 202);
        assert.equal((await post("198.51.100.1", "203.0.113.99")).status, 429);
        assert.equal((await post("198.51.100.2", "203.0.113.99")).status, 202);
        assert.equal((await post("2001:db8:1::1", "anything")).status, 202);
        assert.equal((await post("", "203.0.113.99")).status, 503);
        assert.equal((await post("198.51.100.3, 198.51.100.4", "203.0.113.99")).status, 503);
        if (!owner) throw new Error("no database");
        const rows = await owner.raw<
            { count: number }[]
        >`select count(*)::int as count from keys where kind = 'sign-in'`;
        assert.equal(rows[0]?.count, 22);
    });

    it("family-wide sign-out preserves the same parent's sessions in other families", async () => {
        const { config, outbox } = local();
        const a = new Browser(config),
            b = new Browser(config, "203.0.113.8");
        const one = await startFamily(a, outbox, {
            email: "one@example.test",
            name: "One",
            family: "One",
        });
        const two = await startFamily(b, outbox, {
            email: "two@example.test",
            name: "Two",
            family: "Two",
        });
        if (!owner) throw new Error("no database");
        await owner.raw`insert into members (family_id, user_id) values (${two.family}, ${one.user})`;
        await sessionInto(b, two.family, one.user);
        assert.equal(
            (await a.call("POST", "/api/auth/sign-out", { body: { everywhere: true } })).status,
            204,
        );
        assert.equal((await a.call("GET", "/api/me")).status, 401);
        assert.equal((await b.call("GET", "/api/me")).status, 200);
    });

    it("new security-definer helpers are not executable by PUBLIC", async () => {
        if (!owner) throw new Error("no database");
        const rows =
            await owner.raw`select p.proname from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.proname in ('kid_username_available', 'kid_login_succeeded', 'key_delivery_failed') and a.grantee = 0 and a.privilege_type = 'EXECUTE'`;
        assert.equal(rows.length, 0);
    });
});
