import assert from "node:assert/strict";
import { test } from "node:test";
import { emailOf, suggestedUsername, USERNAME_WORD_COUNT, usernameOf } from "../login";

test("automatic usernames prefer a child's name and add readable collisions", () => {
    assert.equal(suggestedUsername("Alisa", 0), "alisa");
    assert.equal(suggestedUsername("Alisa", 0, 1), "alisa-acorn");
    assert.equal(suggestedUsername("Alisa", 0, 2), "alisa-badger");
    assert.equal(suggestedUsername("Éloïse", 0), "eloise");
    assert.equal(suggestedUsername("Li", 0), "li-acorn");
    assert.equal(suggestedUsername("Li", 0, 1), "li-badger");
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

test("automatic usernames exhaust friendly words before adding numbers", () => {
    const candidates = Array.from({ length: 14 }, (_, n) => suggestedUsername("Alisa", 0, n + 1));
    assert.equal(new Set(candidates).size, 14);
    assert.ok(candidates.every((name) => !/[0-9]/.test(name)));
    assert.equal(suggestedUsername("Alisa", 0, 15), "alisa-acorn-2");
});

test("every starting word preserves a full cycle of memorable names, including short names", () => {
    for (let start = 0; start < USERNAME_WORD_COUNT; start++) {
        for (const name of ["Alisa", "Li", "李"]) {
            const first = name === "Li" ? 0 : 1;
            const choices = Array.from({ length: USERNAME_WORD_COUNT }, (_, n) =>
                suggestedUsername(name, start, first + n),
            );
            assert.equal(new Set(choices).size, USERNAME_WORD_COUNT);
            assert.ok(
                choices.every((choice) => usernameOf(choice) === choice && !/\d/.test(choice)),
            );
        }
    }
});
