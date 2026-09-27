// Charlie's lemonade stand: every level and variation is served to the end through a real Pad with the
// keys, and the keys replay to the same stand; a level is served by hand, tipping the jug and pulling
// the cup; a push too soft, too hard and to the wrong customer each costs nothing but time; change is
// rolled into the dish and a coin too many comes back; pressing at random rarely serves anyone; reduced
// motion settles after every press; and the drawing, the words and the tuning are checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";
import type { Happening } from "../../../engine/motion/scene";
import {
    COIN_AT,
    HOME,
    STAND,
    STAND_LEVELS,
    busy,
    changeOf,
    changing,
    cupHold,
    dishSum,
    falling,
    jugHold,
    lemonadeGame,
    orderWords,
    owedTo,
    slideCup,
    rollCoin,
    startStand,
    stepStand,
    takeBack,
    toleranceOf,
    vary,
    waiting,
    type StandState,
} from "../lemonade";
import { VARIATIONS, openStandConfiguration, replay, standWay } from "../lemonade-challenges";

function run(s: StandState, pad: Pad, steps = 1): Happening[] {
    const out: Happening[] = [];
    for (let i = 0; i < steps; i++) {
        out.push(...stepStand(s, pad));
        spent(pad);
    }
    return out;
}

function settle(s: StandState): Happening[] {
    const out: Happening[] = [];
    for (let i = 0; i < 1800 && busy(s) && changing(s) === null && waiting(s).length === 0; i++)
        out.push(...run(s, emptyPad()));
    return out;
}

/** Runs with nothing held until the cup, the coins and the drink have stopped. */
function still(s: StandState): void {
    for (let i = 0; i < 900; i++) {
        const moving =
            ["sliding", "falling", "back"].includes(s.cup.mode) ||
            s.coins.some((c) => c.mode !== "dish") ||
            falling(s) > 0 ||
            s.tilt > 0;
        if (!moving) return;
        run(s, emptyPad());
    }
    assert.fail("everything comes to rest");
}

/** Pours with the down arrow until what has landed and what is falling reaches `share` of the cup. */
function pourTo(s: StandState, share: number): void {
    const pad: Pad = { ...emptyPad(), held: "down", holding: ["down"] };
    for (let i = 0; i < 900 && s.cup.level + falling(s) < share; i++) run(s, pad);
    still(s);
}

test("every level and every variation is served to the end with the keys, and the keys replay to the same stand", () => {
    for (let phase = 0; phase < STAND_LEVELS.length; phase++)
        for (let n = 0; n < VARIATIONS; n++) {
            const s = openStandConfiguration({ phase, n });
            const way = standWay(s);
            assert.ok(way, `${STAND_LEVELS[phase]?.title} variation ${n} is served`);
            const once = replay(openStandConfiguration({ phase, n }), way),
                twice = replay(openStandConfiguration({ phase, n }), way);
            assert.ok(once.won, `${STAND_LEVELS[phase]?.title} variation ${n} is won`);
            assert.deepEqual(twice, once, "the same keys give the same stand");
            assert.equal(lemonadeGame.objectives?.(once).completed, once.L.customers.length);
        }
});

test("every order can be poured and every change made from Charlie's dish", () => {
    for (const L of STAND_LEVELS)
        for (let n = 0; n < VARIATIONS; n++) {
            const V = vary(L, n);
            assert.equal(V.customers.length, L.customers.length);
            for (const c of V.customers) {
                assert.ok(c.want > 0 && c.want <= 1, `${L.title}: ${c.want}`);
                const owed = owedTo(V, c);
                assert.ok(owed >= 0, `${L.title}: they pay enough`);
                if (owed > 0) assert.ok(changeOf(V.tray, owed), `${L.title}: ${owed} can be made`);
                assert.ok(
                    V.slots.every((x) => x + 2 < V.counter),
                    "every customer is at the counter",
                );
            }
        }
});

