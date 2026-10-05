// Shunting yard: a hump yard. The wagons wait in a line behind the engine at the top of the hump.
// The child throws the points lever to a siding, pulls the front wagon back and lets go, and it rolls down
// the hump and through the points into that siding. Gently enough and it couples to what is there;
// too hard and it knocks and rolls back; too soft and it stops short and waits for a nudge. Each
// siding's board says what it wants: wagons adding up to its number, or the wagons in order, with a
// spare siding to park in. The last wagon of a siding can be sent back to the end of the waiting
// line at any time, which is both the free retry and, with a siding filled from its buffer end, the
// ordering puzzle the shunt mechanic poses. See .docs/games.md.
import type { ActionGame, ActionLevel } from "./game";
import type { Kit } from "../../engine/sound/kit";
import { panOf, semitones } from "../../engine/sound/kit";
import type { Pad } from "../../engine/motion/pad";
import type { GameEvent } from "../../engine/motion/goals";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import {
    bankHeight,
    emptyLine,
    gradeAt,
    groupsOf,
    heightAt,
    insert,
    remove,
    step as railStep,
    unhook,
    type Bank,
    type Line,
    type Rules,
    type Vehicle,
} from "../../engine/motion/rail";

export interface Siding {
    /** How many wagons fit between its buffer stop and the points. */
    room: number;
    /** What its board asks for: wagons adding up to a number, the level's order, or nothing. */
    wants: number | "order" | "spare";
    /** Where the siding climbs or dips, all of it left of the points. */
    banks?: Bank[];
}

export interface YardLevel extends ActionLevel {
    /** The front siding first; the ones behind it are further up the picture. */
    sidings: Siding[];
    /** The wagons waiting, the one at the top of the hump first. */
    queue: string[];
    /** The order an "order" siding is made up in, from its buffer stop out. */
    order: string[];
    /** How high the hump is, in squares. */
    rise: number;
    /** How much of a push's path the dots show, from nought to all of it. */
    preview: number;
}

export interface Wagon {
    id: string;
    label: string;
}

export interface YardState {
    phase: number;
    sidings: Siding[];
    order: string[];
    rise: number;
    preview: number;
    queue: Wagon[];
    /** One line for each siding, with its buffer stop as the first vehicle and the lead beyond the points. */
    lines: Line[];
    /** The siding the points send the next wagon into. */
    points: number;
    /** The push the keys have set, in squares a second. */
    power: number;
    /** A finger pulling the wagon back, in squares, while it pulls. */
    pull: number | null;
    /** When the keys last changed the push, in seconds, so the ghost shows while they aim. */
    aimed: number;
    /** Wagons that have just coupled or knocked, and when, for the bounce and the wobble they are drawn with. */
    jolts: { id: string; at: number; hard: boolean }[];
    hand:
        | { on: "wagon" }
        | { on: "board"; k: number }
        | { on: "lever" }
        | { on: "last"; k: number }
        | { on: "none" }
        | null;
    pushes: number;
    note: string;
    won: boolean;
    /** Sidings whose board was met when last looked, so meeting one is heard once. */
    met: boolean[];
    time: number;
    /** How far the waiting line still has to close up, in squares; drawing only. */
    shuffle: number;
    braked: boolean;
    /** Seconds since the yard was made up. */
    away: number;
}

const DT = 1 / 60;
/** A wagon from buffer to buffer, in squares. */
const LEN = 4;
/** The yard as it is laid out and framed, in squares; the world round it is ground and sky to fill a wider room. */
const VIEW = { w: 60, h: 26 };
/** Where the laid-out yard's top left sits in the world. */
export const ORIGIN = { x: 30, y: 14 };
/** The whole world, in squares. The browser tests place a finger on the field by it. */
export const YARD_WORLD = { w: ORIGIN.x + VIEW.w + 44, h: ORIGIN.y + VIEW.h + 16 };
const WORLD = { w: VIEW.w + 44 };
/** Where the rail of the front siding and the lead runs, in squares from the top. */
const LEAD_Y = 23;
const ROW_GAP = 5.5;
/** The points, where the sidings part from the lead. The fans climb back over FAN squares. */
export const POINTS = 38;
const FAN = 8;
const FAN_START = POINTS - FAN;
const HUMP = { from: POINTS, to: POINTS + 10 };
/** The top of the hump, where the front wagon waits. */
export const CREST = POINTS + 5;
/** Squares a second of push for each square pulled back, and the softest and hardest push. */
export const PER = 1.5;
export const LEAST = 0.5;
export const MOST = 7;
/** One press of left or right changes the push by this much. */
export const STEP = 0.25;
/** Where the points lever stands: on the grass in front of the lead, just before the points, and how tall it is. */
const LEVER = { x: POINTS - 1.5, foot: LEAD_Y + 6.4, reach: 3 };
/** A carriage's middle sits this far above the rail at the size it is drawn. */
const ABOVE = 1.44;

/** What the camera frames: from over the top siding's board down to the lead's grass. */
const frameOf = (s: YardState) => {
    const top = rowY(s.sidings.length - 1) - 7,
        bottom = LEVER.foot + 0.6;
    return { top, middle: (top + bottom) / 2 };
};

