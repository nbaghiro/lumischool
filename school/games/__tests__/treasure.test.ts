// Treasure island: every variation of every level is won through the pad by the keys and by a finger,
// and the same acts replay to the same island; Charlie walks at any time and never into the sea; the
// Action does what is in front of her; a wrong hole says how far off it is; the rope measures; random
// play rarely wins; the state and a kept collection are plain data; and only shelf drawings are drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { middleOf, nameOf, squareAt } from "../../../engine/motion/compass";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { blockedAt } from "../../../engine/motion/roam";
import { faults } from "../../../engine/motion/tune";
import { currentOf } from "../../../engine/motion/guide";
import { GRID, SPOTS } from "../../../engine/parts/outdoors/islandground";
import {
    FREE,
    LANDMARK_SQUARE,
    SHOVEL_AT,
    TREASURE,
    TREASURE_LEVELS,
    aim,
    back,
    gaitOf,
    labelOf,
    placeOf,
    pointerOf,
    readDesign,
    startTreasure,
    stepsOf,
    targetOf,
    treasureGame,
    type TreasureState,
} from "../treasure";
import {
    TREASURE_VARIANTS,
    levelFor,
    openTreasureConfiguration,
    replay,
    solve,
    treasureCertified,
} from "../treasure-challenges";

const level = (phase: number): TreasureState =>
    startTreasure(TREASURE_LEVELS[phase] ?? TREASURE_LEVELS[0], phase);
const step = (s: TreasureState, more: Partial<Pad> = {}) =>
    treasureGame.step(s, { ...emptyPad(), ...more });
const hold = (s: TreasureState, dirs: Dir[], n: number) => {
    for (let i = 0; i < n; i++) step(s, { holding: dirs, held: dirs[dirs.length - 1] ?? null });
    for (let i = 0; i < 30; i++) step(s);
};
const press = (s: TreasureState) => {
    step(s, { go: true, tapped: true });
    step(s);
};
/** Puts her down standing at a point, as if she had walked there. */
const standAt = (s: TreasureState, x: number, y: number) => {
    s.me.x = x;
    s.me.y = y;
    s.me.vx = s.me.vy = 0;
    s.me.route = [];
    step(s);
};
const settle = (s: TreasureState) => {
    for (let i = 0; i < 60 * 10 && (s.digging || s.me.route.length || s.errand); i++) step(s);
};

test("every variation of every level is won by the keys and by a finger, and the acts replay to the same island", () => {
    for (let phase = 0; phase < TREASURE_LEVELS.length; phase++)
        for (let variant = 0; variant < TREASURE_VARIANTS; variant++) {
            const c = { phase, variant };
            assert.ok(treasureCertified(c), `${phase}/${variant} leads somewhere it cannot be dug`);
            for (const hands of ["keys", "touch"] as const) {
                const acts = solve(c, hands);
                assert.ok(acts, `${phase}/${variant} by ${hands}: no way found`);
                const a = replay(c, acts),
                    b = replay(c, acts);
                if (phase === FREE)
                    assert.ok(a.round > 0, `the free island by ${hands}: no new map`);
                else assert.ok(treasureGame.won(a), `${phase}/${variant} by ${hands}: not won`);
                assert.equal(JSON.stringify(a.dug), JSON.stringify(b.dug));
            }
        }
});

test("she walks the eight ways at any time, on the dock and the beach, and never into the sea", () => {
    const s = level(1);
    const x0 = s.me.x;
    hold(s, ["right", "up"], 30);
    assert.ok(s.me.x > x0 && s.me.y < 38, "up and to the right together walk her north-east");
    // the dock runs out into the sea: she can walk it to its end, and no further
    standAt(s, 30.2, 39.5);
    hold(s, ["down"], 120);
    assert.ok(s.me.y > 43, `she stopped at ${s.me.y} on the dock`);
    hold(s, ["left"], 120);
    assert.ok(!blockedAt(placeOf(), s.me, gaitOf().radius), "she is never in the water");
    standAt(s, 12, 36);
    hold(s, ["left", "down"], 200);
    assert.ok(!blockedAt(placeOf(), s.me, gaitOf().radius), "she is never in the water");
});

