// Bridge builder: lay beams of wood, road and rope between the pegs in the banks, then press Go and
// the Pup family's car drives over. Each beam is pinned at its ends, so a square of beams folds and
// a triangle holds; a beam glows redder the harder it works and snaps past its strength. Every beam
// costs its length in coins, so a level can ask for a bridge under a budget, with an exact number of
// beams or across a measured span. See .docs/games.md.
import { follow, keepInside, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import type { Dir, Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import {
    GRAVITY,
    MATERIALS,
    STUFF,
    lengthOf,
    stepTruss,
    strainOf,
    truss,
    type Load,
    type Material,
    type Plan,
    type Truss,
} from "../../engine/motion/truss";
import { STREAMBANK } from "../../engine/parts/outdoors/streambank";
import { BRIDGETRAY } from "../../engine/parts/travel/bridgetray";
import { PUPCAR } from "../../engine/parts/travel/pupcar";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels, RoundEnd } from "./game";
import { row } from "./scenery";

const RATE = 60;
const DT = 1 / RATE;
/** The world's height, and where a river's surface is, in squares. */
const H = 26;
const SURFACE = 17;
/** The car's weight, against which the beams' strengths are set in the truss kit. */
const CAR_MASS = 1.5;
/** Squares a second. */
const SPEED = 3;
/** The car's width on the field, in squares, and how much of its drawing that is. */
const CAR_W = 3.6;
const CAR_K = CAR_W / PUPCAR.w;
/** The steepest road the car climbs, in radians. */
const CLIMB = 0.6;
const MOST_BEAMS = 40;
const PAST = 40;
/** Where the car waits before Go, and how far onto the far bank it stops, from the banks' edges. */
const WAIT = 11;
const HOME = 3;

/** A beam as drawn, by the grid points at its ends: whole squares, so a design is plain numbers. */
export interface Seg {
    a: Pt;
    b: Pt;
    m: Material;
}

export interface BridgeLevel extends ActionLevel {
    place: "stream" | "ravine" | "river";
    /** The top corners of the near bank and the far bank, at their edges over the gap. */
    near: Pt;
    far: Pt;
    /** Pegs in the banks' faces and on a rock, besides the two edges. */
    pegs: Pt[];
    rock?: { x: number; w: number; top: number };
    /** The boat's mast: nothing may go below `y` between `x0` and `x1`. */
    clear?: { x0: number; x1: number; y: number };
    budget?: number;
    beams?: number;
    /** A measured span shown over the gap, for a level that asks for one. */
    span?: true;
    /** Squares a second each second of the gust that blows while the car is over the gap. */
    wind?: number;
    /** The joints of the way across shown as dashed rings while building. */
    hints?: true;
    /** How hard each beam would work, shown while building rather than only after Go. */
    preview?: true;
    /** Beams already standing when the level opens. */
    built?: Seg[];
    /** A way across, built through the game's own hands by the tests and the generator. */
    plan: Seg[];
}

const P = (x: number, y: number): Pt => ({ x, y });
const road = (ax: number, ay: number, bx: number, by: number): Seg => ({
    a: P(ax, ay),
    b: P(bx, by),
    m: "road",
});
const wood = (ax: number, ay: number, bx: number, by: number): Seg => ({
    a: P(ax, ay),
    b: P(bx, by),
    m: "wood",
});

/** A level across flat banks of one height: the gap in squares, and the pegs down each face. */
function flat(
    o: Omit<BridgeLevel, "near" | "far" | "pegs"> & { gap: number; faces?: number[] },
): BridgeLevel {
    const { gap, faces, ...rest } = o;
    const near = P(14, 14),
        far = P(14 + gap, 14);
    return {
        ...rest,
        near,
        far,
        pegs: (faces ?? []).flatMap((d) => [P(near.x, near.y + d), P(far.x, far.y + d)]),
    };
}

const STREAM = (
    gap: number,
): Omit<BridgeLevel, "near" | "far" | "pegs" | "plan"> & {
    gap: number;
} => ({
    title: "The stream",
    grades: [1, 2],
    goal: "Drag a road from one bank to the other, then press Go to send the pups over.",
    place: "stream",
    gap,
    hints: true,
    preview: true,
});

/** Each level's variations, the first being the level as authored. */
export const VARIANTS: BridgeLevel[][] = [
    [
        flat({ ...STREAM(4), plan: [road(14, 14, 18, 14)] }),
        flat({ ...STREAM(3), plan: [road(14, 14, 17, 14)] }),
    ],
    [
        flat({
            title: "A wider stream",
            grades: [1, 2],
            goal: "One road will not reach. Lay two, and hold up the joint between them with a triangle.",
            place: "stream",
            gap: 6,
            faces: [2],
            hints: true,
            preview: true,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                wood(14, 14, 17, 12),
                wood(17, 12, 20, 14),
                wood(17, 12, 17, 14),
            ],
        }),
        flat({
            title: "A wider stream",
            grades: [1, 2],
            goal: "One road will not reach. Lay two, and hold up the joint between them with a triangle.",
            place: "stream",
            gap: 8,
            faces: [2],
            hints: true,
            preview: true,
            plan: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                wood(14, 16, 18, 14),
                wood(22, 16, 18, 14),
            ],
        }),
    ],
    [
        flat({
            title: "Squares fold",
            grades: [2, 3],
            goal: "This bridge is built of squares, and a square folds. Add beams across the squares to make triangles.",
            place: "stream",
            gap: 6,
            faces: [3],
            hints: true,
            preview: true,
            built: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                wood(14, 17, 17, 17),
                wood(17, 17, 20, 17),
                wood(17, 14, 17, 17),
            ],
            plan: [wood(14, 17, 17, 14), wood(20, 17, 17, 14)],
        }),
        flat({
            title: "Squares fold",
            grades: [2, 3],
            goal: "This bridge is built of squares, and a square folds. Add beams across the squares to make triangles.",
            place: "stream",
            gap: 8,
            faces: [2],
            hints: true,
            preview: true,
            built: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                wood(14, 16, 18, 16),
                wood(18, 16, 22, 16),
                wood(18, 14, 18, 16),
            ],
            plan: [wood(14, 16, 18, 14), wood(22, 16, 18, 14)],
        }),
    ],
    [
        flat({
            title: "The ravine on a budget",
            grades: [2, 3],
            goal: "Build a bridge over the ravine for 20 coins or less. Each beam costs its length.",
            place: "ravine",
            gap: 10,
            faces: [3],
            preview: true,
            budget: 20,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 21, 14),
                road(21, 14, 24, 14),
                wood(14, 17, 17, 14),
                wood(24, 17, 21, 14),
            ],
        }),
        flat({
            title: "The ravine on a budget",
            grades: [2, 3],
            goal: "Build a bridge over the ravine for 16 coins or less. Each beam costs its length.",
            place: "ravine",
            gap: 8,
            faces: [2],
            preview: true,
            budget: 16,
            plan: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                wood(14, 16, 18, 14),
                wood(22, 16, 18, 14),
            ],
        }),
    ],
    [
        flat({
            title: "Room for the boat",
            grades: [3, 4],
            goal: "A boat sails under here. Keep the river clear below the road, and hold the road up with triangles above it.",
            place: "river",
            gap: 9,
            clear: { x0: 14.5, x1: 22.5, y: 14 },
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                road(20, 14, 23, 14),
                wood(14, 14, 17, 11),
                wood(17, 11, 20, 11),
                wood(20, 11, 23, 14),
                wood(17, 14, 17, 11),
                wood(20, 14, 20, 11),
                wood(17, 14, 20, 11),
            ],
        }),
        flat({
            title: "Room for the boat",
            grades: [3, 4],
            goal: "A boat sails under here. Keep the river clear below the road, and hold the road up with triangles above it.",
            place: "river",
            gap: 8,
            clear: { x0: 14.5, x1: 21.5, y: 14 },
            plan: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                wood(14, 14, 16, 11),
                wood(16, 11, 18, 14),
                wood(18, 14, 20, 11),
                wood(20, 11, 22, 14),
                wood(16, 11, 20, 11),
            ],
        }),
    ],
    [
        {
            title: "Uneven banks",
            grades: [3, 4],
            goal: "The banks are not level. Build a road that slopes gently down from the high bank to the low one.",
            place: "stream",
            near: P(14, 12),
            far: P(22, 15),
            pegs: [P(14, 15), P(22, 17)],
            plan: [road(14, 12, 18, 14), road(18, 14, 22, 15), wood(14, 15, 18, 14)],
        },
        {
            title: "Uneven banks",
            grades: [3, 4],
            goal: "The banks are not level. Build a road that climbs gently from the low bank to the high one.",
            place: "stream",
            near: P(14, 15),
            far: P(22, 12),
            pegs: [P(14, 17), P(22, 15)],
            plan: [road(14, 15, 18, 14), road(18, 14, 22, 12), wood(22, 15, 18, 14)],
        },
    ],
    [
        flat({
            title: "Exactly six beams",
            grades: [3, 4],
            goal: "Build a bridge with exactly 6 beams, no more and no fewer.",
            place: "river",
            gap: 6,
            faces: [2],
            beams: 6,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                wood(14, 14, 17, 12),
                wood(17, 12, 20, 14),
                wood(17, 12, 17, 14),
                wood(14, 16, 17, 14),
            ],
        }),
        flat({
            title: "Exactly six beams",
            grades: [3, 4],
            goal: "Build a bridge with exactly 6 beams, no more and no fewer.",
            place: "river",
            gap: 6,
            faces: [3],
            beams: 6,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                wood(14, 14, 17, 12),
                wood(17, 12, 20, 14),
                wood(17, 12, 17, 14),
                wood(20, 17, 17, 14),
            ],
        }),
    ],
    [
        flat({
            title: "The rock in the river",
            grades: [3, 4],
            goal: "The river is wide, but a rock stands in the middle of it. Anchor your bridge to the rock.",
            place: "river",
            gap: 14,
            faces: [2],
            rock: { x: 20, w: 2, top: 16 },
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 21, 14),
                road(21, 14, 25, 14),
                road(25, 14, 28, 14),
                wood(14, 16, 17, 14),
                wood(21, 16, 17, 14),
                wood(21, 16, 21, 14),
                wood(21, 16, 25, 14),
                wood(28, 16, 25, 14),
            ],
        }),
        flat({
            title: "The rock in the river",
            grades: [3, 4],
            goal: "The river is wide, but a rock stands in the middle of it. Anchor your bridge to the rock.",
            place: "river",
            gap: 14,
            faces: [2],
            rock: { x: 19, w: 2, top: 16 },
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                road(20, 14, 24, 14),
                road(24, 14, 28, 14),
                wood(14, 16, 17, 14),
                wood(20, 16, 17, 14),
                wood(20, 16, 20, 14),
                wood(20, 16, 24, 14),
                wood(28, 16, 24, 14),
            ],
        }),
    ],
    [
        flat({
            title: "The windy gorge",
            grades: [3, 4],
            goal: "Span the 12 squares of the gorge. A gust of wind blows as the pups cross.",
            place: "ravine",
            gap: 12,
            faces: [3],
            span: true,
            wind: 5,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 20, 14),
                road(20, 14, 23, 14),
                road(23, 14, 26, 14),
                wood(14, 14, 17, 11),
                wood(17, 11, 20, 11),
                wood(20, 11, 23, 11),
                wood(23, 11, 26, 14),
                wood(17, 14, 17, 11),
                wood(20, 14, 20, 11),
                wood(23, 14, 23, 11),
                wood(17, 14, 20, 11),
                wood(23, 14, 20, 11),
                wood(14, 17, 17, 14),
                wood(26, 17, 23, 14),
            ],
        }),
        flat({
            title: "The windy gorge",
            grades: [3, 4],
            goal: "Span the 10 squares of the gorge. A gust of wind blows as the pups cross.",
            place: "ravine",
            gap: 10,
            faces: [3],
            span: true,
            wind: 5,
            plan: [
                road(14, 14, 17, 14),
                road(17, 14, 21, 14),
                road(21, 14, 24, 14),
                wood(14, 17, 17, 14),
                wood(24, 17, 21, 14),
            ],
        }),
    ],
    [
        flat({
            title: "Free build",
            grades: [1, 4],
            goal: "Build any bridge you like across the wide river, and send the pups over. It is kept for next time.",
            place: "river",
            gap: 16,
            faces: [2, 4],
            rock: { x: 21, w: 2, top: 16 },
            plan: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                road(22, 14, 26, 14),
                road(26, 14, 30, 14),
                wood(14, 14, 16, 10),
                wood(16, 10, 18, 14),
                wood(18, 14, 20, 10),
                wood(20, 10, 22, 14),
                wood(22, 14, 24, 10),
                wood(24, 10, 26, 14),
                wood(26, 14, 28, 10),
                wood(28, 10, 30, 14),
                wood(16, 10, 20, 10),
                wood(20, 10, 24, 10),
                wood(24, 10, 28, 10),
                wood(14, 16, 18, 14),
                wood(30, 16, 26, 14),
            ],
        }),
        flat({
            title: "Free build",
            grades: [1, 4],
            goal: "Build any bridge you like across the wide river, and send the pups over. It is kept for next time.",
            place: "river",
            gap: 16,
            faces: [2, 4],
            rock: { x: 19, w: 2, top: 15 },
            plan: [
                road(14, 14, 18, 14),
                road(18, 14, 22, 14),
                road(22, 14, 26, 14),
                road(26, 14, 30, 14),
                wood(14, 14, 16, 10),
                wood(16, 10, 18, 14),
                wood(18, 14, 20, 10),
                wood(20, 10, 22, 14),
                wood(22, 14, 24, 10),
                wood(24, 10, 26, 14),
                wood(26, 14, 28, 10),
                wood(28, 10, 30, 14),
                wood(16, 10, 20, 10),
                wood(20, 10, 24, 10),
                wood(24, 10, 28, 10),
                wood(14, 16, 18, 14),
                wood(30, 16, 26, 14),
            ],
        }),
    ],
];