const labelOf = (id: string) => id.slice(id.indexOf(":") + 1);
const stopId = (k: number) => `stop:${k}`;

const rowY = (k: number) => LEAD_Y - k * ROW_GAP;
const bufferX = (sd: Siding) => FAN_START - sd.room * LEN - 0.5;
const leadBank = (rise: number): Bank => ({ shape: "hump", ...HUMP, rise });
const banksOf = (s: YardState, k: number): Bank[] => [
    leadBank(s.rise),
    ...(s.sidings[k]?.banks ?? []),
];

const rulesOf = (s: YardState, k: number): Rules => ({
    ends: [bufferX(s.sidings[k] ?? { room: 5, wants: "spare" }) - 0.5, WORLD.w],
    gaps: [],
    couple: 3.5,
    give: 0.45,
    rebound: 0.3,
    banks: banksOf(s, k),
    gravity: 4,
});

/** Where siding `k`'s rail is at `x`, and how steeply it falls to the right there. */
function railAt(s: YardState, k: number, x: number): { y: number; slope: number } {
    const lift = heightAt(banksOf(s, k), x),
        grade = gradeAt(banksOf(s, k), x);
    if (x >= POINTS || k === 0) return { y: LEAD_Y - lift, slope: -grade };
    // the lead bends down from the siding in the S the railcurve drawing is drawn with
    const rise = LEAD_Y - rowY(k),
        t = Math.max(0, (x - FAN_START) / FAN),
        up = bankHeight("ramp", rise, t),
        dx = 0.01;
    return {
        y: LEAD_Y - up - lift,
        slope: (x > FAN_START ? (up - bankHeight("ramp", rise, t + dx / FAN)) / dx : 0) - grade,
    };
}

/** Where a wagon on siding `k` with its middle at `x` is drawn, and how far it leans. */
function standing(s: YardState, k: number, x: number) {
    const { y, slope } = railAt(s, k, x),
        // a wagon on a steep lead leans no further than this, so it reads as a wagon and not a ramp
        a = Math.max(-0.45, Math.min(0.45, Math.atan(slope)));
    return { x: x + Math.sin(a) * ABOVE, y: y - Math.cos(a) * ABOVE, angle: a };
}

/** The wagons made up in siding `k`: coupled on from its buffer stop, the one against it first. */
export function made(s: YardState, k: number): string[] {
    const line = s.lines[k];
    const first = line ? groupsOf(line)[0] : undefined;
    if (!line || !first) return [];
    return line.vehicles.slice(first[0] + 1, first[1] + 1).map((v) => labelOf(v.id));
}

/** The one wagon that is neither waiting nor made up, and the siding line it is on. */
export function looseOf(s: YardState): { k: number; v: Vehicle } | null {
    for (let k = 0; k < s.lines.length; k++) {
        const line = s.lines[k];
        if (!line) continue;
        const first = groupsOf(line)[0];
        const v = line.vehicles[(first?.[1] ?? 0) + 1];
        if (v) return { k, v };
    }
    return null;
}

export const moving = (s: YardState): boolean => Math.abs(looseOf(s)?.v.v ?? 0) > 1e-6;

/** Whether siding `k` has what its board asks for. */
function meets(s: YardState, k: number): boolean {
    const sd = s.sidings[k],
        m = made(s, k);
    if (!sd || sd.wants === "spare") return true;
    if (sd.wants === "order") return m.join(" ") === s.order.join(" ");
    return m.reduce((n, l) => n + Number(l), 0) === sd.wants;
}

const asked = (s: YardState): number[] =>
    s.sidings.flatMap((sd, k) => (sd.wants === "spare" ? [] : [k]));

export const YARD_LEVELS: YardLevel[] = [
    {
        title: "Two sidings",
        grades: [1, 2],
        goal: "Send each wagon down the hump into a siding. The wagons in A add up to 5, and the wagons in B to 4.",
        sidings: [
            { room: 4, wants: 5 },
            { room: 4, wants: 4 },
        ],
        queue: ["2", "4", "3"],
        order: [],
        rise: 1,
        preview: 1,
    },
    {
        title: "Make ten",
        grades: [1, 2],
        goal: "Two pairs that make ten. Put one pair in each siding.",
        sidings: [
            { room: 4, wants: 10 },
            { room: 4, wants: 10 },
        ],
        queue: ["6", "3", "4", "7"],
        order: [],
        rise: 1.2,
        preview: 1,
    },
    {
        title: "One carriage out of place",
        grades: [1, 3],
        goal: "Make up A in the order 1, 2, 3 from its buffer stop. B is a spare siding with room for two.",
        sidings: [
            { room: 5, wants: "order" },
            { room: 2, wants: "spare" },
        ],
        queue: ["3", "1", "2"],
        order: ["1", "2", "3"],
        rise: 1,
        preview: 0.6,
    },
    {
        title: "Standing backwards",
        grades: [1, 3],
        goal: "They come in the wrong way round. Make up A in the order 1, 2, 3, using B to wait in.",
        sidings: [
            { room: 5, wants: "order" },
            { room: 3, wants: "spare" },
        ],
        queue: ["3", "2", "1"],
        order: ["1", "2", "3"],
        rise: 1.2,
        preview: 0.5,
    },
    {
        title: "Four jumbled",
        grades: [2, 3],
        goal: "Make up A in the order 1, 2, 3, 4. B has room for three.",
        sidings: [
            { room: 5, wants: "order" },
            { room: 3, wants: "spare" },
        ],
        queue: ["2", "4", "1", "3"],
        order: ["1", "2", "3", "4"],
        rise: 1.2,
        preview: 0.3,
    },
    {
        title: "Three sidings, one uphill",
        grades: [2, 4],
        goal: "A wants 10, B wants 7 and C wants 5. C climbs up a bank, so push harder for it.",
        sidings: [
            { room: 4, wants: 10 },
            { room: 3, wants: 7 },
            { room: 3, wants: 5, banks: [{ shape: "ramp", from: 20, to: FAN_START, rise: 1 }] },
        ],
        queue: ["6", "4", "3", "4", "5"],
        order: [],
        rise: 1.4,
        preview: 0,
    },
];

