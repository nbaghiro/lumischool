// The jugs, on the kitchen counter.
//
// The pour mechanic in pour.ts is untouched: fill a jug, tip one away, or pour one into another until
// one of them stops it. This file is the counter it is played on and the pour itself. A jug is picked
// up by its handle and sways as it is carried. Put down on another jug, it is lifted over that jug's
// mouth, tips on its spout and pours a stream, and the water in the two jugs falls and rises together
// until one of them stops it; put under the tap it is filled; put on the flowers it is tipped out over
// them from the back of its rim. Then it is set down in its place on the counter. A jug with nothing to
// give, or one already full, is refused in a sentence. Every move's beat ends on the next position's
// scene, which test/games.test.ts checks for every move of every level. See .docs/games.md.
import type { Choice, Ctx, Handle, Release, Session } from "./hands";
import type { Target } from "./pieces";
import type { Part, Scene } from "../../engine/motion/scene";
import { score, type Beat } from "../../engine/motion/beat";
import { flowAt, flowTime, type Flow } from "../../engine/motion/flow";
import type { Pt } from "../../engine/motion/geometry";
import { seeded } from "../../engine/motion/spawn";
import { SPRINGS } from "../../engine/motion/spring";
import { easeBack, timeline } from "../../engine/motion/timeline";
import { ACTIVITIES } from "./activities";
import type { TurnGame } from "./game";
import type { Position, Round } from "./games";

const LETTERS = "ABCD";
/**
 * The jug drawing's box, and places on it in its own squares, from src/art/capacity.ts: the lip of its
 * spout, the back of its rim, the middle of its mouth, its handle and the line it stands on.
 */
const JUG = { w: 11, h: 12 };
const SPOUT: Pt = { x: 1.9, y: 1.8 };
const RIM_BACK: Pt = { x: 8, y: 2 };
const MOUTH: Pt = { x: 5.5, y: 2 };
const HANDLE: Pt = { x: 9.6, y: 4.4 };
const FOOT = 10.4;
/** The water's surface in a jug's own squares: the drawing's scale runs from 10 when empty to 2.8 at the brim. */
const surface = (level: number, max: number): number =>
    10 - 7.2 * (max > 0 ? Math.max(0, Math.min(1, level / max)) : 0);

/**
 * In each drawing's own squares: the tap's spout; how far down the worktop drawing its surface is and
 * how tall the drawing is (engine/parts/food/worktop.ts); and the line the flowers grow from and the head of the flower.
 */
const TAP_SPOUT: Pt = { x: 4.65, y: 3.1 };
const WORKTOP = { top: 4.5, h: 13 };
const FLOWERS = { ground: 9, head: { x: 2.5, y: 1.2 } };
/** Squares of wall over the jugs, for a jug lifted over another and tipped; and squares between two jugs. */
const WALL = 9;
const GAP = 1.5;
/** How far a jug tips to pour, in radians, and how long a pour takes to start and to stop, in seconds. */
const TIP = 0.95;
const RAMP = 0.14;

export interface ReadJug {
    max: number;
    level: number;
    label: string;
}

/** The jugs as the board draws them, in their order on the bench. */
export function readJugs(pos: Position): ReadJug[] {
    return pos.board.parts
        .filter((p) => p.art === "jug")
        .map((p) => {
            const q = p.params as { max?: number; level?: number };
            return { max: q.max ?? 0, level: q.level ?? 0, label: p.label ?? "" };
        });
}

/** The amount on the order, read off the card the board pins up. */
const targetOf = (pos: Position): number => {
    const lines = pos.board.parts.find((p) => p.art === "pinned")?.params.lines;
    return Array.isArray(lines) ? Number.parseFloat(String(lines[1])) : Number.NaN;
};

const find = (pos: Position, start: string): number =>
    pos.moves.findIndex((m) => m.say.startsWith(start));

