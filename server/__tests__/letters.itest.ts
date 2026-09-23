import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { PACK } from "../../engine/pack";
import { closeApp, open, withFamily } from "../db/client";
import {
    claimMail,
    deliveryEvent,
    finishMail,
    preference,
    queueMail,
    setPreference,
} from "../db/mail";
import { mailDeliveries, mailPreferences } from "../db/schema";
import { prepare } from "../db/__tests__/test-db";
import { Browser, local, startFamily } from "./browser";
import { unsubscribeRequest, unsubscribeToken } from "../letters";

const reason = await prepare();
const owner = reason === null ? open() : null;
after(async () => {
    await closeApp();
    await owner?.close();
});

describe("weekly mail through family-scoped storage", { skip: reason ?? false }, () => {
    it("defaults off, protects the API, isolates rows and cancels queued mail when preferences change", async () => {
        const { config, outbox } = local();
        config.pack = { digest: "test", index: { pack: PACK, lessons: [] }, file: () => null };
        const browser = new Browser(config);
        const who = await startFamily(browser, outbox, {
            email: "weekly@example.test",
            name: "Parent",
            family: "Weekly",
        });
        const scope = { family: who.family, user: who.user };
        assert.equal(await withFamily(scope, (tx) => preference(tx, who.family, who.user)), "off");
        assert.equal((await browser.call("GET", "/api/letters")).status, 200);
        assert.equal((await new Browser(config).call("GET", "/api/letters")).status, 401);
        assert.equal(
            (await browser.call("POST", "/api/letters/preferences", { body: { mode: "detailed" } }))
                .status,
            200,
        );
        const now = "2026-09-21T12:00:00.000Z";
        const row = {
            family_id: who.family,
            user_id: who.user,
            week: "2026-09-20",
            recipient: "weekly@example.test",
            mode: "detailed" as const,
            subject: "Weekly",
            body_text: "Private work",
            body_html: "<p>Private work</p>",
            created_at: now,
        };
        await withFamily(scope, async (tx) => {
            await queueMail(tx, row);
            await queueMail(tx, row);
        });
        const [a, b] = await Promise.all([
            withFamily(scope, (tx) => claimMail(tx, who.family, who.user, now)),
            withFamily(scope, (tx) => claimMail(tx, who.family, who.user, now)),
        ]);
        assert.equal([a, b].filter(Boolean).length, 1);
        const claimed = a ?? b;
        assert.ok(claimed);
        assert.equal(
            await withFamily(scope, (tx) => claimMail(tx, who.family, who.user, now)),
            null,
        );
        const hidden = await withFamily({ family: null }, (tx) => tx.select().from(mailDeliveries));
        assert.equal(hidden.length, 0);
        await withFamily(scope, (tx) => setPreference(tx, who.family, who.user, "private"));
        assert.equal(
            await withFamily(scope, (tx) =>
                claimMail(tx, who.family, who.user, "2026-09-21T13:00:00.000Z"),
            ),
            null,
        );
        const cancelled = await withFamily(scope, (tx) => tx.select().from(mailDeliveries));
        assert.equal(cancelled[0]?.body_text, "");
        const token = unsubscribeToken(who.family, who.user, config.pepper);
        const url = `http://localhost:8500/api/letters/unsubscribe?token=${token}`;
        await unsubscribeRequest(new Request(url), config.pepper);
        assert.equal(
            await withFamily(scope, (tx) => preference(tx, who.family, who.user)),
            "private",
            "email scanners cannot unsubscribe with GET",
        );
        await unsubscribeRequest(new Request(url, { method: "POST" }), config.pepper);
        assert.equal(await withFamily(scope, (tx) => preference(tx, who.family, who.user)), "off");
        const unseen = await withFamily({ family: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, (tx) =>
            tx.select().from(mailPreferences),
        );
        assert.equal(unseen.length, 0);
    });

    it("preserves retry identity, stops at key expiry and suppresses on a provider complaint", async () => {
        const { config, outbox } = local();
        const browser = new Browser(config);
        const who = await startFamily(browser, outbox, {
            email: "retry@example.test",
            name: "Parent",
            family: "Retry",
        });
        const scope = { family: who.family, user: who.user };
        const now = "2026-09-21T12:00:00.000Z";
        await withFamily(scope, async (tx) => {
            await setPreference(tx, who.family, who.user, "private");
            await queueMail(tx, {
                family_id: who.family,
                user_id: who.user,
                week: "2026-09-20",
                recipient: "retry@example.test",
                mode: "private",
                subject: "Weekly",
                body_text: "text",
                body_html: "html",
                created_at: now,
            });
        });
        const first = await withFamily(scope, (tx) => claimMail(tx, who.family, who.user, now));
        assert.ok(first);
        const second = await withFamily(scope, (tx) =>
            claimMail(tx, who.family, who.user, "2026-09-21T12:05:00.000Z"),
        );
        assert.equal(second?.id, first.id);
        assert.equal(second?.body_html, first.body_html);
        assert.equal(
            await withFamily(scope, (tx) =>
                claimMail(tx, who.family, who.user, "2026-09-22T12:00:00.000Z"),
            ),
            null,
        );
        await withFamily(scope, async (tx) => {
            await queueMail(tx, {
                family_id: who.family,
                user_id: who.user,
                week: "2026-09-27",
                recipient: "retry@example.test",
                mode: "private",
                subject: "Weekly",
                body_text: "text",
                body_html: "html",
                created_at: "2026-09-28T12:00:00.000Z",
            });
            const third = await claimMail(tx, who.family, who.user, "2026-09-28T12:00:00.000Z");
            assert.ok(third);
            await finishMail(tx, third.id, "sent", "provider-message");
            await deliveryEvent(tx, "provider-message", "suppressed");
            await deliveryEvent(tx, "provider-message", "delivered");
            assert.equal(await preference(tx, who.family, who.user), "off");
            const stored = await tx.select().from(mailDeliveries);
            assert.equal(stored.find((row) => row.id === third.id)?.status, "suppressed");
        });
    });
});
