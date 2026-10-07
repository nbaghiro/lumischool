import { test } from "node:test";
import assert from "node:assert/strict";
import { notFromField } from "./card-hands";
import { emptyPad, type Dir, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";
import { endOf } from "../game";
import {
    AQUA_LEVELS,
    AQUA_VARIANTS,
    FREE,
    aquariumGame as g,
    innerOf,
    levelOf,
    spotOf,
    startAquarium,
    surfaceOf,
    type AquaState,
} from "../aquarium";
import {
    aquaPlay,
    aquaWay,
    isAquaConfiguration,
    openAquaConfiguration,
} from "../aquarium-challenges";

const kept = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });
const pad = (o: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...o });

test("eight to ten levels in all five places, each with four variations that open and read back", () => {
    assert.ok(AQUA_LEVELS.length >= 8 && AQUA_LEVELS.length <= 10);
    assert.deepEqual(
        new Set(AQUA_LEVELS.map((L) => L.place)),
        new Set(["bedroom", "petshop", "pond", "tunnel", "classroom"]),
    );
    const kinds = new Set<string>(AQUA_LEVELS.flatMap((L) => L.goals.map((x) => x.kind)));
    for (const k of ["fill", "move", "sort", "feed", "plants", "heat", "healthy"])
        assert.ok(kinds.has(k), `no level asks for ${k}`);
    for (let phase = 0; phase < AQUA_LEVELS.length; phase++)
        for (let variant = 0; variant < AQUA_VARIANTS; variant++) {
            assert.ok(isAquaConfiguration({ phase, variant }, phase));
            assert.equal(
                openAquaConfiguration({ phase, variant }).L.title,
                AQUA_LEVELS[phase]?.title,
            );
        }
    assert.ok(!isAquaConfiguration({ phase: 0, variant: AQUA_VARIANTS }, 0));
    assert.deepEqual(faults(g.tuning ?? {}), []);
});

test("every level and variation is won by the keys and by a finger, and each way replays to the same tank", () => {
    for (let phase = 0; phase < AQUA_LEVELS.length; phase++)
        for (let variant = 0; variant < AQUA_VARIANTS; variant++) {
            const c = { phase, variant },
                name = `level ${phase + 1} variation ${variant}`;
            const keys = aquaWay(c, "keys"),
                touch = aquaWay(c, "touch");
            assert.ok(keys, `${name}: no way by the keys`);
            assert.ok(touch, `${name}: no way by a finger`);
            for (const p of keys) {
                assert.equal(p.touch, null, `${name}: the keys touched the field`);
                assert.equal(p.lifted, null);
            }
            for (const p of touch)
                assert.equal(notFromField(g, p), null, `${name}: a finger cannot give that pad`);
            const byKeys = aquaPlay(c, keys),
                byTouch = aquaPlay(c, touch);
            assert.equal(byKeys.end, "won", `${name}: the keys did not win: ${byKeys.note}`);
            assert.equal(byTouch.end, "won", `${name}: a finger did not win: ${byTouch.note}`);
            // the replay witness: the same pads on a fresh round end in the same tank, to the step
            assert.equal(JSON.stringify(aquaPlay(c, keys)), JSON.stringify(byKeys));
            assert.equal(JSON.stringify(aquaPlay(c, touch)), JSON.stringify(byTouch));
        }
});

const random = (seed: number): (() => number) => {
    let t = seed >>> 0;
    return () => {
        t = (Math.imul(t, 1103515245) + 12345) >>> 0;
        return t / 4294967296;
    };
};

const DIRS: Dir[] = ["up", "down", "left", "right"];

/** A child playing at random for a minute and a half: fingers down anywhere and wandering, arrows held, Space pressed. */
function randomRound(phase: number, seed: number): AquaState {
    const s = g.start(phase),
        r = random(seed);
    let finger: { x: number; y: number } | null = null,
        left = 0,
        held: Dir | null = null,
        holdFor = 0;
    for (let i = 0; i < 60 * 90 && !s.end; i++) {
        const p = emptyPad();
        if (finger) {
            finger = {
                x: Math.max(0, Math.min(32, finger.x + (r() - 0.5) * 0.6)),
                y: Math.max(0, Math.min(20, finger.y + (r() - 0.5) * 0.6)),
            };
            if (--left > 0) p.touch = finger;
            else {
                p.lifted = finger;
                finger = null;
            }
        } else if (r() < 1 / 30) {
            finger = { x: r() * 32, y: r() * 20 };
            left = Math.floor(r() * 90);
            p.touch = finger;
        } else {
            if (holdFor > 0) holdFor--;
            else if (r() < 1 / 20) {
                held = DIRS[Math.floor(r() * 4)] ?? null;
                holdFor = Math.floor(r() * 60);
                p.pressed = held ? [held] : [];
            } else held = null;
            if (held) {
                p.holding = [held];
                p.held = held;
            }
            if (r() < 1 / 40) Object.assign(p, { go: true, tapped: true, keys: true });
        }
        g.step(s, p);
    }
    return s;
}