/** What dropping jug `i` on a place means: the mechanic's own move by index, or why there is none. */
export function pourChoice(pos: Position, i: number, onto: number | "tap" | "flowers"): Choice {
    const jugs = readJugs(pos),
        jug = jugs[i],
        L = LETTERS[i];
    if (!jug) return { moves: [] };
    if (onto === "tap") {
        const m = find(pos, `Fill jug ${L} `);
        return m >= 0 ? { moves: [m] } : { moves: [], refuse: `Jug ${L} is full already.` };
    }
    if (onto === "flowers") {
        const m = find(pos, `Tip jug ${L} `);
        return m >= 0 ? { moves: [m] } : { moves: [], refuse: `Jug ${L} is empty already.` };
    }
    if (onto === i) return { moves: [] };
    const M = LETTERS[onto];
    const m = pos.moves.findIndex(
        (x) => x.say.startsWith(`Pour jug ${L} `) && x.say.includes(` into jug ${M} `),
    );
    if (m >= 0) return { moves: [m] };
    return {
        moves: [],
        refuse:
            jug.level === 0
                ? `Jug ${L} is empty, so there is nothing to pour.`
                : `Jug ${M} is full.`,
    };
}

interface Kitchen {
    /** Where a jug stands under the tap, at the sink, and where each jug stands at home. */
    fill: Pt;
    jug(i: number): Pt;
    tap: Pt;
    plant: Pt;
    worktop: Pt;
    /** The worktop's length, a whole number of squares, and the square its sink is centred on. */
    length: number;
    sink: number;
    order: Pt;
    size: { w: number; h: number };
}

/** Where everything stands for `n` jugs: the tap over the sink at the left, the jugs along the worktop, the flowers at the right, and the order taped up over them. */
function kitchenOf(n: number): Kitchen {
    const fill = { x: 1, y: WALL };
    const plantX = 13.5 + n * (JUG.w + GAP) + 1;
    const length = Math.ceil(plantX + 6.5),
        surface = WALL + FOOT;
    return {
        fill,
        jug: (i) => ({ x: 13.5 + i * (JUG.w + GAP), y: WALL }),
        tap: { x: fill.x + MOUTH.x - TAP_SPOUT.x, y: WALL + MOUTH.y - 0.9 - TAP_SPOUT.y },
        plant: { x: plantX, y: surface - FLOWERS.ground },
        worktop: { x: 0, y: surface - WORKTOP.top },
        length,
        sink: fill.x + MOUTH.x,
        order: { x: length - 12.5, y: 0.4 },
        size: { w: length, h: surface - WORKTOP.top + WORKTOP.h },
    };
}

const TICK: Part["marks"] = [{ mark: "tick", at: "card" }];

function sceneOf(pos: Position): Scene {
    const jugs = pos.board.parts.filter((p) => p.art === "jug");
    const order = pos.board.parts.find((p) => p.art === "pinned");
    const k = kitchenOf(jugs.length);
    const parts: Part[] = [
        {
            art: "worktop",
            key: "worktop",
            at: k.worktop,
            params: { w: k.length, sink: k.sink },
            z: 1,
        },
        { art: "tap", key: "tap", at: k.tap, params: { running: false }, z: 5 },
        { art: "flowers", key: "plant", at: k.plant, params: { count: 1, petals: 5 }, z: 6 },
        // The letter is all a jug's label needs to say on the counter: its scale says what it holds, and the tray's chips name it by the letter.
        ...jugs.map((p, i): Part => ({
            ...p,
            label: LETTERS[i],
            key: `jug:${i}`,
            at: k.jug(i),
            pivot: SPOUT,
            hold: HANDLE,
            z: 20 + i,
        })),
    ];
    if (order)
        parts.push({ ...order, key: "order", at: k.order, z: 4, marks: pos.won ? TICK : [] });
    return { parts, size: k.size };
}

