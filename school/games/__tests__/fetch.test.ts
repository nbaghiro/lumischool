// Fetch with the pups: every variation of every level is played to its win by keyboard throws the
// solver found, and those pads replay to the same park; a throw is judged where it lands, or where
// it stops for a stop, or by who fetches it; each pup gets where only it can; random throws rarely
// finish a level; and the park runs past both sides of any view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import {
    FETCH,
    FETCH_LEVELS,
    askWords,
    fetchGame,
    startFetch,
    type FetchLevel,
    type FetchState,
} from "../fetch";
import {
    fetchChallenge,
    fetchWay,
    isFetchConfiguration,
    openFetchConfiguration,
} from "../fetch-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { faults } from "../../../engine/motion/tune";

const RATE = fetchGame.rate;

function tick(s: FetchState, pad: Pad): void {
    fetchGame.step(s, pad);
    spent(pad);
}

/** Throws `toy` from a fresh park at ask `k` with the aim set straight, and steps until the throw is judged. */
function throwAt(
    L: FetchLevel,
    k: number,
    o: { angle: number; power: number; toy?: FetchState["toy"] },
): FetchState {
    const s = startFetch(L);
    s.ask = k;
    s.toy = o.toy ?? s.toy;
    s.aim.angle = o.angle;
    s.aim.power = o.power;
    tick(s, { ...emptyPad(), tapped: true });
    for (let i = 0; i < RATE * 20 && !s.decided; i++) tick(s, emptyPad());
    return s;
}

const level = (title: string): FetchLevel => {
    const L = FETCH_LEVELS.find((x) => x.title === title);
    assert.ok(L, title);
    return L;
};

const signature = (s: FetchState) =>
    JSON.stringify({
        ask: s.ask,
        won: s.won,
        steps: s.steps,
        throws: s.throws,
        dogs: s.dogs.map((d) => [d.who, d.r.x.toFixed(6), d.r.y.toFixed(6), d.job]),
    });

