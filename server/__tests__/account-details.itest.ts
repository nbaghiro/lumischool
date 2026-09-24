import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prepare } from "../db/__tests__/test-db";
import { closeApp, open } from "../db/client";
import { Browser, local, startFamily, at, text, codeFor, signIn } from "./browser";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

test(
    "account fields persist and reject invalid or cross-family changes",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        const started = await startFamily(parent, outbox, {
            email: "details@account.test",
            name: "First",
            family: "Original",
        });
        for (const [field, value] of [
            ["name", "New name"],
            ["family", "New family"],
            ["time_zone", "Pacific/Auckland"],
        ]) {
            assert.equal(
                (
                    await parent.call("POST", "/api/me/details", {
                        body: { family: started.family, field, value },
                    })
                ).status,
                204,
            );
        }
        const me = (await parent.call("GET", "/api/me")).body;
        assert.equal(at(me, "user", "name"), "New name");
        assert.equal(at(me, "family", "name"), "New family");
        assert.equal(at(me, "family", "time_zone"), "Pacific/Auckland");
        for (const [field, value] of [
            ["name", " "],
            ["time_zone", "not/a-zone"],
            ["email", "bypass@account.test"],
        ]) {
            assert.equal(
                (
                    await parent.call("POST", "/api/me/details", {
                        body: { family: started.family, field, value },
                    })
                ).status,
                400,
            );
        }
        assert.equal(
            (
                await parent.call("POST", "/api/me/details", {
                    body: { family: "other", field: "family", value: "Wrong" },
                })
            ).status,
            400,
        );
        assert.equal(
            (
                await new Browser(config).call("POST", "/api/me/details", {
                    body: { family: started.family, field: "name", value: "Wrong" },
                })
            ).status,
            401,
        );
    },
);

test(
    "email changes require a single-use code bound to the requesting account and session",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        const started = await startFamily(parent, outbox, {
            email: "old@account.test",
            name: "Parent",
            family: "Kept",
        });
        const stranger = new Browser(config);
        await startFamily(stranger, outbox, {
            email: "taken@account.test",
            name: "Other",
            family: "Other",
        });
        assert.equal(
            (await parent.call("POST", "/api/me/email/start", { body: { email: "invalid" } }))
                .status,
            400,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/me/email/start", {
                    body: { email: "taken@account.test" },
                })
            ).status,
            400,
        );
        const asked = await parent.call("POST", "/api/me/email/start", {
            body: { email: " New@Account.test " },
        });
        assert.equal(asked.status, 202);
        const challenge = text(at(asked.body, "challenge"));
        const code = codeFor(outbox, "new@account.test");
        assert.equal(
            at((await parent.call("GET", "/api/me")).body, "user", "email"),
            "old@account.test",
        );
        assert.equal(
            (await stranger.call("POST", "/api/me/email/confirm", { body: { challenge, code } }))
                .status,
            403,
        );
        assert.equal(
            (await parent.call("POST", "/api/me/email/confirm", { body: { challenge, code } }))
                .status,
            204,
        );
        assert.equal(
            (await parent.call("POST", "/api/me/email/confirm", { body: { challenge, code } }))
                .status,
            400,
        );
        const me = (await parent.call("GET", "/api/me")).body;
        assert.equal(at(me, "user", "email"), "new@account.test");
        assert.equal(at(me, "user", "id"), started.user);
        assert.equal(at(me, "family", "id"), started.family);
        const loggedIn = await signIn(new Browser(config), outbox, "new@account.test");
        assert.equal(at(loggedIn.body, "me", "user", "id"), started.user);
    },
);

test(
    "old-address pending codes cannot open the account after its email changes",
    { skip: reason ?? false },
    async () => {
        const { config, outbox } = local();
        const parent = new Browser(config);
        await startFamily(parent, outbox, {
            email: "before@account.test",
            name: "Before",
            family: "Email change",
        });
        const oldBrowser = new Browser(config);
        const oldAsked = await oldBrowser.call("POST", "/api/auth/email/start", {
            body: { email: "before@account.test", tab: true },
        });
        assert.equal(oldAsked.status, 202);
        const oldChallenge = text(at(oldAsked.body, "challenge"));
        const oldCode = codeFor(outbox, "before@account.test");
        const asked = await parent.call("POST", "/api/me/email/start", {
            body: { email: "after@account.test" },
        });
        const challenge = text(at(asked.body, "challenge"));
        const code = codeFor(outbox, "after@account.test");
        assert.equal(
            (await oldBrowser.call("POST", "/api/auth/email/verify", { challenge, body: { code } }))
                .status,
            400,
        );
        assert.equal(
            (
                await parent.call("POST", "/api/me/email/confirm", {
                    body: { challenge, code: code === "00000000" ? "11111111" : "00000000" },
                })
            ).status,
            400,
        );
        assert.equal(
            (await parent.call("POST", "/api/me/email/confirm", { body: { challenge, code } }))
                .status,
            204,
        );
        // The old address can start a separate account, but cannot retrieve this account's families.
        const oldResult = await oldBrowser.call("POST", "/api/auth/email/verify", {
            challenge: oldChallenge,
            body: { code: oldCode },
        });
        assert.equal(at(oldResult.body, "start"), true);
        assert.notEqual(at(oldResult.body, "me", "user", "email"), "after@account.test");
        assert.equal((await oldBrowser.call("GET", "/api/me")).status, 401);
    },
);
