// Marble pegs: a marble board in the way of Peggle and pachinko. The launcher at the top turns to
// follow a finger or the arrows, and a marble fired from it falls through numbered pegs, lighting each
// one it strikes, rolling along the long ones and rattling between the round ones, until it drops out
// of the bottom or into the bucket sliding along it, which gives the marble back. The lit pegs pop away
// one after another once the marble is gone. The maths is in which pegs count: a sum to make exactly,
// only the even pegs, only the multiples of three, the pegs in counting order, every five on the board.
// A peg that does not count lights grey, says why and stays, so the board is never spoiled by a stray
// bounce. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels, RoundEnd } from "./game";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import { SUB } from "../../engine/motion/pinball";
import {
    bucketAt,
    liveOf,
    pegAt,
    angleAt,
    stepBoard,
    touching,
    type Board,
    type Hit,
    type Live,
    type Marble,
    type Peg,
} from "../../engine/motion/pegs";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import { MARBLEBOARD } from "../../engine/parts/sport/marbleboard";
import { BUCKET_HALF } from "../../engine/parts/sport/pegbucket";

const RATE = 60;
const DT = 1 / SUB;
/** Sub-steps in a step: four at full speed, one while the fever slows the last peg down. */
const TICKS = SUB / RATE;
const F = MARBLEBOARD.field;

/** The world: the board, with room either side for its place. */
const WORLD = { w: 84, h: 38 };
/** The board drawing's top left in the world, and the field's top left, which the game's squares count from. */
const BOARD_AT = { x: WORLD.w / 2 - MARBLEBOARD.w / 2, y: 1 };
export const FIELD_AT = { x: BOARD_AT.x + F.x, y: BOARD_AT.y + F.y };
const VIEW = { w: 24, h: WORLD.h };

export const LAUNCHER = MARBLEBOARD.launcher;
/** Squares from the launcher's pivot to where the marble leaves it. */
const MUZZLE = 1.3;
/** A step of the aim, half a degree: a finger and the keys both land on these, so a try found by one is the same try by the other. */
export const NOTCH = Math.PI / 360;
/** Notches either side of straight down the aim can turn. */
export const REACH = 160;
const R_ROUND = 0.72,
    R_LONG = 0.35;

type Ask =
    | { kind: "atleast"; total: number }
    | { kind: "sum"; total: number }
    | { kind: "even"; count: number }
    | { kind: "multiples"; of: number }
    | { kind: "order"; seq: number[] }
    | { kind: "clear"; n: number }
    | { kind: "free" };

type Place =
    "garden" | "candy" | "seaside" | "night" | "clock" | "shelf" | "bricks" | "fair" | "paper";
type Look = "peg" | "sweet" | "shell" | "star" | "cog" | "bulb" | "plank" | "brick";

/** A peg as a level lays it out: where it stands in the field, its number (nought for none), and a long one's length and angle. */
interface PegSpec {
    x: number;
    y: number;
    n: number;
    long?: { len: number; angle: number };
    move?: { dx: number; dy: number; period: number };
    spin?: number;
}

export interface PegLevel extends ActionLevel {
    prompt: string;
    place: Place;
    look: Look;
    pegs: PegSpec[];
    ask: Ask;
    marbles: number;
    /** How far the dotted aim reaches: past two bounces, past the first, to the first peg, or a short stub. */
    preview: 0 | 1 | 2 | 3;
    /** How the bucket slides: squares either side of the middle, and seconds there and back. */
    bucket?: { dx: number; period: number };
}

const TONES = ["sky", "berry", "tang", "mint"] as const;

/** Pegs in staggered rows across the field, numbered from `nums` in turn. */
function rows(
    ys: number[],
    x0: number,
    x1: number,
    cols: number,
    nums: number[],
    skip = 0,
): PegSpec[] {
    const out: PegSpec[] = [];
    let k = skip;
    ys.forEach((y, r) => {
        const n = r % 2 === 0 ? cols : cols - 1,
            gap = (x1 - x0) / (cols - 1),
            from = r % 2 === 0 ? x0 : x0 + gap / 2;
        for (let i = 0; i < n; i++)
            out.push({ x: from + i * gap, y, n: nums[k++ % nums.length] ?? 1 });
    });
    return out;
}

/** Pegs round an arc about `cx`, `cy` from angle `a0` to `a1`, in radians with y down. */
function arc(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    a0: number,
    a1: number,
    count: number,
    nums: number[],
    skip = 0,
): PegSpec[] {
    return Array.from({ length: count }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / Math.max(1, count - 1);
        return {
            x: cx + Math.cos(a) * rx,
            y: cy + Math.sin(a) * ry,
            n: nums[(i + skip) % nums.length] ?? 1,
        };
    });
}

const bar = (x: number, y: number, n: number, len: number, angle: number): PegSpec => ({
    x,
    y,
    n,
    long: { len, angle },
});

