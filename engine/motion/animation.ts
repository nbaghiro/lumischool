// How a drawing moves when nothing is happening: the animation principles as numbers, a small set
// of primitives as pure functions of time, and the rules every declaration keeps. Nothing here
// touches the page, so node tests it; engine/ui/animate.ts plays it on any page that asks, and each
// drawing declares its own (engine/parts/drawing.ts). The reasoning is in .docs/animation.md.
//
// Units. A whole drawing's travel (`lift`, `dx`) is a share of its larger side, so the same
// declaration reads the same on a 60 px tile and a 400 px hero; a part's travel is in the drawing's
// own units, 20 to a square, because a part lives inside the drawing and grows with it. Turns are
// degrees. Periods and gaps are seconds.

export const PRIMITIVES = [
    "breathe",
    "bob",
    "sway",
    "float",
    "drift",
    "hop",
    "wiggle",
    "stir",
    "blink",
    "flap",
    "spin",
    "twinkle",
    "flow",
    "idle",
] as const;
export type Primitive = (typeof PRIMITIVES)[number];

/** One movement: a primitive and whichever of its settings differ from the tuned defaults. */
export interface Move {
    is: Primitive;
    /** A loop's length, or the mean gap between moments, in seconds. */
    period?: number;
    /** A turn either way, in degrees. */
    deg?: number;
    /**
     * Where a sway swings between, as shares of `deg`, when it is not evenly either side: a flag on a
     * string flutters from -1 to 0.3, a kite's tail streams downwind from -1.6 to -0.2.
     */
    range?: [number, number];
    /**
     * Bend from the foot instead of turning about it: the top leans and the ground line stays level,
     * as a tree or a flower moves in wind. A sway only.
     */
    bend?: boolean;
    /** Travel upward: a share of the drawing's larger side, or drawing units for a part. */
    lift?: number;
    /** Travel sideways, in the same units as `lift`. */
    dx?: number;
    /** A change of size, as a share: 0.04 grows by four per cent. */
    amt?: number;
    /** How far a bob strays sideways as it rises, as a share of the lift, so it travels on an arc. */
    arc?: number;
    /** Squash on landing and stretch on take-off, as a share of the height. */
    squash?: number;
    /** How far a light dims, as a share of full. */
    dim?: number;
    /** Seconds for one turn of a spinning part. */
    rev?: number;
    /** How many ways round a spinning part looks the same, so it can come to rest on any of them. */
    symmetry?: number;
    /** Seconds for one wing beat, and how many beats make a burst. */
    beat?: number;
    burst?: number;
    /** How many swings a wiggle has before it dies away. */
    cycles?: number;
    /**
     * Where it turns or grows from. For a whole drawing, shares of its box ([0.5, 1] is the middle
     * of its feet); for a part, drawing units, and a part drawn in code brings its own.
     */
    pivot?: [number, number];
    /** How far this part trails the drawing's own loop, as a share of the period: follow-through. */
    lag?: number;
    /** Seconds between one copy of a repeated part and the next, so a wave runs along a row. */
    wave?: number;
    /** `lift` and `dx` are drawing units even for a whole drawing, as the harbour's declarations are. */
    units?: boolean;
}

export interface PartMove extends Move {
    /**
     * For a hand-drawn file with no groups of its own: its drawn elements by the order the file draws
     * them, one list per copy of the part (three flags are three lists).
     */
    of?: number[][];
    /** `of` counts only the file's paths, as src/art/motion.ts does. */
    paths?: boolean;
    /** Where a hand-drawn part turns from, as shares of the part's own box, when one pivot will not do for every copy. */
    origin?: [number, number];
    /** A selector for a part the drawing already tags another way, such as a guide's `.g-flutter`. */
    pick?: string;
    /** Moves on a drawing that carries a reading, because it is not the reading (the sky's clouds, never its moon). */
    free?: boolean;
}

/** Heavier things move slower and less. */
export type Weight = "light" | "normal" | "heavy";

/** What a drawing does when a child taps it in a world. Nothing ever needs a tap, and nothing counts one. */
export type React =
    | { kind: "flash"; at: string }
    | { kind: "step"; by: number }
    | { kind: "dip"; deg: number }
    | { kind: "hop"; by: number }
    | { kind: "gust" };

/** Puffs of smoke from an anchor, every `every` seconds, rising `rise` and carried `drift` downwind, in world units. */
export interface Puff {
    at: string;
    every: number;
    rise: number;
    drift: number;
}

