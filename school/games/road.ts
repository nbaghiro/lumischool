// The road: a delivery round on a number line. The car drives along a road whose kerb is a number
// line, with parcels on its roof rack and a list of stops pinned to the dashboard, and each stop is
// delivered by bringing the car to rest with its nose in the bay at that number. Holding drives and
// lifting brakes, so the car stops over a distance that grows with its speed, and when to lift is the
// question: where a number is on a line, and how much speed to carry to it. The stops are not always
// in the order the road meets them, so some are behind the car and the round is planned. A stop in
// the wrong place leaves a chalk mark with the number it stopped on; a hard stop on the brake can
// slide a parcel off the rack, and it waits in the road to be picked up again. The round ends by
// driving through the finish line past the end of the numbers, so no stop is ever made against the
// end of the road. From the later levels only the ends of the line are written, which is number line
// estimation. See "The road, rebuilt as a delivery round" in .docs/games.md.
import { follow, keepInside, lead, type Cam } from "../../engine/motion/camera";
import {
    done,
    feed,
    progress,
    track,
    type GameEvent,
    type Goal,
    type Track,
} from "../../engine/motion/goals";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { Hum, Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

/** A door on the round: a value on the line, and how the list writes it when not as the number. */
export interface Stop {
    at: number;
    words?: string;
}

export interface RoadLevel extends ActionLevel {
    /** The number line on the kerb: its first and last value, and how many squares one unit takes. */
    from: number;
    to: number;
    per: number;
    /** Which values are written on the kerb: every tick, or only the ends. */
    labels: "each" | "ends";
    /** A tick every this many units. */
    tick: number;
    stops: Stop[];
    /** Whether the list is delivered in its own order or in any order the driver chooses. */
    order: "list" | "any";
    /** How far either side of a stop the nose may rest and still deliver, in units of the line. */
    bay: number;
    /** Top speed and acceleration in squares a second, and a second squared. */
    top: number;
    accel: number;
    /** Whether a ring shows where the car would come to rest if the hand lifted now. */
    ring: boolean;
    /** Whether the parcels ride loose, so a hard stop on the brake can slide one off. */
    rack: boolean;
    /** Boxes in the road, at a value on the line and in a lane. */
    boxes: { at: number; lane: number }[];
}

export const ROAD_LEVELS: Levels<RoadLevel> = [
    {
        title: "Two doors",
        goal: "Deliver to 4, then 8, then drive through the finish.",
        grades: [1, 1],
        from: 0,
        to: 10,
        per: 3,
        labels: "each",
        tick: 1,
        stops: [{ at: 4 }, { at: 8 }],
        order: "list",
        bay: 0.5,
        top: 9,
        accel: 6,
        ring: true,
        rack: false,
        boxes: [],
    },
    {
        title: "Three doors",
        goal: "Deliver to 6, then 13, then 18, then drive through the finish.",
        grades: [1, 2],
        from: 0,
        to: 20,
        per: 2,
        labels: "each",
        tick: 1,
        stops: [{ at: 6 }, { at: 13 }, { at: 18 }],
        order: "list",
        bay: 0.5,
        top: 11,
        accel: 6,
        ring: true,
        rack: false,
        boxes: [{ at: 9, lane: 1 }],
    },
    {
        title: "Back again",
        goal: "Deliver to 5 more than 10, then 7, then 2 more than 10, then drive through the finish.",
        grades: [1, 2],
        from: 0,
        to: 20,
        per: 2,
        labels: "each",
        tick: 1,
        stops: [
            { at: 15, words: "5 more than 10" },
            { at: 7 },
            { at: 12, words: "2 more than 10" },
        ],
        order: "list",
        bay: 0.5,
        top: 11,
        accel: 6,
        ring: true,
        rack: true,
        boxes: [
            { at: 4, lane: 0 },
            { at: 10, lane: 2 },
        ],
    },
    {
        title: "In twos",
        goal: "Deliver to 12, then 28, then 20, then drive through the finish.",
        grades: [2, 2],
        from: 0,
        to: 40,
        per: 1,
        labels: "each",
        tick: 2,
        stops: [{ at: 12 }, { at: 28 }, { at: 20 }],
        order: "list",
        bay: 1,
        top: 13,
        accel: 7,
        ring: true,
        rack: true,
        boxes: [
            { at: 8, lane: 1 },
            { at: 24, lane: 0 },
            { at: 33, lane: 2 },
        ],
    },
    {
        title: "In fives",
        goal: "Deliver to 15, then halfway to 70, then 25, then drive through the finish.",
        grades: [2, 3],
        from: 0,
        to: 50,
        per: 1,
        labels: "each",
        tick: 5,
        stops: [{ at: 15 }, { at: 35, words: "halfway to 70" }, { at: 25 }],
        order: "list",
        bay: 1.5,
        top: 14,
        accel: 7,
        ring: false,
        rack: true,
        boxes: [
            { at: 10, lane: 1 },
            { at: 22, lane: 2 },
            { at: 41, lane: 0 },
        ],
    },
    {
        title: "In tens, any order",
        goal: "Deliver to 70, 30 and 50 in any order, then drive through the finish.",
        grades: [2, 3],
        from: 0,
        to: 100,
        per: 0.6,
        labels: "each",
        tick: 10,
        stops: [{ at: 70 }, { at: 30 }, { at: 50 }],
        order: "any",
        bay: 3,
        top: 15,
        accel: 7,
        ring: false,
        rack: true,
        boxes: [
            { at: 20, lane: 1 },
            { at: 45, lane: 0 },
            { at: 62, lane: 2 },
            { at: 85, lane: 1 },
        ],
    },
    {
        title: "Only the ends",
        goal: "Only 0 and 100 are written. Deliver to 35, 80 and 15 in any order, then drive through the finish.",
        grades: [3, 4],
        from: 0,
        to: 100,
        per: 0.8,
        labels: "ends",
        tick: 10,
        stops: [{ at: 35 }, { at: 80 }, { at: 15 }],
        order: "any",
        bay: 3,
        top: 16,
        accel: 7,
        ring: false,
        rack: true,
        boxes: [
            { at: 10, lane: 2 },
            { at: 27, lane: 1 },
            { at: 48, lane: 0 },
            { at: 64, lane: 2 },
            { at: 90, lane: 1 },
        ],
    },
    {
        title: "Quarters of the lane",
        goal: "The lane goes from 0 to 1. Deliver to a quarter, then three quarters, then a half, then drive through the finish.",
        grades: [3, 4],
        from: 0,
        to: 1,
        per: 40,
        labels: "ends",
        tick: 0.25,
        stops: [
            { at: 0.25, words: "a quarter" },
            { at: 0.75, words: "three quarters" },
            { at: 0.5, words: "a half" },
        ],
        order: "list",
        bay: 0.04,
        top: 15,
        accel: 7,
        ring: false,
        rack: true,
        boxes: [
            { at: 0.12, lane: 1 },
            { at: 0.4, lane: 2 },
            { at: 0.62, lane: 0 },
        ],
    },
];

const RATE = 60,
    DT = 1 / RATE;
/**
 * The road's geometry in squares: where the line starts, the lanes, the run-out past the end of the
 * line, and the view. The lanes are the road drawing's own, repeated here because nothing in this
 * folder imports src/art; a test asserts the two agree.
 */
export const ROAD = {
    origin: 12,
    top: 5,
    lane: 3,
    lanes: 3,
    after: 24,
    view: { w: 36, h: 20 },
} as const;
const laneY = (lane: number) => ROAD.top + ROAD.lane * lane + ROAD.lane / 2;
const CAR = 2;
/** Squares past the end of the line to the finish, inside the run-out. */
const FINISH = 6;
/** Where a delivered parcel rests on the pavement below the kerb's numbers. */
const DOORSTEP = 16.6;
/** Squares a second above which a hard stop on the brake slides a parcel off the rack. */
const SLIDE = 9;
/** The share of the full brake that lifting the hand gives: an easier stop, over a longer distance. */
const LIFT = 0.6;
/** Seconds a delivered parcel takes to hop from the rack to the doorstep. */
const HOP = 0.6;
/** The list card's width in the view; its height follows deliverylist.ts's box, twelve squares wide and a line a stop. */
const CARD = { w: 7.2 } as const;

interface Box {
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    angle: number;
    hit: boolean;
}

export interface RoadState {
    level: number;
    L: RoadLevel;
    /** The car's centre, speed along the road, lane it is steering for, and sideways speed. */
    x: number;
    y: number;
    v: number;
    reverseWait: number;
    reversing: boolean;
    /** Braking on the brake this step, so a hard stop squeals and slides a parcel only as it begins. */
    hard: boolean;
    vy: number;
    lane: number;
    boxes: Box[];
    cam: Cam;
    /** Steps since the car came to rest, and whether it has moved since the last stop was read. */
    still: number;
    moved: boolean;
    /** The value the nose rested on last, once it has rested. */
    stop: number | null;
    stops: number;
    bumps: number;
    delivered: boolean[];
    /** Parcels on the rack, and those that slid off and wait in the road. */
    rack: number;
    dropped: { x: number; y: number }[];
    /** Each delivery's parcel on its way to the doorstep: which stop, from where, and the step it left. */
    hops: { k: number; x: number; y: number; at: number }[];
    /** Where the car stopped wrong, with the number it stopped on. */
    chalks: { x: number; text: string }[];
    goal: Track;
    said: string;
    steps: number;
    won: boolean;
}

const lengthOf = (L: RoadLevel) => (L.to - L.from) * L.per;
export const worldWidth = (L: RoadLevel) => ROAD.origin + lengthOf(L) + ROAD.after;
/** The value on the line at a place along the road. */
export const valueAt = (L: RoadLevel, x: number) => L.from + (x - ROAD.origin) / L.per;
export const placeOf = (L: RoadLevel, v: number) => ROAD.origin + (v - L.from) * L.per;
export const finishOf = (L: RoadLevel) => placeOf(L, L.to) + FINISH;
export const noseOf = (s: RoadState) => s.x + CAR / 2 - 0.15;

/** A stop as the list and the sentences write it. */
export const stopWords = (st: Stop): string => st.words ?? String(st.at);

/** The goal a level's round makes: each stop delivered, in the list's order or any, then the finish. */
function goalOf(L: RoadLevel): Goal {
    const deliveries: Goal[] = L.stops.map((_, k) => ({ on: "deliver", value: k }));
    return {
        inOrder: [...(L.order === "list" ? deliveries : [{ all: deliveries }]), { on: "finish" }],
    };
}

/** The level's goal sentence, from its stops. */
export function goalWords(L: RoadLevel): string {
    const words = L.stops.map(stopWords);
    const ends = L.labels === "ends" && L.to > 1 ? `Only ${L.from} and ${L.to} are written. ` : "";
    const lane = L.to <= 1 ? `The lane goes from ${L.from} to ${L.to}. ` : "";
    const list =
        L.order === "list"
            ? `Deliver to ${words.join(", then ")}`
            : `Deliver to ${words.slice(0, -1).join(", ")} and ${words.at(-1) ?? ""} in any order`;
    return `${ends}${lane}${list}, then drive through the finish.`;
}

export function start(level: number): RoadState {
    return startRoadLevel(ROAD_LEVELS[level] ?? ROAD_LEVELS[0], level);
}

export function startRoadLevel(L: RoadLevel, level = 0): RoadState {
    return {
        level,
        L,
        x: 4,
        y: laneY(1),
        v: 0,
        reverseWait: 0,
        reversing: false,
        hard: false,
        vy: 0,
        lane: 1,
        boxes: L.boxes.map((b) => ({
            x: placeOf(L, b.at),
            y: laneY(b.lane),
            vx: 0,
            vy: 0,
            spin: 0,
            angle: 0,
            hit: false,
        })),
        cam: { x: ROAD.view.w / 2, y: ROAD.view.h / 2, zoom: 1 },
        still: 0,
        moved: false,
        stop: null,
        stops: 0,
        bumps: 0,
        delivered: L.stops.map(() => false),
        rack: L.stops.length,
        dropped: [],
        hops: [],
        chalks: [],
        goal: track(goalOf(L)),
        said: L.goal,
        steps: 0,
        won: false,
    };
}

/** A value said the way a child would read it off the line: whole numbers, halves on a line in twos, and eighths along a lane from 0 to 1. */
function read(L: RoadLevel, v: number): string {
    if (L.to <= 1) {
        const n = Math.round(v * 8);
        if (n <= 0) return "0";
        if (n >= 8) return "1";
        const d = n % 4 === 0 ? 2 : n % 2 === 0 ? 4 : 8;
        return `${(n * d) / 8}/${d}`;
    }
    return String(L.per >= 2 ? Math.round(v * 2) / 2 : Math.round(v));
}

/** Squares a second squared the brake takes off: full above three squares a second, easing to a third of it, so the car rolls onto its mark rather than snapping to rest. */
const brakeAt = (v: number) => 16 * Math.min(1, 0.35 + (0.65 * v) / 3);

/** How far the car goes from speed `v` with the hand lifted, stepped as `step` steps it. */
export function liftDistance(v: number): number {
    let d = 0;
    for (let u = Math.abs(v); u > 0; u = Math.max(0, u - LIFT * brakeAt(u) * DT)) d += u * DT;
    return d;
}

/** The stop the next rest is judged against: the list's next, or in any order the nearest one left. */
function targetOf(s: RoadState, v: number): number | undefined {
    const open = s.L.stops.map((_, k) => k).filter((k) => !s.delivered[k]);
    if (s.L.order === "list") return open[0];
    return open.sort(
        (a, b) => Math.abs((s.L.stops[a]?.at ?? 0) - v) - Math.abs((s.L.stops[b]?.at ?? 0) - v),
    )[0];
}

function emit(s: RoadState, out: Happening[], event: GameEvent): void {
    feed(s.goal, event);
    out.push({ event });
}

function atRest(s: RoadState, out: Happening[]): void {
    const L = s.L,
        v = valueAt(L, noseOf(s)),
        k = targetOf(s, v);
    s.stops++;
    s.stop = v;
    const stop = k === undefined ? undefined : L.stops[k];
    if (k === undefined || !stop) {
        s.said = "Everything is delivered. Drive on through the finish.";
        return;
    }
    const words = stopWords(stop);
    if (Math.abs(v - stop.at) <= L.bay) {
        if (s.rack <= 0) {
            s.said = `This is ${words}, but the parcel slid off the rack. Go back for it.`;
            out.push({ cue: "nope" });
            return;
        }
        s.delivered[k] = true;
        s.rack--;
        s.hops.push({ k, x: s.x, y: s.y, at: s.steps });
        emit(s, out, { kind: "deliver", value: k });
        // a delivered door is where Back to the checkpoint returns the car to
        emit(s, out, { kind: "checkpoint" });
        out.push(
            { cue: "place" },
            { burst: { kind: "sparkle", x: placeOf(L, stop.at), y: DOORSTEP, n: 10 } },
        );
        const next = targetOf(s, v),
            after = next === undefined ? undefined : L.stops[next],
            left = s.delivered.filter((d) => !d).length;
        s.said = !after
            ? `Delivered to ${words}. That is the last parcel. Drive through the finish.`
            : L.order === "list"
              ? `Delivered to ${words}. Next is ${stopWords(after)}.`
              : `Delivered to ${words}. ${left} to go.`;
        return;
    }
    const otherStop = L.stops.find(
        (st, j) => j !== k && !s.delivered[j] && Math.abs(v - st.at) <= L.bay,
    );
    if (L.order === "list" && otherStop) {
        s.said = `This is ${stopWords(otherStop)}. ${words} comes first on the list.`;
        out.push({ cue: "nope" });
        return;
    }
    const said = read(L, v);
    // a new mark rubs out one close by, so creeping up on a bay leaves one number, not a smudge
    s.chalks = [
        ...s.chalks.filter((c) => Math.abs(c.x - noseOf(s)) > 1.2),
        { x: noseOf(s), text: said },
    ].slice(-4);
    out.push({ cue: "nope" });
    const more = stop.at - v,
        way = more > 0 ? "further on" : "back",
        gap = L.per >= 2 ? Math.round(Math.abs(more) * 2) / 2 : Math.round(Math.abs(more));
    if (v > L.to) s.said = `Stopped past ${L.to}, the end of the line. ${words} is back.`;
    else if (v < L.from) s.said = `Stopped before ${L.from}. ${words} is further on.`;
    else if (L.to <= 1) s.said = `Stopped near ${said}. ${words} is ${way}.`;
    else s.said = `Stopped on ${said}. ${words} is ${gap} ${way}.`;
}

export function step(s: RoadState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    const L = s.L;
    s.steps++;
    for (const d of pad.pressed) {
        if (d === "up") s.lane = Math.max(0, s.lane - 1);
        if (d === "down") s.lane = Math.min(ROAD.lanes - 1, s.lane + 1);
    }
    const going = pad.go || pad.holding.includes("right");
    const braking = !going && (pad.brake || pad.holding.includes("left"));
    if (going) s.reversing = false;
    s.reverseWait = braking && s.v <= 0 ? s.reverseWait + DT : 0;
    const noseWas = noseOf(s);
    if (going && !s.won) {
        if (s.v < 0) s.v = Math.min(0, s.v + 16 * DT);
        else s.v = Math.min(L.top, s.v + L.accel * DT);
    } else if (braking) {
        if (s.v > 0) {
            if (!s.hard && s.v > SLIDE && L.rack && s.rack > 0) {
                // a hard stop throws the front parcel forward, past where the car will come to rest
                s.rack--;
                s.dropped.push({ x: noseOf(s) + liftDistance(s.v) + 1.5, y: s.y });
                s.said = `A parcel slid off the rack at ${read(L, valueAt(L, noseOf(s)))}. Pick it up again.`;
                out.push({ cue: "bump" }, { puff: { x: noseOf(s), y: s.y, n: 5 } });
            }
            if (!s.hard && s.v > 4) out.push({ cue: "creak", strength: Math.min(1, s.v / L.top) });
            // braking hard throws dust from the back tyres, so a skid can be seen as well as felt
            if (s.v > 2 && s.steps % 6 === 0)
                out.push({ burst: { kind: "dust", x: s.x - CAR / 2, y: s.y, n: 2, dir: Math.PI } });
            s.v = Math.max(0, s.v - brakeAt(s.v) * DT);
        } else if (s.reverseWait > 0.45 && !s.won) {
            s.reversing = true;
            s.v = Math.max(-L.top * 0.35, s.v - L.accel * DT);
        }
    } else if (s.v > 0) s.v = Math.max(0, s.v - LIFT * brakeAt(s.v) * DT);
    else if (s.v < 0) s.v = Math.min(0, s.v + 16 * DT);
    s.hard = braking && s.v > 0;
    // Steering is a stiff spring to the lane's middle, so a lane change takes about a third of a second.
    const lane = laneY(s.lane);
    s.vy += ((lane - s.y) * 90 - s.vy * 16) * DT;
    s.y += s.vy * DT;
    s.x += s.v * DT;
    if (s.x < CAR / 2) {
        s.x = CAR / 2;
        s.v = 0;
    }
    const end = worldWidth(L) - 1.5;
    if (s.x > end) {
        s.x = end;
        if (s.v > 1) {
            out.push({ cue: "bump" }, { shake: 0.3 });
            s.bumps++;
        }
        s.v = 0;
    }
    for (const b of s.boxes) {
        if (!b.hit && Math.abs(b.x - s.x) < 1.7 && Math.abs(b.y - s.y) < 1.5) {
            b.hit = true;
            b.vx = s.v + 3;
            b.vy = (b.y >= s.y ? 1 : -1) * 5;
            b.spin = (b.y >= s.y ? 1 : -1) * 6;
            s.v *= 0.45;
            s.bumps++;
            s.said = "A box. It slowed the car down.";
            out.push({ cue: "bump" }, { puff: { x: b.x, y: b.y, n: 7 } }, { shake: 0.35 });
        }
        if (b.hit) {
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            b.angle += b.spin * DT;
            const k = Math.exp(-3 * DT);
            b.vx *= k;
            b.vy *= k;
            b.spin *= k;
        }
    }
    const pick = s.dropped.findIndex(
        (d) => Math.abs(d.x - s.x) < 1.4 && Math.abs(d.y - s.y) < 1.4 && Math.abs(s.v) < 5,
    );
    if (pick >= 0) {
        s.dropped.splice(pick, 1);
        s.rack++;
        s.said = "The parcel is back on the rack.";
        out.push({ cue: "lift" });
    }
    const fx = finishOf(L),
        nose = noseOf(s);
    if (!s.won && noseWas < fx && nose >= fx) {
        const left = s.delivered.filter((d) => !d).length;
        if (left) {
            s.said = `${left} ${left === 1 ? "stop is" : "stops are"} still on the list. The finish waits for them.`;
            out.push({ cue: "nope" });
        } else {
            emit(s, out, { kind: "finish" });
            s.won = done(s.goal);
            s.said = "Every parcel delivered, and through the finish.";
            out.push({ cue: "win" }, { burst: { kind: "sparkle", x: fx, y: s.y, n: 16 } });
        }
    }
    if (Math.abs(s.v) > 0.05) {
        s.moved = true;
        s.still = 0;
        s.stop = null;
    } else if (s.moved) {
        s.still++;
        if (s.still === 12) {
            s.moved = false;
            if (!s.won) atRest(s, out);
        }
    }
    // The camera leads the car by more the faster it goes, and eases rather than jumps.
    s.cam = follow(s.cam, ahead(s), {
        rate: 4,
        dt: DT,
        view: ROAD.view,
        world: { w: worldWidth(L), h: ROAD.view.h },
    });
    return out;
}

const ahead = (s: RoadState): Cam => ({
    ...lead({ x: s.x + 6, y: ROAD.view.h / 2 }, { x: s.v, y: 0 }, 0.55, 8),
    zoom: 1,
});

/** The list card on the dashboard: each stop, ticked when delivered, with an arrow at the next. */
function listCard(s: RoadState): Sprite {
    const L = s.L,
        next = L.order === "list" ? s.delivered.findIndex((d) => !d) : -1;
    return {
        key: "list",
        art: "deliverylist",
        params: {
            items: L.stops.map((st, i) =>
                i > 0 && L.order === "list" ? `then ${stopWords(st)}` : stopWords(st),
            ),
            done: s.delivered.map((d) => (d ? 1 : 0)),
            next,
        },
        x: 0.6 + CARD.w / 2,
        y: 0.4 + (CARD.w / 12) * Math.ceil(2.4 + L.stops.length * 1.3) * 0.5,
        size: CARD.w,
        fixed: true,
        live: true,
        z: 20,
    };
}

export function frame(s: RoadState, rest = false): Frame {
    const L = s.L;
    const W = worldWidth(L);
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    // The road is drawn in pieces so no one drawing is wider than a screen, and each piece is drawn
    // once: a piece is a place, not a thing that moves.
    for (let x0 = 0; x0 < W; x0 += 16) {
        const line = {
            from: L.from,
            to: L.to,
            per: L.per,
            tick: L.tick,
            labels: L.labels,
            start: ROAD.origin,
            end: W - 1,
        };
        sprites.push({
            key: `road:${x0}`,
            art: "arcade.road",
            params: { x0, w: Math.min(16, W - x0), ...line },
            seed: 900 + x0,
            x: x0 + Math.min(16, W - x0) / 2,
            y: ROAD.view.h / 2,
            z: 0,
            still: true,
        });
    }
    for (let x = 2, i = 0; x < W - 4; x += 11, i++) {
        sprites.push({
            key: `firs:${i}`,
            art: "firs",
            params: { count: 2, snow: 0 },
            seed: 50 + i,
            size: 6,
            x: x + (i % 3),
            y: 2.2,
            z: 1,
            still: true,
        });
    }
    sprites.push({
        key: "stand",
        art: "grandstand",
        seed: 5,
        size: 6,
        x: 5,
        y: 18,
        z: 1,
        still: true,
    });
    for (let x = 18, i = 0; x < W - 8; x += 13, i++) {
        sprites.push(
            i % 2
                ? {
                      key: `flowers:${i}`,
                      art: "flowers",
                      params: { count: 3, petals: 5 },
                      seed: 80 + i,
                      size: 5,
                      x,
                      y: 18.1,
                      z: 1,
                      still: true,
                  }
                : {
                      key: `houses:${i}`,
                      art: "houses",
                      params: { count: 2, windows: 2 },
                      seed: 90 + i,
                      size: 4.6,
                      x,
                      y: 18.1,
                      z: 1,
                      still: true,
                  },
        );
    }
    sprites.push({
        key: "finish",
        art: "finishline",
        params: { rows: ROAD.lanes * ROAD.lane },
        size: 1,
        x: finishOf(L) + 0.5,
        y: ROAD.top + (ROAD.lanes * ROAD.lane) / 2,
        z: 1,
        still: true,
    });
    // Each stop's bay across the lanes: drawn where the kerb writes its numbers, and on the harder
    // levels only once it is delivered, since a bay drawn in advance would answer the question.
    for (const [k, st] of L.stops.entries()) {
        const delivered = s.delivered[k] ?? false;
        if (L.labels !== "each" && !delivered) continue;
        const a = placeOf(L, st.at - L.bay),
            b = placeOf(L, st.at + L.bay);
        marks.push({
            kind: "box",
            x: a,
            y: ROAD.top + 0.2,
            w: b - a,
            h: ROAD.lanes * ROAD.lane - 0.4,
            on: delivered,
        });
    }
    const kerb = ROAD.top + ROAD.lanes * ROAD.lane - 0.5;
    for (const c of s.chalks)
        marks.push(
            {
                kind: "line",
                a: { x: c.x, y: kerb - 0.6 },
                b: { x: c.x, y: kerb + 0.3 },
                style: "thin",
            },
            { kind: "word", x: c.x, y: kerb - 1.1, text: c.text, size: 0.5 },
        );
    for (const [i, b] of s.boxes.entries()) {
        sprites.push({
            key: `box:${i}`,
            art: "prop.cube",
            seed: 70 + i,
            crop: { x: 0.05, y: 0.35, w: 2.6, h: 2.6 },
            size: 2.2,
            x: b.x,
            y: b.y,
            angle: b.angle,
            z: 2,
        });
    }
    for (const [i, d] of s.dropped.entries())
        sprites.push({
            key: `dropped:${i}`,
            art: "parcel",
            size: 1.1,
            x: d.x,
            y: d.y,
            angle: 0.3,
            z: 2,
        });
    for (const h of s.hops) {
        const st = L.stops[h.k];
        if (!st) continue;
        const to = { x: placeOf(L, st.at), y: DOORSTEP },
            t = rest ? 1 : Math.min(1, (s.steps - h.at) / (HOP * RATE));
        sprites.push({
            key: `parcel:${h.k}`,
            art: "parcel",
            size: 1.2,
            x: h.x + (to.x - h.x) * t,
            y: h.y + (to.y - h.y) * t - Math.sin(Math.PI * t) * 2.5,
            z: t < 1 ? 5 : 2,
        });
    }
    if (L.ring && s.v > 0.4 && !s.won)
        marks.push({ kind: "ring", x: noseOf(s) + liftDistance(s.v), y: s.y, r: 0.35 });
    const arrow = Math.round((s.v * 0.5) / CAR / 0.25) * 0.25,
        angle = Math.atan2(s.vy, Math.max(4, s.v)) * 0.8;
    sprites.push({
        key: "car",
        art: "racecar",
        params: { vx: arrow, vy: 0 },
        seed: 11,
        x: s.x,
        y: s.y,
        angle,
        z: 3,
    });
    for (let i = 0; i < Math.min(3, s.rack); i++)
        sprites.push({
            key: `rack:${i}`,
            art: "parcel",
            size: 0.6,
            x: s.x - 0.55 + i * 0.5,
            y: s.y,
            angle,
            z: 4,
        });
    sprites.push(listCard(s));
    const world = { w: W, h: ROAD.view.h };
    const camera = rest ? { ...keepInside(ahead(s), ROAD.view, world), zoom: 1 } : { ...s.cam };
    return { sprites, marks, camera, view: { ...ROAD.view }, world };
}

export function say(s: RoadState): string {
    const L = s.L;
    const v = valueAt(L, noseOf(s));
    const speed =
        Math.abs(s.v) < 0.05
            ? "standing still"
            : s.v < 0
              ? "reversing"
              : s.v < L.top * 0.4
                ? "going slowly"
                : s.v < L.top * 0.8
                  ? "going quite fast"
                  : "going as fast as it can";
    const where =
        v < L.from
            ? `before ${L.from}`
            : v > L.to
              ? `past ${L.to}, the end of the line`
              : `at ${read(L, v)}`;
    const lane = ["top", "middle", "bottom"][s.lane] ?? "middle";
    const box = s.boxes.find(
        (b) => !b.hit && b.x > s.x && b.x - s.x < 10 && Math.abs(b.y - laneY(s.lane)) < 1,
    );
    const left = L.stops.filter((_, k) => !s.delivered[k]).map(stopWords);
    return [
        s.said,
        `The car is ${where}, in the ${lane} lane, ${speed}.`,
        box ? "There is a box ahead in this lane." : "",
        s.dropped.length === 1
            ? "A parcel waits in the road."
            : s.dropped.length > 1
              ? `${s.dropped.length} parcels wait in the road.`
              : "",
        s.won
            ? ""
            : left.length
              ? `Still to deliver: ${L.order === "list" ? left.join(", then ") : left.join(", ")}.`
              : "Drive through the finish.",
    ]
        .filter(Boolean)
        .join(" ");
}

/** The road's own sounds: a thump for a parcel on a doorstep, a squeal of brakes, a pick-up and a horn. */
const SOUNDS: Kit = {
    place: [
        { wave: "sine", hz: 140, to: 90, attack: 0.003, decay: 0.12, gain: 0.5 },
        { wave: "noise", hz: 700, attack: 0.002, decay: 0.06, gain: 0.3 },
        { wave: "sine", hz: 660, attack: 0.01, decay: 0.25, gain: 0.25, delay: 0.08 },
    ],
    creak: [{ wave: "sawtooth", hz: 1250, to: 880, attack: 0.02, decay: 0.3, gain: 0.08 }],
    lift: [{ wave: "triangle", hz: 392, to: 523, attack: 0.01, decay: 0.15, gain: 0.35 }],
    win: [
        { wave: "square", hz: 392, attack: 0.01, decay: 0.18, gain: 0.18 },
        { wave: "square", hz: 494, attack: 0.01, decay: 0.18, gain: 0.14 },
        { wave: "square", hz: 392, attack: 0.01, decay: 0.35, gain: 0.18, delay: 0.25 },
        { wave: "square", hz: 494, attack: 0.01, decay: 0.35, gain: 0.14, delay: 0.25 },
    ],
};

function hum(s: RoadState): Hum[] {
    const k = Math.min(1, Math.abs(s.v) / s.L.top);
    return [{ kind: "engine", level: 0.15 + 0.6 * k, pitch: 0.7 + 0.9 * k }];
}

export const roadGame: ActionGame<RoadState> = {
    id: "road",
    title: "The road",
    group: "action",
    seen: "above",
    levels: ROAD_LEVELS,
    rate: RATE,
    cover: { art: "racecar", params: { vx: 3, vy: -1 } },
    hint: "Hold Go, or hold the road, to drive, and let go to slow down and stop. Stop with the front of the car in each bay on the list, then drive through the finish. Hold Brake to stop hard, and keep holding it to reverse. Up and down change lane.",
    controls: {
        arrows: { up: "Lane up", down: "Lane down", left: "Brake", right: "Go" },
        go: "Go",
        brake: "Brake",
    },
    sounds: SOUNDS,
    hum,
    start,
    step,
    frame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    objectives: (s) => progress(s.goal),
    // a press drives for half a second, then the car rolls to rest and its stop is read, as a turn
    still: { press: () => RATE / 2, settling: (s) => Math.abs(s.v) > 0.05 || s.moved },
};
