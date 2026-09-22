import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import {
    DIRS,
    cellOf,
    mazeWorld,
    parse,
    run,
    upTo,
    type Dir,
    type Run,
    type World,
} from "../../coding";
import { paintFill } from "./listing";
import { ANGLE, turnedCtx, bump, gridLay, gridLines } from "./grid";

/**
 * The robot, seen from above, facing right before it is turned: a round body with its visor and
 * eyes at the front, wheels at its sides and its aerial at the back, so which way it faces can be
 * read in black and white.
 */
export function drawBot<G>(c: Ctx<G>, x: number, y: number, face: Dir, size = 1): void {
    const t = turnedCtx(c, x, y, ANGLE[face]),
        { pen, g } = t,
        s = size;
    for (const side of [-1, 1])
        pen.rect(
            g,
            -9 * s,
            side * 13 * s - 3 * s,
            16 * s,
            6 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
    pen.path(g, roundedRect(-13 * s, -12 * s, 26 * s, 24 * s, 8 * s), "pencil", pen.fill("sky"), {
        strokeWidth: 1.8,
    });
    pen.path(g, roundedRect(3 * s, -9 * s, 8 * s, 18 * s, 4 * s), "ruler", pen.fill("card"), {
        strokeWidth: 1.4,
    });
    for (const ey of [-4.5, 4.5])
        pen.circle(
            g,
            7.5 * s,
            ey * s,
            3.6 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
    pen.line(g, -8 * s, 0, -15 * s, 0, "ruler", { strokeWidth: 1.6 });
    pen.circle(g, -17 * s, 0, 5 * s, "ruler", pen.fill("glow"), { strokeWidth: 1.3 });
}

function gem<G>(c: Ctx<G>, x: number, y: number, got = false) {
    const { pen, g } = c;
    const pts: [number, number][] = [
        [x - 10, y - 3],
        [x - 5, y - 9],
        [x + 5, y - 9],
        [x + 10, y - 3],
        [x, y + 10],
    ];
    if (got) {
        pen.polygon(g, pts, "pencil", null, {
            strokeWidth: 1.2,
            strokeLineDash: [4, 4],
            stroke: c.t["ink-soft"],
        });
        return;
    }
    pen.polygon(g, pts, "ruler", pen.fill("berry"), { strokeWidth: 1.6 });
    pen.linear(
        g,
        [
            [x - 10, y - 3],
            [x + 10, y - 3],
        ],
        "ruler",
        { strokeWidth: 1 },
    );
    pen.linear(
        g,
        [
            [x - 4, y - 3],
            [x, y + 10],
            [x + 4, y - 3],
        ],
        "ruler",
        { strokeWidth: 1 },
    );
}

function flag<G>(c: Ctx<G>, x: number, y: number) {
    const { pen, g } = c;
    pen.line(g, x - 7, y + 13, x - 7, y - 14, "ruler", { strokeWidth: 2.2 });
    pen.polygon(
        g,
        [
            [x - 7, y - 14],
            [x + 11, y - 8],
            [x - 7, y - 2],
        ],
        "pencil",
        pen.fill("tang"),
        { strokeWidth: 1.6 },
    );
    pen.ellipse(g, x - 7, y + 13, 14, 5, "pencil", null, { strokeWidth: 1.2 });
}

function rock<G>(c: Ctx<G>, x: number, y: number, s: number) {
    const { pen, g } = c,
        r = s * 0.42;
    pen.polygon(
        g,
        [
            [x - r, y + r * 0.7],
            [x - r * 0.9, y - r * 0.2],
            [x - r * 0.4, y - r * 0.8],
            [x + r * 0.35, y - r * 0.85],
            [x + r * 0.95, y - r * 0.1],
            [x + r, y + r * 0.7],
        ],
        "pencil",
        { fill: c.t.grid, fillStyle: "solid" },
        { strokeWidth: 1.7 },
    );
    pen.linear(
        g,
        [
            [x - r * 0.3, y - r * 0.5],
            [x - r * 0.05, y],
            [x + r * 0.3, y + r * 0.15],
        ],
        "pencil",
        { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
    );
}

function water<G>(c: Ctx<G>, x: number, y: number, s: number) {
    const { pen, g } = c;
    pen.rect(g, x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4, "pencil", pen.fill("sky"), {
        strokeWidth: 1.2,
    });
    for (const dy of [-6, 5])
        pen.curve(
            g,
            [
                [x - 12, y + dy],
                [x - 6, y + dy - 4],
                [x, y + dy],
                [x + 6, y + dy - 4],
                [x + 12, y + dy],
            ],
            "pencil",
            { strokeWidth: 1.2, stroke: c.t.ink },
        );
}

/** The path a run took, drawn as the pencil line a child would trace, with a head on each move. */
function trail<G>(c: Ctx<G>, r: Run, upto: number, style: string) {
    const L = gridLay(),
        { pen, g } = c,
        part = upTo(r, upto);
    if (style === "none") return;
    const stroke = c.paper ? c.t.ink : c.t.pen;
    let stop = 0;
    for (const f of part.frames) {
        if (f.kind !== "go" || f.path.length < 2) continue;
        const pts = f.path.map((p) => L.at(p.col, p.row));
        if (style === "dots") {
            pen.linear(g, pts, "ruler", {
                strokeWidth: 2,
                strokeLineDash: [2, 7],
                stroke: c.t["ink-soft"],
            });
            continue;
        }
        pen.linear(g, pts, "pencil", { strokeWidth: 3, stroke });
        const [x1, y1] = pts[pts.length - 1] ?? [0, 0],
            [x0, y0] = pts[pts.length - 2] ?? [0, 0];
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const hx = x1 - Math.cos(ang) * 12,
            hy = y1 - Math.sin(ang) * 12;
        for (const s of [-0.6, 0.6])
            pen.line(g, hx, hy, hx - 8 * Math.cos(ang + s), hy - 8 * Math.sin(ang + s), "pencil", {
                strokeWidth: 2.4,
                stroke,
            });
        if (style === "steps") {
            stop++;
            const [sx, sy] = [x1 + 11, y1 - 11];
            pen.circle(g, sx, sy, 15, "ruler", pen.fill("card"), { strokeWidth: 1.2, stroke });
            letter(c, {
                x: sx,
                y: sy + 4.5,
                s: String(stop),
                face: "read",
                weight: 700,
                size: 12,
                fill: stroke,
                anchor: "middle",
            });
        }
    }
}

/** The world a maze's settings describe, which the checker and the runner build the same way. */
export function mazeOf(p: {
    cols: number;
    rows: number;
    map: readonly string[];
    col: number;
    row: number;
    face: Dir;
    flag: readonly number[];
    gems: readonly number[];
    rocks: readonly number[];
}): World {
    return mazeWorld({
        cols: p.cols,
        rows: p.rows,
        map: p.map,
        col: p.col,
        row: p.row,
        face: p.face,
        flag: p.flag,
        gems: p.gems,
        rocks: p.rocks,
    });
}

interface MazeParams {
    cols: number;
    rows: number;
    map: string[];
    col: number;
    row: number;
    face: Dir;
    flag: number[];
    gems: number[];
    rocks: number[];
    code: string[];
    upto: number;
    trail: string;
    robot: boolean;
    numbers: boolean;
}

export const maze = defineDrawing<MazeParams>({
    id: "maze",
    family: "coding",
    title: "A robot in a maze",
    group: "Structures",
    about: "The robot on a numbered grid with rocks it cannot cross, gems it picks up by walking over them and a flag to reach. Give it `code` and it walks the program: the path is drawn from the same interpreter the checker and the runner use, a burst marks where it met a rock, and `upto` stops it partway. `map` lays a maze out in rows (. open, # rock, ~ water, * gem, F flag, S start), and `flag`, `gems` and `rocks` place things by column and row instead, so a question can move them. `trail=dots` prints a dotted path to trace, and `robot=false` leaves the square empty for a child to draw it in.",
    params: {
        cols: 6,
        rows: 4,
        map: [] as string[],
        col: 1,
        row: 1,
        face: "right",
        flag: [] as number[],
        gems: [] as number[],
        rocks: [] as number[],
        code: [] as string[],
        upto: -1,
        trail: "line",
        robot: true,
        numbers: true,
    },
    settings: {
        cols: { kind: "whole", min: 2, max: 12 },
        rows: { kind: "whole", min: 2, max: 10 },
        map: { kind: "words", most: 10 },
        col: { kind: "whole", min: 1, max: 12 },
        row: { kind: "whole", min: 1, max: 10 },
        face: { kind: "one of", of: DIRS },
        flag: { kind: "numbers", min: 0, max: 120, most: 2 },
        gems: { kind: "numbers", min: 0, max: 120, most: 12 },
        rocks: { kind: "numbers", min: 0, max: 120, most: 24 },
        code: { kind: "words", most: 12 },
        upto: { kind: "whole", min: -1, max: 40 },
        trail: { kind: "one of", of: ["line", "steps", "dots", "none"] },
        robot: { kind: "flag" },
        numbers: { kind: "flag" },
    },
    takes: [
        {
            label: "A maze with a flag",
            params: {
                cols: 6,
                rows: 4,
                map: ["S . . # . .", ". # . # * .", ". # . . . .", ". . . # . F"],
                col: 1,
                row: 1,
                face: "right",
                flag: [],
                gems: [],
                rocks: [],
                code: [],
                upto: -1,
                trail: "line",
                robot: true,
                numbers: true,
            },
        },
        {
            label: "Walked, with a gem",
            params: {
                cols: 6,
                rows: 4,
                map: ["S . . # . .", ". # . # * .", ". # . . . .", ". . . # . F"],
                col: 1,
                row: 1,
                face: "right",
                flag: [],
                gems: [],
                rocks: [],
                code: ["down 3", "right 2", "up 1", "right 2", "up 1", "down 2", "right 1"],
                upto: -1,
                trail: "steps",
                robot: true,
                numbers: true,
            },
        },
        {
            label: "It meets a rock",
            params: {
                cols: 6,
                rows: 4,
                map: ["S . . # . .", ". # . # * .", ". # . . . .", ". . . # . F"],
                col: 1,
                row: 1,
                face: "right",
                flag: [],
                gems: [],
                rocks: [],
                code: ["right 4"],
                upto: -1,
                trail: "line",
                robot: true,
                numbers: true,
            },
        },
        {
            label: "A dotted path to trace",
            params: {
                cols: 5,
                rows: 4,
                map: [],
                col: 1,
                row: 4,
                face: "up",
                flag: [5, 1],
                gems: [3, 2],
                rocks: [2, 3, 4, 3],
                code: ["forward 2", "turn right", "forward 4", "turn left", "forward 1"],
                upto: -1,
                trail: "dots",
                robot: false,
                numbers: true,
            },
        },
    ],
    box: (p) => {
        const w = mazeOf(p);
        return { w: w.cols * 2 + 3, h: w.rows * 2 + 3 };
    },
    draw: (c, p) => {
        const a: RawAnchors = {},
            w = mazeOf(p),
            L = gridLay();
        gridLines(c, w.cols, w.rows, p.numbers, a);
        for (const [k, colour] of w.colours) {
            const { col, row } = cellOf(w, k);
            c.pen.rect(
                c.g,
                L.x0 + (col - 1) * L.s + 2,
                L.y0 + (row - 1) * L.s + 2,
                L.s - 4,
                L.s - 4,
                "ruler",
                paintFill(c, colour),
                { strokeWidth: 0.6 },
            );
        }
        const r = run(parse(p.code), w),
            part = upTo(r, p.upto);
        for (const k of w.blocked) {
            const { col, row } = cellOf(w, k),
                [x, y] = L.at(col, row);
            const ch = p.map.map((m) => m.replace(/\s+/g, ""))[row - 1]?.[col - 1];
            if (ch === "~") water(c, x, y, L.s);
            else rock(c, x, y, L.s);
        }
        if (w.flag !== null) {
            const { col, row } = cellOf(w, w.flag);
            const [x, y] = L.at(col, row);
            flag(c, x, y);
            a.flag = [x, y - U, "up"];
        }
        const showGot = p.code.length > 0 && p.trail !== "dots" && p.trail !== "none";
        for (const k of w.gems) {
            const { col, row } = cellOf(w, k),
                [x, y] = L.at(col, row);
            gem(c, x, y, showGot && part.state.got.includes(k));
        }
        const [sx, sy] = L.at(w.start.col, w.start.row);
        const moved = part.state.col !== w.start.col || part.state.row !== w.start.row;
        if (moved || !p.robot)
            c.pen.circle(c.g, sx, sy, 1.3 * U, "ruler", null, {
                strokeWidth: 1.6,
                strokeLineDash: [5, 4],
                stroke: c.t["ink-soft"],
            });
        a.start = [sx, sy - U, "up"];
        trail(c, r, p.upto, p.trail);
        const last = part.frames[part.frames.length - 1];
        if (last?.bump) {
            const [bx, by] = L.at(part.state.col, part.state.row),
                [tx, ty] = L.at(last.bump.col, last.bump.row);
            bump(c, (bx + tx) / 2, (by + ty) / 2);
        }
        const [ex, ey] = L.at(part.state.col, part.state.row);
        if (p.robot) drawBot(c, ex, ey, part.state.face);
        a.robot = [ex, ey - U, "up"];
        a.end = [ex, ey, "up"];
        return a;
    },
    describe: () =>
        "A robot on a numbered grid of squares with rocks, gems and a flag on it, facing the way it starts, ready for its program.",
});
