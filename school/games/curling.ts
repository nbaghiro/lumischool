// Curling on the pond: a stone is pulled back from the hack and let go down a frozen pond towards the
// rings painted under the ice. How far back it is pulled sets its weight, which way sets its line, and
// which way it was turned sets the side it bends to as it slows. Once it is away the child sweeps in
// front of it, by holding a finger on the ice or the big button, and harder sweeping carries it further
// and straighter. Stones knock each other as real stones do, so a guard, a takeout and a freeze all
// come out of the same few rules. The mathematics is in what the house asks for: ring scores that add
// to an exact total, which of two stones is nearer the button and by how many squares, and the real
// scoring of an end against the blue team. See .docs/games.md.
import { aimOfPull, launchOf, stepAim, type Aim, type AimSpec } from "../../engine/motion/aim";
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import {
    moving,
    path,
    speedFor,
    speedOf,
    stepIce,
    type IceEvent,
    type Patch,
    type Sheet,
    type Stone,
} from "../../engine/motion/ice";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

const RATE = 60,
    DT = 1 / RATE;

/** The pond in squares: the sheet's ends and sides, the hack, the hog line and the tee at the house's middle. */
export const POND = {
    front: 3,
    back: 48.8,
    top: 11,
    bottom: 23,
    mid: 17,
    hack: 6,
    hog: 34,
    tee: 45,
    /** The house's rings from the outside in, by the score a stone touching each gets. */
    rings: [3.6, 2.6, 1.6, 0.7],
    r: 0.45,
} as const;
const WORLD = { w: 60, h: 34 };
/** The sheet drawn from the near end to a little past the back line, in whole squares. */
const SHEET_LENGTH = 48;
const VIEW = { w: 40, h: 22 };
/** Steps a stone stands at rest before the throw is judged, and the blue team takes a breath before it throws. */
const PAUSE = 36;

export const ICE = {
    friction: knob(
        1.25,
        0.6,
        2,
        0.05,
        "squares a second each second",
        "a stone glides from the hack to the house in about eight seconds, long enough to sweep and to watch it bend",
    ),
    curl: knob(
        0.34,
        0,
        0.6,
        0.02,
        "squares a second each second",
        "a turned stone bends about three squares by the time it stops, which an aim a little to the side can meet",
    ),
    knock: knob(
        0.86,
        0.5,
        1,
        0.02,
        "of the speed",
        "granite gives back most of its speed, so a stone that hits square sends the other off and nearly stops",
    ),
};

/** A throw: from a soft glide to a stone that runs through the house, along a line a little either side of straight. */
export const THROW: AimSpec = {
    min: 5,
    max: 14,
    per: 2.4,
    dead: 0.35,
    lo: -0.12,
    hi: 0.12,
    turn: 0.06,
    ramp: 1.8,
    turns: "up",
};

export type Ask =
    | { kind: "house" }
    | { kind: "button" }
    | { kind: "total"; total: number }
    | { kind: "takeout" }
    | { kind: "closer" }
    | { kind: "shot" }
    | { kind: "match" };

export interface CurlLevel extends ActionLevel {
    prompt: string;
    ask: Ask;
    /** Stones the child throws in an end, and the blue team, who throw first. */
    stones: number;
    cpu: number;
    ends: number;
    /** Blue stones already on the ice when an end begins: a guard or a stone in the house. */
    placed: Pt[];
    /** How much a turned stone bends here, as a share of the pond's bend. */
    curl: number;
    /** How much of the throw the dotted line shows: all of it to where it stops, the first part, or nothing. */
    preview: 0 | 1 | 2;
    /** A stone that stops short of the far hog line comes off, as in a real game. */
    hog: boolean;
    wind?: number;
    patches?: Patch[];
    /** Measure stones from the button when they rest, with the squares written beside the tape. */
    measure?: true;
}

export const CURL_LEVELS: Levels<CurlLevel> = [
    {
        title: "Slide to the house",
        grades: [1, 2],
        goal: "Slide a stone so it stops in the house, the painted rings.",
        prompt: "Pull the stone back and let go. The further you pull, the further it slides.",
        ask: { kind: "house" },
        stones: 4,
        cpu: 0,
        ends: 1,
        placed: [],
        curl: 0.3,
        preview: 2,
        hog: false,
    },
    {
        title: "Hit the button",
        grades: [1, 2],
        goal: "Stop a stone on the button, the middle of the house. It scores 4.",
        prompt: "The button is the little circle in the middle. Hold the ice to sweep a short stone on.",
        ask: { kind: "button" },
        stones: 4,
        cpu: 0,
        ends: 1,
        placed: [],
        curl: 0.5,
        preview: 2,
        hog: false,
    },
    {
        title: "Make exactly 6",
        grades: [1, 3],
        goal: "Rings score 4, 3, 2 and 1. Make your stones add up to exactly 6.",
        prompt: "The middle scores 4, then 3, 2 and 1 going out. Two stones can make 6.",
        ask: { kind: "total", total: 6 },
        stones: 3,
        cpu: 0,
        ends: 1,
        placed: [],
        curl: 0.6,
        preview: 2,
        hog: true,
    },
    {
        title: "Round the guard",
        grades: [2, 3],
        goal: "A blue stone guards the house. Curl round it and stop in the rings.",
        prompt: "Tap the stone, or press B, to change which way it curls. It bends as it slows.",
        ask: { kind: "house" },
        stones: 4,
        cpu: 0,
        ends: 1,
        placed: [{ x: 39, y: 17 }],
        curl: 1,
        preview: 1,
        hog: true,
    },
    {
        title: "Takeout",
        grades: [2, 3],
        goal: "Knock the blue stone out of the house.",
        prompt: "Throw harder to knock a stone. Aim straight at it.",
        ask: { kind: "takeout" },
        stones: 4,
        cpu: 0,
        ends: 1,
        placed: [{ x: 45.6, y: 16.4 }],
        curl: 1,
        preview: 1,
        hog: true,
    },
    {
        title: "Closer than",
        grades: [2, 4],
        goal: "Blue is near the button. Stop a stone closer to the middle than blue.",
        prompt: "The tape measures each stone from the button, in squares.",
        ask: { kind: "closer" },
        stones: 4,
        cpu: 0,
        ends: 1,
        placed: [{ x: 46.2, y: 18.1 }],
        curl: 1,
        preview: 1,
        hog: true,
        measure: true,
    },
    {
        title: "A windy afternoon",
        grades: [3, 4],
        goal: "The wind pushes the stones down the pond. Make exactly 5.",
        prompt: "The wind blows the stone down as it goes. Aim a little up into it.",
        ask: { kind: "total", total: 5 },
        stones: 3,
        cpu: 0,
        ends: 1,
        placed: [],
        curl: 1,
        preview: 0,
        hog: true,
        wind: 0.06,
    },
    {
        title: "A full end",
        grades: [3, 4],
        goal: "Play an end against the blue team. You score if your stone is nearest the button.",
        prompt: "Only stones nearer than blue's nearest score. Blue throws first, and you have the last stone.",
        ask: { kind: "shot" },
        stones: 3,
        cpu: 3,
        ends: 1,
        placed: [],
        curl: 1,
        preview: 0,
        hog: true,
        measure: true,
    },
    {
        title: "Exactly 10 on bumpy ice",
        grades: [3, 4],
        goal: "Make exactly 10 with three stones. The rough ice before the house slows a stone.",
        prompt: "Rough ice grips the stone. Sweep across it to carry the stone on.",
        ask: { kind: "total", total: 10 },
        stones: 3,
        cpu: 0,
        ends: 1,
        placed: [],
        curl: 1,
        preview: 0,
        hog: true,
        patches: [{ x: 35, y: 11, w: 4, h: 12, friction: 1.8 }],
    },
    {
        title: "The village bonspiel",
        grades: [3, 4],
        goal: "Two ends against the blue team. Score more than blue to win the bonspiel.",
        prompt: "Each end, only your stones nearer than blue's nearest score. Add your ends up.",
        ask: { kind: "match" },
        stones: 2,
        cpu: 2,
        ends: 2,
        placed: [],
        curl: 1,
        preview: 0,
        hog: true,
        measure: true,
    },
];