test("the Action picks up the spade, digs her square, and opens what comes up", () => {
    const s = level(0);
    assert.equal(s.hand, "none");
    standAt(s, SHOVEL_AT.x - 1.2, SHOVEL_AT.y);
    assert.equal(labelOf(s, aim(s)), "Pick up spade");
    press(s);
    assert.equal(s.hand, "spade");
    assert.equal(s.spadeAt, null);
    // the treasure's square, three north and four east of the palm tree
    const clue = s.L.clues[0];
    assert.ok(clue);
    const to = targetOf(clue, null);
    assert.ok(to);
    assert.equal(nameOf(to), "H3");
    const m = middleOf(GRID, to);
    standAt(s, m.x, m.y + 1);
    assert.equal(labelOf(s, aim(s)), "Dig");
    press(s);
    settle(s);
    assert.equal(s.dug[0]?.what, "chest");
    assert.equal(labelOf(s, aim(s)), "Open chest");
    press(s);
    assert.ok(treasureGame.won(s));
    assert.equal(
        treasureGame.ended?.(s) ?? null,
        null,
        "a hunt with no limit never ends without a win",
    );
});

test("a hole with nothing in it says how far it is from the clue's start, and the same square is not dug twice", () => {
    const s = level(0);
    standAt(s, SHOVEL_AT.x - 1.2, SHOVEL_AT.y);
    press(s);
    const palm = middleOf(GRID, LANDMARK_SQUARE.palm);
    standAt(s, palm.x, palm.y + 1);
    // two north and three east of the palm tree: one short each way
    const near = middleOf(GRID, { c: LANDMARK_SQUARE.palm.c + 3, r: LANDMARK_SQUARE.palm.r - 2 });
    standAt(s, near.x + 0.6, near.y + 1);
    press(s);
    settle(s);
    assert.equal(s.dug[0]?.what, "none");
    assert.match(treasureGame.note(s), /2 north and 3 east from the palm tree/);
    assert.equal(labelOf(s, aim(s)), "Dug here");
    press(s);
    assert.equal(s.dug.length, 1);
});

test("the rope tied at one landmark and walked to another measures the squares between them", () => {
    const s = level(5);
    assert.equal(s.hand, "rope");
    standAt(s, SPOTS.palm.x + 1, SPOTS.palm.y + 0.7);
    assert.match(labelOf(s, aim(s)), /Tie rope to palm tree/);
    press(s);
    assert.equal(s.rope?.from, "palm");
    const rock = middleOf(GRID, LANDMARK_SQUARE.rock);
    standAt(s, rock.x, rock.y + 0.9);
    step(s);
    assert.equal(s.measured?.n, 5, "the palm tree and the big rock are five squares apart");
    assert.ok(stepsOf(s).find((x) => x.key === "measure")?.done);
});

test("on the first levels each square along the leg is counted out loud, and later levels count nothing", () => {
    const s = level(0);
    standAt(s, SHOVEL_AT.x - 1.2, SHOVEL_AT.y);
    press(s);
    const palm = middleOf(GRID, LANDMARK_SQUARE.palm);
    standAt(s, palm.x + 0.6, palm.y + 1);
    assert.ok(s.started, "standing at the palm tree starts the counting");
    for (let i = 0; i < 40 && squareAt(GRID, s.me)?.r === LANDMARK_SQUARE.palm.r; i++)
        step(s, { holding: ["up"], held: "up" });
    assert.deepEqual(
        s.floaters.map((f) => f.text),
        ["1"],
        "the first square north is counted",
    );
    const quiet = level(7);
    const cave = middleOf(GRID, LANDMARK_SQUARE.cave);
    standAt(quiet, cave.x, cave.y + 1);
    hold(quiet, ["down"], 60);
    assert.deepEqual(quiet.floaters, []);
});