test("playing at random rarely makes the tank asked for", () => {
    let wins = 0,
        rounds = 0;
    const rates: string[] = [];
    for (let phase = 0; phase < AQUA_LEVELS.length; phase++) {
        let won = 0;
        const n = 40;
        for (let seed = 1; seed <= n; seed++)
            if (randomRound(phase, seed * 7 + phase).end === "won") won++;
        rates.push(`${phase + 1}: ${won}/${n}`);
        assert.ok(won / n < 0.15, `level ${phase + 1} won ${won} of ${n} at random`);
        wins += won;
        rounds += n;
    }
    assert.ok(wins / rounds < 0.05, `${wins} of ${rounds} won at random (${rates.join(", ")})`);
});

test("a round is plain data: it survives JSON and plays on the same from the copy", () => {
    for (let phase = 0; phase < AQUA_LEVELS.length; phase++) {
        const s = randomRound(phase, 5);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        const a = g.start(phase);
        for (let i = 0; i < 30; i++) g.step(a, pad());
        const c = structuredClone(a);
        for (let i = 0; i < 90; i++) {
            const p = pad(
                i === 5
                    ? { touch: { x: 16, y: 10 } }
                    : i === 40
                      ? { lifted: { x: 16, y: 10 } }
                      : {},
            );
            g.step(a, kept(p));
            g.step(c, kept(p));
        }
        assert.deepEqual(c, a);
    }
});

/** Takes a tool from the ledge with the keys, so it stays in hand. */
function takeTool(s: AquaState, tool: "jug" | "net" | "food"): void {
    const at = spotOf(s, tool);
    assert.ok(at, `no ${tool}`);
    s.hand = { ...at };
    g.step(s, pad({ go: true, tapped: true, keys: true }));
    g.step(s, pad());
    assert.equal(s.tool, tool);
}

const held = (s: AquaState): number =>
    s.carry.reduce((a, c) => a + c, 0) + (s.tanks[0]?.litres ?? 0);

/** A finger pressed on the jug and carried level over the first tank, still down. */
function carryJug(s: AquaState): { x: number; y: number } {
    const jug = spotOf(s, "jug"),
        t = s.tanks[0];
    assert.ok(jug && t);
    g.step(s, pad({ touch: jug }));
    assert.equal(s.tool, "jug");
    let at = { ...jug };
    const level = { x: t.x, y: innerOf(t).top - 3.4 };
    for (let i = 0; i < 60 && (at.x !== level.x || at.y !== level.y); i++) {
        const dx = level.x - at.x,
            dy = level.y - at.y,
            d = Math.hypot(dx, dy);
        at = d < 0.3 ? level : { x: at.x + (dx / d) * 0.3, y: at.y + (dy / d) * 0.3 };
        g.step(s, pad({ touch: at }));
    }
    return at;
}

test("the jug is carried level, pours as fast as it is lowered, and goes back to the shelf the moment the finger lifts", () => {
    const s = g.start(FREE),
        t = s.tanks[0];
    assert.ok(t);
    t.litres = 0;
    const at = carryJug(s);
    for (let i = 0; i < 30; i++) g.step(s, pad({ touch: at }));
    assert.equal(held(s), 0, "a jug carried level pours");
    const pour = (y: number): number => {
        const before = held(s);
        for (let i = 0; i < 60; i++) g.step(s, pad({ touch: { x: at.x, y } }));
        return held(s) - before;
    };
    const top = innerOf(t).top;
    const gentle = pour(top - 2.4),
        steep = pour(top - 0.5);
    assert.ok(gentle > 0.05, `a gentle tip poured ${gentle}`);
    assert.ok(steep > gentle * 3, `${gentle} then ${steep}`);
    g.step(s, pad({ lifted: { x: at.x, y: top - 0.5 } }));
    assert.equal(s.tool, "none");
    const after = held(s);
    for (let i = 0; i < 30; i++) g.step(s, pad());
    assert.ok(Math.abs(held(s) - after) < 1e-9, "the jug kept pouring after the finger lifted");
    const jug = g.frame(s).sprites.find((sp) => sp.key === "jug");
    assert.deepEqual([jug?.x, jug?.y], [spotOf(s, "jug")?.x, spotOf(s, "jug")?.y]);
});