type Act = "ready" | "sweep" | "watch" | "cheer";
const ACTS: Record<Act, Cycle> = {
    ready: { poses: ["stand"] },
    sweep: { poses: ["sweep", "run"], every: 0.22 },
    watch: { poses: ["point"] },
    cheer: { poses: ["cheer", "jump"], every: 0.4 },
};

export interface CurlState {
    phase: number;
    L: CurlLevel;
    stones: Stone[];
    nextId: number;
    /** Stones each side still has to throw in this end. */
    ours: number;
    theirs: number;
    turn: "ours" | "theirs";
    /** Aiming, stones gliding, a pause before blue throws or the end is set out again, or won. */
    mode: "aim" | "glide" | "wait" | "won" | "lost";
    aim: Aim;
    curl: 1 | -1;
    /** The stone just thrown, which the brooms follow. */
    delivered: number | null;
    sweep: number;
    /** Where a finger came down on the field, and where it was the step before, for a pull and for sweeping. */
    down: Pt | null;
    last: Pt | null;
    /** Where the pulling finger is now, for the band drawn back to it from the stone. */
    hand: Pt | null;
    pulling: boolean;
    brakeWas: boolean;
    /** What the pause is for: blue's throw, a new end, or setting the end out again after a miss. */
    upNext: "blue" | "end" | null;
    wait: number;
    end: number;
    scores: { ours: number; theirs: number }[];
    cam: Cam;
    note: string;
    touched: boolean;
    throws: number;
    blueThrows: number;
    steps: number;
    seed: number;
    act: Actor<Act>;
    /** Steps the crowd still cheers for. */
    cheer: number;
    /** Where the stone just thrown has been, a dot every few steps, for its faint trail on the ice. */
    trail: Pt[];
}

const hackStone = (): Pt => ({ x: POND.hack, y: POND.mid });

export const sheetOf = (L: CurlLevel): Sheet => ({
    front: POND.front,
    back: POND.back,
    top: POND.top,
    bottom: POND.bottom,
    r: POND.r,
    friction: ICE.friction.value,
    curl: ICE.curl.value * L.curl,
    restitution: ICE.knock.value,
    rest: 0.04,
    ...(L.wind ? { wind: L.wind } : {}),
    ...(L.patches ? { patches: L.patches } : {}),
});

const placedStones = (L: CurlLevel, from: number): Stone[] =>
    L.placed.map((p, i) => ({
        id: from + i,
        team: "theirs",
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        spin: 0,
        turn: i * 0.9,
        out: false,
    }));

export function startCurl(L: CurlLevel, phase = 0, seed = 1): CurlState {
    const s: CurlState = {
        phase,
        L,
        stones: placedStones(L, 1),
        nextId: 1 + L.placed.length,
        ours: L.stones,
        theirs: L.cpu,
        turn: "ours",
        mode: "aim",
        // a stone left as it starts stops well short, so a press made at random rarely scores
        aim: { angle: 0, power: 7, pulling: false },
        curl: 1,
        delivered: null,
        sweep: 0,
        down: null,
        last: null,
        hand: null,
        pulling: false,
        brakeWas: false,
        upNext: null,
        wait: 0,
        end: 0,
        scores: [],
        cam: { ...AIMING },
        note: "",
        touched: false,
        throws: 0,
        blueThrows: 0,
        steps: 0,
        seed,
        act: actor<Act>("ready", "stand"),
        cheer: 0,
        trail: [],
    };
    beginEnd(s);
    return s;
}

/**
 * The camera's places: close on the hack and the first part of the sheet while a throw is lined up,
 * riding the stone while it glides, closer still on the house as it arrives, and back to the house
 * with the crowd above it once everything rests.
 */
const AIMING: Cam = { x: POND.hack + 12, y: POND.mid - 0.6, zoom: 1 };
const ZOOM = { glide: 1, arriving: 1.55, resting: 1.1 } as const;

/** An end set out: blue's placed stones on the ice, every stone to throw, and blue first when it has any. */
function beginEnd(s: CurlState): void {
    s.stones = placedStones(s.L, s.nextId);
    s.nextId += s.L.placed.length;
    s.ours = s.L.stones;
    s.theirs = s.L.cpu;
    s.delivered = null;
    s.trail = [];
    if (s.theirs > 0) {
        s.turn = "theirs";
        s.mode = "wait";
        s.upNext = "blue";
        s.wait = PAUSE;
    } else {
        s.turn = "ours";
        s.mode = "aim";
        s.upNext = null;
    }
}

/** How far a stone's middle is from the button, in squares. */
export const fromButton = (p: Pt): number => Math.hypot(p.x - POND.tee, p.y - POND.mid);

/** The ring a resting stone counts in, by the score that ring gives: 4 on the button down to 1, or 0 outside the house. */
export function ringOf(st: Stone): number {
    if (st.out) return 0;
    const d = fromButton(st) - POND.r;
    const i = POND.rings.findIndex((r, k) => d < r && (k === 3 || d >= (POND.rings[k + 1] ?? 0)));
    return i < 0 ? 0 : i + 1;
}