test("every variation of every level is won by keyboard throws, and the pads replay to the same park", () => {
    for (let phase = 0; phase < FETCH_LEVELS.length; phase++)
        for (let variant = 0; variant < 4; variant++) {
            const c = { phase, variant };
            const pads = fetchWay(c);
            assert.ok(pads, `level ${phase} variation ${variant} has a way`);
            const a = openFetchConfiguration(c),
                b = openFetchConfiguration(c);
            for (const p of pads) {
                fetchGame.step(a, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
                fetchGame.step(b, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
            }
            assert.ok(a.won, `level ${phase} variation ${variant} is won`);
            assert.equal(signature(a), signature(b));
            assert.deepEqual(fetchGame.objectives?.(a), {
                completed: a.L.asks.length,
                total: a.L.asks.length,
            });
        }
});

test("a number is judged where the throw first lands, and a stop only once it has stopped", () => {
    const meadow = level("The open meadow");
    const s = throwAt(meadow, 0, { angle: -1.2, power: 14 });
    assert.ok(s.landed !== null && Math.abs(s.landed - 6) <= 1, String(s.landed));
    assert.ok(s.good);
    assert.match(s.said, /^It landed at about 6/);
    const hill = level("Up the hill");
    const stop = startFetch(hill);
    stop.ask = hill.asks.findIndex((a) => a.kind === "stop");
    stop.toy = "stick";
    stop.aim.angle = -0.9;
    stop.aim.power = 13;
    tick(stop, { ...emptyPad(), tapped: true });
    const seats = stop.dogs.map((d) => d.r.x);
    // until it stops, the pups stay where they are
    for (let i = 0; i < RATE * 20 && !stop.decided; i++) {
        tick(stop, emptyPad());
        if (!stop.decided)
            stop.dogs.forEach((d, k) => assert.ok(Math.abs(d.r.x - (seats[k] ?? 0)) < 0.2, d.who));
    }
    assert.ok(stop.decided);
    assert.match(stop.said, /^It stopped at about/);
});

test("a ball rolls back down the hill where a stick thrown the same way stays", () => {
    const hill = level("Up the hill");
    const k = hill.asks.findIndex((a) => a.kind === "stop");
    let tried = 0;
    for (let angle = -0.4; angle >= -1.3; angle -= 0.1)
        for (let power = 8; power <= 22; power += 1) {
            if (!throwAt(hill, k, { angle, power, toy: "stick" }).good) continue;
            tried++;
            const ball = throwAt(hill, k, { angle, power, toy: "ball" });
            assert.ok(!ball.good, ball.said);
        }
    assert.ok(tried > 0, "some stick stays on the hill");
});

test("only Rufus swims out for a thing in the pond, and the others stop on the bank", () => {
    const pond = level("Across the pond");
    const k = pond.asks.findIndex((a) => a.kind === "pup");
    const from = 12 + (pond.pond?.from ?? 0),
        to = 12 + (pond.pond?.to ?? 0);
    const s = startFetch(pond);
    s.ask = k;
    s.aim.angle = -0.8;
    s.aim.power = 16;
    tick(s, { ...emptyPad(), tapped: true });
    for (let i = 0; i < RATE * 20 && !s.decided; i++) {
        tick(s, emptyPad());
        for (const d of s.dogs)
            if (d.who !== "rufus") assert.ok(d.r.x < from || d.r.x > to, `${d.who} in the pond`);
    }
    assert.ok(s.good, s.said);
    assert.equal(s.dogs[s.carrier]?.who, "rufus");
    for (let i = 0; i < RATE * 20 && s.phase !== "ready"; i++) tick(s, emptyPad());
    assert.equal(s.phase, "ready", "Rufus swims back and climbs out");
});

test("over the tall fence only Dot fits through the hole, and on the slide only Maple jumps up", () => {
    const park = level("The playground");
    const dot = throwAt(park, 0, { angle: -0.8, power: 19 });
    assert.ok(dot.good, dot.said);
    const k = park.asks.findIndex((a) => a.kind === "pup" && a.who === "maple");
    const pads = fetchWay({ phase: FETCH_LEVELS.indexOf(park), variant: 0 });
    assert.ok(pads, "the playground has a way");
    assert.ok(k > 0);
});

test("Pip gets to anything on open grass first, but runs past it before he turns back", () => {
    const meadow = level("The open meadow");
    const s = throwAt(meadow, 0, { angle: -0.9, power: 14 });
    for (let i = 0; i < RATE * 10 && s.phase === "flying"; i++) tick(s, emptyPad());
    const pip = s.dogs.find((d) => d.who === "pip");
    assert.equal(s.dogs[s.carrier]?.who ?? pip?.job, "pip");
});

test("a frisbee glides further than a ball thrown the same way, and the wind carries it further still", () => {
    const meadow = level("The open meadow");
    const ball = throwAt(meadow, 0, { angle: -0.5, power: 16, toy: "ball" });
    const disc = throwAt(meadow, 0, { angle: -0.5, power: 16, toy: "frisbee" });
    assert.ok((disc.landed ?? 0) > (ball.landed ?? 0) + 1, `${disc.landed} ${ball.landed}`);
    const windy = { ...meadow, wind: 3 };
    const blown = throwAt(windy, 0, { angle: -0.5, power: 16, toy: "frisbee" });
    assert.ok((blown.landed ?? 0) > (disc.landed ?? 0), `${blown.landed} ${disc.landed}`);
});

test("throwing at random rarely finishes a level", () => {
    let won = 0;
    const tries = 40;
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let t = 0; t < tries; t++) {
        const phase = t % FETCH_LEVELS.length;
        const s = fetchGame.start(phase);
        for (let n = 0; n < 3 && !s.won; n++) {
            s.aim.angle = -0.1 - rand() * 1.3;
            s.aim.power = 4 + rand() * 20;
            tick(s, { ...emptyPad(), tapped: true });
            for (let i = 0; i < RATE * 30 && (s.phase !== "ready" || i === 0) && !s.won; i++)
                tick(s, emptyPad());
        }
        if (s.won) won++;
    }
    assert.ok(won <= tries / 10, `${won} of ${tries} random levels won`);
});

test("the park's ground runs past both sides of the world, and the rest frame shows no aim or trail", () => {
    for (const [i] of FETCH_LEVELS.entries()) {
        const s = fetchGame.start(i),
            f = fetchGame.frame(s, true);
        const grounds = f.sprites.filter((sp) => sp.art === "arcade.ground");
        const left = Math.min(...grounds.map((g) => g.x - Number(g.params?.w ?? 0) / 2)),
            right = Math.max(...grounds.map((g) => g.x + Number(g.params?.w ?? 0) / 2));
        assert.ok(left < 0 && right > f.world.w, `${s.L.title}: ${left} to ${right}`);
        assert.ok(!f.marks.some((m) => m.kind === "dots"));
    }
});

test("stored layouts read back only as the variations they are", () => {
    const c = fetchChallenge(5, 2);
    assert.ok(isFetchConfiguration(c, 2));
    assert.ok(!isFetchConfiguration(c, 3));
    assert.ok(!isFetchConfiguration({ phase: 2, variant: 9 }, 2));
    assert.ok(!isFetchConfiguration({ phase: 2, variant: 1, extra: 1 }, 2));
});

test("every drawing it names is on the shelf, its tuning is sound, it says no dashes, and it pants while it runs", () => {
    const seen = new Set<string>([fetchGame.cover.art]);
    const pads = fetchWay({ phase: 3, variant: 0 }) ?? [];
    const s = openFetchConfiguration({ phase: 3, variant: 0 });
    let panted = false;
    for (const p of pads) {
        fetchGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
        panted ||= (fetchGame.hum?.(s) ?? []).some((h) => h.kind === "pant");
        if (s.steps % 20 === 0) for (const sp of fetchGame.frame(s).sprites) seen.add(sp.art);
    }
    for (const L of FETCH_LEVELS)
        for (const sp of fetchGame.frame(startFetch(L), true).sprites) seen.add(sp.art);
    for (const art of seen) assert.ok(SHELF_IDS.has(art), `${art} is not on the shelf`);
    for (const art of ["pupfamily", "fetchtoy", "parkslide", "parkfence", "parkhill", "picnicrug"])
        assert.ok(seen.has(art), art);
    assert.ok(panted);
    for (const L of FETCH_LEVELS)
        assert.ok(
            !/[—!]/.test(
                `${L.goal} ${L.prompt} ${L.asks.map((a) => askWords(L, a)).join(" ")} ${fetchGame.hint}`,
            ),
        );
    assert.deepEqual(faults(FETCH), []);
});