function handlesOf(pos: Position): Handle[] {
    const jugs = readJugs(pos),
        k = kitchenOf(jugs.length);
    const box = (at: Pt, w: number, h: number) => ({ x: at.x, y: at.y, w, h });
    return jugs.map((_, i): Handle => ({
        key: `jug:${i}`,
        mode: "free",
        home: k.jug(i),
        targets: [
            {
                id: "tap",
                shape: box({ x: k.fill.x, y: k.tap.y }, JUG.w, WALL + JUG.h - k.tap.y),
                carries: pourChoice(pos, i, "tap"),
            },
            {
                id: "flowers",
                shape: box({ x: k.plant.x - 1, y: k.plant.y }, 7, FLOWERS.ground + 1),
                carries: pourChoice(pos, i, "flowers"),
            },
            ...jugs.flatMap((__, j): Target<Choice>[] =>
                j === i
                    ? []
                    : [
                          {
                              id: `jug:${j}`,
                              shape: box(k.jug(j), JUG.w, JUG.h),
                              carries: pourChoice(pos, i, j),
                          },
                      ],
            ),
        ],
    }));
}

/**
 * A move on the counter, worked out from which jugs' water went up and which went down: a pour when one
 * gave and one took, a fill when one only took, a tip when one only gave.
 */
