// Firefly trail: a firefly flies a night garden and strings the seeds it collects into a glowing
// trail, in the order a count goes.
//
// A tap on a seed sends the firefly to it on a curve round the hedges, nettles and webs, and a finger
// held on the field is followed closely; left alone it hovers. The keys fly it as they always have:
// it keeps flying, left and right turn it, and holding space hurries it. Numbered seeds glow
// in the garden, some drifting; only the next number in the count joins the trail, and when it does
// the trail grows by the count's step, one bead for each one counted and a colour for each step, so
// the trail is always as long as the count so far. A seed that is not next is nudged away and floats
// back. Nettles, frogs that snap at a passing trail and, on the last level, flying through the trail
// itself knock the last beads off, and they scatter where they fell; a hovering firefly goes back for
// them on its own, so a knock costs a little flying and nothing else. Spiders' webs slow the firefly,
// wind pushes it, and hedges turn it back. On the windy hill the count goes backwards: the trail starts
// long and each seed takes its step off it. There is no clock and nothing to lose. See .docs/games.md.
import { follow, keepInside, lead, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import { moverAt, type Path } from "../../engine/motion/mover";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Light, Mark, Sprite, Water } from "../../engine/motion/scene";
import { seeded } from "../../engine/motion/spawn";
import { arrive, clampLength, towards } from "../../engine/motion/steer";
import { knob } from "../../engine/motion/tune";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { BEYOND, ground, row } from "./scenery";

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface FireflyLevel extends ActionLevel {
    /** Squares across; the garden is always thirty squares tall with its ground at 27. */
    across: number;
    /** The count starts here and goes up (or down, with `back`) by `by`, one seed a step, `seeds` steps. */
    from: number;
    by: number;
    seeds: number;
    back?: true;
    /** Numbers glowing in the garden that are not in the count. */
    decoys: number[];
    /** Where seeds may glow, one for every seed and decoy; a layout chooses which number glows where. */
    spots: Pt[];
    /** Seeds that drift, by the spot they start at, there and back by this many squares across. */
    drift?: { spot: number; by: number }[];
    nettles: { x: number; stems: number }[];
    webs: { x: number; y: number; r: number }[];
    winds: (Rect & { push: Pt; period: number })[];
    hedges: Rect[];
    /** Frogs hop there and back between two places on the ground. */
    frogs: { from: number; to: number; speed: number }[];
    /** Water along the ground, from and to, where the frogs sit on stones. */
    pond?: { from: number; to: number };
    /** Flying through the trail knocks its last beads off. */
    crossing?: true;
    prompt: string;
}

const G = 27;
const H = 30;

