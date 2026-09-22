// What a coding item runs: the program, the world and the event a drawing's settings name, built the
// same way for the drawing, the checker and the runner, so the three cannot disagree.
import { DIRS, world, type Dir, type World } from "../../coding";
import { mazeOf } from "./maze";
import { printerOf } from "./pixels";
import { turtleOf } from "./turtle";

/** What a drawing in a scene runs, read off its own settings, so a checker and the runner run what it draws. */
export interface Setup {
    type: string;
    code: string[];
    world: World;
    event: "flag" | "tap";
    vars: Record<string, number>;
    target: string[];
}

/** A setting written as text, or a number written out; anything else is the fallback. */
const text = (v: unknown, or: string): string =>
    typeof v === "string" || typeof v === "number" ? String(v) : or;

export const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

export const nums = (v: unknown): number[] =>
    Array.isArray(v) ? v.map((x) => Number(x)).filter(Number.isFinite) : [];

export const numOf = (v: unknown, d: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : d;

export const dirOf = (v: unknown): Dir =>
    (DIRS as readonly string[]).includes(String(v)) ? (String(v) as Dir) : "right";

/** The drawings that run a program, and the setting each keeps its program in. */
export const RUNS: Record<string, string> = {
    maze: "code",
    turtle: "moves",
    stage: "code",
    pixels: "code",
    variable: "code",
    tracetable: "code",
    dance: "code",
    tune: "code",
    fork: "cond",
    program: "code",
    blocks: "code",
};

export function setupOf(type: string, p: Record<string, unknown>): Setup | null {
    const one = world({ cols: 1, rows: 1 });
    const base = { type, event: "flag" as const, vars: {}, target: [] as string[] };
    switch (type) {
        case "maze":
            return {
                ...base,
                code: strs(p.code),
                world: mazeOf({
                    cols: numOf(p.cols, 6),
                    rows: numOf(p.rows, 4),
                    map: strs(p.map),
                    col: numOf(p.col, 1),
                    row: numOf(p.row, 1),
                    face: dirOf(p.face),
                    flag: nums(p.flag),
                    gems: nums(p.gems),
                    rocks: nums(p.rocks),
                }),
            };
        case "turtle":
            return {
                ...base,
                code: strs(p.moves),
                target: strs(p.target),
                world: turtleOf({
                    cols: numOf(p.cols, 10),
                    rows: numOf(p.rows, 8),
                    col: numOf(p.col, 1),
                    row: numOf(p.row, 1),
                    face: dirOf(p.face),
                }),
            };
        case "stage": {
            const cols = Math.max(4, Math.round(numOf(p.cols, 7)));
            return {
                ...base,
                code: strs(p.code),
                event: p.event === "tap" ? "tap" : "flag",
                world: world({
                    cols,
                    rows: 1,
                    start: {
                        col: Math.max(1, Math.min(cols, Math.round(numOf(p.col, 1)))),
                        row: 1,
                    },
                }),
            };
        }
        case "pixels":
            return {
                ...base,
                code: strs(p.code),
                world: printerOf({ cols: numOf(p.cols, 7), rows: numOf(p.rows, 5) }),
            };
        case "tracetable":
            return {
                ...base,
                code: strs(p.code),
                world: world({
                    cols: numOf(p.cols, 6),
                    rows: numOf(p.rows, 4),
                    start: { col: numOf(p.col, 1), row: numOf(p.row, 1) },
                    face: dirOf(p.face),
                }),
            };
        case "fork": {
            const n = numOf(p.n, 0);
            return {
                ...base,
                code: [
                    `if ${text(p.cond, "")}`,
                    `  say ${text(p.yes, "yes")}`,
                    "otherwise",
                    `  say ${text(p.no, "no")}`,
                ],
                vars: { number: n, n },
                world: one,
            };
        }
        case "dance":
        case "tune":
            return { ...base, code: strs(p.code), world: one };
        // A listing on its own runs on open ground, far from any edge, so moves and names can be
        // counted without a grid drawn beside it.
        case "variable":
        case "program":
        case "blocks":
            return {
                ...base,
                code: strs(p.code),
                world: world({ cols: 99, rows: 99, start: { col: 50, row: 50 } }),
            };
    }
    return null;
}
