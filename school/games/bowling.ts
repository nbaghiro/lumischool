import { projectPoint, projectMark, type Projection } from "../../engine/motion/presentation";
import { aimOfPull, launchOf, stepAim, type Aim, type AimSpec } from "../../engine/motion/aim";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import {
    skittlesMoving,
    stepSkittles,
    type SkittleBody,
    type SkittleLane,
} from "../../engine/motion/skittles";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

interface PinPlace extends Pt {
    value: number;
}
interface BowlingLevel extends ActionLevel {
    pins: PinPlace[];
    target: number;
    bumpers: boolean;
    hook: number;
    preview: number;
}

export const BOWLING_THROW: AimSpec = {
    min: 7,
    max: 19,
    per: 3.5,
    dead: 0.35,
    lo: -Math.PI / 2 - 0.37,
    hi: -Math.PI / 2 + 0.37,
    turn: 0.22,
    ramp: 5,
    turns: "across",
};
export const BOWLING_START = { x: 9, y: 25 };
export const BOWLING_LEVELS: Levels<BowlingLevel> = [
    {
        title: "Garden skittles",
        grades: [1, 2],
        goal: "Knock down all three pins with two bowls.",
        target: 3,
        pins: [
            { x: 6, y: 8, value: 1 },
            { x: 6, y: 6.6, value: 1 },
            { x: 12, y: 8, value: 1 },
        ],
        bumpers: true,
        hook: 0.7,
        preview: 2,
    },
    {
        title: "The village alley",
        grades: [1, 2],
        goal: "Knock down ten pins. The second bowl takes what is left.",
        target: 10,
        pins: Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: row + 1 }, (_, col) => ({
                x: 9 + (col - row / 2) * 1.2,
                y: 9 - row * 1.15,
                value: 1,
            })),
        ).flat(),
        bumpers: true,
        hook: 0.9,
        preview: 1.5,
    },
    {
        title: "Six on the board",
        grades: [1, 3],
        goal: "Make exactly 6 from the numbers on fallen pins.",
        target: 6,
        pins: [
            { x: 5.4, y: 8, value: 1 },
            { x: 8, y: 7, value: 2 },
            { x: 10.5, y: 8, value: 3 },
            { x: 12.5, y: 6, value: 4 },
        ],
        bumpers: true,
        hook: 1,
        preview: 1.1,
    },
    {
        title: "Ten at the fair",
        grades: [2, 3],
        goal: "Make exactly 10 with at most two bowls.",
        target: 10,
        pins: [
            { x: 5.5, y: 8, value: 2 },
            { x: 8, y: 7, value: 3 },
            { x: 10.5, y: 8, value: 5 },
            { x: 12.5, y: 6, value: 7 },
        ],
        bumpers: false,
        hook: 1.1,
        preview: 0.8,
    },
    {
        title: "Twenties in the hall",
        grades: [2, 4],
        goal: "Make exactly 20. A five and a ten leave a five to find.",
        target: 20,
        pins: [
            { x: 5.5, y: 8, value: 5 },
            { x: 8, y: 6, value: 5 },
            { x: 10.5, y: 8, value: 10 },
            { x: 12.5, y: 6, value: 10 },
        ],
        bumpers: false,
        hook: 1.3,
        preview: 0.5,
    },
    {
        title: "The lantern final",
        grades: [3, 4],
        goal: "Make exactly 15. Choose a line for the pins you need.",
        target: 15,
        pins: [
            { x: 5, y: 8, value: 2 },
            { x: 7, y: 6, value: 3 },
            { x: 9, y: 8, value: 5 },
            { x: 11, y: 6, value: 7 },
            { x: 13, y: 8, value: 8 },
        ],
        bumpers: false,
        hook: 1.5,
        preview: 0,
    },
];