export const FIREFLY_LEVELS: Levels<FireflyLevel> = [
    {
        title: "Count in twos",
        grades: [1, 1],
        goal: "Fly to the seeds in twos, 2, 4, 6, up to 20.",
        prompt: "Tap the glowing seed, and the firefly flies to it.",
        across: 64,
        from: 0,
        by: 2,
        seeds: 10,
        decoys: [3, 7, 11, 15],
        spots: [
            { x: 10, y: 12 },
            { x: 16, y: 20 },
            { x: 21, y: 8 },
            { x: 26, y: 16 },
            { x: 31, y: 23 },
            { x: 35, y: 10 },
            { x: 40, y: 18 },
            { x: 44, y: 6 },
            { x: 48, y: 14 },
            { x: 52, y: 22 },
            { x: 55, y: 9 },
            { x: 58, y: 17 },
            { x: 13, y: 5 },
            { x: 38, y: 25 },
        ],
        nettles: [],
        webs: [],
        winds: [],
        hedges: [],
        frogs: [],
    },
    {
        title: "Fives by the nettles",
        grades: [1, 2],
        goal: "Fly to the seeds in fives, up to 40. Keep away from the nettles.",
        prompt: "Nettles knock beads off. The firefly flies back for them.",
        across: 72,
        from: 0,
        by: 5,
        seeds: 8,
        decoys: [12, 18, 23, 32],
        spots: [
            { x: 11, y: 20 },
            { x: 17, y: 10 },
            { x: 23, y: 21 },
            { x: 29, y: 7 },
            { x: 35, y: 17 },
            { x: 42, y: 22 },
            { x: 48, y: 9 },
            { x: 54, y: 19 },
            { x: 60, y: 12 },
            { x: 65, y: 21 },
            { x: 20, y: 4 },
            { x: 45, y: 4 },
        ],
        nettles: [
            { x: 14, stems: 3 },
            { x: 26, stems: 4 },
            { x: 39, stems: 3 },
            { x: 51, stems: 4 },
            { x: 62, stems: 3 },
        ],
        webs: [],
        winds: [],
        hedges: [],
        frogs: [],
    },
    {
        title: "Tens over the pond",
        grades: [2, 2],
        goal: "Fly to the seeds in tens, up to 60. The frogs snap at a trail that flies low.",
        prompt: "Frogs snap at a low trail. Wait for a frog to hop away, then tap.",
        across: 76,
        from: 0,
        by: 10,
        seeds: 6,
        decoys: [15, 25, 45, 55],
        spots: [
            { x: 12, y: 14 },
            { x: 20, y: 21 },
            { x: 28, y: 9 },
            { x: 36, y: 18 },
            { x: 44, y: 6 },
            { x: 52, y: 20 },
            { x: 60, y: 12 },
            { x: 67, y: 19 },
            { x: 24, y: 4 },
            { x: 48, y: 13 },
        ],
        nettles: [{ x: 8, stems: 2 }],
        webs: [],
        winds: [],
        hedges: [],
        frogs: [
            { from: 22, to: 34, speed: 1.6 },
            { from: 42, to: 56, speed: 2 },
        ],
        pond: { from: 18, to: 60 },
    },
    {
        title: "Threes in the hedge maze",
        grades: [2, 3],
        goal: "Fly to the seeds in threes, up to 30, round the hedges.",
        prompt: "The firefly flies round the hedges and webs on its own.",
        across: 80,
        from: 0,
        by: 3,
        seeds: 10,
        decoys: [10, 14, 20, 25, 29],
        spots: [
            { x: 9, y: 22 },
            { x: 12, y: 8 },
            { x: 23, y: 5 },
            { x: 24, y: 22 },
            { x: 32, y: 21 },
            { x: 38, y: 10 },
            { x: 41, y: 22 },
            { x: 51, y: 5 },
            { x: 55, y: 17 },
            { x: 65, y: 22 },
            { x: 68, y: 8 },
            { x: 74, y: 15 },
            { x: 36, y: 25 },
            { x: 58, y: 25 },
            { x: 6, y: 5 },
        ],
        nettles: [],
        webs: [
            { x: 22, y: 14, r: 2.5 },
            { x: 53, y: 11, r: 2.5 },
        ],
        winds: [],
        hedges: [
            { x: 16, y: 9, w: 3, h: 18 },
            { x: 29, y: 2, w: 3, h: 16 },
            { x: 45, y: 10, w: 3, h: 17 },
            { x: 60, y: 2, w: 3, h: 16 },
        ],
        frogs: [],
    },
    {
        title: "Back in fours on the windy hill",
        grades: [3, 3],
        goal: "The trail starts 40 beads long. Fly to the seeds counting back in fours, 36, 32, down to 0.",
        prompt: "Each seed takes four beads off. The wind blows in gusts.",
        across: 76,
        from: 40,
        by: 4,
        seeds: 10,
        back: true,
        decoys: [30, 22, 18, 6],
        spots: [
            { x: 10, y: 18 },
            { x: 15, y: 8 },
            { x: 22, y: 20 },
            { x: 27, y: 6 },
            { x: 33, y: 15 },
            { x: 39, y: 22 },
            { x: 43, y: 9 },
            { x: 49, y: 19 },
            { x: 55, y: 7 },
            { x: 60, y: 16 },
            { x: 66, y: 22 },
            { x: 70, y: 10 },
            { x: 20, y: 13 },
            { x: 52, y: 13 },
        ],
        nettles: [
            { x: 30, stems: 3 },
            { x: 58, stems: 3 },
        ],
        webs: [],
        winds: [
            { x: 18, y: 2, w: 10, h: 24, push: { x: 0, y: -5 }, period: 4 },
            { x: 44, y: 2, w: 10, h: 24, push: { x: -4.5, y: 0 }, period: 5 },
        ],
        hedges: [],
        frogs: [],
    },
    {
        title: "Sixes at midnight",
        grades: [4, 4],
        goal: "Fly to the seeds in sixes, up to 60. Some drift, and flying through your own trail knocks beads off.",
        prompt: "Keep your trail untangled. Some seeds drift.",
        across: 88,
        from: 0,
        by: 6,
        seeds: 10,
        decoys: [16, 26, 34, 44, 50, 56],
        spots: [
            { x: 10, y: 14 },
            { x: 17, y: 22 },
            { x: 22, y: 7 },
            { x: 30, y: 17 },
            { x: 36, y: 5 },
            { x: 43, y: 21 },
            { x: 48, y: 11 },
            { x: 56, y: 19 },
            { x: 62, y: 6 },
            { x: 68, y: 15 },
            { x: 74, y: 22 },
            { x: 80, y: 9 },
            { x: 26, y: 12 },
            { x: 52, y: 14 },
            { x: 66, y: 24 },
            { x: 84, y: 18 },
        ],
        drift: [
            { spot: 3, by: 4 },
            { spot: 7, by: 5 },
            { spot: 12, by: 3 },
        ],
        nettles: [
            { x: 34, stems: 3 },
            { x: 71, stems: 4 },
        ],
        webs: [{ x: 58, y: 11, r: 2.4 }],
        winds: [{ x: 38, y: 2, w: 9, h: 22, push: { x: 0, y: 4 }, period: 4.5 }],
        hedges: [],
        frogs: [{ from: 44, to: 56, speed: 1.8 }],
        crossing: true,
    },
];

const RATE = 60,
    DT = 1 / RATE;
/** Steps a frog's snap lasts. */
const SNAP = Math.round(RATE * 0.45);
/** The lowest a fallen bead floats. */
const HOVER = G - 5.5;
const VIEW = { w: 40, h: 24 } as const;

export const FIREFLY = {
    cruise: knob(
        7,
        4,
        11,
        0.1,
        "squares a second",
        "a tap sends it across the view in a few seconds, quick enough not to wait and slow enough to follow",
    ),
    keys: knob(
        3.6,
        2,
        6,
        0.1,
        "squares a second",
        "flying by the keys, it drifts along fast enough to feel alive and slow enough to aim",
    ),
    boost: knob(
        6.5,
        4,
        10,
        0.1,
        "squares a second",
        "held, the big button or the up arrow sends it quickly across the garden",
    ),
    turn: knob(
        3,
        1.5,
        6,
        0.1,
        "radians a second",
        "a held arrow turns it round in about two seconds, a curve a child can steer",
    ),
    grip: knob(
        14,
        6,
        30,
        0.5,
        "squares a second, each second",
        "how quickly it changes direction, so its way round a hedge is a curve and a finger is followed closely",
    ),
    gap: knob(
        0.42,
        0.3,
        0.8,
        0.02,
        "squares",
        "beads close enough to read as a string and far enough apart to count",
    ),
    reach: knob(
        1.2,
        0.6,
        2,
        0.1,
        "squares",
        "a seed is caught when the firefly comes this near, generous for a small hand",
    ),
    aim: knob(
        2.2,
        1.2,
        3.5,
        0.1,
        "squares",
        "a tap this near a seed is a tap on it, a seed being smaller than a fingertip",
    ),
};

