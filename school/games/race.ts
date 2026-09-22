// race: change your speed by one, then travel by the speed you have, and stop where you meant to.
//
// The fourth shape, and the one where the move is the mathematics most physically. The car has a
// position and a velocity, and a turn may change the velocity by at most one cell in each axis
// before the car travels by the velocity it then has. Nothing about that is an arithmetic step
// beside the move: a child who is doing thirty metres a turn with fifty metres left cannot stop on
// the line, and they find that out three turns earlier or not at all. Braking distance, speed as a
// thing that changes rather than a thing you set, and the difference between fast and controllable
// all arrive as consequences of the only move there is.
//
// It is one mechanic and two kinds of track, because the track shape decides the controls. On a
// track one row deep, any sideways velocity leaves it, so the moves that remain are faster, slower
// and hold: that is skip counting with consequences, and it is the grade one and two version on
// the lanes drawing that already has a scale in metres under it. On a circuit the velocity is a
// pair, all nine changes are legal, and taking a corner at three needs the turn started before the
// corner.
//
// Reversible, deliberately. Driving too fast into a corner leaves a position with legal moves and
// no win, which is the mistake the activity is about, and the prover reports those dead ends
// rather than refusing the version. Making the moves spent instead would mean a crash ends the
// round, and a five-year-old who has stalled on the straight would have nothing to do but start
// again. We can revisit it after watching a child play, which is the only evidence that settles
// it; until then a wrong turn is something to take back.
import type { Board, BoardPart, Chip, Contract, Mechanic } from "./games";

/** How wide the lanes drawing is, in squares, which is where the board beside it starts. */
const LANES_WIDE = 29;

/**
 * One cell of the track grid, in squares. It is the same number the circuit drawing is built on,
 * written twice because a mechanic names a drawing by its id and never loads one: the model has to
 * run in a plain node test with no renderer. A test asserts the two copies are the same number.
 */
export const CELL = 2;

/** A drawing beside the track. A landmark is information: it says where you are on the lap. */
export interface Trackside {
    art: string;
    params: Record<string, unknown>;
    /** Where it sits on the sheet, in squares. */
    at: [number, number];
    /** What it is called, under the drawing and in the text form. */
    name: string;
    /** The cell it stands beside, so the text form can say the car is passing it. */
    near?: [number, number];
}

export interface RaceVersion {
    /**
     * The track, one string per row of cells: "#" is track, "." is off it, "S" is the start, "F" is
     * the finish band and "C" is the marker a lap has to pass. Everything but "." can be driven on.
     */
    track: string[];
    /** The cell the car starts in, counting from nought. */
    from: [number, number];
    /** Whether the car has to come to rest on the finish, or only to cross it. */
    finish: "stop" | "reach";
    /** The fastest the car may go in one axis. It is also what bounds the position graph. */
    top: number;
    /** Which drawing the track is: the lanes seen from above, or the circuit on its grid. */
    look: "lanes" | "circuit";
    /** What the whole track is worth in metres, which the lanes drawing puts a scale under. */
    metres: number;
    /** Things beside the track. */
    around: Trackside[];
}

export interface RacePos {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Whether the lap marker has been passed, which the finish does not count without. */
    lap: boolean;
    /** Whether the finish has been taken as the version asks. Set by the move that takes it. */
    done: boolean;
    /** The cells landed on, oldest first, which is what the racing line drawn on the track is. */
    trail: [number, number][];
}

/** The change to the velocity, and the velocity it leads to, so a move can be read out in full. */
export interface RaceMove {
    dx: number;
    dy: number;
    vx: number;
    vy: number;
}

const OFF = ".";
const cellAt = (v: RaceVersion, x: number, y: number): string => v.track[y]?.[x] ?? OFF;
const drivable = (v: RaceVersion, x: number, y: number): boolean => cellAt(v, x, y) !== OFF;
const cols = (v: RaceVersion): number => v.track[0]?.length ?? 0;
const rows = (v: RaceVersion): number => v.track.length;
const cells = (v: RaceVersion): [number, number][] => {
    const out: [number, number][] = [];
    for (let y = 0; y < rows(v); y++)
        for (let x = 0; x < cols(v); x++) if (drivable(v, x, y)) out.push([x, y]);
    return out;
};
const needsLap = (v: RaceVersion): boolean => v.track.some((row) => row.includes("C"));

/**
 * The cells the car goes through on its way from one to the other, not counting the one it leaves.
 * It is walked along the straight line between the two cell centres at four points a cell, which
 * is the same line the trail draws on the track, so what the child is shown driving through is
 * what was checked.
 */
