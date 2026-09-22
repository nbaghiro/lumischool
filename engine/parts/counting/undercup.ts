import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, sayOn } from "../lettering";

type Pt = [number, number];

/** Rows needed to lay out n counters five to a row, and the height they take. */
const fives = (n: number) => Math.ceil(Math.max(0, n) / 5);

const liftOf = (hidden: number) => Math.ceil(Math.max(1, hidden) / 3) * 1.4 + 0.6;

interface UnderCupParams {
    shown: number;
    cups: number;
    hidden: number;
    lifted: boolean;
    total: number;
    color: Marker;
}

export const underCup = defineDrawing<UnderCupParams>({
    id: "undercup",
    family: "counting",
    title: "Counters under a cup",
    group: "Structures",
    about: "Counters on a mat with some of them hidden under an upside-down cup. The counters that show can be counted and the hidden ones cannot, so the only way to the answer is the whole and the part: ten in all and six showing means four under the cup. Lifted, the cup shows what it was hiding.",
    params: { shown: 6, cups: 1, hidden: 4, lifted: false, total: 10, color: "berry" },
    settings: {
        shown: { kind: "whole", min: 0, max: 15 },
        cups: { kind: "whole", min: 1, max: 2 },
        hidden: { kind: "whole", min: 0, max: 9 },
        lifted: { kind: "flag" },
        total: { kind: "whole", min: 0, max: 24 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Ten in all, one cup",
            params: { shown: 6, cups: 1, hidden: 4, lifted: false, total: 10, color: "berry" },
        },
        {
            label: "Lifted to check",
            params: { shown: 6, cups: 1, hidden: 4, lifted: true, total: 10, color: "berry" },
        },
        {
            label: "Two cups, the same under each",
            params: { shown: 4, cups: 2, hidden: 4, lifted: false, total: 12, color: "mint" },
        },
    ],
    box: (p) => {
        const shownH = fives(p.shown) * 1.8,
            cupH = 3.6 + (p.lifted ? liftOf(p.hidden) : 0);
        const matH = Math.max(cupH, shownH) + 1.4;
        return {
            w: Math.ceil(1.5 + p.cups * 5.2 + (p.shown > 0 ? 9.6 : 0) + 0.9),
            h: Math.ceil(0.5 + matH + (p.total > 0 ? 2.8 : 0.6)),
        };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const shownH = fives(p.shown) * 1.8,
            cupH = 3.6 + (p.lifted ? liftOf(p.hidden) : 0);
        const matH = (Math.max(cupH, shownH) + 1.4) * U,
            w = Math.ceil(1.5 + p.cups * 5.2 + (p.shown > 0 ? 9.6 : 0) + 0.9) * U;
        const top = 0.5 * U,
            floor = top + matH - 0.7 * U;
        pen.path(
            g,
            roundedRect(0.5 * U, top, w - 1 * U, matH, 12),
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 9, fillWeight: 0.7 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            roundedRect(0.9 * U, top + 0.4 * U, w - 1.8 * U, matH - 0.8 * U, 9),
            "pencil",
            null,
            { strokeWidth: 1, strokeLineDash: [5, 5], stroke: c.t["ink-soft"] },
        );
        const counter = (x: number, y: number, d: number) => {
            pen.circle(g, x, y, d, "ruler", pen.fill(p.color, "solid", { hachureGap: 5 }), {
                strokeWidth: 1.5,
            });
            pen.circle(g, x, y, d * 0.62, "ruler", null, {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        };
        for (let k = 0; k < p.cups; k++) {
            const cx = (1.5 + k * 5.2 + 2.1) * U,
                rim = p.lifted ? floor - liftOf(p.hidden) * U : floor;
            const lean = p.lifted ? 0.35 * U : 0;
            pen.ellipse(
                g,
                cx,
                floor + 2,
                4.4 * U,
                0.9 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
                { strokeWidth: 0.6, stroke: c.t["ink-soft"] },
            );
            if (p.lifted) {
                for (let i = 0; i < p.hidden; i++) {
                    const col = i % 3,
                        row = Math.floor(i / 3);
                    counter(cx + (col - 1) * 1.4 * U, floor - (0.75 + row * 1.4) * U, 1.3 * U);
                }
            }
            const body: Pt[] = [
                [cx - 2.1 * U + lean, rim],
                [cx + 2.1 * U + lean, rim],
                [cx + 1.5 * U + lean * 1.6, rim - 3.3 * U],
                [cx - 1.5 * U + lean * 1.6, rim - 3.3 * U],
            ];
            pen.polygon(
                g,
                body,
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 7, fillWeight: 0.6 }),
                { strokeWidth: 2.4 },
            );
            pen.rect(
                g,
                cx - 1.1 * U + lean * 1.7,
                rim - 3.8 * U,
                2.2 * U,
                0.5 * U,
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
            pen.line(
                g,
                cx - 2.1 * U + lean,
                rim - 0.45 * U,
                cx + 2.1 * U + lean * 1.05,
                rim - 0.45 * U,
                "pencil",
                { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
            );
            pen.line(
                g,
                cx - 1.35 * U + lean * 1.2,
                rim - 0.9 * U,
                cx - 1.05 * U + lean * 1.5,
                rim - 2.9 * U,
                "pencil",
                { strokeWidth: 2.2, stroke: c.t.card },
            );
            if (!p.lifted) numOn(c, cx + 0.2 * U, rim - 1.3 * U, "?", 24);
            a[`cup(${k})`] = [cx + lean * 1.6, rim - 3.8 * U, "up"];
        }
        const x0 = (1.5 + p.cups * 5.2 + 0.9) * U;
        for (let i = 0; i < p.shown; i++) {
            const col = i % 5,
                row = Math.floor(i / 5);
            counter(x0 + (col * 1.8 + 0.75) * U, floor - (0.75 + row * 1.8) * U, 1.5 * U);
        }
        if (p.shown > 0) a.shown = [x0 + 4.5 * U, floor - shownH * U, "up"];
        if (p.total > 0) {
            const ty = top + matH + 0.5 * U,
                label = `${p.total} in all`,
                tw = (label.length * 0.5 + 2.4) * U;
            pen.path(g, roundedRect(0.9 * U, ty, tw, 1.8 * U, 6), "ruler", pen.fill("card"), {
                strokeWidth: 1.8,
            });
            pen.circle(g, 1.6 * U, ty + 0.9 * U, 0.4 * U, "ruler", null, { strokeWidth: 1 });
            sayOn(c, 2.3 * U, ty + 1.35 * U, label, 16, "start");
            a.tag = [0.9 * U + tw / 2, ty + 1.8 * U, "down"];
        }
        a.mat = [w / 2, top, "up"];
        return a;
    },
    describe: (p) =>
        `Counters on a mat with ${p.cups > 1 ? "cups" : "a cup"} upside down over some of them${p.lifted ? ", lifted to show what was underneath" : ", a question mark on the cup"}.`,
});
