// The see-saw: stand bags on a plank until it is level.
//
// A suitcase stands on one side of a plank on a pivot, and the child carries bags up from the grass
// and stands them on its steps. The plank rests at a lean that grows with how far out of balance it
// is, swinging past and settling each time a bag lands or is lifted, so heavier, lighter and nearly
// level can all be seen. At the first levels every bag stands on the suitcase's step, and the game is
// making the suitcase's weight out of bags, which is bonds and adding. Later the steps are free, and
// a bag further out turns the plank more, which is the see-saw rule and the times tables as a fact
// about a plank. A bag let go anywhere but a step lands on the grass and walks back. See
// .docs/games.md.
import { flightAt, lob } from "../../engine/motion/flight";
import type { Pt } from "../../engine/motion/geometry";
import {
    knock,
    lean,
    onPlank,
    swingTo,
    turning,
    type Load,
    type Tilt,
} from "../../engine/motion/lever";
import { HANGING, sway, type Sway } from "../../engine/motion/sway";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface SeesawLevel extends ActionLevel {
    /** The suitcase: its kilograms and its step, less than nought on the left. */
    load: { kg: number; at: number };
    /** The bags on the grass, in kilograms. */
    bags: number[];
    /** The steps a bag may stand on. */
    open: number[];
    /** The most bags one side of the plank takes. */
    most: number;
    /** Whether the kilograms on each step are written over it. */
    totals: boolean;
    /** The line over the field until the first bag is picked up. */
    prompt: string;
}

export const SEESAW_LEVELS: Levels<SeesawLevel> = [
    {
        title: "Seven kilograms",
        grades: [1, 1],
        goal: "Make the plank level. The suitcase weighs 7 kilograms.",
        prompt: "Stand bags on the right until the plank is level.",
        load: { kg: 7, at: -3 },
        bags: [1, 2, 3, 4, 5],
        open: [3],
        most: 5,
        totals: true,
    },
    {
        title: "Ten, in two bags",
        grades: [1, 2],
        goal: "Make the plank level with two bags. The suitcase weighs 10 kilograms.",
        prompt: "Two bags on the right make the plank level.",
        load: { kg: 10, at: -3 },
        bags: [1, 2, 3, 4, 6, 8],
        open: [3],
        most: 2,
        totals: true,
    },
    {
        title: "Both sides",
        grades: [2, 2],
        goal: "Make the plank level. Bags can go on either side.",
        prompt: "Bags can stand on the left with the suitcase too.",
        load: { kg: 9, at: -2 },
        bags: [2, 3, 4, 5, 7],
        open: [-2, 2],
        most: 3,
        totals: true,
    },
    {
        title: "Further out",
        grades: [3, 3],
        goal: "Make the plank level with one bag. A bag further out turns the plank more.",
        prompt: "One bag, on any step on the right.",
        load: { kg: 6, at: -2 },
        bags: [2, 3, 4, 5],
        open: [1, 2, 3, 4, 5],
        most: 1,
        totals: false,
    },
    {
        title: "Two to balance",
        grades: [3, 4],
        goal: "Make the plank level. No one bag can do it, so use two.",
        prompt: "No one bag does it on its own.",
        load: { kg: 5, at: -4 },
        bags: [3, 6, 7],
        open: [1, 2, 3, 4, 5],
        most: 2,
        totals: false,
    },
    {
        title: "Either side, any step",
        grades: [4, 4],
        goal: "Make the plank level. Bags can go on any step, on either side.",
        prompt: "Any step, either side, two bags a side at most.",
        load: { kg: 4, at: -5 },
        bags: [1, 3, 5, 8],
        open: [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5],
        most: 2,
        totals: false,
    },
];