/** Where the firefly is going: to a seed at its spot, to a place tapped, or back for fallen beads. */
type Goal = { seed: number } | { at: Pt } | { beads: true };

interface Seed {
    n: number;
    spot: number;
    /** Nudged off its place by a wrong touch, and floating back. */
    off: Pt;
    v: Pt;
    got: boolean;
}

interface Loose {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface FireflyState {
    level: number;
    L: FireflyLevel;
    /** The seed numbers by spot: which number glows at each spot in this layout. */
    layout: number[];
    seeds: Seed[];
    at: Pt;
    v: Pt;
    goal: Goal | null;
    /** The next place on its way round what is in the way, and the step it was worked out on. */
    way: Pt | null;
    wayAt: number;
    /** Flying by the keys: it keeps flying along `heading`, radians from the right, until a tap or a finger takes over. */
    keyed: boolean;
    heading: number;
    /** Steps it has hovered with nowhere to go. */
    idle: number;
    /** The wrong seed that last shied away, by spot, which shies again only once the firefly has left it. */
    shy: number;
    /** Where the firefly has flown, newest first, a sample every short way, which the beads are strung along. */
    path: Pt[];
    /** Beads on the string now. */
    beads: number;
    loose: Loose[];
    /** How many seeds of the count have been caught. */
    next: number;
    /** Steps left before a hazard can knock beads off again. */
    hurt: number;
    frogs: { snap: number; cool: number }[];
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
    drops: number;
    cam: Cam;
}

/** The numbers of the count, in the order they are caught. */
export const countOf = (L: FireflyLevel): number[] =>
    Array.from({ length: L.seeds }, (_, i) => (L.back ? L.from - (i + 1) * L.by : (i + 1) * L.by));

/** The beads a finished trail holds. */
const target = (L: FireflyLevel): number => (L.back ? 0 : L.seeds * L.by);

/**
 * Which number glows at which spot for a seed of a layout. A seed chooses which spots hold the decoys;
 * the count then takes the other spots from left to right, so the garden unfolds as it is flown and
 * the next seed is never far behind.
 */
export function layoutOf(L: FireflyLevel, seed: number): number[] {
    const rnd = seeded(seed * 7919 + L.seeds * 31 + L.by);
    const spots = L.spots.map((_, i) => i);
    const decoys = new Set<number>();
    while (decoys.size < L.decoys.length) {
        const i = spots[1 + Math.floor(rnd() * (spots.length - 1))];
        if (i !== undefined) decoys.add(i);
    }
    const out: number[] = L.spots.map(() => 0);
    const count = countOf(L),
        rest = spots
            .filter((i) => !decoys.has(i))
            .sort((p, q) => (L.spots[p]?.x ?? 0) - (L.spots[q]?.x ?? 0));
    rest.forEach((i, k) => (out[i] = count[k] ?? 0));
    [...decoys].forEach((i, k) => (out[i] = L.decoys[k] ?? 0));
    return out;
}

export function startFirefly(L: FireflyLevel, level: number, layout: number[]): FireflyState {
    const at = { x: 4, y: 14 };
    const s: FireflyState = {
        level,
        L,
        layout: [...layout],
        seeds: layout.map((n, spot) => ({
            n,
            spot,
            off: { x: 0, y: 0 },
            v: { x: 0, y: 0 },
            got: false,
        })),
        at,
        v: { x: 0, y: 0 },
        goal: null,
        way: null,
        wayAt: 0,
        keyed: false,
        heading: 0,
        idle: 0,
        shy: -1,
        path: [{ ...at }],
        beads: L.back ? L.from : 0,
        loose: [],
        next: 0,
        hurt: 0,
        frogs: L.frogs.map(() => ({ snap: 0, cool: 0 })),
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
        drops: 0,
        cam: { x: 0, y: 0, zoom: 1 },
    };
    s.cam = { ...keepInside(wanted(s), VIEW, worldOf(L)), zoom: 1 };
    return s;
}

export const start = (level: number, seed = 1): FireflyState => {
    const L = FIREFLY_LEVELS[level] ?? FIREFLY_LEVELS[0];
    return startFirefly(L, level, layoutOf(L, seed));
};

const worldOf = (L: FireflyLevel) => ({ w: L.across, h: H });
const wanted = (s: FireflyState): Cam => ({
    ...lead(s.at, s.v, 0.6, 5),
    zoom: 1,
});

function tell(s: FireflyState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** A drifting seed's path about its spot, there and back. */
function driftOf(L: FireflyLevel, spot: number): Path | null {
    const d = L.drift?.find((x) => x.spot === spot),
        at = L.spots[spot];
    if (!d || !at) return null;
    return {
        points: [
            { x: at.x - d.by, y: at.y },
            { x: at.x + d.by, y: at.y },
        ],
        speed: 1.4,
        mode: "bounce",
        phase: spot,
    };
}

/** Where a seed glows now. */
export function seedAt(s: FireflyState, seed: Seed): Pt {
    const home = s.L.spots[seed.spot] ?? { x: 0, y: 0 },
        path = driftOf(s.L, seed.spot);
    const at = path ? moverAt(path, s.steps * DT).at : home;
    return { x: at.x + seed.off.x, y: at.y + seed.off.y };
}

/** The seed the count wants next, or null once every one is caught. */
export function wantedSeed(s: FireflyState): Seed | null {
    const n = countOf(s.L)[s.next];
    return n === undefined ? null : (s.seeds.find((x) => x.n === n && !x.got) ?? null);
}

/** Where each bead on the string is, newest first: one every `gap` squares back along the path flown. */
export function beadsAt(s: FireflyState): Pt[] {
    const out: Pt[] = [],
        gap = FIREFLY.gap.value;
    let need = gap * 1.6,
        prev = s.at;
    for (const p of s.path) {
        let d = Math.hypot(p.x - prev.x, p.y - prev.y);
        while (d >= need && out.length < s.beads) {
            const k = need / d;
            prev = { x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k };
            out.push(prev);
            d = Math.hypot(p.x - prev.x, p.y - prev.y);
            need = gap;
        }
        need -= d;
        prev = p;
        if (out.length >= s.beads) break;
    }
    // a short path, at the start, piles the rest of the beads at its end
    while (out.length < s.beads) out.push({ ...(out.at(-1) ?? s.at) });
    return out;
}

/** Knocks the last `n` beads off the string, to scatter where they were and be picked up again. */
function knock(s: FireflyState, n: number, out: Happening[], why: string): void {
    if (s.L.back || s.hurt > 0 || s.beads === 0) return;
    const all = beadsAt(s),
        off = Math.min(n, s.beads);
    const rnd = seeded(s.steps * 13 + s.drops * 101 + 7);
    for (let i = 0; i < off; i++) {
        const p = all[all.length - 1 - i] ?? s.at,
            a = rnd() * Math.PI * 2;
        s.loose.push({ x: p.x, y: p.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2 });
    }
    s.beads -= off;
    s.drops++;
    s.hurt = RATE;
    out.push({ cue: "bump" }, { burst: { kind: "sparkle", x: s.at.x, y: s.at.y, n: 6 } });
    tell(
        s,
        `${why} ${off} ${off === 1 ? "bead fell" : "beads fell"}. Fly through them to pick them up.`,
    );
}

const inside = (p: Pt, r: Rect, pad = 0) =>
    p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;

/** Whether a gust in a windy place is blowing now: half of every period. */
const blowing = (s: FireflyState, w: FireflyLevel["winds"][number]) =>
    ((s.steps * DT) % w.period) / w.period < 0.5;

/** Where a frog sits now, on the ground or its stone, and which way it faces. */
export function frogAt(s: FireflyState, i: number): { at: Pt; facing: 1 | -1 } {
    const f = s.L.frogs[i];
    if (!f) return { at: { x: 0, y: G }, facing: 1 };
    const m = moverAt(
        {
            points: [
                { x: f.from, y: G },
                { x: f.to, y: G },
            ],
            speed: f.speed,
            mode: "bounce",
            phase: i * 2,
        },
        s.steps * DT,
    );
    return { at: m.at, facing: m.v.x < 0 ? -1 : 1 };
}

/** Whether a square of the garden is somewhere the firefly's way goes round: a hedge, a nettle bed or a web. */
function blocked(s: FireflyState, x: number, y: number): boolean {
    const L = s.L;
    if (x < 1 || x > L.across - 1 || y < 1.5 || y > G - 1) return true;
    for (const h of L.hedges)
        if (x > h.x - 1.2 && x < h.x + h.w + 1.2 && y > h.y - 1.2 && y < h.y + h.h + 1.2)
            return true;
    for (const n of L.nettles) {
        const half = (Math.ceil(n.stems * 1.4 + 1.4) * 0.9) / 2;
        if (Math.abs(x - n.x) < half + 1.2 && y > G - 4.6) return true;
    }
    for (const w of L.webs) if (Math.hypot(x - w.x, y - w.y) < w.r + 1) return true;
    return false;
}

/**
 * The next place on a short way to `to` round whatever is in the way, found square by square: a few
 * squares along it, so the firefly flies a curve rather than a staircase. Straight there when nothing is.
 */
function wayTo(s: FireflyState, to: Pt): Pt {
    const W = Math.ceil(s.L.across) + 1,
        key = (x: number, y: number) => y * W + x;
    const from = { x: Math.round(s.at.x), y: Math.round(s.at.y) },
        goal = { x: Math.round(to.x), y: Math.round(to.y) },
        back = new Map<number, number>([[key(from.x, from.y), -1]]),
        q: Pt[] = [from];
    for (let k = 0; k < q.length; k++) {
        const c = q[k] ?? from;
        if (Math.abs(c.x - goal.x) <= 1 && Math.abs(c.y - goal.y) <= 1) {
            const trail: number[] = [];
            for (let at = key(c.x, c.y); at !== -1; at = back.get(at) ?? -1) trail.push(at);
            if (trail.length <= 4) return to;
            const ahead = trail[trail.length - 4] ?? key(goal.x, goal.y);
            return { x: ahead % W, y: Math.floor(ahead / W) };
        }
        for (const [dx, dy] of NEIGHBOURS) {
            const nx = c.x + dx,
                ny = c.y + dy,
                nk = key(nx, ny);
            if (back.has(nk)) continue;
            const near = Math.abs(nx - goal.x) <= 1 && Math.abs(ny - goal.y) <= 1;
            if (!near && blocked(s, nx, ny)) continue;
            back.set(nk, key(c.x, c.y));
            q.push({ x: nx, y: ny });
        }
    }
    return to;
}

const NEIGHBOURS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
] as const;

/** The nearest fallen bead, or null when none has fallen. */
function nearestLoose(s: FireflyState): Pt | null {
    let best: Pt | null = null;
    for (const b of s.loose)
        if (
            !best ||
            Math.hypot(b.x - s.at.x, b.y - s.at.y) < Math.hypot(best.x - s.at.x, best.y - s.at.y)
        )
            best = { x: b.x, y: b.y };
    return best;
}

/** Where the goal is now, or null once it is reached or gone. */
function goalAt(s: FireflyState): Pt | null {
    const g = s.goal;
    if (!g) return null;
    if ("seed" in g) {
        const seed = s.seeds.find((x) => x.spot === g.seed);
        return seed && !seed.got ? seedAt(s, seed) : null;
    }
    if ("beads" in g) return nearestLoose(s);
    return g.at;
}

/** The seed a tap lands on, if one is near enough to count as tapped. */
function tappedSeed(s: FireflyState, p: Pt): number {
    let best = -1,
        far = FIREFLY.aim.value;
    for (const seed of s.seeds) {
        if (seed.got) continue;
        const at = seedAt(s, seed),
            d = Math.hypot(at.x - p.x, at.y - p.y);
        if (d < far) {
            far = d;
            best = seed.spot;
        }
    }
    return best;
}

function steer(s: FireflyState, pad: Pad): void {
    const keys = new Set([...pad.holding, ...pad.pressed]);
    // any key flies it by the keys: left and right turn it, up or the big button hurry it, down slows it
    if (keys.size || pad.go || pad.brake) {
        if (!s.keyed) s.heading = Math.hypot(s.v.x, s.v.y) > 0.3 ? Math.atan2(s.v.y, s.v.x) : 0;
        s.keyed = true;
        s.touched = true;
        s.goal = null;
        s.way = null;
    }
    if (pad.lifted || pad.touch) s.keyed = false;
    if (s.keyed) {
        let speed = FIREFLY.keys.value;
        if (pad.go || keys.has("up")) speed = FIREFLY.boost.value;
        if (pad.brake || keys.has("down")) speed = FIREFLY.keys.value * 0.45;
        if (keys.has("left")) s.heading -= FIREFLY.turn.value * DT;
        if (keys.has("right")) s.heading += FIREFLY.turn.value * DT;
        s.idle = 0;
        const want = { x: Math.cos(s.heading) * speed, y: Math.sin(s.heading) * speed };
        s.v = towards(s.v, want, FIREFLY.grip.value * DT);
        return;
    }
    if (pad.lifted) {
        const spot = tappedSeed(s, pad.lifted);
        s.goal = spot >= 0 ? { seed: spot } : { at: { ...pad.lifted } };
        s.touched = true;
    }
    const t = pad.touch;
    let to: Pt | null;
    if (t) {
        // a held finger is followed straight, closely: the child is choosing the way
        s.touched = true;
        s.goal = null;
        to = t;
    } else {
        if (!s.goal && s.loose.length && s.idle > RATE * 0.8) s.goal = { beads: true };
        to = goalAt(s);
        if (!to) s.goal = null;
        else if (!("seed" in (s.goal ?? {})) && Math.hypot(to.x - s.at.x, to.y - s.at.y) < 0.35)
            s.goal = null;
    }
    if (to && !t) {
        if (!s.way || s.steps - s.wayAt >= 8) {
            s.way = wayTo(s, to);
            s.wayAt = s.steps;
        }
    } else s.way = null;
    const aim = t ? t : s.goal ? (s.way ?? to) : null;
    const want = aim ? arrive(s.at, aim, FIREFLY.cruise.value, t ? 1 : 2.2) : { x: 0, y: 0 };
    s.idle = aim ? 0 : s.idle + 1;
    s.v = towards(s.v, want, FIREFLY.grip.value * DT);
}

function fly(s: FireflyState, out: Happening[]): void {
    const L = s.L;
    for (const w of L.webs)
        if (Math.hypot(s.at.x - w.x, s.at.y - w.y) < w.r) s.v = clampLength(s.v, 1.2);
    for (const w of L.winds)
        if (blowing(s, w) && inside(s.at, w))
            s.v = { x: s.v.x + w.push.x * DT, y: s.v.y + w.push.y * DT };
    s.at = { x: s.at.x + s.v.x * DT, y: s.at.y + s.v.y * DT };
    // the edges of the garden turn it back
    const lo = { x: 1, y: 1.5 },
        hi = { x: L.across - 1, y: G - 0.8 };
    if (s.at.x < lo.x || s.at.x > hi.x) {
        s.at.x = Math.max(lo.x, Math.min(hi.x, s.at.x));
        s.v.x = -s.v.x * 0.5;
    }
    if (s.at.y < lo.y || s.at.y > hi.y) {
        s.at.y = Math.max(lo.y, Math.min(hi.y, s.at.y));
        s.v.y = -s.v.y * 0.5;
    }
    // flying by the keys, a bounce off an edge turns its heading as well, so it flies away from the edge
    if (s.keyed && (s.at.x <= lo.x || s.at.x >= hi.x || s.at.y <= lo.y || s.at.y >= hi.y))
        s.heading = Math.atan2(s.v.y, s.v.x);
    for (const h of L.hedges) {
        if (!inside(s.at, h, 0.5)) continue;
        const left = s.at.x - (h.x - 0.5),
            right = h.x + h.w + 0.5 - s.at.x,
            top = s.at.y - (h.y - 0.5),
            bottom = h.y + h.h + 0.5 - s.at.y;
        const least = Math.min(left, right, top, bottom);
        if (least === left) s.at.x = h.x - 0.5;
        else if (least === right) s.at.x = h.x + h.w + 0.5;
        else if (least === top) s.at.y = h.y - 0.5;
        else s.at.y = h.y + h.h + 0.5;
        if (least === left || least === right) s.v.x = -s.v.x * 0.5;
        else s.v.y = -s.v.y * 0.5;
        if (s.keyed) s.heading = Math.atan2(s.v.y, s.v.x);
        if (s.steps % 12 === 0) out.push({ cue: "bump" });
    }
    const last = s.path[0];
    if (!last || Math.hypot(s.at.x - last.x, s.at.y - last.y) >= 0.12) s.path.unshift({ ...s.at });
    const keep =
        Math.ceil(((Math.max(s.beads, L.back ? L.from : 0) + 6) * FIREFLY.gap.value) / 0.12) + 10;
    if (s.path.length > keep) s.path.length = keep;
}

function hazards(s: FireflyState, out: Happening[]): void {
    const L = s.L;
    if (s.hurt > 0) s.hurt--;
    for (const n of L.nettles) {
        const half = (Math.ceil(n.stems * 1.4 + 1.4) * 0.9) / 2;
        if (Math.abs(s.at.x - n.x) < half && s.at.y > G - 3.4) {
            s.v = { x: s.v.x * 0.4, y: -4 };
            if (s.hurt === 0) {
                out.push({ burst: { kind: "dust", x: s.at.x, y: s.at.y, n: 4 } });
                if (L.back) {
                    out.push({ cue: "bump" });
                    s.hurt = RATE;
                } else knock(s, L.by, out, "Ouch, nettles.");
            }
        }
    }
    s.frogs.forEach((f, i) => {
        if (f.snap > 0) f.snap--;
        if (f.cool > 0) f.cool--;
        if (f.cool > 0) return;
        const frog = frogAt(s, i),
            mouth = { x: frog.at.x + frog.facing * 1.4, y: frog.at.y - 1.3 };
        const near = [s.at, ...beadsAt(s)].some(
            (p) => Math.hypot(p.x - mouth.x - frog.facing * 1.2, p.y - mouth.y) < 2.2,
        );
        if (!near) return;
        f.snap = SNAP;
        f.cool = RATE * 3;
        out.push({ cue: "splash" });
        knock(s, L.by, out, "Snap, a frog.");
    });
    if (L.crossing && s.hurt === 0) {
        const all = beadsAt(s);
        for (let i = 8; i < all.length; i++) {
            const b = all[i];
            if (b && Math.hypot(b.x - s.at.x, b.y - s.at.y) < 0.35) {
                knock(s, L.by, out, "The trail got tangled.");
                break;
            }
        }
    }
}

function collect(s: FireflyState, out: Happening[]): void {
    const L = s.L,
        reach = FIREFLY.reach.value,
        want = wantedSeed(s);
    const shy = s.seeds.find((x) => x.spot === s.shy);
    if (shy) {
        const at = seedAt(s, shy);
        if (Math.hypot(at.x - s.at.x, at.y - s.at.y) > reach * 2) s.shy = -1;
    }
    for (const seed of s.seeds) {
        if (seed.got) continue;
        const at = seedAt(s, seed),
            d = Math.hypot(at.x - s.at.x, at.y - s.at.y);
        if (d >= reach) continue;
        if (s.goal && "seed" in s.goal && s.goal.seed === seed.spot) s.goal = null;
        if (seed === want) {
            seed.got = true;
            s.next++;
            s.beads += L.back ? -L.by : L.by;
            out.push({ cue: "ring" }, { burst: { kind: "sparkle", x: at.x, y: at.y, n: 10 } });
            const next = wantedSeed(s);
            tell(
                s,
                next
                    ? `${seed.n}. The trail is ${s.beads} ${s.beads === 1 ? "bead" : "beads"} long. Next is ${next.n}.`
                    : `${seed.n}.`,
            );
            continue;
        }
        // a seed that is not next is nudged away, and floats back
        if (seed.spot !== s.shy && Math.hypot(seed.off.x, seed.off.y) < 0.6) {
            s.shy = seed.spot;
            // it shies away from the firefly, or upwards when the firefly is right on it
            seed.v =
                d > 0.05
                    ? { x: ((at.x - s.at.x) / d) * 7, y: ((at.y - s.at.y) / d) * 7 }
                    : { x: 0, y: -7 };
            out.push({ cue: "nope" });
            tell(s, `Not yet. That is ${seed.n}.${want ? ` The next is ${want.n}.` : ""}`);
        }
    }
    s.loose = s.loose.filter((b) => {
        if (Math.hypot(b.x - s.at.x, b.y - s.at.y) >= reach) return true;
        s.beads++;
        out.push({ cue: "place" });
        return false;
    });
}

function drift(s: FireflyState): void {
    for (const seed of s.seeds) {
        seed.v = {
            x: seed.v.x + (-12 * seed.off.x - 4 * seed.v.x) * DT,
            y: seed.v.y + (-12 * seed.off.y - 4 * seed.v.y) * DT,
        };
        seed.off = { x: seed.off.x + seed.v.x * DT, y: seed.off.y + seed.v.y * DT };
    }
    // a fallen bead floats down only to a height above the nettles and the frogs, so it can always be picked up
    for (const b of s.loose) {
        b.vx *= 0.96;
        b.vy = b.vy * 0.96 + 1.5 * DT;
        b.x = Math.max(1.5, Math.min(s.L.across - 1.5, b.x + b.vx * DT));
        b.y = Math.max(2, Math.min(HOVER, b.y + b.vy * DT));
        if (b.y >= HOVER) b.vy = 0;
        for (const h of s.L.hedges)
            if (inside(b, h, 0.6)) b.x = b.x < h.x + h.w / 2 ? h.x - 0.8 : h.x + h.w + 0.8;
    }
}

export function step(s: FireflyState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!s.won) steer(s, pad);
    fly(s, out);
    drift(s);
    if (!s.won) {
        hazards(s, out);
        collect(s, out);
        if (s.next >= s.L.seeds && s.loose.length === 0 && s.beads === target(s.L)) {
            s.won = true;
            out.push({ cue: "win" }, { burst: { kind: "sparkle", x: s.at.x, y: s.at.y, n: 16 } });
            tell(
                s,
                s.L.back
                    ? `Down to 0. Every seed counted back in ${s.L.by}s.`
                    : `${target(s.L)} beads, in ${s.L.seeds} steps of ${s.L.by}.`,
            );
        }
    }
    s.cam = follow(s.cam, wanted(s), { rate: 2.4, dt: DT, view: VIEW, world: worldOf(s.L) });
    return out;
}

