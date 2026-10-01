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
    /** The network each sign-in code was asked from, as stored, oldest first. */
    const networks = async (): Promise<(string | null)[]> => {
        if (!owner) throw new Error("no database");
        const rows = await owner.raw<
            { ip: string | null }[]
        >`select ip from keys where kind = 'sign-in' order by created_at, id`;
        return rows.map((r) => r.ip);
    };

    it("issues a code each time one is asked for, from any network", async () => {
        const asked = await Promise.all(
            Array.from({ length: 30 }, () =>
                issueCode("sign-in", {
                    hash: randomUUID(),
                    email: "same@example.test",
                    ip: "network",
                    accept: ["test"],
                }),
            ),
        );
        assert.equal(asked.length, 30);
        assert.equal((await networks()).length, 30);
    });

    it("lets delivery be tried again and invalidates every failed challenge", async () => {
        const { config } = local();
        const browser = new Browser({
            ...config,
            send: async () => {
                throw new Error("transport down");
            },
        });
        for (let n = 0; n < 4; n++) {
            const answer = await browser.call("POST", "/api/auth/email/start", {
                body: { email: "retry@example.test", tab: true },
            });
            assert.equal(answer.status, 503);
            assert.deepEqual(answer.body, { error: "delivery-failed" });
        }
        if (!owner) throw new Error("no database");
        const rows = await owner.raw<
            { detail: { accept: unknown } }[]
        >`select detail from keys where kind = 'sign-in'`;
        assert.equal(rows.length, 4);
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
            assert.equal(res.status, 202);
        }
        // every code is put down to the socket's address, whatever the headers claimed
        assert.equal(new Set(await networks()).size, 1);
    });

    it("Render ingress takes the edge identity and never XFF or the socket", async () => {
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
        for (let n = 0; n < 3; n++)
            assert.equal((await post("198.51.100.1", `203.0.113.${n}`)).status, 202);
        assert.equal((await post("198.51.100.2", "203.0.113.0")).status, 202);
        assert.equal((await post("2001:db8:1::1", "anything")).status, 202);
        assert.equal((await post("", "203.0.113.99")).status, 503);
        assert.equal((await post("198.51.100.3, 198.51.100.4", "203.0.113.99")).status, 503);
        const ips = await networks();
        assert.equal(ips.length, 5);
        // the three asked from one edge identity share it, whatever the forwarded header said
        assert.equal(new Set(ips.slice(0, 3)).size, 1);
        assert.equal(new Set(ips).size, 3);
    });

    it("sign-out preserves the same parent's sessions in other families", async () => {
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
        assert.equal((await a.call("POST", "/api/auth/sign-out", { body: {} })).status, 204);
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
