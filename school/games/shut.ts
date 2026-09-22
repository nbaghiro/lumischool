// shut: throw the dice, put dice on the numbers they make, and shut the box.
//
// The box has a row of numbers, all open. A throw is two dice. A die put on its own number shuts
// it; the two dice put together on a number shut it when they make it, by adding, and at the higher
// levels by multiplying or taking one from the other. Each die is used once, and the dice are used until
// nothing more fits, when the next throw comes. A throw that fits nothing is thrown again, so
// nothing is lost and every round ends with the box shut; what the choices change is how many
// throws that takes. Every move can be taken back.
//
// A throw is fair and reproducible. The dice are a seeded function of the box: the level's seed,
// the numbers still open and the throws in a row that fitted nothing. The same moves rebuild the
// same throws, so a move log replays exactly, and taking a move back and throwing again gives the
// same dice, so a take-back cannot fish for a better throw.
//
// The prover walks the one run of dice the seed gives, which proves that round and nothing about
// luck. So the mechanic carries a second gate, `odds`, which walks every throw of every box a child
// can reach: that the box can always still be shut, how many throws good choices take and how many
// random ones do, and how long a long game is. `audit` holds a version to it. See .docs/games.md.
import { seeded } from "../../engine/motion/spawn";
import type { Activity, Board, Chip, Contract, Mechanic } from "./games";

/** How two dice put together on a number may make it: by adding, and at the higher levels more. */
type Ops = "add" | "times" | "all";

/** Dice in a throw: two, on every level, which a child reads at a glance. */
export const DICE = 2;

interface ShutVersion {
    /** The numbers on the box, from 1 up to this. */
    tiles: number;
    ops: Ops;
    seed: number;
    /** What `odds` has to find over every throw; `audit` holds the version to it. */
    odds: {
        /** Throws good choices take on average to shut the box, as [least, most]. */
        throws: [number, number];
        /** The most throws nine games in ten take with good choices. */
        long: number;
        /** The least ratio of random choices' throws to good choices' throws. */
        gain: number;
    };
    /**
     * What the prover checks on the one run of dice the seed gives: the shortest win in moves, and how
     * many times slower random play is. Declared as the range over the first hundred seeds, so they
     * are a fact about the level rather than about a lucky seed.
     */
    proof: { shortest: [number, number]; patience: number };
}

export interface ShutPos {
    /** The numbers still open, as a bit mask: bit n - 1 is number n. */
    open: number;
    /** The dice lying in the box, low to high: the throw being used, or the last one. */
    dice: number[];
    /** For each die, the number it sits on, or 0 in the tray. A die on a number still open is waiting, not used. */
    on: number[];
    /** True while the throw is being used. False when the next move is a throw. */
    live: boolean;
    /** Throws in a row that fitted nothing, since a number was last shut. The next throw depends on it. */
    misses: number;
    /** Throws so far, for the words and for how the dice lie; nothing that can happen depends on it. */
    thrown: number;
}

type ShutMove =
    | { k: "throw" }
    | { k: "put"; die: number; face: number; n: number }
    | { k: "back"; die: number; face: number; n: number };

const bit = (n: number): number => 1 << (n - 1);
const full = (tiles: number): number => (1 << tiles) - 1;

const numbersIn = (mask: number): number[] => {
    const out: number[] = [];
    for (let n = 1; mask >> (n - 1); n++) if (mask & bit(n)) out.push(n);
    return out;
};