const NAMES = ["A", "B", "C"];

export function startYard(phase: number, queue?: readonly string[]): YardState {
    const L = YARD_LEVELS[phase] ?? YARD_LEVELS[0];
    if (!L) throw new Error("No yard levels");
    const labels = queue ?? L.queue;
    const s: YardState = {
        phase,
        sidings: L.sidings.map((sd) => ({
            ...sd,
            ...(sd.banks ? { banks: sd.banks.map((b) => ({ ...b })) } : {}),
        })),
        order: [...L.order],
        rise: L.rise,
        preview: L.preview,
        queue: labels.map((label, i) => ({ id: `w${i}:${label}`, label })),
        lines: [],
        points: 0,
        power: 2,
        pull: null,
        aimed: -9,
        jolts: [],
        hand: null,
        pushes: 0,
        note: "Tap the lever to choose a siding, then pull the front wagon back and let go.",
        won: false,
        met: L.sidings.map(() => false),
        time: 0,
        shuffle: 0,
        braked: false,
        away: 0,
    };
    s.lines = s.sidings.map((sd, k) => {
        const line = emptyLine();
        insert(line, { id: stopId(k), x: bufferX(sd), v: 0, length: 1, mass: 1e6, slows: 0 });
        return line;
    });
    return s;
}

/** The wagon a pull would push: a loose one at rest, or else the front of the waiting line. */
function pushable(s: YardState): { x: number; k: number } | null {
    const l = looseOf(s);
    if (l) return moving(s) ? null : { x: l.v.x, k: l.k };
    return s.queue.length && !s.won ? { x: CREST, k: s.points } : null;
}

function setPoints(s: YardState, k: number, out: Happening[]): void {
    if (k < 0 || k >= s.sidings.length || k === s.points || s.won) return;
    if (moving(s)) {
        s.note = "Wait for the wagon to stop before you change the points.";
        out.push({ cue: "nope" });
        return;
    }
    const l = looseOf(s);
    if (l && l.v.x > POINTS) {
        const line = s.lines[l.k],
            to = s.lines[k];
        const v = line ? remove(line, l.v.id) : null;
        if (v && to) insert(to, v);
    }
    s.points = k;
    s.note = `The points are set for siding ${NAMES[k] ?? ""}.`;
    out.push({ cue: "lift", strength: 0.3, pitch: semitones(k * 3) });
}

export function push(s: YardState, power: number, out: Happening[] = []): void {
    if (s.won || moving(s) || power < LEAST) return;
    const p = Math.min(MOST, power),
        l = looseOf(s);
    if (l) l.v.v = -p;
    else {
        const front = s.queue[0],
            sd = s.sidings[s.points],
            line = s.lines[s.points];
        if (!front || !sd || !line) return;
        if (made(s, s.points).length >= sd.room) {
            s.note = `Siding ${NAMES[s.points] ?? ""} is full. Set the points for another, or send a wagon back.`;
            out.push({ cue: "nope" });
            return;
        }
        s.queue.shift();
        insert(line, { id: front.id, x: CREST, v: -p, length: LEN, mass: 1, slows: 0.35 });
        s.shuffle = LEN;
    }
    s.pushes++;
    s.note = "";
    out.push({ cue: "lift", strength: p / MOST, pan: panOf(CREST, VIEW.w / 2, VIEW.w) });
}

/**
 * Sends a wagon back to the end of the waiting line: the loose one if there is one, or else the last
 * wagon of siding `k`. Nothing is lost by it, so it is the retry as well as a move.
 */