function pourBeat(from: Position, to: Position, hand: Release | null, seed: number): Beat {
    const a = readJugs(from),
        b = readJugs(to),
        k = kitchenOf(a.length),
        rnd = seeded(seed),
        s = score();
    const delta = a.map((j, i) => (b[i]?.level ?? j.level) - j.level);
    const giver = delta.findIndex((d) => d < 0),
        taker = delta.findIndex((d) => d > 0);
    const moved = giver >= 0 ? giver : taker;
    const jug = a[moved];
    if (!jug) return s.beat();
    const key = `jug:${moved}`,
        home = k.jug(moved);
    s.z(key, 0, 60);

    /** To the place it pours from: on from where the hand let it go, or thrown up from its place when a key played the move. */
    const carry = (spot: Pt): number => {
        if (hand?.key === key) {
            const upright = s.track(key, "angle", 0, hand.angle, 0, { ease: "out" }, 0.25);
            return Math.max(upright, s.glide(key, 0, hand.at, spot, SPRINGS.back, hand.v));
        }
        s.cue(0, "lift");
        return s.lob(key, 0, home, spot, 2.2);
    };
    /** A pour that takes longer the more of the other jug it fills. */
    const flowOf = (amount: number, room: number): Flow => {
        const dur = Math.max(0.55, Math.min(1.4, 0.5 + (0.9 * amount) / Math.max(1e-9, room)));
        return { amount, rate: amount / (dur - RAMP), ramp: RAMP };
    };
    /** The stream from a spout into wherever it lands as the water moves, as wide as it is running, with splashes where it lands. */
    const stream = (t0: number, f: Flow, out: Pt, lands: (moved: number) => Pt): void => {
        const end = t0 + flowTime(f);
        for (let t = t0; t < end - 1e-9; t += 0.06) {
            const now = flowAt(f, t + 0.03 - t0);
            s.mark(t, Math.min(0.06, end - t), [
                {
                    kind: "line",
                    a: out,
                    b: lands(now.moved),
                    style: "stream",
                    weight: now.rate / f.rate,
                },
            ]);
        }
        for (let t = t0 + 0.05; t < end; t += 0.18 + rnd() * 0.1) {
            const p = lands(flowAt(f, t - t0).moved);
            s.burst(t, "splash", p.x + (rnd() - 0.5) * 0.5, p.y, 2 + Math.floor(rnd() * 3));
        }
        s.cue(t0, "splash");
    };
    /** Thrown back to its place on the counter, and set down with a knock. */
    const setDown = (at: number, spot: Pt): void => {
        const landed = s.lob(key, at, spot, home, 1.4 + rnd() * 0.6);
        s.squash(key, landed, 0.07);
        s.cue(landed, "place");
        s.burst(landed, "dust", home.x + MOUTH.x, home.y + FOOT, 4);
        s.z(key, landed, 20 + moved);
    };
    const level = (i: number, t0: number, f: Flow, by: number): number => {
        const was = a[i]?.level ?? 0;
        return s.track(`jug:${i}`, "param:level", t0, was, was + by, {
            flow: { rate: f.rate, ramp: f.ramp },
        });
    };

    const other = a[taker];
    if (giver >= 0 && other) {
        const into = k.jug(taker),
            over = { x: into.x + MOUTH.x - 1.2, y: into.y + MOUTH.y - 2.4 };
        const spot = { x: over.x - SPOUT.x, y: over.y - SPOUT.y };
        const t0 = s.track(key, "angle", carry(spot), 0, -TIP, { ease: "inOut" }, 0.32) - 0.06;
        const amount = delta[taker] ?? 0,
            f = flowOf(amount, other.max);
        level(giver, t0, f, -amount);
        const poured = level(taker, t0, f, amount);
        stream(t0, f, over, (m) => ({
            x: into.x + MOUTH.x + 0.15,
            y: into.y + surface(other.level + m, other.max),
        }));
        s.squash(`jug:${taker}`, t0 + 0.08, 0.025);
        setDown(s.track(key, "angle", poured, -TIP, 0, { ease: "inOut" }, 0.3), spot);
        return s.beat();
    }
    if (taker >= 0) {
        const spot = k.fill,
            arrived = carry(spot);
        s.squash(key, arrived, 0.05);
        s.cue(arrived, "place");
        s.set("tap", arrived + 0.12, { running: true });
        const t0 = arrived + 0.22,
            amount = delta[taker] ?? 0,
            f = flowOf(amount, jug.max);
        const full = level(taker, t0, f, amount);
        stream(t0, f, { x: k.tap.x + TAP_SPOUT.x, y: k.tap.y + TAP_SPOUT.y }, (m) => ({
            x: spot.x + MOUTH.x,
            y: spot.y + surface(jug.level + m, jug.max),
        }));
        s.set("tap", full, { running: false });
        setDown(full + 0.12, spot);
        return s.beat();
    }
    const flower = { x: k.plant.x + FLOWERS.head.x, y: k.plant.y + FLOWERS.head.y };
    const over = { x: flower.x - 0.3, y: flower.y - 2.8 };
    const spot = { x: over.x - RIM_BACK.x, y: over.y - RIM_BACK.y };
    const there = carry(spot);
    s.pivot(key, there, RIM_BACK);
    const t0 = s.track(key, "angle", there, 0, TIP, { ease: "inOut" }, 0.32) - 0.06;
    const f = flowOf(jug.level, jug.max);
    const empty = level(moved, t0, f, -jug.level);
    stream(t0, f, over, () => flower);
    s.squash("plant", t0 + 0.12, 0.05);
    const upright = s.track(key, "angle", empty, TIP, 0, { ease: "inOut" }, 0.3);
    s.pivot(key, upright, SPOUT);
    setDown(upright, spot);
    return s.beat();
}

/** The jug holding the order rings, sparkles and hops, and the order is ticked. */
function pourFinish(pos: Position): Beat {
    const jugs = readJugs(pos),
        k = kitchenOf(jugs.length),
        s = score();
    const i = jugs.findIndex((j) => j.level === targetOf(pos));
    const jug = jugs[i];
    if (!jug) return s.beat();
    const key = `jug:${i}`,
        home = k.jug(i);
    const water = { x: home.x + MOUTH.x, y: home.y + surface(jug.level, jug.max) };
    s.cue(0, "ring");
    s.mark(0, 1.3, [{ kind: "ring", x: water.x, y: water.y, r: 3.2, on: true }]);
    s.burst(0.05, "sparkle", water.x, water.y - 0.4, 16);
    const up = s.track(key, "y", 0.15, home.y, home.y - 1.2, { ease: "out" }, 0.22);
    const down = s.track(key, "y", up, home.y - 1.2, home.y, { fall: 42 }, 0.24);
    s.squash(key, down, 0.08);
    s.burst(down, "dust", home.x + MOUTH.x, home.y + FOOT, 5);
    return s.beat();
}