const firstOf = (v: BridgeLevel[]): BridgeLevel => {
    const L = v[0];
    if (!L) throw new Error("A bridge level has no variation");
    return L;
};
const [FIRST, ...REST] = VARIANTS.map(firstOf);
if (!FIRST) throw new Error("No bridge levels");
export const BRIDGE_LEVELS: Levels<BridgeLevel> = [FIRST, ...REST];
/** The free build, whose design the page keeps between visits. */
export const FREE = BRIDGE_LEVELS.length - 1;

export interface Car {
    x: number;
    /** Where its wheels meet the road. */
    y: number;
    vx: number;
    vy: number;
    angle: number;
    /** On the road or a bank, or falling. */
    rolling: boolean;
    /** Steps it has spent unable to climb. */
    stalled: number;
    wet: boolean;
}

/** Half of a snapped beam, falling. */
export interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    spin: number;
    len: number;
    m: Material;
    wet: boolean;
}

export interface Run {
    truss: Truss;
    car: Car;
    pieces: Piece[];
    /** Where the first beam snapped, for the sentence after. */
    broke: Pt | null;
    /** Steps since the car came to rest on the far bank or in the water. */
    over: number;
    home: boolean;
    ripples: { x: number; age: number; size: number }[];
}

/**
 * What a finger on the field is doing. A lay is drawn from `from` to `to`; `start` is where the finger
 * went down, and `other` the joint under it when a beam was armed, which a drag lays from instead.
 */
export type Hand =
    | { kind: "lay"; from: Pt; to: Pt; start: Pt; moved: boolean; armed: boolean; other: Pt | null }
    | { kind: "hold"; seg: number; from: Pt; at: Pt; moved: number; held: number }
    | { kind: "pick" };

export interface BridgeState {
    L: BridgeLevel;
    level: number;
    phase: "build" | "run" | "done";
    design: Seg[];
    past: Seg[][];
    /** The material a new beam is laid in. */
    pen: Material;
    /** The beam a tap or the last beam laid chose, which M and Delete act on. */
    chosen: number | null;
    cursor: Pt;
    /** Where a beam drawn by the keys starts, while it is drawn. */
    from: Pt | null;
    /** Set once an arrow has moved the cursor, so the cursor is shown only to a child using the keys. */
    keys: boolean;
    hand: Hand | null;
    /** The joint a tap chose, which the next tap lays a beam from; the beam's far end is armed in its turn. */
    armed: Pt | null;
    /** Where the armed beam would end under the mouse, and the joint the mouse is over. */
    aim: Pt | null;
    over: Pt | null;
    /** Beams the child has laid this round, so the first one's hint can go. */
    made: number;
    /** How hard each beam of the design works with the car at its hardest place, nought to one and past. */
    preview: number[];
    run: Run | null;
    end: RoundEnd | null;
    text: string;
    steps: number;
    cam: Cam;
    /** Steps since the last beam was laid, for its bounce, and since the length under the finger changed. */
    laid: number;
    ticked: number;
}

const same = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y;
const key = (p: Pt): string => `${p.x},${p.y}`;
export const costOf = (seg: Seg): number => Math.round(lengthOf(seg.a, seg.b));
export const coins = (design: readonly Seg[]): number =>
    design.reduce((sum, seg) => sum + costOf(seg), 0);
const worldW = (L: BridgeLevel): number => L.far.x + 16;
/** The river's bed, or the ravine's floor, which lies deeper. */
const bedOf = (L: BridgeLevel): number => (L.place === "ravine" ? 24 : 21);

export function anchorsOf(L: BridgeLevel): Pt[] {
    const rock = L.rock ? [P(L.rock.x + L.rock.w / 2, L.rock.top)] : [];
    return [L.near, L.far, ...L.pegs, ...rock];
}

/** Every joint a beam may start from: the pegs, and every end of a beam laid. */
export function jointsOf(s: BridgeState): Pt[] {
    const out = anchorsOf(s.L),
        seen = new Set(out.map(key));
    for (const seg of s.design)
        for (const p of [seg.a, seg.b])
            if (!seen.has(key(p))) {
                seen.add(key(p));
                out.push(p);
            }
    return out;
}

/** Inside a bank or the rock, or on its top: no place for a joint that is not a peg. */
function inGround(L: BridgeLevel, p: Pt, strict: boolean): boolean {
    const over = (a: number, b: number) => (strict ? a > b + 1e-6 : a >= b - 1e-6);
    if (over(p.y, L.near.y) && over(L.near.x, p.x)) return true;
    if (over(p.y, L.far.y) && over(p.x, L.far.x)) return true;
    const r = L.rock;
    if (r && over(p.y, r.top) && over(p.x, r.x) && over(r.x + r.w, p.x)) return true;
    return p.y >= bedOf(L);
}

