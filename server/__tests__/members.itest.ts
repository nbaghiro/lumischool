import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prepare } from "../db/__tests__/test-db";
import { closeApp, open } from "../db/client";
import { Browser, local, startFamily, at, text, codeFor, addKid } from "./browser";
import type { Email } from "../email";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

function tokenFor(outbox: Email[], email: string): string {
    const mail = outbox.filter((m) => m.to === email && m.text.includes("/join#")).at(-1);
    const match = mail?.text.match(/\/join#t=([^\s]+)/);
    assert.ok(match?.[1], "an invitation link was sent");
    return decodeURIComponent(match[1]);
}
async function ask(b: Browser, outbox: Email[], email: string): Promise<string> {
    assert.equal((await b.call("POST", "/api/auth/email/start", { body: { email } })).status, 202);
    return codeFor(outbox, email);
}
test(
    "invited new parents join the existing family, share PINs, and removal preserves child sign-in",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const first = new Browser(config);
        const original = await startFamily(first, outbox, {
            email: "first@members.test",
            name: "First",
            family: "Together",
        });
        const child = await addKid(first, "Robin", 1);
        assert.equal(
            (await first.call("POST", "/api/family/pin", { body: { pin: "1357" } })).status,
            204,
        );
        assert.equal(
            (await first.call("POST", "/api/kid-logins/pin", { body: { pin: "2468" } })).status,
            204,
        );
        const logins = await first.call("GET", "/api/kid-logins");
        const username = text(at(logins.body, "kids", 0, "username"));
        assert.equal(
            (
                await first.call("POST", "/api/members/invite", {
                    body: { email: "second@members.test" },
                })
            ).status,
            200,
        );
        const token = tokenFor(outbox, "second@members.test");
        const second = new Browser(config);
        assert.equal(
            (await second.call("POST", "/api/invitations/preview", { body: { token } })).status,
            200,
        );
        const code = await ask(second, outbox, "second@members.test");
        const joined = await second.call("POST", "/api/auth/email/invitation/accept", {
            body: { token, code, name: "Second" },
        });
        assert.equal(joined.status, 200, JSON.stringify(joined.body));
        assert.equal(at(joined.body, "me", "family", "id"), original.family);
        const secondId = text(at(joined.body, "me", "user", "id"));
        assert.equal((await second.call("GET", "/api/family")).status, 200);
        assert.equal(
            (
                await second.call("POST", "/api/auth/email/invitation/accept", {
                    body: { token, code, name: "Second" },
                })
            ).status,
            400,
        );
        assert.equal((await first.call("GET", "/api/members")).status, 200);
        assert.equal(
            (await first.call("POST", "/api/members/remove", { body: { user: secondId } })).status,
            200,
        );
        assert.equal((await second.call("GET", "/api/me")).status, 401);
        // Rejoin under a new invitation, then remove the PIN's original setter.
        assert.ok(owner);
        await owner.raw`update keys set created_at = '2020-01-01T00:00:00.000Z' where email = 'second@members.test'`;
        assert.equal(
            (
                await first.call("POST", "/api/members/invite", {
                    body: { email: "second@members.test" },
                })
            ).status,
            200,
        );
        const next = tokenFor(outbox, "second@members.test");
        const nextCode = await ask(second, outbox, "second@members.test");
        assert.equal(
            (
                await second.call("POST", "/api/auth/email/invitation/accept", {
                    body: { token: next, code: nextCode, name: "Second" },
                })
            ).status,
            200,
        );
        assert.equal(
            (await second.call("POST", "/api/members/remove", { body: { user: original.user } }))
                .status,
            200,
        );
        assert.equal((await first.call("GET", "/api/me")).status, 401);
        const kid = new Browser(config);
        const kidIn = await kid.call("POST", "/api/kid/sign-in", {
            body: { username, pin: "2468" },
        });
        assert.equal(kidIn.status, 200, JSON.stringify(kidIn.body));
        assert.ok(child);
        assert.equal(
            (await second.call("POST", "/api/members/remove", { body: { user: secondId } })).status,
            400,
        );
        assert.equal((await second.call("POST", "/api/auth/lock")).status, 204);
        assert.equal(
            (await second.call("POST", "/api/auth/unlock", { body: { pin: "1357" } })).status,
            204,
        );
    },
);

