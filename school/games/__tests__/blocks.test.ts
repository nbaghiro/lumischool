// A home for the pups: every level and every variation is built by driving the crane, stands when the
// wolf huffs and is moved into, and its pads replay to the same win; a swinging block lands wide and a
// steady one lands under the hook; thin walls fall to the wolf and come back as they were built.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    BLOCKS,
    BLOCKS_LEVELS,
    blocksGame,
    inPile,
    loadPose,
    measure,
    type BlocksState,
} from "../blocks";
import {
    blocksChallenge,
    blocksWay,
    build,
    isBlocksConfiguration,
    openBlocksConfiguration,
    planFor,
    replay,
    type Drop,
} from "../blocks-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

const LIMIT = 60 * 60;

function tick(s: BlocksState, pad: Pad): void {
    blocksGame.step(s, pad);
    spent(pad);
}
function idle(s: BlocksState, n: number, until: () => boolean = () => false): void {
    for (let i = 0; i < n && !until(); i++) tick(s, emptyPad());
}
const still = (s: BlocksState) =>
    Math.abs(s.crane.v) < 0.02 && Math.abs(s.crane.angle) < 0.003 && Math.abs(s.crane.spin) < 0.01;
/** Holds a finger over `x` until the crane is there, and for `more` steps after. */
function steer(s: BlocksState, x: number, more = 0): void {
    const pad = emptyPad();
    pad.touch = { x, y: 3 };
    for (let i = 0; i < 900 && Math.abs(s.crane.x - x) > 0.01; i++) tick(s, pad);
    for (let i = 0; i < more; i++) tick(s, pad);
}
function lift(s: BlocksState, x: number): void {
    tick(s, { ...emptyPad(), lifted: { x, y: 3 } });
}
const where = (s: BlocksState, i: number) => {
    const b = s.blocks[i]?.body;
    assert.ok(b, `block ${i} is on the site`);
    return s.physics.where(b);
};
const places = (s: BlocksState) =>
    s.blocks.map((b) => {
        if (!b.body) return null;
        const at = s.physics.where(b.body);
        return [at.x, at.y, at.angle].map((v) => Math.round(v * 1e6) / 1e6);
    });

test("every level and every variation is built by driving the crane, and it stands to the wolf and is moved into", () => {
    BLOCKS_LEVELS.forEach((L, phase) => {
        const seen = new Set<number>();
        for (let seed = 0; seed < 8; seed++) {
            const c = blocksChallenge(seed, phase);
            if (seen.has(c.n)) continue;
            seen.add(c.n);
            assert.ok(isBlocksConfiguration(c, phase));
            assert.ok(!isBlocksConfiguration({ ...c, n: c.n + 100 }, phase));
            const pads = blocksWay(c);
            assert.ok(pads, `${L.title} with ${c.n} was not built`);
        }
    });
});

test("the pads that built a house replay to the same win, block for block", () => {
    const c = { phase: 6, n: 3 };
    const first = openBlocksConfiguration(c),
        pads = build(first, planFor(first.L));
    assert.ok(pads);
    const again = openBlocksConfiguration(c);
    assert.ok(replay(again, pads));
    assert.deepEqual(places(again), places(first));
});

test("a house is built with the keys alone: arrows drive the crane, B turns a block, and space drops it", () => {
    for (const c of [
        { phase: 0, n: 2 },
        { phase: 2, n: 6 },
    ])
        assert.ok(blocksWay(c, "keys"), `level ${c.phase} was not built by the keys`);
});

test("a block dropped while it still swings lands wide of the crane, and one dropped when the swing has died lands under it", () => {
    const hasty = blocksGame.start(0);
    steer(hasty, 34);
    const off = (loadPose(hasty)?.x ?? 34) - 34;
    assert.ok(Math.abs(off) > 0.3, `the stop swung it ${off} from the crane`);
    lift(hasty, 34);
    idle(hasty, 300, () => !hasty.changed);
    assert.ok(Math.abs(where(hasty, 0).x - 34) > 0.3, `landed at ${where(hasty, 0).x}`);

    const steady = blocksGame.start(0);
    steer(steady, 34);
    for (let i = 0; i < 900 && !still(steady); i++)
        tick(steady, { ...emptyPad(), touch: { x: 34, y: 3 } });
    lift(steady, 34);
    idle(steady, 300, () => !steady.changed);
    assert.ok(Math.abs(where(steady, 0).x - 34) < 0.08, `landed at ${where(steady, 0).x}`);
});

