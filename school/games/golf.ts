import type { ActionGame } from "./game";
import { stepAim, type AimSpec } from "../../engine/motion/aim";
import { inside, type Pt, type Rect } from "../../engine/motion/geometry";
import type { Frame, Happening, Sprite, Mark } from "../../engine/motion/scene";
import {
    launchRolling,
    stepRolling,
    type RollingBall,
    type RollingWorld,
} from "../../engine/motion/rolling";

/** A rail that is there for `shut` seconds of every `period`, from `phase` seconds in: the windmill's sails. */
export interface GolfGate {
    rect: Rect;
    period: number;
    shut: number;
    phase: number;
}
/** A rail that slides `dx`, `dy` squares out and back over `period` seconds: the gnome on his track. */
export interface GolfMover {
    rect: Rect;
    dx: number;
    dy: number;
    period: number;
    phase: number;
}
export interface GolfCourse {
    start: Pt;
    cup: Pt;
    walls: Rect[];
    sand: Rect[];
    /** Putts a hole is meant to take; the older holes have none and keep no card. */
    par?: number;
    /** A ball that rolls into water comes back to where it was putted from. */
    water?: Rect[];
    /** Thicker than sand. */
    mud?: Rect[];
    slopes?: { area: Rect; ax: number; ay: number }[];
    gates?: GolfGate[];
    movers?: GolfMover[];
    /** A ball that rolls over `from` comes out at `to` going the same way. */
    tunnels?: { from: Pt; to: Pt }[];
    /** What the board reads out while aiming: the squares to the cup, or the aim as a clock hour. */
    show?: "distance" | "clock";
    /** Where the windmill stands over its doorway, drawn turning. */
    windmill?: Pt;
}
export interface GolfState {
    course: GolfCourse;
    ball: RollingBall;
    angle: number;
    power: number;
    shots: number;
    moving: boolean;
    message: string;
    /** Steps since the hole began, for the sails and the gnome. */
    t: number;
    /** Where the last putt was taken from, where a ball in the water comes back to. */
    from: Pt;
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
    {
        title: "Off the boards",
        grades: [2, 4] as [number, number],
        goal: "A rail hides the cup. Bounce off the top boards to get round it. Par 2.",
    },
    {
        title: "The windmill",
        grades: [1, 4] as [number, number],
        goal: "Putt through the door when the sails are clear. Par 2.",
    },
    {
        title: "Down the hill",
        grades: [2, 4] as [number, number],
        goal: "The lawn slopes, so the ball curves downhill. Aim above the cup. Par 3.",
    },
    {
        title: "The ponds",
        grades: [1, 4] as [number, number],
        goal: "Keep to the lawn between the ponds. A ball in the water comes back. Par 3.",
    },
    {
        title: "Through the pipe",
        grades: [1, 4] as [number, number],
        goal: "A wall is in the way. Roll into the pipe and out the other side. Par 2.",
    },
    {
        title: "The gnome",
        grades: [1, 4] as [number, number],
        goal: "The gnome walks up and down the gap. Putt when the way is clear. Par 2.",
    },
    {
        title: "Mud and a hill",
        grades: [3, 4] as [number, number],
        goal: "Mud slows the ball hard, then the lawn tips. Par 3.",
    },
];

