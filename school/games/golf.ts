import type { ActionGame } from "./game";
import type { Pt, Rect } from "../../engine/motion/geometry";
import type { Frame, Sprite, Mark } from "../../engine/motion/scene";
import {
    launchRolling,
    stepRolling,
    type RollingBall,
    type RollingWorld,
} from "../../engine/motion/rolling";

export interface GolfCourse {
    start: Pt;
    cup: Pt;
    walls: Rect[];
    sand: Rect[];
}
export interface GolfState {
    course: GolfCourse;
    ball: RollingBall;
    angle: number;
    power: number;
    shots: number;
    moving: boolean;
    message: string;
}
export const GOLF_LEVELS = [
    {
        title: "The putting green",
        grades: [1, 4] as [number, number],
        goal: "Roll the ball into the cup. A gentle finish helps.",
    },
    {
        title: "Around the garden",
        grades: [1, 4] as [number, number],
        goal: "Find a way around the garden walls. Take as many putts as you need.",
    },
    {
        title: "Across the sand",
        grades: [1, 4] as [number, number],
        goal: "Sand slows the ball. Choose your path to the cup.",
    },
];
export function golfCourse(phase: number, variant = 0): GolfCourse {
    const shift = (variant % 3) * 2;
    if (phase === 1)
        return {
            start: { x: 8, y: 18 + shift / 2 },
            cup: { x: 27, y: 8 + shift / 2 },
            walls: [
                { x: 17, y: 9, w: 1, h: 14 },
                { x: 23, y: 3, w: 1, h: 10 },
            ],
            sand: [],
        };
    if (phase === 2)
        return {
            start: { x: 7, y: 13 + shift },
            cup: { x: 28, y: 13 - shift },
            walls: [
                { x: 21, y: 3, w: 1, h: 6 },
                { x: 21, y: 18, w: 1, h: 5 },
            ],
            sand: [{ x: 13, y: 8 + shift / 2, w: 6, h: 10 - shift / 2 }],
        };
    return {
        start: { x: 8, y: 13 + shift },
        cup: { x: 23 + shift, y: 13 - shift },
        walls: [],
        sand: [],
    };
}
export function startGolf(course: GolfCourse): GolfState {
    return {
        course: structuredClone(course),
        ball: { ...course.start, vx: 0, vy: 0, r: 0.32, sunk: false },
        angle: Math.atan2(course.cup.y - course.start.y, course.cup.x - course.start.x),
        power: 4,
        shots: 0,
        moving: false,
        message: "Pull the ball back and let go to putt.",
    };
}
export function golfWorld(s: GolfState): RollingWorld {
    return {
        bounds: { x: 3, y: 3, w: 30, h: 20 },
        walls: s.course.walls,
        surfaces: s.course.sand.map((area) => ({ area, deceleration: 8 })),
        deceleration: 2,
        restitution: 0.85,
        restSpeed: 0.08,
        cup: { ...s.course.cup, r: 0.6, maxSpeed: 3.2 },
    };
}
const clampPower = (power: number) => Math.max(0.2, Math.min(8, power));
export function golfFrame(s: GolfState): Frame {
    const sprites: Sprite[] = [
        { key: "garden-tree", art: "tree", x: 1.4, y: 5, size: 2.3, still: true, z: 1 },
        { key: "garden-flowers", art: "flowers", x: 30, y: 24.5, size: 3, still: true, z: 1 },
        { key: "garden-windmill", art: "windmill", x: 34.5, y: 6, size: 2.5, still: true, z: 1 },
        { key: "green", art: "golfgreen", x: 18, y: 13, params: { width: 30, height: 20 }, z: 0 },
        ...s.course.sand.map((r, i) => ({
            key: `sand${i}`,
            art: "golfsand",
            x: r.x + r.w / 2,
            y: r.y + r.h / 2,
            params: { width: r.w, height: r.h },
            z: 1,
        })),
        ...s.course.walls.map((r, i) => ({
            key: `wall${i}`,
            art: "golfrail",
            x: r.x + r.w / 2,
            y: r.y + r.h / 2,
            params: { width: r.w, height: r.h },
            z: 2,
        })),
        { key: "cup", art: "golfcup", x: s.course.cup.x, y: s.course.cup.y, z: 3 },
        {
            key: "ball",
            art: "prop.ball",
            x: s.ball.x,
            y: s.ball.y,
            crop: { x: 0.4, y: 0.4, w: 1.2, h: 1.2 },
            size: 0.64,
            z: 5,
            alpha: s.ball.sunk ? 0 : 1,
        },
    ];
    const marks: Mark[] = [
        {
            kind: "word",
            x: 18,
            y: 1.5,
            text: `${s.shots} ${s.shots === 1 ? "putt" : "putts"}`,
            size: 0.65,
        },
    ];
    if (!s.moving && !s.ball.sunk) {
        marks.push({
            kind: "line",
            a: s.ball,
            b: {
                x: s.ball.x + Math.cos(s.angle) * (1 + s.power),
                y: s.ball.y + Math.sin(s.angle) * (1 + s.power),
            },
            style: "aim",
            head: true,
        });
        marks.push({ kind: "ring", x: s.ball.x, y: s.ball.y, r: 0.65, on: true });
        marks.push({
            kind: "word",
            x: 18,
            y: 25,
            text: `Power ${Math.round((s.power / 8) * 100)}%`,
            size: 0.55,
        });
    }
    return {
        sprites,
        marks,
        camera: { x: 18, y: 13 },
        view: { w: 36, h: 26 },
        world: { w: 36, h: 26 },
    };
}
export const golfGame: ActionGame<GolfState> = {
    id: "golf",
    title: "Garden mini-golf",
    group: "action",
    levels: GOLF_LEVELS,
    rate: 60,
    hint: "Pull back from the ball and let go. Arrow keys turn the aim and change the power; space or Enter putts. Walls bounce; sand slows.",
    cover: { art: "golfputt" },
    controls: {
        arrows: { left: "Aim left", right: "Aim right", up: "More power", down: "Less power" },
        go: "Putt",
    },
    start: (phase) => startGolf(golfCourse(phase)),
    step(s, pad) {
        if (s.ball.sunk) return [];
        let launched = false;
        if (!s.moving) {
            const directions = new Set([...pad.holding, ...pad.pressed]);
            if (directions.has("left")) s.angle -= 0.025;
            if (directions.has("right")) s.angle += 0.025;
            if (directions.has("up")) s.power = clampPower(s.power + 0.035);
            if (directions.has("down")) s.power = clampPower(s.power - 0.035);
            const pull = pad.released ?? pad.pull;
            if (pull && Math.hypot(pull.x, pull.y) > 0.08) {
                s.angle = Math.atan2(-pull.y, -pull.x);
                s.power = clampPower(Math.hypot(pull.x, pull.y));
            }
            if (pad.tapped || (pad.released && Math.hypot(pad.released.x, pad.released.y) > 0.15)) {
                const speed = s.power * 2;
                launchRolling(s.ball, Math.cos(s.angle) * speed, Math.sin(s.angle) * speed, 16);
                s.shots++;
                launched = true;
                s.moving = true;
                s.message = "";
            }
        }
        const result = stepRolling(s.ball, golfWorld(s), 1 / 60);
        if (result.stopped) {
            s.moving = false;
            s.message = s.ball.sunk ? "In the cup!" : "Ready for your next putt.";
        }
        return result.captured
            ? [{ cue: "win" }, { burst: { kind: "sparkle", x: s.ball.x, y: s.ball.y, n: 8 } }]
            : result.hits
              ? [{ cue: "bump" }]
              : launched
                ? [{ cue: "place" }]
                : [];
    },
    pullFrom: (s) => (s.moving || s.ball.sunk ? null : { x: s.ball.x, y: s.ball.y }),
    say: (s) =>
        s.ball.sunk
            ? "The ball is in the cup."
            : `${s.shots} putts. Ball at ${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}. ${s.moving ? "Rolling." : "Ready to putt."}`,
    note: (s) => s.message,
    won: (s) => s.ball.sunk,
    objectives: (s) => ({ completed: s.ball.sunk ? 1 : 0, total: 1 }),
    frame: golfFrame,
    still: { press: () => 1, settling: (s) => s.moving },
};
