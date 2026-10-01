// The sound train: each sound of the picture's word is a wagon pushed down the line to couple on
// in order, and how hard it is pushed decides whether it couples, knocks or stops short.
// See .docs/games.md.
import type { ActionGame } from "./game";
import type { SpellVersion } from "./spell";
import { semitones, panOf, type Kit } from "../../engine/sound/kit";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import {
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
} from "../../engine/motion/rail";

export interface TrainLevel {
    title: string;
    grades: [number, number];
    goal: string;
    banks: Bank[];
    /** How much of a push's path the dots show, from nought to all of it. */
    preview: number;
    /** The words a level can ask for; the first is the level as it is authored. */
    words: SpellVersion[];
}

export interface TrainState {
    phase: number;
    banks: Bank[];
    preview: number;
    word: SpellVersion;
    /** The tiles as the shed shows them, in an order that gives nothing away. */
    shed: string[];
    line: Line;
    /** The shed wagon picked, or -1 before one is. */
    chosen: number;
    /** The push the keys have set, in squares a second. */
    power: number;
    /** A finger pulling the wagon back, in squares, while it pulls. */
    pull: number | null;
    /** What a finger pressed on, until it lifts. */
    hand: { on: "wagon" | "hook" | "none" } | { on: "shed"; i: number } | null;
    pushes: number;
    note: string;
    won: boolean;
    /** Seconds since the train set off. */
    away: number;
    time: number;
    braked: boolean;
}

const WORDS = {
    bus: {
        word: "bus",
        sounds: ["b", "u", "s"],
        tiles: ["b", "u", "s", "d", "o", "ss"],
        picture: { art: "bus", params: { windows: 5, on: 3, sign: "12" } },
    },
    ant: {
        word: "ant",
        sounds: ["a", "n", "t"],
        tiles: ["a", "n", "t", "e", "m", "d"],
        picture: { art: "minibeasts", params: { kinds: ["ant"], spots: 7, legs: false } },
    },
    sun: {
        word: "sun",
        sounds: ["s", "u", "n"],
        tiles: ["s", "u", "n", "m", "o", "ss"],
        picture: { art: "daysky", params: { night: false, phase: 0.5, clouds: 0, stars: 12 } },
    },
    star: {
        word: "star",
        sounds: ["s", "t", "ar"],
        tiles: ["s", "t", "ar", "or", "sh", "c"],
        picture: { art: "prop.star", params: {} },
    },
    ball: {
        word: "ball",
        sounds: ["b", "a", "ll"],
        tiles: ["b", "a", "ll", "d", "o", "s"],
        picture: { art: "prop.ball", params: {} },
    },
    tree: {
        word: "tree",
        sounds: ["t", "r", "ee"],
        tiles: ["t", "r", "ee", "d", "ai", "s"],
        picture: { art: "tree", params: {} },
    },
    clock: {
        word: "clock",
        sounds: ["c", "l", "o", "ck"],
        tiles: ["c", "l", "o", "ck", "ch", "u"],
        picture: { art: "clock", params: { h: 3, m: 0 } },
    },
    pond: {
        word: "pond",
        sounds: ["p", "o", "n", "d"],
        tiles: ["p", "o", "n", "d", "b", "a"],
        picture: { art: "pond", params: { pads: 4, fish: 3, frog: true } },
    },
    snail: {
        word: "snail",
        sounds: ["s", "n", "ai", "l"],
        tiles: ["s", "n", "ai", "l", "ee", "m"],
        picture: { art: "minibeasts", params: { kinds: ["snail"], spots: 7, legs: false } },
    },
    train: {
        word: "train",
        sounds: ["t", "r", "ai", "n"],
        tiles: ["t", "r", "ai", "n", "ay", "m"],
        picture: { art: "train", params: { carriages: 2, windows: 3, on: 4 } },
    },
    bird: {
        word: "bird",
        sounds: ["b", "ir", "d"],
        tiles: ["b", "ir", "d", "ur", "er", "p"],
        picture: { art: "birdrow", params: { count: 1, facing: [1], wire: false } },
    },
} satisfies Record<string, SpellVersion>;

