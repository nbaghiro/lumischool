import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export type MapThing = "hut" | "tree" | "boat" | "bridge";

function mapThing<G>(c: Ctx<G>, kind: MapThing, x: number, y: number): void {
    const { pen, g } = c;
    if (kind === "tree") {
        pen.line(g, x, y + 14, x, y + 2, "pencil", { strokeWidth: 2 });
        pen.circle(g, x, y - 4, 24, "pencil", pen.fill("mint"), { strokeWidth: 1.5 });
    } else if (kind === "boat") {
        pen.path(g, `M${x - 16} ${y + 6}h32l-6 10h-20Z`, "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        pen.line(g, x, y + 6, x, y - 14, "pencil", { strokeWidth: 1.8 });
        pen.polygon(
            g,
            [
                [x + 2, y - 13],
                [x + 14, y + 2],
                [x + 2, y + 2],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
    } else if (kind === "bridge") {
        pen.arc(g, x, y + 10, 34, 26, Math.PI, 2 * Math.PI, "pencil", { strokeWidth: 2 });
        pen.line(g, x - 17, y + 10, x + 17, y + 10, "pencil", { strokeWidth: 1.6 });
    } else {
        pen.rect(g, x - 12, y - 2, 24, 16, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [x - 15, y - 2],
                [x, y - 15],
                [x + 15, y - 2],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.6 },
        );
    }
}

const mapGridSize = (cols: number, rows: number): { w: number; h: number } => ({
    w: cols * 2 + 3,
    h: rows * 2 + 3,
});

interface MapGridParams {
    cols: number;
    rows: number;
    col: number;
    row: number;
    thing: MapThing;
}

export const mapGrid = defineDrawing<MapGridParams>({
    id: "gridmap",
    family: "travel",
    title: "Map grid",
    group: "Structures",
    about: "A small island on a lettered and numbered grid, so a question can ask which square a thing is in.",
    params: { cols: 6, rows: 5, col: 3, row: 2, thing: "hut" },
    settings: {
        cols: { kind: "whole", min: 2, max: 8 },
        rows: { kind: "whole", min: 2, max: 8 },
        col: { kind: "whole", min: 1, max: 8 },
        row: { kind: "whole", min: 1, max: 8 },
        thing: { kind: "one of", of: ["hut", "tree", "boat", "bridge"] },
    },
    takes: [
        { label: "A hut at C2", params: { cols: 6, rows: 5, col: 3, row: 2, thing: "hut" } },
        { label: "A tree at E4", params: { cols: 6, rows: 5, col: 5, row: 4, thing: "tree" } },
    ],
    box: (p) => mapGridSize(p.cols, p.rows),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            s = 2 * U;
        const x0 = 2 * U,
            y0 = 2 * U,
            w = p.cols * s,
            h = p.rows * s;
        pen.path(
            g,
            `M${x0 + w * 0.1} ${y0 + h * 0.7} C${x0 + w * 0.02} ${y0 + h * 0.3} ${x0 + w * 0.3} ${y0 + h * 0.05} ${x0 + w * 0.55} ${y0 + h * 0.14}` +
                ` C${x0 + w * 0.88} ${y0 + h * 0.22} ${x0 + w * 0.98} ${y0 + h * 0.5} ${x0 + w * 0.88} ${y0 + h * 0.74}` +
                ` C${x0 + w * 0.76} ${y0 + h * 0.97} ${x0 + w * 0.24} ${y0 + h * 0.98} ${x0 + w * 0.1} ${y0 + h * 0.7}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.6 },
        );
        for (let k = 0; k < p.cols; k++) say(c, x0 + k * s + U, 1.5 * U, "ABCDEFGH"[k] ?? "?", 15);
        for (let r = 0; r < p.rows; r++)
            say(c, 1.2 * U, y0 + r * s + U + 5, String(r + 1), 15, "end");
        for (let r = 0; r < p.rows; r++)
            for (let k = 0; k < p.cols; k++) {
                pen.rect(g, x0 + k * s, y0 + r * s, s, s, "ruler", null, { strokeWidth: 1.1 });
                a[`cell(${r * p.cols + k})`] = [x0 + k * s + U, y0 + r * s, "up"];
            }
        const cx = x0 + (p.col - 1) * s + U,
            cy = y0 + (p.row - 1) * s + U;
        if (p.col >= 1 && p.col <= p.cols && p.row >= 1 && p.row <= p.rows)
            mapThing(c, p.thing, cx, cy);
        a.thing = [cx, cy - U, "up"];
        return a;
    },
    describe: (p) =>
        `A small island on a grid lettered along the top and numbered down the side, with a ${p.thing} drawn in one square of it to name.`,
    reads: true,
});