/** How a drawing moves, declared once. Everything is optional; nothing at all means still. */
export interface Animation {
    /** The whole drawing's movement; a second one is a secondary action on top of the first. */
    body?: Move | Move[];
    parts?: Record<string, PartMove>;
    /** Why it is still. A drawing with a reason and no motion is still on purpose, not forgotten. */
    still?: string;
    weight?: Weight;
    /**
     * What a world adds around the drawing: the answer to a tap, and smoke from an anchor. Declared on
     * the drawing like the rest, and played by the world's own player (world.ts).
     */
    react?: React;
    puff?: Puff;
}

/**
 * A pose: travel, a turn about the pivot, a lean (a shear that keeps the pivot's line where it is),
 * a size in each direction and an opacity. Rest is the drawing as drawn.
 */
export interface Pose {
    x: number;
    y: number;
    r: number;
    k: number;
    sx: number;
    sy: number;
    o: number;
    px?: number;
    py?: number;
}
export const REST: Readonly<Pose> = Object.freeze({ x: 0, y: 0, r: 0, k: 0, sx: 1, sy: 1, o: 1 });

/**
 * The tuned defaults, one set per primitive. Most loops take three to four and a half seconds; a
 * float and a drift, which carry a whole drawing on water or across a sky, are slower. The first
 * moment of every moment primitive comes within two seconds of waking, so something can be seen
 * within two or three seconds of looking, which the test checks for every drawing; see "Timing" in
 * .docs/animation.md.
 */
export const DEFAULTS: Record<Primitive, Required<Pick<Move, "period">> & Move> = {
    breathe: { is: "breathe", period: 3.4, amt: 0.045, pivot: [0.5, 1] },
    bob: { is: "bob", period: 3.1, lift: 0.045, arc: 0.45, deg: 1.6, pivot: [0.5, 1] },
    sway: { is: "sway", period: 3.9, deg: 3.2, pivot: [0.5, 1] },
    float: { is: "float", period: 7.4, lift: 0.05, dx: 0, deg: 3, pivot: [0.5, 0.85] },
    drift: { is: "drift", period: 7.2, dx: 0.06, lift: 0.012 },
    hop: { is: "hop", period: 4.2, lift: 0.11, squash: 0.1, pivot: [0.5, 1] },
    wiggle: { is: "wiggle", period: 4.4, deg: 7, cycles: 3, pivot: [0.5, 1] },
    stir: { is: "stir", period: 4.8, deg: 1.6, lift: 0.03, pivot: [1, 1] },
    blink: { is: "blink", period: 3.9, amt: 0.9 },
    flap: { is: "flap", period: 3.4, deg: 24, beat: 0.36, burst: 3 },
    spin: { is: "spin", period: 20, rev: 20, symmetry: 1 },
    twinkle: { is: "twinkle", period: 2.9, dim: 0.42, amt: 0.14 },
    flow: { is: "flow", period: 3.3, dx: 5, lift: 0 },
    idle: { is: "idle", period: 3.6, amt: 0.035, deg: 2.6, pivot: [0.5, 1] },
};

/** Which primitives are moments: nothing between them, one now and then, never on a beat. */
export const MOMENTS = new Set<Primitive>(["hop", "wiggle", "stir", "blink", "flap"]);

/**
 * The limits nothing may pass, whatever a declaration, a use site's intensity or the size of the
 * drawing asks for. The test holds every declaration to them; the player clamps to them as well.
 */
export const LIMITS = {
    /** A whole drawing's turn either way, and a part's, in degrees. */
    bodyDeg: 7,
    partDeg: 40,
    /** A whole drawing's travel, in screen pixels. */
    px: 16,
    /** Size, either way. */
    scale: [0.88, 1.12] as const,
    /** Nothing dims further than this, so nothing flashes and a counted thing is never gone. */
    opacity: 0.5,
    /** A loop, in seconds: slow enough to be calm, quick enough to be seen. */
    loop: [1.4, 9] as const,
    /** The mean gap between moments, in seconds. */
    gap: [2.5, 12] as const,
    /** A spinning part takes at least this long a turn: a windmill, not machinery. */
    rev: 12,
    /** A light changes at most this often a second. WCAG's limit for flashing is three; we keep far under it. */
    changes: 0.8,
} as const;

/** How much a use site asks for. Calm for a parent's page, lively for a child's world at play. */
export type Intensity = "calm" | "normal" | "lively";
export const INTENSITY: Record<Intensity, number> = { calm: 0.65, normal: 1, lively: 1.45 };