export const PEG_LEVELS: Levels<PegLevel> = [
    {
        title: "The garden fence",
        goal: "Make 10 or more.",
        prompt: "Point where the marble should go and let go, or turn the launcher with the arrows and fire with space. Every peg it lights adds its number. Make 10 or more.",
        grades: [1, 1],
        place: "garden",
        look: "peg",
        pegs: rows([9, 12.5, 16, 19.5], 3, 17, 5, [1, 2, 3, 2]),
        ask: { kind: "atleast", total: 10 },
        marbles: 5,
        preview: 3,
    },
    {
        title: "The sweet jar",
        goal: "Make exactly 10.",
        prompt: "Make exactly 10. A sweet that would take the total past 10 lights grey, and that marble counts no more.",
        grades: [1, 2],
        place: "candy",
        look: "sweet",
        pegs: [
            ...arc(10, 13, 7.2, 9, 0.25, Math.PI - 0.25, 9, [3, 4, 5, 6, 7, 5, 4, 6, 3]),
            ...rows([8.5, 12], 5.5, 14.5, 4, [7, 5, 4, 6, 3, 7, 5]),
            ...rows([15.5], 7, 13, 3, [4, 6, 3]),
        ],
        ask: { kind: "sum", total: 10 },
        marbles: 4,
        preview: 2,
    },
    {
        title: "The seaside",
        goal: "Light 4 even shells.",
        prompt: "Light 4 shells with even numbers. An odd shell lights grey and does not count.",
        grades: [1, 2],
        place: "seaside",
        look: "shell",
        pegs: [
            ...arc(10, 6, 8, 3, 0.35, Math.PI - 0.35, 6, [3, 8, 5, 7, 1, 9]),
            ...arc(10, 11, 8, 3, 0.35, Math.PI - 0.35, 6, [5, 1, 6, 9, 3, 7]),
            ...arc(10, 16, 8, 3, 0.35, Math.PI - 0.35, 6, [7, 2, 3, 5, 4, 1]),
        ],
        ask: { kind: "even", count: 4 },
        marbles: 4,
        preview: 2,
    },
    {
        title: "A starry night",
        goal: "Light every multiple of 3.",
        prompt: "Light every star in the 3 times table: 3, 6, 9 and 12. The other stars light grey.",
        grades: [2, 3],
        place: "night",
        look: "star",
        pegs: [
            ...rows(
                [8, 11.5, 15, 18.5, 22],
                2.5,
                17.5,
                6,
                [
                    1, 5, 7, 2, 10, 4, 8, 11, 1, 5, 2, 7, 10, 4, 8, 11, 5, 1, 7, 2, 4, 8, 10, 5, 11,
                    1, 7,
                ],
            ),
        ].map((p, i) =>
            i === 3
                ? { ...p, n: 3 }
                : i === 8
                  ? { ...p, n: 6 }
                  : i === 15
                    ? { ...p, n: 9 }
                    : i === 23
                      ? { ...p, n: 12 }
                      : p,
        ),
        ask: { kind: "multiples", of: 3 },
        marbles: 3,
        preview: 1,
    },
    {
        title: "Clockwork",
        goal: "Light 2, 4, 6 and 8 in order.",
        prompt: "Light the cogs in counting order: 2, then 4, then 6, then 8. A cog out of turn lights grey. Some cogs move, and the bar in the middle turns.",
        grades: [2, 3],
        place: "clock",
        look: "cog",
        pegs: [
            ...rows([8, 12], 3, 17, 5, [2, 5, 4, 1, 6, 8, 3, 2, 7]),
            { x: 10, y: 16.5, n: 0, long: { len: 5, angle: 0 }, spin: 1.2 },
            { x: 4, y: 20, n: 6, move: { dx: 2, dy: 0, period: 4 } },
            { x: 16, y: 20, n: 4, move: { dx: -2, dy: 0, period: 4 } },
            ...rows([23.5], 4, 16, 4, [8, 3, 7, 1]),
        ],
        ask: { kind: "order", seq: [2, 4, 6, 8] },
        marbles: 4,
        preview: 1,
    },
    {
        title: "The slanted shelves",
        goal: "Make exactly 20 with three marbles.",
        prompt: "Make exactly 20 with three marbles. The marble rolls along the shelves. A peg that would go past 20 lights grey, and that marble counts no more.",
        grades: [3, 3],
        place: "shelf",
        look: "peg",
        pegs: [
            bar(5, 8, 0, 6, 0.32),
            bar(15, 11, 0, 6, -0.32),
            bar(6, 17, 0, 6, 0.3),
            bar(14.5, 21, 0, 5, -0.3),
            ...rows([6.5], 10, 17, 3, [6, 8, 7]),
            ...rows([10.5], 3, 9, 3, [9, 5, 11]),
            ...rows([14.5], 11, 17, 3, [4, 12, 8]),
            ...rows([18.5], 3, 9, 3, [6, 9, 7]),
            ...rows([24], 4, 16, 5, [5, 11, 4, 12, 9]),
        ],
        ask: { kind: "sum", total: 20 },
        marbles: 3,
        preview: 1,
    },
    {
        title: "The brick wall",
        goal: "Clear all the 5s.",
        prompt: "Clear every 5 on the wall. Bricks and pegs with other numbers light grey and stay.",
        grades: [3, 4],
        place: "bricks",
        look: "peg",
        pegs: [
            bar(4, 9, 3, 3, 0),
            bar(8, 9, 5, 3, 0),
            bar(15, 9, 2, 3, 0),
            bar(6, 15, 4, 3, 0),
            bar(14, 15, 5, 3, 0),
            bar(10, 21, 1, 3, 0),
            ...rows([12, 18], 3, 17, 5, [2, 5, 3, 4, 1, 3, 2, 5, 4]),
            ...rows([24], 4, 16, 4, [3, 1, 4, 2]),
        ],
        ask: { kind: "clear", n: 5 },
        marbles: 5,
        preview: 0,
    },
    {
        title: "The fairground",
        goal: "Make exactly 100 with three marbles.",
        prompt: "Make exactly 100 with three marbles. A light that would go past 100 stays grey, and that marble counts no more.",
        grades: [4, 4],
        place: "fair",
        look: "bulb",
        pegs: rows([7.5, 11, 14.5, 18, 21.5], 2.5, 17.5, 6, [25, 30, 35, 40, 15, 45, 30, 25, 35]),
        ask: { kind: "sum", total: 100 },
        marbles: 3,
        preview: 0,
    },
    {
        title: "Free play",
        goal: "Play for the best score.",
        prompt: "Every peg adds its number. Ten marbles: play for your best score.",
        grades: [1, 4],
        place: "paper",
        look: "peg",
        pegs: [
            bar(5, 10, 5, 4, 0.25),
            bar(15, 10, 5, 4, -0.25),
            ...rows([7, 13.5, 17, 20.5], 2.5, 17.5, 6, [1, 2, 3, 4, 5, 10, 2, 3]),
        ],
        ask: { kind: "free" },
        marbles: 10,
        preview: 2,
    },
];

const PEGS = {
    gravity: knob(
        18,
        8,
        22,
        0.5,
        "squares a second each second",
        "how fast the marble falls: slow enough to follow, quick enough not to drag",
    ),
    speed: knob(
        16,
        9,
        22,
        0.5,
        "squares a second",
        "how fast the marble leaves the launcher, so a sideways shot reaches the wall",
    ),
};

const pegId = (i: number) => `p${i}`;

/** The board a level plays on, in the field's squares. */
function boardOf(L: PegLevel): Board {
    return {
        pegs: L.pegs.map((p, i): Peg => ({
            id: pegId(i),
            x: p.x,
            y: p.y,
            r: p.long ? R_LONG : R_ROUND,
            ...(p.long ? { long: p.long } : {}),
            ...(p.move ? { move: p.move } : {}),
            ...(p.spin !== undefined ? { spin: p.spin } : {}),
        })),
        walls: [
            { a: { x: 0, y: -2 }, b: { x: 0, y: F.h + 2 } },
            { a: { x: F.w, y: -2 }, b: { x: F.w, y: F.h + 2 } },
            { a: { x: 0, y: 0 }, b: { x: F.w, y: 0 } },
        ],
        bucket: {
            x: F.w / 2,
            y: MARBLEBOARD.rail,
            half: BUCKET_HALF,
            rim: 0.3,
            dx: L.bucket?.dx ?? 7,
            period: L.bucket?.period ?? 5,
        },
        gravity: PEGS.gravity.value,
        drain: F.h + 0.8,
        r: 0.5,
    };
}

