// The road: a race where the finish is a number, and winning is stopping on it.
//
// The car drives along a road whose kerb is a number line, and the goal is to bring it to rest with
// its nose on a number. Going is the big button, braking is the other, and the car changes lane
// with up and down to go round the boxes in the road. Nothing is timed and nothing is raced: the
// only question is where the car stops, which is a question about where a number is on a line, and
// at the harder level only the ends of the line are written, so the child has to judge where
// seventy is before they can stop on it. That is number line estimation, which Siegler and Booth
// (2004) found tracks maths achievement at this age. The car's arrow is as long as the distance it
// will cover in the next half second, which is braking distance in one drawing. A box in the road
// slows the car and costs nothing else. It is the same mathematics as the race mechanic in race.ts,
// played in real time, and under reduced motion it is close to that puzzle: a press drives for half
// a second, which is a turn.
import { follow, keepInside, lead, type Cam } from "../../engine/motion/camera";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface RoadLevel extends ActionLevel {
    /** The number line on the kerb: its first and last value, and how many squares one unit takes. */
    from: number;
    to: number;
    per: number;
    /** Which values are written on the kerb: every one, every tenth of the line, or only the ends. */
    labels: "each" | "ends";
    /** A tick every this many units. */
    tick: number;
    /** Stop here. */
    target: number;
    /** Whether a flag stands at the target. Without one the child judges where it is. */
    flag: boolean;
    /** How close a stop has to be, in units of the line. */
    within: number;
    /** Top speed and acceleration in squares a second, and a second squared. */
    top: number;
    accel: number;
    /**
     * A speed the car keeps by itself, so a child steers and brakes with one finger and never has to
     * hold go and a lane button at once. Unset, the car goes only while go is held.
     */
    cruise?: number;
    /** Boxes in the road, at a value on the line and in a lane. */
    boxes: { at: number; lane: number }[];
}

export const ROAD_LEVELS: Levels<RoadLevel> = [
    {
        title: "Stop on 20",
        goal: "The car goes by itself. Brake so the front of the car stops on 20.",
        grades: [1, 2],
        from: 0,
        to: 30,
        per: 2,
        labels: "each",
        tick: 1,
        target: 20,
        flag: true,
        within: 0.5,
        top: 12,
        accel: 6,
        cruise: 7,
        boxes: [
            { at: 6, lane: 1 },
            { at: 12, lane: 0 },
            { at: 15, lane: 2 },
        ],
    },
    {
        title: "Stop on 70",
        goal: "Stop on 70. Only 0 and 100 are written, so judge where 70 is.",
        grades: [2, 4],
        from: 0,
        to: 100,
        per: 1,
        labels: "ends",
        tick: 10,
        target: 70,
        flag: false,
        within: 2.5,
        top: 16,
        accel: 7,
        boxes: [
            { at: 14, lane: 1 },
            { at: 27, lane: 0 },
            { at: 33, lane: 2 },
            { at: 46, lane: 1 },
            { at: 52, lane: 0 },
            { at: 61, lane: 2 },
        ],
    },
];

const RATE = 60,
    DT = 1 / RATE;
/**
 * The road's geometry in squares: where the line starts, the lanes, the run-out past the end of the
 * line, and the view. The lanes are the road drawing's own, repeated here because nothing in this
 * folder imports src/art; a test asserts the two agree.
 */
export const ROAD = {
    origin: 12,
    top: 5,
    lane: 3,
    lanes: 3,
    after: 24,
    view: { w: 36, h: 20 },
} as const;
const laneY = (lane: number) => ROAD.top + ROAD.lane * lane + ROAD.lane / 2;
const CAR = 2;

interface Box {
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    angle: number;
    hit: boolean;
}

export interface RoadState {
    level: number;
    L: RoadLevel;
    /** The car's centre, speed along the road, lane it is steering for, and sideways speed. */
    x: number;
    y: number;
    v: number;
    vy: number;
    lane: number;
    boxes: Box[];
    cam: Cam;
    /** Steps since the car came to rest, and whether it has moved since the last stop was read. */
    still: number;
    moved: boolean;
    /** The value the nose rested on last, once it has rested. */
    stop: number | null;
    stops: number;
    bumps: number;
    said: string;
    steps: number;
    won: boolean;
}

const lengthOf = (L: RoadLevel) => (L.to - L.from) * L.per;
export const worldWidth = (L: RoadLevel) => ROAD.origin + lengthOf(L) + ROAD.after;
/** The value on the line at a place along the road. */
export const valueAt = (L: RoadLevel, x: number) => L.from + (x - ROAD.origin) / L.per;
export const placeOf = (L: RoadLevel, v: number) => ROAD.origin + (v - L.from) * L.per;
const nose = (s: RoadState) => s.x + CAR / 2 - 0.15;

