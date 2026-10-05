// Charlie's garden: every variation of every level is won through the pad by the keys and by a finger,
// and the same acts replay to the same garden; Charlie walks at any time and carries one thing; the
// Action does what she faces; a drag sows an array; random play rarely wins; the state and a kept
// garden are plain data; and only shelf drawings are drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import { cellMiddle } from "../../../engine/motion/garden";
import { currentOf } from "../../../engine/motion/guide";
import {
    FREE,
    GARDEN,
    GARDEN_LEVELS,
    aim,
    gardenGame,
    labelOf,
    packetAt,
    pointerOf,
    readDesign,
    speechOf,
    stepsOf,
    startGarden,
    type GardenState,
} from "../garden";
import {
    GARDEN_VARIANTS,
    gardenCertified,
    openGardenConfiguration,
    replay,
    solve,
} from "../garden-challenges";

const first = (): GardenState => startGarden(GARDEN_LEVELS[0], 0);
/** What she holds, read afresh each time rather than narrowed by the last assertion. */
const held = (s: GardenState): string => s.hand.what;
const step = (s: GardenState, more: Partial<Pad> = {}) =>
    gardenGame.step(s, { ...emptyPad(), ...more });
const hold = (s: GardenState, dirs: Dir[], n: number) => {
    for (let i = 0; i < n; i++) step(s, { holding: dirs, held: dirs[dirs.length - 1] ?? null });
    for (let i = 0; i < 20; i++) step(s);
};
const press = (s: GardenState) => {
    step(s, { go: true, tapped: true });
    step(s);
};

test("every variation of every level is won by the keys and by a finger, and the acts replay to the same garden", () => {
    for (let phase = 0; phase < FREE; phase++)
        for (let variant = 0; variant < GARDEN_VARIANTS; variant++) {
            const c = { phase, variant };
            assert.ok(gardenCertified(c), `${phase}/${variant} does not fit its beds`);
            for (const hands of ["keys", "touch"] as const) {
                const acts = solve(c, hands);
                assert.ok(acts, `${phase}/${variant} by ${hands}: no way found`);
                const a = replay(c, acts),
                    b = replay(c, acts);
                assert.ok(gardenGame.won(a), `${phase}/${variant} by ${hands}: not won`);
                assert.equal(JSON.stringify(a.g), JSON.stringify(b.g));
            }
        }
});

test("she walks the eight ways at any time, with whatever she carries, and nothing falls from her hands", () => {
    const s = first();
    assert.equal(labelOf(s, aim(s)), "Pick up carrot seeds", "she starts turned to the packet");
    press(s);
    assert.equal(held(s), "seed");
    const at = { x: s.me.x, y: s.me.y };
    hold(s, ["right", "down"], 30);
    assert.ok(s.me.x > at.x + 1 && s.me.y > at.y + 1, "she walks on a slant");
    assert.deepEqual(s.me.face, { x: 1, y: 1 });
    for (const d of ["up", "left", "down", "right"] as const) hold(s, [d], 20);
    for (let i = 0; i < 600; i++) step(s);
    assert.equal(held(s), "seed", "the seeds are still in her hand");
});

test("the Action takes what she faces, swaps what she holds for it, and puts it down on bare grass", () => {
    const s = first();
    press(s);
    assert.equal(held(s), "seed");
    // over to the can, which she takes in place of the seeds, and they go back to the bench
    s.me.x = s.canAt.x;
    s.me.y = s.canAt.y - 2;
    s.me.face = { x: 0, y: 1 };
    assert.equal(labelOf(s, aim(s)), "Pick up can");
    press(s);
    assert.equal(held(s), "can");
    assert.deepEqual(s.packets[0], packetAt(0));
    // on the lawn with nothing in front of her, the Action puts the can down there
    s.me.x = 24;
    s.me.y = 19;
    assert.equal(labelOf(s, aim(s)), "Put down can");
    press(s);
    assert.equal(held(s), "none");
    assert.ok(Math.hypot(s.canAt.x - 24, s.canAt.y - 19.9) < 0.2, "the can lies in front of her");
    // with nothing in her hands and nothing near her, the Action does nothing, with a shake
    s.me.x = 30;
    s.me.y = 19;
    assert.equal(aim(s), null);
    assert.equal(labelOf(s, aim(s)), "Action");
    const out = gardenGame.step(s, { ...emptyPad(), go: true, tapped: true });
    assert.ok(out.some((h) => "shake" in h));
    assert.equal(held(s), "none");
});