const RAILS = (x: number, gapFrom: number, gapTo: number): Rect[] => [
    { x, y: 3, w: 1, h: gapFrom - 3 },
    { x, y: gapTo, w: 1, h: 23 - gapTo },
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
    if (phase === 3)
        return {
            start: { x: 7, y: 18 },
            cup: { x: 27 - shift / 2, y: 18 },
            walls: [{ x: 17, y: 8 + shift / 2, w: 1, h: 15 - shift / 2 }],
            sand: [],
            par: 2,
            show: "clock",
        };
    if (phase === 4) {
        const door = 12 + (variant % 3) - 1;
        return {
            start: { x: 7, y: 13 },
            cup: { x: 28, y: door + 1 },
            walls: RAILS(18, door, door + 2),
            sand: [],
            gates: [
                { rect: { x: 18, y: door, w: 1, h: 2 }, period: 2.4, shut: 1.4, phase: shift / 2 },
            ],
            par: 2,
            windmill: { x: 18.5, y: door - 3.5 },
        };
    }
    if (phase === 5) {
        const pull = variant % 2 === 0 ? 1.2 : -1.2;
        return {
            start: { x: 7, y: 13 },
            cup: { x: 29, y: 13 + (pull > 0 ? -1 : 1) * (2 + shift / 2) },
            walls: [],
            sand: [],
            slopes: [{ area: { x: 12, y: 3, w: 13, h: 20 }, ax: 0, ay: pull }],
            par: 3,
            show: "distance",
        };
    }
    if (phase === 6)
        return {
            start: { x: 7, y: 18 },
            cup: { x: 28, y: 7 + shift },
            walls: [],
            sand: [],
            water: [
                { x: 13, y: 3, w: 7, h: 8 },
                { x: 13, y: 14, w: 7, h: 9 },
            ],
            par: 3,
            show: "distance",
        };
    if (phase === 7)
        return {
            start: { x: 7, y: 13 },
            cup: { x: 30.5, y: 13 - shift * 1.5 },
            walls: [{ x: 18, y: 3, w: 1, h: 20 }],
            sand: [],
            tunnels: [{ from: { x: 13.5, y: 13 }, to: { x: 22.5, y: 13 } }],
            par: 2,
        };
    if (phase === 8)
        return {
            start: { x: 7, y: 13 },
            cup: { x: 28, y: 13 + shift / 2 },
            walls: RAILS(18, 10, 16),
            sand: [],
            movers: [
                {
                    rect: { x: 17.6, y: 10, w: 1.8, h: 2.2 },
                    dx: 0,
                    dy: 3.8,
                    period: 3,
                    phase: shift / 2,
                },
            ],
            par: 2,
        };
    if (phase === 9)
        return {
            start: { x: 6, y: 13 },
            cup: { x: 29, y: 13 - (variant % 2 === 0 ? 4 : -4) },
            walls: [],
            sand: [],
            mud: [{ x: 13, y: 3, w: 4, h: 20 }],
            slopes: [
                {
                    area: { x: 19, y: 3, w: 14, h: 20 },
                    ax: 0,
                    ay: variant % 2 === 0 ? 1 : -1,
                },
            ],
            par: 3,
            show: "distance",
        };
    return {
        start: { x: 8, y: 13 + shift },
        cup: { x: 23 + shift, y: 13 - shift },
        walls: [],
        sand: [],
    };
}