export function sendBack(s: YardState, k = s.points, out: Happening[] = []): boolean {
    if (s.won || moving(s)) return false;
    const l = looseOf(s);
    let id: string | null = null;
    if (l) {
        remove(s.lines[l.k] ?? emptyLine(), l.v.id);
        id = l.v.id;
    } else {
        const line = s.lines[k],
            n = made(s, k).length;
        if (!line || n === 0) return false;
        unhook(line, n - 1);
        id = line.vehicles[n]?.id ?? null;
        if (id) remove(line, id);
    }
    if (!id) return false;
    const label = labelOf(id);
    s.queue.push({ id, label });
    s.note = `The ${label} wagon goes back to the end of the line.`;
    out.push({ cue: "back" });
    return true;
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= r;

/** Where siding `k`'s board stands: its middle, and the foot of its post. */
export function boardAt(s: YardState, k: number): { x: number; y: number } {
    const sd = s.sidings[k];
    return { x: (sd ? bufferX(sd) : 0) - 4, y: rowY(k) - 3 };
}

/** Where the wagon a pull would push is drawn. */
export function pushableAt(s: YardState): { x: number; y: number } | null {
    const p = pushable(s);
    return p ? standing(s, p.k, p.x) : null;
}

function lastAt(s: YardState, k: number): { x: number; y: number } | null {
    const line = s.lines[k],
        n = made(s, k).length,
        v = line?.vehicles[n];
    return v && n > 0 ? standing(s, k, v.x) : null;
}

/** Where the points lever's handle is, which a finger takes hold of. */
export function leverAt(s: YardState): { x: number; y: number } {
    // the yardlever drawing's arm swings 0.3 radians either side of upright from a pivot 0.9 above its foot
    const lean = s.sidings.length > 1 ? s.points / (s.sidings.length - 1) : 0,
        a = -0.3 + lean * 0.6;
    return {
        x: LEVER.x + Math.sin(a) * LEVER.reach,
        y: LEVER.foot - 0.9 - Math.cos(a) * LEVER.reach,
    };
}

/** The lever pulled over once: the points go to the next siding up, and from the last back to the first. */
function throwLever(s: YardState, out: Happening[]): void {
    setPoints(s, (s.points + 1) % s.sidings.length, out);
}

function hands(s: YardState, pad: Pad, out: Happening[]): void {
    const w = pushableAt(s);
    if (pad.touch && !s.hand) {
        const t = pad.touch,
            board = s.sidings.findIndex((_, k) => near(t, boardAt(s, k), 3)),
            last = s.sidings.findIndex((_, k) => {
                const at = lastAt(s, k);
                return at !== null && near(t, at, 2.2);
            });
        if (w && near(t, w, 2.6)) s.hand = { on: "wagon" };
        else if (near(t, leverAt(s), 2.6)) s.hand = { on: "lever" };
        else if (board >= 0) s.hand = { on: "board", k: board };
        else if (last >= 0) s.hand = { on: "last", k: last };
        else s.hand = { on: "none" };
    }
    const pulled = pad.touch ?? pad.lifted;
    if (pulled && s.hand?.on === "wagon" && w) {
        // measured back and upwards, so the edge of the field leaves room for a hard push
        const back = Math.max(0, pulled.x - w.x),
            up = Math.max(0, w.y - pulled.y);
        s.pull = Math.min(MOST / PER, Math.hypot(back, up));
    }
    if (pad.lifted && s.hand) {
        const at = pad.lifted,
            hand = s.hand;
        if (hand.on === "wagon") {
            if (s.pull !== null && s.pull * PER >= LEAST) push(s, s.pull * PER, out);
            else if (looseOf(s)) sendBack(s, s.points, out);
        } else if (hand.on === "lever") throwLever(s, out);
        else if (hand.on === "board" && near(at, boardAt(s, hand.k), 3)) setPoints(s, hand.k, out);
        else if (hand.on === "last") {
            // a tap on the wagon, or a drag of it back towards the hump, sends it back
            const to = lastAt(s, hand.k);
            if (to && (near(at, to, 2.4) || at.x > to.x + 2)) sendBack(s, hand.k, out);
        }
        s.hand = null;
        s.pull = null;
    }
    if (!pad.touch && !pad.lifted) {
        s.hand = null;
        s.pull = null;
    }
    for (const d of pad.pressed) {
        if (d === "up") setPoints(s, s.points + 1, out);
        else if (d === "down") setPoints(s, s.points - 1, out);
        else if (d === "right") {
            s.power = Math.min(MOST, s.power + STEP);
            s.aimed = s.time;
        } else if (d === "left") {
            s.power = Math.max(LEAST, s.power - STEP);
            s.aimed = s.time;
        }
    }
    if (pad.tapped) push(s, s.power, out);
    if (pad.brake && !s.braked) sendBack(s, s.points, out);
    s.braked = pad.brake;
}

const unshift = (p: { x: number; y: number } | null) =>
    p && { x: p.x - ORIGIN.x, y: p.y - ORIGIN.y };

/** The pad with the hand's places read in the laid-out yard's squares rather than the world's. */
const local = (pad: Pad): Pad => ({
    ...pad,
    touch: unshift(pad.touch),
    lifted: unshift(pad.lifted),
});

function emit(out: Happening[], event: GameEvent): void {
    out.push({ event });
}

/** The lines moved on one step, with what met what, and nothing the hands did. */
function roll(s: YardState, out: Happening[]): void {
    const l = looseOf(s);
    const was = l ? Math.abs(l.v.v) : 0,
        before = s.sidings.map((_, k) => made(s, k).length);
    s.lines.forEach((line, k) => {
        for (const e of railStep(line, DT, rulesOf(s, k), stopId(k))) {
            const at = line.vehicles.find((v) => v.id === (e.kind === "stop" ? e.id : e.right));
            const pan = panOf(at?.x ?? CREST, VIEW.w / 2, VIEW.w);
            if (e.kind === "knock" || e.kind === "couple")
                s.jolts = [
                    ...s.jolts.filter((j) => s.time - j.at < 1),
                    { id: e.right, at: s.time, hard: e.kind === "knock" },
                ].slice(-6);
            if (e.kind === "knock") {
                out.push({ cue: "bump", strength: Math.min(1, e.speed / 8), pan });
                out.push({ shake: Math.min(0.4, e.speed / 20) });
                s.note = "Too fast! It knocked and rolled back. Push it more gently.";
            } else if (e.kind === "couple") {
                const n = made(s, k).length;
                out.push({ cue: "place", pitch: semitones((n - 1) * 2), strength: 0.8, pan });
                const where = standing(s, k, at?.x ?? 0);
                out.push({ puff: { x: where.x + LEN / 2, y: where.y + 0.8, n: 4 } });
                emit(out, { kind: "couple", value: labelOf(e.right) });
            }
        }
    });
    s.shuffle = Math.max(0, s.shuffle - 6 * DT);
    const after = looseOf(s);
    if (l && was > 0 && after && !moving(s) && !s.note.startsWith("Too fast")) {
        s.note =
            after.v.x > POINTS
                ? "It stopped before the points. Push it on."
                : "A little short. A small push will couple it.";
    }
    s.sidings.forEach((_, k) => {
        if ((made(s, k).length ?? 0) > (before[k] ?? 0)) {
            const total = made(s, k).reduce((n, x) => n + Number(x), 0),
                sd = s.sidings[k];
            s.note =
                sd?.wants === "order"
                    ? `Coupled. Siding ${NAMES[k] ?? ""} reads ${made(s, k).join(", ")}.`
                    : sd && typeof sd.wants === "number"
                      ? `Coupled. Siding ${NAMES[k] ?? ""} has ${made(s, k).join(" + ")} = ${total}.`
                      : `Coupled in the spare siding.`;
        }
    });
}

export function stepYard(s: YardState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.time += DT;
    if (s.won) {
        s.away += DT;
        s.shuffle = Math.max(0, s.shuffle - 6 * DT);
        return out;
    }
    hands(s, local(pad), out);
    roll(s, out);
    const settled = !looseOf(s) && !moving(s);
    s.sidings.forEach((sd, k) => {
        const now = sd.wants !== "spare" && meets(s, k) && made(s, k).length > 0;
        if (now && !s.met[k] && settled) {
            emit(out, { kind: "checkpoint" });
            if (typeof sd.wants === "number")
                s.note = `Siding ${NAMES[k] ?? ""} makes ${sd.wants}.`;
        }
        s.met[k] = now;
    });
    if (settled && s.queue.length === 0 && asked(s).every((k) => meets(s, k))) {
        s.won = true;
        s.note =
            s.order.length > 0
                ? `The train is made up: ${s.order.join(", ")}. Away it goes!`
                : "Every siding is made up. Away they go!";
        out.push({ cue: "win" });
        emit(out, { kind: "made-up" });
    }
    return out;
}

/** Where a push of `power` takes the wagon a pull would push, drawn every quarter second until it rests or meets. */
export function pathOf(s: YardState, power: number): { x: number; y: number }[] {
    const copy = structuredClone(s);
    copy.note = "";
    push(copy, power);
    const l = looseOf(copy);
    if (!l) return [];
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < 60 * 12; i++) {
        const hs: Happening[] = [];
        roll(copy, hs);
        const now = looseOf(copy);
        if (!now) break;
        if (i % 15 === 0) out.push(standing(copy, now.k, now.v.x));
        if (hs.some((h) => "cue" in h && (h.cue === "bump" || h.cue === "place")) || !moving(copy))
            break;
    }
    const last = looseOf(copy);
    if (last) out.push(standing(copy, last.k, last.v.x));
    return out;
}