test("a block dropped a hair from its neighbour meets it, and one dropped further off does not", () => {
    const s = blocksGame.start(0);
    const drop = (x: number) => {
        idle(s, 120, () => s.crane.fetch <= 0 && s.crane.load !== null);
        steer(s, x, 20);
        for (let i = 0; i < 900 && !still(s); i++) tick(s, { ...emptyPad(), touch: { x, y: 3 } });
        lift(s, x);
        idle(s, 600, () => !s.changed && s.calm >= 20);
    };
    drop(34);
    drop(35.2);
    const gap = where(s, 1).x - where(s, 0).x;
    assert.ok(Math.abs(gap - 1) < 0.1, `met ${gap} along`);
    drop(38.5);
    assert.ok(Math.abs(where(s, 2).x - 38.5) < 0.05, "a gap of a square and a half stays");
});

test("a tap on a block in the pile hangs it on the hook, the keys choose too, and only a block turns", () => {
    const L = BLOCKS_LEVELS.findIndex((l) => l.pile.includes("roof"));
    const s = blocksGame.start(L);
    assert.equal(s.crane.load, 0);
    const roof = s.L.pile.indexOf("roof"),
        home = s.blocks[roof]?.home;
    assert.ok(home);
    tick(s, { ...emptyPad(), touch: { ...home } });
    tick(s, { ...emptyPad(), lifted: { ...home } });
    assert.equal(s.crane.load, roof, "the roof hangs");
    assert.equal(s.blocks[roof]?.body, null, "and nothing was dropped");
    assert.ok(inPile(s).includes(0), "the cube went back to the pile");
    tick(s, { ...emptyPad(), brake: true });
    tick(s, emptyPad());
    assert.equal(s.crane.turned, false, "a roof hangs one way up");
    tick(s, { ...emptyPad(), pressed: ["down"] });
    const brick = s.crane.load === null ? undefined : s.blocks[s.crane.load];
    assert.equal(brick?.kind, "brick");
    const wide = loadPose(s);
    tick(s, { ...emptyPad(), brake: true });
    tick(s, emptyPad());
    assert.equal(s.crane.turned, true);
    assert.ok(wide && Math.abs((loadPose(s)?.angle ?? 0) - Math.PI / 2) < 0.2);
});

test("two fingers turn the hanging block a quarter turn, a pinch zooms, and lifting them does not drop it", () => {
    const s = blocksGame.start(2),
        pad = emptyPad();
    pad.touch = { x: 40, y: 3 };
    tick(s, pad);
    for (let k = 0; k < 40; k++) {
        pad.intents = [{ kind: "turn", by: (Math.PI / 2 + 0.2) / 40 }];
        tick(s, pad);
    }
    assert.equal(s.crane.turned, true);
    pad.touch = null;
    pad.lifted = { x: 40, y: 3 };
    tick(s, pad);
    assert.equal(s.blocks.filter((b) => b.body).length, 0, "lifting two fingers dropped nothing");
    const z = blocksGame.start(0);
    assert.equal(blocksGame.frame(z, true).camera.zoom, 1);
    tick(z, { ...emptyPad(), intents: [{ kind: "zoom", by: 1.5 }] });
    assert.equal(blocksGame.frame(z, true).camera.zoom, 1.5);
    tick(z, { ...emptyPad(), intents: [{ kind: "zoom", by: 4 }] });
    assert.equal(blocksGame.frame(z, true).camera.zoom, 1.8);
    tick(z, { ...emptyPad(), intents: [{ kind: "zoom", by: 0.1 }] });
    assert.equal(blocksGame.frame(z, true).camera.zoom, 1);
});