test(
    "invitations require fresh parent access, recipient proof, live tokens, and bounded sends",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        const who = await startFamily(parent, outbox, {
            email: "guards@members.test",
            name: "Parent",
            family: "Guards",
        });
        const guest = new Browser(config);
        assert.equal((await guest.call("GET", "/api/members")).status, 401);
        assert.equal(
            (await parent.call("POST", "/api/members/invite", { body: { email: "bad" } })).status,
            400,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "guards@members.test" },
                })
            ).status,
            400,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "invited@members.test" },
                })
            ).status,
            200,
        );
        const token = tokenFor(outbox, "invited@members.test");
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "invited@members.test" },
                })
            ).status,
            429,
        );
        const wrong = await ask(guest, outbox, "wrong@members.test");
        assert.equal(
            (
                await guest.call("POST", "/api/auth/email/invitation/accept", {
                    body: { token, code: wrong, name: "Wrong" },
                })
            ).status,
            400,
        );
        const listing = await parent.call("GET", "/api/members");
        const id = text(at(listing.body, "invitations", 0, "id"));
        assert.equal(
            (await parent.call("POST", "/api/members/cancel", { body: { id } })).status,
            200,
        );
        assert.equal(
            (await guest.call("POST", "/api/invitations/preview", { body: { token } })).status,
            404,
        );
        assert.ok(owner);
        await owner.raw`update keys set created_at = ${new Date(Date.now() - 11 * 60000).toISOString()} where id = ${who.session}::uuid`;
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "fresh@members.test" },
                })
            ).status,
            403,
        );
    },
);

test(
    "failed invitation delivery leaves no usable invitation",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        await startFamily(parent, outbox, {
            email: "failure@members.test",
            name: "Parent",
            family: "Failure",
        });
        config.send = async () => {
            throw new Error("transport down");
        };
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "unreached@members.test" },
                })
            ).status,
            503,
        );
        const listing = await parent.call("GET", "/api/members");
        assert.deepEqual(at(listing.body, "invitations"), []);
    },
);

test(
    "existing accounts keep other families; concurrent removals cannot orphan the family",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const a = new Browser(config, "198.51.100.11");
        const b = new Browser(config, "198.51.100.12");
        const aWho = await startFamily(a, outbox, {
            email: "a@concurrent.test",
            name: "A",
            family: "Shared",
        });
        const bWho = await startFamily(b, outbox, {
            email: "b@concurrent.test",
            name: "B",
            family: "Original",
        });
        const oldB = new Browser(config, "198.51.100.12");
        for (const [k, v] of b.jar) oldB.jar.set(k, v);
        b.jar.clear();
        assert.ok(owner);
        await owner.raw`update keys set created_at = '2020-01-01T00:00:00.000Z' where email = 'b@concurrent.test'`;
        assert.equal(
            (await a.call("POST", "/api/members/invite", { body: { email: "b@concurrent.test" } }))
                .status,
            200,
        );
        const token = tokenFor(outbox, "b@concurrent.test");
        const code = await ask(b, outbox, "b@concurrent.test");
        const joined = await b.call("POST", "/api/auth/email/invitation/accept", {
            body: { token, code, name: "B" },
        });
        assert.equal(joined.status, 200);
        assert.equal(at(joined.body, "me", "user", "id"), bWho.user);
        assert.equal(at(joined.body, "me", "families") instanceof Array, true);
        // Invites from another family cannot be cancelled through this family's management endpoint.
        assert.equal(
            (await oldB.call("POST", "/api/members/cancel", { body: { id: token.split(".")[1] } }))
                .status,
            404,
        );
        const results = await Promise.all([
            a.call("POST", "/api/members/remove", { body: { user: bWho.user } }),
            b.call("POST", "/api/members/remove", { body: { user: aWho.user } }),
        ]);
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.ok(results.some((r) => r.status === 403 || r.status === 401));
        assert.equal((await oldB.call("GET", "/api/me")).status, 200);
    },
);

test(
    "expired invites, CSRF and removed inviters cannot grant access; definer grants are narrow",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config, "198.51.100.20");
        await startFamily(parent, outbox, {
            email: "expire@members.test",
            name: "Parent",
            family: "Expiry",
        });
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "csrf@members.test" },
                    origin: "https://attacker.test",
                })
            ).status,
            403,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/members/invite", {
                    body: { email: "expired@members.test" },
                })
            ).status,
            200,
        );
        const token = tokenFor(outbox, "expired@members.test");
        const id = token.split(".")[1];
        assert.ok(id);
        assert.ok(owner);
        await owner.raw`update keys set created_at = '2020-01-01T00:00:00.000Z' where id = ${id}::uuid`;
        const guest = new Browser(config);
        assert.equal(
            (await guest.call("POST", "/api/invitations/preview", { body: { token } })).status,
            404,
        );
        assert.ok(owner);
        const grants =
            await owner.raw`select p.proname from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.proname = 'reserve_invitation' and a.grantee = 0 and a.privilege_type = 'EXECUTE'`;
        assert.equal(grants.length, 0);
    },
);
