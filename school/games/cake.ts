// Cut the cake: cut a long cake so everyone gets the same.
//
// A long cake lies on the grass in front of the children. The child holds a finger over it, the knife
// follows, and letting go brings the knife down where the cut goes. Once there are enough cuts the
// pieces go to the children, and the shares are fair only if every piece is within a small distance
// of its share, so where a third of the way along is has to be judged by eye. An unfair share shows
// each piece against the size it should have been, and the cake goes back together with the last
// cuts left as faint marks for the next try. See .docs/games.md.
import { fair, offBy, piecesOf, sizeOf, type Piece } from "../../engine/motion/cuts";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface CakeLevel extends ActionLevel {
    /** Squares of cake on the grass. */
    whole: number;
    /** Who gets a piece, left to right. */
    names: string[];
    /** Each piece's length when it is not the whole shared out, and the rest stays on the grass. */
    share?: number;
    /** Squares of cake already eaten, drawn as a dashed outline past its right end. */
    gone?: number;
    /** Pieces someone already has, drawn in front of them at the left. */
    given?: { name: string; pieces: number[] };
    /** How far a piece may be from its share, in squares, and still be fair. */
    within: number;
    candles: number;
    prompt: string;
}

export const CAKE_LEVELS: Levels<CakeLevel> = [
    {
        title: "Two",
        grades: [1, 2],
        goal: "Cut the cake so Ann and Ben get the same.",
        prompt: "Hold over the cake and let go to cut.",
        whole: 20,
        names: ["Ann", "Ben"],
        within: 0.9,
        candles: 4,
    },
    {
        title: "Three",
        grades: [2, 2],
        goal: "Cut the cake so Ann, Ben and Cal get the same.",
        prompt: "Two cuts make three pieces.",
        whole: 21,
        names: ["Ann", "Ben", "Cal"],
        within: 0.8,
        candles: 6,
    },
    {
        title: "Four",
        grades: [2, 3],
        goal: "Cut the cake so four children get the same.",
        prompt: "Three cuts make four pieces.",
        whole: 24,
        names: ["Ann", "Ben", "Cal", "Dev"],
        within: 0.7,
        candles: 8,
    },
    {
        title: "A quarter has gone",
        grades: [3, 3],
        goal: "A quarter of the cake has been eaten. Share the rest so three children each get a quarter of the whole cake.",
        prompt: "The dashes show the quarter that has gone.",
        whole: 18,
        gone: 6,
        names: ["Ann", "Ben", "Cal"],
        within: 0.6,
        candles: 6,
    },
    {
        title: "Six",
        grades: [3, 4],
        goal: "Cut the cake so six children get the same.",
        prompt: "Five cuts make six pieces.",
        whole: 24,
        names: ["Ann", "Ben", "Cal", "Dev", "Eve", "Fin"],
        within: 0.5,
        candles: 6,
    },
    {
        title: "The same as Ann's",
        grades: [4, 4],
        goal: "Ann has two sixths of a cake the same size as this one. Cut this cake so Ben and Cal each get the same as Ann. The rest stays on the grass.",
        prompt: "Ann's two pieces came from a cake as long as this one.",
        whole: 24,
        share: 8,
        given: { name: "Ann", pieces: [4, 4] },
        names: ["Ben", "Cal"],
        within: 0.5,
        candles: 6,
    },
];