/** Why a beam cannot go where it is drawn, or null when it can. */
export function why(s: BridgeState, seg: Seg): string | null {
    const L = s.L,
        len = lengthOf(seg.a, seg.b);
    if (len < 0.5) return "Drag further to lay a beam.";
    if (len > STUFF[seg.m].most + 1e-9)
        return `Too long: ${seg.m} reaches ${STUFF[seg.m].most} squares at most.`;
    const pegs = anchorsOf(L);
    for (const p of [seg.a, seg.b])
        if (!pegs.some((q) => same(p, q)) && inGround(L, p, false))
            return "A joint cannot go in the ground. Put it in the air, or on a peg.";
    if (seg.b.x < 1 || seg.b.x > worldW(L) - 1 || seg.b.y < 2) return "That is off the edge.";
    for (let k = 1; k < 20; k++) {
        const at = {
            x: seg.a.x + ((seg.b.x - seg.a.x) * k) / 20,
            y: seg.a.y + ((seg.b.y - seg.a.y) * k) / 20,
        };
        if (inGround(L, at, true)) return "A beam cannot go through the ground.";
        const c = L.clear;
        if (c && at.x > c.x0 && at.x < c.x1 && at.y > c.y + 1e-6)
            return "Keep the river clear below the road, so the boat can sail under.";
    }
    if (
        s.design.some(
            (d) => (same(d.a, seg.a) && same(d.b, seg.b)) || (same(d.a, seg.b) && same(d.b, seg.a)),
        )
    )
        return "There is a beam there already.";
    if (s.design.length >= MOST_BEAMS) return "That is as many beams as the bank can hold.";
    return null;
}

/** The plan the truss kit steps: the pegs pinned, then every other joint. */
export function planOf(L: BridgeLevel, design: readonly Seg[]): Plan {
    const index = new Map<string, number>(),
        joints: Plan["joints"] = [];
    for (const p of anchorsOf(L)) {
        index.set(key(p), joints.length);
        joints.push({ x: p.x, y: p.y, fixed: true });
    }
    const at = (p: Pt): number => {
        const k = key(p),
            i = index.get(k);
        if (i !== undefined) return i;
        index.set(k, joints.length);
        joints.push({ x: p.x, y: p.y });
        return joints.length - 1;
    };
    return { joints, beams: design.map((seg) => ({ a: at(seg.a), b: at(seg.b), m: seg.m })) };
}

/** The road under a place across the gap: the bar, where along it, and the road's height there. */
function roadAt(t: Truss, x: number, near: number): { bar: number; at: number; y: number } | null {
    let best: { bar: number; at: number; y: number } | null = null;
    for (const [i, b] of t.bars.entries()) {
        if (b.broken || b.m !== "road") continue;
        const p = t.nodes[b.a],
            q = t.nodes[b.b];
        if (!p || !q || Math.abs(q.x - p.x) < 1e-6) continue;
        const at = (x - p.x) / (q.x - p.x);
        if (at < -1e-6 || at > 1 + 1e-6) continue;
        const y = p.y + (q.y - p.y) * at;
        if (Math.abs(y - near) > 0.8) continue;
        if (!best || Math.abs(y - near) < Math.abs(best.y - near))
            best = { bar: i, at: Math.max(0, Math.min(1, at)), y };
    }
    return best;
}

/**
 * How hard each beam works with the car standing at a quarter, the half and three quarters of the
 * way over, once the bridge has settled under it: what the colours show before Go on the early levels.
 */
export function trial(L: BridgeLevel, design: readonly Seg[]): number[] {
    const most = design.map(() => 0);
    if (design.length === 0) return most;
    for (const share of [0.25, 0.5, 0.75]) {
        const t = truss(planOf(L, design)),
            x = L.near.x + (L.far.x - L.near.x) * share,
            y = L.near.y + (L.far.y - L.near.y) * share;
        // the car eased on rather than dropped, and the last half second averaged, so the colours
        // show the bridge at rest under it rather than the swing of a sudden weight
        const sum = design.map(() => 0);
        for (let k = 0; k < 150; k++) {
            const r = roadAt(t, x, y),
                mass = CAR_MASS * Math.min(1, k / 60),
                loads: Load[] = r ? [{ bar: r.bar, at: r.at, mass }] : [];
            stepTruss(t, DT, loads, { holds: true, floor: bedOf(L) });
            if (k >= 120)
                for (const [i, b] of t.bars.entries()) sum[i] = (sum[i] ?? 0) + strainOf(b) / 30;
        }
        for (const [i, v] of sum.entries()) most[i] = Math.max(most[i] ?? 0, v);
    }
    return most;
}

/** The view a zoom of one shows, in squares: the squares the picker and the readouts are placed in. */
export function viewOf(L: BridgeLevel): { w: number; h: number } {
    const w = Math.max(30, L.far.x - L.near.x + 24);
    return { w, h: Math.round(w * 0.58) };
}

/** The whole crossing at a zoom of one, which the camera eases back to as the car drives. */
function wideCam(L: BridgeLevel): Cam {
    const v = viewOf(L);
    return {
        x: (L.near.x + L.far.x) / 2 - 3,
        y: Math.max(v.h / 2, bedOf(L) + 1 - v.h / 2),
        zoom: 1,
    };
}

/** The gap and its banks framed large while building: every peg and joint of the way across, with room round them. */
function buildCam(L: BridgeLevel): Cam {
    const v = viewOf(L),
        pts = [
            ...anchorsOf(L),
            ...[...(L.built ?? []), ...L.plan].flatMap((seg) => [seg.a, seg.b]),
        ],
        xs = pts.map((p) => p.x),
        ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs) - 5,
        x1 = Math.max(...xs) + 5,
        // room above for the picker and the hint, and below down to the water
        y0 = Math.min(...ys) - 5,
        y1 = Math.max(Math.max(...ys) + 3, SURFACE + 2);
    const zoom = Math.max(1, Math.min(2, v.w / (x1 - x0), v.h / (y1 - y0)));
    const at = keepInside({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, v, { w: worldW(L), h: H }, zoom);
    return { x: at.x, y: at.y, zoom };
}

/** The picker of materials at the top of the field, in the view's own squares: its centre and width. */
const PICKER = { y: 1.9, w: 7.2 };

/** The material whose tile of the picker a place in the view's own squares is on, or null. */
export function pickAt(L: BridgeLevel, p: Pt): Material | null {
    const k = PICKER.w / BRIDGETRAY.w,
        x0 = viewOf(L).w / 2 - PICKER.w / 2,
        h = BRIDGETRAY.h * k;
    // a little past the drawing, so a finger at its edge still lands
    if (Math.abs(p.y - PICKER.y) > h / 2 + 0.3 || p.x < x0 - 0.3 || p.x > x0 + PICKER.w + 0.3)
        return null;
    const i = Math.max(0, Math.min(2, Math.floor((p.x - x0) / (BRIDGETRAY.tile * k))));
    return MATERIALS[i] ?? null;
}

/** The middle of a material's tile of the picker, in the view's own squares. */
export function pickCentre(L: BridgeLevel, m: Material): Pt {
    const k = PICKER.w / BRIDGETRAY.w;
    return {
        x: viewOf(L).w / 2 - PICKER.w / 2 + (MATERIALS.indexOf(m) + 0.5) * BRIDGETRAY.tile * k,
        y: PICKER.y,
    };
}

export function startBridge(L: BridgeLevel, level: number): BridgeState {
    const design = (L.built ?? []).map((seg) => ({ a: { ...seg.a }, b: { ...seg.b }, m: seg.m }));
    return {
        L,
        level,
        phase: "build",
        design,
        past: [],
        pen: "road",
        chosen: null,
        cursor: { ...L.near },
        from: null,
        keys: false,
        hand: null,
        armed: null,
        aim: null,
        over: null,
        made: 0,
        preview: L.preview ? trial(L, design) : design.map(() => 0),
        run: null,
        end: null,
        text: L.goal,
        steps: 0,
        cam: buildCam(L),
        laid: 99,
        ticked: 99,
    };
}

function changed(s: BridgeState, before: Seg[]): void {
    s.past.push(before);
    if (s.past.length > PAST) s.past.shift();
    s.preview = s.L.preview ? trial(s.L, s.design) : s.design.map(() => 0);
}

const copy = (d: readonly Seg[]): Seg[] =>
    d.map((seg) => ({ a: { ...seg.a }, b: { ...seg.b }, m: seg.m }));

function lay(s: BridgeState, seg: Seg, out: Happening[]): boolean {
    const no = why(s, seg);
    if (no) {
        s.text = no;
        out.push({ cue: "nope" });
        return false;
    }
    const before = copy(s.design);
    s.design.push({ a: { ...seg.a }, b: { ...seg.b }, m: seg.m });
    s.chosen = s.design.length - 1;
    s.laid = 0;
    s.made++;
    changed(s, before);
    const len = lengthOf(seg.a, seg.b);
    s.text = `A ${seg.m} beam ${len.toFixed(1)} squares long, for ${costOf(seg)} coins. ${totals(s)}`;
    out.push({ cue: "place", pitch: 1 + (4.5 - Math.min(4.5, len)) * 0.08 });
    out.push({ puff: { x: seg.b.x, y: seg.b.y, n: 3 } });
    return true;
}