test("the keys plant by walking: the Action starts the rows, walking stretches them, and it sows them", () => {
    const s = first();
    press(s);
    const b = s.g.beds[0];
    assert.ok(b);
    s.me.x = cellMiddle(b, 0, 0).x;
    s.me.y = b.y - 0.7;
    s.me.face = { x: 0, y: 1 };
    assert.equal(labelOf(s, aim(s)), "Plant");
    press(s);
    assert.equal(labelOf(s, aim(s)), "Sow");
    hold(s, ["right"], 40);
    const w = s.sowing?.over;
    assert.ok(w && w.rows === 1 && w.cols > 1, "walking along the bed stretches a row");
    press(s);
    assert.equal(s.sowing, null);
    assert.equal(s.g.plants.length, w.cols);
});

test("a finger dragged over a bed with seeds in hand sows the rectangle it covers", () => {
    const L = GARDEN_LEVELS[1];
    assert.ok(L);
    const s = startGarden(L, 1);
    press(s);
    assert.equal(held(s), "seed");
    const b = s.g.beds[0];
    assert.ok(b);
    const from = cellMiddle(b, 0, 0),
        to = cellMiddle(b, 2, 1);
    for (let k = 0; k <= 10; k++)
        step(s, {
            touch: {
                x: from.x + ((to.x - from.x) * k) / 10,
                y: from.y + ((to.y - from.y) * k) / 10,
            },
        });
    step(s, { lifted: to });
    assert.equal(s.g.plants.length, 6);
});

test("a tap on a thing walks her to it and takes it; a held Action with the can waters by degrees", () => {
    const s = first();
    const can = { ...s.canAt };
    step(s, { touch: can });
    step(s, { lifted: can });
    for (let i = 0; i < 600 && held(s) !== "can"; i++) step(s);
    assert.equal(held(s), "can", "she walked to the can and took it");
    const b = s.g.beds[0];
    assert.ok(b);
    const mid = cellMiddle(b, 2, 0);
    s.me.x = mid.x;
    s.me.y = b.y - 0.7;
    s.me.route = [];
    s.me.face = { x: 0, y: 1 };
    assert.equal(labelOf(s, aim(s)), "Water");
    step(s, { go: true, tapped: true });
    for (let i = 0; i < 60; i++) step(s, { go: true });
    const some = b.water;
    assert.ok(some > 0, "held, it pours");
    for (let i = 0; i < 60; i++) step(s, { go: true });
    for (let i = 0; i < 120; i++) step(s);
    assert.ok(b.water > some, "held longer, it pours more");
    const after = b.water;
    for (let i = 0; i < 120; i++) step(s);
    assert.equal(b.water, after, "let go, it stops");
});

test("presses, walks and taps made at random rarely win a level", () => {
    const dirs: Dir[] = ["up", "down", "left", "right"];
    for (let phase = 0; phase < FREE; phase++) {
        let wins = 0;
        for (let t = 0; t < 6; t++) {
            let seed = (t + 1) * 9973 + phase;
            const rnd = () => {
                seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
                return seed / 4294967296;
            };
            const s = openGardenConfiguration({ phase, variant: 0 });
            let at = { x: 22, y: 13 };
            let held: Dir[] = [];
            for (let i = 0; i < 60 * 40 && !gardenGame.won(s); i++) {
                const r = rnd(),
                    p = emptyPad();
                if (r < 0.01) gardenGame.command?.(s, "day");
                else if (r < 0.03) at = { x: rnd() * 44, y: rnd() * 26 };
                else if (r < 0.06) held = rnd() < 0.3 ? [] : [dirs[Math.floor(rnd() * 4)] ?? "up"];
                else if (r < 0.08) {
                    p.go = true;
                    p.tapped = true;
                } else if (r < 0.4) {
                    at = { x: at.x + (rnd() - 0.5) * 2, y: at.y + (rnd() - 0.5) * 2 };
                    p.touch = at;
                } else if (r < 0.45) p.lifted = at;
                p.holding = held;
                p.held = held[0] ?? null;
                gardenGame.step(s, p);
            }
            if (gardenGame.won(s)) wins++;
        }
        assert.ok(wins <= 1, `level ${phase} won ${wins} of 6 at random`);
    }
});