function trackSprites(s: YardState): Sprite[] {
    const out: Sprite[] = [];
    const rail = (key: string, from: number, to: number, y: number, faint = false): Sprite => ({
        key,
        art: "railway",
        params: { length: Math.max(4, Math.round(to - from)), gap: 0, at: 0, bank: 0 },
        x: (from + to) / 2,
        y: y - 0.5 + 2,
        size: Math.max(4, Math.round(to - from)),
        still: true,
        faint,
        z: 1,
    });
    s.sidings.forEach((sd, k) => {
        const from = bufferX(sd) - 1.5;
        const cuts = [from, ...(sd.banks ?? []).flatMap((b) => [b.from, b.to]), FAN_START];
        for (let i = 0; i + 1 < cuts.length; i++) {
            const a = cuts[i] ?? 0,
                b = cuts[i + 1] ?? 0,
                bank = sd.banks?.find((x) => x.from === a && x.to === b);
            if (bank) {
                const up = Math.max(0, bank.rise),
                    h = Math.ceil(up + Math.max(0, -bank.rise) + 4),
                    lift = heightAt(sd.banks ?? [], a) - (bank.shape === "ramp" ? bank.rise : 0);
                out.push({
                    key: `bank${k}:${i}`,
                    art: "railbank",
                    params: { run: b - a, rise: bank.rise, shape: bank.shape },
                    x: (a + b) / 2,
                    y: rowY(k) - lift - (0.5 + up) + h / 2,
                    size: b - a,
                    still: true,
                    z: 1,
                });
            } else if (b - a >= 1)
                out.push(
                    rail(`rail${k}:${i}`, a, b, rowY(k) - heightAt(sd.banks ?? [], (a + b) / 2)),
                );
        }
        // the route the points are set for is drawn whole, and the others faint
        const set = k === s.points;
        if (k === 0) out.push(rail(`fan0`, FAN_START, POINTS, LEAD_Y, !set));
        else {
            const rise = LEAD_Y - rowY(k),
                h = Math.ceil(rise + 2.2);
            out.push({
                key: `fan${k}`,
                art: "railcurve",
                params: { run: FAN, rise },
                x: (FAN_START + POINTS) / 2,
                y: rowY(k) - 0.5 + h / 2,
                size: FAN,
                faint: !set,
                z: set ? 1.1 : 0.9,
            });
        }
    });
    const up = s.rise,
        h = Math.ceil(up + 4);
    out.push({
        key: "hump",
        art: "railbank",
        params: { run: HUMP.to - HUMP.from, rise: s.rise, shape: "hump" },
        x: (HUMP.from + HUMP.to) / 2,
        y: LEAD_Y - (0.5 + up) + h / 2,
        size: HUMP.to - HUMP.from,
        still: true,
        z: 1,
    });
    // the railway drawing is at most 36 squares long, so the yard's rail out to the edge is in lengths
    for (let x = HUMP.to, i = 0; x < WORLD.w; x += 28, i++)
        out.push(rail(`yard${i}`, x, Math.min(WORLD.w, x + 28), LEAD_Y));
    return out;
}

