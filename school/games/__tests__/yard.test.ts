// The shunting yard: a still yard is a position the mechanic lists, carriages hook on only when
// they meet below the coupling speed, and the lift takes only a lone carriage from an end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { ACTIVITIES } from "../activities";
import { explore, prove } from "../prove";

type YardMod = typeof import("../yard");
type YardState = import("../yard").YardState;
type YardPad = import("../../../engine/motion/pad").Pad;
type YardHappening = import("../../../engine/motion/scene").Happening;

/** A finger that comes down on the engine, moves `dx` at `speed` squares a second, and lifts. The engine follows once the finger has moved the little that tells a drag from a tap. */
function yardDrag(Y: YardMod, s: YardState, pad: YardPad, dx: number, speed: number): void {
    const l = s.line.vehicles.find((v) => v.id === "loco");
    const sx = l ? l.x : 0,
        sy = Y.RAIL_Y - 1.5;
    pad.touch = { x: sx, y: sy };
    Y.step(s, pad);
    spent(pad);
    const sign = Math.sign(dx);
    dx += sign * 0.6;
    for (let moved = 0; Math.abs(moved) < Math.abs(dx);) {
        moved += sign * Math.min(Math.abs(dx) - Math.abs(moved), speed / 60);
        pad.touch = { x: sx + moved, y: sy };
        Y.step(s, pad);
        spent(pad);
    }
    pad.touch = null;
    pad.lifted = { x: sx + dx, y: sy };
    Y.step(s, pad);
    spent(pad);
}

const yardSettle = (Y: YardMod, s: YardState, pad: YardPad, most = 60 * 4): void => {
    for (let i = 0; i < most && Y.moving(s); i++) {
        Y.step(s, pad);
        spent(pad);
    }
};

/** Nothing off the line, nothing through anything, and every carriage on the line, in the pit or on the lift, once. */
function yardSound(Y: YardMod, s: YardState, where: string): void {
    const vs = s.line.vehicles;
    for (let i = 0; i < vs.length; i++) {
        const v = vs[i],
            next = vs[i + 1];
        assert.ok(
            v && v.x - Y.LEN / 2 >= s.g.ends[0] - 1e-6 && v.x + Y.LEN / 2 <= s.g.ends[1] + 1e-6,
            `${where}: ${v?.id} is off the line`,
        );
        if (v && next)
            assert.ok(
                v.x + Y.LEN / 2 <= next.x - Y.LEN / 2 + 1e-6,
                `${where}: ${v.id} is through ${next.id}`,
            );
    }
    const all = [
        ...Y.carriages(s).map((c) => c.id),
        ...s.pit,
        ...(s.lift ? [s.lift.car] : []),
    ].sort();
    assert.deepEqual(all, [...s.v.train].sort(), `${where}: a carriage is lost or doubled`);
    assert.ok(
        vs.some((v) => v.id === "loco"),
        `${where}: the engine has gone`,
    );
}

/**
 * A child who drags the engine about at random speeds, presses the lever now and then and taps hooks
 * now and then, for `n` actions, with `check` called after every step.
 */
