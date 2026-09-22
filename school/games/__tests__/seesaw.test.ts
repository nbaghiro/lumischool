// The see-saw: the plank rests level exactly when the turning effects are equal, every level can be
// made level, and a bag let go over the grass walks home with nothing lost.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import type { Pt } from "../../../engine/motion/geometry";
import { lean, turning, type Load } from "../../../engine/motion/lever";
import {
    FIELD as SEESAW_FIELD,
    GAP,
    PIVOT,
    PLANK,
    SEESAW,
    SEESAW_LEVELS,
    difference,
    seesawGame,
    start as startSeesaw,
    step as stepSeesaw,
    type SeesawLevel,
    type SeesawState,
} from "../seesaw";
import { CAKE_SHAPE } from "../cake";

/** Every way a level's bags can stay on the grass or stand on its open steps, a side taking at most `most`, as the loads they make. */
function standings(L: SeesawLevel): Load[][] {
    const out: Load[][] = [];
    const walk = (i: number, loads: Load[]): void => {
        if (i === L.bags.length) {
            out.push(loads);
            return;
        }
        walk(i + 1, loads);
        for (const at of L.open) {
            if (loads.filter((l) => Math.sign(l.at) === Math.sign(at)).length >= L.most) continue;
            walk(i + 1, [...loads, { mass: L.bags[i] ?? 0, at }]);
        }
    };
    walk(0, []);
    return out;
}
const turnsWith = (L: SeesawLevel, loads: Load[]) =>
    turning([{ mass: L.load.kg, at: L.load.at }, ...loads]);

/** A see-saw played by a finger: press on a bag, carry it to a place in the world, hold it there a moment, let go, and let things settle. */
function carry(s: SeesawState, bag: number, to: Pt): void {
    const pad = emptyPad();
    const from = seesawGame.frame(s).sprites.find((x) => x.key === `bag:${bag}`);
    if (!from) throw new Error(`no bag ${bag}`);
    pad.touch = { x: from.x, y: from.y };
    stepSeesaw(s, pad);
    spent(pad);
    for (let i = 1; i <= 20; i++) {
        pad.touch = {
            x: from.x + ((to.x - from.x) * i) / 20,
            y: from.y + ((to.y - from.y) * i) / 20,
        };
        stepSeesaw(s, pad);
        spent(pad);
    }
    for (let i = 0; i < 30; i++) {
        stepSeesaw(s, pad);
        spent(pad);
    }
    pad.lifted = pad.touch;
    pad.touch = null;
    stepSeesaw(s, pad);
    spent(pad);
    for (let i = 0; i < 60 * 4; i++) {
        stepSeesaw(s, pad);
        spent(pad);
    }
}
const overStep = (at: number): Pt => ({ x: PIVOT.x + at * GAP, y: PIVOT.y - 7 });

test("the plank rests level exactly when the turning effects are equal, and leans towards the heavier side, however a level's bags stand", () => {
    for (const L of SEESAW_LEVELS) {
        for (const loads of standings(L)) {
            const d = turnsWith(L, loads),
                a = lean(d, { per: SEESAW.lean.value, most: SEESAW.most.value });
            assert.equal(a === 0, d === 0, `${L.title}: ${JSON.stringify(loads)}`);
            assert.equal(Math.sign(a), Math.sign(d));
        }
    }
});

test("every see-saw level can be made level, none starts level, and bags stood at random make it level at most one time in five", () => {
    for (const L of SEESAW_LEVELS) {
        const all = standings(L).filter((loads) => loads.length > 0),
            level = all.filter((loads) => turnsWith(L, loads) === 0);
        assert.ok(level.length > 0, `${L.title} cannot be made level`);
        assert.notEqual(turnsWith(L, []), 0, `${L.title} starts level`);
        assert.ok(level.length / all.length <= 0.2, `${L.title}: ${level.length} of ${all.length}`);
    }
    const two = SEESAW_LEVELS.find((L) => L.title === "Two to balance");
    assert.ok(
        two &&
            standings(two)
                .filter((l) => l.length === 1)
                .every((l) => turnsWith(two, l) !== 0),
        "at Two to balance no one bag does it",
    );
});

test("a bag carried over a step and let go stands on it and turns the plank; one let go over the grass walks home, and nothing is lost", () => {
    const s = startSeesaw(0),
        was = s.tilt.angle;
    carry(s, 2, overStep(3));
    assert.equal(s.bags[2]?.on, "plank");
    assert.equal(s.bags[2]?.at, 3);
    assert.ok(s.tilt.angle > was, "a bag on the right turns the plank towards the right");
    carry(s, 0, { x: 4, y: SEESAW_FIELD.front - 6 });
    assert.equal(s.bags[0]?.on, "store");
    assert.equal(s.bags.filter((b) => b.on === "store" || b.on === "plank").length, s.bags.length);
});