test("a customer is served by hand: the jug drawn down pours, and the cup pulled back and let go slides to them", () => {
    const s = startStand(0);
    const w = waiting(s)[0];
    assert.ok(w);
    const want = s.L.customers[w.i]?.want ?? 0;
    const grip = jugHold(s),
        pad = emptyPad();
    pad.touch = grip;
    run(s, pad);
    for (let k = 1; k <= 30 && s.cup.level + falling(s) < want - 0.1; k++) {
        pad.touch = { x: grip.x, y: grip.y + Math.min(4, k * 0.3) };
        run(s, pad, 3);
    }
    for (let i = 0; i < 400 && s.cup.level + falling(s) < want - 0.02; i++) run(s, pad);
    pad.touch = null;
    pad.lifted = { x: grip.x, y: grip.y + 4 };
    run(s, pad);
    still(s);
    assert.ok(Math.abs(s.cup.level - want) <= toleranceOf(s.L), `poured ${s.cup.level}`);
    const at = s.L.slots[w.slot] ?? 0,
        from = cupHold(s);
    const back = (at - HOME) / STAND.pull.value;
    pad.touch = from;
    run(s, pad);
    pad.touch = { x: from.x - back, y: from.y };
    run(s, pad);
    pad.touch = null;
    pad.lifted = { x: from.x - back, y: from.y };
    const events = run(s, pad);
    for (let i = 0; i < 600 && s.cup.mode === "sliding"; i++) events.push(...run(s, emptyPad()));
    assert.equal(s.cup.mode, "taken", s.note);
    assert.ok(events.some((h) => "event" in h && h.event.kind === "poured"));
});

test("a push too soft stops short and can be pushed on, one too hard goes off the end, and a wrong cup slides back full", () => {
    const s = startStand(1);
    const w = waiting(s)[0];
    assert.ok(w);
    const want = s.L.customers[w.i]?.want ?? 0;
    pourTo(s, want - 0.02);
    const level = s.cup.level;
    assert.ok(slideCup(s, 3));
    still(s);
    assert.equal(s.cup.mode, "resting");
    assert.ok(s.cup.x < (s.L.slots[0] ?? 0) - 1);
    assert.ok(slideCup(s, (s.L.slots[w.slot] ?? 0) - s.cup.x), "a resting cup is pushed on");
    still(s);
    assert.ok(w.got > 0, s.note);

    const t = startStand(1);
    pourTo(t, 0.5);
    const full = t.cup.level;
    assert.ok(slideCup(t, 200));
    let fell = false;
    for (let i = 0; i < 600; i++) {
        const out = run(t, emptyPad());
        fell ||= out.some((h) => "event" in h && h.event.kind === "fell");
    }
    assert.ok(fell, "it went off the end");
    assert.equal(t.cup.mode, "home");
    assert.equal(t.cup.level, 0, "a fresh cup comes");
    assert.ok(full > 0);

    const u = startStand(1);
    const far = waiting(u).at(-1);
    assert.ok(far);
    const other = u.L.customers[far.i]?.want ?? 0;
    const wrong = other >= 0.5 ? 0.25 : 0.75;
    pourTo(u, wrong - 0.02);
    const poured = u.cup.level;
    assert.ok(Math.abs(poured - other) > toleranceOf(u.L));
    assert.ok(slideCup(u, (u.L.slots[far.slot] ?? 0) - HOME));
    still(u);
    assert.equal(u.cup.mode, "home", "it slid back to the jug");
    assert.equal(u.cup.level, poured, "with the drink still in it");
    assert.ok(level > 0);
});

test("the change is rolled into the dish a coin at a time, a coin too many comes back, and the exact change is thanked", () => {
    const s = startStand(2);
    const w = waiting(s)[0];
    assert.ok(w);
    const c = s.L.customers[w.i];
    assert.ok(c);
    pourTo(s, c.want - 0.02);
    const way = standWay(s);
    assert.ok(way);
    // serve the first customer by the solver's keys, then stop at their change
    const r = structuredClone(s);
    for (const m of way) {
        if (changing(r)) break;
        if ("pad" in m) stepStand(r, m.pad);
        else lemonadeGame.command?.(r, m.command);
    }
    const g = changing(r);
    assert.ok(g, "the first customer waits for change");
    const owed = owedTo(r.L, c),
        at = r.L.slots[g.slot] ?? 0;
    assert.ok(owed > 0);
    r.hand = "penny";
    assert.ok(rollCoin(r, 1.5), "a soft roll");
    still(r);
    assert.equal(dishSum(r, g.i), 0, "a coin that stops short comes back");
    assert.equal(owed, 10, "a quarter for a fifteen cent cup");
    const roll = (kind: "nickel" | "dime") => {
        r.hand = kind;
        assert.ok(rollCoin(r, at - COIN_AT));
        still(r);
    };
    roll("nickel");
    assert.equal(dishSum(r, g.i), 5);
    roll("dime");
    assert.equal(dishSum(r, g.i), 15);
    for (let i = 0; i < 30; i++) run(r, emptyPad());
    assert.ok(changing(r), "too much change is not taken");
    assert.match(r.note, /more than the change/);
    assert.ok(takeBack(r));
    still(r);
    assert.equal(dishSum(r, g.i), 5, "the dime comes back");
    roll("nickel");
    for (let i = 0; i < 30 && changing(r); i++) run(r, emptyPad());
    assert.equal(changing(r), null, "the exact change is thanked");
});