const hookSprite = (key: string, x: number, y: number): Sprite => ({
    key,
    art: "coupling",
    params: { closed: 1 },
    size: 1.2,
    x,
    y,
    z: 4,
});

export function yardFrame(s: YardState, rest = false): Frame {
    const sprites: Sprite[] = [
        {
            key: "firs",
            art: "firs",
            x: 60,
            y: rowY(1),
            size: 7,
            stand: true,
            still: true,
            z: 0.5,
        },
        ...trackSprites(s),
    ];
    s.sidings.forEach((sd, k) => {
        const b = boardAt(s, k);
        sprites.push(
            {
                key: `buffer${k}`,
                art: "bufferstop",
                params: { facing: 1 },
                x: bufferX(sd) - 0.5,
                y: rowY(k) - 1,
                still: true,
                z: 2,
            },
            {
                key: `board${k}`,
                art: "sidingboard",
                params: {
                    name: NAMES[k] ?? "",
                    wants:
                        sd.wants === "order"
                            ? s.order.join(" ")
                            : sd.wants === "spare"
                              ? "spare"
                              : String(sd.wants),
                    has:
                        typeof sd.wants === "number"
                            ? made(s, k).join(" + ")
                            : made(s, k).join(" "),
                    done: sd.wants !== "spare" && meets(s, k) && made(s, k).length > 0 ? 1 : 0,
                },
                x: b.x,
                y: rowY(k) + 0.1,
                stand: true,
                live: true,
                z: 2,
            },
        );
    });
    sprites.push({
        key: "lever",
        art: "yardlever",
        params: {
            pulled: s.sidings.length > 1 ? s.points / (s.sidings.length - 1) : 0,
            reach: LEVER.reach,
        },
        x: LEVER.x,
        y: LEVER.foot,
        stand: true,
        live: true,
        z: 4,
    });
    // how far the hand has pulled the wagon back, drawn as the wagon and the line behind it easing up the hump
    const aim = s.pull !== null ? s.pull * PER : null,
        back = rest || aim === null ? 0 : Math.min(2.4, (aim / MOST) * 2.4);
    const loose = looseOf(s);
    const jolt = (id: string): { squash: number; tilt: number } => {
        const j = rest ? undefined : s.jolts.find((x) => x.id === id);
        const t = j ? s.time - j.at : 1;
        if (!j || t >= 0.8) return { squash: 0, tilt: 0 };
        const fade = Math.exp(-t * 6);
        return j.hard
            ? { squash: 0, tilt: 0.1 * Math.sin(t * 28) * fade }
            : { squash: 0.12 * Math.sin(t * 22) * fade, tilt: 0 };
    };
    // the made-up wagons and the loose one
    s.lines.forEach((line, k) => {
        line.vehicles.forEach((v, i) => {
            if (i === 0) return;
            const shifted = loose && loose.v.id === v.id && !moving(s) ? back : 0,
                at = standing(s, k, v.x + shifted),
                j = jolt(v.id);
            sprites.push({
                key: v.id,
                art: "carriage",
                params: { label: labelOf(v.id), windows: 2 },
                x: at.x,
                y: at.y,
                angle: at.angle + j.tilt,
                squash: j.squash,
                size: LEN,
                z: 3,
            });
            if (i > 1 && line.hooked[i - 1]) {
                const prev = line.vehicles[i - 1];
                const hx = ((prev?.x ?? v.x) + v.x) / 2;
                sprites.push(hookSprite(`hook:${v.id}`, hx, railAt(s, k, hx).y - 0.72));
            }
        });
    });
    // the waiting line and the engine behind it, closing up after a wagon goes
    const shift = (rest ? 0 : s.shuffle) + (loose ? 0 : back);
    const leaving = s.won ? Math.min(40, s.away * s.away * 3) : 0;
    s.queue.forEach((w, i) => {
        const x = CREST + i * LEN + shift + leaving;
        const at = standing(s, 0, x);
        sprites.push({
            key: w.id,
            art: "carriage",
            params: { label: w.label, windows: 2 },
            x: at.x,
            y: at.y,
            angle: at.angle,
            size: LEN,
            z: 3,
        });
        if (i > 0)
            sprites.push(
                hookSprite(`qhook:${w.id}`, x - LEN / 2, railAt(s, 0, x - LEN / 2).y - 0.72),
            );
    });
    const ex = CREST + s.queue.length * LEN + shift + leaving,
        eat = standing(s, 0, ex);
    sprites.push({
        key: "engine",
        art: "loco",
        params: { facing: -1 },
        x: eat.x,
        y: eat.y,
        angle: eat.angle,
        size: LEN,
        z: 3,
    });
    const marks: Mark[] = [
        {
            kind: "word",
            x: VIEW.w - 5,
            y: LEAD_Y + 3.2,
            text: `${s.pushes} ${s.pushes === 1 ? "push" : "pushes"}`,
            size: 0.6,
        },
    ];
    const lever = leverAt(s);
    marks.push({
        kind: "word",
        x: lever.x,
        y: lever.y - 1.5,
        text: NAMES[s.points] ?? "",
        size: 0.8,
    });
    // a faint wagon where the push being aimed would leave it, fainter as the levels go on
    const aiming = aim ?? (s.time - s.aimed < 1.5 ? s.power : null);
    if (!s.won && !rest && !moving(s)) {
        // the gauge over the front wagon: how strong the push is, so the keys and buttons set it by degrees
        const from = pushableAt(s),
            strength = aim ?? s.power;
        if (from) {
            const w = 4,
                left = from.x - w / 2,
                y = from.y - 2.6;
            marks.push(
                { kind: "box", x: left, y: y - 0.3, w, h: 0.6 },
                {
                    kind: "line",
                    a: { x: left + 0.1, y },
                    b: { x: left + 0.1 + (w - 0.2) * Math.min(1, strength / MOST), y },
                    style: "rod",
                },
            );
        }
    }
    if (!s.won && !rest && s.preview > 0 && aiming !== null && pushable(s) && !moving(s)) {
        const end = pathOf(s, aiming).at(-1);
        if (end)
            sprites.push({
                key: "ghost",
                art: "carriage",
                params: { label: "", windows: 2 },
                x: end.x,
                y: end.y,
                size: LEN,
                alpha: 0.15 + 0.3 * s.preview,
                z: 2.5,
            });
    }
    return inWorld(s, sprites, marks, rest);
}