/** A list in words: "2", "2 and 5", "2, 5 and 9". */
const listed = (xs: (number | string)[]): string =>
    xs.length <= 1 ? String(xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** The dice a throw brings, low to high, from the level's seed and the box as it stands. Each die is uniform over one to six. */
export function throwOf(seed: number, open: number, misses: number): number[] {
    let h =
        Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1) ^
        Math.imul(open + 1, 0x85ebca6b) ^
        Math.imul(misses + 1, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    const rnd = seeded(h ^ (h >>> 13));
    return Array.from({ length: DICE }, () => 1 + Math.floor(rnd() * 6)).sort((a, b) => a - b);
}

/** The numbers a group of dice makes: the sum, and for two dice the product and the difference where the level allows. */
function madeBy(faces: number[], ops: Ops): number[] {
    const out = [faces.reduce((a, b) => a + b, 0)];
    if (faces.length === 2) {
        const [a = 0, b = 0] = faces;
        if (ops !== "add" && !out.includes(a * b)) out.push(a * b);
        if (ops === "all" && a !== b && !out.includes(Math.abs(a - b))) out.push(Math.abs(a - b));
    }
    return out;
}

/** The dice not yet used: in the tray, or waiting on a number still open. */
const free = (s: ShutPos): number[] =>
    s.dice.map((_, i) => i).filter((i) => !s.on[i] || (s.open & bit(s.on[i] ?? 0)) !== 0);

/** The number dice are waiting on, and which dice. There is at most one at a time. */
function waiting(s: ShutPos): { n: number; dice: number[] } | null {
    const dice = s.dice
        .map((_, i) => i)
        .filter((i) => (s.on[i] ?? 0) > 0 && (s.open & bit(s.on[i] ?? 0)) !== 0);
    return dice.length ? { n: s.on[dice[0] ?? 0] ?? 0, dice } : null;
}

/** Whether some of the free dice, these among them, make n. */
function completes(s: ShutPos, must: number[], n: number, ops: Ops): boolean {
    const others = free(s).filter((i) => !must.includes(i));
    for (let g = 0; g < 1 << others.length; g++) {
        const group = [...must, ...others.filter((_, j) => g & (1 << j))];
        if (
            madeBy(
                group.map((i) => s.dice[i] ?? 0),
                ops,
            ).includes(n)
        )
            return true;
    }
    return false;
}

/** Whether the free dice can still shut something: if not, the throw is used up. */
const fits = (s: ShutPos, ops: Ops): boolean =>
    numbersIn(s.open).some((n) => completes(s, [], n, ops));

const CONTRACT: Contract = {
    draws: ["shutbox", "shuttile", "die"],
    // The box, its numbers and the dice are the game, and what is on the box is numbers, so nothing
    // is filled from the shelf.
    slots: {},
    settings: {
        tiles: {
            doc: "The numbers on the box, from 1 up to this.",
            kind: "number",
            range: [2, 10],
        },
        ops: {
            doc: "How two dice put together may make a number.",
            kind: "pick",
            values: ["add", "times", "all"],
        },
        seed: {
            doc: "Which run of dice the level gives. Every throw is still uniform.",
            kind: "number",
            range: [1, 1_000_000],
        },
    },
};

const RULE: Record<Ops, string> = {
    add: "Put a die on its number, or both dice together on the number they make.",
    times: "Put a die on its number, or both dice together on the number they make by adding or multiplying.",
    all: "Put a die on its number, or both dice together on the number they make by adding, taking away or multiplying.",
};

export const shut: Mechanic<ShutVersion, ShutPos, ShutMove> = {
    id: "shut",
    title: "Shut the box",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        if (v.tiles < 2 || v.tiles > 10)
            out.push(
                `a box of ${v.tiles} numbers is outside 2 to 10, since two dice take too many throws to shut a bigger box in a round`,
            );
        if (!Number.isInteger(v.seed) || v.seed < 1)
            out.push("the seed has to be a whole number from 1");
        if (v.odds.throws[0] > v.odds.throws[1] || v.odds.gain < 1 || v.odds.long < 1)
            out.push("the odds it promises are not a range");
        return out;
    },

    goal: (v) => `Shut every number. ${RULE[v.ops]}`,

    bounds: (v) => ({
        solution: v.proof.shortest,
        budget: 100,
        patience: v.proof.patience,
        branch: BRANCH[v.ops],
        positions: 40000,
    }),

    start: (v) => ({ open: full(v.tiles), dice: [], on: [], live: false, misses: 0, thrown: 0 }),

    // A throw only when nothing more fits, so every throw is used. While dice wait on a number only
    // that number takes more dice, and a waiting die can be taken back.
    moves: (s, v) => {
        if (!s.open) return [];
        if (!s.live) return [{ k: "throw" }];
        const out: ShutMove[] = [];
        const wait = waiting(s);
        for (const i of free(s)) {
            if (wait?.dice.includes(i)) continue;
            for (const n of wait ? [wait.n] : numbersIn(s.open)) {
                if (completes(s, [...(wait?.dice ?? []), i], n, v.ops))
                    out.push({ k: "put", die: i, face: s.dice[i] ?? 0, n });
            }
        }
        for (const i of wait?.dice ?? [])
            out.push({ k: "back", die: i, face: s.dice[i] ?? 0, n: wait?.n ?? 0 });
        return out;
    },

    apply: (s, m, v) => {
        if (m.k === "throw") {
            const dice = throwOf(v.seed, s.open, s.misses);
            const next: ShutPos = {
                ...s,
                dice,
                on: dice.map(() => 0),
                live: true,
                thrown: s.thrown + 1,
            };
            return fits(next, v.ops) ? next : { ...next, live: false, misses: s.misses + 1 };
        }
        const on = [...s.on];
        on[m.die] = m.k === "back" ? 0 : m.n;
        if (m.k === "back") return { ...s, on };
        const group = s.dice.map((_, i) => i).filter((i) => on[i] === m.n);
        if (
            !madeBy(
                group.map((i) => s.dice[i] ?? 0),
                v.ops,
            ).includes(m.n)
        )
            return { ...s, on };
        const next: ShutPos = { ...s, on, open: s.open & ~bit(m.n), misses: 0 };
        return next.open && fits(next, v.ops) ? next : { ...next, live: false };
    },

    won: (s) => s.open === 0,

    // What can happen next depends on the numbers open, the dice still loose and what is waiting, or
    // before a throw on the misses in a row. Which die is which, and where the used dice lie, do not.
    key: (s) => {
        if (!s.open) return "shut";
        if (!s.live) return `t|${s.open}|${s.misses}`;
        const wait = waiting(s);
        const loose = free(s)
            .filter((i) => !wait?.dice.includes(i))
            .map((i) => s.dice[i])
            .join(",");
        return `u|${s.open}|${loose}|${wait ? `${wait.dice.map((i) => s.dice[i]).join(",")}@${wait.n}` : ""}`;
    },

    say: (s) => {
        if (!s.open)
            return `Every number is shut. It took ${s.thrown} throw${s.thrown === 1 ? "" : "s"}.`;
        const open = `Still open: ${listed(numbersIn(s.open))}.`;
        if (!s.thrown) return `${open} Throw the dice.`;
        const faces = `The dice show ${listed(s.dice)}.`;
        if (!s.live)
            return `${open} ${faces} ${s.on.some((n) => n > 0) ? "They are used up, so throw again." : "Nothing fits, so throw again."}`;
        const wait = waiting(s);
        const out = [open, faces];
        const used = s.dice
            .map((d, i) => ({ d, n: s.on[i] ?? 0 }))
            .filter((x) => x.n > 0 && !(s.open & bit(x.n)));
        if (used.length) out.push(`Used: ${listed(used.map((x) => `the ${x.d} on ${x.n}`))}.`);
        if (wait)
            out.push(`Waiting on ${wait.n}: ${listed(wait.dice.map((i) => `the ${s.dice[i]}`))}.`);
        const loose = free(s)
            .filter((i) => !wait?.dice.includes(i))
            .map((i) => `the ${s.dice[i]}`);
        if (loose.length) out.push(`Still to use: ${listed(loose)}.`);
        return out.join(" ");
    },

    sayMove: (m) =>
        m.k === "throw"
            ? "Throw the dice"
            : m.k === "put"
              ? `Put the ${m.face} on ${m.n}`
              : `Take the ${m.face} off ${m.n}`,

    // One drawing, the box with its numbers and the dice lying in it, which is also what the shelf
    // shows. A game played by hand draws the box bare and places the numbers and the dice as pieces.
    board: (s, v): Board => ({
        parts: [
            {
                art: "shutbox",
                key: "box",
                params: {
                    count: v.tiles,
                    shut: numbersIn(full(v.tiles) & ~s.open),
                    dice: s.dice,
                    on: s.on,
                    thrown: s.thrown,
                    bare: false,
                },
            },
        ],
    }),

    chip: (m): Chip => {
        if (m.k === "throw") return { text: "Throw the dice", group: "The dice" };
        return {
            art: "die",
            params: { face: m.face, roll: 0, turn: 0 },
            text: m.k === "put" ? `on ${m.n}` : `off ${m.n}`,
            group: `The ${m.face}`,
        };
    },

    audit: (v) => {
        const o = odds(v);
        const out: string[] = [];
        for (const box of o.stuck.slice(0, 3))
            out.push(
                `once only ${listed(box)} ${box.length === 1 ? "is" : "are"} open, no throw can shut anything, so the box could never be shut`,
            );
        if (o.stuck.length > 3) out.push(`and ${o.stuck.length - 3} more boxes like that`);
        if (!o.stuck.length) {
            const [lo, hi] = v.odds.throws;
            if (o.best < lo || o.best > hi)
                out.push(
                    `good choices shut the box in ${o.best.toFixed(1)} throws on average, outside the declared ${lo} to ${hi}`,
                );
            if (o.long > v.odds.long)
                out.push(
                    `nine games in ten take up to ${o.long} throws with good choices, over the declared ${v.odds.long}`,
                );
            if (o.random / o.best < v.odds.gain)
                out.push(
                    `random choices take ${o.random.toFixed(1)} throws against ${o.best.toFixed(1)}, only ${(o.random / o.best).toFixed(2)} times as many, under the declared ${v.odds.gain}`,
                );
        }
        if (o.branch > BRANCH[v.ops])
            out.push(`one throw offers ${o.branch} moves, over the declared ${BRANCH[v.ops]}`);
        return out;
    },
};

