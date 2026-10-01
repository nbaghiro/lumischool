import {
    headingError,
    vehicleStep,
    type Vehicle,
    type VehicleTuning,
} from "../../engine/motion/vehicle";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { Pt } from "../../engine/motion/geometry";
import type { ActionGame, ActionLevel } from "./game";

export interface RallyCourse {
    points: Pt[];
    lane: number;
    laps: number;
    speed: number;
    grip: number;
    /**
     * The bends with a sign, by the points they run from and to, and the speed on the sign in squares
     * a second: a car over it skids wide, and a lap only counts when every bend was taken at its speed.
     */
    signs?: { from: number; to: number; limit: number }[];
}
export interface RallyState {
    course: RallyCourse;
    car: Vehicle;
    next: number;
    passed: number;
    laps: number;
    won: boolean;
    said: string;
    offroad: boolean;
    recoveries: number;
    /** Where the tyres have left marks, newest last; set once the car has moved. */
    tracks?: { x: number; y: number }[];
    /** Where the last puff of dust was thrown on the grass. */
    dust?: { x: number; y: number };
    /** The signed bends taken too fast on this lap, by sign. */
    fast?: boolean[];
}
export const RALLY_LEVELS: ActionLevel[] = [
    {
        title: "A sunny circuit",
        grades: [1, 4],
        goal: "Follow the road around the garden and cross the finish line.",
    },
    {
        title: "Meadow bends",
        grades: [1, 4],
        goal: "Steer through the bends. Pass each marker to finish your lap.",
    },
    {
        title: "Two orchard laps",
        grades: [2, 4],
        goal: "Find your rhythm through the orchard. Complete two laps in your own time.",
    },
    {
        title: "Slow for the bends",
        grades: [3, 4],
        goal: "Each bend has a sign with its speed. Brake before it, and take every bend at that speed or slower for a whole lap.",
    },
];

/** Points round a signed course, and how far along a bend its sign stands before the bend itself. */
const POINTS = 64,
    WARN = 2;

/**
 * Two straights and two tight bends: the course a speed is chosen for before each corner. The bends
 * are the ends, and each has its sign.
 */
function bendsCourse(variant: number): RallyCourse {
    const r = [4.6, 5, 4.3][variant] ?? 4.6,
        half = 9.5,
        straight = 2 * half,
        arc = Math.PI * r,
        whole = 2 * straight + 2 * arc;
    const at = (d: number): Pt => {
        let t = ((d % whole) + whole) % whole;
        if (t < straight) return { x: 18 - half + t, y: 12 + r };
        t -= straight;
        if (t < arc) {
            const a = Math.PI / 2 - t / r;
            return { x: 18 + half + r * Math.cos(a), y: 12 + r * Math.sin(a) };
        }
        t -= arc;
        if (t < straight) return { x: 18 + half - t, y: 12 - r };
        t -= straight;
        const a = -Math.PI / 2 - t / r;
        return { x: 18 - half + r * Math.cos(a), y: 12 + r * Math.sin(a) };
    };
    const points = Array.from({ length: POINTS }, (_, i) => at((i / POINTS) * whole));
    const index = (d: number) => Math.round((d / whole) * POINTS) % POINTS;
    const limits = [
        [3, 4],
        [4, 3],
        [3, 3],
    ][variant] ?? [3, 4];
    return {
        points,
        lane: 3.8,
        laps: 1,
        speed: 7.5,
        grip: 7,
        signs: [0, 1].map((k) => ({
            from: index(straight + k * (straight + arc)),
            to: index(straight + arc + k * (straight + arc)),
            limit: limits[k] ?? 3,
        })),
    };
}

/** The sign whose bend the point `i` is in, by its index, or -1. */
function bendAt(course: RallyCourse, i: number): number {
    return (course.signs ?? []).findIndex((b) =>
        b.from <= b.to ? i >= b.from && i <= b.to : i >= b.from || i <= b.to,
    );
}

export const speedOf = (car: Vehicle): number => Math.hypot(car.vx, car.vy);