export function start(level: number): RoadState {
    const L = ROAD_LEVELS[level] ?? ROAD_LEVELS[0];
    return {
        level,
        L,
        x: 4,
        y: laneY(1),
        v: 0,
        vy: 0,
        lane: 1,
        boxes: L.boxes.map((b) => ({
            x: placeOf(L, b.at),
            y: laneY(b.lane),
            vx: 0,
            vy: 0,
            spin: 0,
            angle: 0,
            hit: false,
        })),
        cam: { x: ROAD.view.w / 2, y: ROAD.view.h / 2, zoom: 1 },
        still: 0,
        moved: false,
        stop: null,
        stops: 0,
        bumps: 0,
        said: "",
        steps: 0,
        won: false,
    };
}

/** A value said the way a child would read it off the line: whole numbers, or halves on a line in twos. */
const read = (L: RoadLevel, v: number) => (L.per >= 2 ? Math.round(v * 2) / 2 : Math.round(v));

export function step(s: RoadState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    const L = s.L;
    s.steps++;
    for (const d of pad.pressed) {
        if (d === "up") s.lane = Math.max(0, s.lane - 1);
        if (d === "down") s.lane = Math.min(ROAD.lanes - 1, s.lane + 1);
    }
    const braking = pad.brake || pad.holding.includes("left");
    const want =
        s.won || braking ? 0 : pad.go || pad.holding.includes("right") ? L.top : (L.cruise ?? 0);
    if (braking) s.v = Math.max(0, s.v - 16 * DT);
    else if (s.v < want) s.v = Math.min(want, s.v + L.accel * DT);
    else s.v = Math.max(want, s.v - 2.2 * DT);
    // Steering is a stiff spring to the lane's middle, so a lane change takes about a third of a second.
    const lane = laneY(s.lane);
    s.vy += ((lane - s.y) * 90 - s.vy * 16) * DT;
    s.y += s.vy * DT;
    s.x += s.v * DT;
    const end = worldWidth(L) - 1.5;
    if (s.x > end) {
        s.x = end;
        if (s.v > 1) {
            out.push({ cue: "bump" }, { shake: 0.3 });
            s.bumps++;
        }
        s.v = 0;
    }
    for (const b of s.boxes) {
        if (!b.hit && Math.abs(b.x - s.x) < 1.7 && Math.abs(b.y - s.y) < 1.5) {
            b.hit = true;
            b.vx = s.v + 3;
            b.vy = (b.y >= s.y ? 1 : -1) * 5;
            b.spin = (b.y >= s.y ? 1 : -1) * 6;
            s.v *= 0.45;
            s.bumps++;
            s.said = "A box. It slowed the car down.";
            out.push({ cue: "bump" }, { puff: { x: b.x, y: b.y, n: 7 } }, { shake: 0.35 });
        }
        if (b.hit) {
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            b.angle += b.spin * DT;
            const k = Math.exp(-3 * DT);
            b.vx *= k;
            b.vy *= k;
            b.spin *= k;
        }
    }
    if (s.v > 0.05) {
        s.moved = true;
        s.still = 0;
        s.stop = null;
    } else if (s.moved) {
        s.still++;
        if (s.still === 12) {
            s.moved = false;
            s.stops++;
            const v = valueAt(L, nose(s)),
                said = read(L, v);
            s.stop = v;
            const off = Math.abs(v - L.target);
            if (off <= L.within) {
                s.won = true;
                s.said = `Stopped on ${said}. ${L.flag ? "That is the flag." : `${L.target} is here.`}`;
                out.push({ cue: "win" });
            } else if (v > L.to || v < L.from) {
                // Off the line there is no number to read, so the sentence says which end it is past.
                s.said =
                    v > L.to
                        ? `Stopped past ${L.to}, the end of the line. ${L.target} is back.`
                        : `Stopped before ${L.from}. ${L.target} is further on.`;
                out.push({ cue: "place" });
            } else {
                const more = L.target - v;
                const gap =
                    L.per >= 2 ? Math.round(Math.abs(more) * 2) / 2 : Math.round(Math.abs(more));
                s.said = `Stopped on ${said}. ${L.target} is ${gap} ${more > 0 ? "further on" : "back"}.`;
                out.push({ cue: "place" });
            }
        }
    }
    // The camera leads the car by more the faster it goes, and eases rather than jumps.
    s.cam = follow(s.cam, ahead(s), {
        rate: 4,
        dt: DT,
        view: ROAD.view,
        world: { w: worldWidth(L), h: ROAD.view.h },
    });
    return out;
}

const ahead = (s: RoadState): Cam => ({
    ...lead({ x: s.x + 6, y: ROAD.view.h / 2 }, { x: s.v, y: 0 }, 0.55, 8),
    zoom: 1,
});