/** Where a sliding rail stands at step `t`: out and back along its track, eased at the ends. */
export function moverAt(m: GolfMover, t: number): Rect {
    const u = (1 - Math.cos((((t / 60 + m.phase) / m.period) % 1) * Math.PI * 2)) / 2;
    return { ...m.rect, x: m.rect.x + m.dx * u, y: m.rect.y + m.dy * u };
}
/** Whether a gate's rail is across its doorway at step `t`. */
export const gateShut = (g: GolfGate, t: number): boolean => (t / 60 + g.phase) % g.period < g.shut;
export function startGolf(course: GolfCourse): GolfState {
    return {
        course: structuredClone(course),
        ball: { ...course.start, vx: 0, vy: 0, r: 0.32, sunk: false },
        t: 0,
        from: { ...course.start },
        angle: Math.atan2(course.cup.y - course.start.y, course.cup.x - course.start.x),
        power: 4,
        shots: 0,
        moving: false,
        message: "Pull the ball back and let go to putt.",
    };
}
export function golfWorld(s: GolfState): RollingWorld {
    const c = s.course;
    return {
        bounds: { x: 3, y: 3, w: 30, h: 20 },
        walls: [
            ...c.walls,
            ...(c.gates ?? []).filter((g) => gateShut(g, s.t)).map((g) => g.rect),
            ...(c.movers ?? []).map((m) => moverAt(m, s.t)),
        ],
        surfaces: [
            ...c.sand.map((area) => ({ area, deceleration: 8 })),
            ...(c.mud ?? []).map((area) => ({ area, deceleration: 14 })),
        ],
        slopes: c.slopes,
        deceleration: 2,
        restitution: 0.85,
        restSpeed: 0.08,
        cup: { ...s.course.cup, r: 0.6, maxSpeed: 3.2 },
    };
}
/** A putt: from a tap to sixteen squares a second, turned all the way round. */
const PUTT: AimSpec = {
    min: 0.4,
    max: 16,
    per: 2,
    dead: 0.15,
    lo: -Infinity,
    hi: Infinity,
    turn: 1.5,
    ramp: 4.2,
    turns: "across",
};
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
        ...hazards(s),
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
    const par = s.course.par;
    const marks: Mark[] = [
        {
            kind: "word",
            x: 18,
            y: 1.5,
            text:
                `${s.shots} ${s.shots === 1 ? "putt" : "putts"}` +
                (par === undefined ? "" : `  ·  par ${par}`),
            size: 0.65,
        },
    ];
    if (!s.moving && !s.ball.sunk && s.course.show) {
        const c = s.course.cup;
        marks.push({
            kind: "word",
            x: 18,
            y: 25,
            text:
                s.course.show === "clock"
                    ? `Aim: ${clockOf(s.angle)} o'clock`
                    : `${Math.round(Math.hypot(c.x - s.ball.x, c.y - s.ball.y))} squares to the cup`,
            size: 0.55,
        });
    }
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
        if (!s.course.show)
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
/** The aim as an hour on a clock face, twelve straight up the page. */
export function clockOf(angle: number): number {
    const hour = Math.round(((angle + Math.PI / 2) / (Math.PI * 2)) * 12);
    return ((hour % 12) + 12) % 12 || 12;
}

/** The golfslope drawing's ways downhill, a quarter of a half turn apart from the right, y downwards. */
const EIGHT = [
    "right",
    "down-right",
    "down",
    "down-left",
    "left",
    "up-left",
    "up",
    "up-right",
] as const;

function hazards(s: GolfState): Sprite[] {
    const c = s.course,
        out: Sprite[] = [];
    const patch = (key: string, art: string, r: Rect, params: Record<string, unknown>, z = 1) =>
        out.push({ key, art, x: r.x + r.w / 2, y: r.y + r.h / 2, params, z, still: true });
    (c.water ?? []).forEach((r, i) =>
        patch(`water${i}`, "golfpond", r, { kind: "water", width: r.w, height: r.h }),
    );
    (c.mud ?? []).forEach((r, i) =>
        patch(`mud${i}`, "golfpond", r, { kind: "mud", width: r.w, height: r.h }),
    );
    (c.slopes ?? []).forEach((sl, i) =>
        patch(
            `slope${i}`,
            "golfslope",
            sl.area,
            {
                dir: EIGHT[(Math.round(Math.atan2(sl.ay, sl.ax) / (Math.PI / 4)) + 8) % 8],
                steep: Math.min(2, Math.max(0.4, Math.round(Math.hypot(sl.ax, sl.ay) * 10) / 10)),
                width: sl.area.w,
                height: sl.area.h,
            },
            0,
        ),
    );
    (c.gates ?? []).forEach((g, i) =>
        out.push({
            key: `gate${i}`,
            art: "golfrail",
            x: g.rect.x + g.rect.w / 2,
            y: g.rect.y + g.rect.h / 2,
            params: { width: g.rect.w, height: g.rect.h },
            z: 2,
            alpha: gateShut(g, s.t) ? 1 : 0.15,
        }),
    );
    if (c.windmill)
        out.push({
            key: "windmill-hole",
            art: "windmill",
            x: c.windmill.x,
            y: c.windmill.y,
            size: 4.2,
            // the sails come round in step with the rail across the door, a quarter of a turn a closing
            params: {
                sails: 4,
                turn:
                    (Math.round(((s.t / 60 / (c.gates?.[0]?.period ?? 2.4)) * 90) / 15) * 15) % 360,
            },
            live: true,
            z: 4,
        });
    (c.movers ?? []).forEach((m, i) => {
        const r = moverAt(m, s.t);
        out.push({
            key: `gnome${i}`,
            art: "golfgnome",
            x: r.x + r.w / 2,
            y: r.y + r.h / 2,
            size: Math.max(r.w, r.h),
            z: 4,
        });
    });
    (c.tunnels ?? []).forEach((tn, i) => {
        for (const [end, at] of [
            ["in", tn.from],
            ["out", tn.to],
        ] as const)
            out.push({
                key: `pipe${i}${end}`,
                art: "golfpipe",
                x: at.x,
                y: at.y,
                params: { end },
                z: 1,
                still: true,
            });
    });
    return out;
}