type Stage = "aim" | "fly" | "pop" | "cheer";

export interface PegState {
    phase: number;
    L: PegLevel;
    board: Board;
    live: Live;
    ball: Marble;
    steps: number;
    stage: Stage;
    /** The aim, in notches from straight down, positive to the left; the angle the launcher is drawn at; and how long an arrow has been held. */
    aim: number;
    shown: number;
    hold: number;
    /** Where the mouse last rested, so the launcher follows only a mouse that moves. */
    hover: Pt | null;
    /** Marbles in the tray, not counting one in flight. */
    left: number;
    /** This shot: every peg struck, those that counted, and those that lit grey. */
    shot: string[];
    lit: string[];
    grey: string[];
    /** A marble that went past an exact target counts nothing more. */
    spent: boolean;
    /** What has counted so far, in order: the numbers of a sum, or the pegs of the others. */
    parts: number[];
    sum: number;
    next: number;
    /** The pegs popped off the board, and the step each went, for its pop. */
    popped: Record<string, number>;
    queue: string[];
    /** When a peg was last struck, for its flash. */
    struck: Record<string, number>;
    /** The time on the board the shot meets the target, found when it is fired, and whether this state is that look ahead. */
    fever: number | null;
    sim: boolean;
    zoom: number;
    cam: Pt;
    /** Where the marble has just been, for the short trail behind it when it is quick. */
    trail: Pt[];
    /** How long the marble has stayed within a little of `anchor`, and of its lowest point, in seconds of board time. */
    anchor: Pt;
    still: number;
    deepest: number;
    since: number;
    flight: number;
    caught: number;
    wait: number;
    won: boolean;
    end: "won" | "out" | null;
    cheer: number;
    score: number;
    best: number;
    touched: boolean;
    note: string;
}

const angleOf = (aim: number) => Math.PI / 2 + aim * NOTCH;

/** The aim in notches towards a point in the field. */
function aimToward(p: Pt): number {
    let a = Math.atan2(p.y - LAUNCHER.y, p.x - LAUNCHER.x);
    if (a < -Math.PI / 2) a += Math.PI * 2;
    return Math.max(-REACH, Math.min(REACH, Math.round((a - Math.PI / 2) / NOTCH)));
}

const loaded = (aim: number): Marble => {
    const a = angleOf(aim);
    return {
        x: LAUNCHER.x + Math.cos(a) * MUZZLE,
        y: LAUNCHER.y + Math.sin(a) * MUZZLE,
        vx: 0,
        vy: 0,
        w: 0,
        a: 0,
        mode: "caught",
    };
};

export function startPegs(L: PegLevel, phase = 0): PegState {
    return {
        phase,
        L,
        board: boardOf(L),
        live: liveOf(),
        ball: loaded(0),
        steps: 0,
        stage: "aim",
        aim: 0,
        shown: angleOf(0),
        hold: 0,
        hover: null,
        left: L.marbles,
        shot: [],
        lit: [],
        grey: [],
        spent: false,
        parts: [],
        sum: 0,
        next: 0,
        popped: {},
        queue: [],
        struck: {},
        fever: null,
        sim: false,
        zoom: 1,
        cam: { x: WORLD.w / 2, y: WORLD.h / 2 },
        trail: [],
        anchor: { x: 0, y: 0 },
        still: 0,
        deepest: 0,
        since: 0,
        flight: 0,
        caught: 0,
        wait: 0,
        won: false,
        end: null,
        cheer: -999,
        score: 0,
        best: 0,
        touched: false,
        note: "",
    };
}

const valueOf = (s: PegState, id: string): number => s.L.pegs[Number(id.slice(1))]?.n ?? 0;

/** The pegs a level wants lit, for the asks that name them: every multiple, or every peg of a number. */
function wantedIds(L: PegLevel): string[] {
    const a = L.ask;
    return L.pegs
        .map((p, i) =>
            (a.kind === "multiples" && p.n > 0 && p.n % a.of === 0) ||
            (a.kind === "clear" && p.n === a.n)
                ? pegId(i)
                : "",
        )
        .filter((id) => id !== "");
}

/** How much of the target is met, and of how much. */
export function progressOf(s: PegState): { completed: number; total: number } {
    const a = s.L.ask;
    switch (a.kind) {
        case "atleast":
        case "sum":
            return { completed: Math.min(a.total, s.sum), total: a.total };
        case "even":
            return { completed: Math.min(a.count, s.parts.length), total: a.count };
        case "multiples":
        case "clear":
            return { completed: s.parts.length, total: wantedIds(s.L).length };
        case "order":
            return { completed: s.next, total: a.seq.length };
        case "free":
            return { completed: 0, total: 1 };
    }
}

function askWords(L: PegLevel): string {
    const a = L.ask;
    switch (a.kind) {
        case "atleast":
            return `Make ${a.total} or more`;
        case "sum":
            return L.marbles <= 3
                ? `Make exactly ${a.total} with ${L.marbles} marbles`
                : `Make exactly ${a.total}`;
        case "even":
            return `Light ${a.count} even pegs`;
        case "multiples":
            return `Light every multiple of ${a.of}`;
        case "order":
            return `In order: ${a.seq.join(", ")}`;
        case "clear":
            return `Clear all the ${a.n}s`;
        case "free":
            return "Free play";
    }
}

/** What the board under the target says: the sum so far, or what is lit and what is next. */
function tallyWords(s: PegState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "atleast":
        case "sum":
            return s.parts.length > 1 ? `${s.parts.join(" + ")} = ${s.sum}` : `${s.sum} so far`;
        case "even":
            return `${s.parts.length} of ${a.count}${s.parts.length ? `: ${s.parts.join(", ")}` : ""}`;
        case "multiples":
            return `${s.parts.length} of ${wantedIds(s.L).length}${s.parts.length ? `: ${s.parts.join(", ")}` : ""}`;
        case "order":
            return s.next < a.seq.length ? `Next: ${a.seq[s.next] ?? ""}` : "All lit";
        case "clear": {
            const left = wantedIds(s.L).length - s.parts.length;
            return `${left} left`;
        }
        case "free":
            return `Score ${s.score} · best ${Math.max(s.best, s.score)}`;
    }
}

