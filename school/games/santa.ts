import { crossingAt, stepParcel, type Parcel } from "../../engine/motion/airdrop";
import type { Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export const SANTA_RATE = 60;
const DT = 1 / 240;
const GRAVITY = 12;
const GROUND = 30;

interface House {
    x: number;
    floors: number;
    number: number;
    want: number;
}

export interface SantaLevel extends ActionLevel {
    wind: number;
    speed: number;
    preview: number;
    houses: House[];
}

const houses = (wants: number[], tall = false, numbers?: number[]): House[] =>
    wants.map((want, i) => ({
        x: 20 + i * 15,
        floors: tall ? 1 + (i % 3) : 1,
        number: numbers?.[i] ?? i + 1,
        want,
    }));

export const SANTA_LEVELS: Levels<SantaLevel> = [
    {
        title: "The first chimneys",
        goal: "Deliver one present to each house.",
        grades: [1, 1],
        wind: 0,
        speed: 5,
        preview: 2,
        houses: houses([1, 1, 1]),
    },
    {
        title: "Three by the tree",
        goal: "Deliver three presents to each house.",
        grades: [1, 2],
        wind: 0.8,
        speed: 5.5,
        preview: 1.6,
        houses: houses([3, 3, 3]),
    },
    {
        title: "The windy village",
        goal: "Deliver two presents to each house. Watch the wind.",
        grades: [1, 2],
        wind: 3,
        speed: 6,
        preview: 1,
        houses: houses([2, 2, 2, 2]),
    },
    {
        title: "Even-numbered doors",
        goal: "Deliver two presents to the even-numbered houses only.",
        grades: [2, 3],
        wind: 1.5,
        speed: 6,
        preview: 0.6,
        houses: houses([0, 2, 0, 2, 0, 2]),
    },
    {
        title: "Above the tall roofs",
        goal: "Deliver one, then two, then three, then four presents.",
        grades: [2, 3],
        wind: 2,
        speed: 6,
        preview: 0.35,
        houses: houses([1, 2, 3, 4], true),
    },
    {
        title: "Two more next door",
        goal: "Start with two presents. Each next house needs two more.",
        grades: [2, 3],
        wind: 2.5,
        speed: 6.5,
        preview: 0,
        houses: houses([2, 4, 6], true),
    },
    {
        title: "A sack of twenty",
        goal: "Share twenty presents equally among the five houses.",
        grades: [3, 4],
        wind: 3,
        speed: 6.5,
        preview: 0,
        houses: houses([4, 4, 4, 4, 4], true),
    },
];

interface Gift extends Parcel {
    id: number;
    age: number;
    bounced: boolean;
    returning: boolean;
}

export interface SantaState {
    L: SantaLevel;
    phase: number;
    variant: number;
    steps: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    direction: number;
    gifts: Gift[];
    got: number[];
    cooldown: number;
    serial: number;
    won: boolean;
    note: string;
    touchStart: boolean;
    flash: number;
}

export const chimneyY = (h: House): number => GROUND - (8 + h.floors * 2) + 1;
const width = (s: SantaState): number => (s.L.houses.at(-1)?.x ?? 50) + 20;
const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
export const windAt = (s: SantaState, time: number): number =>
    s.L.wind * (0.7 + 0.6 * Math.sin(time * 0.65 + s.variant * 1.7));

export function startSanta(phase: number, variant = 0): SantaState {
    const base = SANTA_LEVELS[phase] ?? SANTA_LEVELS[0];
    const v = ((variant % 3) + 3) % 3;
    const L = {
        ...base,
        houses: base.houses.map((h, i) => ({
            ...h,
            x: h.x + (v === 1 ? (i % 2) * 3 : v === 2 ? 2 : 0),
            floors: v === 2 ? Math.min(3, h.floors + 1) : h.floors,
        })),
    };
    return {
        L,
        phase,
        variant: v,
        steps: 0,
        x: 7,
        y: 9,
        vx: L.speed,
        vy: 0,
        direction: 1,
        gifts: [],
        got: L.houses.map(() => 0),
        cooldown: 0,
        serial: 0,
        won: false,
        note: "Drag in the sky to fly. Lift your finger to drop a present.",
        touchStart: false,
        flash: 0,
    };
}

export function launchOf(s: SantaState): Parcel {
    return { x: s.x - s.direction * 2, y: s.y + 0.9, vx: s.vx, vy: s.vy * 0.3 + 0.6 };
}

/** A chimney crossing is found before the lower roof, even when both are crossed in one step. */
function chimneyHit(s: SantaState, from: Pt, to: Pt): number {
    return s.L.houses.findIndex((h) => {
        const x = crossingAt(from, to, chimneyY(h));
        return x !== null && Math.abs(x - h.x) <= 1.05;
    });
}

export function santaPreview(s: SantaState, seconds = 3): { points: Pt[]; house: number } {
    const p = launchOf(s),
        points: Pt[] = [];
    for (let i = 0; i < seconds / DT; i++) {
        const from = { x: p.x, y: p.y };
        stepParcel(p, windAt(s, s.steps / SANTA_RATE + i * DT), GRAVITY, DT);
        const house = chimneyHit(s, from, p);
        if (i % 12 === 0) points.push({ x: p.x, y: p.y });
        if (house >= 0) return { points, house };
        if (p.y >= GROUND || roofHit(s, from, p) !== null) break;
    }
    return { points, house: -1 };
}

function roofHit(s: SantaState, from: Pt, to: Pt): House | null {
    for (const h of s.L.houses) {
        const roof = (x: number) => chimneyY(h) + 1.5 + Math.abs(x - h.x) * 0.7;
        if (Math.abs(to.x - h.x) < 3.8 && from.y <= roof(from.x) && to.y >= roof(to.x)) return h;
    }
    return null;
}

export function stepSanta(s: SantaState, pad: Pad): Happening[] {
    if (s.won) return [];
    const events: Happening[] = [];
    s.cooldown = Math.max(0, s.cooldown - 1 / SANTA_RATE);
    s.flash = Math.max(0, s.flash - 1 / SANTA_RATE);
    const held = (d: "left" | "right" | "up" | "down") => pad.holding.includes(d) || pad.held === d;
    if (held("left")) s.direction = -1;
    if (held("right")) s.direction = 1;
    if (s.x < 6) s.direction = 1;
    if (s.x > width(s) - 6) s.direction = -1;
    if (pad.touch) s.touchStart = true;
    const drop = pad.tapped || (pad.lifted !== null && s.touchStart);
    if (pad.lifted) s.touchStart = false;
    if (drop && s.cooldown === 0 && s.gifts.filter((g) => !g.returning).length < 5) {
        s.gifts.push({ ...launchOf(s), id: s.serial++, age: 0, bounced: false, returning: false });
        s.cooldown = 0.4;
        events.push({ cue: "lift" });
    }
    for (let sub = 0; sub < 4; sub++) {
        const targetV = pad.touch
            ? clamp((pad.touch.y - s.y) * 3, -7, 7)
            : (held("down") ? 6 : 0) - (held("up") ? 6 : 0);
        s.vy += (targetV - s.vy) * 7 * DT;
        s.vx += (s.direction * s.L.speed - s.vx) * 3 * DT;
        s.x = clamp(s.x + s.vx * DT, 3, width(s) - 3);
        s.y = clamp(s.y + s.vy * DT, 4, 13);
        if (s.y === 4 || s.y === 13) s.vy = 0;
        const time = s.steps / SANTA_RATE + sub * DT;
        for (const g of s.gifts) {
            g.age += DT;
            if (g.returning) {
                g.x += (s.x - s.direction * 2 - g.x) * Math.min(1, DT * 5);
                g.y += (s.y - g.y) * Math.min(1, DT * 5);
                continue;
            }
            const from = { x: g.x, y: g.y };
            stepParcel(g, windAt(s, time), GRAVITY, DT);
            const hit = g.bounced ? -1 : chimneyHit(s, from, g);
            const h = s.L.houses[hit];
            if (h) {
                const got = s.got[hit] ?? 0;
                if (got < h.want) {
                    s.got[hit] = got + 1;
                    s.note = `House ${h.number}: ${got + 1} of ${h.want}.`;
                    events.push(
                        { cue: "ring" },
                        { burst: { kind: "sparkle", x: h.x, y: chimneyY(h), n: 8 } },
                    );
                    g.age = 100;
                    s.flash = 0.5;
                } else {
                    s.note =
                        h.want === 0
                            ? `House ${h.number} is not on this delivery route. Back to the sack!`
                            : `House ${h.number} has enough. Back to the sack!`;
                    g.returning = true;
                    g.age = 0;
                    events.push({ cue: "back" });
                }
            } else {
                const roof = g.bounced ? null : roofHit(s, from, g);
                if (roof) {
                    g.bounced = true;
                    g.vy = -Math.abs(g.vy) * 0.22;
                    g.vx = (g.x < roof.x ? -1 : 1) * 4;
                    events.push({ cue: "bump" });
                }
                if (g.y > GROUND - 0.4 || g.x < 0 || g.x > width(s)) {
                    g.returning = true;
                    g.age = 0;
                    s.note = "Back to the sack. Try another drop.";
                    events.push({ cue: "back" });
                }
            }
        }
        s.gifts = s.gifts.filter((g) => g.age < (g.returning ? 1.1 : 9));
    }
    s.steps++;
    s.won = s.L.houses.every((h, i) => s.got[i] === h.want);
    if (s.won) {
        s.note = "Every present delivered. Merry Christmas!";
        events.push({ cue: "win" });
    }
    return events;
}

export function santaFrame(s: SantaState, rest = false, room?: { w: number; h: number }): Frame {
    const W = width(s),
        visibleWidth = room
            ? room.w / Math.max(6, Math.floor(Math.min(room.w / 40, room.h / 30)))
            : 40,
        cameraX = visibleWidth >= W ? W / 2 : clamp(s.x + s.direction * 7, 20, W - 20);
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (let i = 0; i < Math.ceil(W / 15); i++) {
        sprites.push({
            key: `fir:${i}`,
            art: "firs",
            params: { count: 1, snow: 1 },
            x: 7 + i * 15,
            y: GROUND,
            size: 5 + (i % 3),
            stand: true,
            still: true,
            z: -2,
        });
        sprites.push({
            key: `cloud:${i}`,
            art: "cloud",
            x: 12 + i * 18,
            y: 4 + (i % 3),
            size: 6,
            faint: true,
            still: true,
            z: -3,
        });
    }
    s.L.houses.forEach((h, i) => {
        const height = 8 + h.floors * 2,
            got = s.got[i] ?? 0;
        sprites.push({
            key: `house:${i}`,
            art: "snowhouse",
            params: { floors: h.floors, lit: got === h.want && h.want > 0 },
            x: h.x,
            y: GROUND - height / 2,
            size: 8,
            z: 0,
        });
        marks.push({ kind: "word", x: h.x, y: GROUND - 0.8, text: String(h.number), size: 0.75 });
        marks.push({
            kind: "word",
            x: h.x,
            y: chimneyY(h) - 1.3,
            text: h.want === 0 ? "Pass" : got === h.want ? "Delivered!" : `${got} / ${h.want}`,
            size: 0.7,
        });
    });
    marks.push({ kind: "line", a: { x: 0, y: GROUND }, b: { x: W, y: GROUND }, style: "thin" });
    const wind = windAt(s, s.steps / SANTA_RATE);
    marks.push({
        kind: "word",
        x: 6,
        y: 2,
        text: Math.abs(wind) < 0.2 ? "Calm sky" : `Wind ${wind > 0 ? "→" : "←"}`,
        size: 0.65,
        fixed: true,
    });
    const got = s.got.reduce((a, b) => a + b, 0),
        total = s.L.houses.reduce((a, h) => a + h.want, 0);
    marks.push({
        kind: "word",
        x: 32,
        y: 2,
        text: `${got} / ${total} delivered`,
        phone: `${got} / ${total}`,
        size: 0.65,
        fixed: true,
    });
    if (!s.won && s.L.preview > 0) {
        const preview = santaPreview(s, s.L.preview);
        const target = s.L.houses[preview.house];
        marks.push({
            kind: "dots",
            pts: preview.points,
            ...(target && (s.got[preview.house] ?? 0) < target.want ? { tone: "ok" } : {}),
        });
    }
    for (const g of s.gifts)
        sprites.push({
            key: `gift:${g.id}`,
            art: "christmasgift",
            params: { ribbon: g.id % 2 === 0 },
            x: g.x,
            y: g.y,
            size: 1.25,
            angle: rest ? 0 : g.age * (g.returning ? -5 : 2),
            z: 3,
            faint: g.returning,
        });
    sprites.push({
        key: "sleigh",
        art: "santasleigh",
        params: { stride: rest ? 0 : Math.floor(s.steps / 10) % 4, wave: s.won },
        x: s.x,
        y: s.y,
        size: 8,
        flip: s.direction < 0,
        angle: rest ? 0 : s.vy * 0.025,
        z: 4,
    });
    return {
        sprites,
        marks,
        camera: { x: cameraX, y: 15 },
        view: { w: 40, h: 30 },
        world: { w: W, h: 32 },
        focus: { x: s.x + s.direction * 4, y: 15 },
        chase: true,
        time: s.steps / SANTA_RATE,
    };
}

export const santaGame: ActionGame<SantaState> = {
    id: "santa",
    title: "Santa's sleigh run",
    group: "action",
    levels: SANTA_LEVELS,
    rate: SANTA_RATE,
    cover: { art: "santasleigh" },
    card: null,
    portrait: { keep: 26 },
    quiet: true,
    touch: true,
    wasd: true,
    hint: "Drag in the sky to set your height, then lift to drop a present. Arrows fly and turn; Space drops. Missed presents return to the sack.",
    controls: {
        arrows: { up: "Climb", down: "Descend", left: "Fly left", right: "Fly right" },
        go: "Drop present",
    },
    start: (phase, seed = 0) => startSanta(phase, (seed >>> 0) % 3),
    step: stepSanta,
    frame: santaFrame,
    won: (s) => s.won,
    note: (s) => s.note,
    say: (s) =>
        `${s.L.goal} Santa is ${Math.round(GROUND - s.y)} squares above the snow, flying ${s.vx >= 0 ? "right" : "left"}. ${s.L.houses.map((h, i) => `House ${h.number}: ${s.got[i] ?? 0} of ${h.want}`).join(". ")}.`,
    objectives: (s) => ({
        completed: s.got.reduce((a, b) => a + b, 0),
        total: s.L.houses.reduce((a, h) => a + h.want, 0),
    }),
    cancelInput: (s) => {
        s.touchStart = false;
    },
    still: { press: () => 15, settling: (s) => s.gifts.length > 0 && !s.won },
};
