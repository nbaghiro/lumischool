// Gone fishing: every level and every other day is fished to its weight by hand and by the keys,
// fish come one at a time to a still bait at their own depth, a strike too soon or too late loses
// nothing but the fish, a line held too tight snaps and one reeled through the weed snags, random
// hands rarely make the weight, and the same hands catch the same fish.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import * as F from "../fishing";
import {
    FISH_CHALLENGE_COUNT,
    fishChallenge,
    isFishConfiguration,
    openFishConfiguration,
} from "../fish-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";

const DT = 1 / 60;

/** Where a cast at `power` along `angle` comes down on the water, and when. */
function landing(power: number, angle: number): { x: number; t: number } {
    const vx = Math.cos(angle) * power,
        vy = Math.sin(angle) * power,
        h = F.SEA.surface - F.TIP.y;
    const t = (-vy + Math.sqrt(vy * vy + 2 * F.G * h)) / F.G;
    return { x: F.TIP.x + vx * t, t };
}

function powerFor(x: number, angle: number): number {
    let lo = F.CAST.min,
        hi = F.CAST.max;
    for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if (landing(m, angle).x < x) lo = m;
        else hi = m;
    }
    return (lo + hi) / 2;
}

const ANGLE = -0.75;

/**
 * Fishes a round as a child who knows what they are doing would: for each fish still wanted, cast
 * ahead of it (well ahead of a shy one), set the hook to its depth, strike when the float goes under
 * for a wanted fish, reel while the fish rests and let go while it runs, ease out of the weed, and
 * throw one back when the pan cannot make the weight. With `keys`, only the keys and the big button.
 */
function fish(s: F.FishState, keys: boolean, limit = 60 * 300): void {
    const pad = emptyPad();
    const tick = (p: Pad) => {
        F.step(s, p);
        spent(p);
    };
    let idle = 0,
        aimed = -1;
    for (let n = 0; n < limit && !s.won; n++) {
        const need = F.needed(s);
        if (!need && s.pan.length && s.phase === "ready" && !s.flights.length) {
            F.back(s);
            continue;
        }
        const want = new Set((need ?? []).map((i) => s.fish[i]?.kind));
        if (s.phase === "ready" && need && need.length) {
            const f = need
                .map((i) => s.fish[i])
                .filter((x): x is F.Fish => x !== undefined && x.mood === "swim")
                .sort((a, b) => a.x - b.x)[0];
            if (!f) {
                tick(pad);
                continue;
            }
            aimed = s.fish.indexOf(f);
            const shy = s.L.kinds[f.kind]?.nature === "shy",
                T = landing(powerFor(f.x, ANGLE), ANGLE).t;
            // ahead of it on its way, or behind it where its way turns back first
            const lead = f.x + f.dir * (1.6 * T + (shy ? 5 : 0)),
                inside = lead >= f.from && lead <= f.to ? lead : f.x - f.dir * (shy ? 5 : 0);
            const aimX = Math.max(F.SEA.left + 1, Math.min(F.SEA.right - 1, inside));
            const power = powerFor(aimX, ANGLE);
            if (keys) {
                const turns = Math.round((s.aim.angle - ANGLE) / (F.CAST.turn * DT)),
                    ramps = Math.round((power - s.aim.power) / (F.CAST.ramp * DT));
                pad.holding = [turns > 0 ? "up" : "down"];
                for (let k = 0; k < Math.abs(turns); k++) tick(pad);
                pad.holding = [ramps > 0 ? "right" : "left"];
                for (let k = 0; k < Math.abs(ramps); k++) tick(pad);
                pad.holding = [];
                pad.tapped = true;
                tick(pad);
            } else {
                const pull = {
                    x: (-Math.cos(ANGLE) * power) / F.CAST.per,
                    y: (-Math.sin(ANGLE) * power) / F.CAST.per,
                };
                pad.touch = { ...F.HANG };
                tick(pad);
                pad.touch = { x: F.HANG.x + pull.x, y: F.HANG.y + pull.y };
                tick(pad);
                pad.lifted = pad.touch;
                pad.touch = null;
                tick(pad);
            }
            idle = 0;
            continue;
        }
        if (s.phase === "wait") {
            const lane = s.fish[aimed]?.lane ?? s.depth;
            if (Math.abs(s.depth - lane) > (keys ? 0.61 : 0.3)) {
                if (keys) {
                    pad.pressed.push(lane > s.depth ? "down" : "up");
                    tick(pad);
                } else {
                    pad.touch = { x: s.float.x, y: lane - 2 };
                    tick(pad);
                    pad.touch = { x: s.float.x, y: lane };
                    tick(pad);
                    pad.lifted = pad.touch;
                    pad.touch = null;
                    tick(pad);
                }
                continue;
            }
            const bite = s.fish.find((f) => f.mood === "bite");
            if (bite && want.has(bite.kind)) {
                if (keys) {
                    pad.tapped = true;
                    tick(pad);
                } else {
                    pad.touch = { x: s.float.x, y: F.SEA.surface + 3 };
                    tick(pad);
                    pad.lifted = pad.touch;
                    pad.touch = null;
                    tick(pad);
                }
                continue;
            }
            if (Math.abs(s.hook.y - s.depth) < 0.05) idle++;
            if (idle > 60 * 6) {
                pad.go = true;
                for (let k = 0; k < 300 && s.phase === "wait"; k++) tick(pad);
                pad.go = false;
                idle = 0;
                continue;
            }
            tick(pad);
            continue;
        }
        if (s.phase === "fight") {
            const f = s.fish.find((x) => x.mood === "hooked");
            if (s.snagged) {
                if (keys) pad.holding = ["down"];
                else pad.brake = true;
                pad.touch = null;
                pad.go = false;
                tick(pad);
                pad.holding = [];
                pad.brake = false;
                continue;
            }
            const reel = s.tension < 0.8 && !f?.runTo;
            if (keys) pad.go = reel;
            else pad.touch = reel ? { x: 10, y: 10 } : null;
            tick(pad);
            continue;
        }
        pad.touch = null;
        pad.go = false;
        tick(pad);
    }
}