export function swept(ax: number, ay: number, bx: number, by: number): [number, number][] {
    const dx = bx - ax,
        dy = by - ay;
    const far = Math.max(Math.abs(dx), Math.abs(dy));
    if (!far) return [];
    const out: [number, number][] = [];
    const n = far * 4;
    for (let i = 1; i <= n; i++) {
        const x = Math.round(ax + (dx * i) / n),
            y = Math.round(ay + (dy * i) / n);
        if (x === ax && y === ay) continue;
        const last = out[out.length - 1];
        if (!last || last[0] !== x || last[1] !== y) out.push([x, y]);
    }
    return out;
}

/** What one cell is worth in metres, on a track whose ends are the nought and the whole of a scale. */
const perCell = (v: RaceVersion): number => v.metres / Math.max(1, cols(v) - 1);
const ARROWS: Record<string, string> = {
    "-1,-1": "↖",
    "0,-1": "↑",
    "1,-1": "↗",
    "-1,0": "←",
    "1,0": "→",
    "-1,1": "↙",
    "0,1": "↓",
    "1,1": "↘",
};
const arrow = (vx: number, vy: number): string =>
    ARROWS[`${Math.sign(vx)},${Math.sign(vy)}`] ?? "stop";
const push = (dx: number, dy: number): string => {
    const words = [
        dy < 0 ? "up" : dy > 0 ? "down" : "",
        dx < 0 ? "left" : dx > 0 ? "right" : "",
    ].filter(Boolean);
    return words.length ? `Push ${words.join(" and ")}` : "Hold it steady";
};

const LANDMARKS = [
    "pond",
    "seasontrees",
    "birdrow",
    "minibeasts",
    "signpost",
    "mapscale",
    "podium",
    "medalrow",
    "target",
    "bus",
    "tree",
];

const CONTRACT: Contract = {
    draws: ["racetrack", "racecircuit", "racecar", "scoreboard"],
    slots: {
        around: {
            doc: "Things beside the track. A landmark on the outside of a corner is something to steer by, which is why these are placed beside a cell rather than anywhere.",
            from: LANDMARKS,
            count: [1, 4],
        },
    },
    settings: {
        track: {
            doc: "The track as rows of cells, one character each: track, off it, the start, the finish, the lap marker.",
            kind: "rules",
        },
        from: {
            doc: "The cell the car starts in, counting from nought.",
            kind: "numbers",
            range: [0, 40],
        },
        finish: {
            doc: "Whether the car has to come to rest on the finish or only to cross it.",
            kind: "pick",
            values: ["stop", "reach"],
        },
        top: {
            doc: "The fastest the car may go in one axis, in cells a turn.",
            kind: "number",
            range: [1, 4],
        },
        look: {
            doc: "Which drawing the track is: the lanes from above, or the circuit on its grid.",
            kind: "pick",
            values: ["lanes", "circuit"],
        },
        metres: {
            doc: "What the whole track is worth in metres, which the lanes scale is drawn from.",
            kind: "number",
            range: [10, 400],
        },
    },
};