/** The most moves a throw may offer: two dice onto up to ten numbers, more when they can also multiply or take one from the other. */
const BRANCH: Record<Ops, number> = { add: 6, times: 8, all: 10 };

interface Odds {
    /** Throws to shut the box from the start, on average, choosing as well as possible. */
    best: number;
    /** The same choosing at random: each time, any number the dice can shut, with any dice that make it. */
    random: number;
    /** Throws that fit nothing, on average, choosing well and choosing at random. */
    wasted: { best: number; random: number };
    /** The throws within which nine games in ten are shut, choosing well. */
    long: number;
    /** Over every box a child can reach, the biggest chance that a throw fits nothing, and the box. */
    worst: { miss: number; open: number[] };
    /** Boxes a child can reach where no throw can ever shut a number. Empty is the promise. */
    stuck: number[][];
    /** How many boxes a child can reach. */
    boxes: number;
    /** The most moves the start of any throw offers, in any box a child can reach. */
    branch: number;
    /** The chance the first throw fits nothing. */
    start: { miss: number };
}

/** Every throw of n dice as sorted faces, with its chance. */
function throwsOf(n: number): { faces: number[]; p: number }[] {
    const counts = new Map<string, number>();
    const walk = (acc: number[]): void => {
        if (acc.length === n) {
            const k = [...acc].sort((a, b) => a - b).join(",");
            counts.set(k, (counts.get(k) ?? 0) + 1);
            return;
        }
        for (let f = 1; f <= 6; f++) walk([...acc, f]);
    };
    walk([]);
    return [...counts].map(([k, c]) => ({ faces: k.split(",").map(Number), p: c / 6 ** n }));
}