function totals(s: BridgeState): string {
    const c = coins(s.design),
        n = s.design.length;
    const money = s.L.budget !== undefined ? `${c} of ${s.L.budget} coins` : `${c} coins`;
    const count = s.L.beams !== undefined ? `, ${n} of ${s.L.beams} beams` : "";
    return `Spent ${money}${count}.`;
}

function remove(s: BridgeState, i: number, out: Happening[]): void {
    const seg = s.design[i];
    if (!seg) return;
    const before = copy(s.design);
    s.design.splice(i, 1);
    s.chosen = null;
    const armed = s.armed;
    if (armed && !jointsOf(s).some((j) => same(j, armed))) s.armed = null;
    changed(s, before);
    s.text = `The ${seg.m} beam is taken away. ${totals(s)}`;
    out.push({ cue: "back" });
}

function switchBeam(s: BridgeState, i: number, out: Happening[]): void {
    const seg = s.design[i];
    if (!seg) return;
    const next = MATERIALS[(MATERIALS.indexOf(seg.m) + 1) % MATERIALS.length] ?? "wood";
    const turned = { ...seg, m: next };
    // a beam too long for the next material skips past it
    const fits = (m: Material) => lengthOf(seg.a, seg.b) <= STUFF[m].most + 1e-9;
    const m = fits(next)
        ? next
        : (MATERIALS.find((x) => x !== seg.m && fits(x) && x !== next) ?? seg.m);
    if (m === seg.m) {
        s.text = `Only ${seg.m} reaches that far.`;
        out.push({ cue: "nope" });
        return;
    }
    const before = copy(s.design);
    s.design[i] = { ...turned, m };
    s.chosen = i;
    s.pen = m;
    changed(s, before);
    s.text = `That beam is ${m} now. ${totals(s)}`;
    out.push({ cue: "place", pitch: 1.2 });
}

function undo(s: BridgeState): boolean {
    if (s.phase !== "build") {
        toBuild(s);
        return true;
    }
    const before = s.past.pop();
    if (!before) return false;
    s.design = before;
    s.chosen = null;
    s.from = null;
    s.hand = null;
    s.armed = null;
    s.aim = null;
    s.preview = s.L.preview ? trial(s.L, s.design) : s.design.map(() => 0);
    s.text = `Taken back. ${totals(s)}`;
    return true;
}

/** The beam nearest a place, within reach of a finger, or null. */
export function beamAt(s: BridgeState, p: Pt, reach = 0.6): number | null {
    let best: number | null = null,
        d0 = reach;
    for (const [i, seg] of s.design.entries()) {
        const dx = seg.b.x - seg.a.x,
            dy = seg.b.y - seg.a.y,
            l2 = dx * dx + dy * dy || 1,
            u = Math.max(0, Math.min(1, ((p.x - seg.a.x) * dx + (p.y - seg.a.y) * dy) / l2)),
            d = Math.hypot(p.x - seg.a.x - dx * u, p.y - seg.a.y - dy * u);
        if (d < d0) {
            d0 = d;
            best = i;
        }
    }
    return best;
}

/** How far from a joint a finger may land and still take it, in squares: a fingertip on a phone at the framed zoom. */
const GRAB = 1.5;
/** Steps a beam is held still before it is taken away. */
const LONG = 30;

function jointAt(s: BridgeState, p: Pt, reach = GRAB): Pt | null {
    let best: Pt | null = null,
        d0 = reach;
    for (const j of jointsOf(s)) {
        const d = lengthOf(j, p);
        if (d < d0) {
            d0 = d;
            best = j;
        }
    }
    return best;
}

/** Where a beam dragged from `from` towards a place ends: the nearest whole square, drawn in no further than its material reaches. */
export function snapEnd(from: Pt, to: Pt, m: Material): Pt {
    const most = STUFF[m].most,
        dx = to.x - from.x,
        dy = to.y - from.y,
        d = Math.hypot(dx, dy);
    for (let reach = Math.min(d, most); reach > 0; reach -= 0.25) {
        const k = d > 0 ? reach / d : 0,
            p = { x: Math.round(from.x + dx * k), y: Math.round(from.y + dy * k) };
        if (lengthOf(from, p) <= most + 1e-9) return p;
    }
    return { ...from };
}

/** Where a beam from `from` ends with the hand at `p`: a joint near the hand within reach, or else the nearest whole square. */
function endFor(s: BridgeState, from: Pt, p: Pt): Pt {
    const j = jointAt(s, p, 0.9);
    if (j && !same(j, from) && lengthOf(from, j) <= STUFF[s.pen].most + 1e-9) return { ...j };
    return snapEnd(from, p, s.pen);
}

/** The end of the beam being drawn moved to `to`, with a click as it snaps: a firmer one onto a joint. */
function aimAt(s: BridgeState, h: { to: Pt }, to: Pt, out: Happening[]): void {
    if (same(to, h.to)) return;
    h.to = to;
    s.ticked = 0;
    const onJoint = jointsOf(s).some((j) => same(j, to));
    out.push({ cue: "bump", strength: onJoint ? 0.3 : 0.15, pitch: onJoint ? 2 : 1.6 });
}

function disarm(s: BridgeState, out: Happening[]): void {
    s.armed = null;
    s.aim = null;
    s.text = `Stopped. ${totals(s)}`;
    out.push({ cue: "back", pitch: 1.2 });
}

function touchDown(s: BridgeState, t: Pt, view: Pt | null, out: Happening[]): void {
    const m = view ? pickAt(s.L, view) : null;
    if (m) {
        choose(s, m, out);
        s.hand = { kind: "pick" };
        return;
    }
    const A = s.armed;
    if (A) {
        const d = lengthOf(t, A);
        if (d <= STUFF[s.pen].most + 0.75) {
            const to = d < 0.6 ? { ...A } : endFor(s, A, t);
            s.hand = {
                kind: "lay",
                from: { ...A },
                to,
                start: { ...t },
                moved: false,
                armed: true,
                other: d < 0.6 ? null : jointAt(s, t),
            };
            if (!same(to, A)) {
                s.ticked = 0;
                out.push({ cue: "bump", strength: 0.15, pitch: 1.6 });
            }
            return;
        }
        // a tap well past the beam's reach stops the chain, and is then a tap like any other
        disarm(s, out);
    }
    const j = jointAt(s, t),
        b = beamAt(s, t);
    if (b !== null && (!j || lengthOf(j, t) > 0.9)) {
        s.hand = { kind: "hold", seg: b, from: { ...t }, at: { ...t }, moved: 0, held: 0 };
        return;
    }
    if (j) {
        s.hand = {
            kind: "lay",
            from: { ...j },
            to: { ...j },
            start: { ...t },
            moved: false,
            armed: false,
            other: null,
        };
        s.from = null;
        out.push({ cue: "lift" });
        return;
    }
    s.chosen = null;
}

function lift(s: BridgeState, h: Hand, out: Happening[]): void {
    if (h.kind === "lay") {
        if (same(h.from, h.to)) {
            if (h.armed) disarm(s, out);
            else if (!h.moved) {
                s.armed = { ...h.from };
                s.aim = null;
                s.chosen = null;
                s.text = "Now tap where the beam should end.";
                out.push({ cue: "lift", pitch: 1.2 });
            }
            return;
        }
        // a chain of taps goes on from the far end of each beam, and a drag ends where it is let go
        if (lay(s, { a: h.from, b: h.to, m: s.pen }, out)) s.armed = h.armed ? { ...h.to } : null;
        s.aim = null;
    } else if (h.kind === "hold") {
        if (h.moved < 0.4) switchBeam(s, h.seg, out);
        else if (h.moved >= 1.5) remove(s, h.seg, out);
        else s.text = "Drag a beam well away, or hold it down, to take it away.";
    }
}

function hands(s: BridgeState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (pad.aside) {
        const b = beamAt(s, pad.aside);
        if (b !== null) remove(s, b, out);
        else if (s.armed) disarm(s, out);
    }
    if (t) {
        const h = s.hand;
        if (!h) touchDown(s, t, pad.view ?? null, out);
        else if (h.kind === "lay") {
            if (!h.moved && lengthOf(h.start, t) > 0.6) {
                h.moved = true;
                // with a beam armed, a drag that starts on another joint lays from that joint instead
                if (h.armed && h.other && !same(h.other, h.from)) {
                    h.from = { ...h.other };
                    h.to = { ...h.other };
                    h.armed = false;
                    s.armed = null;
                }
            }
            if (h.moved) aimAt(s, h, endFor(s, h.from, t), out);
        } else if (h.kind === "hold") {
            h.at = { ...t };
            h.moved = Math.max(h.moved, lengthOf(h.from, t));
            h.held++;
            if (h.held >= LONG && h.moved < 0.4) {
                remove(s, h.seg, out);
                out.push({ puff: { x: t.x, y: t.y, n: 4 } });
                s.hand = { kind: "pick" };
            }
        }
    }
    if (pad.lifted && s.hand) {
        const h = s.hand;
        s.hand = null;
        lift(s, h, out);
    } else if (!t && s.hand) s.hand = null;
    const mouse = pad.hover ?? null;
    s.over = mouse ? jointAt(s, mouse) : null;
    const A = s.armed;
    if (A && mouse && !s.hand) {
        const aim = { to: s.aim ?? A };
        aimAt(s, aim, endFor(s, A, mouse), out);
        s.aim = same(aim.to, A) ? null : aim.to;
    } else if (!A) s.aim = null;
    for (const d of pad.pressed) moveCursor(s, d);
}

