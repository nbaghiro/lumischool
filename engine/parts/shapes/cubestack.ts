import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, num, numOn, soft } from "../lettering";

type Pt = [number, number];

/** A cube's front edge is two squares, and one cube of depth goes a square right and a square up. */
const S = 2 * U;
const D = U;

export const cubeStack = defineDrawing({
    id: "cubestack",
    family: "shapes",
    title: "Cube stack",
    group: "Structures",
    about: "A cuboid built of unit cubes in the oblique view the solids use, l long, w deep and h tall. The top layers can be left as a dashed outline, the cubes can give way to the bare outline with its edges written on, and a layer or the whole can be shown as a count.",
    params: { l: 4, w: 3, h: 2, hide: 0, outline: 0, edges: 0, count: 0, ask: 0, unit: "" },
    settings: {
        l: { kind: "whole", min: 1, max: 10 },
        w: { kind: "whole", min: 1, max: 8 },
        h: { kind: "whole", min: 1, max: 10 },
        hide: { kind: "whole", min: 0, max: 9 },
        outline: { kind: "one of", of: [0, 1] },
        edges: { kind: "one of", of: [0, 1] },
        count: { kind: "one of", of: [0, 1, 2] },
        ask: { kind: "one of", of: [0, 1, 2, 3, 4] },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "Four by three by two",
            params: { l: 4, w: 3, h: 2, hide: 0, outline: 0, edges: 0, count: 0, ask: 0, unit: "" },
        },
        {
            label: "Top layer taken off",
            params: { l: 3, w: 2, h: 3, hide: 1, outline: 0, edges: 0, count: 1, ask: 0, unit: "" },
        },
        {
            label: "Outline with its edges",
            params: {
                l: 5,
                w: 3,
                h: 4,
                hide: 0,
                outline: 1,
                edges: 1,
                count: 0,
                ask: 3,
                unit: "cm",
            },
        },
        {
            label: "How many cubes",
            params: { l: 3, w: 3, h: 3, hide: 0, outline: 0, edges: 1, count: 2, ask: 4, unit: "" },
        },
    ],
    box: (p) => ({
        w: p.l * 2 + p.w + (p.edges === 1 ? 7 : 4),
        h: p.h * 2 + p.w + 2 + (p.edges === 1 ? 1 : 0) + (p.count === 2 ? 1 : 0),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            l = Math.max(1, p.l),
            w = Math.max(1, p.w),
            h = Math.max(1, p.h),
            shown = Math.max(0, h - Math.max(0, p.hide)),
            ox = (p.edges === 1 ? 3 : 2) * U,
            oy = (w + 1 + h * 2) * U,
            a: RawAnchors = {};
        const at = (x: number, depth: number, up: number): Pt => [
            ox + x * S + depth * D,
            oy - depth * D - up * S,
        ];
        const hid = { strokeWidth: 1.2, strokeLineDash: [6, 5], stroke: c.t["ink-soft"] };
        const face = (pts: Pt[], fill: ReturnType<typeof pen.fill>) =>
            pen.polygon(g, pts, "ruler", fill, { strokeWidth: 2 });
        const inner = (p0: Pt, p1: Pt) =>
            pen.line(g, p0[0], p0[1], p1[0], p1[1], "ruler", { strokeWidth: 1.2 });
        if (shown > 0) {
            face([at(0, 0, 0), at(l, 0, 0), at(l, 0, shown), at(0, 0, shown)], pen.fill("sky"));
            face(
                [at(l, 0, 0), at(l, w, 0), at(l, w, shown), at(l, 0, shown)],
                pen.fill("sky", "hachure", { hachureGap: 6 }),
            );
            face(
                [at(0, 0, shown), at(l, 0, shown), at(l, w, shown), at(0, w, shown)],
                pen.fill("card"),
            );
            if (p.outline !== 1) {
                for (let i = 1; i < l; i++) {
                    inner(at(i, 0, 0), at(i, 0, shown));
                    inner(at(i, 0, shown), at(i, w, shown));
                }
                for (let j = 1; j < shown; j++) {
                    inner(at(0, 0, j), at(l, 0, j));
                    inner(at(l, 0, j), at(l, w, j));
                }
                for (let k = 1; k < w; k++) {
                    inner(at(0, k, shown), at(l, k, shown));
                    inner(at(l, k, 0), at(l, k, shown));
                }
            }
        }
        if (p.outline === 1 && shown > 0) {
            pen.linear(g, [at(0, 0, 0), at(0, w, 0), at(l, w, 0)], "ruler", hid);
            pen.line(g, ...at(0, w, 0), ...at(0, w, shown), "ruler", hid);
        }
        if (shown < h) {
            const d = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}`;
            ghost(c, d([at(0, 0, shown), at(0, 0, h), at(l, 0, h), at(l, 0, shown)]));
            ghost(c, d([at(l, 0, h), at(l, w, h), at(0, w, h), at(0, 0, h)]));
            ghost(c, d([at(l, w, shown), at(l, w, h)]));
        }
        const unit = p.unit ? ` ${p.unit}` : "";
        const value = (n: number, which: number) => (p.ask === which ? "?" : `${n}${unit}`);
        const [lx, ly] = at(l / 2, 0, 0),
            [wx, wy] = at(l, w / 2, 0),
            [hx, hy] = at(0, 0, h / 2);
        if (p.edges === 1) {
            num(c, lx, ly + 24, value(l, 1), 16);
            num(c, wx + 12, wy + 18, value(w, 2), 16, "start");
            num(c, hx - 12, hy + 6, value(h, 3), 16, "end");
        }
        const [tx, ty] = at(l / 2, w / 2, shown);
        if (p.count === 1 && shown > 0) numOn(c, tx, ty + 6, p.ask === 4 ? "?" : l * w, 16);
        if (p.count === 2)
            soft(
                c,
                lx,
                ly + (p.edges === 1 ? 48 : 26),
                p.ask === 4 ? "? cubes" : `${l * w * h} cubes`,
                15,
            );
        a.front = [lx, oy - (shown * S) / 2, "left"];
        a.top = [tx, ty, "up"];
        a.side = [wx, wy - (shown * S) / 2, "right"];
        a.length = [lx, ly + 8, "down"];
        a.width = [wx + 8, wy + 8, "right"];
        a.height = [hx - 8, hy, "left"];
        for (let j = 0; j < h; j++) a[`layer(${j})`] = [ox, oy - (j + 0.5) * S, "left"];
        return a;
    },
    describe: (p) =>
        p.outline === 1
            ? `The outline of a cuboid drawn in oblique view, its hidden edges dashed${p.edges === 1 ? " and its length, width and height written along its edges" : ""}.`
            : `A cuboid built of unit cubes drawn in oblique view, the front, top and side ruled into squares${p.hide > 0 ? ", its top layers left as a dashed outline" : ""}.`,
    motion: {
        still: "A stack of cubes is counted, so it holds still while the cubes are counted.",
    },
});