const shiftPt = (p: { x: number; y: number }) => ({ x: p.x + ORIGIN.x, y: p.y + ORIGIN.y });

function shiftMark(m: Mark): Mark {
    if (m.kind === "dots") return { ...m, pts: m.pts.map(shiftPt) };
    if (m.kind === "line") return { ...m, a: shiftPt(m.a), b: shiftPt(m.b) };
    return { ...m, ...shiftPt(m) };
}

/**
 * The laid-out yard moved into the world, with the ground and sky round it that a wide or tall room
 * shows: a meadow under the sidings to the world's foot, the yard's rail out to its right edge, and
 * clouds over it all.
 */
function inWorld(s: YardState, sprites: Sprite[], marks: Mark[], rest: boolean): Frame {
    const W = YARD_WORLD,
        top = rowY(s.sidings.length - 1) - 2 + ORIGIN.y,
        ground: Sprite[] = [];
    for (let x = 0, i = 0; x < W.w; x += 36, i++)
        for (let y = top, j = 0; y < W.h; y += 40, j++) {
            const across = Math.min(36, W.w - x),
                deep = Math.min(40, Math.ceil(W.h - y));
            ground.push({
                key: `meadow${i}:${j}`,
                art: "meadow",
                params: { across, deep, x0: x, y0: Math.round(y - top), daisies: 1 },
                x: x + across / 2,
                y: y + deep / 2,
                size: across,
                still: true,
                z: 0.2,
            });
        }
    // hills along the horizon and clouds through the sky, so a tall room shows sky rather than bare paper
    const hills: Sprite[] = [];
    for (let x = 8, i = 0; x < W.w + 8; x += 17, i++)
        hills.push({
            key: `hills${i}`,
            art: "peaks",
            params: { count: 3 + (i % 2), snow: 0 },
            seed: 40 + i,
            x,
            y: top + 0.6,
            size: 12 + (i % 3) * 2,
            stand: true,
            faint: true,
            still: true,
            z: 0.1,
        });
    const sky: Sprite[] = [];
    for (let y = top - 9, row = 0; y > 1; y -= 7, row++)
        for (let x = 6 + (row % 2) * 13, i = 0; x < W.w; x += 26, i++)
            sky.push({
                key: `sky${row}:${i}`,
                art: "cloud",
                x,
                y,
                size: 4 + ((row + i) % 3),
                still: true,
                z: 0,
            });

    return {
        sprites: [...sky, ...hills, ...ground, ...sprites.map((p) => ({ ...p, ...shiftPt(p) }))],
        marks: marks.map(shiftMark),
        camera: { x: ORIGIN.x + VIEW.w / 2, y: ORIGIN.y + frameOf(s).middle },
        view: { ...VIEW },
        world: { ...W },
        time: rest ? 0 : s.time,
    };
}