test("the step strip follows the hunt and the arrow points at the next thing to do", () => {
    const s = level(0);
    const keys = () => stepsOf(s).map((x) => x.key);
    assert.deepEqual(keys(), ["spade", "start", "leg:0", "leg:1", "dig", "open"]);
    assert.equal(currentOf(stepsOf(s)), 0);
    assert.equal(pointerOf(s)?.name, "the spade");
    standAt(s, SHOVEL_AT.x - 1.2, SHOVEL_AT.y);
    press(s);
    assert.equal(stepsOf(s)[currentOf(stepsOf(s))]?.key, "start");
    assert.equal(pointerOf(s)?.name, "the palm tree");
    const palm = middleOf(GRID, LANDMARK_SQUARE.palm);
    standAt(s, palm.x + 0.6, palm.y + 1);
    assert.equal(stepsOf(s)[currentOf(stepsOf(s))]?.key, "leg:0");
    assert.equal(pointerOf(s)?.name, "the next square north");
    // undo puts her back where the clue starts
    standAt(s, 40, 30);
    assert.ok(back(s));
    assert.deepEqual(squareAt(GRID, s.me), LANDMARK_SQUARE.palm);
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
            const s = openTreasureConfiguration({ phase, variant: 0 });
            let at = { x: 30, y: 30 };
            let held: Dir[] = [];
            for (let i = 0; i < 60 * 40 && !treasureGame.won(s); i++) {
                const r = rnd(),
                    p = emptyPad();
                if (r < 0.01) treasureGame.command?.(s, "bag");
                else if (r < 0.03) at = { x: 8 + rnd() * 46, y: 6 + rnd() * 34 };
                else if (r < 0.06) held = rnd() < 0.3 ? [] : [dirs[Math.floor(rnd() * 4)] ?? "up"];
                else if (r < 0.08) {
                    p.go = true;
                    p.tapped = true;
                } else if (r < 0.4) {
                    at = { x: at.x + (rnd() - 0.5) * 2, y: at.y + (rnd() - 0.5) * 2 };
                    p.touch = at;
                    p.view = { x: 10, y: 10 };
                } else if (r < 0.45) p.lifted = at;
                p.holding = held;
                p.held = held[0] ?? null;
                treasureGame.step(s, p);
            }
            if (treasureGame.won(s)) wins++;
        }
        assert.ok(wins <= 1, `level ${phase} won ${wins} of 6 at random`);
    }
});

test("the state is plain data, a kept collection reads back, the frame draws only shelf drawings, and the tuning is sound", () => {
    for (let phase = 0; phase < TREASURE_LEVELS.length; phase++) {
        const s = treasureGame.start(phase, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        for (const hands of ["keys", "touch"] as const) {
            const acts = solve({ phase, variant: 0 }, hands) ?? [];
            const mid = replay({ phase, variant: 0 }, acts.slice(0, Math.floor(acts.length / 2)));
            assert.deepEqual(JSON.parse(JSON.stringify(mid)), mid);
            for (const at of [s, mid])
                for (const rest of [false, true])
                    for (const sp of treasureGame.frame(at, rest).sprites)
                        assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        }
        for (let variant = 0; variant < TREASURE_VARIANTS; variant++) {
            const L = levelFor({ phase, variant });
            assert.ok(
                !/[—!]/.test(`${L.title} ${L.goal} ${L.prompt}`),
                `${L.title}: a dash or an exclamation`,
            );
        }
    }
    const acts = solve({ phase: FREE, variant: 0 }, "touch") ?? [];
    const found = replay({ phase: FREE, variant: 0 }, acts);
    assert.ok(found.collection.coins > 0 && found.collection.gems === 3);
    const kept: unknown = JSON.parse(JSON.stringify(treasureGame.checkpoint?.(found)));
    const fresh = treasureGame.start(FREE, 1);
    assert.ok(treasureGame.restore?.(fresh, kept));
    assert.deepEqual(fresh.collection, found.collection);
    assert.equal(fresh.round, found.round);
    assert.equal(readDesign({ collection: { coins: -1 } }), null);
    assert.ok(
        !treasureGame.restore?.(treasureGame.start(0, 1), kept),
        "only the free island keeps a collection",
    );
    assert.deepEqual(faults(TREASURE), []);
});