function yardRandom(
    Y: YardMod,
    level: number,
    seed: number,
    n: number,
    check?: (s: YardState) => void,
): YardState {
    const rand = seeded(seed),
        s = Y.start(level),
        pad = emptyPad();
    const one = () => {
        Y.step(s, pad);
        spent(pad);
        check?.(s);
    };
    for (let k = 0; k < n && !s.won; k++) {
        const r = rand();
        if (r < 0.6) {
            const l = s.line.vehicles.find((v) => v.id === "loco"),
                dx = (rand() - 0.5) * 30,
                speed = 1 + rand() * 13;
            const sx = l ? l.x : 0,
                sy = Y.RAIL_Y - 1.5;
            pad.touch = { x: sx, y: sy };
            one();
            for (let moved = 0; Math.abs(moved) < Math.abs(dx);) {
                moved += Math.sign(dx) * Math.min(Math.abs(dx) - Math.abs(moved), speed / 60);
                pad.touch = { x: sx + moved, y: sy };
                one();
            }
            pad.touch = null;
            pad.lifted = { x: sx + dx, y: sy };
            one();
        } else if (r < 0.85) {
            pad.tapped = true;
            one();
        } else if (r < 0.95) {
            const hooked = s.line.hooked.map((h, i) => (h ? i : -1)).filter((i) => i >= 0),
                i = hooked[Math.floor(rand() * hooked.length)];
            const a = s.line.vehicles[i ?? -1],
                b = s.line.vehicles[(i ?? -1) + 1];
            if (a && b) {
                const p = { x: (a.x + b.x) / 2, y: Y.RAIL_Y - 0.6 };
                pad.touch = p;
                one();
                pad.touch = null;
                pad.lifted = p;
                one();
            }
        } else {
            pad.pressed.push("down");
            one();
        }
        for (let i = 0; i < 60 * 3 && Y.moving(s); i++) one();
    }
    return s;
}

test("the yard's first three levels play the listed shunt versions at the same indices, and every level keeps the prover's gate", async () => {
    const Y = await import("../yard");
    const { shunt } = await import("../shunt");
    assert.equal(Y.yardGame.id, "shunt");
    assert.deepEqual(Y.yardGame.plays, { activity: "shunt.into-order", levels: [0, 1, 2] });
    const listed = ACTIVITIES.find((a) => a.kind === "shunt");
    assert.ok(listed);
    Y.YARD_LEVELS.forEach((L, i) => {
        const r = L.round();
        assert.equal(
            r.start.key,
            shunt.key(shunt.start(L.v)),
            `${L.title}: the level's train is not the round's`,
        );
        assert.ok(
            r.goal.includes(L.v.order.join(", ")),
            `${L.title}: the level's order is not the round's`,
        );
        if (i < 3) assert.equal(r.id, listed.id, `${L.title} plays the listed activity`);
        const p = prove(r);
        assert.ok(p.ok, `${L.title}: ${p.problems.join("; ")}`);
    });
    assert.deepEqual(
        Y.YARD_LEVELS.map((L) => prove(L.round()).shortest),
        [4, 5, 10, 10, 11, 12],
    );
    assert.deepEqual(
        Y.YARD_LEVELS.slice(0, 5).map((L) => L.title),
        [
            "One carriage out of place",
            "Standing backwards",
            "Four jumbled, room for three",
            "Four jumbled, room for two",
            "Five carriages, room for two",
        ],
        "the old five levels, at the same indices",
    );
});

test("a still yard is a position the mechanic lists, from every level's start and all along random play, and nothing ever leaves the line or passes through anything", async () => {
    const Y = await import("../yard");
    const { shunt } = await import("../shunt");
    for (let level = 0; level < Y.YARD_LEVELS.length; level++) {
        const L = Y.YARD_LEVELS[level];
        assert.ok(L);
        const ex = explore(L.round());
        const s0 = Y.start(level);
        assert.ok(ex.nodes.has(shunt.key(Y.positionOf(s0))), `${L.title}: the start`);
        let stills = 0;
        for (const seed of [1, 2, 3]) {
            yardRandom(Y, level, seed * 7 + level, 40, (s) => {
                yardSound(Y, s, `${L.title} seed ${seed} step ${s.steps}`);
                if (!Y.moving(s) && s.steps % 20 === 0) {
                    stills++;
                    const key = shunt.key(Y.positionOf(s));
                    assert.ok(
                        ex.nodes.has(key),
                        `${L.title} seed ${seed}: the still yard ${key} is not a position the mechanic lists`,
                    );
                }
            });
        }
        assert.ok(stills > 20, `${L.title}: the yard was still ${stills} times`);
    }
});

