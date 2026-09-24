// The race, bound to hands: the circuit. The straight, which was played here too, is Row to the
// jetty (row.ts) now; the reading of the lanes board stays, since it is the mechanic's own.
//
// The race mechanic in race.ts is untouched: a move changes the velocity by one cell in each axis
// and the car travels by the velocity it then has, and a change that would take the car over the
// kerb is not offered. What this file adds is the aim. The car's arrow already says where it is
// going; the child takes hold of its tip and drags it, the nearest of the landings the moves lead
// to is ringed and a ghost of the car stands on it with the arrow it would then have, and letting
// go plays that move. The car then travels the whole move on a spring rather than appearing where
// it lands, and the trail draws behind it as it already does.
//
// A crash is a position with no moves: the car is going too fast for every change to keep it on
// the track. The mechanic already knows it and the prover counts it; the view makes it visible by
// drawing the car's own arrow on past the kerb and saying so, and a take-back undoes it.
import { atLeast, type Pt } from "../../engine/motion/geometry";
import type { Choice, Ctx, Handle, Session } from "./hands";
import type { Target } from "./pieces";
import type { Part } from "../../engine/motion/scene";
import { SPRINGS } from "../../engine/motion/spring";
import { timeline, easeBack } from "../../engine/motion/timeline";
import { ACTIVITIES } from "./activities";
import type { TurnGame } from "./game";
import { CELL, race, type RaceVersion } from "./race";
import { bind, type Activity, type Position, type Round } from "./games";

/** What the circuit's parts say: where the car is and how fast it is going, in cells. */
export interface ReadCar {
    x: number;
    y: number;
    vx: number;
    vy: number;
    lanes: boolean;
}

export function readCar(pos: Position, perCell: number): ReadCar | null {
    const board = pos.board;
    const car = board.parts.find((p) => p.art === "racecar");
    if (car?.at) {
        const p = car.params as { vx?: number; vy?: number };
        return {
            x: (car.at.x - 2) / CELL,
            y: (car.at.y - 2) / CELL,
            vx: p.vx ?? 0,
            vy: p.vy ?? 0,
            lanes: false,
        };
    }
    const track = board.parts.find((p) => p.art === "racetrack");
    if (track) {
        // The lanes drawing shows where the runner is and not how fast, so the speed is read off the
        // position's own words, which is the same sentence a screen reader gets.
        const along = ((track.params as { along?: number[] }).along ?? [0])[0] ?? 0;
        const m = /travelling (\d+) metres a turn(, backwards)?/.exec(pos.say);
        const cells = m ? Math.round(Number(m[1]) / perCell) : 0;
        return { x: Math.round(along * 10), y: 0, vx: m?.[2] ? -cells : cells, vy: 0, lanes: true };
    }
    return null;
}

/** The centre of a cell on the sheet, in squares. */
export const cellCentre = (cx: number, cy: number): Pt => ({
    x: 2 + cx * CELL + CELL / 2,
    y: 2 + cy * CELL + CELL / 2,
});

/** On the lanes drawing, where a cell's runner stands: the track is 24 squares over ten steps from x = 3. */
export const laneCentre = (cx: number): Pt => ({ x: 3 + (24 * cx) / 10, y: 1.4 + 1 });

/** The velocity a move leads to, read back off the move's own words. */
export function velocityOf(
    say: string,
    lanes: boolean,
    perCell: number,
): { vx: number; vy: number } {
    if (lanes) {
        const m = /(\d+) metres a turn( backwards)?/.exec(say);
        if (!m) return { vx: 0, vy: 0 };
        const cells = Math.round(Number(m[1]) / perCell);
        return { vx: m[2] ? -cells : cells, vy: 0 };
    }
    if (say.endsWith("now stopped")) return { vx: 0, vy: 0 };
    const right = /(\d+) cells? right/.exec(say),
        left = /(\d+) cells? left/.exec(say);
    const down = /(\d+) cells? down/.exec(say),
        up = /(\d+) cells? up/.exec(say);
    return {
        vx: right ? Number(right[1]) : left ? -Number(left[1]) : 0,
        vy: down ? Number(down[1]) : up ? -Number(up[1]) : 0,
    };
}