test("the see-saw is won only when the plank is level and still with nothing carried, and a heavier side never wins", () => {
    const heavy = startSeesaw(0);
    carry(heavy, 2, overStep(3));
    carry(heavy, 4, overStep(3));
    assert.equal(
        heavy.bags.filter((x) => x.on === "plank").length,
        2,
        "both bags stand on the plank",
    );
    for (let i = 0; i < 60 * 5; i++) stepSeesaw(heavy, emptyPad());
    assert.equal(heavy.won, false, "3 and 5 kilograms against 7 is not level");
    const fair = startSeesaw(0);
    carry(fair, 2, overStep(3));
    carry(fair, 3, overStep(3));
    assert.equal(
        fair.bags.filter((x) => x.on === "plank").length,
        2,
        "both bags stand on the plank",
    );
    assert.equal(difference(fair), 0);
    for (let i = 0; i < 60 * 3; i++) stepSeesaw(fair, emptyPad());
    assert.ok(fair.won, "3 and 4 kilograms against 7 is level");
    assert.ok(Math.abs(fair.tilt.angle) < 0.004);
});

test("a side of the plank takes only as many bags as the level says, and taking one back sends it home", () => {
    const s = startSeesaw(3);
    carry(s, 0, overStep(3));
    carry(s, 1, overStep(5));
    assert.equal(
        s.bags.filter((b) => b.on === "plank").length,
        1,
        "Further out takes one bag on the right",
    );
    assert.equal(s.bags[1]?.on, "store");
    assert.ok(seesawGame.back?.(s));
    for (let i = 0; i < 60 * 4; i++) stepSeesaw(s, emptyPad());
    assert.equal(s.bags.filter((b) => b.on === "plank").length, 0);
});

test("the same hands give the same see-saw, bag for bag", () => {
    const play = () => {
        const s = startSeesaw(2);
        carry(s, 1, overStep(2));
        carry(s, 4, overStep(-2));
        carry(s, 0, { x: 40, y: SEESAW_FIELD.front - 6 });
        return JSON.stringify({ bags: s.bags, tilt: s.tilt, steps: s.steps });
    };
    assert.equal(play(), play());
});

test("under reduced motion a see-saw press is a quarter of a second, and what it started is drawn at rest", () => {
    const s = startSeesaw(0),
        pad = emptyPad();
    const press = () => {
        for (let i = 0; i < seesawGame.still.press(s); i++) {
            stepSeesaw(s, pad);
            spent(pad);
        }
        let n = 0;
        while (seesawGame.still.settling?.(s) && n++ < 60 * 20) stepSeesaw(s, emptyPad());
    };
    pad.pressed.push("right");
    press();
    pad.tapped = true;
    press();
    assert.equal(s.bags[0]?.on, "held", "space picks up the chosen bag");
    pad.tapped = true;
    press();
    assert.equal(s.bags[0]?.on, "plank", "and space again stands it on the step");
    assert.ok(!seesawGame.still.settling?.(s));
});

test("the see-saw and the cake stand things where their drawings put them", async () => {
    const art = {
        ...(await import("../../../engine/parts/science/seesawplank")),
        ...(await import("../../../engine/parts/food/longcake")),
        ...(await import("../../../engine/parts/food/cakeknife")),
    };
    assert.ok(
        Math.abs(PLANK.top - (art.PLANK_LINE.pivot - art.PLANK_LINE.top)) < 1e-9,
        "a bag stands on the plank's top",
    );
    assert.ok(
        Math.abs(PLANK.middle - (art.PLANK_LINE.middle - art.PLANK_LINE.pivot)) < 1e-9,
        "the plank turns about its bolt",
    );
    assert.ok(
        Math.abs(CAKE_SHAPE.top - (art.CAKE_BODY.foot - art.CAKE_BODY.top)) < 1e-9,
        "the knife comes down on the icing",
    );
    assert.equal(CAKE_SHAPE.foot, art.CAKE_BODY.foot);
    assert.ok(
        Math.abs(CAKE_SHAPE.knifeTip - (art.KNIFE.tip - art.KNIFE.box / 2)) < 1e-9,
        "the cut is where the knife's tip is",
    );
});