export const TRAIN_LEVELS: TrainLevel[] = [
    {
        title: "Three sounds",
        grades: [1, 2],
        goal: "Say the picture's word. Push its sounds down the line in order, gently enough to couple on.",
        banks: [],
        preview: 1,
        words: [WORDS.bus, WORDS.ant, WORDS.sun],
    },
    {
        title: "Over the hump",
        grades: [1, 2],
        goal: "Three sounds, and one of them is two letters. Push hard enough to get over the hump.",
        banks: [{ shape: "hump", from: 28, to: 38, rise: 1.5 }],
        preview: 1,
        words: [WORDS.star, WORDS.ball, WORDS.tree],
    },
    {
        title: "Down in the dip",
        grades: [1, 2],
        goal: "Four sounds. A wagon that stops in the dip needs a push to climb out.",
        banks: [{ shape: "hump", from: 28, to: 36, rise: -1.5 }],
        preview: 0.5,
        words: [WORDS.clock, WORDS.pond, WORDS.snail],
    },
    {
        title: "Hump and dip, and a choice",
        grades: [1, 2],
        goal: "Two wagons could make the same sound. Only one spells the word.",
        banks: [
            { shape: "hump", from: 24, to: 30, rise: 1 },
            { shape: "hump", from: 34, to: 40, rise: -1.5 },
        ],
        preview: 0.3,
        words: [WORDS.train, WORDS.bird],
    },
    {
        title: "Up to the station",
        grades: [1, 2],
        goal: "The engine waits up the bank. Push hard enough to climb it, and gently enough to couple.",
        banks: [{ shape: "ramp", from: 26, to: 38, rise: 2 }],
        preview: 0,
        words: [WORDS.snail, WORDS.pond, WORDS.bird],
    },
];

const DT = 1 / 60;
const LEN = 4;
/** Where the rail runs on the level, in squares from the top of the world. */
const BASE = 19;
/** The world, all in view, in squares. The browser tests place a finger on the field by it. */
export const TRAIN_WORLD = { w: 50, h: 23 };
const WORLD = TRAIN_WORLD;
const ENGINE_X = 3;
const LAUNCH = 44.5;
const SHED_Y = 9.5;
/** Squares a second of push for each square pulled back, and the hardest push. */
const PER = 1.5;
const MOST = 12;
const LEAST = 0.5;
/** Squares short of the train a wagon may stop on the level and still creep on to couple. */
const CREEP = 3.5;
/** A carriage's middle sits this far above the rail at the size it is drawn. */
const ABOVE = 1.44;

const rulesOf = (s: TrainState): Rules => ({
    ends: [s.won ? -80 : 1, 47],
    gaps: [],
    // generous, so a push that looks gentle couples; only a clearly hard push knocks
    couple: 6.5,
    give: 0.45,
    rebound: 0.35,
    banks: s.banks,
    gravity: 7,
});

const idOf = (tile: string) => `w:${tile}`;
const tileOf = (id: string) => id.slice(2);

/** The wagons coupled behind the engine, in order from it. */
export function coupled(s: TrainState): string[] {
    const first = groupsOf(s.line).find(([a]) => s.line.vehicles[a]?.id === "engine");
    if (!first) return [];
    return s.line.vehicles.slice(first[0] + 1, first[1] + 1).map((v) => tileOf(v.id));
}

/** The one wagon on the line that is not coupled, if there is one. */
export function loose(s: TrainState) {
    const on = new Set(coupled(s).map(idOf));
    return s.line.vehicles.find((v) => v.id !== "engine" && !on.has(v.id)) ?? null;
}

const railY = (s: TrainState, x: number) => BASE - heightAt(s.banks, x);
const moving = (s: TrainState) => Math.abs(loose(s)?.v ?? 0) > 1e-6;
const atRest = (s: TrainState) => !s.won && loose(s) !== null && !moving(s);
const free = (s: TrainState, i: number) => {
    const t = s.shed[i];
    return t !== undefined && !coupled(s).includes(t);
};

export function startTrain(phase: number, word?: SpellVersion): TrainState {
    const level = TRAIN_LEVELS[phase] ?? TRAIN_LEVELS[0];
    if (!level) throw new Error("No train levels");
    const w = word ?? level.words[0] ?? WORDS.bus;
    const line = emptyLine();
    insert(line, { id: "engine", x: ENGINE_X, v: 0, length: LEN, mass: 4, slows: 0 });
    return {
        phase,
        banks: level.banks.map((b) => ({ ...b })),
        preview: level.preview,
        word: structuredClone(w),
        shed: [...w.tiles].sort(),
        line,
        chosen: -1,
        power: 6,
        pull: null,
        hand: null,
        pushes: 0,
        note: "Choose the wagon with the first sound of the word.",
        won: false,
        away: 0,
        time: 0,
        braked: false,
    };
}