function choose(s: BridgeState, m: Material, out: Happening[]): void {
    s.pen = m;
    s.text = `Laying ${m} now: it reaches ${STUFF[m].most} squares${STUFF[m].pulls ? ", and it only pulls, never pushes" : ""}.`;
    out.push({ cue: "lift", pitch: 1.3 });
}

const STEP: Record<Dir, Pt> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

function moveCursor(s: BridgeState, d: Dir): void {
    const v = viewOf(s.L),
        c = buildCam(s.L),
        hw = v.w / c.zoom / 2,
        hh = v.h / c.zoom / 2;
    s.keys = true;
    s.cursor = {
        x: Math.max(
            Math.ceil(c.x - hw + 1),
            Math.min(Math.floor(c.x + hw - 1), s.cursor.x + STEP[d].x),
        ),
        y: Math.max(Math.ceil(c.y - hh + 1), Math.min(bedOf(s.L) - 1, s.cursor.y + STEP[d].y)),
    };
}

export function bridgeCommand(s: BridgeState, id: string): void {
    const out: Happening[] = [];
    if (id === "clear") {
        clear(s);
        return;
    }
    if (s.phase !== "build") return;
    if (id === "join") {
        s.keys = true;
        s.armed = null;
        s.aim = null;
        if (!s.from) {
            if (jointsOf(s).some((j) => same(j, s.cursor))) {
                s.from = { ...s.cursor };
                s.text = "Move to where the beam ends, then press Enter.";
            } else s.text = "Start a beam at a peg or a joint.";
        } else if (same(s.from, s.cursor)) {
            s.from = null;
            s.text = "No beam laid.";
        } else if (lay(s, { a: s.from, b: s.cursor, m: s.pen }, out)) s.from = null;
    } else if (id === "material") {
        const i = s.chosen;
        if (s.from || s.armed || i === null) {
            const next = MATERIALS[(MATERIALS.indexOf(s.pen) + 1) % MATERIALS.length] ?? "wood";
            choose(s, next, out);
        } else switchBeam(s, i, out);
    } else if (id === "remove") {
        const i =
            s.chosen ??
            s.design.findLastIndex((seg) => same(seg.a, s.cursor) || same(seg.b, s.cursor));
        if (i >= 0) remove(s, i, out);
        else s.text = "Choose a beam first: tap it, or lay one.";
    }
}

/** Back to the level as it opened, every beam the child laid taken away; Backspace puts them back. */
function clear(s: BridgeState): void {
    if (s.phase !== "build") toBuild(s);
    const before = copy(s.design);
    s.design = copy(s.L.built ?? []);
    s.chosen = null;
    s.from = null;
    s.hand = null;
    s.armed = null;
    s.aim = null;
    changed(s, before);
    s.text = "The bridge is cleared. Start again from a blue anchor.";
}

function go(s: BridgeState, out: Happening[]): void {
    if (s.phase !== "build") {
        toBuild(s);
        out.push({ cue: "back" });
        return;
    }
    const L = s.L,
        t = truss(planOf(L, s.design));
    s.hand = null;
    s.from = null;
    s.armed = null;
    s.aim = null;
    s.over = null;
    s.chosen = null;
    s.phase = "run";
    s.end = null;
    s.run = {
        truss: t,
        car: {
            x: L.near.x - WAIT,
            y: L.near.y,
            vx: SPEED,
            vy: 0,
            angle: 0,
            rolling: true,
            stalled: 0,
            wet: false,
        },
        pieces: [],
        broke: null,
        over: 0,
        home: false,
        ripples: [],
    };
    s.text = "Off they go.";
    out.push({ cue: "lift", pitch: 0.8 });
    out.push({ cue: "place", pitch: 0.7, strength: 0.6 });
    out.push({ puff: { x: L.near.x - WAIT - 1.5, y: L.near.y - 0.3, n: 5 } });
    out.push({ shake: 0.2 });
}

function toBuild(s: BridgeState): void {
    s.phase = "build";
    s.run = null;
    s.end = null;
    s.cam = buildCam(s.L);
    s.text = `Back to building. ${totals(s)}`;
}

/** Where along the gap a place is, in words: by this bank, the middle, or by the far bank. */
function whereOf(L: BridgeLevel, x: number): string {
    const u = (x - L.near.x) / Math.max(1, L.far.x - L.near.x);
    return u < 0.3 ? "near this bank" : u > 0.7 ? "near the far bank" : "in the middle";
}

function finish(s: BridgeState, end: RoundEnd, out: Happening[]): void {
    s.phase = "done";
    s.end = end;
    s.text = end.words;
    if (end.won) out.push({ cue: "win" });
}

function judge(s: BridgeState): RoundEnd {
    const L = s.L,
        c = coins(s.design),
        n = s.design.length;
    if (L.budget !== undefined && c > L.budget)
        return {
            won: false,
            words: `The pups got across, but the bridge cost ${c} coins. Can you build one for ${L.budget} or less?`,
        };
    if (L.beams !== undefined && n !== L.beams)
        return {
            won: false,
            words: `The pups got across on ${n} beams. Can you build a bridge with exactly ${L.beams}?`,
        };
    return { won: true, words: `The pups are across. The bridge cost ${c} coins.` };
}

const gusting = (s: BridgeState, car: Car): boolean =>
    s.L.wind !== undefined && car.x > s.L.near.x + 1 && car.x < s.L.far.x - 1;