/** A rising scale through a shot, as Peggle's pegs climb: the nth peg lit sounds this much higher. */
const SCALE = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
const climb = (i: number) =>
    (SCALE[i % SCALE.length] ?? 1) * 2 ** Math.floor(i / SCALE.length) * 0.8;

function meet(s: PegState, words: string): void {
    s.won = true;
    s.note = words;
    if (!s.sim) s.cheer = s.steps;
}

/** Counts a struck peg towards the target, once a shot, or lights it grey and says why. */
export function strike(s: PegState, id: string, out: Happening[]): void {
    if (s.shot.includes(id)) return;
    s.shot.push(id);
    const n = valueOf(s, id),
        a = s.L.ask;
    if (n === 0) return;
    const count = () => {
        s.lit.push(id);
        out.push({ cue: "ring", pitch: climb(s.lit.length - 1) });
    };
    const grey = (why: string) => {
        s.grey.push(id);
        s.note = why;
        out.push({ cue: "bump", strength: 0.35, pitch: 0.55 });
    };
    if (s.won) {
        // the target is met: what the marble meets on its way out lights for the cascade and counts no more
        count();
        return;
    }
    switch (a.kind) {
        case "atleast": {
            const was = s.sum;
            s.sum += n;
            s.parts.push(n);
            count();
            if (s.sum >= a.total)
                meet(s, `${s.parts.join(" + ")} = ${s.sum}. That is ${a.total} or more.`);
            else s.note = `${was} + ${n} = ${s.sum}. ${a.total - s.sum} more.`;
            return;
        }
        case "sum": {
            const was = s.sum;
            if (s.spent) {
                s.grey.push(id);
                return;
            }
            if (was + n > a.total) {
                // past the target, the marble is spent: nothing more it meets counts until the next one
                s.spent = true;
                grey(
                    `${was} + ${n} would make ${was + n}, more than ${a.total}, so the ${n} stays grey and this marble counts no more. Still ${was}.`,
                );
                return;
            }
            s.sum += n;
            s.parts.push(n);
            count();
            if (s.sum === a.total)
                meet(s, `${s.parts.join(" + ")} = ${a.total}. That makes exactly ${a.total}.`);
            else s.note = `${was} + ${n} = ${s.sum}. ${a.total - s.sum} more.`;
            return;
        }
        case "even":
            if (n % 2 !== 0) {
                grey(`${n} is odd, so it stays grey.`);
                return;
            }
            s.parts.push(n);
            count();
            if (s.parts.length >= a.count)
                meet(s, `${s.parts.join(", ")}: ${a.count} even pegs lit.`);
            else s.note = `${n} is even: ${s.parts.length} of ${a.count}.`;
            return;
        case "multiples":
            if (n % a.of !== 0) {
                grey(`${n} is not in the ${a.of} times table, so it stays grey.`);
                return;
            }
            s.parts.push(n);
            count();
            if (s.parts.length >= wantedIds(s.L).length)
                meet(
                    s,
                    `${[...s.parts].sort((x, y) => x - y).join(", ")}: every multiple of ${a.of} lit.`,
                );
            else
                s.note = `${n} is ${n / a.of} times ${a.of}. ${wantedIds(s.L).length - s.parts.length} more to find.`;
            return;
        case "order": {
            const want = a.seq[s.next];
            if (n !== want) {
                grey(`That was ${n}. ${want ?? ""} is next.`);
                return;
            }
            s.parts.push(n);
            s.next++;
            count();
            if (s.next >= a.seq.length) meet(s, `${a.seq.join(", ")}: all lit in order.`);
            else s.note = `${n} is lit. ${a.seq[s.next] ?? ""} is next.`;
            return;
        }
        case "clear":
            if (n !== a.n) {
                grey(`That was a ${n}. Only the ${a.n}s count.`);
                return;
            }
            s.parts.push(n);
            count();
            if (s.parts.length >= wantedIds(s.L).length) meet(s, `Every ${a.n} is cleared.`);
            else s.note = `${wantedIds(s.L).length - s.parts.length} more ${a.n}s to clear.`;
            return;
        case "free":
            s.score += n;
            s.best = Math.max(s.best, s.score);
            count();
            s.note = `+${n}`;
            return;
    }
}

/** Takes a peg off the board, with a pop. */
function pop(s: PegState, id: string, out: Happening[], pitch: number): void {
    if (s.live.off[id]) return;
    s.live.off[id] = true;
    s.popped[id] = s.steps;
    if (s.sim) return;
    const p = s.board.pegs.find((q) => q.id === id);
    out.push({ cue: "level", pitch });
    if (p) {
        const c = pegAt(p, s.live.t);
        out.push({ burst: { kind: "sparkle", x: c.x + FIELD_AT.x, y: c.y + FIELD_AT.y, n: 5 } });
    }
}

/** A marble that has stopped where nothing will move it: the pegs it rests on pop away, as Peggle's do. */
function unstick(s: PegState, out: Happening[]): void {
    const m = s.ball,
        near = s.board.pegs.filter(
            (p) => !s.live.off[p.id] && touching(m, p, s.board, s.live.t, 0.25),
        );
    if (near.length) {
        for (const p of near) {
            pop(s, p.id, out, 1.4);
            s.lit = s.lit.filter((id) => id !== p.id);
        }
        if (!s.sim) s.note = "The marble was stuck, so the pegs holding it popped away.";
    } else {
        m.vy -= 4;
        m.vx += m.x < F.w / 2 ? 2 : -2;
    }
    s.still = 0;
    s.since = 0;
    s.anchor = { x: m.x, y: m.y };
    s.deepest = m.y;
}