/**
 * Every group of a throw's dice and a number it makes, worked out once per throw so the walk below
 * only filters. `g` is the dice as a bit mask; `sig` names the number and the faces, so two groups
 * of the same faces making the same number count as one way to shut it wherever both are loose.
 */
function groupsOf(faces: number[], ops: Ops): { g: number; n: number; sig: number }[] {
    const out: { g: number; n: number; sig: number }[] = [];
    for (let g = 1; g < 1 << faces.length; g++) {
        const group = faces.filter((_, i) => g & (1 << i));
        const code = group.reduce((a, f) => a * 7 + f, 0);
        for (const n of madeBy(group, ops)) if (n >= 1) out.push({ g, n, sig: n * 1000 + code });
    }
    return out;
}

const cache = new Map<string, Odds>();

/**
 * The exact analysis over every throw. A box is the set of numbers still open; from a box, a throw
 * of the level's dice comes up with its chance, and the child uses it until nothing more fits,
 * which leaves a smaller box, or it fits nothing and is thrown again. Boxes are worked out smallest
 * first, since a throw that fits only ever leaves a smaller one, so each expectation is a sum over
 * throws of boxes already known, divided by the chance the throw fits. The seed plays no part, so
 * this holds for every seed.
 */
export function odds(v: ShutVersion): Odds {
    const id = `${v.tiles}|${v.ops}`;
    const had = cache.get(id);
    if (had) return had;
    const N = 1 << v.tiles,
        top = N - 1;
    const throws = throwsOf(DICE).map((t) => ({
        ...t,
        groups: groupsOf(t.faces, v.ops).filter((x) => x.n <= v.tiles),
    }));
    const count = new Uint8Array(N);
    for (let m = 1; m < N; m++) count[m] = (count[m >> 1] ?? 0) + (m & 1);
    const order = Array.from({ length: N }, (_, i) => i).sort(
        (a, b) => (count[a] ?? 0) - (count[b] ?? 0),
    );
    const best = new Float64Array(N),
        rand = new Float64Array(N),
        wasteB = new Float64Array(N),
        wasteR = new Float64Array(N);
    const miss = new Float64Array(N);
    // For each box and throw, the boxes the throw can leave, and the one the best choices leave.
    const ends: (number[] | undefined)[] = Array.from({ length: N * throws.length });
    const bestEnd = new Int32Array(N * throws.length).fill(-1);
    const memo = new Map<number, [number, number]>();
    for (const T of order) {
        if (!T) continue;
        let b = 1,
            r = 1,
            wb = 0,
            wr = 0,
            pm = 0;
        throws.forEach((t, ti) => {
            // Every way the throw can be used from here, walked once: the boxes it can leave, and what
            // choosing at random comes to, each way to shut a number being equally likely at each step.
            const left = new Set<number>();
            memo.clear();
            const walk = (open: number, used: number): [number, number] => {
                const k = open * 8 + used;
                const had = memo.get(k);
                if (had) return had;
                let er = 0,
                    ew = 0,
                    ways = 0;
                const seen: number[] = [];
                for (const w of t.groups) {
                    if (w.g & used || !(open & bit(w.n)) || seen.includes(w.sig)) continue;
                    seen.push(w.sig);
                    const [x, y] = walk(open & ~bit(w.n), used | w.g);
                    er += x;
                    ew += y;
                    ways++;
                }
                if (!ways && open !== T) left.add(open);
                const got: [number, number] = ways
                    ? [er / ways, ew / ways]
                    : [rand[open] ?? 0, wasteR[open] ?? 0];
                memo.set(k, got);
                return got;
            };
            const [er, ew] = walk(T, 0);
            ends[T * throws.length + ti] = [...left];
            if (!left.size) {
                pm += t.p;
                return;
            }
            let e = -1;
            for (const x of left) if (e < 0 || (best[x] ?? 0) < (best[e] ?? 0)) e = x;
            bestEnd[T * throws.length + ti] = e;
            b += t.p * (best[e] ?? 0);
            wb += t.p * (wasteB[e] ?? 0);
            r += t.p * er;
            wr += t.p * ew;
        });
        miss[T] = pm;
        best[T] = pm < 1 ? b / (1 - pm) : Infinity;
        rand[T] = pm < 1 ? r / (1 - pm) : Infinity;
        wasteB[T] = pm < 1 ? (pm + wb) / (1 - pm) : Infinity;
        wasteR[T] = pm < 1 ? (pm + wr) / (1 - pm) : Infinity;
    }

    // The boxes a child can reach, whatever they choose and whatever the dice do, and the most moves
    // the start of a throw offers in any of them: one per die and number some group with it makes.
    const reach = new Set<number>([top]);
    const queue = [top];
    let branch = 0;
    while (queue.length) {
        const T = queue.shift() ?? 0;
        throws.forEach((t, ti) => {
            const puts = new Set<number>();
            for (const w of t.groups) {
                if (!(T & bit(w.n))) continue;
                for (let i = 0; i < t.faces.length; i++) if (w.g & (1 << i)) puts.add(i * 64 + w.n);
            }
            branch = Math.max(branch, puts.size);
            for (const e of ends[T * throws.length + ti] ?? [])
                if (!reach.has(e)) {
                    reach.add(e);
                    if (e) queue.push(e);
                }
        });
    }
    let worst = { miss: 0, open: [] as number[] };
    const stuck: number[][] = [];
    for (const T of reach) {
        if (!T) continue;
        if ((miss[T] ?? 0) > worst.miss) worst = { miss: miss[T] ?? 0, open: numbersIn(T) };
        if (best[T] === Infinity) stuck.push(numbersIn(T));
    }

    // Nine games in ten, choosing well: the chance the box is shut within k throws, k by k.
    let long = Infinity;
    if (!stuck.length) {
        let done = new Float64Array(N);
        done[0] = 1;
        for (let k = 1; k <= 200; k++) {
            const next = new Float64Array(N);
            next[0] = 1;
            for (const T of reach) {
                if (!T) continue;
                let p = 0;
                throws.forEach((t, ti) => {
                    const e = bestEnd[T * throws.length + ti] ?? -1;
                    p += t.p * (e < 0 ? (done[T] ?? 0) : (done[e] ?? 0));
                });
                next[T] = p;
            }
            done = next;
            if ((done[top] ?? 0) >= 0.9) {
                long = k;
                break;
            }
        }
    }

    const out: Odds = {
        best: best[top] ?? Infinity,
        random: rand[top] ?? Infinity,
        wasted: { best: wasteB[top] ?? Infinity, random: wasteR[top] ?? Infinity },
        long,
        worst,
        stuck,
        boxes: reach.size,
        branch,
        start: { miss: miss[top] ?? 0 },
    };
    cache.set(id, out);
    return out;
}