test("carriages hook on only when they meet below the coupling speed, and are knocked on and roll otherwise", async () => {
    const Y = await import("../yard");
    const meet = (speed: number) => {
        const s = Y.start(0),
            pad = emptyPad(),
            out: YardHappening[] = [];
        assert.ok(Y.letGo(s, out), "the engine lets go of the train");
        yardDrag(Y, s, pad, -2, 4);
        yardSettle(Y, s, pad);
        const before = Y.carriages(s).map((c) => c.x);
        yardDrag(Y, s, pad, 2.6, speed);
        yardSettle(Y, s, pad);
        return { s, before, after: Y.carriages(s).map((c) => c.x) };
    };
    const gentle = meet(Y.YARD.couple.value - 1);
    assert.ok(gentle.s.line.hooked[0], "met gently, so hooked on");
    assert.ok(
        gentle.after.every((x, i) => Math.abs(x - (gentle.before[i] ?? 0)) < 2.6),
        "and the train was only pushed along, not knocked",
    );
    assert.doesNotMatch(gentle.s.said, /Too fast/);
    const hard = meet(Y.YARD.couple.value + 6);
    assert.ok(!hard.s.line.hooked[0], "met hard, so not hooked");
    assert.ok(
        (hard.after[0] ?? 0) - (hard.before[0] ?? 0) > 2,
        `knocked on and rolled: ${hard.before[0]} to ${hard.after[0]}`,
    );
    assert.ok(!Y.moving(hard.s), "and came to rest");
    assert.match(hard.s.said, /Too fast/);
});

test("the lift takes only a lone carriage from an end of the train, and gives one back only where the lift is clear and it would be at an end", async () => {
    const Y = await import("../yard");
    const s = Y.start(0),
        pad = emptyPad(),
        out: YardHappening[] = [],
        xJ = s.g.xJ;
    const at = (id: string) => {
        const c = s.line.vehicles.find((v) => v.id === id);
        assert.ok(c, `${id} is on the line`);
        return c;
    };
    const push = (dx: number, speed = 6) => {
        yardDrag(Y, s, pad, dx, speed);
        yardSettle(Y, s, pad);
    };
    const to = (id: string, x: number, speed = 6) => push(x - at(id).x, speed);
    const press = () => {
        const went = Y.pressLever(s, out);
        yardSettle(Y, s, pad);
        return went;
    };
    const line = () =>
        Y.carriages(s)
            .map((c) => c.id)
            .join();
    // the end carriage on the lift, still hooked to the train: the lift unhooks it and takes it
    to("2", xJ);
    assert.ok(press(), s.said);
    assert.deepEqual(s.pit, ["2"]);
    assert.ok(!s.line.vehicles.some((v) => v.id === "2"));
    // the lift clear and the train left of it: the top of the pit comes up at the right end, loose
    assert.ok(press(), s.said);
    assert.deepEqual(s.pit, []);
    assert.equal(line(), "3,1,2");
    assert.ok(Math.abs(at("2").x - xJ) < 0.01, "it comes up on the lift");
    assert.ok(!s.line.hooked[2], "loose");
    // hooked on again gently and pulled clear: nothing on the lift and nothing below
    push(1.6, 2);
    assert.ok(s.line.hooked[2], "hooked on again, gently");
    push(-8);
    assert.ok(!press() && s.said.includes("nothing is down"), s.said);
    // a carriage in the middle of the train, with carriages either side of the lift
    to("1", xJ);
    assert.ok(at("3").x < xJ && at("2").x > xJ);
    assert.ok(!press() && s.said.includes("middle"), s.said);
    assert.deepEqual(s.pit, []);
    // the end carriage on the lift with the rest right of it goes down, and comes back at the left end
    to("3", xJ);
    assert.ok(press(), s.said);
    assert.deepEqual(s.pit, ["3"]);
    assert.ok(press(), s.said);
    assert.equal(line(), "3,1,2");
    // a full pit takes nothing more
    push(2, 2.5);
    assert.ok(s.line.hooked[0], "the engine hooked 3 gently");
    push(4 - at("loco").x);
    to("2", xJ);
    assert.ok(press(), s.said);
    to("1", xJ);
    assert.ok(press(), s.said);
    assert.deepEqual(s.pit, ["2", "1"]);
    to("3", xJ);
    assert.ok(!press() && s.said.includes("full"), s.said);
    // the engine on the lift, then partly on it, then clear of it
    to("loco", xJ);
    assert.ok(!press() && s.said.includes("not the engine"), s.said);
    assert.ok(Y.letGo(s, out));
    push(-4);
    assert.ok(!press() && s.said.includes("engine is partly"), s.said);
    push(-2);
    assert.ok(press(), s.said);
    assert.equal(line(), "1,3");
    assert.deepEqual(s.pit, ["2"]);
});