function react(s: PegState, hits: Hit[], out: Happening[]): void {
    const pan = (x: number) => panOf(x, F.w / 2, F.w);
    for (const h of hits)
        switch (h.kind) {
            case "peg": {
                const first = !s.shot.includes(h.id);
                s.struck[h.id] = s.steps;
                strike(s, h.id, out);
                if (!first && h.speed > 2 && !s.sim)
                    out.push({
                        cue: "place",
                        strength: Math.min(0.6, h.speed / 20),
                        pitch: 1.2,
                        pan: pan(h.x),
                    });
                break;
            }
            case "wall":
            case "rim":
                if (h.speed > 2.5 && !s.sim)
                    out.push({
                        cue: "place",
                        strength: Math.min(0.6, h.speed / 24),
                        pitch: h.kind === "rim" ? 0.8 : 1,
                        pan: pan(h.x),
                    });
                break;
            case "caught":
                s.caught++;
                if (!s.sim) {
                    out.push(
                        { cue: "crash", strength: 0.6, pan: pan(h.x) },
                        { cue: "lift", pitch: 1.5 },
                    );
                    out.push({
                        burst: { kind: "sparkle", x: h.x + FIELD_AT.x, y: h.y + FIELD_AT.y, n: 10 },
                    });
                }
                break;
            case "gone":
                if (!s.sim) out.push({ cue: "back", strength: 0.4, pan: pan(h.x) });
                break;
        }
}

/** One sub-step of the board: the marble moves, what it meets counts, and a stuck marble is freed. */
function tick(s: PegState, out: Happening[]): void {
    react(s, stepBoard(s.ball, s.board, s.live, DT), out);
    if (s.stage !== "fly") return;
    const m = s.ball;
    s.flight += DT;
    if (m.mode === "free") {
        if (Math.hypot(m.x - s.anchor.x, m.y - s.anchor.y) > 0.6) {
            s.anchor = { x: m.x, y: m.y };
            s.still = 0;
        } else s.still += DT;
        if (m.y > s.deepest + 0.5) {
            s.deepest = m.y;
            s.since = 0;
        } else s.since += DT;
        // stopped for a second and a half, or rocking in one place for four
        if (s.still > 1.5 || s.since > 4) unstick(s, out);
        return;
    }
    // the shot is over: the marble dropped out of the bottom or into the bucket
    s.stage = "pop";
    s.wait = 0;
    s.queue = [...s.lit];
    s.grey = [];
    if (m.mode === "caught") {
        s.left++;
        if (s.L.ask.kind === "free") {
            s.score += 10;
            s.best = Math.max(s.best, s.score);
        }
        if (!s.won && !s.sim) s.note = "Into the bucket: that marble comes back.";
    }
}

/** Fires the marble from the launcher as it is aimed now. */
function fire(s: PegState, out: Happening[]): void {
    if (s.stage !== "aim" || s.left <= 0 || s.end) return;
    const a = angleOf(s.aim),
        v = PEGS.speed.value;
    s.ball = {
        x: LAUNCHER.x + Math.cos(a) * MUZZLE,
        y: LAUNCHER.y + Math.sin(a) * MUZZLE,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        w: 0,
        a: 0,
        mode: "free",
    };
    s.left--;
    s.stage = "fly";
    s.shot = [];
    s.lit = [];
    s.grey = [];
    s.spent = false;
    s.anchor = { x: s.ball.x, y: s.ball.y };
    s.still = 0;
    s.since = 0;
    s.deepest = s.ball.y;
    s.flight = 0;
    s.fever = null;
    s.trail = [];
    s.touched = true;
    if (s.sim) return;
    out.push({ cue: "creak", strength: 0.5 }, { cue: "lift", strength: 0.4, pitch: 0.9 });
    // the shot is decided as it leaves, so the game can tell now whether its last peg will meet the target
    const ahead: PegState = { ...structuredClone(s), sim: true };
    for (let i = 0; i < SUB * 40 && ahead.stage === "fly" && !ahead.won; i++) tick(ahead, []);
    if (ahead.won) s.fever = ahead.live.t;
}

/** Whether the board's clock is in the fever's slow moment either side of the last peg. */
const slowNow = (s: PegState): boolean =>
    s.fever !== null && s.live.t > s.fever - 0.3 && s.live.t < s.fever + 0.12;

/** Reads the hands: the arrows turn the aim, a finger or a resting mouse points it, and a finger let go or space fires. */
function aimFrom(s: PegState, pad: Pad, out: Happening[]): void {
    const local = (p: Pt): Pt => ({ x: p.x - FIELD_AT.x, y: p.y - FIELD_AT.y });
    for (const d of pad.pressed) {
        if (d === "left") s.aim = Math.min(REACH, s.aim + 1);
        if (d === "right") s.aim = Math.max(-REACH, s.aim - 1);
    }
    const held = pad.holding.includes("left") ? 1 : pad.holding.includes("right") ? -1 : 0;
    if (held !== 0 && pad.pressed.length === 0) {
        s.hold++;
        // a held arrow waits a moment, then turns a notch a step, and three once held a while
        if (s.hold > 10)
            s.aim = Math.max(-REACH, Math.min(REACH, s.aim + held * (s.hold > 40 ? 3 : 1)));
    } else s.hold = 0;
    if (
        pad.hover &&
        (!s.hover || Math.hypot(pad.hover.x - s.hover.x, pad.hover.y - s.hover.y) > 0.05)
    ) {
        s.hover = { ...pad.hover };
        s.aim = aimToward(local(pad.hover));
    }
    if (pad.touch) {
        s.touched = true;
        s.aim = aimToward(local(pad.touch));
    }
    if (pad.lifted) {
        const at = local(pad.lifted);
        s.aim = aimToward(at);
        // a finger let go on the launcher itself puts the aim down without firing
        if (Math.hypot(at.x - LAUNCHER.x, at.y - LAUNCHER.y) > 1.6) fire(s, out);
    }
    if (pad.tapped) fire(s, out);
}