export function rallyCourse(phase: number, variant: number): RallyCourse {
    if (
        !Number.isInteger(phase) ||
        phase < 0 ||
        phase > 3 ||
        !Number.isInteger(variant) ||
        variant < 0 ||
        variant > 2
    )
        throw new Error("Unknown rally course");
    if (phase === 3) return bendsCourse(variant);
    const rx = 12 - variant * 0.6,
        ry = 7 + variant * 0.35;
    return {
        points: Array.from({ length: 64 }, (_, i) => {
            const angle = (i / 64) * Math.PI * 2;
            const bend = phase === 0 ? 0 : (phase === 1 ? 0.6 : 1) * Math.sin(angle * 3);
            return { x: 18 + (rx + bend) * Math.cos(angle), y: 12 + ry * Math.sin(angle) };
        }),
        lane: [4.6, 4.2, 3.8][phase] ?? 4.6,
        laps: phase === 2 ? 2 : 1,
        speed: [5.2, 6, 6.8][phase] ?? 5.2,
        grip: [9, 8, 6][phase] ?? 9,
    };
}

export function startRally(course: RallyCourse): RallyState {
    const first = course.points[0],
        second = course.points[1];
    if (!first || !second) throw new Error("A rally course needs a closed centre line");
    return {
        course,
        car: {
            ...first,
            angle: Math.atan2(second.y - first.y, second.x - first.x),
            vx: 0,
            vy: 0,
            steering: 0,
        },
        next: 1,
        passed: 0,
        laps: 0,
        won: false,
        said: "Hold ahead of the car to drive, or steer with the arrow keys.",
        offroad: false,
        recoveries: 0,
    };
}

function distanceToRoad(p: Pt, course: RallyCourse): number {
    let closest = Infinity;
    for (let i = 0; i < course.points.length; i++) {
        const a = course.points[i],
            b = course.points[(i + 1) % course.points.length];
        if (!a || !b) continue;
        const dx = b.x - a.x,
            dy = b.y - a.y;
        const t = Math.max(
            0,
            Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
        );
        closest = Math.min(closest, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t));
    }
    return closest;
}

export function recoverRally(s: RallyState): void {
    if (s.won) return;
    const index = (s.next - 1 + s.course.points.length) % s.course.points.length;
    const point = s.course.points[index],
        next = s.course.points[s.next];
    if (!point || !next) return;
    s.car = {
        ...point,
        angle: Math.atan2(next.y - point.y, next.x - point.x),
        vx: 0,
        vy: 0,
        steering: 0,
    };
    s.offroad = false;
    s.recoveries++;
    s.tracks = [];
    s.said = "Back on the road. Keep going from here.";
}

/** Squares between tyre marks, how many stay, squares between puffs of dust, and the points between rings. */
const TRACK_EVERY = 0.5,
    TRACKS = 90,
    DUST_EVERY = 1.1,
    MARKER = 8;