/** Swings a shed wagon onto the line at the start, and the loose one back to the shed. */
function choose(s: TrainState, i: number, out: Happening[]): void {
    if (!free(s, i) || moving(s) || s.won) return;
    const now = loose(s);
    if (now) remove(s.line, now.id);
    const tile = s.shed[i] ?? "";
    insert(s.line, { id: idOf(tile), x: LAUNCH, v: 0, length: LEN, mass: 1, slows: 0.6 });
    s.chosen = i;
    s.note = `The "${tile}" wagon is on the line. Pull it back and let go to push it.`;
    out.push({ cue: "lift", strength: 0.4, pan: panOf(LAUNCH, WORLD.w / 2, WORLD.w) });
}

function nextFree(s: TrainState, dir: 1 | -1): number {
    const n = s.shed.length;
    for (let k = 1; k <= n; k++) {
        const i = ((((s.chosen < 0 && dir < 0 ? 0 : s.chosen) + dir * k) % n) + n) % n;
        if (free(s, i)) return i;
    }
    return -1;
}

function push(s: TrainState, power: number, out: Happening[]): void {
    const w = loose(s);
    if (!w || moving(s) || s.won || power < LEAST) return;
    if (coupled(s).length >= s.word.sounds.length) {
        s.note = "The train already has a wagon for every sound. Uncouple one to change it.";
        out.push({ cue: "nope" });
        return;
    }
    w.v = -Math.min(MOST, power);
    s.pushes++;
    s.note = "";
    out.push({ cue: "lift", strength: power / MOST, pan: panOf(w.x, WORLD.w / 2, WORLD.w) });
}

