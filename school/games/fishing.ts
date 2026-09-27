// Gone fishing: cast, wait for a bite, strike, play the fish and weigh the catch.
//
// Charlie fishes from a jetty with a scale beside her, and the fish in the water below carry their
// weights on their tags, lighter ones near the top and heavier ones deeper down. The child pulls back
// from the float and lets go, and it flies on its line and lands where the throw takes it; the hook
// sinks to the depth the child sets. A fish that notices the bait comes to it and nibbles, the float
// bobs, and then it bites and the float goes under: a strike then hooks it, too soon scares it off
// and too late lets it go. A hooked fish runs. Reeling brings it in and pulls the line tight, and a
// line pulled too tight snaps and the fish swims away; easing lets it run. A line reeled through the
// weed snags until it is eased free. A landed fish swings onto the scale, whose pan takes a few fish,
// and the round is won when the needle reads the weight marked on the dial exactly. A fish can
// always be thrown back. The maths is choosing which fish to go after by the numbers on them. See
// .docs/games.md.
//
// Chance comes from a seeded generator whose state is part of the game's state, so the same hands
// give the same fish, and a stored game is only data.
import {
    aimAt,
    aimOfPull,
    launchOf,
    stepAim,
    type Aim,
    type AimSpec,
} from "../../engine/motion/aim";
import { arc, flightAt, lob } from "../../engine/motion/flight";
import type { Pt } from "../../engine/motion/geometry";
import { line, stepLine, type Line } from "../../engine/motion/line";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite, Water } from "../../engine/motion/scene";
import { surfaceAt } from "../../engine/motion/surface";
import { arrive, flee } from "../../engine/motion/steer";
import { knob } from "../../engine/motion/tune";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { BEYOND } from "./scenery";

/** How a fish takes to a bait: a shy one waits for a quiet float, a curious one comes from further off, a quick one bites fast. */
export type Nature = "shy" | "curious" | "quick";

/** One kind of fish: its weight, how its tag writes it, how many of it there are, and its nature. */
export interface Kind {
    value: number;
    tag: string;
    n: number;
    nature: Nature;
}

/** A bed of weed on the bottom, across at `x`, that snags a line reeled through it. */
export interface Weed {
    x: number;
    fronds: number;
    tall: number;
}

export type Units = "plain" | "grams" | "kilos";

export interface FishLevel extends ActionLevel {
    kinds: Kind[];
    /** The weight to make, and how many fish the scale's pan takes. */
    target: number;
    holds: number;
    dial: { max: number; step: number; unit: string };
    units: Units;
    weeds: Weed[];
    /** What stands on the bottom besides the weed: coral and a starfish in the sea, reeds by a lake. */
    spot: "sea" | "lake";
    done: string;
    /** The line over the field until the first cast. */
    prompt: string;
}

const kinds = (
    values: number[],
    tag: (v: number) => string,
    natures: Nature[],
    twice: number[] = [],
): Kind[] =>
    values.map((v, i) => ({
        value: v,
        tag: tag(v),
        n: twice.includes(v) ? 2 : 1,
        nature: natures[i % natures.length] ?? "curious",
    }));

export const FISH_LEVELS: Levels<FishLevel> = [
    {
        title: "Two that make ten",
        goal: "The pan holds 2 fish. Catch two that make 10.",
        grades: [1, 1],
        kinds: kinds([2, 3, 4, 5, 6, 7, 8], String, ["curious"], [5]),
        target: 10,
        holds: 2,
        dial: { max: 12, step: 2, unit: "" },
        units: "plain",
        weeds: [],
        spot: "sea",
        done: "The scale reads 10, and the pan is full.",
        prompt: "Pull back from the float and let go. When the float goes under, strike.",
    },
    {
        title: "Three that make twenty",
        goal: "The pan holds 3 fish. Catch three that make 20. Reel gently through the weed.",
        grades: [1, 2],
        kinds: kinds([3, 5, 6, 7, 8, 9], String, ["curious", "shy"], [6, 7]),
        target: 20,
        holds: 3,
        dial: { max: 24, step: 4, unit: "" },
        units: "plain",
        weeds: [{ x: 34, fronds: 4, tall: 5 }],
        spot: "lake",
        done: "The scale reads 20, and the pan is full.",
        prompt: "Catch three fish that make 20. Shy fish wait for a still float.",
    },
    {
        title: "One kilogram",
        goal: "Catch fish that weigh 1 kilogram, 1000 grams, together. The pan holds 3.",
        grades: [2, 3],
        kinds: kinds(
            [100, 250, 300, 400, 500, 600],
            (v) => `${v} g`,
            ["curious", "quick", "shy"],
            [250, 300],
        ),
        target: 1000,
        holds: 3,
        dial: { max: 1200, step: 200, unit: "g" },
        units: "grams",
        weeds: [{ x: 29, fronds: 3, tall: 4 }],
        spot: "sea",
        done: "One kilogram: the needle is on 1000 grams.",
        prompt: "Catch fish that weigh 1000 grams together.",
    },
    {
        title: "Two and a half kilograms",
        goal: "Catch fish that weigh 2.5 kilograms together. The pan holds 3.",
        grades: [3, 4],
        kinds: kinds(
            [0.25, 0.5, 0.75, 1, 1.25, 1.5],
            (v) => `${v} kg`,
            ["quick", "curious", "shy"],
            [0.5, 1],
        ),
        target: 2.5,
        holds: 3,
        dial: { max: 3, step: 0.5, unit: "kg" },
        units: "kilos",
        weeds: [
            { x: 27, fronds: 4, tall: 6 },
            { x: 42, fronds: 3, tall: 4 },
        ],
        spot: "lake",
        done: "Two and a half kilograms, and the pan is full.",
        prompt: "Catch fish that weigh 2.5 kilograms together. Big fish pull hard.",
    },
    {
        title: "Three that make fifty",
        goal: "Catch fish that make 50. The pan holds 3.",
        grades: [2, 3],
        kinds: kinds([5, 10, 15, 20, 25, 30], String, ["shy", "quick"], [15, 20]),
        target: 50,
        holds: 3,
        dial: { max: 60, step: 10, unit: "" },
        units: "plain",
        weeds: [{ x: 38, fronds: 5, tall: 6 }],
        spot: "sea",
        done: "The scale reads 50, and the pan is full.",
        prompt: "Catch fish that make 50.",
    },
    {
        title: "A kilogram and a half",
        goal: "Catch fish that weigh 1.5 kilograms together. The pan holds 3.",
        grades: [3, 4],
        kinds: kinds(
            [0.25, 0.4, 0.5, 0.6, 0.75, 1],
            (v) => `${v} kg`,
            ["quick", "shy", "curious"],
            [0.5],
        ),
        target: 1.5,
        holds: 3,
        dial: { max: 2, step: 0.5, unit: "kg" },
        units: "kilos",
        weeds: [
            { x: 26, fronds: 3, tall: 5 },
            { x: 35, fronds: 4, tall: 7 },
            { x: 45, fronds: 3, tall: 5 },
        ],
        spot: "lake",
        done: "A kilogram and a half, and the pan is full.",
        prompt: "Catch fish that weigh 1.5 kilograms together.",
    },
];