function stepPegs(s: PegState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.end) return out;
    if (pad.touch || pad.holding.length || pad.tapped || pad.lifted) s.touched = true;
    aimFrom(s, pad, out);
    s.shown += (angleOf(s.aim) - s.shown) * (1 - Math.exp(-18 / RATE));
    const n = slowNow(s) ? 1 : TICKS;
    for (let i = 0; i < n; i++) tick(s, out);
    if (s.stage === "aim") s.ball = loaded(s.aim);
    const m = s.ball;
    if (s.steps % 2 === 0) {
        if (s.stage === "fly" && m.mode === "free" && Math.hypot(m.vx, m.vy) > 8)
            s.trail = [...s.trail, { x: m.x, y: m.y }].slice(-6);
        else if (s.trail.length) s.trail = s.trail.slice(1);
    }
    if (s.stage === "pop") {
        s.wait++;
        // the lit pegs pop one after another, each a little higher than the last
        if (s.wait % 5 === 0 && s.queue.length) {
            const id = s.queue.shift();
            if (id) pop(s, id, out, climb(s.lit.length - s.queue.length - 1) * 1.1);
        } else if (!s.queue.length && s.wait > 12) {
            if (s.won) {
                s.stage = "cheer";
                s.wait = 0;
                s.cheer = s.steps;
                out.push({ event: { kind: "won" } }, { cue: "win" });
                for (const [x, y] of [
                    [4, 10],
                    [16, 10],
                    [10, 18],
                ] as const)
                    out.push({
                        burst: { kind: "sparkle", x: x + FIELD_AT.x, y: y + FIELD_AT.y, n: 14 },
                    });
            } else if (s.L.ask.kind === "sum" && !canMake(s, s.L.ask.total - s.sum)) {
                s.note = `${s.sum} so far, and no pegs left on the board make ${s.L.ask.total - s.sum}. Again?`;
                s.end = "out";
            } else if (s.left <= 0) {
                if (s.L.ask.kind === "free") {
                    s.best = Math.max(s.best, s.score);
                    s.note = `You scored ${s.score}. Your best is ${s.best}.`;
                    s.end = "won";
                    s.won = true;
                    out.push({ event: { kind: "won" } }, { cue: "win" });
                } else {
                    s.note = outWords(s);
                    s.end = "out";
                }
            } else {
                s.stage = "aim";
                s.fever = null;
                // free play sets a new board once every numbered peg is gone
                if (
                    s.L.ask.kind === "free" &&
                    s.L.pegs.every((p, i) => p.n === 0 || s.live.off[pegId(i)])
                ) {
                    s.live.off = {};
                    s.popped = {};
                    s.note = "A new board.";
                }
            }
        }
    }
    if (s.stage === "cheer" && ++s.wait > RATE * 1.2) s.end = "won";
    // the fever: the camera closes on the marble as it nears the last peg, and comes back once it is met
    const fever = slowNow(s) && s.ball.mode === "free",
        aim = fever
            ? { x: s.ball.x + FIELD_AT.x, y: s.ball.y + FIELD_AT.y }
            : { x: WORLD.w / 2, y: WORLD.h / 2 },
        k = 1 - Math.exp(-(fever ? 6 : 3) / RATE);
    s.zoom += ((fever ? 1.8 : 1) - s.zoom) * k;
    s.cam = { x: s.cam.x + (aim.x - s.cam.x) * k, y: s.cam.y + (aim.y - s.cam.y) * k };
    return out;
}

/** Whether `total` can still be made from the numbers of the pegs left on the board, each used once. */
export function canMake(s: PegState, total: number): boolean {
    let can = new Set([0]);
    s.L.pegs.forEach((p, i) => {
        if (p.n <= 0 || s.live.off[pegId(i)]) return;
        const next = new Set(can);
        for (const v of can) if (v + p.n <= total) next.add(v + p.n);
        can = next;
    });
    return can.has(total);
}

function outWords(s: PegState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "atleast":
        case "sum":
            return `Out of marbles at ${s.sum} of ${a.total}. Again?`;
        case "even":
            return `Out of marbles with ${s.parts.length} of ${a.count} even pegs lit. Again?`;
        case "multiples":
            return `Out of marbles with ${s.parts.length} of the ${wantedIds(s.L).length} multiples of ${a.of} lit. Again?`;
        case "order":
            return `Out of marbles with ${a.seq.slice(0, s.next).join(", ") || "none"} lit, and ${a.seq[s.next] ?? ""} next. Again?`;
        case "clear":
            return `Out of marbles with ${wantedIds(s.L).length - s.parts.length} ${a.n}s left. Again?`;
        case "free":
            return `You scored ${s.score}.`;
    }
}

/**
 * The marble's way from the launcher at the aim now, stepped by the board's own sub-step: to the first
 * peg it strikes, on past a bounce or two on the first levels, or a short stub on the last.
 */
export function guideOf(s: PegState): { pts: Pt[]; first: string | null } {
    const a = angleOf(s.aim),
        v = PEGS.speed.value,
        m: Marble = {
            x: LAUNCHER.x + Math.cos(a) * MUZZLE,
            y: LAUNCHER.y + Math.sin(a) * MUZZLE,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            w: 0,
            a: 0,
            mode: "free",
        },
        live: Live = { t: s.live.t, off: s.live.off },
        pts: Pt[] = [{ x: m.x, y: m.y }],
        preview = s.L.preview;
    let first: string | null = null,
        bounces = 0,
        after = 0,
        gone = 0,
        laid = 0;
    for (let i = 0; i < SUB * 3 && m.mode === "free"; i++) {
        const hits = stepBoard(m, s.board, live, DT);
        gone += Math.hypot(m.vx, m.vy) * DT;
        if (gone - laid > 0.55) {
            laid = gone;
            pts.push({ x: m.x, y: m.y });
        }
        if (preview === 0 && gone > 3) break;
        const peg = hits.find((h) => h.kind === "peg");
        if (peg && peg.kind === "peg") {
            first ??= peg.id;
            bounces++;
            if (preview === 1) break;
        } else if (hits.length) bounces++;
        if (first !== null && preview === 2 && (after += DT) > 0.45) break;
        if (preview === 3 && bounces >= 3) break;
    }
    pts.push({ x: m.x, y: m.y });
    return { pts, first };
}

const recent = (at: number | undefined, now: number, within: number) =>
    at !== undefined && now - at < within;