export const CAKE = {
    knife: knob(
        9,
        3,
        16,
        1,
        "squares a second",
        "the arrow keys move the knife slowly enough to stop where it is meant to",
    ),
    chop: knob(0.12, 0.05, 0.3, 0.01, "seconds", "a cut comes down quickly and lands with a knock"),
    gap: knob(0.35, 0, 1, 0.05, "squares", "cut pieces part a little so each one can be seen"),
    look: knob(
        2.2,
        1,
        4,
        0.1,
        "seconds",
        "long enough to see the pieces against their shares before the cake goes back together",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** In squares. The children stand on the far grass and the cake lies on the near grass. */
export const FIELD = {
    world: { w: 52, h: 32 },
    view: { w: 46, h: 27 },
    far: 18,
    near: 26,
} as const;
/** The long cake's body is 2.4 squares tall with its foot 5.5 squares down its box, and the knife's tip is 3.6 squares under the middle of its box. A test holds these to the drawings. */
export const CAKE_SHAPE = { top: 2.4, foot: 5.5, knifeTip: 3.6 } as const;
const CAKE_TOP = CAKE_SHAPE.top,
    KNIFE_TIP = CAKE_SHAPE.knifeTip;
/** The children are drawn a little over the kit scale of five squares, so they read at a tablet size beside a long cake. */
const CHILD = 4.8;

type Phase = "cut" | "serve" | "look" | "back" | "done";

export interface CakeState {
    level: number;
    L: CakeLevel;
    /** Places along the cake the cuts are at, in the order they were made. */
    cuts: number[];
    /** The last tries' cuts, newest first, drawn faint on the cake. */
    before: number[][];
    /** Where the knife is along the cake, whether a finger is holding it, and how far through a chop it is. */
    knife: { at: number; held: boolean; shown: boolean; chop: number; lift: number };
    phase: Phase;
    /** Seconds into the phase. */
    t: number;
    /** Each piece's left end on the grass, as drawn now, and where it is going. */
    lefts: number[];
    squash: number;
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
}

/** Where the pieces someone already has start, at the far left. */
const GIVEN_AT = 5;
const givenLength = (L: CakeLevel) =>
    L.given ? L.given.pieces.reduce((a, b) => a + b, 0) + (L.given.pieces.length - 1) * 0.3 : 0;
/** Where the cake starts: centred, or past the pieces someone already has. */
export const cakeStart = (L: CakeLevel) =>
    L.given ? GIVEN_AT + givenLength(L) + 3 : FIELD.world.w / 2 - (L.whole + (L.gone ?? 0)) / 2;
const shareOf = (L: CakeLevel) => L.share ?? L.whole / L.names.length;
/** Cuts needed: one fewer than the pieces, and one more when the rest stays on the grass. */
export const cutsNeeded = (L: CakeLevel) => (L.share ? L.names.length : L.names.length - 1);
export const piecesNow = (s: CakeState): Piece[] => piecesOf(s.L.whole, s.cuts);
/** The pieces that go to someone, left to right; with a share set, the last piece is the rest. */
export const served = (L: CakeLevel, pieces: Piece[]): Piece[] =>
    L.share ? pieces.slice(0, L.names.length) : pieces;
export const isFair = (L: CakeLevel, cuts: number[]): boolean => {
    const pieces = piecesOf(L.whole, cuts);
    return pieces.length === cutsNeeded(L) + 1 && fair(served(L, pieces), shareOf(L), L.within);
};

/** Where each person stands, left to right: whoever already has pieces first. */
export function places(L: CakeLevel): number[] {
    const spread = (from: number, to: number, n: number) =>
        Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 0.5)) / n);
    if (!L.given) return spread(7, FIELD.world.w - 7, L.names.length);
    return [
        GIVEN_AT + givenLength(L) / 2,
        ...spread(cakeStart(L), cakeStart(L) + L.whole, L.names.length + 1).slice(
            0,
            L.names.length,
        ),
    ];
}

/** Where each piece's left end lies when the cake is whole or cut, parted a little at each cut. */
function together(s: CakeState): number[] {
    const x0 = cakeStart(s.L);
    return piecesNow(s).map((p, i) => x0 + p.from + i * CAKE.gap.value);
}

/** Where each piece goes when it is served: centred in front of its person, and the rest at the right. */
function servedLefts(s: CakeState): number[] {
    const L = s.L,
        at = places(L).slice(L.given ? 1 : 0),
        pieces = piecesNow(s);
    return pieces.map((p, i) => {
        const x = at[i];
        return x === undefined ? FIELD.world.w - 3 - sizeOf(p) : x - sizeOf(p) / 2;
    });
}

/** Where a place along the cake is on the grass while it is cut, past the gaps the cuts before it have opened. */
export const cakeX = (s: CakeState, at: number): number =>
    cakeStart(s.L) + at + s.cuts.filter((c) => c < at).length * CAKE.gap.value;

/** The place along the cake under a point on the grass. A point in a gap is the cut that opened it. */
function alongOf(s: CakeState, x: number): number {
    let gone = 0;
    for (const c of [...s.cuts].sort((a, b) => a - b)) {
        const at = x - cakeStart(s.L) - gone;
        if (at <= c) break;
        if (at <= c + CAKE.gap.value) return c;
        gone += CAKE.gap.value;
    }
    return x - cakeStart(s.L) - gone;
}

