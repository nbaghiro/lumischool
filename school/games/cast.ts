// Gone fishing: cast the float next to the fish you want, and weigh the catch on the scale.
//
// The child fishes from a jetty. A press on the float at the rod's tip, a pull back and a let go cast it
// on an arc, and where it lands goes with how far and which way it was pulled. The hook sinks from the
// float, and the first fish to reach it takes it, whichever fish that is, so a heavy fish deep down is
// reached only by landing the float where no lighter fish is swimming above it. A catch is reeled in and
// swung onto the scale's pan, which takes so many fish; the round is won when the pan is full and the
// needle reads the weight marked on the dial. A fish on the pan can always be pressed and thrown back,
// and a hook still sinking or lying on the bottom is reeled in with a tap. See .docs/games.md.
//
// It is stepped on the fixed loop from a seeded generator, so the same hands give the same sea.
import { arc, flightAt, landing, lob, throwOf, withinReach } from "../../engine/motion/flight";
import type { Pt } from "../../engine/motion/geometry";
import { seeded } from "../../engine/motion/spawn";
import { springAt } from "../../engine/motion/spring";
import { arrive } from "../../engine/motion/steer";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { crossing, type Eye } from "./scenery";

/** One kind of fish in the sea: its weight, how its tag writes it, and how many there are. */
interface Kind {
    value: number;
    tag: string;
    n: number;
}

export interface CastLevel extends ActionLevel {
    kinds: Kind[];
    /** The weight to make, and how many fish the scale's pan takes. */
    target: number;
    holds: number;
    dial: { max: number; step: number; unit: string };
    /** A weight in the words the sentence uses. */
    words: (v: number) => string;
    done: string;
    /** The line over the field until the first cast. */
    prompt: string;
    /** Seconds of the cast drawn in dots while pulling. */
    preview: number;
}

const grams = (v: number) => `${v} grams`;
const kilos = (v: number) =>
    `${String(Math.round(v * 100) / 100)} ${v === 1 ? "kilogram" : "kilograms"}`;
const plain = (v: number) => String(v);
const kinds = (values: number[], tag: (v: number) => string, twice: number[] = []): Kind[] =>
    values.map((v) => ({ value: v, tag: tag(v), n: twice.includes(v) ? 2 : 1 }));

export const CAST_LEVELS: Levels<CastLevel> = [
    {
        title: "Two that make ten",
        goal: "The pan holds 2 fish. Catch two that make 10.",
        grades: [1, 1],
        kinds: kinds([2, 3, 4, 5, 6, 7, 8], String, [5]),
        target: 10,
        holds: 2,
        dial: { max: 12, step: 2, unit: "" },
        words: plain,
        done: "The scale reads 10, and the pan is full.",
        prompt: "Pull back from the float and let go. Catch two fish that make 10.",
        preview: 0.45,
    },
    {
        title: "Three that make twenty",
        goal: "The pan holds 3 fish. Catch three that make 20.",
        grades: [1, 2],
        kinds: kinds([3, 5, 6, 7, 8, 9], String, [6, 7]),
        target: 20,
        holds: 3,
        dial: { max: 24, step: 4, unit: "" },
        words: plain,
        done: "The scale reads 20, and the pan is full.",
        prompt: "Catch three fish that make 20.",
        preview: 0.45,
    },
    {
        title: "One kilogram",
        goal: "Catch three fish that weigh 1 kilogram, 1000 grams, together.",
        grades: [2, 3],
        kinds: kinds([100, 250, 300, 400, 500, 600], (v) => `${v} g`, [250, 300]),
        target: 1000,
        holds: 3,
        dial: { max: 1200, step: 200, unit: "g" },
        words: grams,
        done: "One kilogram: the needle is on 1000 grams.",
        prompt: "Catch three fish that weigh 1000 grams together.",
        preview: 0.3,
    },
    {
        title: "Two and a half kilograms",
        goal: "Catch three fish that weigh 2.5 kilograms together.",
        grades: [3, 4],
        kinds: kinds([0.25, 0.5, 0.75, 1, 1.25, 1.5], (v) => `${v} kg`, [0.5, 1]),
        target: 2.5,
        holds: 3,
        dial: { max: 3, step: 0.5, unit: "kg" },
        words: kilos,
        done: "Two and a half kilograms, and the pan is full.",
        prompt: "Catch three fish that weigh 2.5 kilograms together.",
        preview: 0.45,
    },
    {
        title: "Three that make fifty",
        goal: "The pan holds 3 fish. Catch three that make 50.",
        grades: [2, 3],
        kinds: kinds([5, 10, 15, 20, 25, 30], String, [15, 20]),
        target: 50,
        holds: 3,
        dial: { max: 60, step: 10, unit: "" },
        words: plain,
        done: "The scale reads 50, and the pan is full.",
        prompt: "Catch three fish that make 50.",
        preview: 0.2,
    },
    {
        title: "A kilogram and a half in three",
        goal: "Catch three fish that weigh 1.5 kilograms together.",
        grades: [3, 4],
        kinds: kinds([0.25, 0.4, 0.5, 0.6, 0.75, 1], (v) => `${v} kg`, [0.5]),
        target: 1.5,
        holds: 3,
        dial: { max: 2, step: 0.5, unit: "kg" },
        words: kilos,
        done: "A kilogram and a half, and the pan is full.",
        prompt: "Catch three fish that weigh 1.5 kilograms together.",
        preview: 0.2,
    },
];