/** What stands round the board in each place, from the shelf. */
function scenery(place: Place): Sprite[] {
    const left = BOARD_AT.x,
        right = BOARD_AT.x + MARBLEBOARD.w,
        ground = WORLD.h - 0.5,
        put = (
            key: string,
            art: string,
            params: Record<string, unknown>,
            x: number,
            size: number,
        ): Sprite => ({
            key,
            art,
            params,
            x,
            y: ground,
            size,
            stand: true,
            z: 0,
            still: true,
        });
    switch (place) {
        case "garden":
        case "paper":
            return [
                put("tree:0", "tree", { fruit: 4, fallen: 0, item: "apple" }, left - 9, 11),
                put("tree:1", "tree", { fruit: 0, fallen: 0, item: "apple" }, right + 16, 10),
                put("hedge:0", "hedge", { clumps: 4, berries: 2, gap: 0 }, left - 20, 9),
                put("flowers:0", "flowers", { count: 3, petals: 5 }, left - 3, 4),
                put("flowers:1", "flowers", { count: 3, petals: 6 }, right + 9, 4),
            ];
        case "candy":
            return [
                put("jar:0", "sweetjar", { count: 12, color: "berry" }, left - 6, 7),
                put("jar:1", "sweetjar", { count: 8, color: "mint" }, right + 14, 6),
                put("balloons", "balloons", { count: 3 }, left - 15, 6),
            ];
        case "seaside":
            return [
                put("lighthouse", "lighthouse", { stripes: 3, beam: 1 }, left - 10, 14),
                put("palms", "palms", { count: 2, coconuts: 3 }, right + 15, 12),
                put("starfish", "starfish", { count: 2, arms: 5 }, left - 3, 5),
                put("crabs", "crabs", { count: 1 }, right + 8, 4),
            ];
        case "night":
            return [
                put("lamp:0", "lamppost", { lit: 1, letterbox: 0 }, left - 6, 10),
                put("houses", "houses", { count: 2, windows: 2 }, left - 18, 11),
                put("lamp:1", "lamppost", { lit: 1, letterbox: 1 }, right + 15, 10),
                {
                    key: "shooting",
                    art: "shootingstar",
                    params: { sparkles: 3, facing: 1 },
                    x: right + 12,
                    y: 8,
                    size: 7,
                    z: 0,
                    still: true,
                },
            ];
        case "clock":
            return [
                put("tower", "clocktower", { hour: 3, minute: 15 }, left - 9, 16),
                put("houses", "houses", { count: 2, windows: 2 }, right + 17, 10),
            ];
        case "shelf":
        case "bricks":
            return [
                put("houses:0", "houses", { count: 2, windows: 2 }, left - 13, 11),
                put("houses:1", "houses", { count: 2, windows: 1 }, right + 17, 11),
            ];
        case "fair":
            return [
                put("carousel", "carousel", { horses: 4, lit: 1 }, left - 10, 12),
                put("balloons", "balloons", { count: 4 }, right + 13, 7),
            ];
    }
}

function pegsFrame(s: PegState, rest = false): Frame {
    const L = s.L,
        sprites: Sprite[] = scenery(L.place),
        marks: Mark[] = [],
        w = (p: Pt): Pt => ({ x: p.x + FIELD_AT.x, y: p.y + FIELD_AT.y }),
        t = s.live.t;
    const cheering = s.stage === "cheer" || s.end === "won" || recent(s.cheer, s.steps, RATE * 1.4);
    sprites.push(
        {
            key: "charlie",
            art: "charlie",
            params: {
                pose: cheering ? "cheer" : "point",
                mood: cheering ? "excited" : "happy",
                hair: "ponytail",
                top: "berry",
                sleeves: "short",
                print: "heart",
                wear: "shorts",
                bottom: "sky",
            },
            x: BOARD_AT.x + MARBLEBOARD.w + 3.5,
            y: WORLD.h - 0.5,
            size: 6,
            stand: true,
            flip: true,
            z: 2,
            live: true,
            seed: 5,
        },
        {
            key: "pip",
            art: "pupfamily",
            params: {
                member: "pip",
                pose: cheering ? "cheer" : "sit",
                mood: cheering ? "excited" : "happy",
                dir: 1,
                gear: "none",
            },
            x: BOARD_AT.x - 3,
            y: WORLD.h - 0.5,
            size: 4,
            stand: true,
            z: 2,
            live: true,
        },
        {
            key: "board",
            art: "marbleboard",
            params: { place: L.place },
            x: BOARD_AT.x + MARBLEBOARD.w / 2,
            y: BOARD_AT.y + MARBLEBOARD.h / 2,
            size: MARBLEBOARD.w,
            z: 3,
            still: true,
        },
        {
            key: "tray",
            art: "marbletray",
            params: { count: Math.min(10, s.left) },
            x: BOARD_AT.x + F.x + 3.9,
            y: BOARD_AT.y + 3.55,
            size: 7,
            z: 4,
        },
    );
    marks.push(
        {
            kind: "word",
            x: BOARD_AT.x + MARBLEBOARD.w / 2,
            y: BOARD_AT.y + 2.15,
            text: askWords(L),
            size: 0.9,
        },
        {
            kind: "word",
            x: BOARD_AT.x + F.x + 14.2,
            y: BOARD_AT.y + 3.85,
            text: tallyWords(s),
            size: 0.75,
        },
    );
    const b = s.board.bucket;
    if (b) {
        const bx = bucketAt(b, t),
            glow = s.ball.mode === "caught" && s.stage !== "aim";
        sprites.push({
            key: "bucket",
            art: "pegbucket",
            params: { lit: glow },
            ...w({ x: bx, y: b.y + 0.7 }),
            size: 5,
            z: 6,
            ...(glow ? { glow: 2 } : {}),
        });
    }
    s.board.pegs.forEach((p, i) => {
        const id = p.id,
            spec = L.pegs[i];
        if (!spec) return;
        const at = s.popped[id];
        if (at !== undefined && s.steps - at > 14) return;
        const c = pegAt(p, t),
            lit = s.lit.includes(id) || at !== undefined,
            grey = s.grey.includes(id),
            since = at === undefined ? -1 : (s.steps - at) / 14,
            flash = recent(s.struck[id], s.steps, 8),
            long = spec.long !== undefined;
        sprites.push({
            key: `peg:${i}`,
            art: "numberpeg",
            params: {
                n: spec.n,
                look: long ? (L.place === "bricks" ? "brick" : "plank") : L.look,
                tone: TONES[i % TONES.length] ?? "sky",
                state: lit ? "lit" : grey ? "grey" : "plain",
                len: long ? Math.round(spec.long?.len ?? 3) : 3,
            },
            ...w(c),
            size: long ? Math.round(spec.long?.len ?? 3) + 1 : 1.55,
            z: 5,
            ...(long ? { angle: angleAt(p, t) } : {}),
            ...(since >= 0
                ? { scale: 1 + since * 0.6, alpha: Math.max(0, 1 - since) }
                : flash
                  ? { scale: 1.12 }
                  : {}),
            ...(lit && since < 0 ? { glow: long ? 2.2 : 1.4 } : {}),
        });
    });
    // the launcher turns about its pivot, the barrel down its own box, so the drawing's angle is the aim less a right angle
    sprites.push({
        key: "launcher",
        art: "peglauncher",
        params: { tone: "tang" },
        ...w(LAUNCHER),
        size: 2.6,
        angle: s.shown - Math.PI / 2,
        z: 8,
    });
    const m = s.ball;
    if (s.stage === "aim" && s.left > 0 && !s.end) {
        const a = s.shown;
        sprites.push({
            key: "ball",
            art: "marble",
            params: { tone: "sky" },
            ...w({ x: LAUNCHER.x + Math.cos(a) * MUZZLE, y: LAUNCHER.y + Math.sin(a) * MUZZLE }),
            size: 1.12,
            z: 9,
        });
        const g = guideOf(s);
        marks.push({
            kind: "dots",
            pts: g.pts.map(w),
            faint: s.L.preview < 2,
            opacity: s.L.preview === 0 ? 0.5 : 0.85,
        });
        if (g.first && s.L.preview >= 2) {
            const p = s.board.pegs.find((q) => q.id === g.first);
            if (p && !p.long) {
                const c = w(pegAt(p, t));
                marks.push({ kind: "ring", x: c.x, y: c.y, r: 1.05 });
            }
        }
    } else if (m.mode === "free")
        sprites.push({
            key: "ball",
            art: "marble",
            params: { tone: "sky" },
            ...w(m),
            size: 1.12,
            angle: m.a,
            z: 9,
        });
    if (!rest && s.trail.length > 1)
        marks.push({ kind: "dots", pts: s.trail.map(w), faint: true, opacity: 0.45 });
    const fever = !rest && s.zoom > 1.01;
    const centre = { x: WORLD.w / 2, y: WORLD.h / 2 };
    return {
        sprites,
        marks,
        camera: fever ? { x: s.cam.x, y: s.cam.y, zoom: s.zoom } : centre,
        view: { ...VIEW },
        world: { ...WORLD },
        focus: fever ? s.cam : centre,
        time: rest ? 0 : s.steps / RATE,
    };
}