export function start(level: number): CakeState {
    const L = CAKE_LEVELS[level] ?? CAKE_LEVELS[0];
    const s: CakeState = {
        level,
        L,
        cuts: [],
        before: [],
        knife: { at: L.whole / 2, held: false, shown: false, chop: 0, lift: 0 },
        phase: "cut",
        t: 0,
        lefts: [],
        squash: 0,
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
    };
    s.lefts = together(s);
    return s;
}

function tell(s: CakeState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

function cut(s: CakeState, out: Happening[]): void {
    const at = Math.round(s.knife.at * 20) / 20;
    s.knife.chop = CAKE.chop.value;
    s.knife.shown = true;
    if (at <= 0.2 || at >= s.L.whole - 0.2 || s.cuts.some((c) => Math.abs(c - at) < 0.2)) return;
    s.cuts.push(at);
    s.squash = 0.08;
    const x = cakeX(s, at);
    out.push({ cue: "bump" }, { puff: { x, y: FIELD.near - 0.2, n: 5 } });
    if (s.cuts.length >= cutsNeeded(s.L)) {
        s.phase = "serve";
        s.t = -0.3;
    }
}

function hands(s: CakeState, pad: Pad, out: Happening[]): void {
    const k = s.knife;
    if (pad.touch) {
        k.held = true;
        k.shown = true;
        s.touched = true;
        k.at = Math.max(0, Math.min(s.L.whole, alongOf(s, pad.touch.x)));
    }
    if (pad.lifted) {
        if (k.held) cut(s, out);
        k.held = false;
        return;
    }
    const move = pad.holding.includes("left") ? -1 : pad.holding.includes("right") ? 1 : 0;
    for (const d of pad.pressed)
        if (d === "left" || d === "right") {
            k.shown = true;
            s.touched = true;
            k.at += d === "left" ? -0.25 : 0.25;
        }
    if (move && !pad.pressed.length) k.at += move * CAKE.knife.value * DT;
    k.at = Math.max(0, Math.min(s.L.whole, k.at));
    if (pad.tapped) {
        s.touched = true;
        cut(s, out);
    }
}

const ease = (from: number[], to: number[], k: number) =>
    from.map((x, i) => x + ((to[i] ?? x) - x) * k);

export function step(s: CakeState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.t += DT;
    s.squash *= Math.exp(-12 * DT);
    s.knife.chop = Math.max(0, s.knife.chop - DT);
    if (s.phase === "cut") {
        hands(s, pad, out);
        s.lefts = ease(
            s.lefts.length === piecesNow(s).length ? s.lefts : together(s),
            together(s),
            Math.min(1, 14 * DT),
        );
    } else if (s.phase === "serve") {
        const to = servedLefts(s);
        if (s.t > 0) s.lefts = ease(s.lefts, to, Math.min(1, 7 * DT));
        const arrived = s.lefts.every((x, i) => Math.abs(x - (to[i] ?? x)) < 0.08);
        if (s.t > 0 && (arrived || s.t > 1.6)) {
            const L = s.L,
                fairNow = isFair(L, s.cuts);
            s.phase = fairNow ? "done" : "look";
            s.t = 0;
            if (fairNow) {
                s.won = true;
                tell(s, "Everyone has the same.");
                out.push({ cue: "win" });
                for (const [i, p] of served(L, piecesNow(s)).entries())
                    out.push({
                        burst: {
                            kind: "sparkle",
                            x: (s.lefts[i] ?? 0) + sizeOf(p) / 2,
                            y: FIELD.near - CAKE_TOP - 1.5,
                            n: 6,
                        },
                    });
            } else {
                const off = offBy(served(L, piecesNow(s)), shareOf(L));
                tell(
                    s,
                    off.some((d) => d > L.within) && off.some((d) => d < -L.within)
                        ? "Some pieces are bigger than others."
                        : off.some((d) => d > L.within)
                          ? "Some pieces are too big."
                          : "Some pieces are too small.",
                );
                out.push({ cue: "nope" });
            }
        }
    } else if (s.phase === "look") {
        if (s.t > CAKE.look.value) {
            s.phase = "back";
            s.t = 0;
            s.before = [s.cuts, ...s.before].slice(0, 2);
            s.cuts = [];
            out.push({ cue: "back" });
        }
    } else if (s.phase === "back") {
        const whole = [cakeStart(s.L)];
        s.lefts = [ease(s.lefts.slice(0, 1), whole, Math.min(1, 9 * DT))[0] ?? whole[0] ?? 0];
        if (s.t > 0.5) {
            s.phase = "cut";
            s.lefts = together(s);
            tell(s, "Cut again.");
        }
    } else if (s.phase === "done") {
        s.lefts = ease(s.lefts, servedLefts(s), Math.min(1, 7 * DT));
    }
    return out;
}

export function back(s: CakeState): boolean {
    if (s.phase !== "cut" || !s.cuts.length) return false;
    s.cuts.pop();
    s.lefts = together(s);
    return true;
}

const personLook = [
    { tone: 2, hair: "short", colour: "brown", top: "berry", wear: "trousers" },
    { tone: 5, hair: "coily", colour: "black", top: "sky", wear: "dress" },
    { tone: 4, hair: "braids", colour: "black", top: "mint", wear: "trousers" },
    { tone: 1, hair: "bob", colour: "blonde", top: "glow", wear: "trousers" },
    { tone: 6, hair: "short", colour: "black", top: "tang", wear: "trousers" },
    { tone: 3, hair: "long", colour: "auburn", top: "sky", wear: "dress" },
    { tone: 3, hair: "bun", colour: "brown", top: "berry", wear: "trousers" },
] as const;

function pieceSprite(
    key: string,
    L: CakeLevel,
    from: number,
    to: number,
    left: number,
    lit: boolean,
    squash: number,
    z: number,
): Sprite {
    const w = Math.ceil(to - from) + 1;
    return {
        key,
        art: "longcake",
        params: { whole: L.whole, from, to, candles: L.candles, lit },
        seed: 90,
        x: left - 0.5 + w / 2,
        y: FIELD.near - 5.5 + 3,
        squash,
        z,
    };
}

export function frame(s: CakeState, _rest = false): Frame {
    const L = s.L,
        W = FIELD.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (const [line, name] of [
        [FIELD.far, "far"],
        [FIELD.near, "near"],
    ] as const) {
        for (let x0 = 0; x0 < W.w; x0 += 20) {
            const w = Math.min(20, W.w - x0);
            sprites.push({
                key: `ground:${name}:${x0}`,
                art: "arcade.ground",
                params: { w },
                seed: 80 + x0 + (name === "far" ? 0 : 7),
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
            seed: 13,
            x: 11,
            y: 4,
            z: 0,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 14,
            x: 40,
            y: 3,
            z: 0,
            still: true,
        },
        {
            key: "hedge:0",
            art: "hedge",
            params: { clumps: 3, berries: 3, gap: 0 },
            seed: 23,
            size: 9,
            x: 2.5,
            y: FIELD.far,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "hedge:1",
            art: "hedge",
            params: { clumps: 3, berries: 4, gap: 0 },
            seed: 24,
            size: 9,
            x: 49.5,
            y: FIELD.far,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "balloons",
            art: "balloons",
            params: { count: 3 },
            seed: 33,
            size: 5,
            x: 48,
            y: FIELD.far - 1,
            stand: true,
            z: 2,
            still: true,
        },
    );
    const cheer = s.won;
    for (const [i, x] of places(L).entries()) {
        const look = personLook[i % personLook.length] ?? personLook[0];
        sprites.push({
            key: `child:${i}:${cheer ? "cheer" : "stand"}`,
            art: "person",
            params: { pose: cheer ? "cheer" : "stand", age: "child", ...look },
            seed: 200 + i,
            size: CHILD,
            x,
            y: FIELD.far,
            stand: true,
            z: 2,
            still: true,
        });
    }
    if (L.given) {
        const x = places(L)[0] ?? 7,
            total = L.given.pieces.reduce((a, b) => a + b, 0);
        let left = x - total / 2 - (L.given.pieces.length - 1) * 0.15;
        const bigger = 24;
        for (const [i, p] of L.given.pieces.entries()) {
            sprites.push(
                pieceSprite(
                    `given:${i}`,
                    { ...L, whole: bigger, candles: 0 },
                    i * p,
                    i * p + p,
                    left,
                    cheer,
                    0,
                    3,
                ),
            );
            left += p + 0.3;
        }
    }
    const pieces = piecesNow(s),
        lit = s.won;
    if (s.phase === "back") {
        sprites.push(
            pieceSprite("piece:0", L, 0, L.whole, s.lefts[0] ?? cakeStart(L), false, s.squash, 4),
        );
    } else {
        for (const [i, p] of pieces.entries())
            sprites.push(
                pieceSprite(
                    `piece:${i}`,
                    L,
                    p.from,
                    p.to,
                    s.lefts[i] ?? cakeStart(L) + p.from,
                    lit,
                    s.squash,
                    4,
                ),
            );
    }
    if (L.gone && (s.phase === "cut" || s.phase === "back")) {
        const x = cakeStart(L) + L.whole + (s.phase === "cut" ? s.cuts.length * CAKE.gap.value : 0);
        marks.push({ kind: "box", x, y: FIELD.near - CAKE_TOP, w: L.gone, h: CAKE_TOP });
    }
    if (s.phase === "cut") {
        const top = FIELD.near - CAKE_TOP;
        for (const [n, tries] of s.before.entries()) {
            for (const c of tries) {
                const x = cakeX(s, c);
                marks.push({
                    kind: "line",
                    a: { x, y: top - 0.6 - n * 0.2 },
                    b: { x, y: top + 0.2 },
                    style: "aim",
                });
            }
        }
        const k = s.knife;
        if (k.shown && !s.won) {
            const drop = k.chop > 0 ? 1 - Math.abs(k.chop / CAKE.chop.value - 0.5) * 2 : 0;
            const tip = top - 1.2 + drop * (CAKE_TOP + 1.1);
            const x = cakeX(s, k.at);
            sprites.push({
                key: "knife",
                art: "cakeknife",
                params: {},
                seed: 17,
                x,
                y: tip - KNIFE_TIP,
                z: 8,
            });
            if (k.held || k.chop > 0)
                marks.push({
                    kind: "line",
                    a: { x, y: top + 0.1 },
                    b: { x, y: FIELD.near - 0.1 },
                    style: "aim",
                });
        }
    }
    if (s.phase === "look") {
        const share = shareOf(L);
        for (const [i, p] of served(L, pieces).entries()) {
            const mid = (s.lefts[i] ?? 0) + sizeOf(p) / 2;
            marks.push({
                kind: "box",
                x: mid - share / 2,
                y: FIELD.near - CAKE_TOP - 0.25,
                w: share,
                h: CAKE_TOP + 0.5,
                on: Math.abs(sizeOf(p) - share) <= L.within,
            });
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

/** A place along the cake as a child would say it: nearest a half, a third, a quarter or a sixth of the way. */
function along(at: number, whole: number): string {
    const f = at / whole;
    const words: [number, string][] = [
        [1 / 6, "a sixth"],
        [1 / 4, "a quarter"],
        [1 / 3, "a third"],
        [1 / 2, "half"],
        [2 / 3, "two thirds"],
        [3 / 4, "three quarters"],
        [5 / 6, "five sixths"],
    ];
    const near = words.reduce((best, w) => (Math.abs(w[0] - f) < Math.abs(best[0] - f) ? w : best));
    return Math.abs(near[0] - f) < 0.02
        ? `${near[1]} of the way along`
        : `about ${near[1]} of the way along`;
}

export function say(s: CakeState): string {
    const L = s.L,
        parts = [s.said];
    parts.push(
        `The cake is to be shared between ${L.names.join(", ").replace(/, ([^,]*)$/, " and $1")}.`,
    );
    if (L.given)
        parts.push(
            `${L.given.name} already has two pieces, each a sixth of a cake as long as this one.`,
        );
    if (L.gone) parts.push("A quarter of the cake has been eaten.");
    const cuts = [...s.cuts].sort((a, b) => a - b);
    parts.push(
        cuts.length
            ? `There ${cuts.length === 1 ? "is a cut" : `are ${cuts.length} cuts`}: ${cuts.map((c) => along(c, L.whole)).join(", ")}.`
            : "The cake is not cut yet.",
    );
    if (s.phase === "cut") parts.push(`The knife is ${along(s.knife.at, L.whole)}.`);
    return parts.filter(Boolean).join(" ");
}

export const cakeGame: ActionGame<CakeState> = {
    id: "share",
    title: "Cut the cake",
    group: "action",
    levels: CAKE_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    listed: false,
    plays: { activity: "share.fair-shares", levels: [0, 2, 4] },
    cover: { art: "longcake", params: { whole: 12, from: 0, to: 12, candles: 4, lit: true } },
    hint: "Hold a finger over the cake and let go to cut, or move the knife with the arrow keys and press space",
    controls: {},
    start,
    step,
    frame,
    say,
    back,
    tuning: CAKE,
    note: (s) => (!s.touched ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : ""),
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => s.phase === "serve" || s.phase === "back" || s.knife.chop > 0,
    },
};
