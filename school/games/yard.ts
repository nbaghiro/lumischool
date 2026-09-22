// Shunting yard: drive the engine along the line and work the lift until the train is in order.
//
// A side view of one straight line with a stop at each end, an engine at the left end of a train of
// numbered carriages, and in the middle a lift over a pit. Dragging the engine drives it, and it
// pushes what it meets and pulls what is hooked to it, at the speed of the hand: carriages that
// meet gently hook on with a clank, and one hit hard is knocked away and rolls on until it stops or
// bumps a stop. The lever beside the pit works the lift: a carriage standing alone on it goes down
// into the pit, on top of any already there, and with the lift clear the top one comes back up. The
// pit is the shunt mechanic's siding, so the last one down is the first one up, and the puzzle is
// the same one: which carriage to put down, and when to bring it back. See .docs/games.md.
//
// Whenever everything is still, the yard is a position the mechanic lists: the carriages on the
// line read left to right are its train, the pit is its siding, and the lift only takes a carriage
// from an end of the train and only gives one back at an end, which is what keeps the yard inside
// the mechanic's graph. The engine never needs to run round, because a carriage on the lift is at
// the right end of the train when the rest stand left of the lift and at the left end when they
// stand right of it, and the engine can push the train across to either side.
import {
    emptyLine,
    groupsOf,
    insert,
    remove,
    step as railStep,
    unhook,
    type Line,
    type Vehicle,
} from "../../engine/motion/rail";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { ACTIVITIES } from "./activities";
import type { ActionGame, ActionLevel } from "./game";
import { CAR, shunt, type ShuntPos, type ShuntVersion } from "./shunt";
import { bind, type Activity, type Round } from "./games";

export interface YardLevel extends ActionLevel {
    v: ShuntVersion;
    /** The round the prover walks: the same versions the mechanic's own activity and the old hands-on levels played. */
    round(): Round;
}

/** The listed activity's versions, restated because its data is not exported; a test holds them to the listed rounds. */
const THREE: ShuntVersion = {
    train: ["3", "1", "2"],
    order: ["1", "2", "3"],
    siding: 2,
    windows: 2,
};
const BACKWARDS: ShuntVersion = {
    train: ["3", "2", "1"],
    order: ["1", "2", "3"],
    siding: 3,
    windows: 2,
};
const FOUR: ShuntVersion = {
    train: ["2", "4", "1", "3"],
    order: ["1", "2", "3", "4"],
    siding: 3,
    windows: 2,
};
const FOUR_TIGHT: ShuntVersion = {
    train: ["3", "1", "4", "2"],
    order: ["1", "2", "3", "4"],
    siding: 2,
    windows: 2,
};
const FIVE: ShuntVersion = {
    train: ["4", "1", "5", "2", "3"],
    order: ["1", "2", "3", "4", "5"],
    siding: 2,
    windows: 2,
};
const SIX: ShuntVersion = {
    train: ["3", "4", "1", "5", "6", "2"],
    order: ["1", "2", "3", "4", "5", "6"],
    siding: 3,
    windows: 2,
};

const more: Activity<ShuntVersion> = {
    id: "shunt.into-order.more",
    title: "Shunting yard",
    kind: "shunt",
    skills: ["ordering", "position.sequence", "planning-ahead"],
    grades: [2, 4],
    paper: "sequence.put-in-order",
    versions: [
        { values: "3 1 4 2, and room for only two", v: FOUR_TIGHT },
        { values: "4 1 5 2 3, five carriages and room for two", v: FIVE },
        { values: "3 4 1 5 6 2, six carriages and room for three", v: SIX },
    ],
};

const goalOf = (v: ShuntVersion): string =>
    `Get the carriages into the order ${v.order.join(", ")}, reading from the left, with the pit empty.`;

function level(
    title: string,
    grades: [number, number],
    v: ShuntVersion,
    round: () => Round,
): YardLevel {
    return { title, grades, goal: goalOf(v), v, round };
}

const listedRound = (i: number): Round => {
    const listed = ACTIVITIES.find((a) => a.kind === "shunt");
    if (!listed) throw new Error("the shunt activity is not listed");
    return listed.round(i);
};

export const YARD_LEVELS: YardLevel[] = [
    level("One carriage out of place", [1, 2], THREE, () => listedRound(0)),
    level("Standing backwards", [1, 3], BACKWARDS, () => listedRound(1)),
    level("Four jumbled, room for three", [2, 3], FOUR, () => listedRound(2)),
    level("Four jumbled, room for two", [2, 4], FOUR_TIGHT, () => bind(shunt, more, 0)),
    level("Five carriages, room for two", [3, 4], FIVE, () => bind(shunt, more, 1)),
    level("Six carriages, room for three", [3, 4], SIX, () => bind(shunt, more, 2)),
];

