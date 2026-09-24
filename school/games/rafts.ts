// Rafts: jump the sheep onto the rafts until every raft carries its number.
//
// The flock waits on the near bank of a river, and log rafts float on the water, each tied to a post
// with a flag that says how many sheep it is to carry, or a blank flag where the rafts are to carry
// the same. The child pulls the front sheep back and lets go, and it leaps on an arc. A raft dips
// under a sheep and tips towards the end it lands on, a sheep slides on a raft that leans too far,
// and a sheep landing on a crowded raft can knock another into the river. A sheep in the river
// paddles back to the bank and joins the back of the flock, so nothing is lost. The counting, the
// splitting and the sharing are what the jumps make, and the flags show them. See .docs/games.md.
import { arc, flightAt, landing, lob, throwOf, withinReach } from "../../engine/motion/flight";
import type { Pt } from "../../engine/motion/geometry";
import { knob } from "../../engine/motion/tune";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

/** A raft on the river: where its middle is tied, how long it is in whole squares, and the number on its flag. */
interface RaftAt {
    x: number;
    w: number;
    want: number | null;
}

export interface RaftLevel extends ActionLevel {
    sheep: number;
    rafts: RaftAt[];
    /** How the rafts are judged: by their flags, by carrying the same, or in groups with the rest left on the bank. */
    rule: "flags" | "same" | "groups";
    per?: number;
    /** Seconds of a jump drawn in dots while pulling. */
    preview: number;
    prompt: string;
    done: string;
}

export const RAFT_LEVELS: Levels<RaftLevel> = [
    {
        title: "Five on the raft",
        grades: [1, 1],
        goal: "Jump the sheep onto the raft until it carries 5.",
        prompt: "Pull the front sheep back and let go. Five on the raft.",
        done: "Five on the raft, and off they go.",
        sheep: 8,
        rafts: [{ x: 22, w: 9, want: 5 }],
        rule: "flags",
        preview: 0.55,
    },
    {
        title: "Seven and three",
        grades: [1, 2],
        goal: "Put 7 sheep on one raft and 3 on the other.",
        prompt: "Seven on one raft and three on the other.",
        done: "Seven and three make ten, and off they go.",
        sheep: 10,
        rafts: [
            { x: 16, w: 11, want: 7 },
            { x: 30, w: 6, want: 3 },
        ],
        rule: "flags",
        preview: 0.5,
    },
    {
        title: "The same on each",
        grades: [2, 3],
        goal: "Share the 12 sheep between the 3 rafts, the same number on each.",
        prompt: "Every sheep on a raft, and the same on each.",
        done: "Four on each raft: twelve shared between three.",
        sheep: 12,
        rafts: [
            { x: 14, w: 7, want: null },
            { x: 23.75, w: 7, want: null },
            { x: 33.5, w: 7, want: null },
        ],
        rule: "same",
        preview: 0.4,
    },
    {
        title: "Four to a raft",
        grades: [3, 4],
        goal: "4 sheep to a raft. Fill as many rafts as the flock will fill.",
        prompt: "Four to a raft, as many rafts as the flock fills.",
        done: "Three rafts of four, and two left on the bank.",
        sheep: 14,
        rafts: [13.25, 20.75, 28.25, 35.75].map((x) => ({ x, w: 6, want: 4 })),
        rule: "groups",
        per: 4,
        preview: 0.35,
    },
    {
        title: "Five, three and two",
        grades: [1, 2],
        goal: "Put 5, 3 and 2 sheep on the rafts, as their flags say.",
        prompt: "Five, three and two, as the flags say.",
        done: "Five, three and two make ten, and off they go.",
        sheep: 10,
        rafts: [
            { x: 14.5, w: 8, want: 5 },
            { x: 25.25, w: 6, want: 3 },
            { x: 34.5, w: 5, want: 2 },
        ],
        rule: "flags",
        preview: 0.45,
    },
    {
        title: "Sixes from twenty",
        grades: [3, 4],
        goal: "6 sheep to a raft. Fill every raft the flock will fill.",
        prompt: "Six to a raft, from twenty.",
        done: "Three rafts of six, and two left on the bank.",
        sheep: 20,
        rafts: [
            { x: 14, w: 8, want: 6 },
            { x: 23.75, w: 8, want: 6 },
            { x: 33.5, w: 8, want: 6 },
        ],
        rule: "groups",
        per: 6,
        preview: 0.3,
    },
];

