// Rescue pups: every variation of every level is won by the driver's pads through the real game, and
// those pads replay to the same state; each mission's own rule holds (an empty tank fills again, an
// overloaded truck tips back, a pad that is not the one asked for is refused, a missed ring comes
// back); random play rarely wins; and the frame draws only shelf drawings and reaches past the view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    BED,
    GROUND,
    RESCUE,
    RESCUE_LEVELS,
    THROW,
    padX,
    rescueGame,
    startLevel,
    type RescueState,
} from "../rescue";
import {
    RESCUE_VARIANTS,
    driver,
    isRescueConfiguration,
    openRescueConfiguration,
    rescueChallenge,
    rescueWay,
} from "../rescue-challenges";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";

const RATE = rescueGame.rate;

const level = (i: number) => {
    const L = RESCUE_LEVELS[i];
    assert.ok(L, `level ${i}`);
    return L;
};

const tick = (s: RescueState, p: Pad) =>
    rescueGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** Steps with nothing pressed until the pup is in its seat. */
function board(s: RescueState) {
    for (let i = 0; i < RATE * 6 && !s.crew.aboard; i++) tick(s, emptyPad());
    assert.ok(s.crew.aboard, "the pup reaches its vehicle");
}

const signature = (s: RescueState) =>
    JSON.stringify({ won: s.won, steps: s.steps, stage: s.stage, st: s.st, crew: s.crew });

test("every variation of every level is won by the driver's pads, and the pads replay to the same rescue", () => {
    for (let phase = 0; phase < RESCUE_LEVELS.length; phase++)
        for (let variant = 0; variant < RESCUE_VARIANTS; variant++) {
            const c = { phase, variant };
            const pads = rescueWay(c);
            assert.ok(pads, `level ${phase} variation ${variant} has a way`);
            const a = openRescueConfiguration(c),
                b = openRescueConfiguration(c);
            const events: string[] = [];
            for (const p of pads) {
                for (const h of tick(a, p)) if ("event" in h) events.push(h.event.kind);
                tick(b, p);
            }
            assert.ok(a.won, `level ${phase} variation ${variant} is won`);
            assert.equal(signature(a), signature(b));
            assert.ok(events.includes("won") && events.includes("checkpoint"));
            const o = rescueGame.objectives?.(a);
            assert.ok(o && o.completed === o.total && o.total > 0);
        }
});

test("an empty tank fills again with the fires back as they were, and says how much fire was left", () => {
    const s = startLevel(level(0));
    board(s);
    const st = s.st;
    assert.equal(st.kind, "fire");
    if (st.kind !== "fire") return;
    // spray straight up and let it all fall back on the truck
    st.angle = -1.35;
    st.power = 8;
    for (let i = 0; i < RATE * 8 && st.tank > 0; i++) tick(s, { ...emptyPad(), go: true });
    const out = [];
    for (let i = 0; i < RATE * 3 && st.tank < st.L.tank; i++) out.push(...tick(s, emptyPad()));
    assert.equal(st.tank, st.L.tank, "the tank is full again");
    assert.ok(out.some((h) => "cue" in h && h.cue === "back"));
    assert.match(s.note, /tank ran dry/);
    assert.ok(st.fires.every((f, i) => f.need === st.L.fires[i]?.need));
});

test("a truck loaded past its load tips the last rock back onto the road, and a load of exactly its size goes away", () => {
    const s = startLevel(level(2));
    board(s);
    const d = s.st;
    assert.equal(d.kind, "dig");
    if (d.kind !== "dig") return;
    const drop = (t: number) => {
        const r = d.rocks.find((x) => x.t === t && x.at === "ground");
        assert.ok(r);
        r.at = "air";
        r.x = (BED.x0 + BED.x1) / 2;
        r.y = BED.rim - 3;
        r.vx = r.vy = 0;
        for (let i = 0; i < RATE && r.at === "air"; i++) tick(s, emptyPad());
        return r;
    };
    drop(3);
    const five = drop(5);
    assert.equal(five.at, "ground", "3 and 5 make 8, so the 5 comes back out");
    assert.equal(d.load, 3);
    assert.match(s.note, /more than 5/);
    const two = drop(2);
    assert.equal(two.at, "truck");
    assert.ok(d.away > 0, "exactly 5 tonnes, and the truck takes it away");
});

test("the helicopter lands someone only on the pad they were asked for", () => {
    const s = startLevel(level(1));
    board(s);
    for (let i = 0; i < RATE * 2; i++) tick(s, emptyPad());
    const a = s.st;
    assert.equal(a.kind, "air");
    if (a.kind !== "air") return;
    a.carrying = 0;
    const wrong = a.L.pads.findIndex((n) => n !== a.L.stranded[0]?.pad);
    // hang the lamb just over the wrong pad, still
    a.hx = padX(wrong) - 0.4;
    a.hvx = 0;
    a.rope = GROUND - 0.85 - 1.3 - (a.hy + 1.5) + 0.2;
    a.load = { x: padX(wrong), y: a.hy + 1.5 + a.rope, vx: 0, vy: 0 };
    for (let i = 0; i < RATE; i++) tick(s, emptyPad());
    assert.equal(a.carrying, 0, "still on the rope");
    assert.match(s.note, /goes to pad/);
});