test("a job not yet done is measured and said, and the wolf does not come", () => {
    const s = blocksGame.start(0);
    const plan = planFor(s.L).slice(0, 4);
    assert.equal(build(s, plan), null);
    assert.equal(s.phase, "build");
    assert.match(measure(s).text, /no room under a roof/);
    idle(s, 300);
    assert.equal(s.phase, "build");
});

test("thin walls fall to the wolf on the windy hill, come back as they were built, and he waits for a change", () => {
    const level = BLOCKS_LEVELS.findIndex((L) => L.job.kind === "area");
    const s = blocksGame.start(level);
    const c = (s.L.site.a + s.L.site.b) / 2;
    const thin: Drop[] = [
        { kind: "brick", x: c - 1.5, turned: true },
        { kind: "cube", x: c - 1.5 },
        { kind: "brick", x: c + 1.5, turned: true },
        { kind: "cube", x: c + 1.5 },
        { kind: "plank4", x: c },
    ];
    assert.equal(build(s, thin), null);
    const built = places(s);
    assert.equal(s.tries, 1, "the wolf blew it down");
    idle(s, 200, () => s.phase === "build");
    assert.equal(s.phase, "build");
    assert.deepEqual(places(s), built, "it came back as it was built");
    idle(s, 400);
    assert.equal(s.tries, 1, "he does not come again for the same house");
    assert.ok(blocksGame.back?.(s));
    idle(s, 60);
    assert.ok(s.ready, "taking a block back is a change");
});

test("dropping blocks anywhere rarely does the job", () => {
    let wins = 0,
        tries = 0;
    BLOCKS_LEVELS.forEach((L, level) => {
        for (let seed = 1; seed <= 2; seed++) {
            const rng = seeded(seed * 31 + level);
            const s = blocksGame.start(level);
            for (let k = 0; k < L.pile.length; k++) {
                const x = L.site.a + rng() * (L.site.b - L.site.a);
                steer(s, x, Math.floor(rng() * 40));
                lift(s, x);
                idle(s, 90);
            }
            idle(s, LIMIT, () => s.won || (!blocksGame.still.settling?.(s) && s.phase === "build"));
            tries++;
            if (s.won) wins++;
        }
    });
    assert.ok(wins * 5 <= tries, `${wins} of ${tries} random houses did the job`);
});

test("once the house with a door stands, the wolf walks off, the family walks in one after another and the camera comes in", () => {
    const level = BLOCKS_LEVELS.findIndex((L) => L.job.kind === "house" && L.job.door);
    const s = blocksGame.start(level);
    const poses = new Set<string>(),
        wolf = new Set<string>();
    let steps = 0;
    const pads = build(s, planFor(s.L));
    assert.ok(pads);
    const again = blocksGame.start(level);
    for (const p of pads) {
        blocksGame.step(again, { ...p, pressed: [...p.pressed], holding: [...p.holding] });
        steps++;
        if (again.phase === "huff" || again.phase === "movein")
            for (const sp of blocksGame.frame(again).sprites) {
                if (sp.key === "wolf") wolf.add(String(sp.params?.pose));
                if (sp.key.startsWith("pup:") && again.phase === "movein")
                    poses.add(String(sp.params?.pose));
            }
    }
    assert.ok(steps > 0 && again.won);
    for (const pose of ["walk", "huff", "blow"]) assert.ok(wolf.has(pose), `the wolf was ${pose}`);
    assert.ok(poses.has("walk"), "the family walked");
    const room = measure(again).marks.find((m) => m.kind === "line" && m.head);
    assert.ok(room && room.kind === "line");
    for (const sp of blocksGame.frame(again).sprites)
        if (sp.key.startsWith("pup:"))
            assert.ok(sp.x > room.a.x && sp.x < room.b.x, `${sp.key} is inside, at ${sp.x}`);
    assert.ok(again.cam.zoom > 1.05, `the camera came in to ${again.cam.zoom}`);
    idle(again, 600);
    assert.ok(!blocksGame.frame(again).sprites.some((sp) => sp.key === "wolf"), "he is gone");
});