export function frame(s: FireflyState, rest = false): Frame {
    const L = s.L,
        W = worldOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const cam = rest ? { ...keepInside(wanted(s), VIEW, W), zoom: 1 } : s.cam;
    const eye = { cam, view: VIEW };
    sprites.push(
        {
            key: "moon",
            art: "moon",
            params: { phase: 0.85 },
            size: 3,
            x: 5,
            y: 3.5,
            fixed: true,
            z: 0,
        },
        ...row(
            {
                key: "stars",
                depth: 0.15,
                base: 7,
                every: 5,
                stray: 3,
                things: [
                    { art: "prop.star", size: 0.6, often: 3, lift: 3 },
                    { art: "prop.star", size: 0.4, often: 2, lift: 1 },
                ],
                z: 0,
                alpha: 0.7,
            },
            eye,
            3,
        ),
        ...row(
            {
                key: "far",
                depth: 0.45,
                base: G,
                every: 9,
                stray: 3,
                things: [
                    { art: "firs", params: { count: 3, snow: 0 }, size: 7, often: 2 },
                    {
                        art: "tree",
                        params: { fruit: 0, fallen: 0, item: "apple" },
                        size: 6,
                        often: 1,
                    },
                ],
                z: 1,
                alpha: 0.6,
            },
            eye,
            5,
        ),
    );
    sprites.push(...ground("ground", -BEYOND, L.across + BEYOND, G, 2));
    sprites.push(
        ...row(
            {
                key: "near",
                depth: 1,
                base: G,
                every: 7,
                stray: 3,
                gaps: 0.3,
                things: [
                    { art: "flowers", params: { count: 1, petals: 5 }, size: 1.6, often: 2 },
                    { art: "toadstools", params: { count: 1, spots: 3 }, size: 1.4, often: 1 },
                    {
                        art: "dandelion",
                        params: { seeds: 12, blown: 0, flower: 0 },
                        size: 1.4,
                        often: 1,
                    },
                ],
                z: 3,
            },
            eye,
            9,
        ),
    );
    L.nettles.forEach((n, i) =>
        sprites.push({
            key: `nettle:${i}`,
            art: "nettle",
            params: { stems: n.stems },
            size: Math.ceil(n.stems * 1.4 + 1.4) * 0.9,
            x: n.x,
            y: G,
            stand: true,
            z: 4,
            still: true,
        }),
    );
    L.webs.forEach((w, i) =>
        sprites.push({
            key: `web:${i}`,
            art: "cobweb",
            params: { spokes: 8, spider: 1 },
            size: w.r * 2,
            x: w.x,
            y: w.y,
            z: 3,
            still: true,
        }),
    );
    L.hedges.forEach((h, i) => {
        const tall = h.w / 3;
        for (let k = 0; k * tall < h.h; k++)
            sprites.push({
                key: `hedge:${i}:${k}`,
                art: "hedge",
                params: { clumps: 1, berries: (k + i) % 3, gap: 0 },
                size: h.w,
                x: h.x + h.w / 2,
                y: h.y + Math.min(h.h, (k + 0.5) * tall),
                seed: 20 + i * 10 + k,
                z: 4,
                still: true,
            });
    });
    L.winds.forEach((w, i) => {
        sprites.push({
            key: `windsock:${i}`,
            art: "windsock",
            size: 2.4,
            x: w.x + w.w / 2,
            y: G,
            stand: true,
            z: 4,
        });
        if (!blowing(s, w)) return;
        const t = s.steps * DT,
            len = Math.hypot(w.push.x, w.push.y) || 1,
            ux = w.push.x / len,
            uy = w.push.y / len;
        for (let k = 0; k < 6; k++) {
            const phase = (t * 0.8 + k * 0.37) % 1,
                cx = w.x + ((k * 0.61 + 0.2) % 1) * w.w + ux * phase * 4,
                cy = w.y + ((k * 0.43 + 0.1) % 1) * w.h + uy * phase * 4;
            marks.push({
                kind: "line",
                a: { x: cx, y: cy },
                b: { x: cx + ux * 1.6, y: cy + uy * 1.6 },
                style: "thin",
            });
        }
    });
    s.frogs.forEach((f, i) => {
        const frog = frogAt(s, i);
        if (L.pond)
            sprites.push({
                key: `pad:${i}`,
                art: "steppingstone",
                params: { n: "", w: 3, dark: 0 },
                size: 3,
                x: frog.at.x,
                y: G + 1.4,
                stand: true,
                z: 4,
            });
        const pose = f.snap > 0 ? "snap" : "sit";
        sprites.push({
            key: `frog:${i}`,
            art: "frog",
            params: { pose, facing: frog.facing },
            size: pose === "snap" ? 3.6 : 2.4,
            x: frog.at.x + (pose === "snap" ? frog.facing * 0.6 : 0),
            y: frog.at.y,
            stand: true,
            z: 5,
        });
    });
    const want = wantedSeed(s),
        pulse = 1 + 0.12 * Math.sin(s.steps * DT * 5);
    for (const seed of s.seeds) {
        if (seed.got) continue;
        const at = seedAt(s, seed),
            next = seed === want;
        sprites.push({
            key: `seed:${seed.spot}`,
            art: "numberball",
            params: { n: String(seed.n), tone: next ? "glow" : "sky" },
            size: 1.9,
            x: at.x,
            y: at.y,
            scale: next && !rest ? pulse : 1,
            glow: next ? 2.6 : 1.4,
            z: 6,
        });
        if (next) marks.push({ kind: "ring", x: at.x, y: at.y, r: 1.4, on: true });
    }
    const beads = beadsAt(s);
    beads.forEach((b, i) => {
        // counted from the far end, so each step of the count keeps its colour as the trail grows
        const k = beads.length - 1 - i;
        sprites.push({
            key: `bead:${k}`,
            art: "glowbead",
            params: { tone: Math.floor(k / L.by) % 2 ? "tang" : "glow" },
            size: 0.62,
            x: b.x,
            y: b.y,
            glow: 1.1,
            z: 7,
        });
    });
    s.loose.forEach((b, i) =>
        sprites.push({
            key: `loose:${i}`,
            art: "glowbead",
            params: { tone: "glow" },
            size: 0.62,
            x: b.x,
            y: b.y,
            glow: 0.9,
            z: 7,
            alpha: 0.85,
        }),
    );
    // hovering, it bobs, so a firefly with nowhere to go still looks alive
    const bob = rest ? 0 : Math.sin(s.steps * DT * 3) * 0.18 * Math.min(1, s.idle / (RATE * 0.4));
    sprites.push({
        key: "head",
        art: "guide.firefly",
        params: { pose: s.won ? "cheer" : "idle" },
        size: 2.2,
        x: s.at.x,
        y: s.at.y + bob,
        flip: s.v.x < -0.05,
        z: 8,
    });
    // the next seed, when it is out of sight, is pointed at from the edge of the view
    if (want && !rest) {
        const at = seedAt(s, want),
            hw = VIEW.w / 2 - 1.5,
            hh = VIEW.h / 2 - 1.5;
        const dx = at.x - cam.x,
            dy = at.y - cam.y;
        if (Math.abs(dx) > hw || Math.abs(dy) > hh) {
            const k = Math.min(
                hw / Math.max(Math.abs(dx), 1e-6),
                hh / Math.max(Math.abs(dy), 1e-6),
            );
            const edge = { x: cam.x + dx * k, y: cam.y + dy * k },
                len = Math.hypot(dx, dy);
            marks.push({
                kind: "line",
                a: { x: edge.x - (dx / len) * 1.6, y: edge.y - (dy / len) * 1.6 },
                b: edge,
                style: "aim",
                head: true,
            });
        }
    }
    marks.push({
        kind: "word",
        x: cam.x - VIEW.w / 2 + 6.5,
        y: cam.y - VIEW.h / 2 + 1.6,
        text: want ? `${s.beads} beads · next ${want.n}` : `${s.beads} beads`,
        size: 0.8,
    });
    const t = s.steps * DT;
    const lights: Light[] = [{ x: s.at.x, y: s.at.y, r: 5, flicker: !rest }];
    return {
        sprites,
        marks,
        camera: cam,
        view: VIEW,
        world: W,
        time: rest ? 0 : t,
        lights,
        water: L.pond ? [pondOf(s, L.pond, rest)] : [],
    };
}

