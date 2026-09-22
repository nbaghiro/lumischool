import { roundedRect } from "../../ink/pen";
import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

// The cable runs up the mountain from left to right, so the right pylon is the taller.
const LEFT = { x: 1.4 * U, top: 2.1 * U };
const RIGHT = { x: 14.6 * U, top: 1 * U };
const FOOT = 6.55 * U;
const SAG = 1.5 * U;
const cableAt = (x: number) => {
    const t = (x - LEFT.x) / (RIGHT.x - LEFT.x);
    return LEFT.top + (RIGHT.top - LEFT.top) * t + SAG * 4 * t * (1 - t);
};
const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** A steel pylon: two legs narrowing to a crossarm, braced in panels, standing in a heap of rock. */
function pylon<G>(c: Ctx<G>, x: number, top: number): void {
    const { pen, g } = c;
    const arm = top + 0.3 * U;
    const steel = { strokeWidth: 1.6, disableMultiStroke: true, preserveVertices: true };
    const brace = { strokeWidth: 1.1, stroke: c.t["ink-soft"], disableMultiStroke: true };
    const half = (y: number) => 0.2 * U + (0.62 * U - 0.2 * U) * ((y - arm) / (FOOT - arm));
    const panels = Math.max(3, Math.round((FOOT - arm) / (0.95 * U)));
    for (let i = 0; i < panels; i++) {
        const y0 = arm + ((FOOT - arm) * i) / panels;
        const y1 = arm + ((FOOT - arm) * (i + 1)) / panels;
        pen.line(g, x - half(y0), y0, x + half(y1), y1, "ruler", brace);
        pen.line(g, x + half(y0), y0, x - half(y1), y1, "ruler", brace);
        if (i < panels - 1) pen.line(g, x - half(y1), y1, x + half(y1), y1, "ruler", brace);
    }
    for (const k of [-1, 1])
        pen.line(g, x + k * half(arm), arm, x + k * half(FOOT), FOOT, "ruler", steel);
    pen.rect(g, x - 0.8 * U, top + 0.06 * U, 1.6 * U, 0.26 * U, "ruler", pen.fill("ink-soft"), {
        strokeWidth: 1.5,
        preserveVertices: true,
    });
    pen.circle(g, x, top + 0.02 * U, 0.34 * U, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
    pen.path(
        g,
        `M${x - 1.05 * U} ${FOOT + 0.36 * U}Q${x - 0.6 * U} ${FOOT - 0.3 * U} ${x - 0.05 * U} ${FOOT - 0.1 * U}Q${x + 0.7 * U} ${FOOT - 0.34 * U} ${x + 1.05 * U} ${FOOT + 0.36 * U}Z`,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 4.5, fillWeight: 0.7 }),
        { strokeWidth: 1.6 },
    );
}