test("on the first levels the pour slows to a trickle at the line, so a pour held too long overshoots by little", () => {
    const s = g.start(0),
        t = s.tanks[0],
        goal = s.L.goals[0];
    assert.ok(t && goal?.kind === "fill");
    const at = carryJug(s);
    const low = { x: at.x, y: innerOf(t).top - 0.5 };
    for (let i = 0; i < 60 * 8; i++) g.step(s, pad({ touch: low }));
    g.step(s, pad({ lifted: low }));
    for (let i = 0; i < 120; i++) g.step(s, pad());
    assert.ok(t.litres > goal.litres, `only ${t.litres}`);
    assert.ok(t.litres < goal.litres + 1.6, `eight seconds poured ${t.litres}`);
    // a later level pours on at full speed and spills
    const late = g.start(FREE),
        lt = late.tanks[0];
    assert.ok(lt);
    lt.litres = 0;
    const la = carryJug(late);
    for (let i = 0; i < 60 * 14; i++)
        g.step(late, pad({ touch: { x: la.x, y: innerOf(lt).top - 0.5 } }));
    for (let i = 0; i < 120; i++) g.step(late, pad());
    assert.equal(lt.litres, lt.most);
    assert.ok(lt.spilt > 0.5, `spilt ${lt.spilt}`);
});

test("held in the water the jug scoops out by degrees, deeper faster, until it is lifted", () => {
    const s = g.start(FREE),
        t = s.tanks[0];
    assert.ok(t);
    t.litres = 9;
    const at = carryJug(s);
    const scoop = (depth: number): number => {
        const before = t.litres;
        for (let i = 0; i < 30; i++)
            g.step(s, pad({ touch: { x: at.x, y: surfaceOf(t) + depth } }));
        return before - t.litres;
    };
    const shallow = scoop(0.3),
        deep = scoop(1.6);
    assert.ok(shallow > 0.05, `a shallow scoop took ${shallow}`);
    assert.ok(deep > shallow * 2, `${shallow} then ${deep}`);
    const now = t.litres;
    g.step(s, pad({ lifted: { x: at.x, y: surfaceOf(t) + 1.6 } }));
    for (let i = 0; i < 30; i++) g.step(s, pad());
    assert.equal(t.litres, now);
    assert.equal(s.tool, "none");
});

test("by the keys, Space held over the tank tips the jug further the longer it is held, and held in the water scoops", () => {
    const s = g.start(FREE),
        t = s.tanks[0];
    assert.ok(t);
    t.litres = 5;
    takeTool(s, "jug");
    s.hand = { x: t.x, y: innerOf(t).top - 1 };
    const poured = (steps: number, first: boolean): number => {
        const before = held(s);
        for (let i = 0; i < steps; i++)
            g.step(s, pad({ go: true, tapped: first && i === 0, keys: true }));
        return held(s) - before;
    };
    const early = poured(20, true),
        later = poured(20, false);
    assert.ok(later > early * 1.5, `${early} then ${later}`);
    g.step(s, pad());
    for (let i = 0; i < 120; i++) g.step(s, pad());
    s.hand = { x: t.x, y: surfaceOf(t) + 1.5 };
    assert.equal(g.goLabel?.(s), "Scoop out");
    const was = t.litres;
    for (let i = 0; i < 60; i++) g.step(s, pad({ go: true, tapped: i === 0, keys: true }));
    assert.ok(was - t.litres > 0.8, `scooped ${was - t.litres}`);
});

/** Sweeps the net from above the bag's fish down onto it at `speed` squares a second, by a finger. */
function sweep(speed: number): AquaState {
    const s = g.start(0),
        t = s.tanks[0],
        f = s.fish[0];
    assert.ok(t && f);
    t.litres = 6;
    takeTool(s, "net");
    let at = { x: f.x - 6, y: f.y };
    g.step(s, pad({ touch: at }));
    // a level glide in from the side, through the bag's water
    for (let i = 0; i < 60 * 4 && !s.net.fish.length; i++) {
        at = { x: Math.min(f.x + 3, at.x + speed / 60), y: f.y };
        g.step(s, pad({ touch: at }));
    }
    return s;
}

test("a slow sweep of the net catches a fish, and a fast splashy one sends it darting off", () => {
    assert.equal(sweep(2).net.fish.length, 1);
    assert.equal(sweep(14).net.fish.length, 0);
});

test("a fish in the net is carried to another tank and let go in it, one fish a dip", () => {
    const s = sweep(2),
        t = s.tanks[0];
    assert.ok(t);
    assert.equal(s.net.fish.length, 1);
    const into = { x: t.x, y: surfaceOf(t) + 1 };
    for (let i = 0; i < 30; i++) g.step(s, pad({ touch: { x: t.x, y: innerOf(t).top - 2 } }));
    g.step(s, pad({ touch: into }));
    g.step(s, pad({ lifted: into }));
    assert.equal(s.net.fish.length, 0);
    assert.equal(s.fish[0]?.tank, 0);
    assert.equal(s.tool, "none", "the net stayed in hand after it was let go");
});