/** The casting's tuning table, read every step. */
export const CASTING = {
    pull: knob(5, 3, 7, 0.5, "squares", "a full pull fits between the float and the jetty's edge"),
    speed: knob(
        26,
        18,
        34,
        1,
        "squares a second",
        "a full pull at the best angle lands the float by the far side of the sea",
    ),
    minPull: knob(
        0.6,
        0.3,
        1.2,
        0.1,
        "squares",
        "anything shorter is a finger resting on the float, not a pull",
    ),
    sink: knob(
        2.4,
        1.2,
        4,
        0.1,
        "squares a second",
        "the hook passes a lane slowly enough for a fish there to see it",
    ),
    notice: knob(
        3,
        1.5,
        5,
        0.25,
        "squares",
        "a fish turns to the hook from about its own length away",
    ),
    reach: knob(
        0.8,
        0.4,
        1.4,
        0.05,
        "squares",
        "how near a fish's mouth comes to the hook when it takes it",
    ),
    reel: knob(
        8,
        4,
        12,
        0.5,
        "squares a second",
        "a catch comes up quickly, and a wait is never long",
    ),
    swim: knob(
        1.6,
        0.8,
        3,
        0.1,
        "squares a second",
        "the pace of a middling fish; small ones are quicker and big ones slower",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** Squares a second each second, for the float's cast and a fish in the air. */
export const G = 26;
/**
 * In squares. The sea's surface and its bed, where the fish swim across, and the jetty drawn 1.6 times
 * its box with its water line on the surface and its deck 1.15 of a square down its box, which the
 * shelf's drawing sets and a test holds.
 */
export const SEA = {
    world: { w: 52, h: 32 },
    view: { w: 46, h: 27 },
    surface: 13,
    deep: 18,
    left: 21,
    right: 50.5,
} as const;
export const BED = SEA.surface - 0.5 + SEA.deep - 1.7;
const JK = 1.6,
    JETTY = { x: 9, top: SEA.surface - 3.2 * JK };
export const DECK = JETTY.top + 1.15 * JK;
/** The scale stands on the deck drawn 4.6 squares across, so its pan is its CATCH.pan down a box of 8, scaled. */
const SK = 4.6 / 6;
export const PAN: Pt = { x: 5.8, y: DECK - 8 * SK + 1.05 * SK };
/** The child's hands, from the person drawing's own anchor in a pose that holds something, and the rod's tip. */
const HANDS: Pt = { x: 13.6, y: DECK - 6 + 3.035 };
export const TIP: Pt = { x: 19.4, y: 5.4 };
const BASKET = { x: 9.85, size: 3.4 };
const LANE = 1.3;
const SWING = { hz: 1.3, zeta: 0.34 };

type Phase = "rest" | "held" | "fly" | "sink" | "bed" | "reel";

interface Fish {
    key: string;
    kind: number;
    x: number;
    y: number;
    lane: number;
    dir: 1 | -1;
    speed: number;
    phase: number;
    /** Steps it will not look at the hook for, after it has been thrown back or has turned at an end. */
    cool: number;
    at: "sea" | "line" | "air" | "pan" | "basket";
}

interface Flight {
    fish: number;
    from: Pt;
    v: Pt;
    t: number;
    T: number;
    to: "pan" | "sea" | "basket";
    land: Pt;
}

export interface CastState {
    level: number;
    L: CastLevel;
    rnd: () => number;
    fish: Fish[];
    phase: Phase;
    /** The pull being held, from where the float was pressed, while the float is held. */
    pull: Pt | null;
    grab: Pt;
    float: Pt;
    cast: { from: Pt; v: Pt; t: number; T: number } | null;
    hook: Pt;
    line: number | null;
    /** The float on its way back to the rod's tip after a reel, and how far along. */
    home: { from: Pt; t: number } | null;
    flights: Flight[];
    pan: number[];
    needle: { from: number; to: number; at: number };
    hand: Pt | null;
    keyAim: { strength: number; deg: number } | null;
    /** Where the last two casts landed, left faint on the water. */
    landed: number[];
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    casts: number;
    won: boolean;
    wonAt: number;
}

/** Each kind's size follows its weight, and each kind swims a lane of its own, the lightest near the top and the heaviest near the bed. */
function shapeOf(
    L: CastLevel,
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
            2.4 +
            (values.length > 1 ? rank / (values.length - 1) : 0.5) * (BED - SEA.surface - 4.8);
    return {
        size,
        box: Math.max(2, Math.min(8, Math.round(size))),
        lane,
        tone: ["glow", "sky", "berry", "mint", "tang"][kind % 5] ?? "glow",
    };
}

export const mouthOf = (s: CastState, f: Fish): Pt => ({
    x: f.x + f.dir * shapeOf(s.L, f.kind).size * 0.45,
    y: f.y,
});
export const total = (s: CastState): number =>
    Math.round(
        s.pan.reduce((a, i) => a + (s.L.kinds[s.fish[i]?.kind ?? 0]?.value ?? 0), 0) * 1000,
    ) / 1000;
const full = (s: CastState) => s.pan.length >= s.L.holds;
const toPan = (s: CastState) => s.flights.some((f) => f.to === "pan");
/** Something the child started is still moving: the float, the hook, a fish in the air or the needle. */
const moving = (s: CastState) =>
    s.phase === "fly" ||
    s.phase === "sink" ||
    s.phase === "reel" ||
    s.flights.length > 0 ||
    s.home !== null;
const panSpot = (s: CastState, slot: number): Pt => ({
    x: PAN.x + (slot - (s.L.holds - 1) / 2) * 1.45,
    y: PAN.y - 0.55 - (slot % 2) * 0.3,
});
const restAt = (s: CastState): Pt => ({
    x: TIP.x + Math.sin((s.steps / RATE) * 1.4) * 0.08,
    y: TIP.y + 2.2,
});

export function start(level: number, seed = 1): CastState {
    const L = CAST_LEVELS[level] ?? CAST_LEVELS[0];
    const rnd = seeded(seed * 5003 + level * 29);
    const fish: Fish[] = [];
    L.kinds.forEach((k, kind) => {
        for (let n = 0; n < k.n; n++) {
            const sh = shapeOf(L, kind),
                lane = sh.lane + (rnd() - 0.5) * 0.4;
            fish.push({
                key: `fish:${kind}:${n}`,
                kind,
                x: SEA.left + 1 + rnd() * (SEA.right - SEA.left - 2),
                y: lane,
                lane,
                dir: rnd() < 0.5 ? 1 : -1,
                speed:
                    CASTING.swim.value *
                    (1.35 - (0.6 * (sh.size - 2.3)) / 2.7) *
                    (0.85 + rnd() * 0.3),
                phase: rnd() * 6,
                cool: 0,
                at: "sea",
            });
        }
    });
    const s: CastState = {
        level,
        L,
        rnd,
        fish,
        phase: "rest",
        pull: null,
        grab: { x: TIP.x, y: TIP.y + 2.2 },
        float: { x: TIP.x, y: TIP.y + 2.2 },
        cast: null,
        hook: { x: TIP.x, y: TIP.y + 2.2 },
        line: null,
        home: null,
        flights: [],
        pan: [],
        needle: { from: 0, to: 0, at: -999 },
        hand: null,
        keyAim: null,
        landed: [],
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        casts: 0,
        won: false,
        wonAt: -1,
    };
    return s;
}

function tell(s: CastState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** The reading the needle shows now, on its way to the new weight. */
export const needleAt = (s: CastState, rest = false): number =>
    rest
        ? s.needle.to
        : springAt(
              SWING,
              s.needle.from,
              s.needle.to,
              0,
              Math.max(0, (s.steps - s.needle.at) / RATE),
          ).x;

/** The steepest a cast goes, so the float stays in sight on its way up. */
const STEEP = (40 * Math.PI) / 180;

/** The throw a pull gives the float: straight back the way it was pulled, faster the further, and never steeper than STEEP. */
export function launchOf(pull: Pt): Pt {
    const v = throwOf(withinReach(pull, CASTING.pull.value), {
            most: CASTING.pull.value,
            speed: CASTING.speed.value,
        }),
        speed = Math.hypot(v.x, v.y);
    if (v.x <= 0 || Math.atan2(-v.y, v.x) <= STEEP) return v;
    return { x: Math.cos(STEEP) * speed, y: -Math.sin(STEEP) * speed };
}

/** Casts the float from the rod's tip at `v`, to come down where its arc meets the water. */
export function castWith(s: CastState, v: Pt, out: Happening[]): void {
    const from = { ...TIP },
        hit = landing(from, v, G, SEA.surface);
    s.cast = { from, v, t: 0, T: hit ? hit.t : 2 };
    s.phase = "fly";
    s.pull = null;
    s.casts++;
    s.touched = true;
    out.push({ cue: "lift" });
}

/** The float lands on the water at `x` and the hook starts to sink from it. */
export function plop(s: CastState, x: number, out: Happening[]): void {
    const at = Math.max(SEA.left - 1.5, Math.min(SEA.right + 0.5, x));
    s.float = { x: at, y: SEA.surface };
    s.hook = { x: at, y: SEA.surface + 0.6 };
    s.phase = "sink";
    s.cast = null;
    s.landed = [at, ...s.landed].slice(0, 2);
    out.push({ cue: "splash" }, { burst: { kind: "splash", x: at, y: SEA.surface, n: 6 } });
}

function reelIn(s: CastState, out: Happening[]): void {
    s.phase = "reel";
    s.line = null;
    out.push({ cue: "back" });
}

function throwBack(s: CastState, slot: number, out: Happening[]): void {
    const i = s.pan[slot],
        f = i === undefined ? undefined : s.fish[i];
    if (i === undefined || !f) return;
    const from = panSpot(s, slot);
    s.pan.splice(slot, 1);
    f.at = "air";
    s.needle = { from: needleAt(s), to: total(s), at: s.steps };
    const land = { x: SEA.left + 1 + s.rnd() * 4, y: SEA.surface + 0.5 },
        fl = lob(from, land, G, 2.5);
    s.flights.push({ fish: i, from, v: fl.v, t: 0, T: fl.t, to: "sea", land });
    tell(s, `Back it goes. The scale reads ${s.L.words(total(s))}.`);
    out.push({ cue: "back" });
}

function press(s: CastState, t: Pt, out: Happening[]): void {
    s.keyAim = null;
    if (!s.won && !toPan(s)) {
        const slot = s.pan.findIndex((i, n) => {
            const f = s.fish[i],
                at = panSpot(s, n);
            return f?.at === "pan" && Math.abs(t.x - at.x) <= 1.2 && Math.abs(t.y - at.y) <= 1.1;
        });
        if (slot >= 0) {
            throwBack(s, slot, out);
            return;
        }
    }
    if (s.phase === "sink" || s.phase === "bed") {
        reelIn(s, out);
        return;
    }
    if (s.phase !== "rest" || s.home || s.won || s.flights.length) return;
    const near =
        Math.hypot(t.x - s.float.x, t.y - s.float.y) <= 3 ||
        (t.y < SEA.surface && t.x < TIP.x + 3 && t.x > HANDS.x - 2);
    if (!near) return;
    if (full(s)) {
        tell(s, "The pan is full. Press a fish on the pan to throw it back.");
        out.push({ cue: "nope" });
        return;
    }
    s.phase = "held";
    s.grab = { ...s.float };
    s.pull = { x: 0, y: 0 };
    s.touched = true;
}

function hands(s: CastState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        const began = !s.hand;
        s.hand = { ...t };
        // A press that begins on the float, a fish on the pan or a hook in the water acts once; a held press only pulls.
        if (began) press(s, t, out);
        if (s.phase === "held")
            s.pull = withinReach({ x: t.x - s.grab.x, y: t.y - s.grab.y }, CASTING.pull.value);
    }
    if (pad.lifted) {
        if (s.phase === "held") {
            const p = s.pull ?? { x: 0, y: 0 },
                v = launchOf(p);
            if (Math.hypot(p.x, p.y) < CASTING.minPull.value || v.x < 0.5) {
                s.phase = "rest";
                s.pull = null;
            } else castWith(s, v, out);
        }
        s.hand = null;
    }
}

const keyPull = (a: { strength: number; deg: number }): Pt => {
    const r = (a.deg * Math.PI) / 180,
        d = a.strength * CASTING.pull.value;
    return { x: -Math.cos(r) * d, y: Math.sin(r) * d };
};

function keys(s: CastState, pad: Pad, out: Happening[]): void {
    if (pad.touch) return;
    for (const d of pad.pressed) {
        const a = s.keyAim ?? { strength: 0.6, deg: 40 };
        if (d === "left") a.strength = Math.round(Math.max(0.15, a.strength - 0.05) * 100) / 100;
        if (d === "right") a.strength = Math.round(Math.min(1, a.strength + 0.05) * 100) / 100;
        if (d === "up") a.deg = Math.min(70, a.deg + 5);
        if (d === "down") a.deg = Math.max(10, a.deg - 5);
        s.keyAim = a;
        s.touched = true;
    }
    if (!pad.tapped) return;
    if (s.phase === "sink" || s.phase === "bed") {
        reelIn(s, out);
        return;
    }
    if (s.phase !== "rest" || s.home || s.won || s.flights.length) return;
    if (full(s)) {
        tell(s, "The pan is full. Press Backspace to throw the last fish back.");
        out.push({ cue: "nope" });
        return;
    }
    castWith(s, launchOf(keyPull(s.keyAim ?? { strength: 0.6, deg: 40 })), out);
}

function arriveFlight(s: CastState, fl: Flight, out: Happening[]): void {
    const f = s.fish[fl.fish];
    if (!f) return;
    const L = s.L,
        w = L.words;
    if (fl.to === "sea") {
        f.at = "sea";
        f.x = fl.land.x;
        f.y = fl.land.y;
        f.cool = RATE * 4;
        f.dir = 1;
        out.push(
            { cue: "splash" },
            { burst: { kind: "splash", x: fl.land.x, y: SEA.surface, n: 8 } },
            { burst: { kind: "bubble", x: fl.land.x, y: SEA.surface + 1, n: 4 } },
        );
        return;
    }
    if (fl.to === "basket") {
        f.at = "basket";
        out.push({ cue: "place" });
        if (s.pan.every((i) => s.fish[i]?.at === "basket")) {
            // The pan is empty now and the needle has gone back to nought, so the line says where the catch is.
            tell(s, `The catch is in the basket, ${s.L.words(s.L.target)} in all.`);
            out.push(
                { cue: "win" },
                { burst: { kind: "sparkle", x: BASKET.x, y: DECK - BASKET.size * 0.6, n: 14 } },
            );
        }
        return;
    }
    f.at = "pan";
    s.pan.push(fl.fish);
    s.needle = { from: needleAt(s), to: total(s), at: s.steps };
    out.push({ cue: "place" }, { burst: { kind: "splash", x: PAN.x, y: PAN.y, n: 4 } });
    const now = total(s);
    if (full(s))
        tell(
            s,
            now === L.target
                ? L.done
                : `The scale reads ${w(now)}, and the pan is full. That is not ${w(L.target)}, so press a fish on the pan to throw it back.`,
        );
    else
        tell(
            s,
            `The scale reads ${w(now)}. ${L.holds - s.pan.length === 1 ? "One more fish" : `${L.holds - s.pan.length} more fish`} will fit on the pan.`,
        );
}

export function step(s: CastState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    const L = s.L,
        rnd = s.rnd;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    switch (s.phase) {
        case "rest": {
            if (s.home) {
                s.home.t += DT / 0.35;
                const k = Math.min(1, s.home.t),
                    to = restAt(s);
                s.float = {
                    x: s.home.from.x + (to.x - s.home.from.x) * k,
                    y: s.home.from.y + (to.y - s.home.from.y) * k - Math.sin(k * Math.PI) * 1.5,
                };
                if (k >= 1) s.home = null;
            } else s.float = restAt(s);
            s.hook = { ...s.float };
            break;
        }
        case "held":
            s.float = { x: s.grab.x + (s.pull?.x ?? 0), y: s.grab.y + (s.pull?.y ?? 0) };
            s.hook = { ...s.float };
            break;
        case "fly": {
            const c = s.cast;
            if (!c) {
                s.phase = "rest";
                break;
            }
            c.t += DT;
            s.float = flightAt(c.from, c.v, G, Math.min(c.t, c.T));
            s.hook = { ...s.float };
            if (c.t >= c.T || (s.float.x > SEA.right + 0.5 && s.float.y > SEA.surface - 3))
                plop(s, s.float.x, out);
            break;
        }
        case "sink":
            s.hook = { x: s.float.x, y: Math.min(BED - 0.5, s.hook.y + CASTING.sink.value * DT) };
            if (s.hook.y >= BED - 0.5) {
                s.phase = "bed";
                tell(s, "Nothing took the hook. Tap to reel it in.");
            }
            break;
        case "bed":
            break;
        case "reel": {
            s.hook = { x: s.float.x, y: s.hook.y - CASTING.reel.value * DT };
            const f = s.line === null ? undefined : s.fish[s.line];
            if (f) {
                f.x = s.hook.x - f.dir * shapeOf(L, f.kind).size * 0.45;
                f.y = s.hook.y + 0.3;
            }
            if (s.hook.y <= SEA.surface) {
                out.push(
                    { cue: "splash" },
                    { burst: { kind: "splash", x: s.hook.x, y: SEA.surface, n: f ? 10 : 4 } },
                );
                if (f && s.line !== null) {
                    f.at = "air";
                    const from = { x: s.hook.x, y: SEA.surface - 0.3 },
                        land = panSpot(s, s.pan.length),
                        fl = lob(from, land, G, 3);
                    s.flights.push({ fish: s.line, from, v: fl.v, t: 0, T: fl.t, to: "pan", land });
                }
                s.line = null;
                s.home = { from: { x: s.hook.x, y: SEA.surface }, t: 0 };
                s.phase = "rest";
            }
            break;
        }
    }
    for (const fl of s.flights) {
        fl.t += DT;
        if (fl.t >= fl.T) {
            s.flights = s.flights.filter((x) => x !== fl);
            arriveFlight(s, fl, out);
        }
    }
    // The fish swim their lanes and turn at the ends; the first to reach a sinking hook takes it.
    const hooked = s.line !== null ? s.fish[s.line] : undefined;
    for (const [i, f] of s.fish.entries()) {
        if (f.at !== "sea") continue;
        // A fish near one on the line swims clear of it, so the hooked fish and its number are never covered.
        if (hooked && hooked.at === "line" && Math.hypot(f.x - hooked.x, f.y - hooked.y) < 2.8) {
            const away = f.x >= hooked.x ? 1 : -1;
            f.dir = away;
            f.x += away * f.speed * 2.5 * DT;
            f.cool = Math.max(f.cool, RATE);
        }
        const mouth = mouthOf(s, f);
        f.phase += DT * 2.2;
        if (f.cool > 0) f.cool--;
        if (s.phase === "sink" && !full(s) && !toPan(s) && f.cool === 0) {
            const d = Math.hypot(s.hook.x - mouth.x, s.hook.y - mouth.y),
                ahead = f.dir * (s.hook.x - f.x) > 0;
            if (d <= CASTING.reach.value) {
                s.line = i;
                f.at = "line";
                s.phase = "reel";
                tell(s, `A bite: the ${L.kinds[f.kind]?.tag ?? ""} fish.`);
                out.push(
                    { cue: "lift" },
                    { burst: { kind: "bubble", x: s.hook.x, y: s.hook.y, n: 5 } },
                );
                continue;
            }
            if (d < CASTING.notice.value && ahead && Math.abs(s.hook.y - f.lane) < LANE) {
                const go = arrive(mouth, s.hook, f.speed * 1.6, 0.4);
                f.x += go.x * DT;
                f.y += go.y * DT;
                continue;
            }
        }
        f.x += f.dir * f.speed * DT;
        f.y += (f.lane + Math.sin(f.phase) * 0.35 - f.y) * Math.min(1, DT * 1.5);
        if ((f.x > SEA.right && f.dir > 0) || (f.x < SEA.left && f.dir < 0) || rnd() < 0.0015) {
            f.dir = f.dir > 0 ? -1 : 1;
            f.cool = Math.max(f.cool, RATE / 2);
        }
        f.x = Math.max(SEA.left - 2, Math.min(SEA.right + 2, f.x));
        f.y = Math.max(SEA.surface + 1, Math.min(BED - 0.8, f.y));
    }
    if (
        !s.won &&
        full(s) &&
        !s.flights.length &&
        total(s) === L.target &&
        s.steps - s.needle.at > RATE * 1.1
    ) {
        s.won = true;
        s.wonAt = s.steps;
        tell(s, L.done);
        out.push({ cue: "ring" }, { burst: { kind: "sparkle", x: PAN.x, y: PAN.y, n: 10 } });
    }
    // The finish: the catch is tipped from the pan into the basket, a fish at a time.
    if (s.won) {
        s.pan.forEach((i, slot) => {
            const f = s.fish[i];
            if (!f || f.at !== "pan" || s.steps - s.wonAt !== 42 + slot * 14) return;
            f.at = "air";
            const from = panSpot(s, slot),
                land = { x: BASKET.x + (slot - 1) * 0.5, y: DECK - BASKET.size * 0.52 },
                fl = lob(from, land, G, 1.5);
            s.flights.push({ fish: i, from, v: fl.v, t: 0, T: fl.t, to: "basket", land });
            s.needle = {
                from: needleAt(s),
                to:
                    Math.round(
                        s.pan
                            .filter((j) => s.fish[j]?.at === "pan")
                            .reduce((a, j) => a + (L.kinds[s.fish[j]?.kind ?? 0]?.value ?? 0), 0) *
                            1000,
                    ) / 1000,
                at: s.steps,
            };
        });
    }
    return out;
}

/** Throws the last fish on the pan back into the sea, when nothing is on its way to the pan and the round is not over. */
export function back(s: CastState): boolean {
    if (s.won || toPan(s) || !s.pan.length) return false;
    throwBack(s, s.pan.length - 1, []);
    return true;
}

export function frame(s: CastState, rest = false): Frame {
    const L = s.L,
        t = rest ? 0 : s.steps / RATE,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const eye: Eye = { cam: { x: SEA.world.w / 2, y: SEA.world.h / 2, zoom: 1 }, view: SEA.view };
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 21,
            size: 5,
            x: 30,
            y: 3.5,
            z: 1,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 22,
            size: 4,
            x: 44,
            y: 6,
            z: 1,
            still: true,
        },
    );
    const gull = rest
        ? null
        : crossing(
              {
                  key: "gull",
                  thing: { art: "gull", size: 2.4, params: { flying: 1 } },
                  every: 26,
                  takes: 11,
                  y: 3.5,
                  bob: 0.3,
                  z: 6,
                  seed: 3,
              },
              eye,
              t,
          );
    if (gull) sprites.push(gull);
    for (let x0 = 0; x0 < SEA.world.w; x0 += 18) {
        const across = Math.min(18, SEA.world.w - x0);
        sprites.push({
            key: `sea:${x0}`,
            art: "sea",
            params: { across, deep: SEA.deep, x0, bed: true },
            seed: 900 + x0,
            x: x0 + across / 2,
            y: SEA.surface - 0.5 + SEA.deep / 2,
            z: 10,
            still: true,
        });
    }
    sprites.push(
        {
            key: "coral",
            art: "coral",
            params: { fans: 2, spawn: 0 },
            size: 6,
            x: 44,
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
            x: 30,
            y: BED + 1.1,
            stand: true,
            z: 12,
            still: true,
            seed: 8,
        },
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
                value: (Math.round((needleAt(s, rest) / L.dial.max) * 480) / 480) * L.dial.max,
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
            key: "basket",
            art: "basket",
            params: { item: "apple", count: 0, label: "" },
            size: BASKET.size,
            x: BASKET.x,
            y: DECK,
            stand: true,
            z: 24,
            still: true,
            seed: 9,
        },
        {
            key: "fisher",
            art: "person",
            params: {
                pose: "hold",
                age: "child",
                tone: 3,
                hair: "short",
                colour: "brown",
                top: "tang",
                wear: "trousers",
            },
            x: HANDS.x,
            y: DECK,
            stand: true,
            z: 25,
            still: true,
            seed: 14,
        },
    );
    const fishSprite = (
        f: Fish,
        at: Pt,
        angle: number,
        flip: boolean,
        gape: boolean,
        z: number,
        small = false,
    ): Sprite => {
        const sh = shapeOf(L, f.kind);
        return {
            key: f.key,
            art: "fish",
            params: {
                size: sh.box,
                tone: sh.tone,
                tag: L.kinds[f.kind]?.tag ?? "",
                gape,
                facing: flip ? -1 : 1,
            },
            size: small ? Math.min(2.2, sh.size) : sh.size,
            x: at.x,
            y: at.y,
            angle,
            z,
            seed: 30 + f.kind,
        };
    };
    for (const [i, f] of s.fish.entries()) {
        if (f.at === "sea")
            sprites.push(
                fishSprite(
                    f,
                    { x: f.x, y: f.y },
                    rest ? 0 : Math.sin(f.phase * 1.7) * 0.05,
                    f.dir < 0,
                    false,
                    30,
                ),
            );
        else if (f.at === "line") {
            const u = t * 22;
            sprites.push({
                ...fishSprite(
                    f,
                    { x: f.x, y: f.y },
                    f.dir * (-1.1 + (rest ? 0 : Math.sin(u) * 0.35)),
                    f.dir < 0,
                    true,
                    50,
                ),
                squash: rest ? 0 : Math.sin(u) * 0.06,
            });
        } else if (f.at === "air") {
            const fl = s.flights.find((x) => x.fish === i);
            if (fl)
                sprites.push(
                    fishSprite(
                        f,
                        flightAt(fl.from, fl.v, G, fl.t),
                        fl.t * 7 * (fl.to === "sea" ? -1 : 1),
                        f.dir < 0,
                        true,
                        60,
                        fl.to !== "sea",
                    ),
                );
        } else if (f.at === "basket") {
            const slot = s.pan.indexOf(i);
            sprites.push(
                fishSprite(
                    f,
                    { x: BASKET.x + (slot - 1) * 0.5, y: DECK - BASKET.size * 0.52 },
                    -0.5 + slot * 0.4,
                    false,
                    false,
                    23,
                    true,
                ),
            );
        }
    }
    s.pan.forEach((fi, slot) => {
        const f = s.fish[fi];
        if (!f || f.at !== "pan") return;
        const at = panSpot(s, slot),
            since = (s.steps - s.needle.at) / RATE;
        sprites.push({
            ...fishSprite(f, at, slot % 2 ? 0.08 : -0.06, slot % 2 === 1, false, 23 + slot, true),
            squash:
                rest || slot !== s.pan.length - 1 || since > 0.6
                    ? 0
                    : Math.sin(since * 30) * 0.08 * (1 - since / 0.6),
        });
    });
    // The rod, the line out to the float, the float, and the line down to the hook.
    const bob = rest || (s.phase !== "sink" && s.phase !== "bed") ? 0 : Math.sin(t * 2.6) * 0.08;
    const dip = s.phase === "reel" && s.line !== null ? 0.5 : 0,
        float = { x: s.float.x, y: s.float.y + bob + dip };
    marks.push({ kind: "line", a: HANDS, b: TIP, style: "rod" });
    const out = s.phase === "sink" || s.phase === "bed" || s.phase === "reel";
    marks.push({
        kind: "line",
        a: TIP,
        b: { x: float.x, y: float.y - 0.45 },
        bend: out ? -1.2 : 0,
        style: "thin",
    });
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
    if (out) {
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
    }
    if (!s.won && (s.phase === "rest" || s.phase === "held")) {
        for (const x of s.landed) marks.push({ kind: "ring", x, y: SEA.surface + 0.1, r: 0.45 });
        if (!s.touched && s.phase === "rest" && !s.home)
            marks.push({ kind: "ring", x: float.x, y: float.y, r: 1.3 });
        const aim = s.phase === "held" ? s.pull : s.keyAim ? keyPull(s.keyAim) : null;
        if (aim && Math.hypot(aim.x, aim.y) >= CASTING.minPull.value) {
            const v = launchOf(aim);
            if (v.x > 0.5)
                marks.push({
                    kind: "dots",
                    pts: arc(TIP, v, G, { seconds: L.preview, every: 0.05 }),
                });
        }
    }
    return {
        sprites,
        marks,
        camera: { x: SEA.world.w / 2, y: SEA.world.h / 2, zoom: 1 },
        view: { ...SEA.view },
        world: { ...SEA.world },
    };
}