export const race: Mechanic<RaceVersion, RacePos, RaceMove> = {
    id: "race",
    title: "Race the track",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        const w = cols(v),
            h = rows(v);
        if (!w || !h) out.push("track= has no cells in it");
        if (v.track.some((row) => row.length !== w))
            out.push("every row of track= has to be the same length, or the grid is not a grid");
        if (v.track.some((row) => /[^.#SFC]/.test(row)))
            out.push('track= may only use "." off the track, "#" on it, "S", "F" and "C"');
        const [fx, fy] = v.from;
        if (!drivable(v, fx, fy))
            out.push(
                `the car starts in column ${fx + 1}, row ${fy + 1}, which is not on the track`,
            );
        const flags = cells(v).filter(([x, y]) => cellAt(v, x, y) === "F");
        if (!flags.length) out.push("track= has no finish in it, so there is nothing to reach");
        if (cellAt(v, fx, fy) === "F") out.push("the car starts on the finish");
        if (v.top < 1) out.push(`top=${v.top} means the car can never move`);
        if (v.top > 4)
            out.push(
                `top=${v.top} is faster than a child can plan a stop from, and it makes the search four times the size`,
            );
        if (v.look === "lanes") {
            if (h !== 1)
                out.push(
                    `the lanes drawing is one lane deep, and this track is ${h} rows, so it would not be drawn`,
                );
            if (w !== 11)
                out.push(
                    `the lanes drawing divides its scale into ten, so a lanes track has to be 11 cells, not ${w}`,
                );
            if (v.metres % 10)
                out.push(
                    `metres=${v.metres} does not divide into the ten marks the scale draws, so the numbers under the track would not be whole`,
                );
        }
        if (v.look === "lanes" && flags.some(([x, y]) => drivable(v, x + 1, y))) {
            out.push(
                "on a lanes track the finish has to be the last cell, because the drawing puts the chequered band at the end",
            );
        }
        // The graph is the track by every velocity by the two things the position remembers, and a
        // version we cannot search is one we can promise nothing about, so it is refused with the
        // number rather than left to come back as a capped search.
        const size = cells(v).length * (2 * v.top + 1) ** 2 * 4;
        if (size > 20000)
            out.push(
                `this track has ${cells(v).length} cells at up to ${v.top} a turn, which is about ${size} positions and over what the prover may look at`,
            );
        for (const thing of v.around) {
            if (!LANDMARKS.includes(thing.art))
                out.push(
                    `around= names ${thing.art}, which is not one of the drawings this mechanic puts beside a track`,
                );
            if (!thing.name)
                out.push(
                    `the ${thing.art} beside the track has no name, so the text form cannot say the car is passing it`,
                );
        }
        return [...new Set(out)];
    },

    goal: (v) =>
        v.look === "lanes"
            ? `Stop exactly on the finish at ${v.metres} metres. Each turn you can go one step faster, one step slower, or hold.`
            : "Drive a whole lap, past the lap marker, and cross the chequered finish. Each turn you can change your speed by one cell.",

    bounds: (v) => ({
        solution: v.look === "lanes" ? [5, 10] : [10, 26],
        budget: v.look === "lanes" ? 14 : 34,
        patience: 1.5,
        branch: v.look === "lanes" ? 3 : 9,
        positions: 20000,
    }),

    start: (v) => ({
        x: v.from[0],
        y: v.from[1],
        vx: 0,
        vy: 0,
        lap: !needsLap(v),
        done: false,
        trail: [[v.from[0], v.from[1]]],
    }),

    // Nine changes, in reading order, so the pad is the same pad every time. A change that would
    // take the car over the kerb is not offered, which is where the mathematics sits: the child has
    // to see that at three cells a turn the corner is already gone. Standing still and choosing to
    // stand still is not a move, so the graph has no place a child can sit in for ever.
    moves: (s, v) => {
        const out: RaceMove[] = [];
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                const vx = s.vx + dx,
                    vy = s.vy + dy;
                if (Math.abs(vx) > v.top || Math.abs(vy) > v.top) continue;
                if (!vx && !vy && !s.vx && !s.vy) continue;
                const path = swept(s.x, s.y, s.x + vx, s.y + vy);
                if (path.some(([x, y]) => !drivable(v, x, y))) continue;
                out.push({ dx, dy, vx, vy });
            }
        return out;
    },

    apply: (s, m, v) => {
        const x = s.x + m.vx,
            y = s.y + m.vy;
        const path = swept(s.x, s.y, x, y);
        const lap = s.lap || path.some(([cx, cy]) => cellAt(v, cx, cy) === "C");
        const took =
            v.finish === "stop"
                ? !m.vx && !m.vy && cellAt(v, x, y) === "F"
                : path.some(([cx, cy]) => cellAt(v, cx, cy) === "F");
        return { x, y, vx: m.vx, vy: m.vy, lap, done: lap && took, trail: [...s.trail, [x, y]] };
    },

    won: (s) => s.done,

    // The racing line is drawn and is deliberately not in the key: two children at the same cell,
    // at the same speed, with the lap behind them, have the same race in front of them.
    key: (s) => `${s.x},${s.y},${s.vx},${s.vy},${s.lap ? 1 : 0},${s.done ? 1 : 0}`,

    say: (s, v) => {
        const per = perCell(v);
        const where =
            v.look === "lanes"
                ? `You are at ${s.x * per} metres of ${v.metres}.`
                : `The car is in column ${s.x + 1}, row ${s.y + 1}.`;
        const speed =
            !s.vx && !s.vy
                ? "You are stopped."
                : v.look === "lanes"
                  ? `You are travelling ${Math.abs(s.vx) * per} metres a turn${s.vx < 0 ? ", backwards" : ""}.`
                  : `You are travelling ${cellWords(s.vx, s.vy)} a turn.`;
        const near = v.around.find(
            (t) => t.near && Math.abs(t.near[0] - s.x) <= 1 && Math.abs(t.near[1] - s.y) <= 1,
        );
        const lap = needsLap(v)
            ? s.lap
                ? " The lap marker is behind you."
                : " You have not passed the lap marker yet."
            : "";
        return `${where} ${speed}${lap}${near ? ` You are passing ${near.name}.` : ""}`;
    },

    sayMove: (m, v) => {
        if (v.look === "lanes") {
            if (!m.vx) return "Brake to a stop";
            // Faster or slower is about the speed rather than about the sign: pushing from nought to one
            // the wrong way is speeding up backwards, and calling that slowing down would be a lie.
            const was = Math.abs(m.vx - m.dx),
                now = Math.abs(m.vx);
            const how = now > was ? "Speed up to" : now < was ? "Slow to" : "Hold";
            return `${how} ${now * perCell(v)} metres a turn${m.vx < 0 ? " backwards" : ""}`;
        }
        return `${push(m.dx, m.dy)}, now ${m.vx || m.vy ? cellWords(m.vx, m.vy) : "stopped"}`;
    },

    board: (s, v): Board => {
        const parts: BoardPart[] = [];
        if (v.look === "lanes") {
            parts.push({
                art: "racetrack",
                key: "track",
                at: { x: 0, y: 0 },
                params: { lanes: 1, along: [s.x / Math.max(1, cols(v) - 1)], metres: v.metres },
                marks: [{ mark: "loop", at: "finish" }],
            });
        } else {
            parts.push({
                art: "racecircuit",
                key: "track",
                at: { x: 0, y: 0 },
                params: { track: v.track, trail: s.trail.map(([x, y]) => [x + 1, y + 1]) },
            });
            // The car is its own part with a key that outlives the move, so a turn slides it to where it
            // ended up rather than drawing it there. The arrow on it is as long as the speed, which is
            // the braking distance drawn a turn before it is needed.
            parts.push({
                art: "racecar",
                key: "car",
                at: { x: 2 + s.x * CELL, y: 2 + s.y * CELL },
                params: { vx: s.vx, vy: s.vy },
            });
        }
        // Trackside things carry no caption: what they are is in the drawing, and what they mean is in
        // the text form, which says the car is passing one when it is. A word under a pond inside a
        // circuit would land on the track.
        for (const thing of v.around) {
            parts.push({
                art: thing.art,
                key: `side:${thing.art}:${thing.at.join(",")}`,
                at: { x: thing.at[0], y: thing.at[1] },
                params: thing.params,
            });
        }
        // The board says the speed and the turns taken, which are both in the position and both worth
        // having as numbers, because "three cells a turn" is the thing the child is deciding about. It
        // stands beside the track rather than under it: a track is already as tall as it is, and a
        // board stacked underneath pushes the moves off the bottom of the screen.
        parts.push({
            art: "scoreboard",
            key: "board",
            at: { x: (v.look === "lanes" ? LANES_WIDE : cols(v) * CELL + 3) + 1, y: 0 },
            params: {
                // Two short words: the board's drawing is as wide as the longer of them, and a wide board
                // pushes the podium off the sheet.
                home: v.look === "lanes" ? "metres" : "cells",
                away: "turns",
                scores: [
                    v.look === "lanes"
                        ? Math.abs(s.vx) * perCell(v)
                        : Math.max(Math.abs(s.vx), Math.abs(s.vy)),
                    s.trail.length - 1,
                ],
                // The note says the rule or the lap, never how far there is left to go: reading that off
                // the scale under the track is the arithmetic the activity is about.
                note:
                    v.look === "lanes"
                        ? "stop on the line, not past it"
                        : s.lap
                          ? "the lap marker is behind you"
                          : "the lap marker is still to come",
            },
        });
        return { parts };
    },

    chip: (m, v): Chip => ({
        // The pad is the change to the velocity, laid out where the change points: faster is above
        // slower and left is left of right. On a track one row deep only the middle column is legal,
        // so the same pad becomes the three buttons a five-year-old needs.
        spot: [m.dy + 1, m.dx + 1],
        text: arrow(m.vx, m.vy),
        // The number is the cells the car will cover along the way it is mostly going, which is the
        // same number the trackside board shows, so the chip and the board agree.
        note:
            v.look === "lanes"
                ? `${Math.abs(m.vx) * perCell(v)} m`
                : m.vx || m.vy
                  ? String(Math.max(Math.abs(m.vx), Math.abs(m.vy)))
                  : "",
        group: "Your next turn",
    }),
};

/** A velocity in words, in cells, which is how the circuit talks about distance. */
function cellWords(vx: number, vy: number): string {
    const bits = [
        vx
            ? `${Math.abs(vx)} cell${Math.abs(vx) === 1 ? "" : "s"} ${vx > 0 ? "right" : "left"}`
            : "",
        vy ? `${Math.abs(vy)} cell${Math.abs(vy) === 1 ? "" : "s"} ${vy > 0 ? "down" : "up"}` : "",
    ].filter(Boolean);
    return bits.join(" and ");
}
