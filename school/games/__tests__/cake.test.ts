// Cut the cake: every level can be cut fair, an unfair share is shown against the fair one, and a
// cut can be taken back before the cake is served.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { sizeOf } from "../../../engine/motion/cuts";
import { seeded } from "../../../engine/motion/spawn";
import {
    CAKE_LEVELS,
    cakeGame,
    cakeStart,
    cakeX,
    cutsNeeded,
    isFair,
    piecesNow,
    places,
    served,
    start as startCake,
    step as stepCake,
    type CakeState,
} from "../cake";

/** Steps the cake on until it is in a phase, since the step is what moves it there. */
function until(s: CakeState, phase: CakeState["phase"], most: number): void {
    for (let i = 0; i < most && s.phase !== phase; i++) stepCake(s, emptyPad());
}

/** A cake cut by a finger: hold over a place along it, let go, and let the knife come down. */
function cutAt(s: CakeState, along: number): void {
    const pad = emptyPad();
    pad.touch = { x: cakeX(s, along), y: 20 };
    stepCake(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    stepCake(s, pad);
    spent(pad);
    for (let i = 0; i < 20; i++) stepCake(s, emptyPad());
}

test("every cake level can be cut fair, a cut off by more than its distance is not, and cuts made at random are fair at most one time in five", () => {
    const rand = seeded(8128);
    for (const L of CAKE_LEVELS) {
        const n = cutsNeeded(L),
            share = L.share ?? L.whole / L.names.length;
        const right = Array.from({ length: n }, (_, i) => share * (i + 1));
        assert.ok(isFair(L, right), L.title);
        assert.ok(
            !isFair(
                L,
                right.map((c, i) => (i === 0 ? c + L.within + 0.05 : c)),
            ),
            `${L.title}: a cut too far along`,
        );
        assert.ok(!isFair(L, right.slice(1)), `${L.title}: too few cuts`);
        let hits = 0;
        const tries = 20000;
        for (let t = 0; t < tries; t++)
            if (
                isFair(
                    L,
                    Array.from({ length: n }, () => rand() * L.whole),
                )
            )
                hits++;
        assert.ok(hits / tries <= 0.2, `${L.title}: ${hits} of ${tries}`);
    }
});

test("an unfair share is shown against the fair one and the cake goes back together with its cuts kept faint, and a fair share wins with each piece before its child", () => {
    const s = startCake(0);
    cutAt(s, 6);
    until(s, "look", 60 * 3);
    assert.equal(s.phase, "look");
    assert.equal(
        cakeGame.frame(s).marks.filter((m) => m.kind === "box").length,
        2,
        "each piece is shown against its share",
    );
    until(s, "cut", 60 * 5);
    assert.deepEqual([s.phase, s.cuts, s.before, piecesNow(s).length], ["cut", [], [[6]], 1]);
    cutAt(s, 10);
    for (let i = 0; i < 60 * 3 && !s.won; i++) stepCake(s, emptyPad());
    assert.ok(s.won);
    const at = places(s.L);
    served(s.L, piecesNow(s)).forEach((p, i) =>
        assert.ok(
            Math.abs((s.lefts[i] ?? 0) + sizeOf(p) / 2 - (at[i] ?? 0)) < 0.2,
            `piece ${i} is in front of its child`,
        ),
    );
});

test("a cut on another cut cuts nothing, a finger in a gap is on the cut that opened it, and a cut can be taken back before the cake is served", () => {
    const s = startCake(2);
    cutAt(s, 6);
    const pad = emptyPad();
    pad.touch = { x: cakeStart(s.L) + 6.2, y: 20 };
    stepCake(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    stepCake(s, pad);
    spent(pad);
    assert.deepEqual(s.cuts, [6]);
    cutAt(s, 12);
    assert.deepEqual(s.cuts, [6, 12]);
    assert.ok(cakeGame.back?.(s));
    assert.deepEqual(s.cuts, [6]);
});

test("the same hands give the same cake", () => {
    const play = () => {
        const s = startCake(1);
        cutAt(s, 5);
        cutAt(s, 16);
        for (let i = 0; i < 60 * 6; i++) stepCake(s, emptyPad());
        cutAt(s, 7);
        cutAt(s, 14);
        for (let i = 0; i < 60 * 3; i++) stepCake(s, emptyPad());
        return JSON.stringify({
            cuts: s.cuts,
            before: s.before,
            lefts: s.lefts,
            phase: s.phase,
            won: s.won,
            steps: s.steps,
        });
    };
    assert.equal(play(), play());
});

test("under reduced motion a cake press moves the knife or cuts, and the serving is worked out to rest", () => {
    const s = startCake(0),
        pad = emptyPad();
    const press = () => {
        for (let i = 0; i < cakeGame.still.press(s); i++) {
            stepCake(s, pad);
            spent(pad);
        }
        let n = 0;
        while (cakeGame.still.settling?.(s) && n++ < 60 * 20) stepCake(s, emptyPad());
    };
    pad.pressed.push("right");
    press();
    assert.ok(Math.abs(s.knife.at - 10.25) < 1e-9);
    pad.pressed.push("left");
    press();
    pad.tapped = true;
    press();
    assert.ok(s.won, "a cut at the middle of the cake is fair");
    assert.ok(!cakeGame.still.settling?.(s));
});