test("the state is plain data, a kept garden reads back, the frame draws only shelf drawings, and the tuning is sound", () => {
    for (let phase = 0; phase < GARDEN_LEVELS.length; phase++) {
        const s = gardenGame.start(phase, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (const hands of ["keys", "touch"] as const) {
            const acts = solve({ phase, variant: 0 }, hands) ?? [];
            const mid = replay({ phase, variant: 0 }, acts.slice(0, Math.floor(acts.length / 2)));
            assert.deepEqual(JSON.parse(JSON.stringify(mid)), mid);
            for (const at of [s, mid])
                for (const rest of [false, true])
                    for (const sp of gardenGame.frame(at, rest).sprites)
                        assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        }
        const L = GARDEN_LEVELS[phase];
        assert.ok(
            L && !/[—!]/.test(`${L.goal} ${L.prompt}`),
            "a goal with a dash or an exclamation",
        );
    }
    const L = GARDEN_LEVELS[FREE];
    assert.ok(L);
    const acts = solve({ phase: FREE, variant: 0 }, "touch") ?? [];
    const grown = replay({ phase: FREE, variant: 0 }, acts.slice(0, Math.floor(acts.length / 2)));
    assert.ok(grown.g.plants.length > 0, "half way, the free garden is growing");
    const kept: unknown = JSON.parse(JSON.stringify(gardenGame.checkpoint?.(grown)));
    const fresh = gardenGame.start(FREE, 1);
    assert.ok(gardenGame.restore?.(fresh, kept));
    assert.deepEqual(fresh.g.plants, grown.g.plants);
    assert.equal(readDesign({ g: { beds: [] } }, L), null);
    assert.deepEqual(faults(GARDEN), []);
});

test("the step strip follows the garden: each step becomes the one to do in turn, and all are ticked at the win", () => {
    const c = { phase: 0, variant: 0 };
    const acts = solve(c, "keys");
    assert.ok(acts);
    const s = openGardenConfiguration(c);
    const seen: number[] = [currentOf(stepsOf(s))];
    for (const act of acts) {
        if ("pad" in act)
            gardenGame.step(s, {
                ...act.pad,
                pressed: [...act.pad.pressed],
                holding: [...act.pad.holding],
            });
        else gardenGame.command?.(s, act.command);
        const now = currentOf(stepsOf(s));
        if (seen[seen.length - 1] !== now) seen.push(now);
    }
    assert.ok(gardenGame.won(s));
    assert.ok(stepsOf(s).every((x) => x.done));
    for (const k of [0, 1, 2, 3, 4]) assert.ok(seen.includes(k), `step ${k + 1} never came up`);
    assert.equal(seen[0], 0);
});

test("at the start the arrow is over the seeds and Charlie says to fetch them", () => {
    const s = first();
    assert.equal(currentOf(stepsOf(s)), 0);
    assert.deepEqual(pointerOf(s)?.at, s.packets[0]);
    assert.match(speechOf(s), /carrot seeds/);
    assert.match(gardenGame.say(s), /Step 1 of 5/);
    assert.match(gardenGame.say(s), /The arrow points at the carrot seeds/);
    s.hand = { what: "seed", crop: "carrot" };
    assert.equal(currentOf(stepsOf(s)), 1);
    assert.equal(pointerOf(s)?.name, "the bed");
});

test("the sundial passes no night with nothing planted, and on a first level points out a dry bed once", () => {
    const s = first();
    gardenGame.command?.(s, "day");
    assert.equal(s.g.day, 0);
    assert.match(gardenGame.note(s), /Plant something first/);
    s.g.plants.push({ bed: 0, c: 0, r: 0, crop: "carrot", span: 1, age: 0, rest: "fine" });
    s.sown = 1;
    gardenGame.command?.(s, "day");
    assert.equal(s.g.day, 0);
    assert.match(gardenGame.note(s), /dry/);
    gardenGame.command?.(s, "day");
    assert.equal(s.g.day, 1);
});
