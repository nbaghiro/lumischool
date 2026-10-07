import { projectPoint, projectMark, type Projection } from "../../engine/motion/presentation";
import { currentAt, driftStep, type Current, type Drifter } from "../../engine/motion/current";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel } from "./game";

interface BoatLevel extends ActionLevel {
    count: number;
    bend: number;
    rocks: number;
    preview: number;
}
export const PAPER_BOAT_LEVELS: BoatLevel[] = [
    {
        title: "The little stream",
        grades: [1, 1],
        goal: "Beat the plain boat through gates 1, 2 and 3.",
        count: 1,
        bend: 0.15,
        rocks: 0,
        preview: 90,
    },
    {
        title: "Round the rocks",
        grades: [1, 2],
        goal: "Race through gates 2, 4 and 6.",
        count: 2,
        bend: 0.3,
        rocks: 1,
        preview: 75,
    },
    {
        title: "The willow bend",
        grades: [2, 2],
        goal: "Race through gates 5, 10 and 15.",
        count: 5,
        bend: 0.5,
        rocks: 2,
        preview: 60,
    },
    {
        title: "The mill race",
        grades: [2, 3],
        goal: "Race through gates 10, 20 and 30.",
        count: 10,
        bend: 0.65,
        rocks: 2,
        preview: 100,
    },
    {
        title: "Count in halves",
        grades: [3, 4],
        goal: "Race through gates 0.5, 1 and 1.5.",
        count: 0.5,
        bend: 0.45,
        rocks: 3,
        preview: 50,
    },
    {
        title: "The wild brook",
        grades: [3, 4],
        goal: "Read the currents and race through gates 3, 6 and 9.",
        count: 3,
        bend: 0.7,
        rocks: 3,
        preview: 0,
    },
];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const GATES = [6, 11, 16];
export interface PaperBoatState {
    phase: number;
    variant: number;
    reach: number;
    y: number;
    push: number;
    side: number;
    boat: Drifter | null;
    rival: Drifter | null;
    time: number;
    age: number;
    wind: number;
    dragging: Pt | null;
    trail: Pt[];
    last: Pt[];
    note: string;
    won: boolean;
}
const level = (s: PaperBoatState): BoatLevel =>
    PAPER_BOAT_LEVELS[s.phase] ??
    PAPER_BOAT_LEVELS[0] ?? {
        title: "Stream",
        grades: [1, 1],
        goal: "Race",
        count: 1,
        bend: 0,
        rocks: 0,
        preview: 90,
    };