const inHouse = (st: Stone): boolean => ringOf(st) > 0;
const team = (s: CurlState, t: Stone["team"]) => s.stones.filter((x) => x.team === t && !x.out);

/** Our stones' ring scores, for an ask that adds them up. */
export const ringScores = (s: CurlState): number[] =>
    team(s, "ours")
        .map(ringOf)
        .filter((n) => n > 0)
        .sort((a, b) => b - a);

/** Real curling's count: the stones of the side nearest the button that are nearer than the other side's nearest, in the house. */
export function endScore(s: CurlState): { ours: number; theirs: number } {
    const near = (t: Stone["team"]) =>
        team(s, t)
            .filter(inHouse)
            .map(fromButton)
            .sort((a, b) => a - b);
    const o = near("ours"),
        b = near("theirs");
    const ob = o[0] ?? Infinity,
        bb = b[0] ?? Infinity;
    if (ob === Infinity && bb === Infinity) return { ours: 0, theirs: 0 };
    return ob < bb
        ? { ours: o.filter((d) => d < bb).length, theirs: 0 }
        : { ours: 0, theirs: b.filter((d) => d < ob).length };
}

const total = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** Whether the ice as it rests meets the level's ask, for the asks judged after any throw. */
function met(s: CurlState): boolean {
    const ask = s.L.ask;
    if (ask.kind === "house") return team(s, "ours").some(inHouse);
    if (ask.kind === "button") return team(s, "ours").some((x) => ringOf(x) === 4);
    if (ask.kind === "total") return total(ringScores(s)) === ask.total;
    if (ask.kind === "takeout") return !team(s, "theirs").some(inHouse);
    if (ask.kind === "closer") {
        const ours = team(s, "ours").filter(inHouse).map(fromButton);
        const blue = team(s, "theirs").filter(inHouse).map(fromButton);
        return ours.length > 0 && Math.min(...ours) < Math.min(Infinity, ...blue);
    }
    return false;
}

const endAsk = (L: CurlLevel): boolean => L.ask.kind === "shot" || L.ask.kind === "match";