function stepRun(s: BridgeState, out: Happening[]): void {
    const r = s.run,
        L = s.L;
    if (!r) return;
    const car = r.car,
        t = r.truss;
    let load: Load | null = null;
    if (car.rolling && !r.home) {
        const nx = car.x + SPEED * DT;
        let ny: number | null = null,
            angle = 0;
        if (nx <= L.near.x) ny = L.near.y;
        else if (nx >= L.far.x) {
            ny = L.far.y;
            // a road ending a little above the far bank still lets the car down onto it
            if (Math.abs(car.y - L.far.y) > 0.8) ny = null;
        } else {
            const on = roadAt(t, nx, car.y);
            if (on) {
                ny = on.y;
                load = { bar: on.bar, at: on.at, mass: CAR_MASS };
                const b = t.bars[on.bar],
                    p = b && t.nodes[b.a],
                    q = b && t.nodes[b.b];
                if (p && q) angle = Math.atan2(q.y - p.y, q.x - p.x) * Math.sign(q.x - p.x || 1);
            }
        }
        if (ny === null) {
            car.rolling = false;
            car.vx = SPEED;
            car.vy = 0;
        } else if (Math.atan2(car.y - ny, nx - car.x) > CLIMB) {
            car.stalled++;
            const on = roadAt(t, car.x, car.y);
            if (on) load = { bar: on.bar, at: on.at, mass: CAR_MASS };
        } else {
            car.stalled = 0;
            car.x = nx;
            car.y = ny;
            car.angle += (angle - car.angle) * 0.25;
            if (car.x >= L.far.x + HOME) {
                r.home = true;
                car.angle = 0;
                out.push({ cue: "level" });
            }
        }
    } else if (!car.rolling) {
        car.vy += GRAVITY * DT;
        car.x += car.vx * DT;
        car.y += car.vy * DT;
        car.angle += 1.2 * DT;
        // a falling car slides down the far bank's face rather than through it
        const half = CAR_W / 2 - 0.3;
        if (car.y > L.far.y && car.x > L.far.x - half) {
            car.x = L.far.x - half;
            car.vx = 0;
        }
        if (L.place !== "ravine" && !car.wet && car.y > SURFACE + 0.2) {
            car.wet = true;
            car.vx *= 0.3;
            out.push({ cue: "splash", strength: 1, pan: pan(s, car.x) });
            out.push({ burst: { kind: "splash", x: car.x, y: SURFACE, n: 18 } });
            r.ripples.push({ x: car.x, age: 0, size: 1.4 });
        }
        if (car.wet) {
            car.vy = Math.min(car.vy, 1.2);
            car.vx *= 0.95;
        }
        if (car.y > bedOf(L) - 0.6) {
            car.y = bedOf(L) - 0.6;
            car.vy = 0;
            car.vx = 0;
            if (L.place === "ravine" && r.over === 0) {
                out.push({ cue: "crash", pan: pan(s, car.x) });
                out.push({ shake: 0.3 });
                out.push({ puff: { x: car.x, y: car.y, n: 8 } });
            }
        }
    }
    const wind = gusting(s, car) ? (L.wind ?? 0) : 0;
    const snapped = stepTruss(t, DT, load ? [load] : [], {
        wind,
        floor: bedOf(L) - 0.2,
        water: L.place === "ravine" ? undefined : SURFACE,
    });
    if (snapped !== null) {
        const b = t.bars[snapped],
            p = b && t.nodes[b.a],
            q = b && t.nodes[b.b];
        if (b && p && q) {
            const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
            r.broke ??= mid;
            const a = Math.atan2(q.y - p.y, q.x - p.x);
            for (const [k, end] of [p, q].entries())
                r.pieces.push({
                    x: (end.x + mid.x) / 2,
                    y: (end.y + mid.y) / 2,
                    vx: (end.x - mid.x) * 0.6,
                    vy: -1.5,
                    angle: a + (k === 0 ? 0 : Math.PI),
                    spin: k === 0 ? -2 : 2,
                    len: b.rest / 2,
                    m: b.m,
                    wet: false,
                });
            out.push({ cue: "crash", strength: 0.8, pan: pan(s, mid.x) });
            out.push({ shake: 0.35 });
            out.push({ burst: { kind: "dust", x: mid.x, y: mid.y, n: 8 } });
            s.text = `Crack: a ${b.m} beam snapped ${whereOf(L, mid.x)}.`;
        }
    }
    let hardest = 0;
    for (const b of t.bars) hardest = Math.max(hardest, strainOf(b));
    if (hardest > 0.55 && s.steps % 20 === 0)
        out.push({ cue: "creak", strength: Math.min(1, hardest), pan: pan(s, car.x) });
    // a beam close to snapping shakes the whole bridge a little
    if (hardest > 0.85 && s.steps % 12 === 0) out.push({ shake: 0.08 });
    for (const pc of r.pieces) {
        pc.vy += GRAVITY * DT;
        if (pc.wet) {
            pc.vx *= 0.9;
            pc.vy = Math.min(pc.vy, 0.6);
            pc.spin *= 0.9;
        }
        pc.x += pc.vx * DT;
        pc.y = Math.min(bedOf(L) - 0.3, pc.y + pc.vy * DT);
        pc.angle += pc.spin * DT;
        if (L.place !== "ravine" && !pc.wet && pc.y > SURFACE) {
            pc.wet = true;
            out.push({ cue: "splash", strength: 0.4, pan: pan(s, pc.x) });
            out.push({ burst: { kind: "splash", x: pc.x, y: SURFACE, n: 6 } });
            r.ripples.push({ x: pc.x, age: 0, size: 0.6 });
        }
    }
    for (const rp of r.ripples) rp.age += DT;
    r.ripples = r.ripples.filter((rp) => rp.age < 3);
    if (r.home || !car.rolling) r.over++;
    const wantX = r.home || !car.rolling ? car.x : car.x + 4;
    const wide = wideCam(L);
    s.cam = follow(
        s.cam,
        { x: Math.max(wide.x - 4, Math.min(wide.x + 6, wantX)), y: wide.y, zoom: 1 },
        { rate: 2, zoomRate: 1.2, dt: DT, view: viewOf(L), world: { w: worldW(L), h: H } },
    );
    if (r.home && r.over > RATE) finish(s, judge(s), out);
    else if (!car.rolling && r.over > RATE * 1.2)
        finish(
            s,
            {
                won: false,
                words: r.broke
                    ? `The bridge broke ${whereOf(L, r.broke.x)}. Add a triangle?`
                    : "There was a gap in the road, so the car fell. Lay road all the way from bank to bank.",
            },
            out,
        );
    else if (car.stalled > RATE * 1.5)
        finish(
            s,
            {
                won: false,
                words: "The car stopped: the road was too steep to climb. Make the slope gentler.",
            },
            out,
        );
    else if (s.steps > RATE * 40)
        finish(s, { won: false, words: "The car stopped before it got across." }, out);
}

const pan = (s: BridgeState, x: number): number => panOf(x, s.cam.x, viewOf(s.L).w);

function step(s: BridgeState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.laid++;
    s.ticked++;
    if (pad.tapped) go(s, out);
    else if (s.phase === "build") hands(s, pad, out);
    else if (s.phase === "run") stepRun(s, out);
    return out;
}

/** How hard a beam works, in the four steps its drawing glows in. */
const glowOf = (strain: number): number =>
    strain < 0.4 ? 0 : strain < 0.65 ? 1 : strain < 0.9 ? 2 : 3;

function beamSprite(
    key: string,
    a: Pt,
    b: Pt,
    m: Material,
    params: { strain?: number; ghost?: number; broken?: number },
    z: number,
): Sprite {
    const len = Math.max(0.3, lengthOf(a, b));
    // a rope is drawn as long as it is, and a strut or a road a little past its joints so the ends meet
    const over = m === "rope" ? 0 : 0.3;
    return {
        key,
        art: "trussbeam",
        params: {
            kind: m,
            len: Math.max(1, Math.min(9, Math.round(len + over))),
            strain: params.strain ?? 0,
            broken: params.broken ?? 0,
            ghost: params.ghost ?? 0,
        },
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        size: len + over,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        z,
    };
}

/** A joint as drawn: where it is, a little exaggerated from where it was built while it bends, so a bend reads. */
function shown(node: Pt, rest: Pt): Pt {
    const dx = node.x - rest.x,
        dy = node.y - rest.y,
        d = Math.hypot(dx, dy),
        k = d < 0.4 ? 3 : d < 1.2 ? 3 - ((d - 0.4) / 0.8) * 2 : 1;
    return { x: rest.x + dx * k, y: rest.y + dy * k };
}

function backdrop(s: BridgeState, sprites: Sprite[]): void {
    const L = s.L,
        v = viewOf(L),
        eye = { cam: s.cam, view: v },
        W = worldW(L);
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                base: s.cam.y - v.h / s.cam.zoom / 2 + 4,
                every: 15,
                stray: 4,
                z: 0,
                gaps: 0.3,
                alpha: 0.8,
                things: [
                    { art: "cloud", params: { puffs: 4, rain: 0 }, size: 5, often: 2 },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            11,
        ),
        ...row(
            {
                key: "far",
                depth: 0.35,
                base: Math.min(L.near.y, L.far.y) + 0.5,
                every: 11,
                stray: 3,
                z: 1,
                gaps: 0.35,
                alpha: 0.5,
                things: [
                    { art: "firs", params: { count: 3, snow: 0 }, size: 5, often: 2 },
                    {
                        art: "hedge",
                        params: { clumps: 4, berries: 0, gap: 0 },
                        size: 4.5,
                        often: 1,
                    },
                ],
            },
            eye,
            17,
        ),
    );
    const cliff = L.place === "ravine" ? 1 : 0;
    for (const [side, top, x0, x1, edge] of [
        ["near", L.near.y, L.near.x - 35, L.near.x + (cliff ? 0.1 : 1), "right"],
        ["far", L.far.y, L.far.x - (cliff ? 0.1 : 1), W + 6, "left"],
    ] as const) {
        const w = Math.min(36, Math.round(x1 - x0)),
            h = Math.min(16, Math.ceil(H - top + STREAMBANK.top + 1));
        sprites.push({
            key: `bank:${side}`,
            art: "streambank",
            params: { w, h, edge, cliff },
            seed: side === "near" ? 61 : 62,
            size: w,
            x: edge === "right" ? x1 - w / 2 : x0 + w / 2,
            y: top - STREAMBANK.top + h / 2,
            z: 3.2,
            still: true,
        });
    }
    const rk = L.rock;
    if (rk) {
        const h = Math.ceil(bedOf(L) + 1 - rk.top + STREAMBANK.top);
        sprites.push({
            key: "rock",
            art: "streambank",
            params: { w: rk.w + 1, h, edge: "both", cliff: 1 },
            seed: 63,
            size: rk.w + 1,
            x: rk.x + rk.w / 2,
            y: rk.top - STREAMBANK.top + h / 2,
            z: 3.2,
            still: true,
        });
    }
    if (L.place === "ravine")
        sprites.push({
            key: "floor",
            art: "streambank",
            params: { w: Math.round(L.far.x - L.near.x + 2), h: 3, edge: "none", cliff: 1 },
            seed: 64,
            size: Math.round(L.far.x - L.near.x + 2),
            x: (L.near.x + L.far.x) / 2,
            y: bedOf(L) + 1.1,
            z: 3.1,
            still: true,
        });
    if (L.clear)
        sprites.push({
            key: "boat",
            art: "mailboat",
            params: { sacks: 2, sailing: 0 },
            size: 5,
            x: (L.clear.x0 + L.clear.x1) / 2 - 0.5,
            y: SURFACE + 0.4,
            stand: true,
            z: 2.5,
        });
    if (L.wind !== undefined)
        sprites.push({
            key: "windsock",
            art: "windsock",
            params: { wind: s.run && gusting(s, s.run.car) ? 1 : 0.3, stripes: 5 },
            size: 3,
            x: L.far.x + 13,
            y: L.far.y,
            stand: true,
            z: 4,
        });
}