const days = (): { title: string; start: () => F.FishState }[] =>
    F.FISH_LEVELS.flatMap((L, phase) => [
        { title: L.title, start: () => F.fishingGame.start(phase, 1) },
        ...Array.from({ length: FISH_CHALLENGE_COUNT }, (_, k) => ({
            title: `${L.title}, day ${k}`,
            start: () => openFishConfiguration(fishChallenge(k, phase)),
        })),
    ]);

test("every level can make its weight from the fish in it, within the pan", () => {
    for (const { title, start } of days()) {
        const s = start();
        assert.ok(F.needed(s), `${title}: no set of fish makes ${s.L.target}`);
        assert.ok(s.L.target <= s.L.dial.max, title);
        assert.ok(!/[—!]/.test(`${s.L.goal} ${s.L.prompt} ${s.L.done}`), title);
    }
});

test("every level and every other day is fished to its weight by hand", () => {
    for (const { title, start } of days()) {
        const s = start();
        fish(s, false);
        assert.ok(s.won, `${title}: ${F.say(s)}`);
        assert.equal(Math.round(F.total(s) * 1000) / 1000, s.L.target);
    }
});

test("every level is fished to its weight with the keys alone", () => {
    F.FISH_LEVELS.forEach((L, phase) => {
        const s = F.fishingGame.start(phase, 1);
        fish(s, true);
        assert.ok(s.won, `${L.title}: ${F.say(s)}`);
    });
});

