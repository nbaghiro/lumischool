import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { readUnsubscribe, unsubscribeToken, verifiedWebhook } from "../letters";
import { mailPreviews } from "../mail-previews";
import { weeklyMail } from "../mail-design";

test("unsubscribe is bound to a family and parent and cannot be forged", () => {
    const family = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        user = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const token = unsubscribeToken(family, user, "secret");
    assert.deepEqual(readUnsubscribe(token, "secret"), { family, user });
    assert.equal(readUnsubscribe(token, "another"), null);
    assert.equal(readUnsubscribe(token.replace(family, user), "secret"), null);
    assert.equal(readUnsubscribe("bad", "secret"), null);
});

test("webhook signatures cover the exact body and reject stale events", () => {
    const raw = '{"type":"email.delivered"}',
        now = 1800000000000;
    const secret = Buffer.from("a signing secret").toString("base64");
    const stamp = String(now / 1000);
    const sig = createHmac("sha256", Buffer.from(secret, "base64"))
        .update(`evt.${stamp}.${raw}`)
        .digest("base64");
    const headers = new Headers({
        "svix-id": "evt",
        "svix-timestamp": stamp,
        "svix-signature": `v1,${sig}`,
    });
    assert.equal(verifiedWebhook(raw, headers, `whsec_${secret}`, now), true);
    assert.equal(verifiedWebhook(`${raw} `, headers, secret, now), false);
    assert.equal(verifiedWebhook(raw, headers, secret, now + 301000), false);
});

test("private email carries no child details and detailed HTML escapes content", () => {
    const letter = {
        from: "2026-09-14",
        to: "2026-09-20",
        generated: "2026-09-21T08:00:00Z",
        useful: true,
        children: [
            {
                id: "kid",
                name: '<img src=x onerror="alert(1)">',
                sections: [{ heading: "This week", text: "Distinctive private learning evidence" }],
            },
        ],
    };
    const privateMail = weeklyMail(
        letter,
        "https://example.com",
        false,
        "https://example.com/stop",
    );
    assert.doesNotMatch(privateMail.text + privateMail.html, /Distinctive|onerror/);
    const detailed = weeklyMail(letter, "https://example.com", true, "https://example.com/stop");
    assert.match(detailed.html, /&lt;img/);
    assert.doesNotMatch(detailed.html, /<img src=x/);
    assert.match(detailed.text, /Distinctive/);
});

test("every preview has usable text and HTML without scripts or scratchpad dependencies", () => {
    const previews = mailPreviews("https://example.com");
    assert.equal(previews.length, 13);
    for (const mail of previews) {
        assert.ok(mail.text.length > 60);
        assert.match(mail.html ?? "", /<html lang="en">/);
        assert.doesNotMatch(mail.html ?? "", /<script|\.scratchpad|localhost/);
    }
});