/** How long apart a gliding frog's pad sends out a ripple, in seconds. */
const WAKE = 0.9;

/** The pond, with the rings a gliding frog's pad leaves behind it and the splash of a snap. */
function pondOf(s: FireflyState, pond: { from: number; to: number }, rest: boolean): Water {
    const ripples: NonNullable<Water["ripples"]> = [];
    const t = s.steps * DT;
    if (!rest)
        s.frogs.forEach((f, i) => {
            for (let k = Math.floor(t / WAKE); k >= 0 && t - k * WAKE < 2; k--) {
                const at = frogAt({ ...s, steps: Math.round(k * WAKE * RATE) }, i).at;
                ripples.push({ x: at.x, age: t - k * WAKE, size: 0.35 });
            }
            if (f.snap > 0)
                ripples.push({ x: frogAt(s, i).at.x, age: (SNAP - f.snap) * DT, size: 1 });
        });
    return {
        x: pond.from,
        w: pond.to - pond.from,
        level: G + 0.5,
        bottom: G + 3.4,
        waves: 0.06,
        ripples,
        z: 3.5,
        hue: "sky",
    };
}

export function say(s: FireflyState): string {
    const want = wantedSeed(s);
    const parts = [
        s.said,
        `The trail is ${s.beads} ${s.beads === 1 ? "bead" : "beads"} long.`,
        want
            ? `The next seed is ${want.n}. It is ${describeWay(s, seedAt(s, want))}.`
            : s.won
              ? "Every seed is caught."
              : "Every seed is caught; pick up the fallen beads.",
        s.loose.length
            ? `${s.loose.length} fallen ${s.loose.length === 1 ? "bead lies" : "beads lie"} in the garden.`
            : "",
    ];
    return parts.filter(Boolean).join(" ");
}