export function say(s: CastState): string {
    const L = s.L,
        w = L.words;
    const pan = s.pan.length
        ? `On the pan: ${s.pan.map((i) => L.kinds[s.fish[i]?.kind ?? 0]?.tag ?? "").join(", ")}, and the scale reads ${w(total(s))}.`
        : "The pan is empty.";
    const room = full(s)
        ? "The pan is full."
        : `${L.holds - s.pan.length === 1 ? "One more fish" : `${L.holds - s.pan.length} more fish`} will fit on the pan.`;
    const depth =
        s.hook.y < SEA.surface + 5
            ? "near the top"
            : s.hook.y > BED - 5
              ? "near the bottom"
              : "halfway down";
    const near = s.fish
        .filter((f) => f.at === "sea")
        .map((f) => ({ f, d: Math.abs(f.x - s.float.x) }))
        .sort((a, b) => a.d - b.d)[0];
    const nearby = near
        ? ` The nearest fish across is the ${L.kinds[near.f.kind]?.tag ?? ""} one.`
        : "";
    const now: Record<Phase, string> = {
        rest: "The float hangs from the rod.",
        held: "The float is pulled back.",
        fly: "The float is flying.",
        sink: `The hook is sinking, ${depth}.${nearby}`,
        bed: "The hook is on the bottom.",
        reel: s.line !== null ? "A fish is on the line." : "The hook is coming in.",
    };
    return [s.said, pan, s.won ? "" : `${room} ${now[s.phase]}`].filter(Boolean).join(" ");
}

export const castGame: ActionGame<CastState> = {
    id: "fish",
    title: "Gone fishing",
    group: "action",
    levels: CAST_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    cover: { art: "fish", params: { size: 4, tone: "sky", tag: "5", gape: false, facing: 1 } },
    hint: "Pull back from the float on the rod and let go to cast, and press a fish on the pan to throw it back; or set the cast with the arrow keys and press space",
    controls: {},
    start,
    step,
    frame,
    say,
    back,
    tuning: CASTING,
    note: (s) => (!s.touched ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : ""),
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE / 4),
        settling: (s) => moving(s) || s.steps - s.needle.at < RATE * 1.2,
    },
};