test("a ring that floats past the swimmer is pulled back in to throw again", () => {
    const s = startLevel(level(3));
    board(s);
    const sea = s.st;
    assert.equal(sea.kind, "sea");
    if (sea.kind !== "sea") return;
    sea.angle = -0.75;
    sea.power = 4;
    tick(s, { ...emptyPad(), tapped: true });
    for (let i = 0; i < RATE * 6 && sea.ring.at !== "held"; i++) tick(s, emptyPad());
    assert.equal(sea.ring.at, "held");
    assert.equal(sea.ring.x, THROW.x);
    assert.match(s.note, /pulled back in/);
    assert.ok(sea.swimmers.every((x) => !x.saved));
});

test("random play rarely wins a level in the time the driver takes to win it", () => {
    let seed = 11;
    const rand = () => {
        seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
        return seed / 2 ** 32;
    };
    const dirs = ["up", "down", "left", "right"] as const;
    for (let phase = 0; phase < RESCUE_LEVELS.length; phase++) {
        const steps = rescueWay({ phase, variant: 0 })?.length ?? RATE * 30;
        let wins = 0;
        for (let k = 0; k < 8; k++) {
            const s = startLevel(level(phase), phase);
            let p = emptyPad();
            for (let i = 0; i < steps && !s.won; i++) {
                if (i % 20 === 0) {
                    const d = dirs[Math.floor(rand() * 4)] ?? "up";
                    p = { ...emptyPad(), holding: [d], go: rand() < 0.5, tapped: rand() < 0.3 };
                }
                tick(s, p);
                p = { ...p, tapped: false };
            }
            if (s.won) wins++;
        }
        assert.ok(wins <= 1, `level ${phase} is won by ${wins} of 8 random tries`);
    }
});

test("the frame draws only shelf drawings, the ground reaches past the world, and a rest frame shows no aid", () => {
    const seen = new Set<string>();
    for (let phase = 0; phase < RESCUE_LEVELS.length; phase++) {
        const s = openRescueConfiguration(rescueChallenge(phase, phase));
        const drive = driver();
        for (let i = 0; i < RATE * 20 && !s.won; i++) {
            tick(s, drive(s));
            if (i % 30 === 0) for (const p of rescueGame.frame(s).sprites) seen.add(p.art);
        }
        const f = rescueGame.frame(s, true);
        assert.ok(!f.marks.some((m) => m.kind === "dots"), `level ${phase} rests with no dots`);
        const ground = f.sprites.filter(
            (p) =>
                p.key.startsWith("ground:") ||
                p.key.startsWith("bank:") ||
                p.key.startsWith("bed:"),
        );
        const xs = ground.map((p) => p.x);
        assert.ok(Math.min(...xs) < -10 && Math.max(...xs) > f.world.w + 10);
    }
    seen.add(rescueGame.cover.art);
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    for (const art of [
        "firetruck",
        "rescuecopter",
        "digger",
        "diggerarm",
        "dumptruck",
        "rescueboat",
        "lifering",
        "helipad",
        "rescuebase",
        "blaze",
        "rubble",
        "pupfamily",
    ])
        assert.ok(seen.has(art), `${art} is drawn somewhere`);
});

test("under reduced motion a press settles once everything it started has stopped", () => {
    const s = startLevel(level(3));
    assert.ok(rescueGame.still.settling?.(s), "the pup is still running to the boat");
    board(s);
    assert.equal(rescueGame.still.settling?.(s), false);
    tick(s, { ...emptyPad(), tapped: true });
    assert.ok(rescueGame.still.settling?.(s), "the ring is in the air");
    for (let i = 0; i < RATE * 10 && rescueGame.still.settling?.(s); i++) tick(s, emptyPad());
    assert.equal(rescueGame.still.settling?.(s), false);
    assert.ok(rescueGame.still.press(s) >= 1);
});

test("stored layouts read back only as the variations they are", () => {
    for (let phase = 0; phase < RESCUE_LEVELS.length; phase++) {
        const c = rescueChallenge(5, phase),
            reads = (v: unknown, p: number): boolean => isRescueConfiguration(v, p);
        assert.ok(reads(c, phase));
        assert.ok(!reads(c, phase + 1));
        assert.ok(!reads({ ...c, variant: RESCUE_VARIANTS }, phase));
        assert.ok(!reads({ ...c, extra: 1 }, phase));
        assert.deepEqual(
            JSON.parse(JSON.stringify(openRescueConfiguration(c))),
            openRescueConfiguration(c),
        );
    }
});

test("its tuning is sound, its words have no dashes, and each job has its own hum", () => {
    assert.deepEqual(faults(RESCUE), []);
    for (const L of RESCUE_LEVELS)
        assert.ok(!/[—!]/.test(`${L.title} ${L.goal} ${L.prompt} ${rescueGame.hint}`));
    const hums = new Set<string>();
    for (const phase of [0, 1, 2, 3]) {
        const s = startLevel(level(phase), phase);
        assert.deepEqual(rescueGame.hum?.(s), [], "nothing hums before the pup is aboard");
        board(s);
        for (const h of rescueGame.hum?.(s) ?? []) hums.add(h.kind);
    }
    for (const kind of ["siren", "rotor", "rumble", "water"]) assert.ok(hums.has(kind), kind);
    assert.ok(RESCUE.gravity.value > 0);
});