export function paperBoatRiver(s: PaperBoatState): Current {
    const l = level(s);
    return {
        speed: 3.5,
        bend: l.bend,
        phase: s.variant * 1.7 + s.reach * 1.1,
        top: 4,
        bottom: 18,
        rocks: Array.from({ length: l.rocks }, (_, i) => ({
            x: 10 + i * 5,
            y: 8.5 + ((s.variant + s.reach + i) % 2) * 5,
            r: 0.85,
        })),
    };
}
export function paperBoatTarget(s: PaperBoatState): number {
    return (s.reach + s.variant) % 3;
}
export function startPaperBoat(phase: number, variant = 0): PaperBoatState {
    return {
        phase: PAPER_BOAT_LEVELS[phase] ? phase : 0,
        variant: ((variant % 3) + 3) % 3,
        reach: 0,
        y: 11,
        push: 3,
        side: 0,
        boat: null,
        rival: null,
        time: 0,
        age: 0,
        wind: 1.5,
        dragging: null,
        trail: [],
        last: [],
        note: "Choose a place on the left bank. Drag right and lift to launch.",
        won: false,
    };
}
function launch(s: PaperBoatState): void {
    s.boat = { x: 3, y: s.y, vx: 3.5 + s.push, vy: s.side };
    s.rival = { x: 3, y: 11, vx: 8.5, vy: 0 };
    s.wind = 1.5;
    s.age = 0;
    s.trail = [];
    s.dragging = null;
    s.note =
        "Steer with up/down or drag on the water. Hold Blow for a short boost. Reach the numbered gate first.";
}
export function paperBoatPreview(s: PaperBoatState, steps = level(s).preview): Pt[] {
    const b: Drifter = { x: 3, y: s.y, vx: 3.5 + s.push, vy: s.side },
        c = paperBoatRiver(s),
        pts: Pt[] = [{ x: b.x, y: b.y }];
    for (let i = 0; i < steps && b.x < 26; i++) {
        driftStep(b, c, s.time + (i + 2) / 60, 1 / 60);
        if (i % 12 === 0 || b.x >= 26) pts.push({ x: b.x, y: b.y });
    }
    return pts;
}
export function stepPaperBoat(s: PaperBoatState, p: Pad): Happening[] {
    if (s.won) return [];
    s.time += 1 / 60;
    if (p.brake) {
        s.boat = null;
        s.rival = null;
        s.dragging = null;
        s.note = "Back to the bank. The gates already reached stay reached.";
        return [];
    }
    if (!s.boat) {
        if (p.holding.length) s.side = 0;
        s.y = clamp(
            s.y +
                ((p.holding.includes("down") ? 1 : 0) - (p.holding.includes("up") ? 1 : 0)) * 0.09,
            4.3,
            17.7,
        );
        s.push = clamp(
            s.push +
                ((p.holding.includes("right") ? 1 : 0) - (p.holding.includes("left") ? 1 : 0)) *
                    0.04,
            0.5,
            5,
        );
        if (p.touch) {
            if (!s.dragging) {
                s.dragging = { ...p.touch };
                s.y = clamp(p.touch.y, 4.3, 17.7);
            }
            s.push = clamp(p.touch.x - s.dragging.x, 0.5, 5);
            s.side = clamp((p.touch.y - s.dragging.y) * 0.8, -3, 3);
        }
        if (p.lifted && s.dragging) {
            s.push = clamp(p.lifted.x - s.dragging.x, 0.5, 5);
            s.side = clamp((p.lifted.y - s.dragging.y) * 0.8, -3, 3);
            launch(s);
            return [{ cue: "lift" }];
        }
        if (p.tapped) {
            launch(s);
            return [{ cue: "lift" }];
        }
        return [];
    }
    s.age += 1 / 60;
    const c = paperBoatRiver(s);
    const steer = p.touch
        ? clamp((p.touch.y - s.boat.y) * 1.8 - s.boat.vy, -1, 1)
        : (p.holding.includes("down") ? 1 : 0) - (p.holding.includes("up") ? 1 : 0);
    s.boat.vy = clamp(s.boat.vy + (steer * 5) / 60, -3.5, 3.5);
    if (p.go && s.wind > 0) {
        s.boat.vx = Math.min(10, s.boat.vx + 6 / 60);
        s.wind = Math.max(0, s.wind - 1 / 60);
    }
    const hit = driftStep(s.boat, c, s.time, 1 / 60);
    if (hit) s.boat.vx *= 0.92;
    if (s.rival) {
        const gate = GATES[paperBoatTarget(s)] ?? 6;
        const aim = s.rival.x < 13 ? 11 : gate;
        const turn = clamp((aim - s.rival.y) * 1.8 - s.rival.vy, -1, 1);
        s.rival.vy = clamp(s.rival.vy + (turn * 5) / 60, -3.5, 3.5);
        driftStep(s.rival, c, s.time, 1 / 60);
    }
    if (Math.round(s.age * 60) % 10 === 0) s.trail.push({ x: s.boat.x, y: s.boat.y });
    if (s.boat.x >= 26 || s.age >= 12 || (s.rival?.x ?? 0) >= 26) {
        const gate = GATES[paperBoatTarget(s)] ?? 6,
            success = s.boat.x >= 26 && Math.abs(s.boat.y - gate) < 1.75 && (s.rival?.x ?? 0) < 26;
        const lostRace = (s.rival?.x ?? 0) >= 26 && s.boat.x < 26;
        s.last = s.trail;
        s.boat = null;
        s.rival = null;
        if (success) {
            s.reach++;
            s.won = s.reach === 3;
            s.note = s.won
                ? "Three river races won. Your paper boat reached every gate first."
                : "First through the gate. The next reach has a different current.";
            s.last = [];
            s.side = 0;
            return [{ cue: s.won ? "win" : "place" }];
        }
        s.note = lostRace
            ? "The plain boat finished first. Try the faster middle current and save some wind for the finish."
            : "You missed the numbered gate. Steer towards it before the finish. Try again!";
        return [{ cue: "back" }];
    }
    return hit ? [{ cue: "bump", strength: 0.15 }] : [];
}
function boatFrame(s: PaperBoatState, _rest?: boolean, room?: { w: number; h: number }): Frame {
    const l = level(s),
        c = paperBoatRiver(s),
        target = paperBoatTarget(s),
        marks: Mark[] = [
            {
                kind: "word",
                x: 8,
                y: 1.7,
                text: `Gate ${(s.reach + 1) * l.count}`,
                size: 1.1,
            },
            { kind: "word", x: 22, y: 1.7, text: `${s.reach} / 3 races`, size: 0.8 },
            { kind: "line", a: { x: 3, y: 4 }, b: { x: 3, y: 18 }, style: "aim" },
        ],
        sprites: Sprite[] = [
            {
                key: "river",
                art: "riverreach",
                params: {
                    w: 30,
                    h: 30,
                    points: [0, 15, 4, 14.7, 9, 15.3, 14, 14.8, 19, 15.2, 24, 14.8, 30, 15],
                    halves: [8.5, 8, 8.5, 8, 8.4, 8.1, 8.5],
                    rapids: [0, 0, 0, 0, 0, 0, 0],
                },
                x: 15,
                y: 11,
                size: 30,
                z: -4,
            },
            {
                key: "hill",
                art: "parkhill",
                params: { w: 24, h: 3, snow: 0 },
                x: 16,
                y: -2.8,
                size: 24,
                z: -2,
            },
            { key: "bunting", art: "strokes.bunting", x: 16, y: -1.8, size: 13, z: 1 },
            {
                key: "upstream-tree",
                art: "tree",
                params: { fruit: 0, fallen: 0 },
                x: 2.3,
                y: -0.8,
                size: 5,
                z: 0,
            },
            {
                key: "downstream-landmark",
                art: s.phase === 3 ? "waterwheel" : "tree",
                params: s.phase === 3 ? { paddles: 8, lit: 0 } : { fruit: 4, fallen: 0 },
                x: 27.8,
                y: -1,
                size: 4.5,
                z: 0,
            },
            {
                key: "kingfisher",
                art: "kingfisher",
                params: { flying: 0, facing: 1 },
                x: 4.5,
                y: 2,
                size: 2,
                z: 2,
            },
            {
                key: "picnic",
                art: "picnicrug",
                params: { w: 6, colour: "berry" },
                x: 9,
                y: 24.5,
                size: 6,
                z: 0,
            },
            {
                key: "charlie",
                art: "charlie",
                params: {
                    pose: s.won ? "cheer" : s.boat ? "wave" : "sit",
                    mood: "happy",
                    dir: 1,
                    feet: "wellies",
                },
                x: 7,
                y: 24.7,
                size: 2.8,
                stand: true,
                z: 2,
            },
            {
                key: "spare-boat",
                art: "paperboat",
                params: { stripe: false },
                x: 10.6,
                y: 24.1,
                size: 1.5,
                angle: -0.2,
                z: 2,
            },
            { key: "duck", art: "svg.duck", x: 19, y: 22.8, size: 2.6, z: 1 },
            { key: "duckling", art: "svg.duck", x: 21.5, y: 23.4, size: 1.5, z: 1 },
            { key: "near-bank", art: "parkbush", params: { w: 4 }, x: 27.3, y: 24, size: 4, z: 0 },
            {
                key: "dragonfly",
                art: "dragonfly",
                params: { facing: -1, rings: 6 },
                x: 15 + Math.sin(s.time * 0.45) * 0.7,
                y: 21.8 + Math.sin(s.time * 0.7) * 0.15,
                size: 1.8,
                z: 2,
            },
        ];
    for (const [i, x] of [1, 10, 19, 29].entries()) {
        sprites.push({
            key: `reeds:${i}`,
            art: "reeds",
            params: { stems: 7, lean: i % 2 ? -0.2 : 0.2 },
            x,
            y: i % 2 ? 19.1 : 2.4,
            size: 2.2,
            z: 1,
        });
    }
    for (const [i, x] of [2, 14, 24].entries()) {
        sprites.push({
            key: `flowers:${i}`,
            art: "flowers",
            params: { count: 3, petals: 5 },
            x,
            y: 24.8,
            size: 2.7,
            z: 1,
        });
    }
    for (let i = 0; i < 3; i++) {
        const y = GATES[i] ?? 6,
            number = (s.reach + 1) * l.count + ((i - target + 3) % 3) * l.count;
        for (const side of [-1, 1])
            sprites.push({
                key: `gate:${i}:${side}`,
                art: "mooringbuoy",
                params: { n: "" },
                x: 26,
                y: y + side * 1.85,
                size: 1.15,
                z: 2,
            });
        marks.push({
            kind: "line",
            a: { x: 26, y: y - 1.3 },
            b: { x: 26, y: y + 1.3 },
            style: "aim",
        });
        marks.push({ kind: "word", x: 28, y: y + 0.2, text: `${number}`, size: 0.85 });
    }
    for (const x of [8, 15, 22])
        for (const y of [6.5, 11, 15.5]) {
            const flow = currentAt(c, { x, y }, s.time);
            marks.push({
                kind: "line",
                a: { x, y },
                b: { x: x + flow.x * 0.4, y: y + flow.y * 0.7 },
                style: "thin",
                head: true,
            });
        }
    c.rocks.forEach((r, i) =>
        sprites.push({
            key: `rock:${i}`,
            art: "bigrock",
            params: { moss: true },
            x: r.x,
            y: r.y,
            size: r.r * 2.3,
            z: 2,
        }),
    );
    marks.push({ kind: "line", a: { x: 3, y: 19.4 }, b: { x: 26, y: 19.4 }, style: "thin" });
    for (const m of [0, 5, 10]) {
        const x = 3 + m * 2.3;
        marks.push({ kind: "line", a: { x, y: 19.1 }, b: { x, y: 19.7 }, style: "thin" });
        marks.push({ kind: "word", x, y: 20.3, text: `${m} m`, size: 0.5 });
    }
    const b = s.boat ?? { x: 3, y: s.y, vx: 1, vy: 0 };
    sprites.push({
        key: "boat",
        art: "paperboat",
        params: { stripe: true },
        x: b.x,
        y: b.y,
        size: 2.7,
        angle: Math.atan2(b.vy, b.vx) * 0.3,
        z: 4,
    });
    if (s.rival)
        sprites.push({
            key: "rival",
            art: "paperboat",
            params: { stripe: false },
            x: s.rival.x,
            y: s.rival.y,
            size: 2.3,
            z: 3,
        });
    if (!s.boat && !s.won) {
        if (l.preview > 0) marks.push({ kind: "dots", pts: paperBoatPreview(s), faint: true });
        marks.push({
            kind: "line",
            a: { x: 3, y: s.y },
            b: { x: 3 + s.push, y: s.y + s.side },
            head: true,
        });
    }
    marks.push({
        kind: "word",
        x: 15,
        y: 3,
        size: 0.55,
        phone: s.boat ? `Wind ${Math.round((s.wind / 1.5) * 100)}%` : "Steer · Hold Blow to boost",
        text: s.boat
            ? `${s.boat.x >= (s.rival?.x ?? 0) ? "Leading" : "Chasing"} · Wind ${Math.round((s.wind / 1.5) * 100)}%`
            : `Push ${Math.round((s.push / 5) * 100)}% · Steer during the race · Hold Blow for wind`,
    });
    if (s.boat && s.trail.length) marks.push({ kind: "dots", pts: s.trail, opacity: 0.2 });
    if (s.last.length) marks.push({ kind: "dots", pts: s.last, opacity: 0.3 });
    const spread = room && room.w > room.h ? Math.max(1, ((room.w / room.h) * 32) / 30) : 1;
    const projection: Projection = { a: spread, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const river = sprites.find((sprite) => sprite.key === "river");
    const placed = sprites
        .filter((sprite) => sprite.key !== "river")
        .map((sprite) => ({ ...sprite, ...projectPoint(sprite, projection) }));
    if (river)
        for (let x = 0; x < 30 * spread; x += 30) {
            const w = Math.min(30, 30 * spread - x);
            placed.unshift({
                ...river,
                key: `river:${x}`,
                x: x + w / 2,
                size: w,
                crop: { x: 0, y: 0, w, h: 30 },
            });
        }
    return {
        projection,
        sprites: placed,
        marks: marks.map((mark) => projectMark(mark, projection)),
        camera: { x: 15 * spread, y: 11 },
        view: { w: 30 * spread, h: 32 },
        world: { w: 30 * spread, h: 22 },
        focus: { x: 15 * spread, y: 11 },
        time: s.time,
    };
}
export const paperBoatGame: ActionGame<PaperBoatState> = {
    id: "paperboat",
    title: "Paper boat race",
    group: "action",
    levels: PAPER_BOAT_LEVELS,
    rate: 60,
    cover: { art: "paperboat" },
    card: null,
    seen: "above",
    portrait: { keep: 30 },
    quiet: true,
    touch: true,
    wasd: true,
    hint: "Drag right to launch, then drag on the water to steer. With keys, up/down steer, left/right set launch power, and Space launches. During the race hold Space or Blow for a limited wind boost. Beat the plain boat through the numbered gate; rocks slow you down.",
    goLabel: (s) => (s.boat ? "Blow" : "Launch boat"),
    controls: {
        arrows: {
            up: "Move or steer up",
            down: "Move or steer down",
            left: "Gentler push",
            right: "Stronger push",
        },
        go: "Launch boat",
        brake: "Back to bank",
    },
    start: (phase, seed = 0) => startPaperBoat(phase, (seed >>> 0) % 3),
    step: stepPaperBoat,
    frame: boatFrame,
    won: (s) => s.won,
    note: (s) => s.note,
    say: (s) =>
        `${level(s).goal} ${s.reach} races won. Wind ${Math.round((s.wind / 1.5) * 100)}%. ${s.boat ? (s.boat.x >= (s.rival?.x ?? 0) ? "Leading." : "Chasing.") : "At the bank."} Release point ${s.y.toFixed(1)}, push ${s.push.toFixed(1)}. ${s.note}`,
    objectives: (s) => ({ completed: s.reach, total: 3 }),
    cancelInput: (s) => {
        s.dragging = null;
    },
    still: { press: () => 12 },
};
