// Charlie's market stall: every level is dressed and paid for exactly through a real Pad, once by
// pulling the coin back and letting go and once with the keys alone; every outfit's total can be made
// from the purse; random throws rarely pay exactly; the same inputs give the same stall; reduced
// motion settles where fixed steps do; every drawing is on the shelf; and the tuning table says why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { faults } from "../../../engine/motion/tune";
import {
    HAND,
    STALL,
    STALL_LEVELS,
    dishAtStep,
    dishSum,
    purseSpot,
    spotOf,
    startStall,
    stallFrame,
    stepStall,
    totalOf,
    wardrobeGame,
    type CoinKind,
    type StallState,
} from "../wardrobe";

const KINDS: CoinKind[] = ["quarter", "dime", "nickel", "penny"];
const WORTH: Record<CoinKind, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
/** The throw a witness makes: steep, so a coin drops into the dish rather than skidding along it. */
const ANGLE = -0.95;
const COUNTER_TOP = 18;

function run(s: StallState, pad: Pad, steps = 1): void {
    for (let i = 0; i < steps; i++) {
        stepStall(s, pad);
        spent(pad);
    }
}

function settle(s: StallState): void {
    const pad = emptyPad();
    for (let i = 0; i < 1800 && wardrobeGame.still.settling?.(s); i++) run(s, pad);
    assert.equal(wardrobeGame.still.settling?.(s), false, "every throw comes to rest");
}

/** A finger put down at `a`, moved to `b` and lifted there, as the page reports it. */
function press(s: StallState, a: { x: number; y: number }, b = a): void {
    const pad = emptyPad();
    pad.touch = a;
    run(s, pad);
    pad.touch = b;
    run(s, pad);
    pad.touch = null;
    pad.lifted = b;
    run(s, pad);
}

/**
 * The launch speed that lands a coin thrown at `angle` from the hand on the dish's floor, `wait`
 * steps from now: led to where a gliding dish will be when the coin comes down, as a child learns to.
 */
function speedTo(s: StallState, angle: number, wait = 0): number {
    const dy = COUNTER_TOP - 1 - HAND.y,
        g = STALL.gravity.value;
    const at = (x: number) => {
        const dx = x - 0.3 - HAND.x;
        return Math.sqrt((g * dx * dx) / (2 * Math.cos(angle) ** 2 * (dy - dx * Math.tan(angle))));
    };
    let x = s.dishAt;
    for (let k = 0; k < 8; k++) {
        const v = at(x),
            t = (x - 0.3 - HAND.x) / (v * Math.cos(angle));
        x = dishAtStep(s, s.steps + wait + Math.round(t * 60));
    }
    return at(x);
}

/** The first whole outfit on a level: its first top and first bottom, or none, and its first shoes. */
function outfit(s: StallState): number[] {
    const first = (kinds: string[]) => s.L.items.findIndex((x) => kinds.includes(x.kind));
    return [first(["top"]), first(["skirt", "shorts", "trousers"]), first(["shoes", "boots"])];
}

/** Which coins pay `owed` from what the purse holds now, largest first, or null. */
function plan(purse: Record<CoinKind, number>, owed: number): CoinKind[] | null {
    const go = (left: number, from: number, have: Record<CoinKind, number>): CoinKind[] | null => {
        if (left === 0) return [];
        for (let k = from; k < KINDS.length; k++) {
            const kind = KINDS[k];
            if (!kind || have[kind] === 0 || WORTH[kind] > left) continue;
            const rest = go(left - WORTH[kind], k, { ...have, [kind]: have[kind] - 1 });
            if (rest) return [kind, ...rest];
        }
        return null;
    };
    return go(owed, 0, { ...purse });
}

/** Dresses and pays through the pad, throwing each coin again until it lands; returns the throws. */
function payByHand(s: StallState): number {
    for (const i of outfit(s)) press(s, spotOf(s, i));
    const owed = totalOf(s);
    assert.ok(owed > 0);
    for (let tries = 0; tries < 60 && !s.won; tries++) {
        const coins = plan(s.purse, owed - dishSum(s));
        assert.ok(coins?.length, `${s.L.title}: the purse cannot pay ${owed - dishSum(s)}`);
        const kind = coins[0];
        assert.ok(kind);
        if (s.hand !== kind) press(s, purseSpot(kind));
        assert.equal(s.hand, kind);
        const pull = speedTo(s, ANGLE, 2) / (STALL.speed.value / 8);
        const to = { x: HAND.x - Math.cos(ANGLE) * pull, y: HAND.y - Math.sin(ANGLE) * pull };
        press(s, { x: HAND.x + 0.2, y: HAND.y + 0.2 }, to);
        settle(s);
    }
    return s.throws;
}