test("fish come one at a time, to a still bait near their own depth", () => {
    const s = F.fishingGame.start(0, 1);
    const pad = emptyPad();
    pad.touch = { ...F.HANG };
    F.step(s, pad);
    spent(pad);
    pad.touch = { x: F.HANG.x - 2, y: F.HANG.y + 1.5 };
    F.step(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    for (let k = 0; k < 60 * 30; k++) {
        F.step(s, pad);
        spent(pad);
        const coming = s.fish.filter(
            (f) => f.mood === "come" || f.mood === "nibble" || f.mood === "bite",
        );
        assert.ok(coming.length <= 1, `${coming.length} fish at the bait at once`);
        for (const f of coming) assert.ok(Math.abs(f.lane - s.hook.y) < 1.5);
    }
});

/** Casts at the nearest fish and waits until one bites. */
function toBite(s: F.FishState): void {
    const pad = emptyPad();
    for (let n = 0; n < 60 * 120 && !s.fish.some((f) => f.mood === "bite"); n++) {
        if (s.phase === "ready") {
            const f = s.fish[0];
            if (!f) return;
            const power = powerFor(f.x, ANGLE);
            pad.touch = { ...F.HANG };
            F.step(s, pad);
            spent(pad);
            pad.touch = {
                x: F.HANG.x - (Math.cos(ANGLE) * power) / F.CAST.per,
                y: F.HANG.y - (Math.sin(ANGLE) * power) / F.CAST.per,
            };
            F.step(s, pad);
            spent(pad);
            pad.lifted = pad.touch;
            pad.touch = null;
        } else if (s.phase === "wait" && Math.abs(s.depth - (s.fish[0]?.lane ?? 0)) > 0.3) {
            s.depth = s.fish[0]?.lane ?? s.depth;
        }
        F.step(s, pad);
        spent(pad);
    }
}

test("a strike on the bite hooks the fish, and a fish missed three times is lost and nothing else", () => {
    const soon = F.fishingGame.start(0, 1);
    toBite(soon);
    const pad = emptyPad();
    pad.tapped = true;
    const hooked = structuredClone(soon);
    F.step(hooked, pad);
    assert.equal(hooked.phase, "fight", "a strike on the bite hooks the fish");
    const late = structuredClone(soon);
    for (let n = 0; n < 60 * 3 && late.fish.some((f) => f.mood === "bite"); n++)
        F.step(late, emptyPad());
    assert.match(late.said, /nibbling again/);
    for (let n = 0; n < 60 * 30 && !/Too slow/.test(late.said); n++) F.step(late, emptyPad());
    assert.ok(!late.fish.some((f) => f.mood === "hooked"));
    assert.match(late.said, /Too slow/);
    assert.equal(late.pan.length, 0);
});

test("a line reeled hard while the fish runs snaps, and one eased as it runs holds", () => {
    const s = F.fishingGame.start(3, 1);
    toBite(s);
    const pad = emptyPad();
    pad.tapped = true;
    F.step(s, pad);
    spent(pad);
    assert.equal(s.phase, "fight");
    const hard = structuredClone(s);
    pad.go = true;
    for (let n = 0; n < 60 * 20 && hard.phase === "fight"; n++) F.step(hard, pad);
    assert.equal(hard.snaps, 1, "held tight through a run, the line snaps");
    assert.equal(hard.phase, "ready");
    assert.equal(hard.pan.length, 0, "and nothing but the fish is lost");
    const gentle = structuredClone(s);
    const ease = emptyPad();
    for (let n = 0; n < 60 * 60 && gentle.phase === "fight"; n++) {
        const f = gentle.fish.find((x) => x.mood === "hooked");
        ease.go = gentle.tension < 0.8 && !f?.runTo;
        ease.brake = gentle.snagged;
        F.step(gentle, ease);
    }
    assert.equal(gentle.snaps, 0);
    assert.ok(gentle.pan.length === 1 || gentle.flights.length === 1 || gentle.phase === "landing");
});

test("a line reeled hard through the weed snags, and easing frees it", () => {
    const s = F.fishingGame.start(1, 1);
    toBite(s);
    const pad = emptyPad();
    pad.tapped = true;
    F.step(s, pad);
    const f = s.fish.find((x) => x.mood === "hooked");
    assert.ok(f);
    const weed = s.L.weeds[0];
    assert.ok(weed);
    f.x = weed.x;
    f.y = F.BED - 1;
    f.runTo = null;
    f.run = 5;
    s.hook = { x: f.x, y: f.y };
    s.out = Math.hypot(f.x - F.TIP.x, f.y - F.TIP.y);
    s.tension = 0.9;
    const reel = emptyPad();
    reel.go = true;
    for (let n = 0; n < 10 && !s.snagged; n++) F.step(s, reel);
    assert.ok(s.snagged, "reeled hard in the weed, the hook snags");
    const ease = emptyPad();
    ease.brake = true;
    for (let n = 0; n < 60 && s.snagged; n++) F.step(s, ease);
    assert.equal(s.snagged, false, "and easing off frees it");
    assert.equal(s.phase, "fight", "with the fish still on");
});

test("a fish thrown back from the pan swims again, and the scale goes down", () => {
    const s = F.fishingGame.start(0, 1);
    fish(s, false);
    assert.ok(s.won);
    s.won = false;
    const before = F.total(s);
    assert.ok(F.fishingGame.back?.(s));
    for (let n = 0; n < 120; n++) F.step(s, emptyPad());
    assert.ok(F.total(s) < before);
    assert.equal(
        s.fish.filter((f) => f.mood === "pan").length,
        s.pan.length,
        "the fish left the pan",
    );
});

test("random hands make the weight at most one time in five", () => {
    F.FISH_LEVELS.forEach((L, phase) => {
        const rnd = seeded(211 + phase);
        let wins = 0;
        const trials = 12;
        for (let t = 0; t < trials; t++) {
            const s = F.fishingGame.start(phase, 1 + t);
            const pad = emptyPad();
            for (let n = 0; n < 60 * 90 && !s.won; n++) {
                const r = rnd();
                pad.touch = null;
                if (r < 0.01) pad.touch = { x: F.HANG.x, y: F.HANG.y };
                else if (r < 0.02)
                    pad.lifted = { x: F.HANG.x - rnd() * 5, y: F.HANG.y + rnd() * 5 };
                else if (r < 0.03) pad.tapped = true;
                pad.go = rnd() < 0.3;
                pad.brake = rnd() < 0.05;
                F.step(s, pad);
                spent(pad);
            }
            if (s.won) wins++;
        }
        assert.ok(wins / trials <= 0.2, `${L.title}: ${wins} of ${trials}`);
    });
});

test("the same hands catch the same fish", () => {
    const run = () => {
        const s = F.fishingGame.start(2, 3);
        fish(s, false);
        return JSON.stringify(s);
    };
    assert.equal(run(), run());
});

test("under reduced motion a cast is drawn where it lands, the hook where it stops", () => {
    const normal = F.fishingGame.start(0, 1),
        reduced = F.fishingGame.start(0, 1);
    const pad = emptyPad();
    pad.tapped = true;
    F.step(normal, pad);
    for (let n = 0; n < 600 && F.fishingGame.still.settling?.(normal); n++)
        F.step(normal, emptyPad());
    const press = emptyPad();
    press.tapped = true;
    for (let n = 0; n < F.fishingGame.still.press(reduced); n++) {
        F.step(reduced, press);
        spent(press);
    }
    for (let n = 0; n < 600 && F.fishingGame.still.settling?.(reduced); n++)
        F.step(reduced, emptyPad());
    assert.equal(reduced.phase, "wait");
    assert.equal(reduced.float.x, normal.float.x);
    assert.equal(reduced.hook.y, reduced.depth);
});

test("a stored day opens as it was made, and an edited one does not", () => {
    for (let phase = 0; phase < F.FISH_LEVELS.length; phase++)
        for (let k = 0; k < FISH_CHALLENGE_COUNT; k++) {
            const stored: unknown = JSON.parse(JSON.stringify(fishChallenge(k, phase)));
            assert.ok(isFishConfiguration(stored, phase));
        }
    const edited = fishChallenge(1, 2);
    edited.level.target = 999;
    const stored: unknown = JSON.parse(JSON.stringify(edited));
    assert.ok(!isFishConfiguration(stored, 2));
});

test("every drawing it names is on the shelf, and its tuning is sound", () => {
    const seen = new Set<string>([F.fishingGame.cover.art]);
    F.FISH_LEVELS.forEach((_, phase) => {
        const s = F.fishingGame.start(phase, 1);
        const look = () => {
            for (const sp of F.frame(s).sprites) seen.add(sp.art);
            for (const sp of F.frame(s, true).sprites) seen.add(sp.art);
        };
        look();
        fish(s, false, 60 * 40);
        look();
    });
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    assert.deepEqual(faults(F.FISHING), []);
});

test("a shoal swims together and scatters together, and a cast rings the water the float rides on", () => {
    const level = F.FISH_LEVELS.findIndex((L) => L.kinds.some((k) => k.n > 1));
    const s = F.fishingGame.start(level, 1);
    const pad = emptyPad();
    for (let i = 0; i < 240; i++) F.step(s, pad);
    const kind = s.fish.find((f, i) => s.fish.some((o, j) => j !== i && o.kind === f.kind))?.kind;
    const shoal = s.fish.filter((f) => f.kind === kind && f.mood === "swim");
    const lead = shoal[0];
    assert.ok(lead && shoal.length > 1);
    for (const f of shoal.slice(1))
        if (f.x > f.from && f.x < f.to && Math.abs(f.x - lead.x) <= 2.5)
            assert.equal(f.dir, lead.dir, "a fish near its leader swims its way");
    pad.touch = { ...F.HANG };
    F.step(s, pad);
    spent(pad);
    pad.touch = { x: F.HANG.x - 3, y: F.HANG.y - 2 };
    F.step(s, pad);
    spent(pad);
    pad.lifted = pad.touch;
    pad.touch = null;
    for (let i = 0; i < 90 && s.phase !== "wait"; i++) {
        F.step(s, pad);
        spent(pad);
    }
    const f = F.fishingGame.frame(s);
    assert.equal(s.phase, "wait");
    assert.ok((f.water?.[0]?.ripples?.length ?? 0) > 0, "the float's landing rings the water");
    const float = f.sprites.find((x) => x.key === "float");
    assert.ok(float && Math.abs(float.y - F.SEA.surface) < 0.5, "the float rides the surface");
});

/** A press and a lift at one place, as a tap on the glass. */
function tap(s: F.FishState, at: { x: number; y: number }): void {
    const pad = emptyPad();
    pad.touch = { ...at };
    F.step(s, pad);
    spent(pad);
    pad.lifted = { ...at };
    pad.touch = null;
    F.step(s, pad);
    spent(pad);
}

test("a tap on a fish casts nothing: the float goes out only when it is pulled back and let go", () => {
    const s = F.fishingGame.start(0, 1);
    const first = s.fish[0];
    assert.ok(first);
    tap(s, { x: first.x, y: first.y });
    assert.equal(s.phase, "ready");
    assert.equal(s.casts, 0);
});

test("by hand, a pulled cast, a tap on the bite and a held finger land a fish in good time", () => {
    const s = F.fishingGame.start(0, 1),
        pad = emptyPad();
    toBite(s);
    assert.ok(F.frame(s).marks.some((m) => m.kind === "word" && m.text === "!"));
    assert.equal(F.fishingGame.goLabel?.(s), "Hook");
    assert.equal(F.fishingGame.goIcon?.(s), "hook");
    pad.touch = { x: 3, y: 26 };
    F.step(s, pad);
    spent(pad);
    assert.equal(s.phase, "fight", "a press anywhere hooks it");
    assert.equal(F.fishingGame.goIcon?.(s), "reel");
    let n = 0;
    pad.touch = { x: 10, y: 10 };
    for (; n < 60 * 20 && s.phase === "fight"; n++) {
        F.step(s, pad);
        spent(pad);
    }
    assert.notEqual(s.phase, "fight", "the fish was reeled in");
    assert.ok(n <= 60 * 8, `reeling by hand took ${n / 60} s`);
    assert.equal(s.snaps, 0, "a line reeled by a finger never snaps");
});

test("a missed bite is not lost: the fish nibbles again twice before it swims off", () => {
    const s = F.fishingGame.start(0, 1);
    toBite(s);
    const first = s.fish.find((f) => f.mood === "bite");
    assert.ok(first);
    let bites = 1,
        was = true;
    for (let n = 0; n < 60 * 30 && s.phase === "wait" && first.mood !== "flee"; n++) {
        F.step(s, emptyPad());
        if (first.mood === "bite" && !was) bites++;
        was = first.mood === "bite";
    }
    assert.equal(bites, 3, "it bites three times before it swims off");
});

test("the one round button's drawing says what a press does, and the first level says to pull and let go", () => {
    const s = F.fishingGame.start(0, 1);
    assert.equal(F.fishingGame.goLabel?.(s), "Cast");
    assert.equal(F.fishingGame.goIcon?.(s), "launch");
    assert.equal(F.fishingGame.controls.brake, undefined);
    assert.ok(
        F.frame(s).marks.some((m) => m.kind === "word" && /Pull back and let go/.test(m.text)),
        "the first level says what to do",
    );
});

test("the dots show the whole cast and their ring is where the float comes down, for every pull", () => {
    for (const length of [0.8, 1.5, 2.5, 3.5, 4.5, 6]) {
        for (const angle of [-0.9, -0.6, -0.3]) {
            const s = F.fishingGame.start(0, 1),
                pad = emptyPad(),
                pull = { x: -Math.cos(angle) * length, y: -Math.sin(angle) * length };
            const step = () => {
                F.step(s, pad);
                spent(pad);
            };
            pad.touch = { ...F.HANG };
            step();
            pad.touch = { x: F.HANG.x + pull.x, y: F.HANG.y + pull.y };
            step();
            const marks = F.fishingGame.frame(s).marks,
                ring = marks.find((m) => m.kind === "ring" && m.on === true);
            const dots = marks.filter((m) => m.kind === "dots");
            assert.ok(dots.length > 0, `a ${length} square pull draws dots`);
            pad.lifted = pad.touch;
            pad.touch = null;
            step();
            for (let n = 0; n < 60 * 6 && s.phase === "fly"; n++) step();
            if (s.phase !== "wait") continue;
            assert.ok(ring && ring.kind === "ring", `a ${length} square pull rings its landing`);
            if (ring?.kind === "ring")
                assert.ok(Math.abs(ring.x - s.float.x) < 1e-9, "the ring is where it lands");
        }
    }
});

test("a pull too short to cast draws nothing and lets go quietly", () => {
    const s = F.fishingGame.start(0, 1),
        pad = emptyPad();
    pad.touch = { ...F.HANG };
    F.step(s, pad);
    spent(pad);
    pad.touch = { x: F.HANG.x - 0.2, y: F.HANG.y };
    F.step(s, pad);
    spent(pad);
    assert.ok(!F.fishingGame.frame(s).marks.some((m) => m.kind === "dots"));
    pad.lifted = pad.touch;
    pad.touch = null;
    F.step(s, pad);
    assert.equal(s.phase, "ready");
    assert.equal(s.casts, 0);
});