export const cableCar = defineDrawing({
    id: "cablecar",
    family: "travel",
    title: "Cable car",
    group: "Props",
    about: "A mountain cable car: a cable slung between two lattice pylons, one taller than the other, with cabins hanging from it at equal gaps. Each cabin has a row of windows over a pale stripe. The cabins can be counted, and so can the windows in each.",
    params: { cars: 2, windows: 3 },
    settings: {
        cars: { kind: "whole", min: 1, max: 3 },
        windows: { kind: "whole", min: 2, max: 4 },
    },
    takes: [
        { label: "Two cabins, three windows", params: { cars: 2, windows: 3 } },
        { label: "Three cabins, four windows", params: { cars: 3, windows: 4 } },
        { label: "One cabin, two windows", params: { cars: 1, windows: 2 } },
    ],
    box: () => ({ w: 16, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = upto(p.cars, 1, 3);
        const panes = upto(p.windows, 2, 4);
        const a: RawAnchors = {};
        pylon(c, LEFT.x, LEFT.top);
        pylon(c, RIGHT.x, RIGHT.top);
        const span = (dy: number): Pt[] =>
            Array.from({ length: 33 }, (_, i) => {
                const x = LEFT.x + ((RIGHT.x - LEFT.x) * i) / 32;
                return [x, cableAt(x) + dy];
            });
        // the cable goes on past each pylon, down to the station below and up to the one on the top
        const rope = { strokeWidth: 1.7, disableMultiStroke: true };
        pen.curve(g, span(0), "ruler", rope);
        pen.curve(g, span(0.3 * U), "ruler", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
            disableMultiStroke: true,
        });
        pen.line(g, 0.1 * U, LEFT.top + 0.7 * U, LEFT.x, LEFT.top, "ruler", rope);
        pen.line(g, RIGHT.x, RIGHT.top, 15.9 * U, RIGHT.top - 0.4 * U, "ruler", rope);
        const w = (0.58 * panes + 0.5) * U;
        const h = 1.6 * U;
        for (let i = 0; i < n; i++) {
            const x = LEFT.x + ((RIGHT.x - LEFT.x) * (i + 1)) / (n + 1);
            const y = cableAt(x);
            const roof = y + 0.95 * U;
            pen.polygon(
                g,
                [
                    [x - 0.36 * U, cableAt(x - 0.36 * U) - 0.1 * U],
                    [x + 0.36 * U, cableAt(x + 0.36 * U) - 0.1 * U],
                    [x + 0.36 * U, cableAt(x + 0.36 * U) + 0.16 * U],
                    [x - 0.36 * U, cableAt(x - 0.36 * U) + 0.16 * U],
                ],
                "ruler",
                pen.fill("ink-soft"),
                { strokeWidth: 1.3, preserveVertices: true },
            );
            const cabin = part(c, "cabin", [x, y]).g;
            pen.linear(
                cabin,
                [
                    [x, y + 0.14 * U],
                    [x, roof - 0.34 * U],
                    [x - 0.18 * U, roof - 0.16 * U],
                    [x - 0.18 * U, roof],
                ],
                "ruler",
                { strokeWidth: 1.6, disableMultiStroke: true, preserveVertices: true },
            );
            pen.path(
                cabin,
                roundedRect(x - w / 2 - 0.1 * U, roof - 0.14 * U, w + 0.2 * U, 0.28 * U, 5),
                "ruler",
                pen.fill("ink-soft"),
                { strokeWidth: 1.5, preserveVertices: true },
            );
            pen.path(
                cabin,
                roundedRect(x - w / 2, roof + 0.14 * U, w, h, 7),
                "ruler",
                pen.fill("berry"),
                {
                    strokeWidth: 1.8,
                    preserveVertices: true,
                },
            );
            pen.line(cabin, x - w / 2 + 3, roof + 1.2 * U, x + w / 2 - 3, roof + 1.2 * U, "ruler", {
                strokeWidth: 3,
                stroke: c.t.card,
                disableMultiStroke: true,
            });
            for (let k = 0; k < panes; k++) {
                const wx = x - (panes * 0.58 * U) / 2 + k * 0.58 * U + 0.07 * U;
                pen.rect(
                    cabin,
                    wx,
                    roof + 0.38 * U,
                    0.44 * U,
                    0.6 * U,
                    "ruler",
                    pen.fill(c.paper ? "card" : "sky"),
                    { strokeWidth: 1.2, preserveVertices: true },
                );
            }
            a[`cabin(${i})`] = [x, roof + 0.14 * U + h, "down"];
        }
        a["pylon(0)"] = [LEFT.x, LEFT.top - 0.2 * U, "up"];
        a["pylon(1)"] = [RIGHT.x, RIGHT.top - 0.2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A cable slung between two lattice pylons, one taller than the other, with ${upto(p.cars, 1, 3) > 1 ? "cabins hanging from it at equal gaps, each with" : "a cabin hanging from it that has"} a row of windows over a pale stripe.`,
    motion: { parts: { cabin: { is: "sway", deg: 4, period: 3.6, wave: 0.4 } } },
});