test("pressing at random rarely serves anyone", () => {
    let served = 0,
        tries = 0;
    for (let seed = 1; seed <= 10; seed++)
        for (const phase of [0, 2]) {
            const rnd = seeded(seed * 31 + phase);
            const s = startStand(phase);
            const pad = emptyPad();
            for (let i = 0; i < 60 * 40; i++) {
                const k = Math.floor(rnd() * 8);
                pad.holding = k < 2 ? ["down"] : [];
                pad.held = k < 2 ? "down" : null;
                if (k === 2) pad.pressed = ["right"];
                if (k === 3) pad.pressed = ["left"];
                if (k === 4 && rnd() < 0.05) pad.tapped = true;
                if (k === 5 && rnd() < 0.02) pad.brake = true;
                else pad.brake = false;
                run(s, pad);
            }
            tries += s.L.customers.length;
            served += lemonadeGame.objectives?.(s).completed ?? 0;
        }
    assert.ok(served / tries <= 0.2, `random pressing served ${served} of ${tries}`);
});

test("under reduced motion every press settles, and the stand can still be served", () => {
    const s = startStand(0);
    const way = standWay(s);
    assert.ok(way);
    const t = replay(startStand(0), way);
    assert.ok(t.won);
    const u = startStand(0);
    const press = lemonadeGame.still.press(u);
    assert.ok(press > 0);
    const pad: Pad = { ...emptyPad(), held: "down", holding: ["down"], pressed: ["down"] };
    run(u, pad, press);
    let n = 0;
    while (lemonadeGame.still.settling?.(u) && n < 1800 && waiting(u).length === 0) {
        run(u, emptyPad());
        n++;
    }
    for (let i = 0; i < 600 && (u.tilt > 0 || falling(u) > 0); i++) run(u, emptyPad());
    assert.equal(u.tilt, 0);
    assert.equal(falling(u), 0, "the pour has landed");
    assert.ok(u.cup.level > 0);
    const frame = lemonadeGame.frame(u, true);
    assert.equal(frame.time, 0);
});

test("a stand is plain data, every drawing is on the shelf, the ground reaches past both ends, and the words are right", () => {
    for (let phase = 0; phase < STAND_LEVELS.length; phase++) {
        const s = startStand(phase);
        assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
        const pad: Pad = { ...emptyPad(), held: "down", holding: ["down"] };
        run(s, pad, 50);
        for (const f of [lemonadeGame.frame(s), lemonadeGame.frame(s, true)]) {
            for (const sp of f.sprites)
                assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
            const ground = f.sprites.filter((sp) => sp.key.startsWith("grass"));
            assert.ok(Math.min(...ground.map((g) => g.x)) < 0);
            assert.ok(Math.max(...ground.map((g) => g.x)) > f.world.w);
            assert.ok((f.liquid ?? []).some((p) => p.hue === "glow" && p.drops.length > 0));
        }
        assert.ok(lemonadeGame.say(s).length > 20);
        assert.ok(
            (lemonadeGame.hum?.(s) ?? []).some((h) => h.kind === "water"),
            "a pour is heard",
        );
        const L = STAND_LEVELS[phase];
        assert.ok(L);
        for (const text of [L.goal, L.prompt, L.title, lemonadeGame.hint])
            assert.ok(!/[—!]/.test(text.replace(/please!/g, "")), text);
        for (const c of L.customers) assert.ok(orderWords(L, c.want).length > 2);
    }
    assert.deepEqual(faults(STAND), []);
    assert.ok(lemonadeGame.sounds?.place && lemonadeGame.sounds.ring);
});

test("each customer served says so as an event, with a checkpoint, and the goal counts them", () => {
    const s = startStand(1);
    const way = standWay(s);
    assert.ok(way);
    const t = startStand(1);
    const events: string[] = [];
    for (const m of way)
        if ("pad" in m) {
            for (const h of stepStand(t, m.pad)) if ("event" in h) events.push(h.event.kind);
        } else lemonadeGame.command?.(t, m.command);
    assert.equal(events.filter((e) => e === "served").length, t.L.customers.length);
    assert.equal(events.filter((e) => e === "checkpoint").length, t.L.customers.length);
    assert.ok(events.includes("sold-out"));
    settle(t);
});