/**
 * The levels, as an authored activity file would give them. Every one is two dice. Two dice added
 * reach a big number too seldom for a box above eight to be shut in a round, so the rungs climb by
 * what the pair may do rather than by a longer box: numbers a die shows, then up to eight added,
 * then up to nine added or multiplied, then taken away as well, then up to ten. The seeds are the ones
 * the levels had, each declared range is the range over the first hundred seeds, and no two levels of
 * the same box share a seed, since the same box and seed give the same throws.
 */
export const SHUT: Activity<ShutVersion> = {
    id: "shut.the-box",
    title: "Shut the box",
    kind: "shut",
    skills: ["subitising", "addition.doubles", "multiplication.tables", "chance.dice"],
    grades: [1, 4],
    paper: "groups.dice-total",
    versions: [
        {
            values: "numbers 1 to 6, two dice, added",
            v: {
                tiles: 6,
                ops: "add",
                seed: 2,
                odds: { throws: [6.5, 7.5], long: 10, gain: 1.02 },
                proof: { shortest: [9, 22], patience: 1 },
            },
        },
        {
            values: "numbers 1 to 8, two dice, added",
            v: {
                tiles: 8,
                ops: "add",
                seed: 1,
                odds: { throws: [11.5, 12.5], long: 19, gain: 1.1 },
                proof: { shortest: [15, 41], patience: 1.05 },
            },
        },
        {
            values: "numbers 1 to 9, two dice, added or multiplied",
            v: {
                tiles: 9,
                ops: "times",
                seed: 3,
                odds: { throws: [12.5, 13.5], long: 20, gain: 1.12 },
                proof: { shortest: [18, 31], patience: 1.25 },
            },
        },
        {
            values: "numbers 1 to 9, two dice, added, taken away or multiplied",
            v: {
                tiles: 9,
                ops: "all",
                seed: 5,
                odds: { throws: [12, 13], long: 20, gain: 1.18 },
                proof: { shortest: [18, 26], patience: 1.4 },
            },
        },
        {
            values: "numbers 1 to 10, two dice, added, taken away or multiplied",
            v: {
                tiles: 10,
                ops: "all",
                seed: 6,
                odds: { throws: [14.5, 15], long: 23, gain: 1.18 },
                proof: { shortest: [22, 27], patience: 1.5 },
            },
        },
    ],
};
