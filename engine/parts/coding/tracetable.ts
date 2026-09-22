import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say } from "../lettering";
import { DIRS, parse, run, world, type Dir } from "../../coding";

function traceRows(p: {
    code: readonly string[];
    cols: number;
    rows: number;
    col: number;
    row: number;
    face: Dir;
    show: string;
    name: string;
}): { line: number; what: string }[] {
    const r = run(
        parse(p.code),
        world({ cols: p.cols, rows: p.rows, start: { col: p.col, row: p.row }, face: p.face }),
    );
    return r.frames
        .filter((f) => f.kind !== "bump")
        .map((f) => ({
            line: f.line,
            what:
                p.show === "value"
                    ? String(f.state.vars[p.name] ?? "")
                    : `column ${f.state.col}, row ${f.state.row}`,
        }));
}

interface TraceTableParams {
    code: string[];
    cols: number;
    rows: number;
    col: number;
    row: number;
    face: Dir;
    filled: number;
    show: string;
    name: string;
}

export const traceTable = defineDrawing<TraceTableParams>({
    id: "tracetable",
    family: "coding",
    title: "A trace table",
    group: "Structures",
    about: "A table a program is traced into, one row for each step it takes: the step, the line that ran, and where the robot stands after it or what a name holds. The rows are filled by running `code`, and `filled` says how many to write in, so the rest are empty for a child to complete with a pencil and the key fills them all.",
    params: {
        code: ["right 2", "down 1", "right 1"],
        cols: 6,
        rows: 4,
        col: 1,
        row: 1,
        face: "right",
        filled: 1,
        show: "square",
        name: "n",
    },
    settings: {
        code: { kind: "words", most: 8 },
        cols: { kind: "whole", min: 2, max: 12 },
        rows: { kind: "whole", min: 2, max: 10 },
        col: { kind: "whole", min: 1, max: 12 },
        row: { kind: "whole", min: 1, max: 10 },
        face: { kind: "one of", of: DIRS },
        filled: { kind: "whole", min: 0, max: 12 },
        show: { kind: "one of", of: ["square", "value"] },
        name: { kind: "text", most: 8 },
    },
    takes: [
        {
            label: "Where the robot is",
            params: {
                code: ["right 2", "down 1", "right 1"],
                cols: 6,
                rows: 4,
                col: 1,
                row: 1,
                face: "right",
                filled: 1,
                show: "square",
                name: "n",
            },
        },
        {
            label: "What n holds",
            params: {
                code: ["set n to 2", "add 3 to n", "add 3 to n", "take 1 from n"],
                cols: 1,
                rows: 1,
                col: 1,
                row: 1,
                face: "right",
                filled: -1,
                show: "value",
                name: "n",
            },
        },
    ],
    box: (p) => ({ w: 16, h: Math.max(1, traceRows(p).length) * 2 + 3 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            rows = traceRows(p);
        const cols: [number, number, number, number] = [0.5 * U, 3.5 * U, 6.5 * U, 15.5 * U],
            heads = ["step", "line", p.show === "value" ? p.name : "square"];
        pen.path(
            g,
            roundedRect(cols[0], 0.5 * U, cols[3] - cols[0], (rows.length * 2 + 2) * U, 6),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        heads.forEach((h, i) =>
            cap(c, ((cols[i] ?? 0) + (cols[i + 1] ?? 0)) / 2, 1.9 * U, h, 11, "middle", c.t.ink),
        );
        pen.line(g, cols[0], 2.5 * U, cols[3], 2.5 * U, "ruler", { strokeWidth: 1.6 });
        for (const x of cols.slice(1, 3))
            pen.line(g, x, 0.5 * U, x, (rows.length * 2 + 2.5) * U, "ruler", { strokeWidth: 1.2 });
        rows.forEach((r, i) => {
            const y = (2.5 + i * 2) * U;
            if (i)
                pen.line(g, cols[0], y, cols[3], y, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            const filled = p.filled < 0 || i < p.filled;
            num(c, (cols[0] + cols[1]) / 2, y + 1.35 * U, String(i + 1), 16);
            if (filled) {
                num(c, (cols[1] + cols[2]) / 2, y + 1.35 * U, String(r.line), 16);
                say(c, (cols[2] + cols[3]) / 2, y + 1.35 * U, r.what, 15);
            }
            a[`row(${i + 1})`] = [(cols[2] + cols[3]) / 2, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A table with a row for each step of a program: the step, the line that ran and ${p.show === "value" ? "what the name holds" : "where the robot stands"} after it, some rows left empty.`,
});