export function stepRally(s: RallyState, pad: Pad): Happening[] {
    if (s.won) return [];
    const car = s.car,
        course = s.course;
    let steer = Number(pad.holding.includes("right")) - Number(pad.holding.includes("left"));
    let throttle = pad.go || pad.holding.includes("up") ? 1 : 0;
    let brake = pad.brake || pad.holding.includes("down") ? 1 : 0;
    let reverse = brake > 0;
    if (pad.touch) {
        const distance = Math.hypot(pad.touch.x - car.x, pad.touch.y - car.y);
        const bearing = Math.atan2(pad.touch.y - car.y, pad.touch.x - car.x);
        reverse = distance > 1.3 && Math.cos(bearing - car.angle) < -0.5;
        steer = Math.max(
            -1,
            Math.min(
                1,
                headingError(bearing - car.angle - (reverse ? Math.PI : 0)) *
                    (reverse ? -1.8 : 1.8),
            ),
        );
        throttle = distance > 1.3 ? 1 : 0;
        brake = distance < 1.3 ? 1 : brake;
    }
    if (reverse) {
        const forward = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);
        throttle = forward > 0.1 ? 0 : -1;
        brake = forward > 0.1 ? 1 : 0;
    }
    const offroad = distanceToRoad(car, course) > course.lane / 2;
    const bend = bendAt(course, (s.next - 1 + course.points.length) % course.points.length),
        sign = course.signs?.[bend];
    const skid = sign !== undefined && speedOf(car) > sign.limit + 0.4;
    if (skid && sign && !s.fast?.[bend]) {
        (s.fast ??= course.signs?.map(() => false) ?? [])[bend] = true;
        s.said = `Too fast for the ${sign.limit} bend. The car slides wide.`;
    }
    if (offroad !== s.offroad)
        s.said = offroad
            ? "The grass slows you down. Steer back onto the road, or use the return arrow."
            : "Back on the road.";
    s.offroad = offroad;
    const tune: VehicleTuning = {
        acceleration: 5,
        braking: 12,
        topSpeed: offroad ? 2.2 : course.speed,
        reverseSpeed: offroad ? 1.6 : 2.6,
        wheelbase: 1.5,
        grip: offroad ? 4 : skid ? 1.6 : course.grip,
        drag: offroad ? 1.4 : 0.32,
        steeringLimit: 0.62,
        steeringRate: 2.8,
    };
    const before = { x: car.x, y: car.y };
    vehicleStep(car, { throttle, steer, brake }, tune, 1 / 60);
    if (car.x < 1 || car.x > 35 || car.y < 1 || car.y > 23) {
        recoverRally(s);
        return [{ puff: { x: car.x, y: car.y, n: 3 } }];
    }
    const out: Happening[] = [];
    const tracks = (s.tracks ??= []),
        last = tracks[tracks.length - 1];
    if (!last || Math.hypot(car.x - last.x, car.y - last.y) >= TRACK_EVERY) {
        tracks.push({ x: car.x, y: car.y });
        if (tracks.length > TRACKS) tracks.shift();
    }
    const dust = s.dust;
    if (offroad && (!dust || Math.hypot(car.x - dust.x, car.y - dust.y) >= DUST_EVERY)) {
        s.dust = { x: car.x, y: car.y };
        out.push({ burst: { kind: "dust", x: car.x, y: car.y, n: 2 } });
    }
    const target = course.points[s.next];
    const previous = course.points[(s.next - 1 + course.points.length) % course.points.length];
    if (target && previous) {
        const dx = target.x - previous.x,
            dy = target.y - previous.y;
        const oldSide = (before.x - target.x) * dx + (before.y - target.y) * dy;
        const newSide = (car.x - target.x) * dx + (car.y - target.y) * dy;
        const cross =
            Math.abs((car.x - target.x) * dy - (car.y - target.y) * dx) / Math.hypot(dx, dy);
        if (oldSide <= 0 && newSide > 0 && cross <= course.lane / 2 + 0.3) {
            s.passed++;
            if (s.next === 0 && s.fast?.some(Boolean)) {
                s.fast = s.fast.map(() => false);
                s.said =
                    "A bend was taken too fast, so that lap does not count. Go round again, slower at the signs.";
            } else if (s.next === 0) {
                s.laps++;
                s.said =
                    s.laps >= course.laps
                        ? "A lovely lap. You made it all the way round!"
                        : "One lap around. Ready for another!";
                if (s.laps >= course.laps) {
                    s.won = true;
                    car.vx = 0;
                    car.vy = 0;
                    return [
                        ...out,
                        { cue: "win" },
                        { burst: { kind: "sparkle", x: car.x, y: car.y, n: 16 } },
                    ];
                }
            }
            // the ring on the course stands on every eighth point, so passing it is marked
            if (s.next % MARKER === 0)
                out.push(
                    { cue: "ring" },
                    { burst: { kind: "sparkle", x: target.x, y: target.y, n: 6 } },
                );
            s.next = (s.next + 1) % course.points.length;
        }
    }
    return out;
}

