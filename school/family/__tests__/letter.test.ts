import assert from "node:assert/strict";
import { test } from "node:test";
import { validWeek, weeklyLetter, weekEnding } from "../letter";
import type { Envelope, QuestionRef } from "../../../engine/answer";

test("reporting weeks follow the family's local day at the week boundary", () => {
    assert.equal(weekEnding("2026-09-21T00:30:00Z", "America/Toronto"), "2026-09-13");
    assert.equal(weekEnding("2026-09-21T12:00:00Z", "America/Toronto"), "2026-09-20");
    assert.equal(validWeek("2026-09-20"), true);
    assert.equal(validWeek("2026-09-21"), false);
    assert.equal(validWeek("2026-02-30"), false);
});

test("no recorded work does not claim no learning or invent achievements", () => {
    const letter = weeklyLetter({
        kids: [{ id: "kid", name: "Mira", grade: 1 }],
        events: [],
        lessons: [],
        zone: "UTC",
        to: "2026-09-20",
        now: "2026-09-21T08:00:00Z",
    });
    assert.equal(letter.useful, false);
    assert.equal(letter.children[0]?.sections.length, 1);
    assert.match(letter.children[0]?.sections[0]?.text ?? "", /No work was recorded/);
    assert.doesNotMatch(JSON.stringify(letter), /behind|mastered|right first|improved/);
});

test("recurring feedback counts distinct days and response requests disappear when answered", () => {
    const q: QuestionRef = {
        lesson: "bonds",
        lessonHash: "hash",
        section: "do",
        n: 1,
        item: "item",
        itemHash: "hash",
        variant: "v",
        ask: "How many?",
        skills: ["count"],
    };
    const answer = (
        id: string,
        day: string,
        right: boolean | null,
        rule: string | null,
    ): Envelope => ({
        id,
        family_id: "family",
        kid_id: "kid",
        actor: null,
        device: "device",
        seq: Number(id),
        at: `${day}T12:00:00Z`,
        kind: "answered",
        data: {
            sitting: id,
            q,
            given: { k: "number", text: "2" },
            timing: { k: "paper" },
            right,
            rule,
            tries: 1,
            hints: 0,
        },
    });
    const base = {
        kids: [{ id: "kid", name: "Mira", grade: 1 }],
        lessons: [],
        zone: "UTC",
        to: "2026-09-20",
        now: "2026-09-21T08:00:00Z",
    };
    const sameDay = [
        answer("1", "2026-09-14", false, "Count the spaces."),
        answer("2", "2026-09-14", false, "Count the spaces."),
    ];
    assert.ok(
        !weeklyLetter({ ...base, events: sameDay }).children[0]?.sections.some(
            (s) => s.heading === "Something to revisit",
        ),
    );
    const events = [
        ...sameDay,
        answer("3", "2026-09-15", false, "Count the spaces."),
        answer("4", "2026-09-16", null, null),
    ];
    const before = weeklyLetter({ ...base, events }).children[0]?.sections ?? [];
    assert.match(
        before.find((s) => s.heading === "Something to revisit")?.text ?? "",
        /2 different days/,
    );
    assert.match(
        before.find((s) => s.heading === "A little help from you")?.text ?? "",
        /1 piece is waiting/,
    );
    const responded: Envelope = {
        id: "5",
        family_id: "family",
        kid_id: "kid",
        actor: "adult",
        device: "device",
        seq: 5,
        at: "2026-09-17T12:00:00Z",
        kind: "responded",
        data: { q, answer: "4", sheet: null, noticed: [], note: "Looked together" },
    };
    assert.ok(
        !weeklyLetter({ ...base, events: [...events, responded] }).children[0]?.sections.some(
            (s) => s.heading === "A little help from you",
        ),
    );
});