/** The see-saw's tuning table. */
export const SEESAW = {
    lean: knob(
        0.03,
        0.01,
        0.08,
        0.005,
        "radians for a difference of one",
        "one kilogram one step out already shows, and a big difference still leaves room to swing",
    ),
    most: knob(
        0.26,
        0.1,
        0.36,
        0.02,
        "radians",
        "the furthest it rests, short of an end meeting the grass",
    ),
    stiffness: knob(
        34,
        10,
        80,
        2,
        "a second squared",
        "a swing slow enough to watch, quick enough not to wait for",
    ),
    damping: knob(3.6, 1, 10, 0.2, "a second", "two or three swings past level before it settles"),
    fall: knob(46, 20, 80, 2, "squares a second, each second", "a bag drops with weight"),
    knock: knob(
        0.0035,
        0,
        0.01,
        0.0005,
        "radians a second for a kilogram a step out landing at a square a second",
        "a heavy bag far out knocks the plank hard",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
export const STEPS = 5,
    GAP = 4;
/** In squares. The fulcrum stands on the far grass drawn 1.5 times its box, and its pin is 0.3 of a square under its top. */
export const FIELD = {
    world: { w: 52, h: 32 },
    view: { w: 46, h: 27 },
    ground: 22,
    front: 29.4,
    fulcrum: 4.5,
} as const;
const K = FIELD.fulcrum / 3;
export const PIVOT: Pt = { x: FIELD.world.w / 2, y: FIELD.ground - 6 * K + 0.3 * K };
/** The plank's top is this far over its pivot line, and the drawing's middle this far under it. */
export const PLANK = { top: 0.38, middle: 0.5 } as const;
const HANDLE = 0.45;

/** A bag as the masses drawing draws it, in squares: its width and its body's height. */
export const bagSize = (kg: number): { w: number; h: number } => {
    const r = Math.cbrt(kg);
    return { w: 1.45 + 1.75 * r, h: 1.4 + 1.4 * r };
};

function bagArt(kg: number): {
    art: string;
    params: Record<string, unknown>;
    crop: { x: number; y: number; w: number; h: number };
} {
    const { w, h } = bagSize(kg),
        top = 6.6 - h;
    return {
        art: "masses",
        params: { masses: [kg * 1000] },
        crop: { x: 0.32, y: top - HANDLE - 0.14, w: w + 0.36, h: h + HANDLE + 0.26 },
    };
}

type Where = "store" | "held" | "air" | "plank" | "home";

interface Bag {
    kg: number;
    /** Where its foot stands on the grass when it is not in use. */
    home: number;
    on: Where;
    /** The step it stands on, or is falling to; nought for the grass. */
    at: number;
    /** When it was stood on the plank, which is its place in a stack. */
    seq: number;
    foot: Pt;
    v: Pt;
    angle: number;
    sway: Sway;
    squash: number;
    bounces: number;
}

export interface SeesawState {
    level: number;
    L: SeesawLevel;
    bags: Bag[];
    tilt: Tilt;
    /** Where the finger, or the keyboard's hand, holds a bag from. */
    hand: Pt | null;
    handV: Pt;
    handA: number;
    held: number;
    /** The keyboard's place: choosing a bag, or choosing where the held one goes. */
    cursor: { mode: "pick" | "place"; i: number } | null;
    seq: number;
    steps: number;
    still: number;
    said: string;
    saidAt: number;
    touched: boolean;
    /** Set when a bag lands or leaves, and read once the plank has settled. */
    moved: boolean;
    won: boolean;
    robin: { from: Pt; v: Pt; t: number; flight: number; landed: boolean } | null;
}

const onPlankBags = (s: SeesawState) => s.bags.filter((b) => b.on === "plank");
export const loadsOf = (s: SeesawState): Load[] => [
    { mass: s.L.load.kg, at: s.L.load.at },
    ...onPlankBags(s).map((b) => ({ mass: b.kg, at: b.at })),
];
export const difference = (s: SeesawState): number => turning(loadsOf(s));
const rest = (s: SeesawState) =>
    lean(difference(s), { per: SEESAW.lean.value, most: SEESAW.most.value });
const busy = (s: SeesawState) =>
    s.bags.some((b) => b.on === "held" || b.on === "air" || b.on === "home");
const sideCount = (s: SeesawState, at: number) =>
    onPlankBags(s).filter((b) => Math.sign(b.at) === Math.sign(at)).length;

/** The heights of what stands on a step, bottom first: the suitcase if it is there, then bags in the order they were stood there. */
function stack(s: SeesawState, at: number): { kg: number; bag: number }[] {
    const out: { kg: number; bag: number }[] =
        s.L.load.at === at ? [{ kg: s.L.load.kg, bag: -1 }] : [];
    const here = s.bags
        .map((b, i) => ({ b, i }))
        .filter((x) => x.b.on === "plank" && x.b.at === at)
        .sort((p, q) => p.b.seq - q.b.seq);
    return [...out, ...here.map((x) => ({ kg: x.b.kg, bag: x.i }))];
}

/** Where the foot of the `k`th thing up a step's stack stands, at the plank's angle now. */
function footOn(s: SeesawState, at: number, k: number): Pt {
    const under = stack(s, at)
        .slice(0, k)
        .reduce((sum, x) => sum + bagSize(x.kg).h + 0.15, 0);
    return onPlank(PIVOT, s.tilt.angle, at * GAP, -(PLANK.top + under));
}

export function start(level: number): SeesawState {
    return startSeesawLevel(SEESAW_LEVELS[level] ?? SEESAW_LEVELS[0], level);
}

/** Open the exact verified challenge configuration. */
export function startSeesawLevel(L: SeesawLevel, level = 0): SeesawState {
    const gap = 1.4,
        widths = L.bags.map((kg) => bagSize(kg).w);
    let x = FIELD.world.w / 2 - (widths.reduce((a, w) => a + w, 0) + gap * (widths.length - 1)) / 2;
    const bags: Bag[] = L.bags.map((kg, i) => {
        const w = widths[i] ?? 3,
            home = x + w / 2;
        x += w + gap;
        return {
            kg,
            home,
            on: "store",
            at: 0,
            seq: 0,
            foot: { x: home, y: FIELD.front },
            v: { x: 0, y: 0 },
            angle: 0,
            sway: HANGING,
            squash: 0,
            bounces: 0,
        };
    });
    const s: SeesawState = {
        level,
        L,
        bags,
        tilt: { angle: 0, spin: 0 },
        hand: null,
        handV: { x: 0, y: 0 },
        handA: 0,
        held: -1,
        cursor: null,
        seq: 0,
        steps: 0,
        still: 0,
        said: "",
        saidAt: -999,
        touched: false,
        moved: false,
        won: false,
        robin: null,
    };
    s.tilt.angle = rest(s);
    return s;
}

function tell(s: SeesawState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/**
 * The step a bag let go at `foot` stands on: an open step whose column it is over, on a side with room.
 * A bag let go overlapping the top of a stack by up to its own height still stands on top, since that is
 * where a hand putting a bag on a pile lets go.
 */
function stepUnder(s: SeesawState, foot: Pt, h: number): { at: number; full: boolean } {
    for (const at of s.L.open) {
        const col = footOn(s, at, stack(s, at).length);
        if (Math.abs(foot.x - col.x) <= GAP / 2 && foot.y <= col.y + h)
            return sideCount(s, at) >= s.L.most ? { at: 0, full: true } : { at, full: false };
    }
    return { at: 0, full: false };
}

/** The bags a hand can pick up: those on the grass, and the top bag of each stack on the plank. */
function pickable(s: SeesawState): number[] {
    const grass = s.bags
        .map((b, i) => ({ b, i }))
        .filter((x) => x.b.on === "store")
        .sort((p, q) => p.b.home - q.b.home)
        .map((x) => x.i);
    const tops = [...new Set(onPlankBags(s).map((b) => b.at))]
        .sort((a, b) => a - b)
        .map((at) => stack(s, at).at(-1)?.bag ?? -1)
        .filter((i) => i >= 0);
    return [...grass, ...tops];
}

function bagCentre(b: Bag): Pt {
    const lift = (bagSize(b.kg).h + HANDLE + 0.26) / 2 - 0.12;
    return { x: b.foot.x + lift * Math.sin(b.angle), y: b.foot.y - lift * Math.cos(b.angle) };
}

function lift(s: SeesawState, i: number, out: Happening[]): void {
    const b = s.bags[i];
    if (!b) return;
    if (b.on === "plank") s.moved = true;
    b.on = "held";
    b.at = 0;
    b.sway = HANGING;
    s.held = i;
    s.touched = true;
    out.push({ cue: "lift" });
}

function letGo(s: SeesawState, out: Happening[]): void {
    const b = s.bags[s.held];
    s.held = -1;
    if (!b) return;
    // Where the finger is decides the step, not where the swinging bag has swung to.
    const under = stepUnder(s, { x: s.hand?.x ?? b.foot.x, y: b.foot.y }, bagSize(b.kg).h);
    if (under.full)
        tell(s, `That side of the plank holds ${s.L.most} ${s.L.most === 1 ? "bag" : "bags"}.`);
    b.on = "air";
    b.at = under.at;
    b.v = { x: s.handV.x * 0.3, y: Math.min(0, s.handV.y * 0.2) };
    b.bounces = 0;
    out.push({ cue: "back" });
}

function hands(s: SeesawState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        const was = s.hand,
            v = was ? { x: (t.x - was.x) / DT, y: (t.y - was.y) / DT } : { x: 0, y: 0 };
        s.handA = was ? (v.x - s.handV.x) / DT : 0;
        s.handV = v;
        s.hand = { ...t };
        s.cursor = null;
        // A press that begins on a bag picks it up; one that begins on the grass or the sky does nothing.
        if (!was && s.held < 0) {
            const near = pickable(s)
                .flatMap((i) => {
                    const bag = s.bags[i];
                    return bag ? [{ i, c: bagCentre(bag), size: bagSize(bag.kg) }] : [];
                })
                .filter(
                    (x) =>
                        Math.abs(t.x - x.c.x) <= x.size.w / 2 + 0.6 &&
                        Math.abs(t.y - x.c.y) <= x.size.h / 2 + 1,
                )
                .sort(
                    (p, q) =>
                        Math.hypot(t.x - p.c.x, t.y - p.c.y) - Math.hypot(t.x - q.c.x, t.y - q.c.y),
                )[0];
            if (near) lift(s, near.i, out);
        }
    }
    if (pad.lifted) {
        if (s.held >= 0) letGo(s, out);
        s.hand = null;
        s.handV = { x: 0, y: 0 };
        s.handA = 0;
    }
}

/** Where the keyboard's hand holds a bag over a place it may go: over a step's stack, or over its place on the grass. */
function hover(s: SeesawState, at: number, b: Bag): Pt {
    const d = bagSize(b.kg).h + HANDLE;
    if (at === 0) return { x: b.home, y: FIELD.front - d - 3 };
    const col = footOn(s, at, stack(s, at).length);
    return { x: col.x, y: col.y - d - 2.5 };
}

function keys(s: SeesawState, pad: Pad, out: Happening[]): void {
    const turns = pad.pressed.filter((d) => d === "left" || d === "right");
    if ((!turns.length && !pad.tapped) || pad.touch) return;
    if (s.held >= 0 && s.cursor?.mode !== "place") return;
    const placing = s.cursor?.mode === "place";
    const list = placing ? [...s.L.open, 0] : pickable(s);
    if (!list.length) return;
    if (!s.cursor) {
        s.cursor = { mode: "pick", i: 0 };
        if (!pad.tapped) return;
    }
    const cur = s.cursor;
    for (const d of turns) cur.i = (cur.i + (d === "right" ? 1 : list.length - 1)) % list.length;
    if (!pad.tapped) return;
    if (!placing) {
        const i = list[cur.i] ?? -1,
            b = s.bags[i];
        if (!b) return;
        lift(s, i, out);
        // With no hand, a bag the keys picked up hovers over the place the keys choose.
        s.hand = null;
        s.cursor = { mode: "place", i: 0 };
        return;
    }
    const b = s.bags[s.held];
    if (b) {
        const at = list[cur.i] ?? 0;
        b.foot = { ...footOfHand(b, hover(s, at, b)) };
        s.hand = null;
        letGo(s, out);
        b.at = at !== 0 && sideCount(s, at) < s.L.most ? at : 0;
    }
    s.cursor = { mode: "pick", i: 0 };
}

const footOfHand = (b: Bag, hand: Pt): Pt => {
    const d = bagSize(b.kg).h + HANDLE;
    return { x: hand.x - d * Math.sin(b.angle), y: hand.y + d * Math.cos(b.angle) };
};

function moveBag(s: SeesawState, b: Bag, i: number, out: Happening[]): void {
    b.squash *= Math.exp(-11 * DT);
    switch (b.on) {
        case "store":
            b.foot = { x: b.home, y: FIELD.front };
            b.angle = 0;
            return;
        case "held": {
            if (s.cursor?.mode === "place" && !s.hand) {
                const want = hover(s, [...s.L.open, 0][s.cursor.i] ?? 0, b),
                    was = footOfHand(b, want);
                s.handA = (was.x - b.foot.x) * 40;
            }
            const hand =
                s.hand ??
                (s.cursor?.mode === "place"
                    ? hover(s, [...s.L.open, 0][s.cursor.i] ?? 0, b)
                    : null);
            b.sway = sway(b.sway, s.hand ? s.handA : 0, DT, {
                length: bagSize(b.kg).h + 1,
                g: 30,
                damping: 5,
                most: 0.4,
            });
            b.angle = b.sway.angle;
            if (hand) {
                const aim = footOfHand(b, hand);
                const k = 1 - Math.exp(-(s.hand ? 30 / Math.sqrt(Math.max(1, b.kg)) : 14) * DT);
                b.foot = {
                    x: b.foot.x + (aim.x - b.foot.x) * k,
                    y: b.foot.y + (aim.y - b.foot.y) * k,
                };
            }
            return;
        }
        case "plank": {
            const k = stack(s, b.at).findIndex((x) => x.bag === i);
            b.foot = footOn(s, b.at, Math.max(0, k));
            b.angle = s.tilt.angle;
            return;
        }
        case "air": {
            b.v.y += SEESAW.fall.value * DT;
            b.angle *= Math.exp(-8 * DT);
            if (b.at !== 0) {
                const aim = footOn(s, b.at, stack(s, b.at).length);
                b.foot = {
                    x: b.foot.x + (aim.x - b.foot.x) * Math.min(1, 12 * DT),
                    y: b.foot.y + b.v.y * DT,
                };
                if (b.foot.y >= aim.y) {
                    b.on = "plank";
                    b.seq = ++s.seq;
                    b.foot = aim;
                    b.squash = Math.min(0.28, Math.max(0.06, b.v.y * 0.012));
                    s.tilt = knock(s.tilt, b.kg, b.at, Math.max(0, b.v.y), SEESAW.knock.value);
                    s.moved = true;
                    out.push(
                        { cue: "bump" },
                        { puff: { x: aim.x, y: aim.y, n: Math.min(8, 3 + b.kg) } },
                    );
                    b.v = { x: 0, y: 0 };
                }
                return;
            }
            b.foot = { x: b.foot.x + b.v.x * DT, y: b.foot.y + b.v.y * DT };
            if (b.foot.y >= FIELD.front) {
                b.foot.y = FIELD.front;
                if (b.v.y > 7 && b.bounces < 2) {
                    b.v = { x: b.v.x * 0.5, y: -b.v.y * 0.3 };
                    b.bounces++;
                    b.squash = 0.18;
                    out.push({ cue: "bump" }, { puff: { x: b.foot.x, y: b.foot.y, n: 5 } });
                } else {
                    b.on = "home";
                    b.v = { x: 0, y: 0 };
                }
            }
            return;
        }
        case "home": {
            const dx = b.home - b.foot.x,
                go = Math.sign(dx) * Math.min(Math.abs(dx), 16 * DT);
            b.foot = {
                x: b.foot.x + go,
                y:
                    FIELD.front -
                    Math.abs(Math.sin(s.steps * 0.45)) * 0.35 * Math.min(1, Math.abs(dx)),
            };
            b.angle = Math.sin(s.steps * 0.45) * 0.06 * Math.min(1, Math.abs(dx));
            if (Math.abs(dx) < 0.02) {
                b.on = "store";
                b.foot = { x: b.home, y: FIELD.front };
                b.angle = 0;
            }
            return;
        }
    }
}

export function step(s: SeesawState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    s.tilt = swingTo(s.tilt, rest(s), DT, {
        stiffness: SEESAW.stiffness.value,
        damping: SEESAW.damping.value,
        most: 0.4,
    });
    for (const [i, b] of s.bags.entries()) moveBag(s, b, i, out);
    const d = difference(s),
        calm = !busy(s) && Math.abs(s.tilt.spin) < 0.04;
    if (!s.won && calm && s.moved) {
        s.moved = false;
        if (d !== 0) tell(s, d > 0 ? "Heavier on the right." : "Heavier on the left.");
    }
    if (!s.won && calm && d === 0 && onPlankBags(s).length > 0 && Math.abs(s.tilt.angle) < 0.004) {
        if (++s.still > RATE * 0.4) {
            s.won = true;
            tell(s, "Level.");
            const to = onPlank(PIVOT, 0, 0, -PLANK.top),
                from = { x: FIELD.world.w + 2, y: 2 },
                flight = lob(from, to, 30, 2);
            s.robin = { from, v: flight.v, t: flight.t, flight: 0, landed: false };
            out.push(
                { cue: "level" },
                { burst: { kind: "sparkle", x: PIVOT.x, y: PIVOT.y - 0.5, n: 14 } },
            );
        }
    } else s.still = 0;
    const r = s.robin;
    if (r && !r.landed) {
        r.flight += DT;
        if (r.flight >= r.t) {
            r.landed = true;
            out.push({ cue: "win" }, { puff: { x: PIVOT.x, y: PIVOT.y - PLANK.top, n: 4 } });
        }
    }
    return out;
}

export function back(s: SeesawState): boolean {
    if (s.won || s.held >= 0) return false;
    const last = onPlankBags(s)
        .filter((b) => stack(s, b.at).at(-1)?.bag === s.bags.indexOf(b))
        .sort((p, q) => q.seq - p.seq)[0];
    if (!last) return false;
    last.on = "air";
    last.at = 0;
    last.v = { x: 0, y: -9 };
    last.bounces = 2;
    s.moved = true;
    return true;
}

export function frame(s: SeesawState, _rest = false): Frame {
    const W = FIELD.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (const [line, name] of [
        [FIELD.ground, "far"],
        [FIELD.front, "near"],
    ] as const) {
        for (let x0 = 0; x0 < W.w; x0 += 20) {
            const w = Math.min(20, W.w - x0);
            sprites.push({
                key: `ground:${name}:${x0}`,
                art: "arcade.ground",
                params: { w },
                seed: 60 + x0 + (name === "far" ? 0 : 7),
                x: x0 + w / 2,
                y: line + 1.1,
                z: 0,
                still: true,
            });
        }
    }
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 11,
            x: 9,
            y: 4.5,
            z: 0,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 12,
            x: 42,
            y: 3,
            z: 0,
            still: true,
        },
        {
            key: "hedge:0",
            art: "hedge",
            params: { clumps: 4, berries: 4, gap: 0 },
            seed: 21,
            x: 5,
            y: FIELD.ground,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "hedge:1",
            art: "hedge",
            params: { clumps: 4, berries: 3, gap: 0 },
            seed: 22,
            x: 47,
            y: FIELD.ground,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "flowers:0",
            art: "flowers",
            params: { count: 3, petals: 5 },
            seed: 31,
            size: 5.5,
            x: 3.5,
            y: FIELD.front + 1.8,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "flowers:1",
            art: "flowers",
            params: { count: 2, petals: 6 },
            seed: 32,
            size: 4,
            x: 49,
            y: FIELD.front + 1.8,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "fulcrum",
            art: "fulcrum",
            params: { stone: false },
            seed: 5,
            size: FIELD.fulcrum,
            x: PIVOT.x,
            y: FIELD.ground,
            stand: true,
            z: 2,
            still: true,
        },
    );
    const mid = onPlank(PIVOT, s.tilt.angle, 0, PLANK.middle);
    sprites.push({
        key: "plank",
        art: "seesawplank",
        params: { steps: STEPS, gap: GAP, numbers: true },
        seed: 41,
        x: mid.x,
        y: mid.y,
        angle: s.tilt.angle,
        z: 3,
    });
    const loadFoot = footOn(s, s.L.load.at, 0),
        loadArt = bagArt(s.L.load.kg);
    const loadLift = loadArt.crop.h / 2 - 0.12;
    sprites.push({
        key: "load",
        ...loadArt,
        seed: 50,
        size: loadArt.crop.w,
        x: loadFoot.x + loadLift * Math.sin(s.tilt.angle),
        y: loadFoot.y - loadLift * Math.cos(s.tilt.angle),
        angle: s.tilt.angle,
        z: 4,
    });
    for (const [i, b] of s.bags.entries()) {
        const art = bagArt(b.kg),
            c = bagCentre(b),
            k = b.on === "plank" ? stack(s, b.at).findIndex((x) => x.bag === i) : 0;
        const z = b.on === "held" || b.on === "air" ? 9 : b.on === "plank" ? 5 + k : 6;
        sprites.push({
            key: `bag:${i}`,
            ...art,
            seed: 300 + i,
            size: art.crop.w,
            x: c.x,
            y: c.y,
            angle: b.angle,
            squash: b.squash,
            z,
        });
    }
    const r = s.robin;
    if (r) {
        const at = r.landed
            ? onPlank(PIVOT, s.tilt.angle, 0, -PLANK.top)
            : flightAt(r.from, r.v, 30, r.flight);
        // With no post the robin stands on a sill in the foot of its box, which the crop leaves out.
        sprites.push({
            key: "robin",
            art: "robin",
            params: { post: 0, facing: -1 },
            crop: { x: 0, y: 0, w: 3, h: 2.45 },
            seed: 70,
            x: at.x,
            y: at.y,
            stand: true,
            z: 10,
        });
    }
    if (s.L.totals) {
        for (const at of new Set([s.L.load.at, ...onPlankBags(s).map((b) => b.at)])) {
            const pile = stack(s, at),
                top = footOn(s, at, pile.length);
            marks.push({
                kind: "word",
                x: top.x,
                y: top.y - 1.6,
                text: `${pile.reduce((sum, x) => sum + x.kg, 0)}`,
                size: 1.3,
            });
        }
    }
    const held = s.bags[s.held];
    if (held && !s.won) {
        const under =
            s.cursor?.mode === "place"
                ? ([...s.L.open, 0][s.cursor.i] ?? 0)
                : stepUnder(s, held.foot, bagSize(held.kg).h).at;
        if (under !== 0) {
            const top = footOn(s, under, stack(s, under).length);
            marks.push({ kind: "ring", x: top.x, y: top.y - 0.4, r: 1.1, on: true });
            marks.push({ kind: "line", a: held.foot, b: top, style: "aim" });
        }
    } else if (s.cursor?.mode === "pick" && !s.won) {
        const b = s.bags[pickable(s)[s.cursor.i] ?? -1];
        if (b) {
            const c = bagCentre(b);
            marks.push({ kind: "ring", x: c.x, y: c.y, r: bagSize(b.kg).w / 2 + 0.4 });
        }
    }
    return {
        sprites,
        marks,
        camera: { x: W.w / 2, y: W.h / 2, zoom: 1 },
        view: { ...FIELD.view },
        world: { ...W },
    };
}