function frame(s: BridgeState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        r = s.run,
        v = viewOf(L);
    backdrop(s, sprites);
    const pegs = anchorsOf(L);
    if (r) {
        const plan = planOf(L, s.design);
        const at = r.truss.nodes.map((n, i) => {
            const j = plan.joints[i];
            return j ? shown(n, j) : { x: n.x, y: n.y };
        });
        for (const [i, b] of r.truss.bars.entries()) {
            const p = at[b.a],
                q = at[b.b];
            if (b.broken || !p || !q) continue;
            sprites.push(
                beamSprite(
                    `beam:${i}`,
                    p,
                    q,
                    b.m,
                    { strain: glowOf(strainOf(b)) },
                    b.m === "road" ? 6 : 5,
                ),
            );
        }
        for (const [i, p] of at.entries()) {
            const used = r.truss.bars.some((b) => !b.broken && (b.a === i || b.b === i));
            if (!used && i >= pegs.length) continue;
            sprites.push({
                key: `joint:${i}`,
                art: "trussjoint",
                params: { kind: i < pegs.length ? "anchor" : "joint" },
                x: p.x,
                y: p.y,
                size: i < pegs.length ? 0.8 : 0.6,
                z: 7,
            });
        }
        for (const [i, pc] of r.pieces.entries()) {
            const dx = Math.cos(pc.angle) * pc.len,
                dy = Math.sin(pc.angle) * pc.len;
            sprites.push(
                beamSprite(
                    `piece:${i}`,
                    { x: pc.x - dx / 2, y: pc.y - dy / 2 },
                    { x: pc.x + dx / 2, y: pc.y + dy / 2 },
                    pc.m,
                    { broken: 1 },
                    pc.wet ? 2.8 : 5,
                ),
            );
        }
    } else {
        for (const [i, seg] of s.design.entries()) {
            const strain = L.preview ? glowOf(s.preview[i] ?? 0) : 0;
            const sp = beamSprite(
                `beam:${i}`,
                seg.a,
                seg.b,
                seg.m,
                { strain },
                seg.m === "road" ? 6 : 5,
            );
            // the beam just laid bounces into place
            if (i === s.design.length - 1 && s.laid < 12 && !rest)
                sp.scale = 1 + 0.12 * Math.sin((s.laid / 12) * Math.PI);
            sprites.push(sp);
        }
        // on the first levels the blue anchors breathe until the first beam is laid from one
        const pulse = L.hints && s.made === 0 && !rest ? 0.12 * Math.sin(s.steps * 0.12) : 0;
        for (const [i, p] of jointsOf(s).entries()) {
            const anchor = i < pegs.length;
            sprites.push({
                key: `joint:${key(p)}`,
                art: "trussjoint",
                params: { kind: anchor ? "anchor" : "joint" },
                x: p.x,
                y: p.y,
                size: anchor ? 1.1 : 0.85,
                z: 7,
                ...(anchor && pulse ? { scale: 1 + pulse } : {}),
            });
        }
        const chosen = s.chosen === null ? null : s.design[s.chosen];
        if (chosen) marks.push({ kind: "line", a: chosen.a, b: chosen.b, style: "aim" });
        if (L.hints && s.level < 2)
            for (const seg of L.plan)
                for (const p of [seg.a, seg.b])
                    if (!jointsOf(s).some((j) => same(j, p)))
                        marks.push({ kind: "ring", x: p.x, y: p.y, r: 0.45 });
        // the third level's suggestions are fainter, and after it there are none
        if (L.hints && s.level === 2) {
            const pts = L.plan
                .flatMap((seg) => [seg.a, seg.b])
                .filter((p) => !jointsOf(s).some((j) => same(j, p)));
            if (pts.length) marks.push({ kind: "dots", pts, faint: true, opacity: 0.5 });
        }
        const lay = s.hand?.kind === "lay" ? s.hand : null;
        const ghost = lay
            ? { a: lay.from, b: lay.to }
            : s.armed
              ? { a: s.armed, b: s.aim ?? s.armed }
              : s.from
                ? { a: s.from, b: s.cursor }
                : null;
        const from = lay?.from ?? s.armed ?? s.from;
        if (from) {
            // how far the material reaches, faint, and the joint the beam starts from held in a glow
            const most = STUFF[s.pen].most,
                n = Math.round(most * 8);
            marks.push({
                kind: "dots",
                pts: Array.from({ length: n }, (_, k) => ({
                    x: from.x + most * Math.cos((k / n) * 2 * Math.PI),
                    y: from.y + most * Math.sin((k / n) * 2 * Math.PI),
                })),
                faint: true,
                opacity: 0.45,
            });
            marks.push({ kind: "ring", x: from.x, y: from.y, r: 0.75, on: true });
        }
        if (ghost && !same(ghost.a, ghost.b)) {
            const seg = { ...ghost, m: s.pen },
                fits = why(s, seg) === null;
            const g = beamSprite("ghost", ghost.a, ghost.b, s.pen, { ghost: fits ? 1 : 2 }, 8);
            g.alpha = 0.85;
            sprites.push(g);
            const len = lengthOf(ghost.a, ghost.b),
                // the readout stands off the beam on its upper side, so it never covers another beam laid along it
                nx = (ghost.b.y - ghost.a.y) / len,
                ny = -(ghost.b.x - ghost.a.x) / len,
                side = ny > 0 || (ny === 0 && nx > 0) ? -1 : 1,
                at = (d: number): Pt => ({
                    x: (ghost.a.x + ghost.b.x) / 2 + side * nx * d,
                    y: (ghost.a.y + ghost.b.y) / 2 + side * ny * d,
                });
            // the length counter pops as it changes, the way a toy's dial clicks round
            const pop = rest ? 0 : Math.max(0, 1 - s.ticked / 10);
            const word = at(2.2),
                cost = at(1.1);
            marks.push({
                kind: "word",
                ...word,
                text: Number.isInteger(len) ? `${len}` : len.toFixed(1),
                size: 1.1 + 0.35 * pop,
            });
            marks.push({ kind: "word", ...cost, text: `${costOf(seg)} coins`, size: 0.55 });
            marks.push({ kind: "ring", x: ghost.b.x, y: ghost.b.y, r: 0.3, solid: true, on: fits });
        }
        const over = lay ? null : s.over;
        if (over && !(from && same(over, from)))
            marks.push({ kind: "ring", x: over.x, y: over.y, r: 0.75, on: true });
        if (s.keys)
            marks.push({ kind: "ring", x: s.cursor.x, y: s.cursor.y, r: 0.55, solid: true });
        const pick = PICKER.w / BRIDGETRAY.w;
        sprites.push({
            key: "picker",
            art: "bridgetray",
            params: { chosen: s.pen },
            x: v.w / 2,
            y: PICKER.y,
            size: PICKER.w,
            fixed: true,
            z: 20,
        });
        if (L.hints && s.made === 0 && s.level === 0 && !from)
            marks.push({
                kind: "word",
                x: v.w / 2,
                y: PICKER.y + (BRIDGETRAY.h * pick) / 2 + 1.6,
                text: "Drag from a blue anchor to the other bank",
                size: 0.8,
                fixed: true,
            });
        const held = s.hand?.kind === "hold" ? s.hand : null;
        if (held && held.moved >= 0.4) {
            const seg = s.design[held.seg];
            if (seg) {
                const dx = held.at.x - held.from.x,
                    dy = held.at.y - held.from.y;
                const g = beamSprite(
                    "carried",
                    { x: seg.a.x + dx, y: seg.a.y + dy },
                    { x: seg.b.x + dx, y: seg.b.y + dy },
                    seg.m,
                    { ghost: held.moved >= 1.5 ? 2 : 0 },
                    10,
                );
                g.alpha = 0.7;
                sprites.push(g);
            }
        }
    }
    carSprites(s, sprites);
    const showStrain = r !== null || L.preview === true;
    if (showStrain && s.design.length > 0) {
        const hardest = r ? Math.max(0, ...r.truss.bars.map(strainOf)) : Math.max(0, ...s.preview);
        sprites.push({
            key: "strainkey",
            art: "strainkey",
            params: { pointer: glowOf(hardest) },
            x: v.w - 4.2,
            y: 1.4,
            size: 7,
            fixed: true,
            z: 20,
        });
    }
    const c = coins(s.design);
    marks.push({
        kind: "word",
        x: 5.5,
        y: 1.6,
        text: L.budget !== undefined ? `${c} of ${L.budget} coins` : `${c} coins`,
        size: 0.8,
        fixed: true,
    });
    if (L.beams !== undefined)
        marks.push({
            kind: "word",
            x: 5.5,
            y: 2.8,
            text: `${s.design.length} of ${L.beams} beams`,
            size: 0.8,
            fixed: true,
        });
    if (L.span && !r) {
        // down in the gap under the banks' tops, clear of the picker at the top of the field, of the deck
        // and of the anchors on the banks' faces, with its words under it
        const y = Math.max(L.near.y, L.far.y) + 1.6;
        marks.push({
            kind: "line",
            a: { x: L.near.x, y },
            b: { x: L.far.x, y },
            style: "aim",
            head: true,
        });
        marks.push({
            kind: "line",
            a: { x: L.far.x, y },
            b: { x: L.near.x, y },
            style: "aim",
            head: true,
        });
        marks.push({
            kind: "word",
            x: (L.near.x + L.far.x) / 2,
            y: y + 1.2,
            text: `${L.far.x - L.near.x} squares`,
            size: 1,
        });
    }
    if (L.clear && !r)
        marks.push({
            kind: "line",
            a: { x: L.clear.x0, y: L.clear.y + 0.6 },
            b: { x: L.clear.x1, y: L.clear.y + 0.6 },
            style: "crash",
        });
    const focus = r
        ? { x: r.car.x, y: r.car.y - 1 }
        : (s.armed ?? { x: (L.near.x + L.far.x) / 2, y: L.near.y });
    return {
        sprites,
        marks,
        camera: { x: s.cam.x, y: s.cam.y, zoom: s.cam.zoom },
        view: v,
        world: { w: worldW(L), h: H },
        focus,
        time: rest ? 0 : s.steps * DT,
        water:
            L.place === "ravine"
                ? []
                : [
                      {
                          x: L.near.x - 1.5,
                          w: L.far.x - L.near.x + 3,
                          level: SURFACE,
                          bottom: bedOf(L) + 1.5,
                          waves: 0.08,
                          flow: L.place === "stream" ? 0.6 : 0.3,
                          ripples: rest || !r ? [] : r.ripples.map((x) => ({ ...x })),
                          z: 3,
                      },
                  ],
    };
}