/** A weight in words, for the sentences. */
export function words(u: Units, v: number): string {
    const n = Math.round(v * 1000) / 1000;
    return u === "grams"
        ? `${n} grams`
        : u === "kilos"
          ? `${n} ${n === 1 ? "kilogram" : "kilograms"}`
          : String(n);
}

export const FISHING = {
    bite: knob(
        0.75,
        0.4,
        1.2,
        0.05,
        "seconds",
        "the float stays under long enough for a child who is watching to strike",
    ),
    snap: knob(
        0.35,
        0.15,
        0.8,
        0.05,
        "seconds",
        "a line held too tight this long snaps, so a short tug is forgiven and a long one is not",
    ),
    reel: knob(5, 2.5, 8, 0.5, "squares a second", "a fish comes in steadily, never in a blink"),
    sink: knob(
        5,
        2,
        8,
        0.25,
        "squares a second",
        "the hook goes down quickly enough that finding a depth is not a wait",
    ),
    swim: knob(
        1.6,
        0.8,
        3,
        0.1,
        "squares a second",
        "the pace of a middling fish; quick ones are faster",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** Squares a second each second, for the float's cast and a fish in the air. */
export const G = 26;
/** In squares: the sea's surface and its bed, and how far across the fish swim. */
export const SEA = {
    world: { w: 52, h: 32 },
    view: { w: 46, h: 27 },
    surface: 13,
    deep: 18,
    left: 21,
    right: 50.5,
} as const;
export const BED = SEA.surface - 0.5 + SEA.deep - 1.7;
/** The jetty drawn 1.6 times its box, with its water line on the surface and its deck 1.15 of a square down its box. */
const JK = 1.6,
    JETTY = { x: 9, top: SEA.surface - 3.2 * JK };
export const DECK = JETTY.top + 1.15 * JK;
/** The scale stands on the deck drawn 4.6 squares across, its pan 1.05 of its 8 squares down, scaled. */
const SK = 4.6 / 6;
const PAN: Pt = { x: 5.8, y: DECK - 8 * SK + 1.05 * SK };
/** Charlie's hands, as the figure kit holds something, and the rod's tip. */
const HANDS: Pt = { x: 13.6, y: DECK - 6 + 3.035 };
export const TIP: Pt = { x: 19.4, y: 5.4 };
/** Where the float hangs from the tip before a cast. */
export const HANG: Pt = { x: TIP.x, y: TIP.y + 1.4 };

/** A cast: a full pull throws it to the far side, and it goes up rather than down. */
export const CAST: AimSpec = {
    min: 6,
    max: 30,
    per: 6,
    dead: 0.6,
    lo: -1.35,
    hi: 0.15,
    turn: 1.1,
    ramp: 14,
    turns: "up",
};

type Phase = "ready" | "held" | "fly" | "wait" | "fight" | "landing";
type Mood = "swim" | "come" | "nibble" | "bite" | "flee" | "hooked" | "air" | "pan";

export interface Fish {
    key: string;
    kind: number;
    x: number;
    y: number;
    dir: 1 | -1;
    /** Its depth, and the stretch it patrols. */
    lane: number;
    from: number;
    to: number;
    mood: Mood;
    /** Seconds left in its mood, and nibbles left before it bites. */
    timer: number;
    nibbles: number;
    /** Seconds before it will look at a bait again. */
    cool: number;
    /** Seconds until a hooked fish runs again, and where it runs to. */
    run: number;
    runTo: Pt | null;
}

interface Flight {
    fish: number;
    from: Pt;
    v: Pt;
    t: number;
    T: number;
    to: "pan" | "sea";
}

export interface FishState {
    level: number;
    L: FishLevel;
    seed: number;
    /** The generator's state, stepped as it is drawn from. */
    rng: number;
    phase: Phase;
    fish: Fish[];
    float: Pt;
    fv: Pt;
    hook: Pt;
    /** Where the hook is going down to. */
    depth: number;
    line: Line;
    /** How much line is out, from the tip, while a fish is on. */
    out: number;
    tension: number;
    strain: number;
    snagged: boolean;
    ease: number;
    aim: Aim;
    grab: Pt | null;
    pull: Pt | null;
    pressAt: Pt | null;
    pressStep: number;
    goFor: number;
    /** Seconds since the float last landed or moved, which a shy fish waits for. */
    still: number;
    pan: number[];
    needle: number;
    flights: Flight[];
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
    casts: number;
    snaps: number;
    /** Rings on the water where it was broken, `age` seconds ago. */
    ripples: { x: number; age: number; size: number }[];
}

function draw(s: FishState): number {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A kind's look: how big it is drawn, the box its drawing is made at, the depth it swims at, and its colour. */
export function shapeOf(
    L: FishLevel,
    kind: number,
): { size: number; box: number; lane: number; tone: string } {
    const values = L.kinds.map((k) => k.value),
        lo = Math.min(...values),
        hi = Math.max(...values),
        v = L.kinds[kind]?.value ?? lo;
    const r = hi > lo ? (v - lo) / (hi - lo) : 0.5,
        size = 2.3 + r * 2.7;
    const rank = values.filter((x) => x < v).length,
        lane =
            SEA.surface +
            2.6 +
            (values.length > 1 ? rank / (values.length - 1) : 0.5) * (BED - SEA.surface - 5);
    return {
        size,
        box: Math.max(2, Math.min(8, Math.round(size))),
        lane,
        tone: ["glow", "sky", "berry", "mint", "tang"][kind % 5] ?? "glow",
    };
}

export const mouthOf = (s: FishState, f: Fish): Pt => ({
    x: f.x + f.dir * shapeOf(s.L, f.kind).size * 0.45,
    y: f.y,
});

export const total = (s: FishState): number =>
    Math.round(
        s.pan.reduce((a, i) => a + (s.L.kinds[s.fish[i]?.kind ?? 0]?.value ?? 0), 0) * 1000,
    ) / 1000;

const valueOf = (s: FishState, i: number): number => s.L.kinds[s.fish[i]?.kind ?? 0]?.value ?? 0;

/** A weed bed's reach, in squares: across either side of its middle, and the height of its top. */
function weedBox(w: Weed): { from: number; to: number; top: number } {
    const wide = Math.max(2, Math.ceil(w.fronds * 0.6) + 1);
    return { from: w.x - wide / 2, to: w.x + wide / 2, top: BED + 1 - w.tall * 0.9 };
}

const inWeed = (s: FishState, p: Pt): boolean =>
    s.L.weeds.some((w) => {
        const b = weedBox(w);
        return p.x >= b.from && p.x <= b.to && p.y >= b.top;
    });

export function startFishing(L: FishLevel, level: number, seed = 1): FishState {
    const s: FishState = {
        level,
        L,
        seed,
        rng: seed | 0,
        phase: "ready",
        fish: [],
        float: { ...HANG },
        fv: { x: 0, y: 0 },
        hook: { ...HANG },
        depth: SEA.surface + (BED - SEA.surface) * 0.45,
        line: line(TIP, HANG, 1.6, 12),
        out: 0,
        tension: 0,
        strain: 0,
        snagged: false,
        ease: 0,
        aim: aimAt(-0.6, 18),
        grab: null,
        pull: null,
        pressAt: null,
        pressStep: 0,
        goFor: 0,
        still: 0,
        pan: [],
        needle: 0,
        flights: [],
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
        casts: 0,
        snaps: 0,
        ripples: [],
    };
    L.kinds.forEach((k, kind) => {
        for (let n = 0; n < k.n; n++) {
            const span = 10 + draw(s) * 10,
                from = SEA.left + 1.5 + draw(s) * (SEA.right - SEA.left - 3 - span);
            s.fish.push({
                key: `fish:${kind}:${n}`,
                kind,
                x: from + draw(s) * span,
                y: shapeOf(L, kind).lane,
                dir: draw(s) < 0.5 ? -1 : 1,
                lane: shapeOf(L, kind).lane + (n ? 0.8 : 0),
                from,
                to: from + span,
                mood: "swim",
                timer: 0,
                nibbles: 0,
                cool: draw(s) * 2,
                run: 0,
                runTo: null,
            });
        }
    });
    return s;
}

function tell(s: FishState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const engaged = (s: FishState): number =>
    s.fish.findIndex((f) => f.mood === "come" || f.mood === "nibble" || f.mood === "bite");

const hooked = (s: FishState): number => s.fish.findIndex((f) => f.mood === "hooked");

/** Sends a fish off: it swims away from the hook and will not look at a bait for a while. */
function scare(f: Fish, cool: number): void {
    f.mood = "flee";
    f.timer = 1.2;
    f.cool = cool;
    f.runTo = null;
}

/** Scares a fish, and the rest of its shoal near it scatter with it. */
function scatter(s: FishState, f: Fish, cool: number): void {
    scare(f, cool);
    for (const o of s.fish)
        if (
            o !== f &&
            o.kind === f.kind &&
            o.mood === "swim" &&
            Math.hypot(o.x - f.x, o.y - f.y) < 3
        )
            scare(o, cool);
}

/** The water the fish swim in, as it is drawn and as the float rides it. */
function waterOf(s: FishState): Water {
    const sea = s.L.spot === "sea";
    return {
        x: -BEYOND,
        w: SEA.world.w + 2 * BEYOND,
        level: SEA.surface,
        bottom: SEA.surface - 0.5 + SEA.deep,
        waves: sea ? 0.1 : 0.04,
        hue: sea ? "sky" : "mint",
        // over the fish, the weed and the hook, and under the float and what flies
        z: 33,
        ripples: s.ripples,
    };
}

function ripple(s: FishState, x: number, size: number): void {
    s.ripples.push({ x, age: 0, size });
}

function cast(s: FishState, v: Pt, out: Happening[]): void {
    s.phase = "fly";
    s.float = { ...TIP };
    s.fv = v;
    s.hook = { ...TIP };
    s.casts++;
    s.touched = true;
    s.grab = null;
    s.pull = null;
    s.line = line(TIP, TIP, 1, 12);
    out.push({ cue: "lift" });
}

/** The float and hook come back to the rod's tip, and anything that was coming to the bait loses interest. */
function reset(s: FishState): void {
    s.phase = "ready";
    s.float = { ...HANG };
    s.hook = { ...HANG };
    s.fv = { x: 0, y: 0 };
    s.out = 0;
    s.tension = 0;
    s.strain = 0;
    s.snagged = false;
    s.ease = 0;
    s.line = line(TIP, HANG, 1.6, 12);
    for (const f of s.fish)
        if (f.mood === "come" || f.mood === "nibble" || f.mood === "bite") scare(f, 1);
}

function strike(s: FishState, out: Happening[]): void {
    const i = engaged(s),
        f = s.fish[i];
    if (!f) {
        tell(s, "Nothing is biting yet. Wait for the float to go under.");
        return;
    }
    if (f.mood === "bite") {
        f.mood = "hooked";
        f.run = 0.3;
        s.phase = "fight";
        s.out = Math.hypot(s.hook.x - TIP.x, s.hook.y - TIP.y);
        s.tension = 0.5;
        tell(
            s,
            `Hooked the ${s.L.kinds[f.kind]?.tag ?? ""} fish. Reel it in, and ease off when it runs.`,
        );
        out.push(
            { cue: "ring" },
            { burst: { kind: "splash", x: s.float.x, y: SEA.surface, n: 8 } },
        );
        ripple(s, s.float.x, 0.8);
        return;
    }
    scatter(s, f, 2);
    tell(s, "Too soon: it was only nibbling, and it swam off.");
    out.push({ cue: "nope" });
}

/** Throws the fish in slot `slot` of the pan back into the sea. */
function throwBack(s: FishState, slot: number, out: Happening[]): void {
    const fi = s.pan[slot],
        f = fi === undefined ? undefined : s.fish[fi];
    if (fi === undefined || !f) return;
    s.pan.splice(slot, 1);
    f.mood = "air";
    const to = { x: SEA.left + 4, y: SEA.surface + 0.5 },
        l = lob(PAN, to, G, 3);
    s.flights.push({ fish: fi, from: { ...PAN }, v: l.v, t: 0, T: l.t, to: "sea" });
    tell(s, `Back it goes. The scale reads ${words(s.L.units, total(s))}.`);
    out.push({ cue: "back" });
}

export function back(s: FishState): boolean {
    if (!s.pan.length || s.won || s.flights.length) return false;
    throwBack(s, s.pan.length - 1, []);
    return true;
}

function hands(s: FishState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        if (!s.pressAt) {
            s.pressAt = { ...t };
            s.pressStep = s.steps;
            if (s.phase === "ready" && Math.hypot(t.x - s.float.x, t.y - s.float.y) <= 2.4) {
                s.phase = "held";
                s.grab = { ...t };
                s.touched = true;
            }
            // a press on a fish on the pan throws it back
            const slot = s.pan.findIndex((_, k) => {
                const at = panSpot(k);
                return Math.hypot(t.x - at.x, t.y - at.y) < 1.6;
            });
            if (slot >= 0 && s.phase !== "held" && !s.won) throwBack(s, slot, out);
        }
        if (s.phase === "held" && s.grab) {
            s.pull = { x: t.x - s.grab.x, y: t.y - s.grab.y };
            if (Math.hypot(s.pull.x, s.pull.y) >= CAST.dead) s.aim = aimOfPull(s.pull, CAST);
        }
        // a finger held in the water sets how deep the hook goes
        if (
            s.phase === "wait" &&
            t.y > SEA.surface &&
            Math.hypot(t.x - s.pressAt.x, t.y - s.pressAt.y) > 0.6
        )
            s.depth = Math.max(SEA.surface + 1, Math.min(BED - 0.4, t.y));
    }
    if (pad.lifted) {
        const at = pad.lifted,
            tap =
                s.pressAt !== null &&
                Math.hypot(at.x - s.pressAt.x, at.y - s.pressAt.y) < 0.6 &&
                s.steps - s.pressStep < RATE * 0.5;
        if (s.phase === "held") {
            const p = s.pull ?? { x: 0, y: 0 };
            if (Math.hypot(p.x, p.y) >= CAST.dead) cast(s, launchOf(aimOfPull(p, CAST)), out);
            else s.phase = "ready";
            s.grab = null;
            s.pull = null;
        } else if (tap && s.phase === "wait") strike(s, out);
        s.pressAt = null;
    }
}

function keys(s: FishState, pad: Pad, out: Happening[]): void {
    if (pad.touch) return;
    if (s.phase === "ready") {
        const v = stepAim(s.aim, { ...pad, pull: null, released: null }, CAST, DT);
        if (pad.pressed.length || pad.holding.length) s.touched = true;
        if (v) cast(s, v, out);
        return;
    }
    if (s.phase === "wait") {
        for (const d of pad.pressed) {
            if (d === "down") s.depth = Math.min(BED - 0.4, s.depth + 1.2);
            if (d === "up") s.depth = Math.max(SEA.surface + 1, s.depth - 1.2);
        }
        if (pad.tapped) strike(s, out);
    }
}

function flyFloat(s: FishState, out: Happening[]): void {
    s.fv = { x: s.fv.x, y: s.fv.y + G * DT };
    s.float = { x: s.float.x + s.fv.x * DT, y: s.float.y + s.fv.y * DT };
    s.hook = { ...s.float };
    s.line.length = Math.max(s.line.length, Math.hypot(s.float.x - TIP.x, s.float.y - TIP.y) + 0.8);
    if (s.float.x > SEA.world.w - 1) s.float.x = SEA.world.w - 1;
    if (s.float.y < SEA.surface) return;
    s.float = { x: s.float.x, y: SEA.surface };
    if (s.float.x < SEA.left - 0.5) {
        tell(s, "That landed short, by the jetty. Pull back further for a longer cast.");
        out.push({ cue: "bump" });
        reset(s);
        return;
    }
    s.phase = "wait";
    s.hook = { ...s.float };
    s.still = 0;
    out.push({ cue: "splash" }, { burst: { kind: "splash", x: s.float.x, y: SEA.surface, n: 10 } });
    ripple(s, s.float.x, 1);
    // a splash scares a shy fish that was close to where it came down, and its shoal with it
    for (const f of s.fish)
        if (
            f.mood === "swim" &&
            s.L.kinds[f.kind]?.nature === "shy" &&
            Math.abs(f.x - s.float.x) < 2.5
        )
            scatter(s, f, 1.5);
}

/** The hook goes towards its depth under the float, and a fish that was at it may be put off by the move. */
function sinkHook(s: FishState): void {
    const want = { x: s.float.x, y: s.depth },
        d = want.y - s.hook.y,
        step = FISHING.sink.value * DT;
    const moving = Math.abs(d) > 1e-3;
    s.hook = { x: s.float.x, y: Math.abs(d) <= step ? want.y : s.hook.y + Math.sign(d) * step };
    s.still = moving ? 0 : s.still + DT;
    if (!moving) return;
    const i = engaged(s),
        f = s.fish[i];
    if (f && s.L.kinds[f.kind]?.nature === "shy") scare(f, 1.5);
}

function swimFish(s: FishState, out: Happening[]): void {
    const speed = FISHING.swim.value;
    let busy = engaged(s) >= 0 || hooked(s) >= 0;
    for (const f of s.fish) {
        if (f.mood === "air" || f.mood === "pan" || f.mood === "hooked") continue;
        f.cool = Math.max(0, f.cool - DT);
        const k = s.L.kinds[f.kind],
            nature = k?.nature ?? "curious",
            pace = speed * (nature === "quick" ? 1.6 : nature === "curious" ? 0.85 : 1);
        if (f.mood === "flee") {
            f.timer -= DT;
            const v = flee({ x: f.x, y: f.y }, s.hook, 12, pace * 2.2);
            const vx = Math.abs(v.x) < 0.1 ? f.dir * pace * 2 : v.x;
            f.x = Math.max(SEA.left, Math.min(SEA.right, f.x + vx * DT));
            f.dir = vx < 0 ? -1 : 1;
            f.y += (f.lane - f.y) * Math.min(1, 2 * DT);
            if (f.timer <= 0) f.mood = "swim";
            continue;
        }
        if (f.mood === "swim") {
            // a kind with more than one fish swims as a shoal: the rest follow the first one's way,
            // and one left behind turns to catch up
            const lead = s.fish.find((o) => o.kind === f.kind && o.mood === "swim");
            if (lead && lead !== f && f.x > f.from && f.x < f.to)
                f.dir = Math.abs(lead.x - f.x) > 2.5 ? (lead.x > f.x ? 1 : -1) : lead.dir;
            if (f.x <= f.from) f.dir = 1;
            if (f.x >= f.to) f.dir = -1;
            f.x += f.dir * pace * DT;
            f.y = f.lane + Math.sin((s.steps * DT + f.from) * 1.3) * 0.25;
            // a fish notices a bait near its own depth and not too far across, so the depth chooses the fish
            const across = nature === "curious" ? 6 : nature === "quick" ? 4.5 : 3.5;
            // a hook still going down passes a fish by; a shy one waits longer for it to be still
            const quiet = s.still > (nature === "shy" ? 1.2 : 0.3);
            if (
                s.phase === "wait" &&
                !busy &&
                f.cool === 0 &&
                quiet &&
                Math.abs(mouthOf(s, f).x - s.hook.x) < across &&
                Math.abs(f.lane - s.hook.y) < 0.9
            ) {
                busy = true;
                f.mood = "come";
                f.timer = 0;
                f.dir = s.hook.x >= f.x ? 1 : -1;
            }
            continue;
        }
        // coming, nibbling or biting: the fish faces the hook and keeps its mouth at it
        if (Math.abs(s.hook.x - f.x) > 0.6) f.dir = s.hook.x >= f.x ? 1 : -1;
        const mouth = mouthOf(s, f),
            v = arrive(mouth, s.hook, pace * 1.2, 0.8);
        f.x += v.x * DT;
        f.y += v.y * DT;
        if (f.mood === "come") {
            f.timer += DT;
            // one that cannot get to the bait soon gives up, so a bait is never kept from the others
            if (f.timer > 5) {
                scare(f, 1);
                continue;
            }
        }
        if (s.phase !== "wait") {
            scare(f, 1);
            continue;
        }
        const near = Math.hypot(mouth.x - s.hook.x, mouth.y - s.hook.y) < 0.5;
        if (f.mood === "come" && near) {
            f.mood = "nibble";
            f.nibbles = 1 + Math.floor(draw(s) * 3);
            f.timer = 0.5 + draw(s) * 0.5;
            out.push({ cue: "bump" });
            ripple(s, s.float.x, 0.3);
        } else if (f.mood === "nibble") {
            f.timer -= DT;
            if (f.timer > 0) continue;
            f.nibbles--;
            if (f.nibbles > 0) {
                f.timer = 0.4 + draw(s) * 0.5;
                out.push({ cue: "bump" });
                ripple(s, s.float.x, 0.3);
            } else {
                f.mood = "bite";
                f.timer = FISHING.bite.value * (nature === "quick" ? 0.75 : 1);
                out.push(
                    { cue: "splash" },
                    { burst: { kind: "bubble", x: s.float.x, y: SEA.surface, n: 5 } },
                );
                // the float goes under, and the water rings round where it went
                ripple(s, s.float.x, 1.2);
            }
        } else if (f.mood === "bite") {
            f.timer -= DT;
            if (f.timer <= 0) {
                scatter(s, f, 2);
                tell(
                    s,
                    "Too slow: the fish let go and swam off. Strike when the float goes under.",
                );
            }
        }
    }
}

/** The fight: the fish runs and rests, reeling brings it in and tightens the line, and too tight too long snaps it. */
function fight(s: FishState, pad: Pad, out: Happening[]): void {
    const i = hooked(s),
        f = s.fish[i];
    if (!f) {
        reset(s);
        return;
    }
    const k = s.L.kinds[f.kind],
        values = s.L.kinds.map((x) => x.value),
        heavy =
            ((k?.value ?? 0) - Math.min(...values)) /
            Math.max(1e-9, Math.max(...values) - Math.min(...values)),
        quick = k?.nature === "quick";
    const reeling = (pad.go || pad.touch !== null) && !pad.brake && !pad.holding.includes("down");
    const easing = pad.brake || pad.holding.includes("down");
    // the fish runs now and then, away from the jetty and down, and rests between
    f.run -= DT;
    if (f.run <= 0) {
        if (f.runTo) {
            f.runTo = null;
            f.run = 0.8 + draw(s) * 1.2;
        } else {
            f.runTo = {
                x: Math.min(SEA.right, f.x + 4 + draw(s) * 6),
                y: Math.min(BED - 0.5, f.y + 1 + draw(s) * 3),
            };
            f.run = 0.6 + draw(s) * (0.6 + heavy);
            out.push({ cue: "splash" });
        }
    }
    const pace = FISHING.swim.value * (1.8 + heavy * 1.4) * (quick ? 1.3 : 1);
    const want = f.runTo ?? { x: f.x + 0.5, y: f.y },
        v = arrive({ x: f.x, y: f.y }, want, f.runTo ? pace : pace * 0.3);
    let x = f.x + v.x * DT,
        y = Math.max(SEA.surface + 0.3, f.y + v.y * DT);
    if (s.snagged) {
        x = s.hook.x;
        y = s.hook.y;
    }
    // reeling takes line in, easing lets it out, and the line holds the fish at its length
    if (reeling && !s.snagged) s.out = Math.max(1, s.out - FISHING.reel.value * DT);
    if (easing) s.out += FISHING.reel.value * 0.8 * DT;
    const dx = x - TIP.x,
        dy = y - TIP.y,
        d = Math.hypot(dx, dy),
        held = d >= s.out * 0.98;
    if (d > s.out && d > 1e-9) {
        x = TIP.x + (dx / d) * s.out;
        y = Math.max(SEA.surface + 0.3, TIP.y + (dy / d) * s.out);
    }
    if (!s.snagged) {
        f.x = x;
        f.y = Math.max(SEA.surface - 0.4, y);
        f.dir = v.x < 0 ? -1 : 1;
        s.hook = { x: f.x - f.dir * 0.3, y: f.y };
    }
    // the fish's pull when it runs against a line held at its length, and reeling's own pull on top
    const want2 =
        held || s.snagged
            ? (f.runTo ? 0.7 + heavy * 0.3 : 0.25 + heavy * 0.2) +
              (reeling ? 0.45 : 0) +
              (s.snagged && reeling ? 0.6 : 0) -
              (easing ? 0.6 : 0)
            : 0.1;
    s.tension += (Math.max(0, want2) - s.tension) * Math.min(1, 8 * DT);
    // reeled carelessly through the weed, the hook snags; easing off frees it
    if (!s.snagged && reeling && s.tension > 0.7 && inWeed(s, s.hook)) {
        s.snagged = true;
        tell(s, "Snagged in the weed. Ease the line to free it.");
        out.push({ cue: "bump" });
    }
    if (s.snagged && easing) {
        s.ease += DT;
        if (s.ease > 0.5) {
            s.snagged = false;
            s.ease = 0;
            tell(s, "Free of the weed.");
        }
    } else s.ease = 0;
    if (s.tension > 1) s.strain += DT;
    else s.strain = Math.max(0, s.strain - DT * 2);
    if (s.strain > FISHING.snap.value) {
        s.snaps++;
        scatter(s, f, 3);
        tell(
            s,
            "Snap. The line was pulled too tight and the fish swam off. Ease off when it runs.",
        );
        out.push({ cue: "crash" }, { shake: 0.3 });
        reset(s);
        return;
    }
    // near enough, it is swung up out of the water onto the scale
    if (f.y < SEA.surface + 1.2 && f.x < SEA.left + 3) land(s, i, out);
}

const panSpot = (slot: number): Pt => ({
    x: PAN.x - 0.9 + (slot % 3) * 0.9,
    y: PAN.y - 0.4 - Math.floor(slot / 3) * 0.5,
});

function land(s: FishState, i: number, out: Happening[]): void {
    const f = s.fish[i];
    if (!f) return;
    const full = s.pan.length >= s.L.holds;
    f.mood = "air";
    const to = full ? { x: SEA.left + 3, y: SEA.surface + 0.5 } : panSpot(s.pan.length);
    const l = lob({ x: f.x, y: f.y }, to, G, 3);
    s.flights.push({
        fish: i,
        from: { x: f.x, y: f.y },
        v: l.v,
        t: 0,
        T: l.t,
        to: full ? "sea" : "pan",
    });
    if (full) tell(s, "The pan is full. Throw a fish back to make room.");
    out.push({ cue: "lift" }, { burst: { kind: "splash", x: f.x, y: SEA.surface, n: 12 } });
    s.phase = "landing";
    s.float = { ...HANG };
    s.hook = { ...HANG };
    s.tension = 0;
    s.strain = 0;
    s.snagged = false;
    s.line = line(TIP, HANG, 1.6, 12);
}

function stepFlights(s: FishState, out: Happening[]): void {
    for (const fl of s.flights) {
        fl.t += DT;
        const f = s.fish[fl.fish];
        if (!f) continue;
        const p = flightAt(fl.from, fl.v, G, Math.min(fl.t, fl.T));
        f.x = p.x;
        f.y = p.y;
        if (fl.t < fl.T) continue;
        s.flights = s.flights.filter((x) => x !== fl);
        if (fl.to === "sea") {
            f.mood = "flee";
            f.timer = 1;
            f.cool = 2;
            f.y = SEA.surface + 0.5;
            out.push(
                { cue: "splash" },
                { burst: { kind: "splash", x: f.x, y: SEA.surface, n: 6 } },
            );
            continue;
        }
        f.mood = "pan";
        s.pan.push(fl.fish);
        out.push({ cue: "place" });
        const sum = total(s),
            L = s.L;
        if (Math.abs(sum - L.target) < 1e-6) {
            s.won = true;
            tell(s, L.done);
            out.push({ cue: "win" }, { burst: { kind: "sparkle", x: PAN.x, y: PAN.y - 2, n: 14 } });
        } else if (sum > L.target)
            tell(
                s,
                `${words(L.units, sum)} is more than ${words(L.units, L.target)}. Throw one back.`,
            );
        else if (s.pan.length >= L.holds)
            tell(s, `${words(L.units, sum)}, and the pan is full. Throw one back and try another.`);
        else tell(s, `${words(L.units, sum)} so far. ${words(L.units, L.target - sum)} to go.`);
    }
    if (s.phase === "landing" && !s.flights.length) s.phase = "ready";
}

export function step(s: FishState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.ripples = s.ripples.map((r) => ({ ...r, age: r.age + DT })).filter((r) => r.age < 2.2);
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    s.goFor = pad.go ? s.goFor + DT : 0;
    switch (s.phase) {
        case "fly":
            flyFloat(s, out);
            break;
        case "wait":
            sinkHook(s);
            // held, the big button or a finger on the rod reels the float back in to cast again
            if (s.goFor > 0.3) {
                s.float = { x: s.float.x - FISHING.reel.value * 1.4 * DT, y: SEA.surface };
                s.hook = { x: s.float.x, y: s.hook.y };
                s.still = 0;
                if (s.float.x < SEA.left - 0.5) reset(s);
            }
            break;
        case "fight":
            fight(s, pad, out);
            // a fish fighting on the hook trails bubbles, more as the line pulls tighter
            if (s.phase === "fight" && s.steps % (s.tension > 0.6 ? 8 : 14) === 0)
                out.push({ burst: { kind: "bubble", x: s.hook.x, y: s.hook.y, n: 2 } });
            break;
        default:
            break;
    }
    swimFish(s, out);
    stepFlights(s, out);
    s.needle += (total(s) - s.needle) * Math.min(1, 5 * DT);
    const end =
        s.phase === "fight"
            ? s.hook
            : s.phase === "ready" || s.phase === "held" || s.phase === "landing"
              ? HANG
              : s.float;
    stepLine(s.line, TIP, end, { g: 18, dt: DT, drag: 2.5 });
    if (s.phase === "fight") s.line.length = Math.max(1, s.out);
    return out;
}

/** How hard the rod bends, from nought to about one, as the line pulls. */
const bendOf = (s: FishState): number =>
    s.phase === "fight" ? Math.min(1.2, s.tension) : s.phase === "wait" ? 0.08 : 0;

function fishSprite(s: FishState, f: Fish, rest: boolean): Sprite {
    const sh = shapeOf(s.L, f.kind),
        k = s.L.kinds[f.kind],
        t = s.steps * DT;
    const small = f.mood === "pan" || f.mood === "air";
    const wriggle = f.mood === "hooked" && !rest ? Math.sin(t * 20) * 0.3 : 0;
    return {
        key: f.key,
        art: "fish",
        params: {
            size: sh.box,
            tone: sh.tone,
            tag: k?.tag ?? "",
            gape:
                f.mood === "nibble" || f.mood === "bite" || f.mood === "hooked" || f.mood === "air",
            facing: f.dir < 0 ? -1 : 1,
        },
        size: small ? Math.min(2.2, sh.size) : sh.size,
        x: f.x,
        y: f.y,
        angle: f.mood === "hooked" ? f.dir * -0.5 + wriggle : f.mood === "air" ? t * 6 : 0,
        z: f.mood === "pan" ? 23 : f.mood === "air" || f.mood === "hooked" ? 50 : 30,
        seed: 30 + f.kind,
    };
}

export function frame(s: FishState, rest = false): Frame {
    const L = s.L,
        t = s.steps * DT,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (const [k, [x, y, size]] of (
        [
            [8, 3, 5],
            [30, 2.2, 6],
            [46, 3.6, 4],
        ] as const
    ).entries())
        sprites.push({
            key: `cloud:${k}`,
            art: "cloud",
            params: { puffs: 3 + k, rain: 0 },
            seed: 11 + k,
            size,
            x,
            y,
            z: 1,
            depth: 0.6,
            still: true,
        });
    if (L.spot === "sea")
        sprites.push(
            {
                key: "coral",
                art: "coral",
                params: { fans: 2, spawn: 0 },
                size: 6,
                x: 48,
                y: BED + 1,
                stand: true,
                z: 12,
                still: true,
                seed: 6,
            },
            {
                key: "star",
                art: "starfish",
                params: { count: 1, arms: 5 },
                size: 2,
                x: 24,
                y: BED + 1.1,
                stand: true,
                z: 12,
                still: true,
                seed: 8,
            },
        );
    else
        sprites.push({
            key: "reeds",
            art: "reeds",
            params: { stems: 7, lean: -0.15 },
            size: 3.5,
            x: SEA.world.w - 2,
            y: SEA.surface + 0.4,
            stand: true,
            z: 11,
            still: true,
            seed: 7,
        });
    L.weeds.forEach((w, k) =>
        sprites.push({
            key: `weed:${k}`,
            art: "pondweed",
            params: { fronds: w.fronds, tall: w.tall },
            x: w.x,
            y: BED + 1,
            stand: true,
            z: 13,
            seed: 60 + k,
        }),
    );
    sprites.push(
        {
            key: "jetty",
            art: "jetty",
            params: { posts: 4 },
            size: 10 * JK,
            x: JETTY.x,
            y: JETTY.top + 4 * JK,
            stand: true,
            z: 20,
            still: true,
            seed: 3,
        },
        {
            key: "scale",
            art: "catchscale",
            params: {
                ...L.dial,
                value: Math.round((rest ? total(s) : s.needle) * 1000) / 1000,
                mark: L.target,
            },
            size: 6 * SK,
            x: PAN.x,
            y: DECK,
            stand: true,
            z: 21,
            live: true,
            seed: 5,
        },
        {
            key: "charlie",
            art: "charlie",
            params: {
                pose: s.won ? "cheer" : "hold",
                mood: s.won
                    ? "excited"
                    : s.phase === "fight" && s.tension > 0.8
                      ? "surprised"
                      : "happy",
                hair: "ponytail",
                top: "mint",
                sleeves: "short",
                print: "star",
                wear: "shorts",
                bottom: "sky",
                pattern: "plain",
                feet: "boots",
            },
            x: HANDS.x,
            y: DECK,
            stand: true,
            z: 25,
            seed: 14,
        },
    );
    for (const f of s.fish)
        if (f.mood !== "air" || s.flights.some((fl) => s.fish[fl.fish] === f))
            sprites.push(fishSprite(s, f, rest));
    // the rod bends as the line pulls, which is how a child reads how tight it is
    const bend = bendOf(s),
        tip = { x: TIP.x - bend * 1.2, y: TIP.y + bend * 1.6 };
    if (!s.won) marks.push({ kind: "line", a: HANDS, b: tip, bend: bend * 0.9, style: "rod" });
    const pts = s.line.pts;
    const strained = s.phase === "fight" && s.tension > 0.85;
    for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k],
            b = pts[k + 1];
        if (a && b)
            marks.push({
                kind: "line",
                a: k === 0 ? tip : a,
                b,
                style: strained ? "ink" : "thin",
            });
    }
    const bite = engaged(s),
        f = s.fish[bite];
    const bob =
        rest || !f
            ? 0
            : f.mood === "nibble"
              ? Math.abs(Math.sin(t * 16)) * 0.35
              : f.mood === "bite"
                ? 0.9
                : 0;
    // waiting, the float rides the drawn surface, waves, ripples and all
    const water = waterOf(s);
    const float =
        s.phase === "wait"
            ? { x: s.float.x, y: (rest ? SEA.surface : surfaceAt(water, s.float.x, t)) + bob }
            : s.float;
    if (s.phase !== "fight")
        sprites.push({
            key: "float",
            art: "tackle",
            params: { part: "float" },
            size: 1,
            x: float.x,
            y: float.y,
            z: 42,
            seed: 15,
        });
    if (s.phase === "wait" || s.phase === "fight") {
        if (s.phase === "wait")
            marks.push({
                kind: "line",
                a: { x: float.x, y: float.y + 0.9 },
                b: { x: s.hook.x, y: s.hook.y - 0.8 },
                style: "thin",
            });
        sprites.push({
            key: "hook",
            art: "tackle",
            params: { part: "hook" },
            size: 1,
            x: s.hook.x,
            y: s.hook.y,
            z: 32,
            seed: 16,
        });
        if (s.phase === "wait" && !rest && Math.abs(s.hook.y - s.depth) > 0.05)
            marks.push({ kind: "ring", x: float.x, y: s.depth, r: 0.5 });
    }
    // the aim: the first part of the throw in dots, from the rod's tip
    if (!s.won && (s.phase === "held" || (s.phase === "ready" && s.touched))) {
        const v = launchOf(s.phase === "held" && s.pull ? aimOfPull(s.pull, CAST) : s.aim);
        marks.push({ kind: "dots", pts: arc(TIP, v, G, { seconds: 0.35, every: 0.05 }) });
    }
    if (!s.touched && s.phase === "ready")
        marks.push({ kind: "ring", x: HANG.x, y: HANG.y, r: 1.3 });
    return {
        sprites,
        marks,
        camera: { x: SEA.world.w / 2, y: SEA.world.h / 2, zoom: 1 },
        view: { ...SEA.view },
        world: { ...SEA.world },
        time: t,
        water: [water],
    };
}

export function say(s: FishState): string {
    const L = s.L;
    const pan = s.pan.length
        ? `On the pan: ${s.pan.map((i) => L.kinds[s.fish[i]?.kind ?? 0]?.tag ?? "").join(", ")}, and the scale reads ${words(L.units, total(s))}.`
        : "The pan is empty.";
    const f = s.fish[engaged(s)] ?? s.fish[hooked(s)];
    const now: Record<Phase, string> = {
        ready: "The float hangs from the rod.",
        held: "The float is pulled back.",
        fly: "The float is flying.",
        wait: f
            ? f.mood === "bite"
                ? "The float has gone under."
                : "The float is bobbing."
            : `The hook is ${s.hook.y < SEA.surface + 5 ? "near the top" : s.hook.y > BED - 5 ? "near the bottom" : "halfway down"}.`,
        fight: `A fish is on the line${s.snagged ? ", snagged in the weed" : ""}. The line is ${s.tension > 0.85 ? "very tight" : s.tension > 0.5 ? "tight" : "slack"}.`,
        landing: "A fish is flying up onto the scale.",
    };
    const tags = s.fish
        .filter((x) => x.mood !== "pan" && x.mood !== "air")
        .map((x) => L.kinds[x.kind]?.tag ?? "");
    return [
        s.said,
        pan,
        s.won ? "" : `Target ${words(L.units, L.target)}. ${now[s.phase]}`,
        s.won ? "" : `Fish in the water: ${tags.join(", ")}.`,
    ]
        .filter(Boolean)
        .join(" ");
}

export const fishingGame: ActionGame<FishState> = {
    id: "fish",
    title: "Gone fishing",
    group: "action",
    quiet: true,
    levels: FISH_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "fish", params: { size: 4, tone: "sky", tag: "5", gape: false, facing: 1 } },
    hint: "Pull back from the float and let go to cast; hold a finger in the water to set the depth. When the float goes under, tap to strike. Hold to reel and let go when the fish runs, or the line snaps. Keys: arrows aim, space casts and strikes, hold space to reel, hold down to ease.",
    controls: { go: "Cast / reel", brake: "Ease the line" },
    start: (level, seed) => startFishing(FISH_LEVELS[level] ?? FISH_LEVELS[0], level, seed ?? 1),
    step,
    frame,
    say,
    back,
    cancelInput(s) {
        if (s.phase === "held") s.phase = "ready";
        s.pull = null;
        s.grab = null;
        s.pressAt = null;
    },
    tuning: FISHING,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.won ? 1 : 0, total: 1 }),
    still: {
        press: () => Math.round(RATE / 4),
        // a cast, a hook going down, a fish coming and nibbling and a catch in the air all play out; a
        // bite waits for the strike and a fight for the reel
        settling: (s) =>
            s.phase === "fly" ||
            s.phase === "landing" ||
            s.flights.length > 0 ||
            (s.phase === "wait" &&
                (Math.abs(s.hook.y - s.depth) > 1e-3 ||
                    s.fish.some((f) => f.mood === "come" || f.mood === "nibble"))),
    },
};

/** The fish still to catch to make a target: a set of kinds whose weights add up to what is left, no more of each than swim. */
export function needed(s: FishState): number[] | null {
    const left = Math.round((s.L.target - total(s)) * 1000) / 1000,
        room = s.L.holds - s.pan.length;
    const pool = s.fish
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => f.mood !== "pan" && f.mood !== "air");
    const find = (from: number, want: number, slots: number): number[] | null => {
        if (Math.abs(want) < 1e-6) return [];
        if (slots === 0 || want < 0) return null;
        for (let k = from; k < pool.length; k++) {
            const p = pool[k];
            if (!p) continue;
            const rest = find(k + 1, Math.round((want - valueOf(s, p.i)) * 1000) / 1000, slots - 1);
            if (rest) return [p.i, ...rest];
        }
        return null;
    };
    return left < 0 ? null : find(0, left, room);
}