/** A number from nought to one for the blue team's `n`-th throw, the same every time for one seed. */
function luck(seed: number, n: number, k: number): number {
    let h =
        Math.imul(seed ^ 0x9e3779b9, 2654435761) ^
        Math.imul(n + 1, 40503) ^
        Math.imul(k + 7, 2246822519);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Blue's throw: a takeout of the child's stone when it lies shot, otherwise a draw towards the button, each a little off. */
function blueThrow(s: CurlState, out: Happening[]): void {
    const sheet = sheetOf(s.L),
        from = hackStone();
    const shot = endScore(s).ours > 0;
    const ours = team(s, "ours")
        .filter(inHouse)
        .sort((a, b) => fromButton(a) - fromButton(b))[0];
    const n = s.blueThrows++;
    let vx: number, vy: number;
    if (shot && ours) {
        const a = Math.atan2(ours.y - from.y, ours.x - from.x) + (luck(s.seed, n, 1) - 0.5) * 0.03;
        vx = Math.cos(a) * 12;
        vy = Math.sin(a) * 12;
    } else {
        const to = {
            x: POND.tee + (luck(s.seed, n, 2) - 0.5) * 3.2,
            y: POND.mid + (luck(s.seed, n, 3) - 0.5) * 2.4,
        };
        const d = Math.hypot(to.x - from.x, to.y - from.y),
            a = Math.atan2(to.y - from.y, to.x - from.x),
            v = speedFor(d, sheet);
        vx = Math.cos(a) * v;
        vy = Math.sin(a) * v;
    }
    const st: Stone = {
        id: s.nextId++,
        team: "theirs",
        ...from,
        vx,
        vy,
        spin: 0,
        turn: 0,
        out: false,
    };
    s.stones.push(st);
    s.theirs--;
    s.delivered = st.id;
    s.mode = "glide";
    s.trail = [];
    out.push({ cue: "place", strength: 0.7, pan: pan(s, from.x) });
}

const pan = (s: CurlState, x: number) => panOf(x, s.cam.x, VIEW.w / s.cam.zoom);

/** Lets the child's stone go with the aim as it stands and the turn chosen. */
function deliver(s: CurlState, aim: Aim, out: Happening[]): void {
    const v = launchOf(aim),
        from = hackStone();
    const st: Stone = {
        id: s.nextId++,
        team: "ours",
        ...from,
        vx: v.x,
        vy: v.y,
        spin: s.curl,
        turn: 0,
        out: false,
    };
    s.stones.push(st);
    s.ours--;
    s.throws++;
    s.delivered = st.id;
    s.mode = "glide";
    s.note = "";
    s.trail = [];
    out.push({ cue: "place", strength: 0.8, pan: pan(s, from.x) });
}

function toggleCurl(s: CurlState, out: Happening[]): void {
    s.curl = s.curl === 1 ? -1 : 1;
    s.note =
        s.curl === 1
            ? "The stone will curl down the pond as it slows."
            : "The stone will curl up the pond as it slows.";
    out.push({ cue: "lift", strength: 0.4 });
}

/** The hands while a throw is lined up: a pull from the stone, a tap on it to change the turn, or the keys. */
function aimHands(s: CurlState, pad: Pad, out: Happening[]): void {
    if (pad.brake && !s.brakeWas) toggleCurl(s, out);
    s.brakeWas = pad.brake;
    const at = hackStone();
    if (pad.touch) {
        s.touched = true;
        if (!s.down) {
            s.down = { ...pad.touch };
            s.pulling = Math.hypot(pad.touch.x - at.x, pad.touch.y - at.y) <= 2.2;
        }
        const pull = { x: pad.touch.x - at.x, y: pad.touch.y - at.y };
        s.hand = s.pulling ? { ...pad.touch } : null;
        if (s.pulling && Math.hypot(pull.x, pull.y) >= THROW.dead) s.aim = aimOfPull(pull, THROW);
        return;
    }
    if (pad.lifted && s.down) {
        const pull = { x: pad.lifted.x - at.x, y: pad.lifted.y - at.y },
            moved = Math.hypot(pad.lifted.x - s.down.x, pad.lifted.y - s.down.y);
        const was = s.pulling;
        s.down = null;
        s.hand = null;
        s.pulling = false;
        if (was && Math.hypot(pull.x, pull.y) >= THROW.dead) {
            const aim = { ...aimOfPull(pull, THROW), pulling: false };
            // a quick sideways flick as the stone is let go turns it that way
            const f = pad.flick;
            if (f && Math.abs(f.y) > 8 && Math.abs(f.y) > Math.abs(f.x)) s.curl = f.y > 0 ? 1 : -1;
            s.aim = aim;
            deliver(s, aim, out);
        } else if (was && moved < 0.5) toggleCurl(s, out);
        else s.aim.pulling = false;
        return;
    }
    s.down = null;
    s.hand = null;
    s.pulling = false;
    if (pad.holding.length || pad.pressed.length || pad.tapped) s.touched = true;
    const v = stepAim(s.aim, pad, THROW, DT);
    if (v) deliver(s, s.aim, out);
}

/** How hard the brooms work: the big button held is full sweeping, and a finger on the ice sweeps harder the faster it scrubs. */
function sweepOf(s: CurlState, pad: Pad): number {
    if (pad.go) return 1;
    if (!pad.touch) {
        s.last = null;
        return 0;
    }
    const was = s.last;
    s.last = { ...pad.touch };
    const speed = was ? Math.hypot(pad.touch.x - was.x, pad.touch.y - was.y) / DT : 0;
    return Math.min(1, 0.55 + speed / 24);
}

/** The sounds of the ice: a knock pitched by how hard, a soft thud for a stone off the pond. */
function sounds(s: CurlState, events: readonly IceEvent[], out: Happening[]): void {
    for (const e of events) {
        if (e.kind === "knock" && e.speed > 0.15)
            out.push(
                {
                    cue: "bump",
                    strength: Math.min(1, e.speed / 8),
                    pitch: 1 + Math.min(0.5, e.speed / 20),
                    pan: pan(s, e.x),
                },
                { burst: { kind: "sparkle", x: e.x, y: e.y, n: 4 } },
            );
        else if (e.kind === "out")
            out.push(
                { cue: "crash", strength: 0.4, pan: pan(s, e.x) },
                { puff: { x: e.x, y: e.y, n: 6 } },
            );
    }
}

/** A close call slows the world a little as the stone comes to rest near a ring's edge, so the child sees it settle. */
function closeCall(s: CurlState): boolean {
    const st = s.stones.find((x) => x.id === s.delivered);
    if (!st || st.out || st.team !== "ours") return false;
    const v = speedOf(st);
    if (v === 0 || v > 1.1) return false;
    const d = fromButton(st) - POND.r;
    return POND.rings.some((r) => Math.abs(d - r) < 0.35);
}

/** Everything has stopped: the hog line, the ask, and whose turn it is next. */
function rested(s: CurlState, out: Happening[]): void {
    const L = s.L,
        st = s.stones.find((x) => x.id === s.delivered);
    const ours = st?.team === "ours";
    if (st && !st.out && L.hog && st.x + POND.r < POND.hog) {
        st.out = true;
        s.note = "It stopped short of the hog line, the line before the house, so it comes off.";
        out.push({ cue: "nope", pan: pan(s, st.x) });
    } else if (st && ours) {
        const ring = ringOf(st);
        if (ring > 0) {
            out.push({ cue: "ring", pitch: 0.9 + ring * 0.1, pan: pan(s, st.x) });
            // the crowd cheers a stone that stays in the house, and the button pulses for it
            s.cheer = Math.max(s.cheer, RATE);
        }
        s.note = noteFor(s, st);
    }
    s.delivered = null;
    if (!endAsk(L) && met(s)) return win(s, out);
    const next =
        s.turn === "ours"
            ? s.theirs > 0
                ? "theirs"
                : s.ours > 0
                  ? "ours"
                  : null
            : s.ours > 0
              ? "ours"
              : s.theirs > 0
                ? "theirs"
                : null;
    if (next === "theirs") {
        s.turn = "theirs";
        s.mode = "wait";
        s.upNext = "blue";
        s.wait = PAUSE;
        return;
    }
    if (next === "ours") {
        s.turn = "ours";
        s.mode = "aim";
        return;
    }
    // the end is over
    if (endAsk(L)) {
        const sc = endScore(s);
        s.scores.push(sc);
        if (L.ask.kind === "shot" && sc.ours > 0) return win(s, out);
        if (L.ask.kind === "match" && s.scores.length >= L.ends) {
            const o = total(s.scores.map((x) => x.ours)),
                b = total(s.scores.map((x) => x.theirs));
            if (o > b) return win(s, out);
            s.note = `Blue won the bonspiel ${b} to ${o}.`;
            s.mode = "lost";
            return;
        } else if (L.ask.kind === "match") {
            s.note = `End ${s.end + 1}: you ${sc.ours}, blue ${sc.theirs}. On to the next end.`;
            s.end++;
            s.upNext = "end";
        } else {
            s.note =
                sc.theirs > 0
                    ? `Blue scores ${sc.theirs}: a blue stone is nearest the button.`
                    : "Nobody is in the house this end.";
            s.mode = "lost";
            return;
        }
    } else {
        s.note = missWords(s);
        s.mode = "lost";
        return;
    }
    s.mode = "wait";
    s.wait = PAUSE * 2;
}

function win(s: CurlState, out: Happening[]): void {
    s.mode = "won";
    s.cheer = RATE * 3;
    s.note = wonWords(s);
    out.push({ cue: "win" }, { burst: { kind: "sparkle", x: POND.tee, y: POND.mid, n: 18 } });
}

const tally = (ns: number[]) => (ns.length ? `${ns.join(" + ")} = ${total(ns)}` : "nothing yet");

function noteFor(s: CurlState, st: Stone): string {
    const ring = ringOf(st),
        ask = s.L.ask;
    if (ask.kind === "total") return `Your rings: ${tally(ringScores(s))}. Make ${ask.total}.`;
    if (ask.kind === "closer" || s.L.measure) {
        const d = Math.round(fromButton(st) * 2) / 2;
        return ring > 0
            ? `In the ${ringWord(ring)}, ${d} squares from the button.`
            : "It missed the house.";
    }
    return ring > 0
        ? `In the ${ringWord(ring)}.`
        : st.x < POND.tee
          ? "A little short of the house."
          : "It went past the house.";
}

const ringWord = (ring: number): string =>
    ring === 4 ? "button, scoring 4" : `ring scoring ${ring}`;

function missWords(s: CurlState): string {
    const ask = s.L.ask;
    if (ask.kind === "total") return `Your rings made ${tally(ringScores(s))}, not ${ask.total}.`;
    if (ask.kind === "takeout") return "The blue stone is still in the house.";
    if (ask.kind === "closer") return "Blue is still nearest the button.";
    if (ask.kind === "button") return "No stone stopped on the button.";
    return "No stone stopped in the house.";
}

/**
 * Two distances from the button as a child reads them off the tape: to the half square, or to the
 * tenth when the halves would read the same, so a stone that is nearer never reads as a tie.
 */
export function readings(a: number, b: number): [string, string] {
    const half = (d: number) => Math.round(d * 2) / 2,
        tenth = (d: number) => Math.round(d * 10) / 10;
    return half(a) === half(b) && a !== b
        ? [String(tenth(a)), String(tenth(b))]
        : [String(half(a)), String(half(b))];
}

/** The nearest stone of each side in the house, or null for a side with none there. */
function nearest(s: CurlState): Record<"ours" | "theirs", Stone | null> {
    const near = (t: "ours" | "theirs") =>
        team(s, t)
            .filter(inHouse)
            .sort((a, b) => fromButton(a) - fromButton(b))[0] ?? null;
    return { ours: near("ours"), theirs: near("theirs") };
}

function wonWords(s: CurlState): string {
    const ask = s.L.ask;
    if (ask.kind === "total") return `${tally(ringScores(s))}. Exactly ${ask.total}!`;
    if (ask.kind === "button") return "On the button! That scores 4.";
    if (ask.kind === "takeout") return "Knocked out! The house is clear of blue.";
    if (ask.kind === "closer") {
        const o = Math.min(...team(s, "ours").filter(inHouse).map(fromButton));
        const b = Math.min(Infinity, ...team(s, "theirs").filter(inHouse).map(fromButton));
        if (b === Infinity) return "Closer than blue: blue is out of the house.";
        const [ours, theirs] = readings(o, b);
        return `Closer than blue: ${ours} squares to blue's ${theirs}.`;
    }
    if (ask.kind === "shot")
        return `You score ${s.scores.at(-1)?.ours ?? 1}: your stone is nearest the button.`;
    if (ask.kind === "match") {
        const o = total(s.scores.map((x) => x.ours)),
            b = total(s.scores.map((x) => x.theirs));
        return `You win the bonspiel, ${o} to ${b}!`;
    }
    return "In the house!";
}

export function stepCurl(s: CurlState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.cheer > 0) s.cheer--;
    if (s.mode === "aim" && s.turn === "ours") aimHands(s, pad, out);
    else if (s.mode === "wait") {
        if (--s.wait <= 0) {
            const after = s.upNext;
            s.upNext = null;
            if (after === "blue") blueThrow(s, out);
            else if (after === "end") beginEnd(s);
        }
    } else if (s.mode === "glide") {
        const delivered = s.stones.find((x) => x.id === s.delivered);
        s.sweep = delivered?.team === "ours" ? sweepOf(s, pad) : 0;
        if (pad.touch || pad.go) s.touched = true;
        // a close call is played a little slower, so the child sees the stone settle on the line
        const slow = closeCall(s) ? 0.55 : 1;
        const events = stepIce(
            s.stones,
            sheetOf(s.L),
            s.delivered !== null && s.sweep > 0 ? { id: s.delivered, level: s.sweep } : null,
            DT * slow,
        );
        sounds(s, events, out);
        if (delivered && !delivered.out && s.steps % 5 === 0)
            s.trail = [...s.trail, { x: delivered.x, y: delivered.y }].slice(-24);
        // frost kicked up by the brooms, more the harder they work
        if (
            delivered &&
            !delivered.out &&
            s.sweep > 0 &&
            s.steps % Math.max(8, Math.round(18 - s.sweep * 10)) === 0
        )
            out.push({ burst: { kind: "sparkle", x: delivered.x + 1.2, y: delivered.y, n: 1 } });
        if (!moving(s.stones)) {
            s.sweep = 0;
            rested(s, out);
        }
    }
    const act: Act =
        s.mode === "won" || s.cheer > 0
            ? "cheer"
            : s.mode === "glide"
              ? s.sweep > 0
                  ? "sweep"
                  : "watch"
              : "ready";
    stepActor(s.act, act, ACTS, DT);
    s.cam = follow(s.cam, wanted(s), {
        rate: 2.2,
        zoomRate: 1.6,
        dt: DT,
        view: VIEW,
        world: WORLD,
    });
    return out;
}