const kilos = (xs: number[]) => {
    const words = xs.map(String);
    return words.length > 1
        ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)} kilograms`
        : `${words[0] ?? ""} kilograms`;
};

export function say(s: SeesawState): string {
    const L = s.L,
        side = (at: number) => (at < 0 ? "left" : "right");
    const parts = [
        s.said,
        `The suitcase weighs ${L.load.kg} kilograms and stands on step ${Math.abs(L.load.at)} on the ${side(L.load.at)}.`,
    ];
    const steps = [...new Set(onPlankBags(s).map((b) => b.at))].sort((a, b) => a - b);
    for (const at of steps)
        parts.push(
            `On step ${Math.abs(at)} on the ${side(at)}: ${kilos(
                stack(s, at)
                    .filter((x) => x.bag >= 0)
                    .map((x) => x.kg),
            )}.`,
        );
    const d = difference(s);
    parts.push(
        d === 0 ? "The plank is level." : `The plank leans to the ${d > 0 ? "right" : "left"}.`,
    );
    const grass = s.bags.filter((b) => b.on === "store" || b.on === "home").map((b) => b.kg);
    parts.push(
        grass.length ? `On the grass: bags of ${kilos(grass)}.` : "Every bag is on the plank.",
    );
    const held = s.bags[s.held];
    if (held) parts.push(`You are holding the ${held.kg} kilogram bag.`);
    return parts.filter(Boolean).join(" ");
}

export const seesawGame: ActionGame<SeesawState> = {
    id: "weigh",
    title: "See-saw",
    group: "action",
    levels: SEESAW_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    listed: false,
    plays: { activity: "weigh.same-weight", levels: [0, 2, 1, 1, 2, 5] },
    cover: {
        art: "seesaw",
        params: { left: 4, atleft: 3, right: 6, atright: 2, unit: "kg", marks: true, held: 0 },
    },
    hint: "Carry a bag onto a step of the plank and let go, or choose a bag with the arrow keys and press space",
    controls: {},
    start,
    step,
    frame,
    say,
    back,
    tuning: SEESAW,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) =>
            (busy(s) && s.held < 0) ||
            Math.abs(s.tilt.spin) > 0.01 ||
            (s.robin !== null && !s.robin.landed),
    },
};
