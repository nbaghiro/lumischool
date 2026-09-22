import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Failure } from "../wire";
import { failureText } from "../failure";

const said = (f: Failure, local = false): string => failureText(f, local);

describe("what went wrong, in words", () => {
    it("says how many tries a code has left, and nothing about tries it cannot know", () => {
        assert.match(said({ error: "wrong-code", status: 400, attemptsLeft: 3 }), /3 more tries/);
        assert.match(said({ error: "wrong-code", status: 400, attemptsLeft: 1 }), /one more try/);
        assert.doesNotMatch(said({ error: "wrong-code", status: 400 }), /tries|try with/);
    });

    it("tells a dead code and a code that ran out apart, and asks for a new one for each", () => {
        assert.match(said({ error: "dead-code", status: 410 }), /five wrong tries.*new one/);
        assert.match(said({ error: "expired", status: 410 }), /run out.*new one/);
    });

    it("says when to try again after a limit, from the wait the API gave", () => {
        assert.match(said({ error: "rate-limited", status: 429, retryAfter: 60 }), /in a minute/);
        assert.match(
            said({ error: "rate-limited", status: 429, retryAfter: 900 }),
            /in 15 minutes/,
        );
        assert.match(said({ error: "rate-limited", status: 429, retryAfter: 3600 }), /later/);
    });

    it("names the missing server on a developer's computer, and the connection anywhere else", () => {
        assert.match(said({ error: "offline", status: 0 }, true), /npm run dev/);
        assert.match(said({ error: "offline", status: 0 }, false), /connection/);
    });

    it("has words for every failure, with no em-dash or exclamation mark in any of them", () => {
        const all: Failure["error"][] = [
            "bad-request",
            "bad-email",
            "no-pending",
            "wrong-code",
            "bad-envelope",
            "signed-out",
            "origin",
            "not-allowed",
            "fresh-sign-in",
            "not-found",
            "no-consent",
            "notice-changed",
            "expired",
            "dead-code",
            "no-kid-session",
            "wrong-pin",
            "no-pin",
            "too-large",
            "not-json",
            "rate-limited",
            "server",
            "offline",
        ];
        for (const error of all)
            for (const local of [true, false]) {
                const text = said({ error, status: 400 }, local);
                assert.ok(text.length > 10, error);
                assert.doesNotMatch(text, /—|!/, error);
            }
    });
});