/** The yard's own sounds: a clank for a coupling, a knock of iron, a click of the points and a whistle. */
const SOUNDS: Kit = {
    place: [
        { wave: "square", hz: 170, attack: 0.002, decay: 0.08, gain: 0.35 },
        { wave: "noise", hz: 3000, attack: 0.002, decay: 0.05, gain: 0.4 },
        { wave: "sine", hz: 440, attack: 0.01, decay: 0.3, gain: 0.3, delay: 0.06 },
    ],
    bump: [
        { wave: "noise", hz: 1300, attack: 0.002, decay: 0.14, gain: 0.55 },
        { wave: "square", hz: 100, to: 60, attack: 0.002, decay: 0.16, gain: 0.3 },
    ],
    lift: [
        { wave: "square", hz: 900, attack: 0.001, decay: 0.03, gain: 0.25 },
        { wave: "noise", hz: 500, attack: 0.03, decay: 0.2, gain: 0.25, delay: 0.02 },
    ],
    back: [{ wave: "noise", hz: 4200, attack: 0.02, decay: 0.35, gain: 0.3 }],
    win: [
        { wave: "sine", hz: 784, attack: 0.05, decay: 0.5, gain: 0.35 },
        { wave: "sine", hz: 988, attack: 0.05, decay: 0.5, gain: 0.3 },
        { wave: "sine", hz: 784, attack: 0.05, decay: 0.9, gain: 0.35, delay: 0.6 },
        { wave: "sine", hz: 988, attack: 0.05, decay: 0.9, gain: 0.3, delay: 0.6 },
    ],
};

const listing = (xs: string[]) => (xs.length ? xs.join(", ") : "nothing");

export const yardGame: ActionGame<YardState> = {
    portrait: { hint: true },
    id: "shunt",
    title: "Shunting yard",
    group: "action",
    // too wide to crop into a card and keep its play in view: it waits for the turned or overview view, see .docs/game-cards.md
    card: null,
    quiet: true,
    levels: YARD_LEVELS,
    rate: 60,
    touch: true,
    plays: { activity: "shunt.into-order", levels: [2, 3, 4] },
    cover: { art: "carriage", params: { label: "3", windows: 2 } },
    hint: "Tap the lever to set the points, then pull the front wagon back and let go. Tap a wagon in a siding to send it back. Up and down set the points, left and right set the push on the gauge, space pushes, and Backspace sends a wagon back.",
    // two ways to play: by hand in the yard, or by the keys and these buttons, which set the push by degrees
    controls: {
        arrows: {
            up: "Points to the siding behind",
            down: "Points to the siding in front",
            left: "Push softer",
            right: "Push harder",
        },
        go: "Push",
        brake: "Send back",
    },
    sounds: SOUNDS,
    start: (phase) => startYard(phase),
    step: stepYard,
    back: (s) => sendBack(s),
    cancelInput: (s) => {
        s.hand = null;
        s.pull = null;
    },
    hum: (s) => {
        const v = Math.abs(looseOf(s)?.v.v ?? 0);
        return [
            { kind: "engine", level: s.won ? 0.8 : 0.2, pitch: s.won ? 1.5 : 1 },
            ...(v > 0.05
                ? [{ kind: "engine" as const, level: Math.min(1, v / 6), pitch: 0.5 + v / 12 }]
                : []),
        ];
    },
    say: (s) => {
        const sidings = s.sidings
            .map((sd, k) => {
                const wants =
                    sd.wants === "order"
                        ? `wants ${s.order.join(", ")} in order`
                        : sd.wants === "spare"
                          ? "is spare"
                          : `wants ${sd.wants}`;
                return `Siding ${NAMES[k] ?? ""} ${wants} and has ${listing(made(s, k))}.`;
            })
            .join(" ");
        const l = looseOf(s);
        const loose = l
            ? ` The ${labelOf(l.v.id)} wagon is ${moving(s) ? "rolling" : "standing loose"}.`
            : "";
        return `Waiting: ${listing(s.queue.map((w) => w.label))}. The points are set for ${NAMES[s.points] ?? ""}. ${sidings}${loose} The push is ${Math.round((s.power / MOST) * 100)}% strong, and ${s.pushes} ${s.pushes === 1 ? "push has" : "pushes have"} been made.`;
    },
    note: (s) => s.note,
    won: (s) => s.won,
    objectives: (s) => {
        const ks = asked(s);
        if (s.order.length) {
            const m = made(s, ks[0] ?? 0);
            let right = 0;
            while (right < m.length && m[right] === s.order[right]) right++;
            return { completed: right, total: s.order.length };
        }
        return {
            completed: ks.filter((k) => meets(s, k) && made(s, k).length > 0).length,
            total: ks.length,
        };
    },
    frame: yardFrame,
    still: {
        press: () => 1,
        settling: (s) => moving(s) || (s.won && s.away < 2),
    },
};