/** Where the camera wants to be: the whole pond while aiming, riding the stone with a lead while it glides, and the house when it has come to rest. */
function wanted(s: CurlState): Cam {
    if (s.mode === "aim") return { ...AIMING };
    const st = s.stones.find((x) => x.id === s.delivered);
    if (s.mode === "glide" && st && !st.out) {
        // the last stretch is watched close, so the rings and the stones are large when it settles
        if (st.x > POND.tee - 11) return { x: POND.tee - 1.5, y: POND.mid, zoom: ZOOM.arriving };
        const x = Math.min(POND.tee, st.x + st.vx * 0.9 + 4);
        return { x, y: POND.mid - 0.6, zoom: ZOOM.glide };
    }
    return { x: POND.tee - 2, y: POND.mid - 3.2, zoom: ZOOM.resting };
}

/** The dots of the throw as it is lined up, as far as the level shows them, and where it would stop. */
function preview(s: CurlState): { pts: Pt[]; stop: Pt | null } {
    if (s.L.preview === 0 || s.mode !== "aim" || s.turn !== "ours") return { pts: [], stop: null };
    const v = launchOf(s.aim),
        from = hackStone();
    const p = path(
        { id: -1, team: "ours", ...from, vx: v.x, vy: v.y, spin: s.curl, turn: 0, out: false },
        sheetOf(s.L),
        0,
        0.3,
    );
    if (s.L.preview === 1)
        return { pts: p.pts.slice(0, Math.ceil(p.pts.length * 0.4)), stop: null };
    return { pts: p.pts, stop: p.out ? null : p.stop };
}

const CHARLIE = {
    mood: "happy",
    hair: "ponytail",
    top: "berry",
    sleeves: "long",
    print: "star",
    wear: "trousers",
    bottom: "sky",
    pattern: "plain",
    feet: "boots",
    holding: "",
};

/** The pond round the sheet, in squares: wide enough that its soft shore never crosses the sheet. */
const SHORE = { x: 27, y: 17, w: 60, h: 20 } as const;
/** The lanterns on the near bank, whose light the frame lays on the snow. */
const LANTERNS = [5, 31, 49] as const;
const NEAR_BANK = SHORE.y + SHORE.h / 2 + 1.2;
const FAR_BANK = SHORE.y - SHORE.h / 2 + 1.1;