test("every level is dressed and paid exactly by pulling coins back and letting go", () => {
    const throws = STALL_LEVELS.map((L, level) => {
        const s = startStall(level);
        const n = payByHand(s);
        assert.ok(wardrobeGame.won(s), `${L.title}: ${wardrobeGame.say(s)}`);
        assert.equal(dishSum(s), totalOf(s));
        assert.equal(stallFrame(s).sprites.find((x) => x.key === "charlie")?.params?.pose, "cheer");
        return n;
    });
    assert.ok(
        throws.every((n) => n < 30),
        `${throws.join(", ")}`,
    );
});

test("every level is dressed and paid exactly with the keys alone", () => {
    for (const [level, L] of STALL_LEVELS.entries()) {
        const s = startStall(level),
            pad = emptyPad();
        for (const i of outfit(s)) {
            while (s.cursor !== i) {
                wardrobeGame.command?.(s, "thing");
            }
            wardrobeGame.command?.(s, "wear");
        }
        const owed = totalOf(s);
        for (let tries = 0; tries < 80 && !s.won; tries++) {
            const coins = plan(s.purse, owed - dishSum(s));
            const kind = coins?.[0];
            assert.ok(kind, `${L.title}: nothing left to pay with`);
            for (let n = 0; n < 4 && s.hand !== kind; n++) wardrobeGame.command?.(s, "coin");
            assert.equal(s.hand, kind);
            for (let n = 0; n < 600; n++) {
                // a gliding dish moves while the aim is set, so where to throw is worked out afresh each step
                const want = { angle: ANGLE, power: speedTo(s, ANGLE, 1) };
                const da = want.angle - s.aim.angle,
                    dp = want.power - s.aim.power;
                pad.holding = [
                    ...(da < -0.007 ? (["up"] as const) : da > 0.007 ? (["down"] as const) : []),
                    ...(dp < -0.08 ? (["left"] as const) : dp > 0.08 ? (["right"] as const) : []),
                ];
                if (!pad.holding.length) break;
                run(s, pad);
            }
            pad.holding = [];
            pad.tapped = true;
            run(s, pad);
            settle(s);
        }
        assert.ok(s.won, `${L.title}: ${wardrobeGame.say(s)}`);
    }
});

test("whatever Charlie chooses to wear, the purse can pay it exactly", () => {
    for (const [level, L] of STALL_LEVELS.entries()) {
        const s = startStall(level);
        const of = (kinds: string[]) =>
            L.items.flatMap((x, i) => (kinds.includes(x.kind) ? [i] : []));
        const bodies = [
            ...of(["top"]).flatMap((t) => of(["skirt", "shorts", "trousers"]).map((b) => [t, b])),
            ...of(["dress"]).map((d) => [d]),
        ];
        for (const body of bodies)
            for (const f of of(["shoes", "boots"])) {
                const owed = [...body, f].reduce((n, i) => n + (L.items[i]?.price ?? 0), 0);
                assert.ok(plan(s.purse, owed), `${L.title}: ${owed} cannot be paid`);
            }
    }
});

test("random throws pay exactly at most one time in five", () => {
    for (const [level, L] of STALL_LEVELS.entries()) {
        let exact = 0;
        const trials = 12;
        for (let t = 0; t < trials; t++) {
            const s = startStall(level),
                rnd = seeded(1000 * level + t);
            for (const i of outfit(s)) press(s, spotOf(s, i));
            for (let n = 0; n < 8 && !s.won; n++) {
                const turns = Math.floor(rnd() * 4);
                for (let k = 0; k < turns; k++) wardrobeGame.command?.(s, "coin");
                const angle = -1.45 + rnd() * 1.65,
                    pull = 2 + rnd() * 6;
                press(
                    s,
                    { x: HAND.x, y: HAND.y },
                    { x: HAND.x - Math.cos(angle) * pull, y: HAND.y - Math.sin(angle) * pull },
                );
                settle(s);
            }
            if (s.won) exact++;
        }
        assert.ok(exact / trials <= 0.2, `${L.title}: random throws paid ${exact} of ${trials}`);
    }
});