function describeWay(s: FireflyState, p: Pt): string {
    const dx = p.x - s.at.x,
        dy = p.y - s.at.y,
        far = Math.hypot(dx, dy);
    if (far < 2) return "right here";
    const across = Math.abs(dx) > 1.5 ? (dx > 0 ? "right" : "left") : "",
        up = Math.abs(dy) > 1.5 ? (dy < 0 ? "up" : "down") : "";
    return `${Math.round(far)} squares away, ${[up, across].filter(Boolean).join(" and ")}`;
}

export const snakeGame: ActionGame<FireflyState> = {
    id: "snake",
    title: "Firefly trail",
    group: "action",
    quiet: true,
    levels: FIREFLY_LEVELS,
    rate: RATE,
    touch: true,
    hint: "Tap the seed that comes next in the count, and the firefly flies to it, or hold a finger where it should fly. With the keys, the left and right arrows turn it and holding space sends it faster.",
    cover: { art: "guide.firefly", params: { pose: "cheer" } },
    // two ways to play: tap a seed and it flies there, or fly it by the keys and these buttons
    controls: {
        arrows: { left: "Turn left", right: "Turn right" },
        go: "Faster",
        icons: { go: "faster" },
    },
    start: (level, seed) => start(level, seed ?? 1),
    step,
    frame,
    say,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.next, total: s.L.seeds }),
    tuning: FIREFLY,
    still: { press: () => Math.round(RATE * 0.3), settling: (s) => s.goal !== null },
};