/**
 * The one handle: the tip of the arrow, with a landing per move at the cell the car would reach.
 * The landings are the moves, so the ghost can only ever stand where the mechanic allows.
 */
export function aimHandle(
    pos: Position,
    car: ReadCar,
    o: { minTarget: number; perCell: number },
): Handle {
    const centre = car.lanes ? laneCentre(car.x) : cellCentre(car.x, car.y);
    const tip = car.lanes
        ? { x: centre.x + (car.vx * 24) / 10, y: centre.y }
        : { x: centre.x + car.vx * CELL, y: centre.y + car.vy * CELL };
    const targets: Target<Choice>[] = pos.moves.map((m, i) => {
        const v = velocityOf(m.say, car.lanes, o.perCell);
        const at = car.lanes ? laneCentre(car.x + v.vx) : cellCentre(car.x + v.vx, car.y + v.vy);
        const shape = atLeast({ cx: at.x, cy: at.y, r: car.lanes ? 0.9 : CELL / 2 }, o.minTarget);
        return { id: `land:${i}`, shape, carries: { moves: [i] } };
    });
    return {
        key: car.lanes ? "" : "car",
        mode: "aim",
        // The tip of the arrow, and the car itself, since a child takes hold of the car as readily.
        hit: [
            atLeast({ cx: tip.x, cy: tip.y, r: car.lanes ? 1 : CELL / 2 }, o.minTarget),
            atLeast({ cx: centre.x, cy: centre.y, r: car.lanes ? 1 : CELL / 2 }, o.minTarget),
        ],
        home: car.lanes ? centre : { x: 2 + car.x * CELL, y: 2 + car.y * CELL },
        targets,
        reach: car.lanes ? 1.4 : CELL * 0.75,
    };
}

const RING = [
    "######C######",
    "######C######",
    "##.........##",
    "##.........##",
    "##.........##",
    "##.........##",
    "#####FS######",
    "#####FS######",
];
const CHICANE = [
    "######C#####",
    "######C#####",
    "##......####",
    "##......####",
    "####......##",
    "####......##",
    "#####FS#####",
];

const extra: Activity<RaceVersion> = {
    id: "race.take-the-corner.more",
    title: "Take the corner",
    kind: "race",
    skills: ["coordinates.grid", "speed.acceleration", "planning-ahead"],
    grades: [3, 4],
    paper: "coords.plot-the-route",
    versions: [
        {
            values: "the ring, and stop on the finish",
            v: {
                track: RING,
                from: [6, 7],
                finish: "stop",
                top: 3,
                look: "circuit",
                metres: 0,
                around: [],
            },
        },
        {
            values: "the chicane, and stop on the finish",
            v: {
                track: CHICANE,
                from: [6, 6],
                finish: "stop",
                top: 3,
                look: "circuit",
                metres: 0,
                around: [],
            },
        },
    ],
};

const corners = ACTIVITIES.find((a) => a.id === "race.take-the-corner");
if (!corners) throw new Error("the race circuit's levels need the activity race.take-the-corner");

/** What one cell is worth in metres on the lanes, read off the goal sentence. */
export const perCellOf = (round: Round): number => {
    const m = /finish at (\d+) metres/.exec(round.goal);
    return m ? Number(m[1]) / 10 : 1;
};