test("random dragging and pressing wins the yard at most one time in five", async () => {
    const Y = await import("../yard");
    let wins = 0;
    const seeds = 25;
    for (let seed = 1; seed <= seeds; seed++) if (yardRandom(Y, 0, 100 + seed, 60).won) wins++;
    assert.ok(wins <= seeds / 5, `random play won ${wins} of ${seeds}`);
});

test("the same hands give the same yard", async () => {
    const Y = await import("../yard");
    const run = () => {
        const s = yardRandom(Y, 2, 44, 30);
        return JSON.stringify([
            Y.frame(s).sprites.map((sp) => [sp.key, sp.x.toFixed(6), sp.y.toFixed(6)]),
            s.pit,
            s.said,
            Y.positionOf(s),
        ]);
    };
    assert.equal(run(), run());
});

test("under reduced motion a press of the keys is a nudge worked out to rest, and the lever's press is worked out to the pit", async () => {
    const Y = await import("../yard");
    const { down, up } = await import("../../../engine/motion/pad");
    const s = Y.start(0),
        pad = emptyPad();
    const engine = () => {
        const l = s.line.vehicles.find((v) => v.id === "loco");
        assert.ok(l);
        return l;
    };
    const x0 = engine().x;
    const press = (setup: () => void) => {
        setup();
        for (let i = 0; i < Y.yardGame.still.press(s); i++) {
            Y.step(s, pad);
            spent(pad);
        }
        Object.assign(pad, { holding: [], held: null, tapped: false, touch: null });
        let n = 0;
        while (Y.yardGame.still.settling?.(s) && n++ < 60 * 20) {
            Y.step(s, pad);
            spent(pad);
        }
        assert.ok(n < 60 * 20, "it settles");
    };
    press(() => down(pad, "right"));
    assert.ok(
        engine().x > x0 + 0.8 && !Y.moving(s),
        `a press moved the engine to rest: ${engine().x - x0}`,
    );
    up(pad, "right");
    const car = Y.carriages(s)[Y.carriages(s).length - 1];
    assert.ok(car);
    while (car.x < s.g.xJ - 0.5) press(() => down(pad, "right"));
    up(pad, "right");
    press(() => {
        pad.tapped = true;
    });
    assert.deepEqual(s.pit, [car.id], "the lever's press is worked out to the pit");
    assert.ok(!Y.moving(s));
});

test("every drawing the yard names is on the shelf, on the line, on the lift and down the pit", async () => {
    const Y = await import("../yard");
    const known = SHELF_IDS;
    const seen = new Set<string>();
    for (const level of [0, 5]) {
        yardRandom(Y, level, 9 + level, 30, (s) => {
            if (s.steps % 15 !== 0 && !s.lift) return;
            for (const rest of [false, true])
                for (const sp of Y.frame(s, rest).sprites) {
                    seen.add(sp.art);
                    assert.ok(
                        known.has(sp.art),
                        `${sp.key} asks for ${sp.art}, which is not on the shelf`,
                    );
                }
        });
    }
    assert.deepEqual([...seen].sort(), [
        "bufferstop",
        "carriage",
        "cloud",
        "coupling",
        "firs",
        "hedge",
        "liftpit",
        "loco",
        "orderboard",
        "railsignal",
        "railway",
        "tree",
        "yardlever",
    ]);
});

