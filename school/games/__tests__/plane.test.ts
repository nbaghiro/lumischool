// The paper plane: the hoop at the flag's height counts and no other, a flag missed comes round
// again, and the same presses fly the same path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import {
    COURSE,
    PLANE,
    PLANE_LEVELS,
    heightOf,
    planeGame,
    start as startPlane,
    step as stepPlane,
    type PlaneState,
} from "../plane";

/** Flies a plane level at a height until it has passed the hoops of gate `k`. */
function flyThrough(s: PlaneState, k: number, y: number): Happenings2 {
    const hx = COURSE.pad + COURSE.first + k * COURSE.every + COURSE.hoop,
        heard: Happenings2 = [];
    s.plane = { x: hx - 1.2, y, vx: PLANE.cruise.value, vy: 0 };
    const pad = emptyPad();
    for (let i = 0; i < 30; i++) {
        heard.push(...stepPlane(s, pad));
        spent(pad);
    }
    return heard;
}
type Happenings2 = ReturnType<typeof stepPlane>;

test("the hoop at the flag's height counts, a hoop at another height never does, and every flag done wins the round", () => {
    for (const [level, L] of PLANE_LEVELS.entries()) {
        const s = startPlane(level);
        const g0 = L.gates[0],
            wrong = g0?.hoops.find((h) => h !== g0.target) ?? 0;
        const heard = flyThrough(s, 0, heightOf(L, wrong));
        assert.ok(
            !s.done[0] && heard.some((h) => "cue" in h && h.cue === "nope"),
            `${L.title}: the wrong hoop counted`,
        );
        assert.match(s.said, /That hoop is at .*\. The flag says .*\./);
        for (const [k, gate] of L.gates.entries()) {
            const out = flyThrough(s, k, heightOf(L, gate.target));
            assert.ok(
                s.done[k] && out.some((h) => "cue" in h && (h.cue === "ring" || h.cue === "win")),
                `${L.title}: flag ${gate.flag} did not count`,
            );
        }
        assert.ok(s.won, L.title);
    }
});

test("every flag is a mark on its pole, and every hoop hangs between the grass and the top of the sky", () => {
    const value = (t: string): number => {
        const m = /^(\d+)\/(\d+)$/.exec(t);
        return m ? Number(m[1]) / Number(m[2]) : Number(t);
    };
    for (const L of PLANE_LEVELS) {
        assert.equal(L.labels.length, L.ticks + 1, `${L.title}: a label for every mark`);
        const top = value(L.words(L.ticks));
        for (const gate of L.gates) {
            assert.ok(gate.hoops.includes(gate.target), `${L.title}: ${gate.flag} has its hoop`);
            assert.ok(
                Math.abs(value(gate.flag) - (gate.target / L.ticks) * top) < 1e-9,
                `${L.title}: the flag ${gate.flag} is not mark ${gate.target}`,
            );
            for (const h of gate.hoops) {
                const y = heightOf(L, h);
                assert.ok(
                    y > COURSE.top + 0.6 && y < COURSE.ground - 1.3,
                    `${L.title}: a hoop at ${y}`,
                );
            }
        }
    }
});

test("a flag missed comes round again, and a plane left to glide skims the grass and loses nothing", () => {
    const s = startPlane(0),
        pad = emptyPad();
    let laps = s.laps,
        lowest = 0;
    for (let i = 0; i < 60 * 30; i++) {
        stepPlane(s, pad);
        spent(pad);
        lowest = Math.max(lowest, s.plane.y);
        laps = s.laps;
    }
    assert.ok(laps >= 1, "the course went round");
    assert.ok(lowest <= COURSE.ground - 1 + 1e-9, "never below the grass");
    assert.ok(
        s.done.every((d) => !d) && !s.won,
        "flying low through every pole counts for nothing",
    );
    flyThrough(s, 0, heightOf(s.L, s.L.gates[0]?.target ?? 0));
    assert.ok(s.done[0], "the first flag, on the next lap");
});

test("the same presses fly the same path, and under reduced motion a press is half a second of climbing", () => {
    const fly = () => {
        const s = startPlane(2),
            pad = emptyPad();
        for (let i = 0; i < 60 * 25; i++) {
            pad.go = i % 140 < 55;
            stepPlane(s, pad);
            spent(pad);
        }
        return JSON.stringify([s.plane, s.done, s.laps, s.wrong]);
    };
    assert.equal(fly(), fly());
    const s = startPlane(0),
        y = s.plane.y,
        pad = emptyPad();
    pad.go = true;
    for (let i = 0; i < planeGame.still.press(s); i++) {
        stepPlane(s, pad);
        spent(pad);
    }
    assert.ok(s.plane.y < y - 1, "it climbed");
});
