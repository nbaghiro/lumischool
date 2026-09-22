import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";
import { type Pt, ray, mirrorStrip, torchAt } from "./optics";

type Dir = [number, number];

/** What a mirror maze holds, read off its settings: squares across and down, the torch's row, mirrors and the lettered goals. */
interface Maze {
    cols: number;
    rows: number;
    torch: number;
    mirrors: Map<string, "/" | "\\">;
    goals: { letter: string; at: string }[];
}

const cellOf = (s: string): [number, number] | null => {
    const m = /^([A-Ha-h])([1-8])$/.exec(s.trim());
    return m ? [(m[1] ?? "").toUpperCase().charCodeAt(0) - 64, Number(m[2])] : null;
};

export function mazeOf(p: {
    cols: number;
    rows: number;
    torch: number;
    rise: readonly string[];
    fall: readonly string[];
    goals: readonly string[];
}): Maze {
    const cols = Math.max(2, Math.min(8, Math.round(p.cols))),
        rows = Math.max(2, Math.min(6, Math.round(p.rows)));
    const mirrors = new Map<string, "/" | "\\">();
    for (const [list, kind] of [
        [p.rise, "/"],
        [p.fall, "\\"],
    ] as const)
        for (const s of list) {
            const at = cellOf(s);
            if (at && at[0] <= cols && at[1] <= rows) mirrors.set(`${at[0]},${at[1]}`, kind);
        }
    return {
        cols,
        rows,
        torch: Math.max(1, Math.min(rows, Math.round(p.torch))),
        mirrors,
        goals: p.goals.map((at, i) => ({
            letter: "ABCDEFGH"[i] ?? "?",
            at: at.trim().toUpperCase(),
        })),
    };
}

/**
 * Where the torch's beam goes: in from the left of its row, turning a right angle at each mirror,
 * until it leaves the box. It is named where it leaves (T3 is out of the top of the third column,
 * R2 out of the right of the second row), which is how the goals are placed.
 */
export function traceMaze(m: Maze): {
    cells: [number, number, boolean][];
    exit: string;
    bounces: number;
} {
    let col = 1,
        row = m.torch,
        d: Dir = [1, 0],
        bounces = 0;
    const cells: [number, number, boolean][] = [];
    for (let step = 0; step < 200; step++) {
        if (col < 1 || col > m.cols || row < 1 || row > m.rows) break;
        const mir = m.mirrors.get(`${col},${row}`);
        if (mir === "/") d = [-d[1], -d[0]];
        else if (mir === "\\") d = [d[1], d[0]];
        if (mir) bounces++;
        cells.push([col, row, !!mir]);
        col += d[0];
        row += d[1];
    }
    const exit =
        row < 1 ? `T${col}` : row > m.rows ? `B${col}` : col > m.cols ? `R${row}` : `L${row}`;
    return { cells, exit, bounces };
}