function activity(kind: string) {
    const a = ACTIVITIES.find((x) => x.kind === kind);
    if (!a) throw new Error(`no activity plays ${kind}`);
    return a;
}

const listed = activity("pour");

export const pourGame: TurnGame = {
    id: "pour",
    title: "Measure it out",
    group: "hands",
    cover: { art: "jug", params: { max: 1000, step: 200, level: 350, unit: "ml" } },
    hint: "Carry a jug to another jug to pour, to the tap to fill it, or to the flowers to tip it away",
    levels: [
        {
            title: "500 and 300, measure 200",
            grades: [2, 3],
            round: () => listed.round(0),
            intro: "Water only stops at the brim of a jug, so 200 ml has to be made from what the jugs hold.",
        },
        {
            title: "500 and 300, measure 100",
            grades: [2, 4],
            round: () => listed.round(1),
            intro: "The order is for 100 ml this time, which is less than either jug holds.",
        },
        {
            title: "5 and 3, measure 4",
            grades: [3, 4],
            round: () => listed.round(2),
            intro: "Four litres, with a jug of five and a jug of three.",
        },
        {
            title: "7 and 3, measure 5",
            grades: [3, 4],
            round: () => listed.round(3),
            intro: "A jug of seven and a jug of three, and the order is for five litres.",
        },
        {
            title: "900 and 400, measure 600",
            grades: [3, 4],
            round: () => listed.round(4),
            intro: "The jugs hold 900 ml and 400 ml, and the order is for 600 ml.",
        },
        {
            title: "1 litre and 300, measure 100",
            grades: [4, 4],
            round: () => listed.round(5),
            intro: "A litre jug and a 300 ml jug, for an order of only 100 ml.",
        },
    ],
    ends: { won: "That is exactly it.", stuck: "Every jug is as it can be. Take a pour back." },
    win: timeline(
        [{ name: "star", from: 0, to: 1, at: 0.9, dur: 0.4, ease: easeBack }],
        [
            { at: 0.6, cue: "level" },
            { at: 1, cue: "win" },
        ],
    ),
    open(_round: Round, ctx: Ctx): Session<Position> {
        let count = 2;
        // The tap runs while a jug is held under it, and stops when the jug is let go.
        const tap = (running: boolean): Part => ({
            art: "tap",
            key: "tap",
            at: kitchenOf(count).tap,
            params: { running },
            z: 5,
        });
        return {
            morph: { level: SPRINGS.pour },
            glide: SPRINGS.back,
            parts(pos) {
                count = readJugs(pos).length;
                return sceneOf(pos);
            },
            handles: handlesOf,
            preview(_pos, _h, at) {
                ctx.stage.show(
                    { parts: [tap(at.target?.id === "tap" && at.target.carries.moves.length > 0)] },
                    { keep: true },
                );
            },
            unpreview() {
                ctx.stage.show({ parts: [tap(false)] }, { keep: true });
            },
            after(pos) {
                readJugs(pos).forEach((_, i) => ctx.stage.tag(`jug:${i}`, "grab", !pos.won));
            },
            beat: (from, to, o) => pourBeat(from, to, o.hand, o.seed),
            finish: (pos) => pourFinish(pos),
            star(pos) {
                const jugs = readJugs(pos),
                    i = jugs.findIndex((j) => j.level === targetOf(pos));
                const at = kitchenOf(jugs.length).jug(Math.max(0, i));
                return i < 0 ? null : { x: at.x + MOUTH.x, y: at.y - 0.4 };
            },
        };
    },
};
