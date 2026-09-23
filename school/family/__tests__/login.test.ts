import assert from "node:assert/strict";
import { test } from "node:test";
import { emailOf, suggestedUsername } from "../login";

test("automatic usernames prefer a child's name and add readable collisions", () => {
    assert.equal(suggestedUsername("Alisa", "0000"), "alisa");
    assert.equal(suggestedUsername("Alisa", "0000", 1), "alisa-acorn");
    assert.equal(suggestedUsername("Alisa", "0000", 2), "alisa-acorn-2");
    assert.equal(suggestedUsername("Éloïse", "0000"), "eloise");
    assert.equal(suggestedUsername("Li", "0000"), "li-acorn");
    assert.equal(suggestedUsername("Li", "0000", 1), "li-acorn-2");
});

test("email sign-in accepts ordinary addresses without stripping mailbox distinctions", () => {
    for (const email of [
        "person@example.com",
        "first.last+school@sub.example.co.uk",
        "o'connor@example.com",
        "a@xn--bcher-kva.de",
        `${"a".repeat(64)}@example.com`,
    ]) {
        assert.equal(emailOf(email), email);
    }
    assert.equal(emailOf("  Parent+School@Example.COM  "), "parent+school@example.com");
});

test("email sign-in rejects malformed, unsafe and overlong addresses", () => {
    for (const email of [
        null,
        42,
        {},
        "",
        "person",
        "a@@example.com",
        ".a@example.com",
        "a.@example.com",
        "a..b@example.com",
        "a@-example.com",
        "a@example-.com",
        "a@example..com",
        "a@exam_ple.com",
        "a@example.com.",
        "a@localhost",
        "a b@example.com",
        "a\u0000@example.com",
        "a\r\nb@example.com",
        "Name <a@example.com>",
        `${"a".repeat(65)}@example.com`,
        `a@${"x".repeat(64)}.com`,
        `${"a".repeat(64)}@${Array(4).fill("b".repeat(63)).join(".")}`,
    ]) {
        assert.equal(emailOf(email), null, JSON.stringify(email));
    }
});