/** The yard's tuning table. Speeds take hold at once; the lift's time at its next trip. */
export const YARD = {
    couple: knob(
        3.5,
        1,
        8,
        0.5,
        "squares a second",
        "meeting slower than this hooks on with a clank; faster knocks the carriage away",
    ),
    give: knob(
        0.3,
        0,
        1,
        0.05,
        "of the closing speed",
        "how much faster than what hit it a knocked carriage rolls away",
    ),
    rebound: knob(
        0.35,
        0,
        0.9,
        0.05,
        "of its speed",
        "a carriage comes back off a stop with this much",
    ),
    roll: knob(
        2.5,
        0.5,
        8,
        0.5,
        "squares a second each second",
        "a loose carriage slows by this, so a hard knock rolls it a few carriage lengths",
    ),
    brake: knob(
        30,
        5,
        60,
        5,
        "squares a second each second",
        "the engine stops nearly at once when the hand lets go",
    ),
    top: knob(14, 4, 30, 1, "squares a second", "the fastest the engine goes, by finger or key"),
    creep: knob(
        3,
        1,
        6,
        0.5,
        "squares a second",
        "a key held for up to a second and a quarter drives at this, slow enough to hook on",
    ),
    accel: knob(
        8,
        1,
        20,
        0.5,
        "squares a second each second",
        "how fast a key held longer than that winds the engine up",
    ),
    liftTime: knob(0.7, 0.2, 2, 0.1, "seconds", "the lift's trip, one way"),
    reach: knob(
        2,
        0.5,
        3,
        0.25,
        "squares",
        "how far off the lift's middle a carriage may stand and still be on it",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** A vehicle from buffer to buffer: the drawing's box and half a square of coupling. */
export const LEN = CAR + 0.5;
/** Where the rail runs, in squares from the top of the world, with sky above it for a tall window. */
export const RAIL_Y = 42;
/** A carriage's centre sits this far above the rail: its box is five tall and its wheels stand at 4.3. */
const ABOVE = 1.8;
/** The carriage's roof above the rail, which the lever's knob and the order board's sign stand clear of. */
const ROOF = 3.2;
/**
 * The pit and the lift as the `liftpit` drawing lays them out, restated in squares: the pit's width
 * with its earth, the head room between the mouth and the top slot's rail, a slot's height, the
 * floor's thickness and the earth under it, the platform's width, where the gantry's wheels hang
 * and how far apart its cables are. A test holds these to the drawing's own numbers.
 */
export const PIT = {
    w: 11,
    head: 1.2,
    slot: 3.6,
    floor: 0.4,
    under: 1.5,
    platform: 8,
    cable: 3.6,
    gantry: { h: 8, wheel: 1.45 },
} as const;
const PITCH = PIT.slot;
/** The pit's box below the rail, for its count of slots, as the drawing sizes it. */
export const pitHeight = (siding: number): number =>
    Math.ceil(PIT.head + siding * PIT.slot + PIT.floor + PIT.under);
/**
 * The lever as the `yardlever` drawing lays it out, restated in squares: its knob's width, its swing
 * either side of upright, and the base under its pivot; and how far above its feet the pivot is.
 */
export const LEVER = { knob: 2.3, swing: 0.3, base: 1.1 } as const;
export function leverBox(reach: number): { w: number; h: number; pivot: { x: number; y: number } } {
    const w = Math.ceil(2 * (Math.sin(LEVER.swing) * reach + LEVER.knob / 2) + 0.6),
        h = Math.ceil(reach + LEVER.base + LEVER.knob / 2 + 0.3);
    return { w, h, pivot: { x: w / 2, y: h - LEVER.base + 0.2 } };
}
/** How far the lever's feet stand below the rail, on the ground behind the line, and how far the order board's do. */
const FEET = 0.4;
/** How far the hand may run ahead of an engine that cannot follow before the hand is taken to be where the engine is. */
const LEAD = 2;
/** Seconds the engine takes to close on where the hand is, so its speed is the hand's and a jitter is not a lurch. */
const FOLLOW = 0.08;
const STOP = 0.02;

export interface Geometry {
    w: number;
    /** The world's height: the sky over the rail, and the pit's box under it. */
    h: number;
    /** The lift's middle. */
    xJ: number;
    /** The lever's foot, which stands behind the line to the right of the pit's earth, clear of the gantry. */
    xL: number;
    ends: [number, number];
}

/**
 * The yard for a train of `n` with a pit for `siding`: room left of the lift for the engine and the
 * whole train to stand clear of it with a carriage's length to spare, room right of it for all but
 * one carriage and a knock's roll, and a pit deep enough.
 */
export function geometry(n: number, siding: number): Geometry {
    const xJ = Math.ceil(LEN * (n + 1) + 6.75);
    const w = Math.ceil(xJ + LEN * (n - 0.5) + 3.5);
    return { w, h: RAIL_Y + pitHeight(siding) + 1, xJ, xL: xJ + PIT.w / 2 + 3.6, ends: [1, w - 1] };
}

/** The rail a carriage in pit slot `k` (nought at the bottom) stands on. */
export const slotRail = (siding: number, k: number): number =>
    RAIL_Y + PIT.head + (siding - k) * PITCH;

/**
 * The lever drawn for a yard: its knob wide enough to press at 1024 wide at this level's square,
 * four squares on the two widest yards, and its reach long enough that the knob stands clear over
 * the roof of a carriage beside it; the size the drawing is placed at, and where its knob is.
 */
export function leverOf(g: Geometry): {
    knob: number;
    reach: number;
    size: number;
    box: { w: number; h: number };
    at: { x: number; y: number };
} {
    const knob = g.w >= 65 ? 4 : g.w >= 55 ? 3 : 2.5,
        scale = knob / LEVER.knob;
    const reach =
        Math.round(
            (((FEET + ROOF + knob / 2 + 0.5) / scale - LEVER.base + 0.2) / Math.cos(LEVER.swing)) *
                4,
        ) / 4;
    const box = leverBox(reach),
        left = g.xL - (box.w * scale) / 2,
        top = RAIL_Y + FEET - box.h * scale;
    const at = {
        x: left + (box.pivot.x - Math.sin(LEVER.swing) * reach) * scale,
        y: top + (box.pivot.y - Math.cos(LEVER.swing) * reach) * scale,
    };
    return { knob, reach, size: box.w * scale, box, at };
}

interface Lift {
    car: string;
    dir: "down" | "up";
    /** Nought to one along the trip. */
    t: number;
    /** Where along the line it goes down from, or comes up at. */
    x: number;
    /** Its slot in the pit. */
    slot: number;
}

interface Hand {
    sx: number;
    sy: number;
    /** The engine's place when the hand came down, so the engine moves by what the hand moves. */
    x0: number;
    tx: number;
    moved: boolean;
}

export interface YardState {
    level: number;
    L: YardLevel;
    v: ShuntVersion;
    g: Geometry;
    line: Line;
    /** The siding: the carriage at the bottom of the pit first, the one on top last. */
    pit: string[];
    lift: Lift | null;
    /** Which end of the train the lift last worked, for the mechanic's position when the train stands both sides of it. */
    end: ShuntPos["end"];
    hand: Hand | null;
    /** How long a key has been held, in seconds, which is what sets the keys' speed. */
    held: number;
    driven: boolean;
    leverAt: number;
    flash: { x: number; until: number } | null;
    steps: number;
    /** Every vehicle's speed at the end of the last step, which is what a bump against a stop is judged by. */
    wasV: Record<string, number>;
    lastKnock: number;
    said: string;
    saidAt: number;
    touched: boolean;
    won: boolean;
    wonAt: number;
}

const carOf = (id: string, x: number): Vehicle => ({
    id,
    x,
    v: 0,
    length: LEN,
    mass: 1,
    slows: YARD.roll.value,
});

export function start(level: number): YardState {
    const L = YARD_LEVELS[level] ?? YARD_LEVELS[0];
    if (!L) throw new Error("no yard levels");
    const v = L.v,
        g = geometry(v.train.length, v.siding),
        line = emptyLine();
    const x0 = g.ends[0] + 0.5 + LEN / 2;
    insert(line, { id: "loco", x: x0, v: 0, length: LEN, mass: 3, slows: YARD.brake.value });
    v.train.forEach((car, i) => insert(line, carOf(car, x0 + LEN * (i + 1))));
    for (let i = 0; i < line.hooked.length - 1; i++) line.hooked[i] = true;
    return {
        level,
        L,
        v,
        g,
        line,
        pit: [],
        lift: null,
        end: "right",
        hand: null,
        held: 0,
        driven: false,
        leverAt: -999,
        flash: null,
        steps: 0,
        wasV: {},
        lastKnock: -99,
        said: "",
        saidAt: -999,
        touched: false,
        won: false,
        wonAt: -1,
    };
}

function tell(s: YardState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const loco = (s: YardState): Vehicle => {
    const l = s.line.vehicles.find((x) => x.id === "loco");
    if (!l) throw new Error("the engine has left the line");
    return l;
};

/** The carriages on the line, left to right. */
export const carriages = (s: YardState): Vehicle[] =>
    s.line.vehicles.filter((x) => x.id !== "loco");

/** Which sides of the lift the carriages stand on, leaving out `except`. */
function sides(s: YardState, except: Vehicle | null): { left: boolean; right: boolean } {
    const cs = carriages(s).filter((c) => c !== except);
    return { left: cs.some((c) => c.x < s.g.xJ - 0.1), right: cs.some((c) => c.x > s.g.xJ + 0.1) };
}

/** The mechanic's position the yard stands in, which is only meant when nothing is moving. */
export function positionOf(s: YardState): ShuntPos {
    const sd = sides(s, null);
    const end: ShuntPos["end"] =
        sd.left && sd.right ? s.end : sd.right ? "left" : sd.left ? "right" : s.end;
    return { line: carriages(s).map((c) => c.id), spur: [...s.pit], end };
}

export const moving = (s: YardState): boolean =>
    s.lift !== null || s.line.vehicles.some((x) => Math.abs(x.v) > STOP);

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function refuse(s: YardState, out: Happening[], why: string, at?: Vehicle): void {
    out.push({ cue: "nope" });
    tell(s, why);
    if (at) s.flash = { x: at.x, until: s.steps + Math.round(RATE * 0.8) };
}

/** Works the lift: a carriage standing alone on it goes down, or with the lift clear the top of the pit comes up. */
export function pressLever(s: YardState, out: Happening[]): boolean {
    s.leverAt = s.steps;
    s.touched = true;
    const { xJ } = s.g,
        reach = YARD.reach.value;
    if (s.lift) {
        refuse(s, out, "The lift is on its way.");
        return false;
    }
    const on = s.line.vehicles.filter((x) => Math.abs(x.x - xJ) <= reach);
    const over = s.line.vehicles.filter(
        (x) =>
            !on.includes(x) &&
            x.x + LEN / 2 > xJ - LEN / 2 + 0.05 &&
            x.x - LEN / 2 < xJ + LEN / 2 - 0.05,
    );
    if (on.length === 0) {
        const partly = over[0];
        if (partly) {
            refuse(
                s,
                out,
                partly.id === "loco"
                    ? "The engine is partly on the lift."
                    : `${partly.id} is partly on the lift. It has to stand right on it, or clear of it.`,
                partly,
            );
            return false;
        }
        const car = s.pit[s.pit.length - 1];
        if (car === undefined) {
            refuse(s, out, "Nothing is on the lift, and nothing is down in the pit.");
            return false;
        }
        const sd = sides(s, null);
        if (sd.left && sd.right) {
            refuse(
                s,
                out,
                "Carriages stand on both sides of the lift, so the one coming up would be in the middle of the train.",
            );
            return false;
        }
        s.pit.pop();
        s.end = sd.right ? "left" : "right";
        s.lift = { car, dir: "up", t: 0, x: xJ, slot: s.pit.length };
        out.push({ cue: "lift" });
        tell(s, `${car} is coming up.`);
        return true;
    }
    const one = on[0];
    if (on.length > 1 || !one) {
        refuse(s, out, "The lift takes one carriage at a time.", on[1]);
        return false;
    }
    if (one.id === "loco") {
        refuse(s, out, "The lift takes a carriage, not the engine.", one);
        return false;
    }
    if (s.pit.length >= s.v.siding) {
        refuse(s, out, `The pit is full. It holds ${s.v.siding}.`, one);
        return false;
    }
    const sd = sides(s, one);
    if (sd.left && sd.right) {
        refuse(
            s,
            out,
            `${one.id} is in the middle of the train. The lift takes a carriage from an end.`,
            one,
        );
        return false;
    }
    const i = s.line.vehicles.indexOf(one);
    if (i > 0) unhook(s.line, i - 1);
    unhook(s.line, i);
    remove(s.line, one.id);
    s.end = sd.right ? "left" : "right";
    s.lift = { car: one.id, dir: "down", t: 0, x: one.x, slot: s.pit.length };
    out.push({ cue: "lift" });
    tell(s, `${one.id} is going down.`);
    return true;
}

/** Lifts the hook between the engine and whatever it is hooked to. */
export function letGo(s: YardState, out: Happening[]): boolean {
    const i = s.line.vehicles.findIndex((x) => x.id === "loco");
    const left = i > 0 && unhook(s.line, i - 1),
        right = unhook(s.line, i);
    if (!left && !right) {
        refuse(s, out, "The engine is not hooked to anything.");
        return false;
    }
    s.touched = true;
    out.push({ cue: "lift" });
    tell(s, "The engine let go.");
    return true;
}

/** The hooks between neighbours, by the pair's index, where they are drawn. */
function hooks(s: YardState): { i: number; x: number }[] {
    const out: { i: number; x: number }[] = [];
    s.line.vehicles.forEach((a, i) => {
        const b = s.line.vehicles[i + 1];
        if (b && s.line.hooked[i])
            out.push({ i, x: (a.x + a.length / 2 + b.x - b.length / 2) / 2 });
    });
    return out;
}

/** Whether a press at `p` is on the lever: its knob, with a little round it, or its arm and base. */
export function onLever(g: Geometry, p: { x: number; y: number }): boolean {
    const l = leverOf(g);
    if (Math.hypot(p.x - l.at.x, p.y - l.at.y) <= l.knob / 2 + 0.6) return true;
    return Math.abs(p.x - g.xL) <= 1.6 && p.y >= l.at.y && p.y <= RAIL_Y + FEET + 0.5;
}

function tap(s: YardState, p: { x: number; y: number }, out: Happening[]): void {
    // A hook is the smaller target, so it is looked for first where the two could overlap.
    const hook = hooks(s).find(
        (h) => Math.abs(p.x - h.x) <= 1.9 && Math.abs(p.y - (RAIL_Y - 0.9)) <= 1.9,
    );
    if (hook) {
        const a = s.line.vehicles[hook.i],
            b = s.line.vehicles[hook.i + 1];
        unhook(s.line, hook.i);
        s.touched = true;
        out.push({ cue: "lift" });
        tell(s, `The hook is off between ${a?.id === "loco" ? "the engine" : a?.id} and ${b?.id}.`);
        return;
    }
    if (onLever(s.g, p)) pressLever(s, out);
}

function hands(s: YardState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        s.hand ??= { sx: t.x, sy: t.y, x0: loco(s).x, tx: t.x, moved: false };
        const h = s.hand;
        h.tx = t.x;
        if (!h.moved && Math.hypot(t.x - h.sx, t.y - h.sy) > 0.6) {
            // The engine follows from here, so the travel that told a drag from a tap is not a lurch.
            h.moved = true;
            h.sx = t.x;
            h.x0 = loco(s).x;
            s.touched = true;
        }
        if (h.moved) {
            const l = loco(s),
                target = h.x0 + (t.x - h.sx);
            l.v = clamp((target - l.x) / FOLLOW, -YARD.top.value, YARD.top.value);
            s.driven = true;
        }
    }
    if (pad.lifted) {
        // A press and its lift can land in one step, which is a tap as much as one that was seen held.
        if (!s.hand || !s.hand.moved) tap(s, pad.lifted, out);
        s.hand = null;
    }
}

/** The keys' speed after `t` seconds of key: a quick rise to a creep, held for a while, then winding up to the top. */
export function windUp(t: number): number {
    const creep = YARD.creep.value;
    if (t < 0.25) return (creep * t) / 0.25;
    if (t < 1.25) return creep;
    return Math.min(YARD.top.value, creep + (t - 1.25) * YARD.accel.value);
}

function keys(s: YardState, pad: Pad, out: Happening[]): void {
    if (pad.touch) return;
    const way = [...pad.holding].reverse().find((d) => d === "left" || d === "right");
    const dir = way === "right" ? 1 : way === "left" ? -1 : 0;
    if (dir) {
        const l = loco(s);
        if (Math.sign(l.v) !== dir) s.held = 0;
        s.held += DT;
        l.v = dir * windUp(s.held);
        s.driven = true;
        s.touched = true;
    } else s.held = 0;
    if (pad.pressed.some((d) => d === "up" || d === "down")) letGo(s, out);
    if (pad.tapped) pressLever(s, out);
}

function finishLift(s: YardState, out: Happening[]): void {
    const lift = s.lift;
    if (!lift) return;
    s.lift = null;
    if (lift.dir === "down") {
        s.pit.push(lift.car);
        out.push({ cue: "place" });
        tell(
            s,
            s.pit.length === 1
                ? `${lift.car} is down in the pit.`
                : `${lift.car} is down in the pit, on top of ${s.pit[s.pit.length - 2]}.`,
        );
    } else {
        insert(s.line, carOf(lift.car, s.g.xJ));
        out.push({ cue: "place" });
        tell(s, `${lift.car} is up on the line.`);
    }
}

export function step(s: YardState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.driven = false;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    const lift = s.lift;
    if (lift) {
        lift.t = Math.min(1, lift.t + DT / YARD.liftTime.value);
        if (lift.t >= 1) finishLift(s, out);
    }
    const gaps: [number, number][] = s.lift ? [[s.lift.x - LEN / 2, s.lift.x + LEN / 2]] : [];
    const l = loco(s);
    l.slows = YARD.brake.value;
    for (const c of carriages(s)) c.slows = YARD.roll.value;
    const events = railStep(
        s.line,
        DT,
        {
            ends: s.g.ends,
            gaps,
            couple: YARD.couple.value,
            give: YARD.give.value,
            rebound: YARD.rebound.value,
        },
        s.driven ? "loco" : null,
    );
    const h = s.hand;
    if (h?.moved) {
        const lead = h.x0 + (h.tx - h.sx) - l.x;
        if (Math.abs(lead) > LEAD) h.x0 -= lead - Math.sign(lead) * LEAD;
    }
    for (const e of events) {
        const name = (id: string) => (id === "loco" ? "The engine" : id);
        if (e.kind === "couple") {
            out.push({ cue: "place" });
            tell(s, `${name(e.left)} hooked on to ${e.right}.`);
        } else if (e.kind === "knock") {
            if (s.steps - s.lastKnock > 8) {
                s.lastKnock = s.steps;
                out.push({ cue: "bump" });
                const hit = s.line.vehicles.find((x) => x.id === e.right);
                if (hit) out.push({ puff: { x: hit.x - LEN / 2, y: RAIL_Y - 0.4, n: 4 } });
                tell(s, `Too fast. ${name(e.left)} knocked ${e.right} on.`);
            }
        } else if (e.kind === "stop" && s.steps - s.lastKnock > 8) {
            // Judged by how fast it was really going, since a hand held against the stop asks for more speed every step.
            const speed = Math.abs(s.wasV[e.id] ?? 0);
            if (speed > 1) {
                s.lastKnock = s.steps;
                out.push({ cue: speed > 6 ? "crash" : "bump" });
                const at = s.line.vehicles.find((x) => x.id === e.id);
                if (at) out.push({ puff: { x: at.x, y: RAIL_Y - 0.4, n: 3 } });
                tell(s, `${name(e.id)} bumped the stop.`);
            }
        }
    }
    s.wasV = {};
    for (const x of s.line.vehicles) s.wasV[x.id] = x.v;
    if (s.flash && s.steps >= s.flash.until) s.flash = null;
    if (!s.won && !s.pit.length && !moving(s)) {
        const now = carriages(s).map((c) => c.id);
        if (now.join() === s.v.order.join()) {
            s.won = true;
            s.wonAt = s.steps;
            s.hand = null;
            tell(s, `${now.join(", ")}. The train is in order.`);
            out.push({ cue: "ring" });
            for (const c of carriages(s))
                out.push({ burst: { kind: "sparkle", x: c.x, y: RAIL_Y - 2.6, n: 6 } });
        }
    }
    if (s.won && s.steps - s.wonAt === Math.round(RATE * 0.6)) out.push({ cue: "win" });
    return out;
}

const list = (xs: string[]): string =>
    xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? "nothing");

export function say(s: YardState): string {
    const cs = carriages(s),
        ids = cs.map((c) => c.id),
        i = s.line.vehicles.findIndex((x) => x.id === "loco");
    const engine =
        i === 0
            ? "The engine is at the left end"
            : i === s.line.vehicles.length - 1
              ? "The engine is at the right end"
              : `The engine stands between ${s.line.vehicles[i - 1]?.id} and ${s.line.vehicles[i + 1]?.id}`;
    const hooked = groupsOf(s.line)
        .filter(([a, b]) => b > a)
        .map(([a, b]) =>
            s.line.vehicles
                .slice(a, b + 1)
                .map((x) => (x.id === "loco" ? "the engine" : x.id))
                .join(" to "),
        );
    const pit = s.pit.length
        ? `Down in the pit: ${list(s.pit)}, with ${s.pit[s.pit.length - 1]} on top.`
        : "The pit is empty.";
    const lift = s.lift ? `${s.lift.car} is on the lift, going ${s.lift.dir}.` : "";
    return [
        s.said,
        ids.length
            ? `On the line, reading from the left: ${list(ids)}.`
            : "No carriage is on the line.",
        `${engine}${hooked.length ? `, and the hooks join ${list(hooked)}` : ", and nothing is hooked together"}.`,
        pit,
        lift,
        `The lift is at the middle of the line, with its lever beside the pit.`,
        `It has to end up ${s.v.order.join(", ")}.`,
    ]
        .filter(Boolean)
        .join(" ");
}

const PROMPT = "Drag the engine along the line, gently. The lever beside the pit works the lift.";

export function note(s: YardState): string {
    if (!s.touched && !s.won) return PROMPT;
    return s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "";
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (1 - t) ** 2 * 2);

/** How much the lever leans over, from nought at rest to one pulled, for a moment after it is pressed, in five steps so the drawing is drawn again few times. */
const pulledAt = (s: YardState, rest: boolean): number => {
    const since = (s.steps - s.leverAt) / RATE;
    if (rest || since >= 0.4) return 0;
    return Math.round(Math.sin((since / 0.4) * Math.PI) * 4) / 4;
};

export function frame(s: YardState, rest = false): Frame {
    const g = s.g,
        v = s.v,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        n = v.order.length;
    const boardScale = Math.max(1, g.w / 60),
        boardW = Math.ceil(n * 3.1 + 2.6);
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 21,
            size: 6,
            x: g.w * 0.35,
            y: RAIL_Y - 16,
            z: 0,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 22,
            size: 5,
            x: g.w * 0.78,
            y: RAIL_Y - 13,
            z: 0,
            still: true,
        },
        {
            key: "cloud:2",
            art: "cloud",
            params: { puffs: 5, rain: 0 },
            seed: 23,
            size: 7,
            x: g.w * 0.55,
            y: RAIL_Y - 26,
            z: 0,
            still: true,
        },
        {
            key: "cloud:3",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 24,
            size: 6,
            x: g.w * 0.15,
            y: RAIL_Y - 33,
            z: 0,
            still: true,
        },
        {
            key: "cloud:4",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 25,
            size: 5,
            x: g.w * 0.9,
            y: RAIL_Y - 21,
            z: 0,
            still: true,
        },
        {
            key: "firs",
            art: "firs",
            params: { count: 2, snow: 0 },
            seed: 26,
            size: 5,
            x: 6,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0,
            still: true,
        },
        {
            key: "hedge",
            art: "hedge",
            params: { clumps: 3, berries: 3, gap: 0 },
            seed: 27,
            size: 6,
            x: g.xL - 1,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0,
            still: true,
        },
        {
            key: `signal:${s.won ? "go" : "stop"}`,
            art: "railsignal",
            params: { arm: s.won ? 1 : 0, barrier: 0, crossing: 0 },
            seed: 29,
            size: 4,
            x: g.w - 2.5,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0.5,
            still: true,
        },
        {
            key: "board",
            art: "orderboard",
            params: { order: v.order, title: "Make up the train", done: s.won ? 1 : 0 },
            seed: 30,
            size: boardW * boardScale,
            x: 0.6 + (boardW * boardScale) / 2,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0.5,
            still: true,
        },
        {
            key: "railway",
            art: "railway",
            params: { length: g.w, gap: PIT.w, at: g.xJ - PIT.w / 2 },
            seed: 31,
            x: g.w / 2,
            y: RAIL_Y + 1.5,
            z: 1,
            still: true,
        },
        {
            key: "pit",
            art: "liftpit",
            params: { part: "pit", slots: v.siding },
            seed: 30,
            x: g.xJ,
            y: RAIL_Y + pitHeight(v.siding) / 2,
            z: 1.2,
            still: true,
        },
        {
            key: "gantry",
            art: "liftpit",
            params: { part: "gantry", slots: v.siding },
            seed: 31,
            x: g.xJ,
            y: RAIL_Y + FEET,
            stand: true,
            z: 1.4,
            still: true,
        },
        {
            key: "stop:left",
            art: "bufferstop",
            params: { facing: 1 },
            seed: 32,
            x: g.ends[0] - 1.42,
            y: RAIL_Y + 0.5,
            stand: true,
            z: 2,
            still: true,
        },
        {
            key: "stop:right",
            art: "bufferstop",
            params: { facing: -1 },
            seed: 33,
            x: g.ends[1] + 1.42,
            y: RAIL_Y + 0.5,
            stand: true,
            z: 2,
            still: true,
        },
    );
    // The tree stands between the lever and the signal where the yard has room for it, which a train of three has not.
    if (g.xL + 12.25 < g.w)
        sprites.push({
            key: "tree",
            art: "tree",
            params: { fruit: 0, fallen: 0, item: "apple" },
            seed: 28,
            size: 4.5,
            x: g.xL + 5.5,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0,
            still: true,
        });
    if (g.w >= 65)
        sprites.push({
            key: "firs:right",
            art: "firs",
            params: { count: 3, snow: 0 },
            seed: 32,
            size: 7,
            x: g.w - 12,
            y: RAIL_Y + FEET,
            stand: true,
            z: 0,
            still: true,
        });
    // The platform in the gap, on its cables from the gantry's wheels, going down with a carriage and coming back.
    const lift = s.lift,
        e = lift ? ease(lift.t) : 0;
    const lx = lift ? (lift.dir === "down" ? lift.x + (g.xJ - lift.x) * e : g.xJ) : g.xJ;
    const dy = lift
        ? ease(lift.dir === "down" ? lift.t : 1 - lift.t) * (slotRail(v.siding, lift.slot) - RAIL_Y)
        : 0;
    sprites.push({
        key: "platform",
        art: "liftpit",
        params: { part: "platform", slots: v.siding },
        seed: 34,
        x: lx,
        y: RAIL_Y + dy + 0.2,
        z: 2.2,
    });
    for (const side of [-1, 1]) {
        marks.push({
            kind: "line",
            a: {
                x: g.xJ + side * PIT.cable,
                y: RAIL_Y + FEET - PIT.gantry.h + PIT.gantry.wheel + 0.5,
            },
            b: { x: lx + side * PIT.cable, y: RAIL_Y + dy + 0.25 },
            style: "thin",
        });
    }
    const lever = leverOf(g);
    sprites.push({
        key: "lever",
        art: "yardlever",
        params: { pulled: pulledAt(s, rest), reach: lever.reach },
        seed: 35,
        size: lever.size,
        x: g.xL,
        y: RAIL_Y + FEET,
        stand: true,
        z: 1.6,
        live: true,
    });
    for (const x of s.line.vehicles) {
        if (x.id === "loco")
            sprites.push({
                key: "loco",
                art: "loco",
                params: { facing: 1 },
                seed: 11,
                x: x.x,
                y: RAIL_Y - ABOVE,
                z: 3,
            });
        else
            sprites.push({
                key: `car:${x.id}`,
                art: "carriage",
                params: { label: x.id, windows: v.windows },
                seed: 300 + Number(x.id),
                x: x.x,
                y: RAIL_Y - ABOVE,
                z: 3,
            });
    }
    // A coupling between neighbours: closed where they are hooked, open where they stand together unhooked.
    s.line.vehicles.forEach((a, i) => {
        const b = s.line.vehicles[i + 1];
        if (!b) return;
        const gap = b.x - b.length / 2 - (a.x + a.length / 2),
            hooked = s.line.hooked[i] === true;
        if (!hooked && gap > 0.35) return;
        sprites.push({
            key: `hook:${a.id}:${b.id}`,
            art: "coupling",
            params: { closed: hooked ? 1 : 0 },
            seed: 36,
            size: 1.5,
            x: (a.x + a.length / 2 + b.x - b.length / 2) / 2,
            y: RAIL_Y - 0.9,
            z: 4,
        });
    });
    s.pit.forEach((car, k) => {
        sprites.push({
            key: `car:${car}`,
            art: "carriage",
            params: { label: car, windows: v.windows },
            seed: 300 + Number(car),
            x: g.xJ,
            y: slotRail(v.siding, k) - ABOVE,
            z: 1.5,
        });
    });
    if (lift) {
        const from = lift.dir === "down" ? RAIL_Y : slotRail(v.siding, lift.slot),
            to = lift.dir === "down" ? slotRail(v.siding, lift.slot) : RAIL_Y;
        sprites.push({
            key: `car:${lift.car}`,
            art: "carriage",
            params: { label: lift.car, windows: v.windows },
            seed: 300 + Number(lift.car),
            x: lx,
            y: from + (to - from) * e - ABOVE,
            z: 2.5,
        });
    }
    if (s.flash) marks.push({ kind: "ring", x: s.flash.x, y: RAIL_Y - ABOVE, r: 3.4, on: true });
    if (!s.touched && !s.won)
        marks.push({ kind: "ring", x: lever.at.x, y: lever.at.y, r: lever.knob / 2 + 0.5 });
    // The view is the yard, from the board's sign to the pit's floor; the world has sky over it for a tall window.
    const view = { w: g.w, h: Math.ceil(12 * boardScale + pitHeight(v.siding) + 1) };
    return {
        sprites,
        marks,
        camera: { x: g.w / 2, y: RAIL_Y - 1 },
        view,
        world: { w: g.w, h: g.h },
    };
}

export const yardGame: ActionGame<YardState> = {
    id: "shunt",
    title: "Shunting yard",
    group: "action",
    levels: YARD_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    plays: { activity: "shunt.into-order", levels: [0, 1, 2] },
    cover: { art: "carriage", params: { label: "3", windows: 2 } },
    hint: "Drag the engine along the line, tap the lever to work the lift and tap a hook to let go, or drive with left and right, work the lift with space and let go with down",
    controls: {},
    start,
    step,
    frame,
    say,
    note,
    tuning: YARD,
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE * 0.67),
        settling: (s) => (s.won ? s.steps - s.wonAt < RATE : moving(s)),
    },
};