/** The crowd on a snowy rise above the house: the pups and people, cheering when the crowd cheers. */
function crowd(s: CurlState, rest: boolean): Sprite[] {
    const cheering = !rest && s.cheer > 0 && Math.floor(s.cheer / 12) % 2 === 0;
    const out: Sprite[] = [
        {
            key: "rise",
            art: "snowbank",
            params: { width: 18, side: "top" },
            x: POND.tee - 1,
            y: FAR_BANK - 1.2,
            size: 18,
            depth: 0.92,
            still: true,
            z: 1.5,
        },
    ];
    const pups = ["rufus", "maple", "pip", "dot"] as const;
    pups.forEach((member, i) =>
        out.push({
            key: `pup:${member}`,
            art: "pupfamily",
            params: {
                member,
                pose: cheering ? "cheer" : "sit",
                mood: "happy",
                dir: 1,
                gear: "none",
            },
            x: POND.tee - 8 + i * 2.3,
            y: FAR_BANK,
            size: 1.7,
            stand: true,
            depth: 0.92,
            z: 3,
        }),
    );
    [0, 1, 2].forEach((i) =>
        out.push({
            key: `fan:${i}`,
            art: "person",
            params: {
                pose: cheering ? "cheer" : i === 1 ? "point" : "stand",
                age: i === 2 ? "grownup" : "child",
                tone: 2 + i,
                top: ["sky", "tang", "mint"][i] ?? "sky",
            },
            x: POND.tee + 1.5 + i * 2.6,
            y: FAR_BANK,
            size: 1.7,
            stand: true,
            depth: 0.92,
            z: 3,
        }),
    );
    return out;
}

/** The pond's winter round the sheet: its frozen shore, firs on the far bank, and a snowman, a bench, a sledge and lanterns on the near one. */
function winter(): Sprite[] {
    const near = (key: string, art: string, x: number, size: number, params = {}): Sprite => ({
        key,
        art,
        params,
        x,
        y: NEAR_BANK + 1.4,
        size,
        stand: true,
        depth: 1.08,
        still: true,
        z: 2,
    });
    return [
        {
            key: "pond",
            art: "frozenpond",
            params: { width: SHORE.w, height: SHORE.h, reeds: 1 },
            x: SHORE.x,
            y: SHORE.y,
            size: SHORE.w,
            still: true,
            z: -1,
        },
        {
            key: "firs:far",
            art: "firs",
            params: { count: 4, snow: 1 },
            x: 5,
            y: FAR_BANK,
            size: 7,
            stand: true,
            depth: 0.85,
            still: true,
            z: 1,
        },
        {
            key: "firs:mid",
            art: "firs",
            params: { count: 3, snow: 1 },
            x: 58,
            y: FAR_BANK - 0.4,
            size: 6,
            stand: true,
            depth: 0.85,
            still: true,
            z: 1,
        },
        near("snowman", "snowman", 12, 2.6, { buttons: 3, hat: 1 }),
        near("bench", "parkbench", 21, 3.6, { tone: "tang" }),
        near("sledge", "sledge", 39, 3, { slats: 5 }),
        ...LANTERNS.map((x): Sprite => ({
            key: `lantern:${x}`,
            art: "lantern",
            params: { lit: 1, post: 1 },
            x,
            y: NEAR_BANK + 1.2,
            size: 1.3,
            stand: true,
            still: true,
            z: 2,
        })),
    ];
}

/** Snow drifting down in two layers, far small flakes and near larger ones, from the game's clock so the same step draws the same flakes. */
function snow(s: CurlState): Sprite[] {
    const t = s.steps / RATE,
        out: Sprite[] = [];
    const layer = (n: number, speed: number, seed: number, size: number, depth: number) => {
        for (let i = 0; i < n; i++) {
            const x =
                    ((i * 37.3 + seed + Math.sin(t * 0.7 + i) * 1.4 + t * 0.5 * speed) %
                        (WORLD.w + 8)) -
                    4,
                y = ((i * 11.7 + seed * 3 + t * speed * (1 + (i % 5) * 0.15)) % (WORLD.h + 4)) - 2;
            out.push({
                key: `snow:${seed}:${i}`,
                art: "snowflake",
                params: { kind: i % 3 === 0 ? "star" : "dot" },
                x,
                y,
                size,
                angle: t * 0.6 + i,
                depth,
                alpha: 0.85,
                z: 20,
            });
        }
    };
    layer(22, 0.8, 5, 0.22, 0.9);
    layer(14, 1.5, 0, 0.38, 1.1);
    return out;
}