/** Each bend's sign beside the road before it, and the car's speed beside the car, on a signed course. */
function signMarks(s: RallyState): Mark[] {
    const c = s.course,
        n = c.points.length;
    if (!c.signs) return [];
    const out: Mark[] = c.signs.flatMap((b) => {
        const p = c.points[(b.from - WARN + n) % n];
        if (!p) return [];
        const dx = p.x - 18,
            dy = p.y - 12,
            d = Math.hypot(dx, dy) || 1,
            off = c.lane / 2 + 1.3;
        const x = p.x + (dx / d) * off,
            y = p.y + (dy / d) * off;
        return [
            { kind: "ring" as const, x, y, r: 0.85, solid: true },
            { kind: "word" as const, x, y: y + 0.3, text: String(b.limit), size: 0.8 },
        ];
    });
    out.push({
        kind: "word",
        x: s.car.x,
        y: s.car.y - 1.6,
        text: String(Math.round(speedOf(s.car))),
        size: 0.7,
    });
    return out;
}

export const rallyGame: ActionGame<RallyState> = {
    portrait: { hint: true },
    id: "rally",
    title: "Pocket rally",
    group: "action",
    seen: "above",
    levels: RALLY_LEVELS,
    rate: 60,
    cover: { art: "racecar", params: { vx: 0, vy: 0 } },
    hint: "Hold ahead of the car to drive, or behind it to reverse. Space or up goes forward; left and right steer. Hold down to brake, then reverse. The return arrow puts you back on the road.",
    controls: {
        arrows: { left: "Steer left", right: "Steer right" },
        go: "Accelerate",
        brake: "Brake / reverse",
    },
    commands: [{ id: "recover", label: "Back on the road", key: "r" }],
    command: (s, id) => {
        if (id === "recover") recoverRally(s);
    },
    start: (phase) => startRally(rallyCourse(phase, 0)),
    step: stepRally,
    say: (s) =>
        `Lap ${Math.min(s.laps + 1, s.course.laps)} of ${s.course.laps}. ${s.offroad ? "On the grass." : "On the road."}${s.course.signs ? ` Speed ${Math.round(speedOf(s.car))}. The bends' signs say ${s.course.signs.map((b) => b.limit).join(" and ")}.` : ""} ${s.said}`,
    note: (s) => s.said,
    won: (s) => s.won,
    objectives: (s) => {
        const total = s.course.points.length * s.course.laps;
        return { completed: Math.min(s.passed, total), total };
    },
    touch: true,
    still: { press: () => 12 },
    frame: (s): Frame => {
        const sprites: Sprite[] = [
            {
                key: "lawn",
                art: "golfgreen",
                params: { width: 36, height: 24 },
                x: 18,
                y: 12,
                still: true,
            },
            {
                key: "track",
                art: "rallytrack",
                params: {
                    width: 36,
                    height: 24,
                    lane: s.course.lane,
                    points: s.course.points.flatMap((p) => [p.x, p.y]),
                },
                x: 18,
                y: 12,
                still: true,
                z: 1,
            },
            { key: "flowers", art: "flowers", x: 17, y: 12, size: 4, still: true, z: 2 },
            {
                key: "car",
                art: "racecar",
                params: { vx: 0, vy: 0 },
                x: s.car.x,
                y: s.car.y,
                size: 2,
                angle: s.car.angle,
                z: 5,
            },
        ];
        const target =
            s.course.points[(Math.ceil(s.next / MARKER) * MARKER) % s.course.points.length];
        return {
            sprites,
            marks: [
                ...(s.tracks?.length
                    ? [{ kind: "dots" as const, pts: s.tracks, faint: true, opacity: 0.5 }]
                    : []),
                {
                    kind: "word",
                    x: 18,
                    y: 14.5,
                    text: s.won
                        ? "Lovely driving!"
                        : `Lap ${Math.min(s.laps + 1, s.course.laps)} / ${s.course.laps}`,
                    size: 0.85,
                },
                ...(target && !s.won
                    ? [{ kind: "ring" as const, x: target.x, y: target.y, r: 0.65, on: true }]
                    : []),
                ...signMarks(s),
            ],
            camera: { x: 18, y: 12, zoom: 1 },
            view: { w: 36, h: 24 },
            world: { w: 36, h: 24 },
        };
    },
};
