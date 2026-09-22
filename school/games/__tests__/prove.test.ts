// The prover, on ground small enough to work out by hand. It is checked here before any activity is
// put through it, because a prover that is wrong would pass every activity.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bind, type Activity } from "../games";
import { jump, type JumpVersion } from "../jump";
import { distance, explore, nudge, prove } from "../prove";

/** A line from 0 to 4 with one card of each of +1 and +2, landing on 3. Small enough to check by hand. */
const tiny: Activity<JumpVersion> = {
    id: "test.tiny",
    title: "Tiny",
    kind: "jump",
    skills: [],
    grades: [1, 1],
    paper: "none",
    versions: [
        { values: "tiny", v: { from: 0, to: 4, step: 1, start: 0, target: 3, cards: [1, 2] } },
    ],
};

test("the prover finds the shortest win, and counts the positions it looked at", () => {
    const r = bind(jump, tiny, 0);
    const ex = explore(r);
    // Four positions: on 0 holding both cards, on 1 holding +2, on 2 holding +1, and on 3 holding
    // nothing. Playing +1 then +2 and playing +2 then +1 arrive at the same last one.
    const p = prove(r, ex);
    assert.equal(p.shortest, 2, "1 then 2, or 2 then 1");
    // One winning position, not two: 1 then 2 and 2 then 1 both end on 3 with an empty hand, and
    // the key says that is the same position however the child got there.
    assert.equal(p.wins, 1);
    assert.equal(p.positions, 4);
});

test("a win the child cannot reach is reported rather than passed", () => {
    const r = bind(
        jump,
        {
            ...tiny,
            versions: [
                {
                    values: "unreachable",
                    v: { from: 0, to: 4, step: 1, start: 0, target: 4, cards: [1, 1] },
                },
            ],
        },
        0,
    );
    const p = prove(r);
    assert.equal(p.shortest, Infinity);
    assert.ok(
        p.problems.some((s) => s.includes("no sequence of legal moves")),
        p.problems.join("; "),
    );
});

test("a position that is already won is a failure, not a gift", () => {
    const r = bind(
        jump,
        {
            ...tiny,
            versions: [
                {
                    values: "already",
                    v: { from: 0, to: 4, step: 1, start: 2, target: 2, cards: [1] },
                },
            ],
        },
        0,
    );
    assert.ok(prove(r).problems.some((s) => s.includes("already won")));
});

test("luck is the exact chance of random play winning, worked out the same way by hand", () => {
    // From 0 with +1 and +2 on a line of 0 to 4, every first move is legal, so play is: pick one of
    // two cards, then the other. Both orders land on 3, so random play always wins.
    const r = bind(jump, tiny, 0);
    assert.equal(prove(r).luck, 1);
    // Adding a card that ruins the total gives random play something to get wrong.
    const wider = bind(
        jump,
        {
            ...tiny,
            versions: [
                {
                    values: "three cards",
                    v: { from: 0, to: 9, step: 1, start: 0, target: 3, cards: [1, 2, 4] },
                },
            ],
        },
        0,
    );
    const p = prove(wider);
    assert.ok(p.luck > 0 && p.luck < 1, `luck ${p.luck}`);
    // 3 first moves; 1 then 2, or 2 then 1, are the two of six orderings that reach 3 in two moves.
    assert.equal(Number(p.luck.toFixed(4)), Number((2 / 6).toFixed(4)));
});

test("a dead end is a position with moves left and no win, which is not the same as losing", () => {
    // From 0 on a line of 0 to 9, landing on 3, holding +4 and +1 and +1: playing +4 first leaves
    // 4, 5 and 6 reachable and 3 gone, with moves still available.
    const r = bind(
        jump,
        {
            ...tiny,
            versions: [
                {
                    values: "overshoot",
                    v: { from: 0, to: 9, step: 1, start: 0, target: 3, cards: [4, 1, 1] },
                },
            ],
        },
        0,
    );
    const p = prove(r);
    assert.ok(p.deadEnds > 0, "overshooting is a dead end");
    assert.ok(p.deadEndsRecoverable, "and the jump mechanic lets the child back out of it");
    assert.ok(!p.problems.some((s) => s.includes("no win left")), "so it is reported, not refused");
});

test("the nudge points at a move that gets closer, and only when one exists", () => {
    const r = bind(jump, tiny, 0);
    const ex = explore(r);
    const i = nudge(ex, r.start);
    assert.ok(i !== null);
    const closer = r.start.moves[i];
    assert.ok(closer);
    const after = closer.next();
    assert.equal(distance(ex, after), distance(ex, r.start) - 1);
    const last = after.moves[0];
    assert.ok(last);
    const won = last.next();
    assert.equal(won.won, true);
    assert.equal(nudge(ex, won), null, "there is nothing to point at once it is won");
});