/** Lets the last wagon go of the train and rolls it back towards the start. */
export function uncouple(s: TrainState, out: Happening[] = []): boolean {
    const train = coupled(s);
    if (!train.length || s.won || moving(s)) return false;
    const other = loose(s);
    if (other) remove(s.line, other.id);
    const i = train.length - 1;
    unhook(s.line, i);
    const last = s.line.vehicles[i + 1];
    if (last) last.v = 3;
    s.chosen = s.shed.indexOf(train[i] ?? "");
    s.note = `The "${train[i]}" wagon is uncoupled and rolls back.`;
    out.push({ cue: "back" });
    return true;
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= r;

const shedAt = (s: TrainState, i: number) => ({
    x: 50 - s.shed.length * 3.6 + i * 3.6 - 0.2,
    y: SHED_Y,
});

const hookAt = (s: TrainState) => {
    const n = coupled(s).length;
    const x = ENGINE_X + LEN / 2 + (n - 1) * LEN;
    return { x, y: railY(s, x) - 0.72 };
};

function hands(s: TrainState, pad: Pad, out: Happening[]): void {
    const w = loose(s);
    if (pad.touch && !s.hand) {
        const t = pad.touch,
            i = s.shed.findIndex((_, k) => near(t, shedAt(s, k), 1.8));
        if (w && atRest(s) && near(t, { x: w.x, y: railY(s, w.x) - ABOVE }, 2.6))
            s.hand = { on: "wagon" };
        else if (i >= 0) s.hand = { on: "shed", i };
        else if (coupled(s).length && near(t, hookAt(s), 1.6)) s.hand = { on: "hook" };
        else s.hand = { on: "none" };
    }
    const pulled = pad.touch ?? pad.lifted;
    if (pulled && s.hand?.on === "wagon" && w) {
        // measured backwards or upwards, so the edge of the field leaves room for a hard push
        const back = Math.max(0, pulled.x - w.x),
            up = Math.max(0, railY(s, w.x) - ABOVE - pulled.y);
        s.pull = Math.min(MOST / PER, Math.hypot(back, up));
        s.power = Math.max(LEAST, s.pull * PER);
    }
    if (pad.lifted && s.hand) {
        const at = pad.lifted,
            hand = s.hand;
        if (hand.on === "wagon" && s.pull !== null && s.pull * PER >= LEAST)
            push(s, s.pull * PER, out);
        else if (hand.on === "shed" && near(at, shedAt(s, hand.i), 2)) choose(s, hand.i, out);
        else if (hand.on === "hook" && near(at, hookAt(s), 2)) uncouple(s, out);
        s.hand = null;
        s.pull = null;
    }
    if (!pad.touch && !pad.lifted) {
        s.hand = null;
        s.pull = null;
    }
    for (const d of pad.pressed) {
        if (d === "left" || d === "right") {
            const i = nextFree(s, d === "right" ? 1 : -1);
            if (i >= 0) choose(s, i, out);
        }
    }
    const held = new Set([...pad.holding, ...pad.pressed]);
    if (held.has("up")) s.power = Math.min(MOST, s.power + 4 * DT);
    if (held.has("down")) s.power = Math.max(LEAST, s.power - 4 * DT);
    if (pad.tapped) push(s, s.power, out);
    if (pad.brake && !s.braked) uncouple(s, out);
    s.braked = pad.brake;
}

export function stepTrain(s: TrainState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.time += DT;
    if (s.won) {
        s.away += DT;
        const engine = s.line.vehicles.find((v) => v.id === "engine");
        if (engine) engine.v = -Math.min(6, s.away * 2);
        railStep(s.line, DT, rulesOf(s), "engine");
        return out;
    }
    hands(s, pad, out);
    const before = coupled(s).length;
    const wagon = loose(s);
    const was = wagon ? Math.abs(wagon.v) : 0;
    for (const e of railStep(s.line, DT, rulesOf(s), "engine")) {
        const pan = panOf(wagon?.x ?? 25, WORLD.w / 2, WORLD.w);
        if (e.kind === "knock") {
            out.push({ cue: "bump", strength: Math.min(1, e.speed / 8), pan });
            out.push({ shake: Math.min(0.4, e.speed / 20) });
            s.note = "Too fast! It knocked the train and rolled back. Push it more gently.";
        } else if (e.kind === "stop") {
            out.push({ cue: "bump", strength: Math.min(1, e.speed / 10), pan });
        }
    }
    const train = coupled(s);
    if (train.length > before) {
        const n = train.length;
        out.push({ cue: "place", pitch: semitones((n - 1) * 2), strength: 0.8 });
        out.push({ puff: { x: hookAt(s).x, y: hookAt(s).y, n: 4 } });
        s.chosen = -1;
        if (n === s.word.sounds.length && train.join("") === s.word.word) {
            s.won = true;
            s.note = `${train.join(" - ")}: ${s.word.word}! All aboard.`;
            out.push({ cue: "win" });
        } else if (n === s.word.sounds.length) {
            s.note = `The train says ${train.join(" - ")}. Is that the picture? Uncouple a wagon to change it.`;
            out.push({ cue: "nope" });
        } else s.note = `Coupled. The train says ${train.join(" - ")}. Which sound comes next?`;
    } else if (wagon && was > 0 && !moving(s) && loose(s)) {
        const gap = (loose(s)?.x ?? 0) - LEN / 2 - (ENGINE_X + LEN / 2 + train.length * LEN);
        // a wagon that stops just short on the level creeps the last of the way and couples by itself
        const level = Math.abs(heightAt(s.banks, wagon.x) - heightAt(s.banks, hookAt(s).x)) < 0.05;
        if (gap < CREEP && level) {
            wagon.v = -1.2;
            return out;
        }
        s.note =
            gap < 2
                ? "So close. A tiny nudge will couple it."
                : heightAt(s.banks, loose(s)?.x ?? 0) < -0.2
                  ? "It stopped in the dip. Push it out, not too hard."
                  : "A little short. Push it again.";
    }
    return out;
}

/** Where a push of `power` takes the loose wagon: its middle every quarter second, until it rests or meets the train. */
export function pathOf(s: TrainState, power: number): number[] {
    const copy: TrainState = { ...s, line: structuredClone(s.line), won: false };
    const w = loose(copy);
    if (!w) return [];
    w.v = -power;
    const out: number[] = [];
    const before = coupled(copy).length;
    for (let i = 0; i < 60 * 12; i++) {
        const events = railStep(copy.line, DT, rulesOf(copy), "engine");
        if (i % 15 === 0) out.push(w.x);
        if (events.length || coupled(copy).length > before || Math.abs(w.v) < 1e-6) break;
    }
    out.push(w.x);
    return out;
}

const standing = (s: TrainState, x: number) => {
    const a = Math.atan(-gradeAt(s.banks, x)),
        y = railY(s, x);
    return { x: x + Math.sin(a) * ABOVE, y: y - Math.cos(a) * ABOVE, angle: a };
};

function trackSprites(s: TrainState): Sprite[] {
    const out: Sprite[] = [];
    const cuts = [0, ...s.banks.flatMap((b) => [b.from, b.to]), WORLD.w].sort((a, b) => a - b);
    for (let k = 0; k + 1 < cuts.length; k++) {
        const a = cuts[k] ?? 0,
            b = cuts[k + 1] ?? 0,
            bank = s.banks.find((x) => x.from === a && x.to === b);
        if (bank) {
            const up = Math.max(0, bank.rise),
                h = Math.ceil(up + Math.max(0, -bank.rise) + 4),
                lift = heightAt(s.banks, a) - (bank.shape === "ramp" ? bank.rise : 0);
            out.push({
                key: `bank${k}`,
                art: "railbank",
                params: { run: b - a, rise: bank.rise, shape: bank.shape },
                x: (a + b) / 2,
                y: BASE - lift - (0.5 + up) + h / 2,
                size: b - a,
                still: true,
                z: 1,
            });
        } else if (b - a >= 4) {
            const bank = Math.ceil(heightAt(s.banks, (a + b) / 2));
            out.push({
                key: `rail${k}`,
                art: "railway",
                params: { length: b - a, gap: 0, at: 0, bank },
                x: (a + b) / 2,
                y: railY(s, (a + b) / 2) - 0.5 + (4 + bank) / 2,
                size: b - a,
                still: true,
                z: 1,
            });
        }
    }
    return out;
}

export function trainFrame(s: TrainState): Frame {
    const train = coupled(s);
    const sprites: Sprite[] = [
        { key: "cloud1", art: "cloud", x: 30, y: 2.5, size: 5, still: true, z: 0 },
        { key: "cloud2", art: "cloud", x: 44, y: 4, size: 4, still: true, z: 0 },
        {
            key: "firs",
            art: "firs",
            x: 19,
            y: railY(s, 19) - 0.1,
            size: 7,
            stand: true,
            still: true,
            z: 0.5,
        },
        ...trackSprites(s),
        {
            key: "bufferstop",
            art: "bufferstop",
            params: { facing: -1 },
            x: 48.5,
            y: BASE - 1,
            still: true,
            z: 2,
        },
        {
            key: "picture",
            art: s.word.picture.art,
            params: s.word.picture.params,
            x: 6,
            y: 6.5,
            size: 7,
            z: 2,
        },
        {
            key: "boxes",
            art: "soundboxes",
            params: { boxes: s.word.sounds.length, filled: train, counters: false },
            x: 13 + (s.word.sounds.length * 3 + 1) / 2,
            y: 5,
            live: true,
            z: 2,
        },
    ];
    for (const v of s.line.vehicles) {
        const at = standing(s, v.x);
        sprites.push({
            key: v.id,
            art: v.id === "engine" ? "loco" : "soundwagon",
            params: v.id === "engine" ? { facing: -1 } : { sound: tileOf(v.id) },
            x: at.x,
            y: at.y,
            angle: at.angle,
            size: LEN,
            z: 3,
        });
    }
    s.line.vehicles.forEach((a, i) => {
        const b = s.line.vehicles[i + 1];
        if (!b || !s.line.hooked[i]) return;
        const x = (a.x + b.x) / 2;
        sprites.push({
            key: `hook:${a.id}:${b.id}`,
            art: "coupling",
            params: { closed: 1 },
            size: 1.2,
            x,
            y: railY(s, x) - 0.72,
            z: 4,
        });
    });
    const inUse = new Set([...train, ...(loose(s) ? [tileOf(loose(s)?.id ?? "")] : [])]);
    s.shed.forEach((tile, i) => {
        const at = shedAt(s, i);
        sprites.push({
            key: `shed:${tile}`,
            art: "soundwagon",
            params: { sound: tile },
            x: at.x,
            y: at.y,
            size: 3,
            faint: inUse.has(tile),
            z: 2,
        });
    });
    const marks: Mark[] = [
        {
            kind: "word",
            x: 50 - s.shed.length * 1.8,
            y: SHED_Y - 3,
            text: "The sounds",
            size: 0.55,
        },
        {
            kind: "word",
            x: 44,
            y: 1.2,
            text: `${s.pushes} ${s.pushes === 1 ? "push" : "pushes"}`,
            size: 0.6,
        },
    ];
    if (s.chosen >= 0 && !s.won) {
        const at = shedAt(s, s.chosen);
        marks.push({ kind: "ring", x: at.x, y: at.y, r: 1.9, on: true });
    }
    const w = loose(s);
    if (w && atRest(s)) {
        const power = s.pull !== null ? s.pull * PER : s.power;
        const at = standing(s, w.x);
        marks.push({ kind: "ring", x: at.x, y: at.y, r: 2.4, on: s.hand?.on === "wagon" });
        marks.push({
            kind: "line",
            a: { x: w.x - LEN / 2, y: at.y },
            b: { x: w.x - LEN / 2 - 0.6 - power * 0.5, y: at.y },
            style: "aim",
            head: true,
        });
        if (s.preview > 0) {
            const path = pathOf(s, power),
                shown = path.slice(0, Math.max(2, Math.ceil(path.length * s.preview)));
            marks.push({
                kind: "dots",
                pts: shown.map((x) => ({ x, y: railY(s, x) - 0.3 })),
                faint: s.preview < 1,
            });
        }
    }
    if (coupled(s).length && !s.won && !moving(s)) {
        const h = hookAt(s);
        marks.push({ kind: "ring", x: h.x, y: h.y, r: 0.8, solid: true });
    }
    return {
        sprites,
        marks,
        camera: { x: WORLD.w / 2, y: WORLD.h / 2 },
        view: { ...WORLD },
        world: { ...WORLD },
        time: s.time,
    };
}

/** The train's own sounds: a clank for a coupling, a knock of iron, a hiss to uncouple and a whistle. */
const SOUNDS: Kit = {
    place: [
        { wave: "square", hz: 190, attack: 0.002, decay: 0.07, gain: 0.35 },
        { wave: "noise", hz: 3200, attack: 0.002, decay: 0.05, gain: 0.4 },
        { wave: "sine", hz: 523, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.06 },
    ],
    bump: [
        { wave: "noise", hz: 1400, attack: 0.002, decay: 0.12, gain: 0.55 },
        { wave: "square", hz: 110, to: 70, attack: 0.002, decay: 0.15, gain: 0.3 },
    ],
    lift: [{ wave: "noise", hz: 600, attack: 0.03, decay: 0.25, gain: 0.35 }],
    back: [{ wave: "noise", hz: 4200, attack: 0.02, decay: 0.35, gain: 0.3 }],
    win: [
        { wave: "sine", hz: 880, attack: 0.05, decay: 0.5, gain: 0.35 },
        { wave: "sine", hz: 1108, attack: 0.05, decay: 0.5, gain: 0.3 },
        { wave: "sine", hz: 880, attack: 0.05, decay: 0.8, gain: 0.35, delay: 0.6 },
        { wave: "sine", hz: 1108, attack: 0.05, decay: 0.8, gain: 0.3, delay: 0.6 },
    ],
};

export const trainGame: ActionGame<TrainState> = {
    id: "spell",
    title: "Sound train",
    group: "action",
    levels: TRAIN_LEVELS,
    rate: 60,
    hint: "Pick the wagon with the next sound, then pull it back and let go. Left and right pick a wagon, up and down set the push, space pushes, and Backspace uncouples the last wagon.",
    cover: { art: "soundwagon", params: { sound: "sh" } },
    controls: {
        arrows: {
            left: "Sound before",
            right: "Next sound",
            up: "Push harder",
            down: "Push softer",
        },
        go: "Push",
        brake: "Uncouple",
    },
    touch: true,
    sounds: SOUNDS,
    plays: { activity: "spell.the-picture", levels: [0, 1, 2, 3] },
    start: (phase) => startTrain(phase),
    step: stepTrain,
    back: (s) => uncouple(s),
    cancelInput: (s) => {
        s.hand = null;
        s.pull = null;
    },
    hum: (s) => [{ kind: "engine", level: s.won ? 0.8 : 0.25, pitch: s.won ? 1.6 : 1 }],
    say: (s) => {
        const train = coupled(s),
            w = loose(s);
        const has = train.length
            ? `The train has ${train.map((t) => `"${t}"`).join(", ")}`
            : "The train has no wagons yet";
        const wagon = w
            ? ` The "${tileOf(w.id)}" wagon is ${moving(s) ? "rolling" : `${Math.max(0, w.x - LEN / 2 - (ENGINE_X + LEN / 2 + train.length * LEN)).toFixed(0)} squares from the train`}.`
            : "";
        return `The picture is a ${s.word.word}, ${s.word.sounds.length} sounds. ${has}.${wagon} The push is ${Math.round((s.power / MOST) * 100)}% strong.`;
    },
    note: (s) => s.note,
    won: (s) => s.won,
    objectives: (s) => {
        const train = coupled(s);
        let right = 0;
        while (right < train.length && train[right] === s.word.sounds[right]) right++;
        return { completed: right, total: s.word.sounds.length };
    },
    frame: trainFrame,
    still: { press: () => 1, settling: (s) => moving(s) },
};