test("feeding counts the flakes: too many for a feeding request ends the round, not won, and stays ended", () => {
    const phase = AQUA_LEVELS.findIndex((L) => L.goals.some((x) => x.kind === "feed" && x.strict));
    const s = g.start(phase);
    takeTool(s, "food");
    // pinch after pinch, quicker than the fish can eat them, until more have gone in than they want
    for (let k = 0; k < 12 && !s.end; k++) {
        const down = { x: 16, y: 3.6 },
            end = { x: 14.2, y: 5.2 };
        g.step(s, pad({ touch: down }));
        for (let i = 0; i < 6; i++) g.step(s, pad({ touch: end }));
        g.step(s, pad({ lifted: end }));
        for (let i = 0; i < 12; i++) g.step(s, pad());
    }
    for (let i = 0; i < 120 && !s.end; i++) g.step(s, pad());
    assert.equal(s.end, "overfed");
    const end = endOf(g, s);
    assert.equal(end?.won, false);
    assert.match(end?.words ?? "", /Too many flakes/);
    for (let i = 0; i < 60; i++) g.step(s, pad({ go: true, tapped: true }));
    assert.deepEqual(endOf(g, s), end);
});

test("a crowded tank's fish droop, and perk up once the tank is put right", () => {
    const phase = AQUA_LEVELS.findIndex((L) => L.title === "Keep it healthy");
    const s = g.start(phase);
    for (let i = 0; i < 60; i++) g.step(s, pad());
    assert.ok(
        s.fish.every((f) => !f.happy),
        "the crowded class tank's fish are happy",
    );
    const way = aquaWay({ phase, variant: 0 }, "touch");
    assert.ok(way);
    const done = aquaPlay({ phase, variant: 0 }, way);
    assert.ok(done.fish.every((f) => f.happy));
    assert.ok(
        g.frame(done).sprites.some((sp) => sp.art === "tankfish" && sp.params?.happy === true),
    );
});

test("the heater warms the water slowly to its dial, by the keys' plus and minus or a tap on the dial", () => {
    const phase = AQUA_LEVELS.findIndex((L) => L.goals.some((x) => x.kind === "heat"));
    const s = g.start(phase),
        t = s.tanks[0];
    assert.ok(t && t.dial !== null);
    g.command?.(s, "warmer");
    g.command?.(s, "warmer");
    assert.equal(t.dial, 22);
    for (let i = 0; i < 30; i++) g.step(s, pad());
    assert.ok(t.temp > 20 && t.temp < 21);
    assert.equal(g.shows?.(s, "warmer"), true);
    assert.equal(g.shows?.(startAquarium(levelOf(0, 0), 0), "warmer"), false);
});

test("the free tank is kept: its design comes back, and a design that does not fit is refused", () => {
    const way = aquaWay({ phase: FREE, variant: 0 }, "touch");
    assert.ok(way);
    const done = aquaPlay({ phase: FREE, variant: 0 }, way);
    const saved: unknown = JSON.parse(JSON.stringify(g.checkpoint?.(done)));
    const fresh = g.start(FREE);
    assert.equal(g.restore?.(fresh, saved), true);
    assert.equal(fresh.tanks[0]?.litres, done.tanks[0]?.litres);
    assert.deepEqual(
        fresh.tanks[0]?.placed.map((d) => d.item),
        done.tanks[0]?.placed.map((d) => d.item),
    );
    assert.equal(
        fresh.fish.filter((f) => f.tank === 0).length,
        done.fish.filter((f) => f.tank === 0).length,
    );
    assert.equal(
        g.restore?.(g.start(FREE), { litres: 99, placed: [], on: false, dial: 24, home: 0 }),
        false,
    );
    assert.equal(g.restore?.(g.start(FREE), "a tank"), false);
});

test("the Action says what the hand can do where it is", () => {
    const s = g.start(0);
    const jug = spotOf(s, "jug");
    assert.ok(jug);
    s.hand = { ...jug };
    assert.equal(g.goLabel?.(s), "Take the jug");
    g.step(s, pad({ go: true, tapped: true, keys: true }));
    assert.equal(s.tool, "jug");
    const t = s.tanks[0];
    assert.ok(t);
    s.hand = { x: t.x, y: innerOf(t).top - 1 };
    assert.equal(g.goLabel?.(s), "Pour");
    assert.equal(g.goIcon?.(s), "water");
    s.hand = { x: 3, y: 12 };
    assert.equal(g.goLabel?.(s), "Put back");
});

test("under reduced motion a press pours for a second and the page draws where the water settles", () => {
    const s = g.start(0);
    takeTool(s, "jug");
    assert.equal(g.still.press(s), 60);
    assert.equal(g.still.settling?.(s), false);
});