/** The river's tuning table. The pull, the speed and the water take hold at once; the rest at Start again. */
export const RAFTS = {
    maxPull: knob(4.5, 3, 6, 0.5, "squares", "a full pull fits on the bank behind the flock"),
    minPull: knob(
        0.6,
        0.3,
        1.2,
        0.1,
        "squares",
        "anything shorter is a finger resting on the sheep",
    ),
    speed: knob(
        34,
        24,
        44,
        1,
        "squares a second",
        "a full pull at the best angle clears the far raft and lands on the far bank",
    ),
    gravity: knob(
        30,
        15,
        45,
        1,
        "squares a second, each second",
        "an arc slow enough to follow with the eye",
    ),
    float: knob(
        60,
        30,
        100,
        2,
        "for each square of raft, each square it is under",
        "each sheep sinks a raft a little, and a raft carrying two more than its flag still keeps its deck above the water",
    ),
    spread: knob(
        1.4,
        0.5,
        3,
        0.1,
        "squares from the middle",
        "where the water holds a raft up, the same on every raft, so a sheep at either end of any raft tips it about the same",
    ),
    grip: knob(
        0.2,
        0.15,
        0.6,
        0.01,
        "friction between a sheep and a raft",
        "two sheep at one end lean a raft and stay on; three lean it further and the end one slides off",
    ),
    water: knob(
        9,
        2,
        16,
        0.5,
        "a second",
        "a loaded raft bobs once or twice and settles, so a count can be read",
    ),
    settle: knob(
        10,
        2,
        20,
        1,
        "a second",
        "how quickly a raft's turning dies away: a raft leans over about a second as weight gathers at one end, slowly enough to see it coming",
    ),
    lean: knob(
        0.1,
        0.04,
        0.25,
        0.01,
        "radians",
        "a raft leaning this far dips its low end with a ripple and its sheep look worried, before anything on it slides",
    ),
    slip: knob(
        4,
        1,
        6,
        0.25,
        "squares a second",
        "the fastest sheep shuffle along a deck to make room for one on another's back, so a raft carries one layer",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** In squares, y down. The near bank runs to `x0`, the river to `x1`, and the far bank on from there. */
export const RIVER = {
    world: { w: 46, h: 28 },
    view: { w: 40, h: 23 },
    bank: 18,
    surface: 20.5,
    x0: 9,
    x1: 40,
} as const;
/** The raft drawing's deck and keel in squares down its box, from engine/parts/travel/raft.ts; a test holds them together. */
export const RAFT_LINES = { deck: 4, keel: 5, box: 5 } as const;
const THICK = RAFT_LINES.keel - RAFT_LINES.deck;
const RAFT_DENSITY = 1.6;
/** A sheep's friction, low so sheep slide along one another as a row packs up. planck mixes two frictions as the square root of their product, so a raft takes grip squared over this. */
const WOOL = 0.1;
/** A sheep's body, and how its drawing sits on it: drawn 2.6 squares across, its feet 1.17 squares under the drawing's middle and its body a little behind it. The body is narrower than the fleece, so sheep side by side overlap as a flock does. */
const SHEEP = { w: 1.2, h: 1.25, size: 2.6, lift: 0.545, ahead: 0.13, density: 1.25 } as const;
export const FRONT: Pt = { x: 8, y: RIVER.bank - SHEEP.h / 2 };
const PER_ROW = 5;

type Where = "bank" | "held" | "body" | "swim" | "walk" | "ride" | "hop" | "far";

interface Sheep {
    id: number;
    on: Where;
    body: Body | null;
    /** The middle of its body, wherever it is. */
    at: Pt;
    angle: number;
    from: Pt;
    to: Pt;
    v: Pt;
    t: number;
    dur: number;
    /** Steps it has stood still somewhere that is not a raft. */
    still: number;
    /** When it jumped, for taking it back. */
    seq: number;
    /** Whether it has touched a raft since it jumped. */
    landed: boolean;
    /** Once the round is won: the raft it rides across on, and where on it, in the raft's own frame. */
    ride: { raft: number; along: number; up: number; angle: number } | null;
    /** Steps it has been on a raft since it jumped, and how far that raft leant when it was last over it. */
    aboard: number;
    lean: number;
    /** Steps it has been on another's back. */
    upon: number;
}

interface Raft {
    body: Body;
    home: number;
    w: number;
    want: number | null;
    leant: boolean;
    packing: boolean;
}

export interface RaftsState {
    level: number;
    L: RaftLevel;
    world: Bodies;
    rafts: Raft[];
    sheep: Sheep[];
    /** The sheep on the bank, front first. */
    flock: number[];
    hand: Pt | null;
    held: Sheep | null;
    pull: Pt | null;
    /** The keyboard's aim: degrees above level and how hard, from nought to one. */
    aim: { deg: number; power: number } | null;
    seq: number;
    steps: number;
    calm: number;
    /** The counts the calm is being timed against. */
    counted: string;
    moved: boolean;
    said: string;
    saidAt: number;
    touched: boolean;
    won: boolean;
    wonAt: number;
    drift: number;
    /** Sheep that have hopped off onto the far bank since the round was won. */
    landed: number;
    /** How many each raft carried when the round was won, still written over it while the sheep hop off. */
    carried: number[];
    /** Whether the round has said why a sheep slid off, which it says once. */
    taught: boolean;
}

const bankSpot = (i: number): Pt => {
    const row = Math.floor(i / PER_ROW);
    return { x: FRONT.x - (i % PER_ROW) * 1.15 + row * 0.5, y: FRONT.y - row * 0.55 };
};
const farSpot = (k: number): Pt => ({
    x: RIVER.x1 + 1.2 + (k % 3) * 1.2,
    y: RIVER.bank - SHEEP.h / 2,
});

export function start(level: number): RaftsState {
    return startRaftLevel(RAFT_LEVELS[level] ?? RAFT_LEVELS[0], level);
}

/** Open the exact verified challenge configuration. */
export function startRaftLevel(L: RaftLevel, level = 0): RaftsState {
    const world = bodies({ gravity: { x: 0, y: RAFTS.gravity.value } });
    world.box({
        x: (RIVER.x0 - 4) / 2,
        y: RIVER.bank + 8,
        w: RIVER.x0 + 4,
        h: 16,
        fixed: true,
        friction: 0.8,
    });
    world.box({
        x: (RIVER.x1 + RIVER.world.w + 4) / 2,
        y: RIVER.bank + 8,
        w: RIVER.world.w - RIVER.x1 + 4,
        h: 16,
        fixed: true,
        friction: 0.8,
    });
    const draft = (RAFTS.gravity.value * RAFT_DENSITY * THICK) / (2 * RAFTS.float.value);
    const rafts = L.rafts.map((r) => ({
        body: world.box({
            x: r.x,
            y: RIVER.surface + draft - THICK / 2,
            w: r.w,
            h: THICK,
            density: RAFT_DENSITY,
            friction: RAFTS.grip.value ** 2 / WOOL,
            restitution: 0.05,
            damping: { move: 0.6, turn: RAFTS.settle.value },
        }),
        home: r.x,
        w: r.w,
        want: r.want,
        leant: false,
        packing: false,
    }));
    const sheep: Sheep[] = Array.from({ length: L.sheep }, (_, id) => {
        const at = bankSpot(id);
        return {
            id,
            on: "bank",
            body: null,
            at,
            angle: 0,
            from: at,
            to: at,
            v: { x: 0, y: 0 },
            t: 0,
            dur: 0,
            still: 0,
            seq: 0,
            landed: false,
            ride: null,
            aboard: 0,
            lean: 0,
            upon: 0,
        };
    });
    return {
        level,
        L,
        world,
        rafts,
        sheep,
        flock: sheep.map((s) => s.id),
        hand: null,
        held: null,
        pull: null,
        aim: null,
        seq: 0,
        steps: 0,
        calm: 0,
        counted: "",
        moved: false,
        said: "",
        saidAt: -999,
        touched: false,
        won: false,
        wonAt: -1,
        drift: 0,
        landed: 0,
        carried: [],
        taught: false,
    };
}

function tell(s: RaftsState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

/** Which raft a point stands on, from the raft's own frame: over its deck and not too far above it. */
function raftUnder(s: RaftsState, p: Pt, above = 3.6): number {
    for (const [i, r] of s.rafts.entries()) {
        const q = s.world.where(r.body),
            c = Math.cos(q.angle),
            sn = Math.sin(q.angle),
            dx = p.x - q.x,
            dy = p.y - q.y;
        const along = dx * c + dy * sn,
            up = -dx * sn + dy * c;
        if (Math.abs(along) <= r.w / 2 + 0.3 && up <= -THICK / 2 + 0.2 && up >= -THICK / 2 - above)
            return i;
    }
    return -1;
}

/** How far above raft `i`'s deck a point stands, in the raft's frame: nought for a sheep on the deck, a sheep's height for one on another's back. */
function above(s: RaftsState, p: Pt, i: number): number {
    const r = s.rafts[i];
    if (!r) return 0;
    const q = s.world.where(r.body),
        c = Math.cos(q.angle),
        sn = Math.sin(q.angle),
        dx = p.x - q.x,
        dy = p.y - q.y;
    return -THICK / 2 - SHEEP.h / 2 - (-dx * sn + dy * c);
}

/** How many sheep stand on each raft now. */
export function counts(s: RaftsState): number[] {
    const out = s.rafts.map(() => 0);
    for (const sh of s.sheep) {
        if (sh.on !== "body") continue;
        const i = raftUnder(s, sh.at);
        if (i >= 0) out[i] = (out[i] ?? 0) + 1;
    }
    return out;
}

const list = (xs: number[]) =>
    xs.length < 2
        ? String(xs[0] ?? 0)
        : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1] ?? 0}`;
const many = (n: number) => (n === 1 ? "one" : String(n));

/** Whether the rafts carry what the level asks, from how many are on each raft and how many are on the bank. */
export function judge(L: RaftLevel, on: number[], bank: number): { right: boolean; words: string } {
    if (L.rule === "flags") {
        const wrong = L.rafts.findIndex((r, i) => r.want !== null && on[i] !== r.want);
        if (wrong < 0) return { right: true, words: L.done };
        const n = on[wrong] ?? 0,
            want = L.rafts[wrong]?.want ?? 0;
        const which = L.rafts.length > 1 ? `The raft with ${want} on its flag` : "The raft";
        if (n > want)
            return {
                right: false,
                words: `${which} has ${n}. That is ${many(n - want)} too many.`,
            };
        return { right: false, words: n ? `${which} has ${n}.` : `${which} is empty.` };
    }
    if (L.rule === "same") {
        const same = on.every((c) => c === on[0]);
        if (same && bank === 0 && (on[0] ?? 0) > 0) return { right: true, words: L.done };
        if (bank > 0)
            return {
                right: false,
                words: `The rafts have ${list(on)}, and ${bank} ${bank === 1 ? "is" : "are"} still on the bank.`,
            };
        return { right: false, words: `The rafts have ${list(on)}. Not the same yet.` };
    }
    const per = L.per ?? 4,
        total = on.reduce((a, c) => a + c, 0) + bank,
        full = on.filter((c) => c === per).length;
    const odd = on.find((c) => c !== 0 && c !== per);
    if (odd !== undefined)
        return { right: false, words: `One raft has ${odd}. A raft takes ${per}.` };
    if (full === Math.floor(total / per)) return { right: true, words: L.done };
    return {
        right: false,
        words: `${full} ${full === 1 ? "raft has" : "rafts have"} ${per}, and ${bank} ${bank === 1 ? "sheep is" : "sheep are"} on the bank.`,
    };
}

function floatRafts(s: RaftsState): void {
    for (const r of s.rafts) {
        const p = s.world.where(r.body),
            v = s.world.velocity(r.body),
            c = Math.cos(p.angle),
            sn = Math.sin(p.angle);
        for (const side of [-1, 1]) {
            const along = side * Math.min(RAFTS.spread.value, r.w / 2),
                below = THICK / 2;
            const at = { x: p.x + along * c - below * sn, y: p.y + along * sn + below * c };
            const depth = Math.max(0, Math.min(1.6, at.y - RIVER.surface));
            s.world.pushAt(r.body, { x: 0, y: -RAFTS.float.value * r.w * depth }, at);
        }
        const m = RAFT_DENSITY * r.w * THICK;
        // Water holds a raft back as it rises and falls, near enough to critically, so a loaded raft settles in a bob or two instead of ringing.
        s.world.push(r.body, {
            x: -m * (4 * (p.x - (r.home + s.drift)) + 3 * v.x),
            y: -m * RAFTS.water.value * v.y,
        });
    }
}

const frontSheep = (s: RaftsState): Sheep | undefined => s.sheep.find((x) => x.id === s.flock[0]);

function makeBody(s: RaftsState, at: Pt): Body {
    // A sheep never turns, so one coming down askew on two backs drops cleanly into the gap the row opens; it is drawn leaning with its deck.
    return s.world.box({
        x: at.x,
        y: at.y,
        w: SHEEP.w,
        h: SHEEP.h,
        density: SHEEP.density,
        friction: WOOL,
        restitution: 0.05,
        upright: true,
        damping: { move: 0.05 },
    });
}

/** Sends a sheep off the bank, pulled back by `pull` from the front of the flock. */
function leap(s: RaftsState, sh: Sheep, pull: Pt, out: Happening[]): void {
    const p = withinReach(pull, RAFTS.maxPull.value);
    const from = { x: Math.max(1, FRONT.x + p.x), y: Math.min(FRONT.y, FRONT.y + p.y) };
    sh.body = makeBody(s, from);
    s.world.launch(sh.body, throwOf(p, { most: RAFTS.maxPull.value, speed: RAFTS.speed.value }), 0);
    sh.on = "body";
    sh.at = from;
    sh.still = 0;
    sh.seq = ++s.seq;
    sh.landed = false;
    sh.aboard = 0;
    sh.lean = 0;
    s.flock = s.flock.filter((id) => id !== sh.id);
    s.touched = true;
    s.moved = true;
    out.push({ cue: "lift" });
}

const keyPull = (a: { deg: number; power: number }): Pt => {
    const r = (a.deg * Math.PI) / 180,
        len = a.power * RAFTS.maxPull.value;
    return { x: -Math.cos(r) * len, y: Math.sin(r) * len };
};

function hands(s: RaftsState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        const was = s.hand;
        s.hand = { ...t };
        s.aim = null;
        // A press that begins on the front sheep picks it up; one that begins anywhere else does nothing.
        const front = frontSheep(s);
        if (!was && !s.held && front && Math.hypot(t.x - FRONT.x, t.y - FRONT.y) <= 2.2) {
            s.held = front;
            front.on = "held";
            s.touched = true;
        }
        if (s.held)
            s.pull = withinReach({ x: t.x - FRONT.x, y: t.y - FRONT.y }, RAFTS.maxPull.value);
    }
    if (pad.lifted) {
        const sh = s.held,
            pull = s.pull;
        s.held = null;
        s.pull = null;
        s.hand = null;
        if (sh && pull && Math.hypot(pull.x, pull.y) >= RAFTS.minPull.value) leap(s, sh, pull, out);
        else if (sh) sh.on = "bank";
    }
}

function keys(s: RaftsState, pad: Pad, out: Happening[]): void {
    if ((!pad.pressed.length && !pad.tapped) || pad.touch || s.held) return;
    if (!s.aim) {
        s.aim = { deg: 45, power: 0.6 };
        if (!pad.tapped) return;
    }
    const a = s.aim;
    for (const d of pad.pressed) {
        if (d === "up") a.deg = Math.min(80, a.deg + 5);
        if (d === "down") a.deg = Math.max(10, a.deg - 5);
        if (d === "right") a.power = Math.round(Math.min(1, a.power + 0.05) * 100) / 100;
        if (d === "left") a.power = Math.round(Math.max(0.15, a.power - 0.05) * 100) / 100;
    }
    const front = frontSheep(s);
    if (pad.tapped && front) {
        s.touched = true;
        leap(s, front, keyPull(a), out);
    }
}

function toRiver(s: RaftsState, sh: Sheep, x: number, out: Happening[], words: string): void {
    if (sh.body) s.world.remove(sh.body);
    sh.body = null;
    sh.on = "swim";
    sh.at = { x: Math.max(RIVER.x0 + 0.4, Math.min(RIVER.x1 - 0.4, x)), y: RIVER.surface + 0.3 };
    sh.angle = 0;
    sh.t = 0;
    s.moved = true;
    out.push({ cue: "splash" }, { burst: { kind: "splash", x: sh.at.x, y: RIVER.surface, n: 8 } });
    if (!s.won) tell(s, words);
}

function walkHome(s: RaftsState, sh: Sheep, from: Pt): void {
    if (sh.body) s.world.remove(sh.body);
    sh.body = null;
    sh.on = "walk";
    sh.at = from;
    sh.angle = 0;
    sh.t = 0;
}

function moveSheep(s: RaftsState, sh: Sheep, out: Happening[]): void {
    switch (sh.on) {
        case "bank": {
            const spot = bankSpot(Math.max(0, s.flock.indexOf(sh.id))),
                dx = spot.x - sh.at.x,
                dy = spot.y - sh.at.y,
                d = Math.hypot(dx, dy),
                go = Math.min(d, 4 * DT);
            if (d > 0.001) sh.at = { x: sh.at.x + (dx / d) * go, y: sh.at.y + (dy / d) * go };
            sh.angle = 0;
            return;
        }
        case "held":
            sh.at = {
                x: FRONT.x + (s.pull?.x ?? 0),
                y: Math.min(FRONT.y + 0.2, FRONT.y + (s.pull?.y ?? 0)),
            };
            return;
        case "body": {
            if (!sh.body) return;
            const p = s.world.where(sh.body);
            sh.at = { x: p.x, y: p.y };
            const river = p.x > RIVER.x0 + 0.2 && p.x < RIVER.x1 - 0.2;
            if (
                (river && p.y > RIVER.surface + 0.1) ||
                p.y > RIVER.world.h + 2 ||
                p.x < -4 ||
                p.x > RIVER.world.w + 4
            ) {
                // The first sheep in a round to slide off a leaning raft it had stood on says why, once.
                const slid = !s.taught && sh.aboard > 20 && sh.lean > RAFTS.lean.value;
                if (slid) s.taught = true;
                toRiver(
                    s,
                    sh,
                    p.x,
                    out,
                    slid ? "One end was heavier." : "One fell in. It is swimming back.",
                );
                return;
            }
            // A sheep whose feet reach a deck, or the back of a sheep standing on one, or that comes to rest wedged on the corners of two, digs them
            // in, so most of its skid goes. It is checked once it is there and not before, so what it came down on has already had the whole knock.
            const v = s.world.velocity(sh.body),
                on = raftUnder(s, p),
                raft = s.rafts[on],
                height = raft ? above(s, p, on) : Infinity;
            if (
                !sh.landed &&
                v.y >= 0 &&
                raft &&
                (height < 0.2 ||
                    beneath(s, sh) !== undefined ||
                    (height < SHEEP.h * 1.35 && !s.world.moving(sh.body, 2)))
            ) {
                const rv = s.world.velocity(raft.body);
                sh.landed = true;
                s.world.launch(sh.body, { x: rv.x + (v.x - rv.x) * 0.25, y: v.y }, 0);
            }
            // Up on a back, or wedged high, however it is being moved: the row makes room under it, and if that fails it walks off.
            const high = raft !== undefined && sh.landed && height > SHEEP.h * 0.6;
            sh.upon = beneath(s, sh) !== undefined || high ? sh.upon + 1 : 0;
            sh.angle = raft ? s.world.where(raft.body).angle : 0;
            if (raft) {
                sh.lean = Math.abs(sh.angle);
                sh.aboard++;
            }
            // Off every raft and near enough to still, jittering against something or not: ashore it walks home, elsewhere it drops in.
            if (raft || s.world.moving(sh.body, raft ? 0.2 : 1)) {
                sh.still = 0;
                return;
            }
            sh.still++;
            if (p.x <= RIVER.x0 + SHEEP.w / 2 + 0.1 && sh.still > 15)
                walkHome(s, sh, { x: p.x, y: RIVER.bank - SHEEP.h / 2 });
            else if (p.x >= RIVER.x1 && sh.still > 40)
                toRiver(
                    s,
                    sh,
                    RIVER.x1 - 0.4,
                    out,
                    "That one landed on the far bank. It is swimming back.",
                );
            else if (sh.still > 90) toRiver(s, sh, p.x, out, "That one is swimming back.");
            return;
        }
        case "swim": {
            sh.t += DT;
            const dx = RIVER.x0 + 0.3 - sh.at.x,
                go = Math.sign(dx) * Math.min(Math.abs(dx), 5 * DT);
            sh.at = { x: sh.at.x + go, y: RIVER.surface + 0.3 + 0.07 * Math.sin(sh.t * 7) };
            sh.angle = 0.05 * Math.sin(sh.t * 5);
            if (Math.floor(sh.t * 1.25) !== Math.floor((sh.t - DT) * 1.25))
                out.push({ burst: { kind: "splash", x: sh.at.x + 0.6, y: RIVER.surface, n: 2 } });
            if (Math.abs(dx) < 0.02)
                walkHome(s, sh, { x: RIVER.x0 - 0.5, y: RIVER.bank - SHEEP.h / 2 });
            return;
        }
        case "walk": {
            sh.t += DT;
            const spot = bankSpot(s.flock.length),
                dx = spot.x - sh.at.x,
                dy = spot.y - sh.at.y,
                d = Math.hypot(dx, dy),
                go = Math.min(d, 5 * DT);
            if (d > 0.001) sh.at = { x: sh.at.x + (dx / d) * go, y: sh.at.y + (dy / d) * go };
            if (d < 0.02) {
                sh.on = "bank";
                s.flock.push(sh.id);
            }
            return;
        }
        case "hop": {
            sh.t += DT;
            sh.at = sh.t >= sh.dur ? sh.to : flightAt(sh.from, sh.v, RAFTS.gravity.value, sh.t);
            if (sh.t >= sh.dur) {
                sh.on = "far";
                s.landed++;
                out.push({ cue: "place" }, { puff: { x: sh.at.x, y: RIVER.bank, n: 3 } });
            }
            return;
        }
        case "ride": {
            const r = sh.ride ? s.rafts[sh.ride.raft] : undefined;
            if (!r || !sh.ride) return;
            const q = s.world.where(r.body);
            sh.at = turned(q, q.angle, sh.ride.along, sh.ride.up);
            sh.angle = q.angle + sh.ride.angle;
            return;
        }
        case "far":
            // It walks on up the far bank and out of the meadow, so the bank never piles up, and waits just past the edge.
            sh.at = { x: Math.min(RIVER.world.w + 3, sh.at.x + 3.2 * DT), y: sh.at.y };
            return;
    }
}

/** The sheep another is resting on the back of, if any. A raft carries one layer, so a sheep up there is shoved off. */
function beneath(s: RaftsState, sh: Sheep): Sheep | undefined {
    return s.sheep.find(
        (o) =>
            o !== sh &&
            o.on === "body" &&
            Math.abs(o.at.x - sh.at.x) < SHEEP.w * 0.9 &&
            o.at.y - sh.at.y > SHEEP.h * 0.55 &&
            o.at.y - sh.at.y < SHEEP.h * 1.35,
    );
}
/**
 * A raft carries one layer. When a sheep has been on another's back for a moment, the row on that raft packs up to make room: the sheep
 * on top takes its place in the row where it is, every sheep is spaced a sheep apart within the deck by the least shuffling along, and each
 * walks towards its place, so the one on top drops into the space that opens. The row keeps packing until nobody is on a back and every
 * sheep is in its place, so a leaning deck cannot slide it back into a heap. A sheep still on a back after two seconds, because the row
 * will not fit on the deck or it is wedged on the corners of two, walks off the nearer end, and one still up after four hops into the
 * water, so nothing ever stays up there.
 */
function makeRoom(s: RaftsState): void {
    const slip = RAFTS.slip.value;
    for (const [i, r] of s.rafts.entries()) {
        const all = s.sheep.filter(
            (x) => x.on === "body" && x.body !== null && raftUnder(s, x.at) === i,
        );
        const leaving = all.filter((x) => x.upon > RATE * 2),
            aboard = all.filter((x) => x.upon <= RATE * 2);
        const stack = aboard.some((x) => x.upon > 2);
        if (stack || leaving.length) r.packing = true;
        if (!r.packing) continue;
        const q = s.world.where(r.body),
            vr = s.world.velocity(r.body),
            c = Math.cos(q.angle),
            sn = Math.sin(q.angle);
        for (const x of leaving) {
            if (!x.body) continue;
            // Off the nearer end, unless that end is by the bank, where it would only step ashore.
            const nearer = (x.at.x - q.x) * c + (x.at.y - q.y) * sn < 0 ? -1 : 1,
                side = nearer < 0 && q.x - r.w / 2 < RIVER.x0 + 2 ? 1 : nearer;
            if (x.upon > RATE * 4) {
                s.world.launch(x.body, { x: vr.x + side * 3, y: -4 }, 0);
                x.upon = -RATE;
            } else
                s.world.launch(x.body, { x: vr.x + side * slip, y: s.world.velocity(x.body).y }, 0);
        }
        // A sheep walks along the deck itself, uphill or down, at its pace relative to the raft, and keeps whatever it is doing across the deck,
        // so one on top still drops into the space.
        const walk = (x: Sheep, along: number) => {
            if (!x.body) return;
            const v = s.world.velocity(x.body),
                across = -v.x * sn + v.y * c,
                pace = vr.x * c + vr.y * sn + Math.max(-slip, Math.min(slip, along));
            s.world.launch(x.body, { x: pace * c - across * sn, y: pace * sn + across * c }, 0);
        };
        const row = aboard
            .map((x) => ({ x, at: (x.at.x - q.x) * c + (x.at.y - q.y) * sn }))
            .sort((m, n) => m.at - n.at);
        // Sheep a little apart when the deck has the room, so one dropping in between two has a gap to fall into even when it comes down askew.
        const lo = -r.w / 2 + SHEEP.w / 2,
            hi = r.w / 2 - SHEEP.w / 2,
            gap = (row.length - 1) * (SHEEP.w + 0.14) <= hi - lo ? SHEEP.w + 0.14 : SHEEP.w + 0.04;
        if ((row.length - 1) * gap > hi - lo) {
            for (const e of row) if (e.x.upon > 2) walk(e.x, e.at < 0 ? -slip : slip);
            r.packing = stack || leaving.length > 0;
            continue;
        }
        // The places closest to where the sheep stand with a gap between each: less k gaps from each, the places must not go down, which
        // pooling neighbours that do into their mean gives by least squares, so a stack splits evenly both ways and the row keeps its middle.
        const pools: { sum: number; n: number }[] = [];
        for (const [k, e] of row.entries()) {
            pools.push({ sum: e.at - k * gap, n: 1 });
            for (
                let a = pools.at(-2), b = pools.at(-1);
                a && b && a.sum / a.n > b.sum / b.n;
                a = pools.at(-2), b = pools.at(-1)
            ) {
                a.sum += b.sum;
                a.n += b.n;
                pools.pop();
            }
        }
        const to = pools
            .flatMap((p) =>
                Array.from({ length: p.n }, () =>
                    Math.max(lo, Math.min(hi - (row.length - 1) * gap, p.sum / p.n)),
                ),
            )
            .map((z, k) => z + k * gap);
        let settled = !stack && leaving.length === 0;
        row.forEach((e, k) => {
            const d = (to[k] ?? e.at) - e.at;
            if (Math.abs(d) > 0.05) settled = false;
            walk(e.x, Math.abs(d) > 0.03 ? Math.sign(d) * Math.max(0.8, Math.abs(d) * 10) : 0);
        });
        if (settled) r.packing = false;
    }
}
/** How many sheep are on another's back, or wedged high over a deck, now. */
export const stacked = (s: RaftsState): number =>
    s.sheep.filter((x) => x.on === "body" && x.upon > 0).length;

/** Whether anything a press started is still going: a sheep held, in the air, on another's back, in the river or walking home. A pile shuffling on a raft is not, since only its count is judged. */
export const busy = (s: RaftsState): boolean =>
    s.held !== null ||
    s.sheep.some(
        (x) =>
            x.on === "swim" ||
            x.on === "walk" ||
            (x.on === "body" &&
                x.body !== null &&
                (s.world.moving(x.body, 1.2) || raftUnder(s, x.at) < 0 || x.upon > 0)),
    );
const onRafts = (s: RaftsState) =>
    s.sheep.filter((x) => x.on === "body" && raftUnder(s, x.at) >= 0);
const finished = (s: RaftsState) =>
    s.won && s.sheep.every((x) => x.on !== "body" && x.on !== "ride" && x.on !== "hop");

function win(s: RaftsState, out: Happening[]): void {
    s.won = true;
    s.wonAt = s.steps;
    s.carried = counts(s);
    // The sheep aboard hold still for the crossing, each riding its raft where it stood, so none slides off as the others hop down.
    for (const sh of onRafts(s)) {
        const i = raftUnder(s, sh.at),
            r = s.rafts[i];
        if (!r || !sh.body) continue;
        const q = s.world.where(r.body),
            c = Math.cos(q.angle),
            sn = Math.sin(q.angle),
            dx = sh.at.x - q.x,
            dy = sh.at.y - q.y;
        sh.ride = {
            raft: i,
            along: dx * c + dy * sn,
            up: -dx * sn + dy * c,
            angle: sh.angle - q.angle,
        };
        s.world.remove(sh.body);
        sh.body = null;
        sh.on = "ride";
    }
    tell(s, s.L.done);
    out.push({ cue: "ring" });
    for (const r of s.rafts) {
        const p = s.world.where(r.body);
        out.push({ burst: { kind: "sparkle", x: p.x, y: p.y - 2.5, n: 8 } });
    }
}

function finish(s: RaftsState, out: Happening[]): void {
    const most = Math.max(0, RIVER.x1 - 0.4 - Math.max(...s.rafts.map((r) => r.home + r.w / 2)));
    s.drift = Math.min(most, s.drift + 2.5 * DT);
    if (s.steps - s.wonAt < RATE * 2.2 || s.drift < most - 0.01 || (s.steps - s.wonAt) % 8 !== 0)
        return;
    const riders = () => s.sheep.filter((x) => x.on === "ride");
    const next = riders().sort((a, b) => b.at.x - a.at.x)[0];
    if (!next) return;
    const to = farSpot(s.sheep.filter((x) => x.on === "hop" || x.on === "far").length),
        flight = lob(next.at, to, RAFTS.gravity.value, 1.2);
    Object.assign(next, {
        on: "hop",
        from: { ...next.at },
        to,
        v: flight.v,
        t: 0,
        dur: flight.t,
        angle: 0,
        ride: null,
    });
    if (riders().length === 0) out.push({ cue: "win" });
}

export function step(s: RaftsState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    floatRafts(s);
    s.world.step(DT);
    for (const r of s.rafts) {
        const q = s.world.where(r.body),
            tilt = Math.abs(q.angle);
        // A raft that starts to lean dips its low end with a ripple, well before anything on it slides.
        if (!r.leant && tilt > RAFTS.lean.value && !s.won) {
            r.leant = true;
            const low = turned(q, q.angle, (Math.sign(q.angle) * r.w) / 2, 0);
            out.push({ burst: { kind: "splash", x: low.x, y: RIVER.surface, n: 4 } });
        } else if (r.leant && tilt < RAFTS.lean.value * 0.5) r.leant = false;
    }
    for (const sh of s.sheep) moveSheep(s, sh, out);
    if (!s.won) makeRoom(s);
    if (s.won) finish(s, out);
    else if (!busy(s) && s.flock.length + onRafts(s).length === s.sheep.length) {
        // A round is judged once its counts have held for a second, so a pile still shuffling is not judged mid-shuffle.
        const key = `${counts(s).join(",")}|${s.flock.length}`;
        if (key !== s.counted) {
            s.counted = key;
            s.calm = 0;
        }
        if (++s.calm > RATE) {
            const j = judge(s.L, counts(s), s.flock.length);
            if (j.right) win(s, out);
            else if (s.moved) {
                s.moved = false;
                tell(s, j.words);
            }
        }
    } else s.calm = 0;
    return out;
}

/** Stands `n` sheep from the bank at rest along a raft's deck, as a level laid out by hand or a test's own arrangement does. */
export function lay(s: RaftsState, raft: number, n: number): void {
    const r = s.rafts[raft];
    if (!r) return;
    const p = s.world.where(r.body);
    for (let k = 0; k < n; k++) {
        const sh = frontSheep(s);
        if (!sh) return;
        const gap = SHEEP.w + 0.05,
            row = Math.max(1, Math.floor((r.w - 0.4) / gap)),
            across = Math.min(row, n - Math.floor(k / row) * row);
        const at = {
            x: p.x - ((across - 1) * gap) / 2 + (k % row) * gap,
            y: p.y - THICK / 2 - SHEEP.h / 2 - 0.02 - Math.floor(k / row) * (SHEEP.h + 0.02),
        };
        sh.body = makeBody(s, at);
        sh.on = "body";
        sh.at = at;
        sh.seq = ++s.seq;
        s.flock = s.flock.filter((id) => id !== sh.id);
    }
}

export function back(s: RaftsState): boolean {
    if (s.won || s.held) return false;
    const L = s.L,
        c = counts(s),
        most = (i: number) =>
            L.rule === "flags"
                ? (L.rafts[i]?.want ?? 0)
                : L.rule === "same"
                  ? L.sheep / L.rafts.length
                  : (L.per ?? 4);
    // The last sheep aboard a raft carrying more than it can take, or else the last sheep aboard.
    const aboard = onRafts(s).sort((a, b) => b.seq - a.seq);
    const last =
        aboard.find((x) => {
            const i = raftUnder(s, x.at);
            return (c[i] ?? 0) > most(i);
        }) ?? aboard[0];
    if (!last) return false;
    toRiver(s, last, last.at.x, [], "That one is swimming back.");
    return true;
}

const turned = (at: Pt, angle: number, dx: number, dy: number): Pt => ({
    x: at.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: at.y + dx * Math.sin(angle) + dy * Math.cos(angle),
});

export function frame(s: RaftsState, _rest = false): Frame {
    const L = s.L,
        W = RIVER.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 15,
            x: 10,
            y: 5.5,
            z: 0,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 16,
            x: 32,
            y: 4,
            z: 0,
            still: true,
        },
        {
            key: "firs",
            art: "firs",
            params: { count: 2, snow: 0 },
            seed: 25,
            size: 4.5,
            x: 43.6,
            y: RIVER.bank,
            stand: true,
            z: 0,
            still: true,
        },
        {
            key: "stile",
            art: "stile",
            params: { steps: 2 },
            seed: 26,
            size: 2.8,
            x: 41.5,
            y: RIVER.bank,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "hedge",
            art: "hedge",
            params: { clumps: 3, berries: 3, gap: 0 },
            seed: 27,
            size: 7,
            x: 3,
            y: RIVER.bank,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "ground:near",
            art: "arcade.ground",
            params: { w: RIVER.x0 },
            seed: 61,
            x: RIVER.x0 / 2,
            y: RIVER.bank + 1.1,
            z: 2,
            still: true,
        },
        {
            key: "ground:far",
            art: "arcade.ground",
            params: { w: W.w - RIVER.x1 },
            seed: 62,
            x: (RIVER.x1 + W.w) / 2,
            y: RIVER.bank + 1.1,
            z: 2,
            still: true,
        },
    );
    const deep = Math.ceil(W.h - RIVER.surface + 1);
    for (let x0 = RIVER.x0; x0 < RIVER.x1; x0 += 17) {
        const across = Math.min(17, RIVER.x1 - x0);
        sprites.push({
            key: `river:${x0}`,
            art: "sea",
            params: { across, deep, x0, bed: true },
            seed: 70 + x0,
            x: x0 + across / 2,
            y: RIVER.surface - 0.5 + deep / 2,
            z: 5,
            still: true,
        });
    }
    const c = counts(s);
    for (const [i, r] of s.rafts.entries()) {
        const p = s.world.where(r.body),
            post = r.home - r.w / 2 + 0.6;
        sprites.push({
            key: `post:${i}`,
            art: "raft",
            params: { part: "post" },
            seed: 80 + i,
            x: post,
            y: RIVER.surface + 2.2,
            stand: true,
            z: 3,
            still: true,
        });
        const mid = turned(p, p.angle, 0, -(RAFT_LINES.keel - RAFT_LINES.box / 2) + THICK / 2);
        sprites.push({
            key: `raft:${i}`,
            art: "raft",
            params: { part: "raft", w: r.w, flag: r.want === null ? "" : String(r.want) },
            seed: 90 + i,
            x: mid.x,
            y: mid.y,
            angle: p.angle,
            z: 6,
        });
        if (!s.won && r.want !== null && c[i] === r.want && !s.world.moving(r.body, 0.15))
            marks.push({ kind: "ring", x: p.x + 1.2, y: RIVER.surface - 4.4, r: 1 });
        const end = turned(p, p.angle, -r.w / 2 + 0.2, -THICK / 2);
        if (!s.won)
            marks.push({
                kind: "line",
                a: { x: post, y: RIVER.surface - 1.4 },
                b: end,
                style: "thin",
            });
        marks.push({
            kind: "word",
            x: p.x + 1.2,
            y: RIVER.surface - 4.4,
            text: String((s.won ? s.carried[i] : c[i]) ?? 0),
            size: 1.6,
        });
    }
    const walking = Math.floor(s.steps / 7) % 4;
    for (const sh of s.sheep) {
        if (sh.on === "far" && sh.at.x >= W.w + 2.5) continue;
        const flying = sh.on === "body" && sh.body !== null && s.world.moving(sh.body, 1.5);
        const under = sh.on === "body" ? s.rafts[raftUnder(s, sh.at)] : undefined,
            leaning =
                under !== undefined && Math.abs(s.world.where(under.body).angle) > RAFTS.lean.value;
        const alarm = flying || leaning || sh.on === "swim" || sh.on === "held" || sh.on === "hop";
        const moving =
            sh.on === "walk" ||
            sh.on === "far" ||
            (sh.on === "bank" &&
                Math.hypot(sh.at.x - bankSpot(Math.max(0, s.flock.indexOf(sh.id))).x, 0) > 0.05);
        const params = { step: moving ? walking : 0, graze: false, alarm };
        const row =
            sh.on === "bank" ? Math.floor(Math.max(0, s.flock.indexOf(sh.id)) / PER_ROW) : 0;
        const z = sh.on === "held" ? 9 : sh.on === "bank" ? 8 - row : sh.on === "swim" ? 7 : 7;
        if (sh.on === "swim") {
            sprites.push({
                key: `sheep:${sh.id}:swim`,
                art: "sheep",
                params,
                seed: 200 + sh.id,
                crop: { x: 0, y: 0, w: 3, h: 1.9 },
                size: SHEEP.size,
                x: sh.at.x + SHEEP.ahead,
                y: RIVER.surface - 0.15,
                angle: sh.angle,
                z,
            });
            continue;
        }
        const at = turned(sh.at, sh.angle, SHEEP.ahead, -SHEEP.lift);
        sprites.push({
            key: `sheep:${sh.id}`,
            art: "sheep",
            params,
            seed: 200 + sh.id,
            size: SHEEP.size,
            x: at.x,
            y: at.y,
            angle: sh.angle,
            faint: sh.on === "bank" && row > 1,
            z,
        });
    }
    const aim = s.held && s.pull ? s.pull : s.aim && !s.won ? keyPull(s.aim) : null;
    if (aim && Math.hypot(aim.x, aim.y) >= RAFTS.minPull.value) {
        const p = withinReach(aim, RAFTS.maxPull.value),
            from = { x: FRONT.x + p.x, y: Math.min(FRONT.y, FRONT.y + p.y) };
        const predicted = landing(
            from,
            throwOf(p, { most: RAFTS.maxPull.value, speed: RAFTS.speed.value }),
            RAFTS.gravity.value,
            RIVER.surface,
        );
        if (predicted) marks.push({ kind: "ring", x: predicted.at.x, y: predicted.at.y, r: 0.45 });
        marks.push({
            kind: "dots",
            pts: arc(
                from,
                throwOf(p, { most: RAFTS.maxPull.value, speed: RAFTS.speed.value }),
                RAFTS.gravity.value,
                { seconds: L.preview },
            ),
        });
    }
    return {
        sprites,
        marks,
        camera: { x: W.w / 2, y: W.h / 2, zoom: 1 },
        view: { ...RIVER.view },
        world: { ...W },
    };
}

const ORDINAL = ["first", "second", "third", "fourth"];

export function say(s: RaftsState): string {
    const c = s.won ? s.carried : counts(s),
        swimming = s.sheep.filter((x) => x.on === "swim").length;
    const rafts = s.rafts.map((r, i) => {
        const n = c[i] ?? 0,
            name = s.rafts.length > 1 ? `The ${ORDINAL[i] ?? "next"} raft` : "The raft";
        return `${name}${r.want === null ? "" : `, with ${r.want} on its flag,`} has ${n} ${n === 1 ? "sheep" : "sheep"}.`;
    });
    return [
        s.said,
        ...rafts,
        `On the bank: ${s.flock.length} sheep.`,
        swimming ? `${swimming} ${swimming === 1 ? "is" : "are"} swimming back.` : "",
        s.held ? "You are holding the front sheep." : "",
    ]
        .filter(Boolean)
        .join(" ");
}

export const raftsGame: ActionGame<RaftsState> = {
    id: "herd",
    title: "Rafts",
    group: "action",
    levels: RAFT_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    cover: { art: "raft", params: { part: "raft", w: 9, flag: "5" } },
    hint: "Pull the front sheep back and let go to jump it onto a raft, or aim with the arrow keys and press space",
    controls: {},
    start,
    step,
    frame,
    say,
    back,
    tuning: RAFTS,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => {
        const total =
            s.L.rule === "groups"
                ? Math.min(s.L.rafts.length, Math.floor(s.L.sheep / (s.L.per ?? 1)))
                : s.L.rafts.length;
        const completed = s.won
            ? total
            : counts(s).filter(
                  (n, i) =>
                      n > 0 &&
                      n ===
                          (s.L.rule === "same" ? s.L.sheep / s.L.rafts.length : s.L.rafts[i]?.want),
              ).length;
        return { completed, total };
    },
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => (s.won ? !finished(s) : busy(s)),
    },
};