export interface BowlingState {
    phase: number;
    variant: number;
    L: BowlingLevel;
    bodies: SkittleBody[];
    aim: Aim;
    spin: number;
    mode: "aim" | "roll" | "retry" | "won";
    bowls: number;
    total: number;
    counted: number[];
    note: string;
    down: Pt | null;
    hand: Pt | null;
    wait: number;
    steps: number;
    brakeWas: boolean;
    trail: Pt[];
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const bowlingLaneOf = (s: BowlingState): SkittleLane => ({
    left: 3,
    right: 15,
    top: 2,
    bottom: 25,
    grip: 1.2,
    hook: s.L.hook,
    bumpers: s.L.bumpers,
});
const pinsOf = (L: BowlingLevel): SkittleBody[] =>
    L.pins.map((p, i) => ({
        id: i + 1,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        radius: 0.5,
        mass: 1,
        spin: 0,
        angle: 0,
        fallen: false,
        out: false,
    }));
export function startBowling(phase = 0, variant = 0): BowlingState {
    const base = BOWLING_LEVELS[phase] ?? BOWLING_LEVELS[0];
    const L = {
        ...base,
        pins: base.pins.map((p) => ({
            ...p,
            x: variant === 1 ? 18 - p.x : p.x,
            y: p.y + (variant === 2 ? 0.7 : 0),
        })),
    };
    return {
        phase,
        variant,
        L,
        bodies: pinsOf(L),
        aim: { angle: -Math.PI / 2, power: 14, pulling: false },
        spin: 0,
        mode: "aim",
        bowls: 0,
        total: 0,
        counted: [],
        note: "Pull back from the ball and let go. Aim for a group, then bowl at what remains.",
        down: null,
        hand: null,
        wait: 0,
        steps: 0,
        brakeWas: false,
        trail: [],
    };
}
function rerack(s: BowlingState): void {
    s.bodies = pinsOf(s.L);
    s.mode = "aim";
    s.bowls = 0;
    s.total = 0;
    s.counted = [];
    s.wait = 0;
    s.trail = [];
    s.down = null;
    s.hand = null;
    s.aim.pulling = false;
}
function ballOf(s: BowlingState): SkittleBody {
    const v = launchOf(s.aim);
    return {
        id: 0,
        ...BOWLING_START,
        vx: v.x,
        vy: v.y,
        radius: 0.65,
        mass: 5,
        spin: s.spin,
        angle: 0,
        fallen: false,
        out: false,
    };
}
function bowl(s: BowlingState, out: Happening[]): void {
    s.bodies = [ballOf(s), ...s.bodies.filter((b) => b.id !== 0 && !b.fallen)];
    s.mode = "roll";
    s.bowls++;
    s.down = null;
    s.hand = null;
    s.aim.pulling = false;
    s.trail = [];
    s.note = "";
    out.push({ cue: "place", strength: 0.7 });
}
export function bowlingPreview(s: BowlingState, seconds = s.L.preview): Pt[] {
    const b = ballOf(s),
        points: Pt[] = [{ x: b.x, y: b.y }];
    for (let i = 0; i < seconds * 60 && !b.out; i++) {
        stepSkittles([b], bowlingLaneOf(s), 1 / 60);
        if (i % 6 === 5) points.push({ x: b.x, y: b.y });
    }
    return points;
}
export function stepBowling(s: BowlingState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.mode === "won") return out;
    if (s.mode === "retry") {
        if (--s.wait <= 0) rerack(s);
        return out;
    }
    if (s.mode === "roll") {
        const hits = stepSkittles(s.bodies, bowlingLaneOf(s), 1 / 60);
        if (hits.some((h) => h.speed > 0.5)) out.push({ cue: "bump", strength: 0.6 });
        const b = s.bodies.find((b) => b.id === 0);
        if (b && !b.out && s.steps % 5 === 0) s.trail = [...s.trail.slice(-24), { x: b.x, y: b.y }];
        if (skittlesMoving(s.bodies)) return out;
        for (const p of s.bodies)
            if (p.id !== 0 && p.fallen && !s.counted.includes(p.id)) {
                s.counted.push(p.id);
                s.total += s.L.pins[p.id - 1]?.value ?? 0;
            }
        if (s.total === s.L.target) {
            s.mode = "won";
            s.note = `${s.counted.map((id) => s.L.pins[id - 1]?.value ?? 0).join(" + ")} = ${s.total}. A lovely bowl!`;
            out.push({ cue: "win" });
        } else if (s.total > s.L.target || s.bowls >= 2) {
            s.note =
                s.total > s.L.target
                    ? `${s.total} is ${s.total - s.L.target} too many. A fresh rack, another line!`
                    : `${s.total} down, ${s.L.target - s.total} still needed. The pins are coming back.`;
            s.mode = "retry";
            s.wait = 75;
        } else {
            s.mode = "aim";
            s.note = `${s.total} on the board. ${s.L.target - s.total} more with your second bowl.`;
            s.bodies = s.bodies.filter((b) => b.id !== 0 && !b.fallen);
            s.trail = [];
        }
        return out;
    }
    if (pad.brake && !s.brakeWas) s.spin = s.spin === 0 ? -1 : s.spin === -1 ? 1 : 0;
    s.brakeWas = pad.brake;
    if (pad.touch) {
        if (
            !s.down &&
            Math.hypot(pad.touch.x - BOWLING_START.x, pad.touch.y - BOWLING_START.y) < 2.5
        )
            s.down = { ...pad.touch };
        if (s.down) {
            s.hand = { ...pad.touch };
            const pull = { x: pad.touch.x - BOWLING_START.x, y: pad.touch.y - BOWLING_START.y };
            if (pull.y > BOWLING_THROW.dead) s.aim = aimOfPull(pull, BOWLING_THROW);
        }
        return out;
    }
    if (pad.lifted && s.down) {
        const pull = { x: pad.lifted.x - BOWLING_START.x, y: pad.lifted.y - BOWLING_START.y };
        s.down = null;
        s.hand = null;
        if (pull.y > BOWLING_THROW.dead) {
            s.aim = aimOfPull(pull, BOWLING_THROW);
            if (pad.flick && Math.abs(pad.flick.x) > 5) s.spin = clamp(pad.flick.x / 25, -1, 1);
            bowl(s, out);
        }
        return out;
    }
    if (stepAim(s.aim, pad, BOWLING_THROW, 1 / 60)) bowl(s, out);
    return out;
}
function frame(s: BowlingState, _rest?: boolean, room?: { w: number; h: number }): Frame {
    const sprites: Sprite[] = [
        {
            key: "lane",
            art: "bowlinglane",
            params: { bumpers: s.L.bumpers },
            x: 9,
            y: 14.5,
            size: 14,
            z: -2,
        },
    ];
    for (const side of [1, 17])
        for (const y of [6, 15, 23])
            sprites.push({
                key: `decoration:${side}:${y}`,
                art: s.phase >= 4 ? "lantern" : "flowers",
                params: s.phase >= 4 ? { lit: 1, post: 0 } : { count: 1, petals: 5 + s.phase },
                x: side,
                y,
                size: 1.5,
                z: -1,
                still: true,
            });
    if (s.phase === 1 || s.phase === 3)
        sprites.push({
            key: "bunting",
            art: "strokes.bunting",
            x: 9,
            y: 3.4,
            size: 9,
            z: -1,
            still: true,
        });
    for (const p of s.bodies) {
        if (p.out) continue;
        if (p.id === 0)
            sprites.push({
                key: "ball",
                art: "bowlingball",
                x: p.x,
                y: p.y,
                size: 1.3,
                angle: p.angle,
                z: 3,
            });
        else
            sprites.push({
                key: `pin:${p.id}`,
                art: "bowlingpin",
                params: { n: s.L.pins[p.id - 1]?.value ?? 1, fallen: p.fallen },
                x: p.x,
                y: p.y,
                size: 2.2,
                angle: p.fallen ? p.angle - Math.PI / 2 : 0,
                z: p.fallen ? 1 : 2,
            });
    }
    if (s.mode === "aim")
        sprites.push({ key: "ready", art: "bowlingball", x: 9, y: 25, size: 1.3, z: 3 });
    const marks: Mark[] = [
        {
            kind: "word",
            x: 9,
            y: 1.2,
            text: `${s.total} / ${s.L.target}  ·  Bowl ${Math.min(2, s.bowls + (s.mode === "aim" ? 1 : 0))} of 2`,
            phone: `${s.total} / ${s.L.target} · Bowl ${Math.min(2, s.bowls + (s.mode === "aim" ? 1 : 0))}`,
            size: 0.65,
            fixed: true,
        },
    ];
    if (s.mode === "aim") {
        marks.push({ kind: "dots", pts: bowlingPreview(s) });
        marks.push({
            kind: "word",
            x: 9,
            y: 30,
            text: `${s.spin < -0.1 ? "Curve left" : s.spin > 0.1 ? "Curve right" : "Straight"} · Power ${Math.round(((s.aim.power - 7) / 12) * 100)}%`,
            size: 0.6,
            fixed: true,
        });
        if (s.hand) marks.push({ kind: "line", a: BOWLING_START, b: s.hand, style: "thin" });
    }
    if (s.trail.length) marks.push({ kind: "dots", pts: s.trail, faint: true });
    if (room && room.w > room.h) {
        const projection: Projection = { a: 0, b: 1, c: -1, d: 0, e: 32, f: 0 };
        return {
            projection,
            sprites: sprites
                .filter((sprite) => !sprite.key.startsWith("decoration:") || sprite.y !== 15)
                .map((sprite) => ({
                    ...sprite,
                    ...projectPoint(sprite, projection),
                    angle: sprite.art === "bowlinglane" ? Math.PI / 2 : sprite.angle,
                })),
            marks: marks.map((mark) =>
                mark.kind === "word" && mark.fixed
                    ? { ...mark, x: 16, y: mark.y < 5 ? 0.8 : 17.2 }
                    : projectMark(mark, projection),
            ),
            view: { w: 32, h: 18 },
            world: { w: 32, h: 18 },
            camera: { x: 16, y: 9 },
            focus: { x: 16, y: 9 },
            time: s.steps / 60,
        };
    }
    return {
        sprites,
        marks,
        view: { w: 18, h: 32 },
        world: { w: 18, h: 32 },
        camera: { x: 9, y: 16 },
        focus: { x: 9, y: 16 },
        time: s.steps / 60,
    };
}
export const bowlingGame: ActionGame<BowlingState> = {
    id: "bowling",
    title: "Pin bowling",
    group: "action",
    levels: BOWLING_LEVELS,
    rate: 60,
    cover: { art: "bowlingpin", params: { n: 5 } },
    card: null,
    seen: "above",
    quiet: true,
    touch: true,
    wasd: true,
    hint: "Pull back from the ball and release. Flick sideways to curve. Arrows aim and set power; Space bowls; B changes curve. Two bowls, then a fresh rack.",
    controls: {
        arrows: { left: "Aim left", right: "Aim right", up: "More power", down: "Less power" },
        go: "Bowl",
        brake: "Change curve",
    },
    commands: [{ id: "rack", label: "Fresh rack", key: "r" }],
    command: (s, id) => {
        if (id === "rack" && s.mode !== "won") {
            rerack(s);
            s.note = "A fresh rack. Try a different line.";
        }
    },
    start: (phase, seed = 0) => startBowling(phase, (seed >>> 0) % 3),
    step: stepBowling,
    frame,
    won: (s) => s.mode === "won",
    note: (s) => s.note,
    say: (s) =>
        `${s.L.goal} ${s.total} on the board. ${2 - s.bowls} bowls left. Standing pins: ${s.bodies
            .filter((p) => p.id !== 0 && !p.fallen)
            .map((p) => s.L.pins[p.id - 1]?.value ?? 0)
            .join(", ")}.`,
    cancelInput: (s) => {
        s.down = null;
        s.hand = null;
        s.aim.pulling = false;
    },
    still: { press: () => 15, settling: (s) => s.mode === "roll" || s.mode === "retry" },
};