/** Marble pegs' own sounds: a glassy chime for a lit peg, a dull tock for a grey one, the launcher's thunk, a pop, and the bucket. */
const SOUNDS: Kit = {
    ring: [
        { wave: "triangle", hz: 880, attack: 0.003, decay: 0.22, gain: 0.3 },
        { wave: "sine", hz: 1760, attack: 0.003, decay: 0.12, gain: 0.12 },
    ],
    bump: [{ wave: "sine", hz: 300, to: 240, attack: 0.002, decay: 0.08, gain: 0.25 }],
    place: [
        { wave: "noise", hz: 2600, attack: 0.001, decay: 0.02, gain: 0.18 },
        { wave: "sine", hz: 1300, attack: 0.001, decay: 0.03, gain: 0.14 },
    ],
    creak: [
        { wave: "sine", hz: 180, to: 90, attack: 0.002, decay: 0.12, gain: 0.35 },
        { wave: "noise", hz: 900, attack: 0.001, decay: 0.05, gain: 0.2 },
    ],
    lift: [{ wave: "triangle", hz: 660, to: 990, attack: 0.004, decay: 0.12, gain: 0.2 }],
    level: [
        { wave: "sine", hz: 700, to: 1400, attack: 0.002, decay: 0.07, gain: 0.25 },
        { wave: "noise", hz: 3200, attack: 0.001, decay: 0.03, gain: 0.12 },
    ],
    crash: [
        { wave: "sine", hz: 140, to: 90, attack: 0.003, decay: 0.16, gain: 0.4 },
        { wave: "noise", hz: 600, attack: 0.002, decay: 0.08, gain: 0.2 },
    ],
    back: [{ wave: "sine", hz: 330, to: 180, attack: 0.004, decay: 0.25, gain: 0.18 }],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.1 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.2 },
        { wave: "triangle", hz: 1047, attack: 0.01, decay: 0.6, gain: 0.38, delay: 0.3 },
        { wave: "triangle", hz: 1319, attack: 0.01, decay: 0.7, gain: 0.3, delay: 0.42 },
    ],
};

function say(s: PegState): string {
    const deg = Math.round(-s.aim / 2),
        where =
            s.stage === "aim"
                ? `The launcher points ${deg === 0 ? "straight down" : `${Math.abs(deg)} degrees to the ${deg > 0 ? "right" : "left"}`}, with ${s.left} marble${s.left === 1 ? "" : "s"} left.`
                : s.stage === "fly"
                  ? `The marble is ${Math.round(s.ball.x)} across and ${Math.round(s.ball.y)} down the board.`
                  : "The lit pegs are popping.";
    const pegs = s.L.pegs
        .map((p, i) => (p.n > 0 && !s.live.off[pegId(i)] ? `${p.n}` : ""))
        .filter((x) => x !== "")
        .join(", ");
    return `${askWords(s.L)}. ${tallyWords(s)}. Pegs: ${pegs}. ${where}`;
}

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const pegsGame: ActionGame<PegState> = {
    id: "pegs",
    title: "Marble pegs",
    group: "action",
    // the board is 36 squares tall and has to be seen whole to aim, and a 240 px card shows it at under 7 px a square
    card: null,
    portrait: { keep: MARBLEBOARD.w + 1 },
    quiet: true,
    touch: true,
    levels: PEG_LEVELS,
    rate: RATE,
    cover: { art: "pegscene", params: { marble: true } },
    hint: "Point at where the marble should go and let go to fire. With the keys, left and right turn the launcher, held for bigger turns, and space fires.",
    controls: {
        arrows: { left: "Turn the launcher left", right: "Turn the launcher right" },
        go: "Fire",
        icons: { go: "launch" },
    },
    sounds: SOUNDS,
    saves: { level: PEG_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: Math.max(s.best, s.score) }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase) => startPegs(PEG_LEVELS[phase] ?? PEG_LEVELS[0], phase),
    step: stepPegs,
    say,
    note: (s) => (!s.touched && !s.end ? s.L.prompt : s.note),
    won: (s) => s.end === "won",
    ended: (s): RoundEnd | null => (s.end ? { won: s.end === "won", words: s.note } : null),
    objectives: progressOf,
    frame: pegsFrame,
    cancelInput: (s) => {
        s.hold = 0;
    },
    hum: (s): Hum[] => {
        const v =
            s.stage === "fly" && s.ball.mode === "free" ? Math.hypot(s.ball.vx, s.ball.vy) : 0;
        return v > 1 ? [{ kind: "roll", level: Math.min(0.7, v / 30) }] : [];
    },
    tuning: PEGS,
    still: {
        press: () => 2,
        settling: (s) => !s.end && (s.stage === "fly" || s.stage === "pop" || s.stage === "cheer"),
    },
};