export const mirrors = defineDrawing({
    id: "mirrors",
    family: "science",
    title: "Mirror maze",
    group: "Structures",
    about: "A box of squares with a torch shining in from the left and mirrors standing corner to corner in some of the squares, and lettered goals round the edge. A beam runs along a row until it meets a mirror, which turns it through a right angle, so the path can be followed square by square and the goal it reaches is worked out, not guessed. With `show` at 0 the beam is left for the child to draw. A mirror is placed by its square, column letter then row number, in `rise` for one that climbs to the right and `fall` for one that drops.",
    params: {
        cols: 5,
        rows: 4,
        torch: 2,
        rise: [] as string[],
        fall: [] as string[],
        goals: [] as string[],
        show: 1,
    },
    settings: {
        cols: { kind: "whole", min: 2, max: 8 },
        rows: { kind: "whole", min: 2, max: 6 },
        torch: { kind: "whole", min: 1, max: 6 },
        rise: { kind: "words", most: 8 },
        fall: { kind: "words", most: 8 },
        goals: { kind: "words", most: 8 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "One mirror",
            params: {
                cols: 5,
                rows: 4,
                torch: 2,
                rise: ["C2"],
                fall: ["C4"],
                goals: ["T3", "R4", "B2"],
                show: 1,
            },
        },
        {
            label: "Three bounces",
            params: {
                cols: 6,
                rows: 4,
                torch: 1,
                rise: ["E3"],
                fall: ["B1", "B3"],
                goals: ["T5", "R3", "B2", "R4"],
                show: 1,
            },
        },
        {
            label: "Follow it yourself",
            params: {
                cols: 6,
                rows: 4,
                torch: 3,
                rise: ["D3", "D1"],
                fall: ["F1"],
                goals: ["T4", "B6", "R1", "B4"],
                show: 0,
            },
        },
    ],
    box: (p) => {
        const m = mazeOf(p);
        return { w: m.cols * 2 + 5, h: m.rows * 2 + 4 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            m = mazeOf(p),
            S = 2 * U,
            gx = 3.2 * U,
            gy = 2 * U;
        const cx = (col: number) => gx + (col - 0.5) * S,
            cy = (row: number) => gy + (row - 0.5) * S;
        const W = m.cols * S,
            H = m.rows * S;
        for (let k = 1; k < m.cols; k++)
            pen.line(g, gx + k * S, gy, gx + k * S, gy + H, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
                strokeLineDash: [3, 5],
            });
        for (let k = 1; k < m.rows; k++)
            pen.line(g, gx, gy + k * S, gx + W, gy + k * S, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
                strokeLineDash: [3, 5],
            });
        pen.rect(g, gx, gy, W, H, "ruler", null, { strokeWidth: 2.4 });
        // the torch sits outside the box, its lens against the left wall of its row
        torchAt(c, gx - 0.3 * U, cy(m.torch));
        a.torch = [gx - 1.5 * U, cy(m.torch) - 0.6 * U, "up"];
        const out = (at: string): Pt | null => {
            const k = Number(at.slice(1));
            if (at[0] === "T" && k >= 1 && k <= m.cols) return [cx(k), gy - 0.9 * U];
            if (at[0] === "B" && k >= 1 && k <= m.cols) return [cx(k), gy + H + 0.9 * U];
            if (at[0] === "R" && k >= 1 && k <= m.rows) return [gx + W + 0.9 * U, cy(k)];
            if (at[0] === "L" && k >= 1 && k <= m.rows) return [gx - 0.9 * U, cy(k)];
            return null;
        };
        if (p.show > 0) {
            const t = traceMaze(m),
                pts: Pt[] = [[gx - 0.2 * U, cy(m.torch)]];
            for (const [col, row, turn] of t.cells) if (turn) pts.push([cx(col), cy(row)]);
            const end = out(t.exit);
            if (end)
                pts.push([
                    end[0] + (t.exit[0] === "R" ? -0.5 * U : t.exit[0] === "L" ? 0.5 * U : 0),
                    end[1] + (t.exit[0] === "T" ? 0.5 * U : t.exit[0] === "B" ? -0.5 * U : 0),
                ]);
            ray(c, pts);
        }
        for (const [key, kind] of m.mirrors) {
            const [col, row] = key.split(",").map(Number),
                x = cx(col ?? 0),
                y = cy(row ?? 0),
                h = 0.78 * U;
            mirrorStrip(
                c,
                kind === "/" ? [x - h, y + h] : [x - h, y - h],
                kind === "/" ? [x + h, y - h] : [x + h, y + h],
            );
        }
        for (const goal of m.goals) {
            const at = out(goal.at);
            if (!at) continue;
            pen.circle(g, at[0], at[1], 1.3 * U, "ruler", pen.fill("mint"), { strokeWidth: 1.8 });
            patch(c, at[0], at[1], 16, 16);
            say(c, at[0], at[1] + 6, goal.letter, 16);
            a[`goal(${goal.letter})`] = [at[0], at[1] - 0.7 * U, "up"];
        }
        return a;
    },
    describe: () =>
        "A box of squares with a torch shining in from the left, mirrors standing corner to corner in some squares and lettered goals round the edge.",
    reads: true,
});