test("over the pond the family hops up onto the floor on stilts", () => {
    const level = BLOCKS_LEVELS.findIndex((L) => L.water && L.job.kind === "room");
    const s = blocksGame.start(level);
    const water = s.L.water;
    assert.ok(water);
    assert.ok(build(s, planFor(s.L)));
    const ys = s.family.map((f) => f.r.y);
    assert.ok(
        ys.every((y) => y <= water.y - 2 + 0.1),
        `the pups stand at ${ys.join(", ")}`,
    );
});

test("three rooms are counted, and two are not enough", () => {
    const level = BLOCKS_LEVELS.findIndex((L) => L.job.kind === "rooms");
    const s = blocksGame.start(level);
    assert.equal(build(s, planFor(s.L).slice(0, 2)), null);
    assert.match(measure(s).text, /There are 2 rooms 2 squares wide\. Pip wants 3\./);
    assert.equal(measure(s).ok, false);
});

test("the world runs past every side of the view, with ground under all of it", () => {
    BLOCKS_LEVELS.forEach((L, level) => {
        const f = blocksGame.frame(blocksGame.start(level));
        assert.ok(f.world.w >= f.view.w * 1.8 && f.world.h > f.view.h, L.title);
        const covered = [...L.ground].sort((a, b) => a.x - b.x);
        let x = 0;
        for (const g of covered) {
            assert.ok(Math.abs(g.x - x) < 1e-9, `${L.title}: ground starts again at ${g.x}`);
            x = g.x + g.w;
        }
        assert.ok(Math.abs(x - f.world.w) < 1e-9, `${L.title}: ground ends at ${x}`);
    });
});

test("every drawing it names is on the shelf, its tuning is sound, and it says no dashes", () => {
    const seen = new Set<string>([blocksGame.cover.art]);
    const c = {
        phase: BLOCKS_LEVELS.findIndex((L) => L.job.kind === "house" && L.job.door),
        n: 5.5,
    };
    const s = openBlocksConfiguration(c),
        pads = build(s, planFor(s.L));
    assert.ok(pads);
    const again = openBlocksConfiguration(c);
    for (const p of pads) {
        blocksGame.step(again, { ...p, pressed: [...p.pressed], holding: [...p.holding] });
        if (again.steps % 30 === 0)
            for (const sp of blocksGame.frame(again).sprites) seen.add(sp.art);
    }
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    for (const art of ["wolf", "crane", "woodblock", "pupfamily"]) assert.ok(seen.has(art), art);
    for (const L of BLOCKS_LEVELS)
        assert.ok(!/[—!]/.test(`${L.goal} ${L.prompt} ${L.brief.join(" ")} ${blocksGame.hint}`));
    assert.deepEqual(faults(BLOCKS), []);
});

test("the wolf's breath is heard only while he huffs, and a still frame shows no gust or guide", () => {
    const level = BLOCKS_LEVELS.findIndex((L) => L.job.kind === "tower");
    assert.deepEqual(blocksGame.hum?.(blocksGame.start(level)), []);
    const heard: number[] = [];
    let gusts = 0;
    const pads = blocksWay({ phase: level, n: 6 }) ?? [];
    const again = openBlocksConfiguration({ phase: level, n: 6 });
    for (const p of pads) {
        blocksGame.step(again, { ...p, pressed: [...p.pressed], holding: [...p.holding] });
        const hum = blocksGame.hum?.(again) ?? [];
        if (hum.length) heard.push(again.steps);
        if (again.phase === "huff") {
            const still = blocksGame.frame(again, true);
            assert.ok(!still.marks.some((m) => m.kind === "line" && m.bend !== undefined));
            gusts += blocksGame
                .frame(again)
                .marks.filter((m) => m.kind === "line" && m.bend).length;
        }
    }
    assert.ok(heard.length > 0, "his breath was heard");
    assert.ok(gusts > 0, "his gust was drawn");
    assert.ok(blocksGame.sounds?.creak, "blocks creak");
});