test("the same inputs give the same stall, and reduced motion settles where fixed steps do", () => {
    const a = startStall(4),
        b = startStall(4);
    payByHand(a);
    payByHand(b);
    assert.deepEqual(stallFrame(a), stallFrame(b));
    assert.equal(wardrobeGame.say(a), wardrobeGame.say(b));
    const normal = startStall(2),
        still = startStall(2);
    const throwIt = (pad: Pad) => {
        pad.released = { x: -3.4, y: 5 };
    };
    const p = emptyPad(),
        q = emptyPad();
    throwIt(p);
    run(normal, p);
    for (let i = 0; i < 1800 && busyAt(normal); i++) run(normal, p);
    throwIt(q);
    run(still, q, wardrobeGame.still.press(still));
    for (let i = 0; i < 1800 && wardrobeGame.still.settling?.(still); i++) run(still, q);
    assert.deepEqual(stallFrame(still, true), stallFrame(normal, true));
});

const busyAt = (s: StallState): boolean => wardrobeGame.still.settling?.(s) ?? false;

test("a coin too many is tapped back out of the dish, and a miss comes back to the purse", () => {
    const s = startStall(0);
    const before = s.purse.penny;
    const miss = emptyPad();
    miss.released = { x: -1, y: 1 };
    run(s, miss);
    settle(s);
    assert.equal(s.purse.penny, before, "the missed penny is back");
    assert.match(s.said, /goes back to the purse/);
    const pull = speedTo(s, ANGLE) / (STALL.speed.value / 8);
    press(
        s,
        { x: HAND.x, y: HAND.y },
        { x: HAND.x - Math.cos(ANGLE) * pull, y: HAND.y - Math.sin(ANGLE) * pull },
    );
    settle(s);
    assert.equal(dishSum(s), 1);
    const coin = s.coins[0];
    assert.ok(coin);
    press(s, s.world.where(coin.body));
    assert.equal(dishSum(s), 0);
    assert.equal(s.purse.penny, before);
});

test("the dish on the move glides while a coin flies, and carries the coins resting in it", () => {
    const s = startStall(5);
    const was = s.dishAt;
    run(s, emptyPad(), 30);
    assert.notEqual(s.dishAt, was, "it glides with nothing thrown");
    for (const i of outfit(s)) press(s, spotOf(s, i));
    for (let tries = 0; tries < 10 && dishSum(s) === 0; tries++) {
        const pull = speedTo(s, ANGLE, 2) / (STALL.speed.value / 8);
        press(
            s,
            { x: HAND.x + 0.2, y: HAND.y + 0.2 },
            { x: HAND.x - Math.cos(ANGLE) * pull, y: HAND.y - Math.sin(ANGLE) * pull },
        );
        settle(s);
    }
    assert.ok(dishSum(s) > 0, "a led throw lands in the gliding dish");
    const coin = s.coins.find((c) => c.home === null);
    assert.ok(coin);
    const from = s.world.where(coin.body).x,
        dish = s.dishAt,
        paid = dishSum(s);
    run(s, emptyPad(), 45);
    assert.ok(
        Math.abs(s.world.where(coin.body).x - from - (s.dishAt - dish)) < 0.3,
        "the coin rode along with the dish",
    );
    assert.equal(dishSum(s), paid);
});

test("every drawing the stall draws is on the shelf, and a scene stays under forty bodies", () => {
    for (let level = 0; level < STALL_LEVELS.length; level++) {
        const s = startStall(level);
        payByHand(s);
        for (const sprite of [...stallFrame(s).sprites, ...stallFrame(startStall(level)).sprites])
            assert.ok(SHELF_IDS.has(sprite.art), `${sprite.key} draws ${sprite.art}`);
        assert.ok(s.coins.length + 7 < 40, `${s.coins.length} coins`);
    }
    assert.ok(SHELF_IDS.has(wardrobeGame.cover.art));
});

test("the tuning table starts inside its ranges and says why", () => {
    assert.deepEqual(faults(STALL), []);
});