test("the yard lays its pit, its lift and its lever on the numbers their drawings export, and the lever's knob is a finger wide at every level at 1024", async () => {
    const Y = await import("../yard");
    const art = {
        ...(await import("../../../engine/parts/travel/liftpit")),
        ...(await import("../../../engine/parts/travel/yardlever")),
    };
    assert.deepEqual(
        [
            Y.PIT.w,
            Y.PIT.head,
            Y.PIT.slot,
            Y.PIT.floor,
            Y.PIT.under,
            Y.PIT.platform,
            Y.PIT.cable,
            Y.PIT.gantry.h,
            Y.PIT.gantry.wheel,
        ],
        [
            art.LIFTPIT.w,
            art.LIFTPIT.head,
            art.LIFTPIT.slot,
            art.LIFTPIT.floor,
            art.LIFTPIT.under,
            art.LIFTPIT.platform,
            art.LIFTPIT.gantry.cable,
            art.LIFTPIT.gantry.h,
            art.LIFTPIT.gantry.wheel,
        ],
    );
    for (const slots of [1, 2, 3, 4]) {
        assert.equal(Y.pitHeight(slots), art.pitHeight(slots), `a pit of ${slots}`);
        for (let k = 0; k < slots; k++)
            assert.ok(
                Math.abs(Y.slotRail(slots, k) - Y.RAIL_Y - art.pitRail(slots, k)) < 1e-9,
                `slot ${k} of ${slots}`,
            );
    }
    assert.deepEqual(
        [Y.LEVER.knob, Y.LEVER.swing, Y.LEVER.base],
        [art.LEVER.knob, art.LEVER.swing, art.LEVER.base],
    );
    for (const L of Y.YARD_LEVELS) {
        const g = Y.geometry(L.v.train.length, L.v.siding),
            l = Y.leverOf(g),
            box = art.leverBox(l.reach),
            knob = art.leverKnob(l.reach, 0);
        assert.deepEqual(Y.leverBox(l.reach), box, `${L.title}: the lever's box`);
        const scale = l.size / box.w,
            left = g.xL - l.size / 2,
            top = Y.RAIL_Y + 0.4 - box.h * scale;
        assert.ok(
            Math.abs(left + knob.x * scale - l.at.x) < 1e-9 &&
                Math.abs(top + knob.y * scale - l.at.y) < 1e-9,
            `${L.title}: the knob is where the drawing puts it`,
        );
        // A field 1000 pixels wide at 1024 gives this level a whole number of pixels a square; the knob has to be a touch target on it.
        const px = Math.floor(1000 / g.w);
        assert.ok(
            l.knob * px >= 44,
            `${L.title}: the knob is ${(l.knob * px).toFixed(0)} px at 1024`,
        );
        assert.ok(
            l.at.y + l.knob / 2 <= Y.RAIL_Y - 3.2,
            `${L.title}: the knob stands clear over a carriage's roof`,
        );
        assert.ok(
            Y.onLever(g, l.at) &&
                Y.onLever(g, { x: l.at.x + l.knob / 2, y: l.at.y }) &&
                !Y.onLever(g, { x: g.xL, y: Y.RAIL_Y - 12 }),
            `${L.title}: a press on the knob is a press on the lever`,
        );
        assert.ok(
            g.h >= Y.RAIL_Y + Y.pitHeight(L.v.siding) &&
                Y.frame(Y.start(Y.YARD_LEVELS.indexOf(L))).view.h < g.h,
            `${L.title}: the world has sky over the view`,
        );
    }
    assert.deepEqual(
        Y.YARD_LEVELS.map((L) => Y.leverOf(Y.geometry(L.v.train.length, L.v.siding)).knob),
        [2.5, 2.5, 3, 3, 4, 4],
        "four squares on the two widest yards",
    );
});