export function frame(s: RoadState, rest = false): Frame {
    const L = s.L;
    const W = worldWidth(L);
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    // The road is drawn in pieces so no one drawing is wider than a screen, and each piece is drawn
    // once: a piece is a place, not a thing that moves.
    for (let x0 = 0; x0 < W; x0 += 16) {
        const line = {
            from: L.from,
            to: L.to,
            per: L.per,
            tick: L.tick,
            labels: L.labels,
            start: ROAD.origin,
            end: W - 1,
        };
        sprites.push({
            key: `road:${x0}`,
            art: "arcade.road",
            params: { x0, w: Math.min(16, W - x0), ...line },
            seed: 900 + x0,
            x: x0 + Math.min(16, W - x0) / 2,
            y: ROAD.view.h / 2,
            z: 0,
            still: true,
        });
    }
    for (let x = 2, i = 0; x < W - 4; x += 11, i++) {
        sprites.push({
            key: `firs:${i}`,
            art: "firs",
            params: { count: 2, snow: 0 },
            seed: 50 + i,
            size: 6,
            x: x + (i % 3),
            y: 2.2,
            z: 1,
            still: true,
        });
    }
    sprites.push({
        key: "stand",
        art: "grandstand",
        seed: 5,
        size: 6,
        x: 5,
        y: 18,
        z: 1,
        still: true,
    });
    for (let x = 18, i = 0; x < W - 8; x += 13, i++) {
        sprites.push(
            i % 2
                ? {
                      key: `flowers:${i}`,
                      art: "flowers",
                      params: { count: 3, petals: 5 },
                      seed: 80 + i,
                      size: 5,
                      x,
                      y: 18.1,
                      z: 1,
                      still: true,
                  }
                : {
                      key: `houses:${i}`,
                      art: "houses",
                      params: { count: 2, windows: 2 },
                      seed: 90 + i,
                      size: 4.6,
                      x,
                      y: 18.1,
                      z: 1,
                      still: true,
                  },
        );
    }
    for (const [i, b] of s.boxes.entries()) {
        sprites.push({
            key: `box:${i}`,
            art: "prop.cube",
            seed: 70 + i,
            crop: { x: 0.05, y: 0.35, w: 2.6, h: 2.6 },
            size: 2.2,
            x: b.x,
            y: b.y,
            angle: b.angle,
            z: 2,
        });
    }
    const arrow = Math.round((s.v * 0.5) / CAR / 0.25) * 0.25;
    sprites.push({
        key: "car",
        art: "racecar",
        params: { vx: arrow, vy: 0 },
        seed: 11,
        x: s.x,
        y: s.y,
        angle: Math.atan2(s.vy, Math.max(4, s.v)) * 0.8,
        z: 3,
    });
    if (L.flag || s.won) {
        const fx = placeOf(L, L.target);
        marks.push({
            kind: "line",
            a: { x: fx, y: ROAD.top - 0.4 },
            b: { x: fx, y: ROAD.top + ROAD.lane * ROAD.lanes + 0.4 },
        });
        marks.push({ kind: "word", x: fx, y: ROAD.top - 0.9, text: String(L.target), size: 0.9 });
    }
    if (s.stop !== null) {
        const x = placeOf(L, s.stop);
        marks.push({
            kind: "ring",
            x,
            y: ROAD.top + ROAD.lane * ROAD.lanes + 0.9,
            r: 0.35,
            on: s.won,
        });
    }
    const world = { w: W, h: ROAD.view.h };
    const camera = rest ? { ...keepInside(ahead(s), ROAD.view, world), zoom: 1 } : { ...s.cam };
    return { sprites, marks, camera, view: { ...ROAD.view }, world };
}

export function say(s: RoadState): string {
    const L = s.L;
    const at = read(L, valueAt(L, nose(s)));
    const speed =
        s.v < 0.05
            ? "standing still"
            : s.v < L.top * 0.4
              ? "going slowly"
              : s.v < L.top * 0.8
                ? "going quite fast"
                : "going as fast as it can";
    const where =
        at < L.from
            ? `before ${L.from}`
            : at > L.to
              ? `past ${L.to}, the end of the line`
              : `at ${at}`;
    const lane = ["top", "middle", "bottom"][s.lane] ?? "middle";
    const ahead = s.boxes.find(
        (b) => !b.hit && b.x > s.x && b.x - s.x < 10 && Math.abs(b.y - laneY(s.lane)) < 1,
    );
    return [
        s.said,
        `The car is ${where}, in the ${lane} lane, ${speed}.`,
        ahead ? "There is a box ahead in this lane." : "",
        s.won ? "" : `Stop on ${L.target}.`,
    ]
        .filter(Boolean)
        .join(" ");
}

export const roadGame: ActionGame<RoadState> = {
    id: "road",
    title: "The road",
    group: "action",
    levels: ROAD_LEVELS,
    rate: RATE,
    cover: { art: "racecar", params: { vx: 3, vy: -1 } },
    hint: "Hold the road to go faster; drag up or down to change lane. Right-click and hold to brake. Or use space to go, left arrow to brake, and up/down to steer.",
    controls: {
        arrows: { up: "Lane up", down: "Lane down", left: "Brake", right: "Go" },
        go: "Go",
        brake: "Brake",
    },
    start,
    step,
    frame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    still: { press: () => RATE / 2 },
};