/** Sends a ball that has reached water home, and carries one that has reached a pipe through it. */
function hazardsAfter(s: GolfState, out: Happening[]): void {
    const b = s.ball;
    if (b.sunk) return;
    if ((s.course.water ?? []).some((r) => inside(r, b))) {
        out.push({ cue: "splash" }, { burst: { kind: "splash", x: b.x, y: b.y, n: 10 } });
        Object.assign(b, { x: s.from.x, y: s.from.y, vx: 0, vy: 0 });
        s.moving = false;
        s.message = "Splash! The ball comes back to where you putted from.";
        return;
    }
    if (!s.moving) return;
    for (const tn of s.course.tunnels ?? [])
        if (Math.hypot(b.x - tn.from.x, b.y - tn.from.y) < 0.6) {
            const speed = Math.hypot(b.vx, b.vy) || 1;
            b.x = tn.to.x + (b.vx / speed) * 0.7;
            b.y = tn.to.y + (b.vy / speed) * 0.7;
            out.push({ cue: "place" });
            return;
        }
}

/** What a sunk ball says against the hole's par. */
function scoreWords(shots: number, par: number | undefined): string {
    if (par === undefined) return "In the cup!";
    const putts = `${shots} ${shots === 1 ? "putt" : "putts"}`;
    if (shots === 1) return `A hole in one! Par was ${par}.`;
    if (shots < par) return `In the cup in ${putts}, under par ${par}.`;
    if (shots === par) return `In the cup in ${putts}. That is par.`;
    return `In the cup in ${putts}. Par is ${par}; have another go to beat it.`;
}

export const golfGame: ActionGame<GolfState> = {
    portrait: { hint: true },
    id: "golf",
    title: "Garden mini-golf",
    group: "action",
    // too wide to crop into a card and keep its play in view: it waits for the turned or overview view, see .docs/game-cards.md
    card: null,
    seen: "above",
    levels: GOLF_LEVELS,
    rate: 60,
    hint: "Pull back from the ball and let go. Arrow keys turn the aim and change the power; space or Enter putts. Walls bounce; sand and mud slow; slopes curve; water sends the ball back.",
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
            // the state keeps a putt's power as half its speed, as it always has
            const a = { angle: s.angle, power: s.power * 2, pulling: false };
            const v = stepAim(a, pad, PUTT, 1 / 60);
            s.angle = a.angle;
            s.power = a.power / 2;
            if (v) {
                s.from = { x: s.ball.x, y: s.ball.y };
                launchRolling(s.ball, v.x, v.y, 16);
                s.shots++;
                launched = true;
                s.moving = true;
                s.message = "";
            }
        }
        const result = stepRolling(s.ball, golfWorld(s), 1 / 60);
        s.t++;
        if (result.stopped) {
            s.moving = false;
            s.message = s.ball.sunk
                ? scoreWords(s.shots, s.course.par)
                : "Ready for your next putt.";
        }
        const par = s.course.par;
        const out: Happening[] = result.captured
            ? [
                  { cue: "win" },
                  {
                      burst: {
                          kind: "sparkle",
                          x: s.ball.x,
                          y: s.ball.y,
                          // par or better gets the bigger cheer
                          n: par !== undefined && s.shots <= par ? 18 : 8,
                      },
                  },
              ]
            : result.hits
              ? [{ cue: "bump" }]
              : launched
                ? [{ cue: "place" }]
                : [];
        hazardsAfter(s, out);
        return out;
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