export function curlFrame(s: CurlState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push(
        {
            key: "sheet",
            art: "curlsheet",
            params: {
                length: SHEET_LENGTH,
                width: POND.bottom - POND.top,
                tee: POND.tee - POND.front,
                hog: POND.hog - POND.front,
                hack: POND.hack - POND.front,
            },
            x: POND.front + SHEET_LENGTH / 2,
            y: POND.mid,
            size: SHEET_LENGTH,
            still: true,
            z: 0,
        },
        ...winter(),
        ...crowd(s, rest),
    );
    for (const p of L.patches ?? [])
        sprites.push({
            key: `rough:${p.x}`,
            art: "golfpond",
            params: { kind: "mud", width: p.w, height: p.h },
            x: p.x + p.w / 2,
            y: p.y + p.h / 2,
            size: p.w,
            alpha: 0.35,
            still: true,
            z: 0.5,
        });
    // a stone is drawn true to its size on the ice: the drawing's granite is four fifths of its box
    const stoneSize = (POND.r * 2) / 0.8;
    for (const st of s.stones) {
        if (st.out) continue;
        sprites.push({
            key: `stone:${st.id}`,
            art: "curlstone",
            params: { team: st.team },
            x: st.x,
            y: st.y,
            size: stoneSize,
            angle: rest ? 0 : st.turn,
            z: 6,
        });
    }
    const aiming = s.mode === "aim" && s.turn === "ours";
    if (aiming)
        sprites.push({
            key: "stone:next",
            art: "curlstone",
            params: { team: "ours" },
            ...hackStone(),
            size: stoneSize,
            z: 6,
        });
    const st = s.stones.find((x) => x.id === s.delivered && x.team === "ours");
    const sweeping = st !== undefined && !st.out && s.mode === "glide" && !rest;
    if (sweeping) {
        // the polished track behind the stone, fading the further back it lies
        const n = s.trail.length;
        for (let k = 0; k < 3; k++) {
            const part = s.trail.slice(Math.floor((n * k) / 3), Math.floor((n * (k + 1)) / 3) + 1);
            if (part.length > 1)
                marks.push({ kind: "dots", pts: part, faint: true, opacity: 0.12 + k * 0.12 });
        }
        // a broom from each sweeper, its pad brushing the ice just ahead of the stone in time with the sweep
        const swing =
            s.sweep > 0 ? Math.sin(s.steps * (0.35 + s.sweep * 0.45)) * (0.2 + 0.3 * s.sweep) : 0;
        const up = s.sweep > 0 ? 0 : 0.5;
        [-1, 1].forEach((side) =>
            sprites.push({
                key: `broom:${side}`,
                art: "curlbroom",
                params: { pad: "tang" },
                x: st.x + 1.15,
                y: st.y + side * (0.8 + up),
                size: 0.75,
                angle: (side > 0 ? Math.PI : 0) + side * (0.25 + swing) + up * side,
                z: 7,
            }),
        );
    }
    // Charlie and a friend: at the hack and by the house while a throw is lined up, running either side
    // of the stone they sweep, and at the house when it rests
    const friendParams = { ...CHARLIE, hair: "bunches", top: "sky", bottom: "tang" };
    const watching = {
        charlie: { x: POND.tee - 6.5, y: POND.top },
        friend: { x: POND.tee - 6.5, y: POND.bottom + 0.6 },
    };
    const places = aiming
        ? { charlie: { x: POND.hack - 1.4, y: POND.mid }, friend: watching.friend }
        : sweeping
          ? {
                charlie: { x: st.x + 1.2, y: st.y - 0.8 },
                friend: { x: st.x + 1.2, y: st.y + 4.7 },
            }
          : watching;
    for (const [who, params] of [
        ["charlie", CHARLIE],
        ["friend", friendParams],
    ] as const) {
        const at = places[who];
        sprites.push(
            ...actorSprites(
                s.act,
                ACTS,
                (pose, facing) => ({
                    key: who,
                    art: "charlie",
                    params: { ...params, pose, dir: facing },
                    x: at.x,
                    y: at.y,
                    size: 2.6,
                    stand: true,
                    z: 8,
                }),
                s.steps / RATE,
                rest,
            ),
        );
        // their breath in the cold, a small puff now and then while they run
        if (sweeping) {
            const phase = (s.steps / RATE + (who === "friend" ? 0.45 : 0)) % 0.9;
            if (phase < 0.5)
                marks.push({
                    kind: "puff",
                    x: at.x + 0.7 + phase,
                    y: at.y - 3.3 - phase * 0.3,
                    r: 0.12 + phase * 0.35,
                });
        }
    }
    // the throw lined up: the turn it will bend with, and as much of its path as the level shows
    if (aiming) {
        const from = hackStone();
        const p = preview(s);
        if (s.hand) marks.push({ kind: "line", a: from, b: s.hand, style: "thin" });
        if (p.pts.length > 1) marks.push({ kind: "dots", pts: p.pts, faint: true });
        if (p.stop) marks.push({ kind: "ring", x: p.stop.x, y: p.stop.y, r: POND.r + 0.25 });
        const a = s.aim.angle,
            len = 3 + (s.aim.power - THROW.min) * 0.45;
        marks.push({
            kind: "line",
            a: { x: from.x + Math.cos(a) * 0.8, y: from.y + Math.sin(a) * 0.8 },
            b: { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len },
            bend: -s.curl * 0.7,
            style: "aim",
            head: true,
        });
    }
    // a stone that came to rest in the house: the button pulses once while the crowd cheers
    if (!rest && s.cheer > 0 && s.mode !== "glide")
        marks.push({
            kind: "ring",
            x: POND.tee,
            y: POND.mid,
            r: POND.rings[3] + ((s.steps % 40) / 40) * 1.4,
            solid: true,
        });
    // the tape from the button to each side's nearest stone, ticked every half square
    if (s.mode !== "glide" && (L.measure || L.ask.kind === "closer")) {
        const both = nearest(s);
        const [oursAt, theirsAt] = readings(
            both.ours ? fromButton(both.ours) : Infinity,
            both.theirs ? fromButton(both.theirs) : Infinity,
        );
        for (const t of ["ours", "theirs"] as const) {
            const near = both[t];
            if (!near) continue;
            const d = t === "ours" ? oursAt : theirsAt;
            marks.push({
                kind: "line",
                a: { x: POND.tee, y: POND.mid },
                b: { x: near.x, y: near.y },
                style: "rod",
            });
            const len = Math.max(0.01, fromButton(near)),
                ux = (near.x - POND.tee) / len,
                uy = (near.y - POND.mid) / len;
            const ticks: Pt[] = [];
            for (let k = 0.5; k < len - 0.2; k += 0.5)
                ticks.push({ x: POND.tee + ux * k, y: POND.mid + uy * k });
            if (ticks.length) marks.push({ kind: "dots", pts: ticks });
            // written just past the stone along its tape, so two tapes' numbers never sit on each other
            marks.push({
                kind: "word",
                x: near.x + ux * 1.1,
                y: near.y + uy * 1.1 + 0.15,
                text: `${d}`,
                size: 0.55,
            });
        }
    }
    // what the house asks for, and how the stones stand against it, kept at the top of the view
    marks.push({
        kind: "word",
        x: VIEW.w / 2,
        y: 1.2,
        text: askWords(L.ask),
        size: 0.75,
        fixed: true,
    });
    if (L.ask.kind === "total")
        marks.push({
            kind: "word",
            x: VIEW.w / 2,
            y: 2.3,
            text: tally(ringScores(s)),
            size: 0.6,
            fixed: true,
        });
    if (endAsk(L)) {
        const o = total(s.scores.map((x) => x.ours)),
            b = total(s.scores.map((x) => x.theirs));
        sprites.push({
            key: "board",
            art: "scoreboard",
            params: {
                home: "Blue",
                away: "Charlie",
                scores: [b, o],
                note: `End ${Math.min(L.ends, s.end + 1)} of ${L.ends}`,
            },
            x: POND.tee + 9.5,
            y: FAR_BANK + 0.2,
            size: 5.5,
            stand: true,
            live: true,
            z: 4,
        });
    }
    // the stones still to throw this end, along the bank by the hack
    for (let i = 0; i < s.ours; i++)
        sprites.push({
            key: `left:${i}`,
            art: "curlstone",
            params: { team: "ours" },
            x: POND.hack - 1.8 + i * 1.2,
            y: POND.bottom + 1.6,
            size: 0.9,
            z: 4,
        });
    for (let i = 0; i < s.theirs; i++)
        sprites.push({
            key: `blue:${i}`,
            art: "curlstone",
            params: { team: "theirs" },
            x: POND.hack - 1.8 + i * 1.2,
            y: POND.top - 0.9,
            size: 0.9,
            z: 4,
        });
    if (!rest) sprites.push(...snow(s));
    const focus =
        st && s.mode === "glide"
            ? { x: st.x, y: st.y }
            : aiming
              ? hackStone()
              : { x: POND.tee, y: POND.mid };
    const camera = rest ? { ...wanted(s) } : { ...s.cam };
    // the lanterns' faint warmth on the snow, left off under reduced motion with the snow
    const lights = rest
        ? []
        : LANTERNS.map((x) => ({
              x,
              y: NEAR_BANK - 0.6,
              r: 2.6,
              strength: 0.4,
              hue: "glow" as const,
          }));
    return { sprites, marks, camera, view: { ...VIEW }, world: { ...WORLD }, focus, lights };
}

