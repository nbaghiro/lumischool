import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { DIRS, parse, run, upTo, world, type Dir, type World } from "../../coding";
import { COLOUR_FILL } from "./listing";
import { ANGLE, turnedCtx, bump, gridLay, gridLines } from "./grid";

/** The world a turtle's settings describe: an open grid with the pen down. */
export const turtleOf = (p: {
    cols: number;
    rows: number;
    col: number;
    row: number;
    face: Dir;
}): World =>
    world({
        cols: p.cols,
        rows: p.rows,
        start: { col: p.col, row: p.row },
        face: p.face,
        pen: true,
    });

export function turtleShape<G>(c: Ctx<G>, x: number, y: number, face: Dir) {
    const t = turnedCtx(c, x, y, ANGLE[face]),
        { pen, g } = t;
    for (const [dx, dy] of [
        [-6, -10],
        [6, -10],
        [-6, 10],
        [6, 10],
    ] as const)
        pen.ellipse(g, dx, dy, 7, 6, "pencil", pen.fill("mint"), { strokeWidth: 1.2 });
    pen.ellipse(g, 13, 0, 10, 8, "pencil", pen.fill("mint"), { strokeWidth: 1.4 });
    pen.ellipse(g, 0, 0, 24, 19, "pencil", pen.fill("mint"), { strokeWidth: 1.8 });
    pen.path(g, "M-7 -5L0 -8L7 -5L7 5L0 8L-7 5Z", "pencil", null, {
        strokeWidth: 1,
        stroke: c.t.ink,
    });
}

interface TurtleParams {
    cols: number;
    rows: number;
    col: number;
    row: number;
    face: Dir;
    moves: string[];
    upto: number;
    show: boolean;
    mark: boolean;
    target: string[];
}

export const turtle = defineDrawing<TurtleParams>({
    id: "turtle",
    family: "coding",
    title: "Turtle on a grid",
    group: "Structures",
    about: "A turtle with a pen on squared paper, and the line its program draws, from a start ring to wherever the moves end. The line is drawn by the same interpreter the checker and the runner use, so it cannot disagree with the program beside it. The turtle can move by arrows or by forward and turn, lift its pen, change colour and repeat. `target` draws a faint dashed shape the program is meant to draw, which is what a debugging question compares against.",
    params: {
        cols: 10,
        rows: 8,
        col: 2,
        row: 7,
        face: "right",
        moves: ["right 4", "up 4", "left 4", "down 4"],
        upto: -1,
        show: true,
        mark: true,
        target: [] as string[],
    },
    settings: {
        cols: { kind: "whole", min: 2, max: 16 },
        rows: { kind: "whole", min: 2, max: 12 },
        col: { kind: "whole", min: 1, max: 16 },
        row: { kind: "whole", min: 1, max: 12 },
        face: { kind: "one of", of: DIRS },
        moves: { kind: "words", most: 12 },
        upto: { kind: "whole", min: -1, max: 40 },
        show: { kind: "flag" },
        mark: { kind: "flag" },
        target: { kind: "words", most: 12 },
    },
    takes: [
        {
            label: "A square walked",
            params: {
                cols: 10,
                rows: 8,
                col: 2,
                row: 7,
                face: "right",
                moves: ["repeat 4", "  forward 4", "  turn left"],
                upto: -1,
                show: true,
                mark: true,
                target: [],
            },
        },
        {
            label: "Where it starts",
            params: {
                cols: 10,
                rows: 8,
                col: 2,
                row: 7,
                face: "up",
                moves: [],
                upto: -1,
                show: true,
                mark: true,
                target: [],
            },
        },
        {
            label: "Stairs",
            params: {
                cols: 10,
                rows: 8,
                col: 1,
                row: 7,
                face: "right",
                moves: ["repeat 3", "  right 2", "  up 2"],
                upto: -1,
                show: true,
                mark: true,
                target: [],
            },
        },
        {
            label: "Short of its target",
            params: {
                cols: 8,
                rows: 7,
                col: 2,
                row: 6,
                face: "right",
                moves: ["right 4", "up 4", "left 3", "down 4"],
                upto: -1,
                show: true,
                mark: true,
                target: ["right 4", "up 4", "left 4", "down 4"],
            },
        },
    ],
    box: (p) => ({ w: p.cols * 2 + 3, h: p.rows * 2 + 3 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            L = gridLay(),
            w = turtleOf(p);
        gridLines(c, p.cols, p.rows, true, a);
        if (p.target.length) {
            const t = run(parse(p.target), w);
            for (const s of t.segments) {
                const [x0, y0] = L.at(s.from.col, s.from.row),
                    [x1, y1] = L.at(s.to.col, s.to.row);
                c.pen.line(c.g, x0, y0, x1, y1, "ruler", {
                    strokeWidth: 6,
                    // the palest token, so the target stays under the line the program draws
                    stroke: c.t.grid,
                });
            }
        }
        const r = run(parse(p.moves), w),
            part = upTo(r, p.upto);
        if (p.show)
            for (const s of part.segments) {
                const [x0, y0] = L.at(s.from.col, s.from.row),
                    [x1, y1] = L.at(s.to.col, s.to.row);
                c.pen.line(c.g, x0, y0, x1, y1, "pencil", {
                    strokeWidth: 3,
                    stroke: s.colour === "black" || c.paper ? c.t.ink : c.t[COLOUR_FILL[s.colour]],
                });
            }
        const [sx, sy] = L.at(w.start.col, w.start.row);
        c.pen.circle(c.g, sx, sy, 0.9 * U, "ruler", c.pen.fill("card"), { strokeWidth: 1.8 });
        a.start = [sx, sy - U, "up"];
        const last = part.frames[part.frames.length - 1];
        if (last?.bump) {
            const [bx, by] = L.at(part.state.col, part.state.row),
                [tx, ty] = L.at(last.bump.col, last.bump.row);
            bump(c, (bx + tx) / 2, (by + ty) / 2);
        }
        const [ex, ey] = L.at(part.state.col, part.state.row);
        if (p.mark) {
            turtleShape(c, ex, ey, part.state.face);
            a.turtle = [ex, ey - 1.4 * U, "up"];
        }
        a.end = [ex, ey, "up"];
        return a;
    },
    describe: (p) =>
        `A turtle with a pen on squared paper at its start ring, facing the way it starts${p.show ? ", its moves written beside the paper" : ", the paper ruled in squares"}.`,
    reads: true,
});
