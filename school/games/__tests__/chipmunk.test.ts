// Nutmeg's winter store: every level and variation is played to its end by the keys and by a finger,
// and the recording replays to the same wood; random hands never fill the store; the dotted jump is
// the jump she makes with the load she carries; a tree is shaken from its trunk by the big button or a
// finger held on it; a cheekful taken onto the door goes down, runs to the room and empties there, and
// up brings her out; Action fills a room, takes one back and lightens a load; the squirrel and the hawk never lose food for good; a splash keeps her cheekful; the snow
// ends a round; the free woodland's store is kept; the state survives JSON; and every frame draws only
// the shelf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { stepRunner } from "../../../engine/motion/walker";
import { SHELF_IDS } from "./shelf";
import {
    CHEEKS,
    CHIP_LEVELS,
    G,
    RATE,
    act,
    arcOf,
    branchAt,
    chipFrame,
    chipmunkGame,
    hidden,
    stepOf,
    tunnelAt,
    movesOf,
    roomAt,
    startChip,
    stepChip,
    worldOf,
    worth,
    type ChipState,
} from "../chipmunk";
import { chipWay, replay } from "../chipmunk-challenges";

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

function hold(s: ChipState, dirs: Dir[], steps: number): void {
    for (let i = 0; i < steps; i++) {
        const p = emptyPad();
        p.holding = [...dirs];
        p.held = dirs[dirs.length - 1] ?? null;
        if (i === 0) p.pressed = [...dirs];
        stepChip(s, p);
    }
}

/** Every acorn and pinecone there is: hanging, falling, lying, carried, stored or held by the squirrel. */
function food(s: ChipState): number {
    const loose = s.nuts.filter((n) => n.at !== "gone").length;
    const stored = s.rooms.reduce((n, r) => n + r.acorns + r.pinecones, 0);
    const had = (s.V.has ?? []).reduce((n, x) => n + x, 0);
    return loose + s.cheeks.length + stored - had + (s.squirrel?.carry.length ?? 0);
}

test("every level and variation is played to the end by the keys and by a finger, and each recording replays to the same wood", () => {
    for (const [phase, L] of CHIP_LEVELS.entries()) {
        if (L.free) continue;
        for (let v = 0; v < L.variants.length; v++)
            for (const hands of ["keys", "touch"] as const) {
                const c = { phase, variant: v };
                const acts = chipWay(c, hands);
                assert.ok(acts, `${L.title}, variation ${v}, by ${hands}: not finished`);
                const a = replay(c, acts),
                    b = replay(c, acts);
                assert.ok(a.won, `${L.title}, variation ${v}, by ${hands}: the replay is not won`);
                assert.ok(a.steps <= RATE * (L.time ?? 600), `${L.title}: after the snow`);
                assert.equal(
                    JSON.stringify(a),
                    JSON.stringify(b),
                    `${L.title}: not the same twice`,
                );
            }
    }
});