export function askWords(ask: Ask): string {
    if (ask.kind === "house") return "Stop in the house";
    if (ask.kind === "button") return "Stop on the button: 4";
    if (ask.kind === "total") return `Make exactly ${ask.total}`;
    if (ask.kind === "takeout") return "Knock blue out of the house";
    if (ask.kind === "closer") return "Closer to the button than blue";
    if (ask.kind === "shot") return "Nearest the button wins the end";
    return "Score more than blue over two ends";
}

function say(s: CurlState): string {
    const ours = team(s, "ours"),
        blue = team(s, "theirs");
    const where = (st: Stone) =>
        ringOf(st) > 0
            ? `in the ${ringOf(st) === 4 ? "button" : `${ringOf(st)} ring`}, ${Math.round(fromButton(st) * 2) / 2} squares from the button`
            : st.x < POND.tee
              ? "short of the house"
              : "past the house";
    const parts = [
        `${askWords(s.L.ask)}.`,
        ours.length
            ? `Your stones: ${ours.map(where).join("; ")}.`
            : "No stones of yours on the ice.",
        blue.length ? `Blue stones: ${blue.map(where).join("; ")}.` : "",
        `${s.ours} of your stones to throw.`,
    ];
    if (s.mode === "aim" && s.turn === "ours") {
        const deg = Math.round((s.aim.angle * 180) / Math.PI);
        parts.push(
            `Aimed ${deg === 0 ? "straight" : deg < 0 ? `${-deg} degrees up` : `${deg} degrees down`}, at ${Math.round(((s.aim.power - THROW.min) / (THROW.max - THROW.min)) * 100)}% weight, curling ${s.curl === 1 ? "down" : "up"}.`,
        );
    } else if (s.mode === "glide")
        parts.push(s.sweep > 0 ? "Sweeping." : "The stones are gliding.");
    else if (s.mode === "wait" && s.upNext === "blue") parts.push("Blue is about to throw.");
    return parts.filter(Boolean).join(" ");
}

/** The pond's own sounds: the granite's thud as it is let go, a stone's knock, a soft bell for a ring and the crowd's cheer. */
const SOUNDS: Kit = {
    place: [
        { wave: "sine", hz: 110, to: 80, attack: 0.004, decay: 0.18, gain: 0.45 },
        { wave: "noise", hz: 600, attack: 0.002, decay: 0.08, gain: 0.2 },
    ],
    bump: [
        { wave: "sine", hz: 420, to: 300, attack: 0.001, decay: 0.09, gain: 0.45 },
        { wave: "noise", hz: 1800, attack: 0.001, decay: 0.03, gain: 0.25 },
    ],
    crash: [{ wave: "noise", hz: 400, attack: 0.01, decay: 0.25, gain: 0.3 }],
    lift: [{ wave: "triangle", hz: 660, to: 880, attack: 0.004, decay: 0.08, gain: 0.3 }],
    ring: [
        { wave: "sine", hz: 988, attack: 0.005, decay: 0.6, gain: 0.25 },
        { wave: "sine", hz: 1480, attack: 0.005, decay: 0.45, gain: 0.12 },
        // the crowd's soft clapping after the bell
        { wave: "noise", hz: 2200, attack: 0.08, decay: 0.7, gain: 0.1, delay: 0.15 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.24 },
        { wave: "noise", hz: 1200, attack: 0.2, decay: 0.9, gain: 0.18, delay: 0.1 },
    ],
};

export const curlingGame: ActionGame<CurlState> = {
    id: "curling",
    title: "Curling on the pond",
    group: "action",
    seen: "above",
    quiet: true,
    // a single throw to the house fits a card: the pond is cropped to thirty squares round the stone
    card: { round: { level: 0 }, keep: 30, minutes: 2 },
    portrait: { keep: 26 },
    levels: CURL_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "curlstone", params: { team: "ours" } },
    hint: "Pull back from the stone and let go to throw it; tap the stone to change which way it curls; hold the ice to sweep. With the keys, up and down aim, left and right set the weight, B changes the curl, space throws, and holding space sweeps.",
    controls: {
        arrows: { up: "Aim up", down: "Aim down", left: "Softer", right: "Harder" },
        go: "Throw",
        brake: "Change the curl",
        icons: { go: "launch", brake: "curl" },
    },
    goLabel: (s) => (s.mode === "glide" ? "Sweep" : "Throw"),
    goIcon: (s) => (s.mode === "glide" ? "broom" : "launch"),
    sounds: SOUNDS,
    start: (phase, seed = 1) => startCurl(CURL_LEVELS[phase] ?? CURL_LEVELS[0], phase, seed),
    step: stepCurl,
    say,
    note: (s) => (!s.touched && s.mode === "aim" ? s.L.prompt : s.note),
    won: (s) => s.mode === "won",
    ended: (s) =>
        s.mode === "won"
            ? { won: true, words: s.note }
            : s.mode === "lost"
              ? { won: false, words: s.note }
              : null,
    objectives: (s) => {
        const ask = s.L.ask;
        if (ask.kind === "total")
            return { completed: Math.min(ask.total, total(ringScores(s))), total: ask.total };
        return { completed: s.mode === "won" ? 1 : 0, total: 1 };
    },
    frame: curlFrame,
    cancelInput: (s) => {
        s.down = null;
        s.hand = null;
        s.pulling = false;
        s.aim.pulling = false;
    },
    hum: (s): Hum[] => {
        const fastest = Math.max(0, ...s.stones.filter((x) => !x.out).map(speedOf));
        const out: Hum[] = [];
        if (fastest > 0.2) out.push({ kind: "roll", level: Math.min(1, fastest / 11) });
        if (s.sweep > 0) out.push({ kind: "sweep", level: 0.4 + 0.6 * s.sweep });
        return out;
    },
    tuning: ICE,
    still: {
        press: () => Math.round(RATE * 0.1),
        settling: (s) => s.mode === "glide" || s.mode === "wait",
    },
};