/** The car with Rufus driving and Pip beside him, and Maple and Dot waiting on the far bank. */
function carSprites(s: BridgeState, sprites: Sprite[]): void {
    const L = s.L,
        r = s.run,
        car = r?.car ?? { x: L.near.x - WAIT, y: L.near.y, angle: 0 };
    const cos = Math.cos(car.angle),
        sin = Math.sin(car.angle);
    // from the place the wheels touch the road, in the car's own squares, to the world
    const world = (dx: number, dy: number): Pt => ({
        x: car.x + dx * cos - dy * sin,
        y: car.y + dx * sin + dy * cos,
    });
    const centre = world(0, -(PUPCAR.road - PUPCAR.h / 2) * CAR_K);
    for (const [i, member] of (["pip", "rufus"] as const).entries()) {
        const seat = PUPCAR.seats[i];
        if (!seat) continue;
        const at = world((seat.x - PUPCAR.w / 2) * CAR_K, (seat.y - PUPCAR.road) * CAR_K - 0.55);
        sprites.push({
            key: `rider:${member}`,
            art: "pupfamily",
            params: {
                member,
                pose: "sit",
                mood: s.end && !s.end.won ? "worried" : "excited",
                dir: 1,
                gear: "none",
            },
            x: at.x,
            y: at.y,
            size: member === "rufus" ? 1.5 : 1.35,
            angle: car.angle,
            z: 10.5,
        });
    }
    sprites.push({
        key: "car",
        art: "pupcar",
        params: { paint: "berry" },
        x: centre.x,
        y: centre.y,
        size: CAR_W,
        angle: car.angle,
        z: 11,
    });
    const cheering = r?.home === true;
    for (const [i, member] of (["maple", "dot"] as const).entries())
        sprites.push({
            key: `waiting:${member}`,
            art: "pupfamily",
            params: {
                member,
                pose: cheering ? "cheer" : i === 0 ? "wave" : "stand",
                mood: cheering ? "excited" : "happy",
                dir: -1,
                gear: "none",
            },
            x: L.far.x + HOME + 4 + i * 2,
            y: L.far.y,
            size: member === "maple" ? 2 : 1.6,
            stand: true,
            z: 9,
        });
}

function say(s: BridgeState): string {
    const L = s.L,
        rel = (p: Pt) =>
            `${p.x - L.near.x} along and ${L.near.y - p.y >= 0 ? `${L.near.y - p.y} up` : `${p.y - L.near.y} down`}`;
    const beams = s.design.map((seg) => `${seg.m} from ${rel(seg.a)} to ${rel(seg.b)}`);
    const gap = `The gap is ${L.far.x - L.near.x} squares across.`;
    const built = beams.length ? `Beams: ${beams.join("; ")}.` : "Nothing is built yet.";
    const cursor = s.keys ? ` The cursor is at ${rel(s.cursor)}.` : "";
    return `${s.text} ${gap} ${built} Laying ${s.pen}. ${totals(s)}${cursor}`;
}

const SOUNDS: Kit = {
    place: [
        { wave: "square", hz: 620, attack: 0.002, decay: 0.04, gain: 0.25 },
        { wave: "noise", hz: 4200, attack: 0.001, decay: 0.03, gain: 0.3 },
    ],
    creak: [
        { wave: "sawtooth", hz: 150, to: 110, attack: 0.04, decay: 0.35, gain: 0.18 },
        { wave: "noise", hz: 700, attack: 0.02, decay: 0.25, gain: 0.12 },
    ],
    crash: [
        { wave: "noise", hz: 1600, attack: 0.001, decay: 0.18, gain: 0.55 },
        { wave: "square", hz: 220, to: 70, attack: 0.002, decay: 0.2, gain: 0.3 },
    ],
};

function hum(s: BridgeState): Hum[] {
    const out: Hum[] = [];
    if (s.L.place !== "ravine") out.push({ kind: "water", level: 0.25 });
    const r = s.run;
    if (s.phase === "run" && r?.car.rolling && !r.home) out.push({ kind: "engine", level: 0.35 });
    if (r && gusting(s, r.car)) out.push({ kind: "wind", level: 0.7 });
    return out;
}

/** A built bridge to keep: its beams. */
export interface Design {
    beams: Seg[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isMaterial = (v: unknown): v is Material => MATERIALS.some((m) => m === v);

function readPt(v: unknown): Pt | null {
    if (!isRecord(v)) return null;
    const { x, y } = v;
    return typeof x === "number" &&
        typeof y === "number" &&
        Number.isInteger(x) &&
        Number.isInteger(y)
        ? { x, y }
        : null;
}

/** A kept bridge read back, each beam laid again by the level's own rules, or null when it is not one. */
export function readDesign(s: BridgeState, v: unknown): Seg[] | null {
    if (!isRecord(v) || !Array.isArray(v.beams)) return null;
    const trial: BridgeState = { ...s, design: [] };
    for (const raw of v.beams as unknown[]) {
        if (!isRecord(raw)) return null;
        const a = readPt(raw.a),
            b = readPt(raw.b),
            m = raw.m;
        if (!a || !b || !isMaterial(m)) return null;
        const seg = { a, b, m };
        if (!jointsOf(trial).some((j) => same(j, a)) || why(trial, seg)) return null;
        trial.design.push(seg);
    }
    return trial.design;
}

export const bridgeGame: ActionGame<BridgeState> = {
    id: "bridgebuild",
    title: "Bridge builder",
    group: "action",
    // building is fine dragging between joints a square apart and a Go button to press, which a card's small field and no buttons cannot give
    card: null,
    portrait: { keep: 24 },
    quiet: true,
    touch: true,
    saves: { level: FREE },
    againKeeps: true,
    levels: BRIDGE_LEVELS,
    rate: RATE,
    sounds: SOUNDS,
    hum,
    cover: { art: "bridgecover", params: { pups: 2 } },
    hint: "Drag from a blue anchor or a joint to lay a beam, or tap a joint and then tap where the beam ends, and keep tapping to lay a chain; tap the joint again to stop. Pick wood, road or rope at the top. Tap a beam to change what it is made of, and hold it down or right click it to take it away, then press Go. With the keys: the arrows move the cursor, Enter starts and ends a beam, M changes the material, Delete takes a beam away, C clears the bridge, Backspace undoes, and space is Go",
    controls: {
        arrows: { left: "Left", right: "Right", up: "Up", down: "Down" },
        go: "Go",
        icons: { go: "play" },
    },
    goLabel: (s) => (s.phase === "build" ? "Go" : "Build again"),
    goIcon: (s) => (s.phase === "build" ? "play" : "restart"),
    commands: [
        { id: "join", label: "Start or end a beam", key: "enter", keysOnly: true },
        { id: "material", label: "Change material", key: "m", icon: "shuffle" },
        { id: "remove", label: "Take the beam away", key: "delete", icon: "close" },
        { id: "clear", label: "Clear bridge", key: "c", icon: "broom" },
    ],
    command: bridgeCommand,
    shows: (s, id) => {
        // once a test has ended, the bar offers the bridge cleared beside building on as it stands
        if (id === "clear") return s.phase === "done" && s.design.length > (s.L.built?.length ?? 0);
        if (s.phase !== "build") return false;
        if (id === "remove") return s.chosen !== null;
        return id === "material" && (s.chosen !== null || s.armed !== null || s.from !== null);
    },
    start: (level) => {
        const L = BRIDGE_LEVELS[level] ?? BRIDGE_LEVELS[0];
        return startBridge(L, BRIDGE_LEVELS[level] ? level : 0);
    },
    step,
    frame,
    say,
    note: (s) => s.text,
    won: (s) => s.end?.won === true,
    ended: (s) => s.end,
    objectives: (s) => ({ completed: s.end?.won ? 1 : 0, total: 1 }),
    back: (s) => undo(s),
    checkpoint: (s): Design => ({ beams: copy(s.design) }),
    restore: (s, value) => {
        if (s.phase !== "build") return false;
        const beams = readDesign(s, value);
        if (!beams) return false;
        s.design = beams;
        s.past = [];
        s.chosen = null;
        s.armed = null;
        s.aim = null;
        s.preview = s.L.preview ? trial(s.L, s.design) : s.design.map(() => 0);
        return true;
    },
    cancelInput: (s) => {
        s.hand = null;
        s.aim = null;
    },
    still: {
        press: () => 12,
        settling: (s) => s.phase === "run",
    },
};