test("random hands never fill the store right in two minutes", () => {
    for (const [phase, L] of CHIP_LEVELS.entries()) {
        if (L.free) continue;
        let wins = 0;
        for (let k = 0; k < 12; k++) {
            let seed = 9173 + k * 7919 + phase * 104729;
            const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
            const s = startChip(phase, k % L.variants.length);
            let pad = emptyPad();
            for (let n = 0; n < RATE * 120 && !s.won && !s.out; n++) {
                if (n % 12 === 0) {
                    pad = emptyPad();
                    const d: Dir[] = [];
                    const a = rand(),
                        b = rand();
                    if (a < 0.35) d.push("right");
                    else if (a < 0.7) d.push("left");
                    if (b < 0.2) d.push("up");
                    else if (b < 0.4) d.push("down");
                    pad.holding = d;
                    pad.held = d[d.length - 1] ?? null;
                    pad.pressed = [...d];
                    if (rand() < 0.25) {
                        pad.go = true;
                        pad.tapped = true;
                    }
                    if (rand() < 0.15) act(s);
                }
                stepChip(s, kept(pad));
                pad.tapped = false;
                pad.pressed = [];
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 1, `${L.title}: random hands filled it ${wins} times in 12`);
    }
});

test("the dotted jump is the jump she makes, with the load she carries", () => {
    for (const load of [0, 3, 6]) {
        const s = startChip(0, 0);
        for (let i = 0; i < load; i++) s.cheeks.push({ food: "acorn", nut: -1 });
        const dots = arcOf(s),
            r = structuredClone(s.r),
            m = movesOf(load),
            c = worldOf(s.L).course,
            path: { x: number; y: number }[] = [];
        r.vx = r.facing * m.speed;
        stepRunner(r, { run: r.facing, jump: true, jumped: true }, c, m, 1 / RATE);
        for (let n = 1; n < RATE * 1.4; n++) {
            const ran = stepRunner(r, { run: r.facing, jump: true, jumped: false }, c, m, 1 / RATE);
            if (n % 4 === 0) path.push({ x: r.x, y: r.y - 0.5 });
            if (ran.includes("landed")) break;
        }
        assert.deepEqual(dots, path, `a load of ${load}`);
        const top = Math.min(...dots.map((d) => d.y));
        assert.ok(G - top > (load === 6 ? 1.2 : 2), `a load of ${load} rises ${G - top}`);
    }
    const light = arcOf(startChip(0, 0)),
        heavy = startChip(0, 0);
    for (let i = 0; i < CHEEKS; i++) heavy.cheeks.push({ food: "acorn", nut: -1 });
    assert.ok(Math.min(...arcOf(heavy).map((d) => d.y)) > Math.min(...light.map((d) => d.y)) + 1);
});

test("the big button and the down arrow shake a tree from its trunk, and the big button reads Shake only there", () => {
    const s = startChip(0, 0);
    assert.equal(chipmunkGame.goLabel?.(s), "Jump");
    s.r.x = 12.6;
    assert.equal(chipmunkGame.goLabel?.(s), "Shake");
    assert.equal(chipmunkGame.goIcon?.(s), "shake");
    const hung = s.nuts.filter((n) => n.at === "hang").length;
    for (let i = 0; i < RATE * 1.2; i++) {
        const p = emptyPad();
        p.go = true;
        p.tapped = i === 0;
        stepChip(s, p);
    }
    assert.ok(s.nuts.filter((n) => n.at === "hang").length < hung, "acorns came down");
    assert.equal(branchAt(s), -1, "she never left the ground");
    assert.equal(s.r.y, G);
    const keys = startChip(0, 0);
    keys.r.x = 13.8;
    hold(keys, ["down"], RATE * 1.2);
    assert.ok(keys.nuts.filter((n) => n.at === "hang").length < hung, "the down arrow shakes too");
});

test("a finger held on the tree runs her to its trunk and shakes it for as long as it stays", () => {
    const s = startChip(0, 0);
    const t = s.L.trees[0];
    assert.ok(t);
    const hung = s.nuts.filter((n) => n.at === "hang").length;
    for (let i = 0; i < RATE * 3; i++) {
        const p = emptyPad();
        p.touch = { x: t.x, y: t.branch.y - 2 };
        stepChip(s, p);
    }
    assert.ok(Math.abs(s.r.x - t.x) <= 1.4, `she is at the trunk, ${s.r.x}`);
    assert.equal(s.r.y, G, "and on the ground, not up on the branch");
    assert.ok(s.nuts.filter((n) => n.at === "hang").length < hung, "and acorns came down");
});

test("a cheekful walked onto the door goes down it, runs to the room and empties there, and up brings her out", () => {
    const s = startChip(0, 0);
    s.r.x = 18;
    for (let i = 0; i < CHEEKS; i++) s.cheeks.push({ food: "acorn", nut: -1 });
    assert.equal(stepOf(s), 2);
    for (let i = 0; i < RATE * 2 && tunnelAt(s) < 0; i++) hold(s, ["right"], 1);
    assert.ok(tunnelAt(s) >= 0 || s.diving, "the door took her down");
    for (let i = 0; i < RATE * 6 && !s.won; i++) stepChip(s, emptyPad());
    assert.equal(
        worth(s.rooms[0] ?? { acorns: 0, pinecones: 0 }),
        6,
        "her cheeks emptied in the room",
    );
    assert.ok(s.won);
    const up = startChip(0, 0);
    up.r.x = 26;
    up.r.y = 16;
    const p = emptyPad();
    p.pressed = ["up"];
    p.holding = ["up"];
    stepChip(up, p);
    for (let i = 0; i < RATE * 5 && tunnelAt(up) >= 0; i++) stepChip(up, emptyPad());
    assert.equal(tunnelAt(up), -1, "a press of up in the burrow brings her out");
});

test("a tap on the door takes her down with what she carries, and what is taken back is not emptied again until she moves", () => {
    const s = startChip(0, 0);
    s.r.x = 16;
    s.cheeks.push({ food: "acorn", nut: -1 }, { food: "acorn", nut: -1 });
    const tap = (x: number, y: number) => {
        const down = emptyPad();
        down.touch = { x, y };
        stepChip(s, down);
        const lift = emptyPad();
        lift.lifted = { x, y };
        stepChip(s, lift);
    };
    tap(22, 11.6);
    for (let i = 0; i < RATE * 6 && s.cheeks.length; i++) stepChip(s, emptyPad());
    assert.equal(worth(s.rooms[0] ?? { acorns: 0, pinecones: 0 }), 2, "two went into the room");
    const over = startChip(0, 0);
    over.r.x = 26.5;
    over.r.y = 16;
    over.rooms[0] = { acorns: 8, pinecones: 0 };
    act(over);
    for (let i = 0; i < RATE; i++) stepChip(over, emptyPad());
    assert.equal(
        worth(over.rooms[0] ?? { acorns: 0, pinecones: 0 }),
        7,
        "the one taken back stays in her cheeks",
    );
    assert.equal(over.cheeks.length, 1);
});

test("Action empties the cheeks into the room she stands in, takes one back from a room with too many, and outside spits one out", () => {
    const s = startChip(0, 0);
    const out = startChip(0, 0);
    out.cheeks.push({ food: "acorn", nut: -1 }, { food: "acorn", nut: -1 });
    act(out);
    assert.equal(out.cheeks.length, 1, "outside, one is spat out");
    assert.equal(out.nuts.filter((n) => n.at === "air").length, 1, "and it is in the air");
    s.r.x = 28.5;
    s.r.y = 16;
    assert.equal(roomAt(s), 0);
    for (let i = 0; i < 8; i++) s.cheeks.push({ food: "acorn", nut: -1 });
    act(s);
    assert.equal(s.cheeks.length, 0);
    assert.equal(worth(s.rooms[0] ?? { acorns: 0, pinecones: 0 }), 8);
    assert.match(s.said, /2 too many/);
    act(s);
    act(s);
    assert.equal(s.cheeks.length, 2);
    assert.equal(worth(s.rooms[0] ?? { acorns: 0, pinecones: 0 }), 6);
    for (let i = 0; i < RATE; i++) stepChip(s, emptyPad());
    assert.ok(s.won, "six in a room that wants six wins");
    assert.equal(chipmunkGame.ended?.(s)?.won, true);
});

test("the squirrel carries off food left lying and leaves it by its tree, and running at it makes it drop what it has", () => {
    const s = startChip(3, 0);
    const before = food(s);
    // shake the left oak's branch hard and walk away, so food lies unwatched
    s.r.x = 12;
    s.r.y = G;
    hold(s, ["up"], 60);
    hold(s, ["down"], 90);
    // off the branch to the far side of the tree from the squirrel, out of its way
    hold(s, ["left"], 150);
    const q = s.squirrel;
    assert.ok(q);
    let carried = false;
    for (let i = 0; i < RATE * 40; i++) {
        stepChip(s, emptyPad());
        if (q.carry.length) carried = true;
        assert.equal(food(s), before, "no food is lost");
    }
    assert.ok(carried, "it took some");
    assert.ok(
        s.nuts.some((n) => n.at === "rest" && Math.abs(n.x - (s.L.squirrel?.home ?? 0)) < 1.5),
        "and left it by its tree",
    );
    // caught carrying: it drops it where it is
    const t = startChip(3, 0);
    t.nuts.forEach((n, k) => {
        if (k < 3) Object.assign(n, { at: "rest", x: 50 + k * 0.3, y: G });
    });
    t.r.x = 20;
    for (let i = 0; i < RATE * 20 && !(t.squirrel?.carry.length ?? 0); i++) stepChip(t, emptyPad());
    const sq = t.squirrel;
    assert.ok(sq && sq.carry.length);
    t.r.x = sq.x - 1.5;
    t.r.y = G;
    stepChip(t, emptyPad());
    assert.equal(sq.mode, "flee");
    assert.equal(sq.carry.length, 0);
    assert.match(t.said, /drops the acorns/);
});

test("the hawk's shadow makes her drop her cheekful in the open, all of it there to pick up again, and passes her by in a hollow log", () => {
    const open = startChip(5, 0);
    for (let i = 0; i < 4; i++) open.cheeks.push({ food: "acorn", nut: -1 });
    open.r.x = 30;
    const before = food(open);
    for (let i = 0; i < RATE * 20 && open.cheeks.length; i++) stepChip(open, emptyPad());
    assert.equal(open.cheeks.length, 0, "dropped");
    assert.equal(food(open), before, "nothing lost");
    for (let i = 0; i < RATE * 2; i++) stepChip(open, emptyPad());
    assert.ok(open.nuts.filter((n) => n.at === "rest").length >= 4, "lying there to pick up");
    const log = startChip(5, 0);
    for (let i = 0; i < 4; i++) log.cheeks.push({ food: "acorn", nut: -1 });
    log.r.x = log.L.logs[0]?.x ?? 0;
    assert.ok(hidden(log));
    for (let i = 0; i < RATE * 30; i++) stepChip(log, emptyPad());
    assert.equal(log.cheeks.length, 4, "kept in the log");
});

test("full cheeks fall short of the long jump over the stream, splash, and are put back on dry ground with every acorn still carried", () => {
    for (const [load, makes] of [
        [6, false],
        [3, true],
    ] as const) {
        const s = startChip(2, 0);
        for (let i = 0; i < load; i++) s.cheeks.push({ food: "acorn", nut: -1 });
        s.r.x = 33.4;
        s.r.y = G;
        let splashed = false;
        for (let i = 0; i < RATE * 3; i++) {
            const p = emptyPad();
            const edge =
                worldOf(s.L).course.floor(s.r.x - 0.35, s.r.y - 0.35, s.r.y + 0.35) === null;
            p.holding = ["left"];
            p.held = "left";
            if (edge && s.r.x < 32.5 && s.r.state === "run") {
                p.go = true;
                p.tapped = true;
            } else p.go = s.r.vy < 0;
            stepChip(s, p);
            if (s.splash > 0) splashed = true;
            if (s.r.x < 28.6 && s.r.y === G) break;
        }
        assert.equal(!splashed, makes, `a load of ${load}`);
        assert.equal(s.cheeks.length, load, "nothing lost in the water");
    }
});

test("the first snow ends a round that is not done, and says how far the store is from right", () => {
    const s = startChip(7, 0);
    for (let i = 0; i < RATE * ((s.L.time ?? 0) + 1); i++) stepChip(s, emptyPad());
    const end = chipmunkGame.ended?.(s);
    assert.equal(end?.won, false);
    assert.match(end?.words ?? "", /first snow/);
});

test("the free woodland keeps its store between visits, and its branches grow their acorns back", () => {
    const L = chipmunkGame.saves?.level ?? -1;
    const s = chipmunkGame.start(L);
    assert.ok(s.L.free);
    s.rooms[0] = { acorns: 7, pinecones: 1 };
    const saved = chipmunkGame.checkpoint?.(s);
    const t = chipmunkGame.start(L);
    assert.ok(chipmunkGame.restore?.(t, JSON.parse(JSON.stringify(saved))));
    assert.deepEqual(t.rooms[0], { acorns: 7, pinecones: 1 });
    assert.equal(chipmunkGame.restore?.(t, { rooms: [{ acorns: -1 }] }), false);
    const hung = t.nuts.filter((n) => n.at === "hang").length;
    t.nuts.forEach((n) => {
        if (n.at === "hang") n.at = "gone";
    });
    for (let i = 0; i < RATE * 30; i++) stepChip(t, emptyPad());
    const back = t.nuts.filter((n) => n.at === "hang").length;
    assert.ok(back >= 4 && back <= hung, `${back} grew back`);
    assert.equal(chipmunkGame.won(t), false);
});

test("the state survives JSON, and stepping a copy goes the same way", () => {
    const s = startChip(4, 1);
    hold(s, ["left"], 90);
    hold(s, ["up"], 60);
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s, "nothing but plain data");
    const copy = structuredClone(s);
    for (const x of [s, copy]) hold(x, ["down"], 90);
    for (const x of [s, copy]) hold(x, ["right"], 120);
    assert.equal(JSON.stringify(copy), JSON.stringify(s));
});

test("every frame of every level draws only drawings on the shelf", () => {
    for (const [phase, L] of CHIP_LEVELS.entries()) {
        const s = startChip(phase, 0);
        const frames = [chipFrame(s), chipFrame(s, true)];
        hold(s, ["right"], 120);
        frames.push(chipFrame(s));
        if (!L.free) {
            const acts = chipWay({ phase, variant: 0 }, "keys") ?? [];
            const r = replay({ phase, variant: 0 }, acts.slice(0, Math.floor(acts.length / 2)));
            frames.push(chipFrame(r));
        }
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${L.title}: ${sp.key} asks for ${sp.art}`);
    }
});

test("one tap on the oak runs there and shakes down a useful batch without a hold", () => {
    const s = startChip(0);
    stepChip(s, { ...emptyPad(), touch: { x: 13, y: 7 } });
    stepChip(s, { ...emptyPad(), lifted: { x: 13, y: 7 } });
    for (let i = 0; i < RATE * 4; i++) stepChip(s, emptyPad());
    assert.ok(s.nuts.filter((n) => n.at !== "hang").length >= 6);
    assert.equal(s.r.y, G);
});