function open(round: Round, ctx: Ctx): Session<Position> {
    const perCell = perCellOf(round);
    const clear = (): void => {
        ctx.stage.remove("ghost");
        ctx.stage.marks("aim", []);
    };
    return {
        glide: SPRINGS.drive,
        parts(pos) {
            return pos.board;
        },
        handles(pos) {
            const car = readCar(pos, perCell);
            return car ? [aimHandle(pos, car, { minTarget: ctx.minTarget(), perCell })] : [];
        },
        preview(pos, _h, at) {
            const car = readCar(pos, perCell);
            const i = at.target?.carries.moves[0];
            const move = i === undefined ? undefined : pos.moves[i];
            if (!car || !move) {
                clear();
                return;
            }
            const centre = car.lanes ? laneCentre(car.x) : cellCentre(car.x, car.y);
            const v = velocityOf(move.say, car.lanes, perCell);
            const landing = car.lanes
                ? laneCentre(car.x + v.vx)
                : cellCentre(car.x + v.vx, car.y + v.vy);
            ctx.stage.marks("aim", [
                {
                    kind: "line",
                    a: centre,
                    b: {
                        x: centre.x + car.vx * (car.lanes ? perCell : CELL),
                        y: centre.y + (car.lanes ? 0 : car.vy * CELL),
                    },
                    style: "thin",
                },
                { kind: "line", a: centre, b: landing, style: "aim" },
                { kind: "ring", x: landing.x, y: landing.y, r: 0.45 },
            ]);
            if (!car.lanes) {
                const ghost: Part = {
                    art: "racecar",
                    key: "ghost",
                    at: { x: landing.x - CELL / 2, y: landing.y - CELL / 2 },
                    params: { vx: v.vx, vy: v.vy },
                    z: 150,
                };
                ctx.stage.show({ parts: [ghost] }, { keep: true });
                ctx.stage.tag("ghost", "ghost", true);
            }
        },
        unpreview: clear,
        after(pos) {
            const car = readCar(pos, perCell);
            if (!car || pos.won || pos.moves.length || car.lanes) {
                ctx.stage.marks("crash", []);
                return;
            }
            // Nowhere to go: the arrow drawn on past the kerb, and a puff where it ends.
            const centre = cellCentre(car.x, car.y);
            const end = { x: centre.x + car.vx * CELL * 1.5, y: centre.y + car.vy * CELL * 1.5 };
            ctx.stage.marks("crash", [
                { kind: "line", a: centre, b: end, style: "crash" },
                ...(
                    [
                        [0, 0, 0.55],
                        [0.5, -0.4, 0.38],
                        [-0.4, -0.55, 0.3],
                    ] as const
                ).map(([dx, dy, r]) => ({
                    kind: "puff" as const,
                    x: end.x + dx,
                    y: end.y + dy,
                    r,
                })),
            ]);
        },
    };
}

const ends = {
    won: "That is the finish.",
    stuck: "There is nowhere to go at this speed. Take a turn back and come in slower.",
};
const win = timeline(
    [{ name: "star", from: 0, to: 1, at: 0.5, dur: 0.4, ease: easeBack }],
    [
        { at: 0.05, cue: "level" },
        { at: 0.6, cue: "win" },
    ],
);

export const raceGame: TurnGame = {
    id: "race",
    title: "Take the corner",
    group: "hands",
    cover: {
        art: "racecircuit",
        params: {
            track: [
                "######C######",
                "######C######",
                "##.........##",
                "##.........##",
                "##.........##",
                "##.........##",
                "#####FS######",
                "#####FS######",
            ],
            trail: [
                [7, 8],
                [9, 8],
                [12, 8],
                [13, 6],
            ],
        },
    },
    hint: "Drag the tip of the car's arrow to where it should land, and let go",
    levels: [
        { title: "The ring, cross the finish", grades: [3, 4], round: () => corners.round(0) },
        {
            title: "The ring, stop on the finish",
            grades: [3, 4],
            round: () => bind(race, extra, 0),
        },
        { title: "The chicane, cross the finish", grades: [3, 4], round: () => corners.round(1) },
        {
            title: "The chicane, stop on the finish",
            grades: [4, 4],
            round: () => bind(race, extra, 1),
        },
    ],
    ends,
    win,
    open,
};