const WEIGHT: Record<Weight, { period: number; amp: number }> = {
    light: { period: 0.82, amp: 1.12 },
    normal: { period: 1, amp: 1 },
    heavy: { period: 1.35, amp: 0.8 },
};

const TAU = Math.PI * 2;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const smooth = (u: number): number => {
    const x = clamp(u, 0, 1);
    return x * x * (3 - 2 * x);
};
const easeOut = (u: number): number => 1 - (1 - clamp(u, 0, 1)) ** 3;
const easeInOut = (u: number): number => {
    const x = clamp(u, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** A seed from a drawing's id and where it is placed, so the same drawing twice on a page never moves in step. */
export function seedOf(id: string, key: number | string = 0): number {
    let h = 0x811c9dc5;
    for (const ch of `${id}#${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
    return h >>> 0;
}

/** A number in [0, 1) from a seed and a counter: the same pair always gives the same number. */
export function hash(seed: number, n: number): number {
    let t = (seed + Math.imul(n + 1, 0x9e3779b9)) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * A drawing's own period and starting point in its loop. The period strays up to twelve per cent
 * either side of the declared one, so a row of the same drawing drifts apart instead of pulsing
 * together, and a given seed strays the same way every time.
 */
export function timing(
    m: Move,
    seed: number,
    weight: Weight = "normal",
): { period: number; phase: number } {
    const base = m.period ?? DEFAULTS[m.is].period;
    return {
        period: base * (0.88 + 0.24 * hash(seed, 1)) * WEIGHT[weight].period,
        phase: hash(seed, 2),
    };
}

/**
 * Where a run of moments is at time `t`: the seconds since the current one began, or -1 between
 * them. Time is cut into windows of `every` seconds with one moment at a seeded place in each, and
 * now and then a window is left empty, so the moments come irregularly (never on a beat, which is
 * what would read as a timer) and are still found without counting up from the start. The first
 * comes early, so a drawing just looked at does something soon.
 */
export function momentAt(t: number, seed: number, every: number, length: number): number {
    return momentIn(t, seed, every, length).tau;
}

/** The same, with which window the moment belongs to, so a choice made for it holds for the whole moment. */
function momentIn(
    t: number,
    seed: number,
    every: number,
    length: number,
): { tau: number; k: number } {
    if (t < 0) return { tau: -1, k: 0 };
    const k = Math.floor(t / every);
    for (let j = k; j >= Math.max(0, k - 1); j--) {
        if (j > 0 && hash(seed, 100 + j) < 0.14) continue;
        const start =
            j === 0
                ? 0.9 + 0.8 * hash(seed, 99)
                : j * every + hash(seed, 200 + j) * Math.max(0, every - length) * 0.85;
        const tau = t - start;
        if (tau >= 0 && tau < length) return { tau, k: j };
    }
    return { tau: -1, k };
}

const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

/** Two poses at once, the second on top of the first: a breath and a glance, a lift and a turn. */
export function combine(a: Pose, b: Pose): Pose {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        r: a.r + b.r,
        k: a.k + b.k,
        sx: a.sx * b.sx,
        sy: a.sy * b.sy,
        o: a.o * b.o,
        px: b.px ?? a.px,
        py: b.py ?? a.py,
    };
}

/** A pose `a` of the way from rest: the envelope that wakes and settles a drawing, and a use site's intensity. */
export function towards(p: Pose, a: number): Pose {
    return {
        x: p.x * a,
        y: p.y * a,
        r: p.r * a,
        k: p.k * a,
        sx: 1 + (p.sx - 1) * a,
        sy: 1 + (p.sy - 1) * a,
        o: 1 + (p.o - 1) * a,
        px: p.px,
        py: p.py,
    };
}

/** Squash and stretch that keeps the area: taller is thinner. */
const stretch = (s: number): Pick<Pose, "sx" | "sy"> => ({ sy: 1 + s, sx: 1 / (1 + s) });

/** A hop: a crouch before it (anticipation), up on an arc, a squash as it lands and a small bounce to finish (follow-through). */
function hopShape(tau: number, h: number, sq: number): Pose {
    const crouch = 0.16,
        air = 0.4,
        land = 0.1,
        rest = 0.3;
    if (tau < crouch) {
        const e = easeInOut(tau / crouch);
        return pose({ y: 0.12 * h * e, ...stretch(-sq * e) });
    }
    if (tau < crouch + air) {
        const s = (tau - crouch) / air;
        const st =
            s < 0.15
                ? -sq + 1.8 * sq * easeOut(s / 0.15)
                : 0.8 * sq * ((1 - s) / 0.85) ** 2 - 0.3 * sq * s ** 4;
        return pose({ y: 0.12 * h * (1 - s) - h * 4 * s * (1 - s), ...stretch(st) });
    }
    if (tau < crouch + air + land) {
        const s = (tau - crouch - air) / land;
        return pose({ ...stretch(-sq * (0.3 + 0.7 * Math.sin((Math.PI / 2) * s))) });
    }
    const s = clamp((tau - crouch - air - land) / rest, 0, 1);
    return pose({
        ...stretch(-sq * Math.cos((Math.PI / 2) * s) + 0.25 * sq * Math.sin(Math.PI * s) * (1 - s)),
    });
}
const HOP_LENGTH = 0.96;

/** A wag: a small swing the other way first, then a few swings that die away. */
function wiggleShape(tau: number, deg: number, cycles: number): number {
    const wind = 0.12,
        swing = 0.3,
        length = wind + cycles * swing;
    if (tau < wind) return -0.3 * deg * Math.sin((Math.PI * tau) / wind);
    const s = tau - wind;
    return (
        deg *
        Math.exp((-3 * s) / (length - wind)) *
        Math.sin((TAU * s) / swing) *
        (1 - (s / (length - wind)) ** 4)
    );
}
const wiggleLength = (cycles: number): number => 0.12 + cycles * 0.3;

/** A breeze lifting a sheet at one side: up, a moment held, and down with one small overshoot. */
function stirShape(tau: number): number {
    if (tau < 0.5) return easeOut(tau / 0.5);
    if (tau < 0.7) return 1;
    const s = (tau - 0.7) / 0.9;
    return Math.exp(-4 * s) * Math.cos(3 * Math.PI * s) * (1 - s ** 4);
}
const STIR_LENGTH = 1.6;

/** A blink: shut quickly, open a little slower. */
function blinkShape(tau: number): number {
    if (tau < 0.07) return easeInOut(tau / 0.07);
    if (tau < 0.1) return 1;
    return 1 - easeOut((tau - 0.1) / 0.12);
}
const BLINK_LENGTH = 0.22;

/** A look about: the head goes over, stays a moment and comes back. */
function glanceShape(tau: number): number {
    if (tau < 0.45) return easeInOut(tau / 0.45);
    if (tau < 1.15) return 1;
    return 1 - easeInOut((tau - 1.15) / 0.55);
}
const GLANCE_LENGTH = 1.7;

/**
 * A move's pose at `t` seconds after it woke, at full strength. `seed` places it in its loop and
 * places its moments; `turned` is the spin's own clock, which the player keeps (see `spinSettle`).
 * Every primitive is at rest at the start of its loop and between its moments.
 */
export function poseOf(
    m: Move,
    t: number,
    seed: number,
    weight: Weight = "normal",
    turned = t,
    forced = -1,
): Pose {
    const d = { ...DEFAULTS[m.is], ...m };
    const { period, phase } = timing(m, seed, weight);
    const tt = t - (d.lag ?? 0) * period;
    // a poke starts a moment now rather than waiting for the next one on the drawing's own schedule
    const moment = (
        at: number,
        s: number,
        every: number,
        length: number,
    ): { tau: number; k: number } =>
        forced >= 0 && forced < length
            ? { tau: forced, k: Math.floor(Math.max(0, at) / every) }
            : momentIn(at, s, every, length);
    const u = TAU * (tt / period + phase);
    const amp = WEIGHT[weight].amp;
    const deg = (d.deg ?? 0) * amp,
        lift = (d.lift ?? 0) * amp,
        dx = (d.dx ?? 0) * amp,
        amt = (d.amt ?? 0) * amp;
    const up = (1 - Math.cos(u)) / 2;
    switch (d.is) {
        case "breathe":
            return pose({ sy: 1 + amt * up, sx: 1 + amt * 0.3 * up });
        case "bob":
            return pose({
                y: -lift * up,
                x: (d.arc ?? 0) * lift * 0.5 * Math.sin(u),
                r: deg * 0.5 * Math.sin(u),
            });
        case "sway": {
            const [lo, hi] = d.range ?? [-1, 1],
                a = deg * ((lo + hi) / 2 + ((hi - lo) / 2) * Math.sin(u));
            return d.bend ? pose({ k: a }) : pose({ r: a });
        }
        case "float": {
            // afloat: a lift, a drift and a turn, each on its own period, so the three never fall into step
            const u2 = TAU * (tt / (period * 1.43) + hash(seed, 3)),
                u3 = TAU * (tt / (period * 1.21) + hash(seed, 4));
            return pose({
                y: (-lift / 2) * Math.sin(u),
                x: (dx / 2) * Math.sin(u2),
                r: deg * Math.sin(u3),
            });
        }
        case "drift":
            return pose({ x: dx * Math.sin(u), y: (-lift * (1 - Math.cos(2 * u))) / 2 });
        case "flow": {
            const fade = lift > 0 ? 0.35 : 0;
            return pose({ x: dx * Math.sin(u), y: -lift * up, o: 1 - fade * up });
        }
        case "twinkle": {
            const p = up * up;
            return pose({ o: 1 - (d.dim ?? 0) * p, sx: 1 - amt * p, sy: 1 - amt * p });
        }
        case "spin":
            return pose({ r: (360 * turned) / (d.rev ?? 20) });
        case "hop": {
            const { tau } = moment(tt, seed, period, HOP_LENGTH);
            return tau < 0 ? pose({}) : hopShape(tau, lift, (d.squash ?? 0) * amp);
        }
        case "wiggle": {
            const cycles = d.cycles ?? 3,
                { tau } = moment(tt, seed, period, wiggleLength(cycles));
            return pose({ r: tau < 0 ? 0 : wiggleShape(tau, deg, cycles) });
        }
        case "stir": {
            const { tau, k } = moment(tt, seed, period, STIR_LENGTH);
            if (tau < 0) return pose({});
            // the breeze comes from one side or the other, by the seed, so a page of sheets does not lift alike
            const left = hash(seed, 400 + k) < 0.5,
                v = stirShape(tau);
            return pose({ y: -lift * v, r: (left ? -deg : deg) * v, px: left ? 1 : 0, py: 1 });
        }
        case "blink": {
            const m2 = moment(tt, seed, period, BLINK_LENGTH + 0.34),
                k = m2.k;
            let tau = m2.tau;
            // now and then a blink comes twice, as eyes do
            const twice = hash(seed, 300 + k) < 0.3;
            if (tau >= BLINK_LENGTH) tau = twice && tau >= 0.34 ? tau - 0.34 : -1;
            const shut = tau < 0 ? 0 : blinkShape(tau) * (d.amt ?? 0.9);
            return pose({ sy: 1 - shut });
        }
        case "flap": {
            const beat = d.beat ?? 0.36,
                burst = d.burst ?? 3,
                { tau } = moment(tt, seed, period, beat * burst);
            if (tau < 0) return pose({});
            const b = (tau % beat) / beat;
            // up a little slower than down: the downstroke is the one that carries the bird
            const w = b < 0.55 ? easeInOut(b / 0.55) : 1 - easeInOut((b - 0.55) / 0.45);
            return pose({ r: -deg * w });
        }
        case "idle": {
            const breath = pose({ sy: 1 + amt * up, sx: 1 + amt * 0.3 * up });
            const { tau, k } = moment(tt, seed + 17, period * 2.1, GLANCE_LENGTH);
            const side = hash(seed, 500 + k) < 0.5 ? -1 : 1;
            // the glance is a lean from the feet, so a creature standing on a line leaves the line where it is
            return combine(breath, pose({ k: tau < 0 ? 0 : side * deg * glanceShape(tau) }));
        }
    }
}

/** How long waking and settling take, in seconds. A child's world settles slower than a shelf does. */
export const EASE = { wake: 0.8, settle: 1.2 } as const;

/** An amplitude on its way from one level to another, which is how a drawing wakes and settles without stopping mid-gesture. */
export interface Envelope {
    from: number;
    to: number;
    at: number;
    dur: number;
}
export const amplitudeAt = (e: Envelope, t: number): number =>
    e.from + (e.to - e.from) * smooth(e.dur > 0 ? (t - e.at) / e.dur : 1);

/**
 * The spin's clock: seconds of full-speed turning up to `t`, given the envelope that is scaling it.
 * A spinning part's angle is speed times this, so it speeds up as the drawing wakes and coasts as
 * it settles instead of winding backwards to rest. The integral of the smoothstep is closed form.
 */
export function turnedAt(e: Envelope, base: number, t: number): number {
    if (t <= e.at) return base;
    const x = e.dur > 0 ? Math.min(1, (t - e.at) / e.dur) : 1;
    const ramp = e.dur * (x ** 3 - x ** 4 / 2);
    const over = t > e.at + e.dur ? t - e.at - e.dur : 0;
    return base + e.from * e.dur * x + (e.to - e.from) * ramp + e.to * over;
}

/**
 * How long a settle has to take for a spinning part to come to rest looking exactly as drawn: the
 * next angle at which its symmetry repeats, at least `min` seconds of coasting ahead. A windmill of
 * four sails can stop on any quarter turn; a wheel drawn once round stops where it was drawn.
 */
export function spinSettle(
    turned: number,
    rev: number,
    symmetry: number,
    level: number,
    min: number = EASE.settle,
): number {
    if (level <= 0) return min;
    const step = rev / Math.max(1, symmetry);
    const coast = (level * min) / 2;
    const target = Math.ceil((turned + coast) / step - 1e-9) * step;
    return (2 * (target - turned)) / level;
}

/** The size a declaration is tuned at, in screen pixels along the drawing's larger side. */
export const REFERENCE = 160;

/**
 * How much more a small drawing moves, and how much less a large one, so a movement reads the same
 * on a thumbnail and across a hero. A lift of four per cent is under two pixels on a 40 px icon,
 * which nobody sees, and seventeen on a 420 px hero, which is too much.
 */
export const gainFor = (sizePx: number): number =>
    clamp((REFERENCE / Math.max(8, sizePx)) ** 0.35, 0.7, 1.6);

/**
 * A whole drawing's pose in its own pixels, with every limit applied. `zoom` is how many screen
 * pixels one of the drawing's own is, where a site draws on a stage scaled by a camera: the gain
 * follows the size on screen, and the cap on travel is screen pixels too, so a drawing far out moves
 * more of its own pixels and never more than the limit on screen. Elsewhere it is 1.
 */
export function onScreen(p: Pose, sizePx: number, part = false, zoom = 1): Pose {
    const g = gainFor(sizePx * zoom),
        k = part ? g : g * sizePx,
        cap = part ? Infinity : LIMITS.px / zoom,
        deg = part ? LIMITS.partDeg : LIMITS.bodyDeg;
    const [lo, hi] = LIMITS.scale;
    return {
        x: clamp(p.x * k, -cap, cap),
        y: clamp(p.y * k, -cap, cap),
        r: clamp(p.r * (part ? g : Math.min(g, 1.25)), -deg, deg),
        k: clamp(p.k * (part ? g : Math.min(g, 1.25)), -deg, deg),
        sx: clamp(1 + (p.sx - 1) * g, part ? 0.05 : lo, part ? 1.6 : hi),
        sy: clamp(1 + (p.sy - 1) * g, part ? 0.05 : lo, part ? 1.6 : hi),
        o: clamp(p.o, LIMITS.opacity, 1),
        px: p.px,
        py: p.py,
    };
}

/** A part's pose as an SVG matrix about its pivot, in drawing units: translate, then turn, lean and size about the pivot. */
export function matrixOf(
    p: Pose,
    pivot: [number, number],
): [number, number, number, number, number, number] {
    // a positive lean moves the top to the right, the way `skewX` of minus the lean does for a whole drawing
    const rad = (p.r * Math.PI) / 180,
        c = Math.cos(rad),
        s = Math.sin(rad),
        t = -Math.tan((p.k * Math.PI) / 180);
    const a = c * p.sx,
        b = s * p.sx,
        cc = (c * t - s) * p.sy,
        dd = (s * t + c) * p.sy;
    const [x0, y0] = pivot;
    return [a, b, cc, dd, p.x + x0 - (a * x0 + cc * y0), p.y + y0 - (b * x0 + dd * y0)];
}

export const isRest = (p: Pose, eps = 1e-9): boolean =>
    Math.abs(p.x) < eps &&
    Math.abs(p.y) < eps &&
    Math.abs(p.r) < eps &&
    Math.abs(p.k) < eps &&
    Math.abs(p.sx - 1) < eps &&
    Math.abs(p.sy - 1) < eps &&
    Math.abs(p.o - 1) < eps;

/**
 * A drawing that carries a reading (a clock, a scale, a thermometer, a price) never moves to a
 * different one. The rule, applied to its declaration before it plays: the whole drawing may travel
 * but never turn, grow, shrink or fade, and only a part that says it is not the reading may move at
 * all. A movement with no travel in it becomes a stir with the turn taken out.
 */
export function rigid(a: Animation): Animation {
    const one = (b: Move): Move =>
        b.is === "bob" || b.is === "float" || b.is === "drift" || b.is === "stir" || b.is === "hop"
            ? { ...b, deg: 0, amt: 0, squash: 0, arc: 0 }
            : {
                  is: "stir",
                  deg: 0,
                  lift: DEFAULTS.stir.lift,
                  period: MOMENTS.has(b.is) && b.period ? b.period : DEFAULTS.stir.period,
              };
    const out: Animation = {
        ...a,
        parts: Object.fromEntries(Object.entries(a.parts ?? {}).filter(([, p]) => p.free)),
    };
    if (a.body) out.body = Array.isArray(a.body) ? a.body.map(one) : one(a.body);
    return out;
}

/** A body's movements as a list, whether one was declared or several. */
export const movesOf = (a: Animation): Move[] =>
    a.body ? (Array.isArray(a.body) ? a.body : [a.body]) : [];

/**
 * How many drawings may move at once, adjusted each second from what the frames cost. Over budget,
 * the least important quarter settle; comfortably under it, one more may wake. `late` is the share
 * of frames that arrived later than one and a half of the display's own interval, which catches the
 * painting cost our own timing cannot see.
 */
export function nextCap(
    cap: number,
    ownMs: number,
    late: number,
    o: { min: number; max: number; ms: number },
): number {
    if (ownMs > o.ms || late > 0.25) return Math.max(o.min, Math.floor(cap * 0.75));
    if (ownMs < o.ms / 2 && late < 0.05) return Math.min(o.max, cap + 1);
    return cap;
}

/**
 * Which drawings get to move: the most important first, where importance is how much of the screen
 * a drawing takes and how near the middle it is. One already moving keeps a small advantage, so two
 * drawings of nearly equal claim do not take turns every second.
 */
export function choose<K>(
    cands: { key: K; weight: number; moving: boolean }[],
    cap: number,
): Set<K> {
    return new Set(
        [...cands]
            .sort((a, b) => b.weight * (b.moving ? 1.2 : 1) - a.weight * (a.moving ? 1.2 : 1))
            .slice(0, Math.max(0, cap))
            .map((c) => c.key),
    );
}

const places = (x: number): string =>
    Math.abs(x) < 5e-5 ? "0" : String(Math.round(x * 1e4) / 1e4);

/**
 * A whole drawing's pose as a CSS matrix about its top-left corner, for a drawing `w` by `h` pixels
 * on the page. It composes as `translate`, `rotate` and `scale` and then `transform: skewX()` do
 * about the pose's pivot, a share of the drawing, which is how the page wrote a pose one property at
 * a time.
 */
export function transformOf(
    p: Pose,
    w: number,
    h: number,
    pivot: readonly [number, number] = [0.5, 1],
): string {
    const rad = (p.r * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lean = -Math.tan((p.k * Math.PI) / 180);
    const a = cos * p.sx;
    const b = sin * p.sx;
    const c = lean * cos * p.sx - sin * p.sy;
    const d = lean * sin * p.sx + cos * p.sy;
    const ox = (p.px ?? pivot[0]) * w;
    const oy = (p.py ?? pivot[1]) * h;
    const e = ox + p.x - (a * ox + c * oy);
    const f = oy + p.y - (b * ox + d * oy);
    return `matrix(${[a, b, c, d, e, f].map(places).join(", ")})`;
}

/** The primitives that repeat exactly once a period, so a drawing making one of them loops on it. */
const LOOPS: ReadonlySet<Primitive> = new Set([
    "breathe",
    "bob",
    "sway",
    "drift",
    "flow",
    "twinkle",
]);

/** How much bigger a poke makes a drawing's movement `since` seconds after it: a little over twice, dying away over about two seconds. */
export function boostAt(since: number): number {
    if (since < 0 || since > 2.2) return 1;
    return 1 + 1.2 * Math.min(1, since / 0.15) * Math.exp(-since / 0.7);
}

/** Seconds a poke plays before a drawing's own cycle takes over again, by when its boost has died away. */
export const POKE = 2.4;

export type Keyframe = { offset: number; transform: string; opacity?: number };

/** A part inside a drawing: where it turns, in the drawing's own units, -1 when it is drawn mirrored, and how far it trails the first copy in a wave. */
export interface PartPlace {
    pivot: readonly [number, number];
    dir: number;
    lag: number;
}

/**
 * Movement as keyframes for the browser to play, sampled from `poseOf` at `rate` a second, with the
 * size rule and every limit applied as the page applies them. For a whole drawing each keyframe is a
 * CSS matrix about the drawing's top-left corner, and `w` and `h` are its size on the page in
 * pixels. With `part`, it is a part's matrix in the drawing's own units, about the part's pivot, with
 * a part's limits. `level` is the site's intensity.
 *
 * Without `window`, the keyframes are one cycle, to repeat for as long as the drawing moves. The cycle
 * is the loop's own period when the movement is one plain loop. Anything else (a float's three
 * periods, moments, an idle's glance) is sampled over `span` seconds, with its last second blended
 * into its first, so it repeats without a jump and its moments still come unevenly within it.
 *
 * With `window`, they are the `dur` seconds from `at` on the drawing's clock: waking from `from` of
 * full strength as the envelope does, and with a poke's boost and moment when `poked` is when the
 * poke came. They end on the pose the cycle shows at `at + dur`, where the cycle takes over.
 */
export function keyframesOf(
    moves: readonly Move[],
    o: {
        seed: number;
        weight?: Weight;
        w: number;
        h: number;
        level: number;
        rate?: number;
        span?: number;
        window?: { at: number; dur: number; from: number; poked?: number };
        part?: PartPlace;
        /** Screen pixels per pixel of the drawing's own, on a scaled stage (`onScreen`). */
        zoom?: number;
    },
): { duration: number; frames: Keyframe[] } {
    const weight = o.weight ?? "normal";
    const size = Math.max(o.w, o.h);
    const pivot = moves[0]?.pivot ?? [0.5, 1];
    const rate = o.rate ?? 30;
    const { part } = o;
    const lag = part?.lag ?? 0;
    const [only] = moves;
    const plain = moves.length === 1 && only !== undefined && LOOPS.has(only.is);
    const cycle = plain && only ? timing(only, o.seed, weight).period : (o.span ?? 60);
    const blend = plain ? 0 : Math.min(1, cycle / 10);
    const rawAt = (t: number, forced: number): Pose => {
        let raw: Pose = { ...REST };
        for (const m of moves) {
            raw = combine(raw, poseOf(m, t - lag, o.seed, weight, t - lag, forced));
        }
        return raw;
    };
    const onCycle = (t: number, forced = -1): Pose => {
        const c = ((t % cycle) + cycle) % cycle;
        const now = rawAt(c, forced);
        const into = c - (cycle - blend);
        if (into <= 0) return now;
        const u = into / blend;
        const s = u * u * (3 - 2 * u);
        const next = rawAt(c - cycle, forced);
        return {
            x: now.x + (next.x - now.x) * s,
            y: now.y + (next.y - now.y) * s,
            r: now.r + (next.r - now.r) * s,
            k: now.k + (next.k - now.k) * s,
            sx: now.sx + (next.sx - now.sx) * s,
            sy: now.sy + (next.sy - now.sy) * s,
            o: now.o + (next.o - now.o) * s,
            px: now.px,
            py: now.py,
        };
    };
    const zoom = o.zoom ?? 1;
    const shown = (raw: Pose, strength: number): Pose => {
        if (!part) return onScreen(towards(raw, strength), size, false, zoom);
        const q = onScreen(towards(raw, strength), size, true, zoom);
        return part.dir < 0 ? { ...q, r: -q.r } : q;
    };
    const written = (p: Pose): string => {
        if (!part) return transformOf(p, o.w, o.h, pivot);
        const [x, y] = part.pivot;
        return `matrix(${matrixOf(p, [x, y]).map(places).join(", ")})`;
    };
    const framesOf = (poses: readonly Pose[]): Keyframe[] => {
        const fades = poses.some((p) => p.o < 1);
        const last = Math.max(1, poses.length - 1);
        return poses.map((p, i) => ({
            offset: i / last,
            transform: written(p),
            ...(fades ? { opacity: Math.round(p.o * 1e4) / 1e4 } : {}),
        }));
    };
    if (o.window) {
        const { at, dur, from, poked } = o.window;
        const steps = Math.max(1, Math.round(dur * rate));
        const envelope = { from, to: 1, at, dur };
        const poses = Array.from({ length: steps + 1 }, (_, i) => {
            const t = at + (i / steps) * dur;
            const since = poked === undefined ? Infinity : t - poked;
            const forced = since >= 0 && since < 2 ? since : -1;
            const strength = o.level * amplitudeAt(envelope, t) * boostAt(since);
            return shown(onCycle(t, forced), strength);
        });
        return { duration: dur, frames: framesOf(poses) };
    }
    const steps = Math.max(1, Math.round(cycle * rate));
    const poses = Array.from({ length: steps }, (_, i) =>
        shown(onCycle((i / steps) * cycle), o.level),
    );
    const [head] = poses;
    if (head) poses.push(head);
    return { duration: cycle, frames: framesOf(poses) };
}
