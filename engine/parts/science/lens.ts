import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, soft } from "../lettering";
import { eyeAt, ray, type Pt } from "./optics";

/** Centimetres to a square along a single lens's ruler. */
const CM = 2;

/** How many times bigger a telescope makes a far thing look: the big lens's focus over the eyepiece's. */
export const magnifies = (objective: number, eyepiece: number): number => objective / eyepiece;

/** How long a telescope's tube is when both lenses bring far light to the same point: the two focuses added. */
export const tubeLength = (objective: number, eyepiece: number): number => objective + eyepiece;

const clampFocus = (f: number): number => Math.max(4, Math.min(40, Math.round(f / CM) * CM));

/** A lens seen edge on, thicker in the middle the more it bends light, so a nearer focus is a fatter lens. */
function lensAt<G>(c: Ctx<G>, x: number, y: number, half: number, fat: number): void {
    c.pen.path(
        c.g,
        `M${x} ${y - half}Q${x + fat} ${y} ${x} ${y + half}Q${x - fat} ${y} ${x} ${y - half}Z`,
        "ruler",
        c.pen.fill("sky", "solid"),
        { strokeWidth: 1.8 },
    );
}

export const lens = defineDrawing({
    id: "lens",
    family: "science",
    title: "Lenses and a telescope",
    group: "Structures",
    about: "A curved glass lens bending parallel light from something far away so that it meets at one point, its focus, with a ruler in centimetres from the lens; a lens that bends light more is fatter in the middle and brings it to a point nearer. With `mode` telescope it is a telescope's tube with a big lens at the front and a small eyepiece at the back, their focuses written under them: light from a star meets between them and leaves the eyepiece as a narrower beam, and the star looks the big focus divided by the small one times bigger. The tube is as long as the two focuses added, written on it when `show` is 1 and left as a question mark at 0.",
    params: { mode: "lens", focus: 20, objective: 90, eyepiece: 3, show: 1, tag: "" },
    settings: {
        mode: { kind: "one of", of: ["lens", "telescope"] },
        focus: { kind: "whole", min: 4, max: 40 },
        objective: { kind: "whole", min: 20, max: 200 },
        eyepiece: { kind: "whole", min: 1, max: 20 },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "A lens with its focus at 20 cm",
            params: { mode: "lens", focus: 20, objective: 90, eyepiece: 3, show: 1, tag: "" },
        },
        {
            label: "A fat lens",
            params: { mode: "lens", focus: 8, objective: 90, eyepiece: 3, show: 1, tag: "" },
        },
        {
            label: "A telescope",
            params: { mode: "telescope", focus: 20, objective: 90, eyepiece: 3, show: 1, tag: "" },
        },
        {
            label: "How long is the tube?",
            params: { mode: "telescope", focus: 20, objective: 60, eyepiece: 5, show: 0, tag: "" },
        },
    ],
    box: (p) => (p.mode === "telescope" ? { w: 32, h: 10 } : { w: 25, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        if (p.tag) num(c, 0.3 * U, 1 * U, p.tag, 22, "start");
        if (p.mode === "telescope") {
            const y = 4.2 * U,
                x0 = 3 * U,
                x1 = 26 * U,
                fo = Math.max(1, Math.round(p.objective)),
                fe = Math.max(1, Math.round(p.eyepiece)),
                meet = x0 + ((x1 - x0) * fo) / (fo + fe),
                h = 1.5 * U,
                out = Math.max(0.2 * U, (h * fe) / fo);
            pen.rect(g, x0, y - 2.2 * U, x1 - x0, 4.4 * U, "ruler", pen.fill("card"), {
                strokeWidth: 2.2,
            });
            for (const s of [-1, 1]) {
                ray(
                    c,
                    [
                        [0.3 * U, y + s * h],
                        [x0, y + s * h],
                        [meet, y],
                        [x1, y - s * out],
                    ],
                    1,
                );
                ray(c, [
                    [x1, y - s * out],
                    [30 * U, y - s * out],
                ]);
            }
            lensAt(c, x0, y, 2.2 * U, 0.7 * U);
            lensAt(c, x1, y, 0.9 * U, 1.1 * U);
            eyeAt(c, 30.6 * U, y, -1);
            pen.circle(
                g,
                meet,
                y,
                6,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
            cap(c, x0, y + 3.3 * U, "big lens", 11);
            soft(c, x0, y + 4.2 * U, `focus ${fo} cm`, 12);
            cap(c, x1, y + 3.3 * U, "eyepiece", 11);
            soft(c, x1, y + 4.2 * U, `focus ${fe} cm`, 12);
            // the tube's length on a bracket above it
            const by = y - 3 * U;
            pen.line(g, x0, by, x1, by, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
            for (const x of [x0, x1])
                pen.line(g, x, by - 0.3 * U, x, by + 0.3 * U, "ruler", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
            patch(c, (x0 + x1) / 2, by - 11, 70, 18);
            if (p.show > 0) num(c, (x0 + x1) / 2, by - 6, `${tubeLength(fo, fe)} cm`, 13);
            else penned(c, (x0 + x1) / 2, by - 4, "?", 22);
            a.tube = [(x0 + x1) / 2, by, "up"];
            a.objective = [x0, y + 2.2 * U, "down"];
            a.eyepiece = [x1, y + 1 * U, "down"];
            return a;
        }
        const f = clampFocus(p.focus),
            y = 3.8 * U,
            lx = 3 * U,
            fx = lx + (f / CM) * U,
            half = 2.6 * U,
            fat = Math.max(0.35 * U, Math.min(1.6 * U, (13 / f) * U)),
            end = 24.6 * U;
        for (const dy of [-1.7 * U, 0, 1.7 * U]) {
            const from: Pt = [0.3 * U, y + dy];
            if (p.show > 0) {
                const past = Math.min(end, fx + (fx - lx) * 0.45),
                    k = (past - lx) / (fx - lx);
                ray(c, [from, [lx, y + dy], [past, y + dy - dy * k]], 1);
            } else ray(c, [from, [lx, y + dy]]);
        }
        lensAt(c, lx, y, half, fat);
        if (p.show > 0)
            pen.circle(
                g,
                fx,
                y,
                7,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        else penned(c, lx + 4 * U, y - 1.2 * U, "?", 24);
        // the ruler under the light, from the lens, marked every 2 cm and numbered every 10
        const ry = 7.2 * U;
        pen.line(g, lx, ry, end, ry, "ruler", { strokeWidth: 1.4 });
        for (let cm = 0; lx + (cm / CM) * U <= end + 1; cm += CM) {
            const x = lx + (cm / CM) * U,
                long = cm % 10 === 0;
            pen.line(g, x, ry, x, ry - (long ? 0.5 : 0.25) * U, "ruler", { strokeWidth: 1.1 });
            if (long) soft(c, x, ry + 0.8 * U, String(cm), 11);
        }
        soft(c, end, ry - 0.8 * U, "cm", 11, "end");
        pen.line(g, lx, y, lx, ry, "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [4, 5],
        });
        a.lens = [lx, y - half, "up"];
        a.focus = [fx, y, "down"];
        return a;
    },
    describe: (p) =>
        p.mode === "telescope"
            ? "A telescope's tube with a big lens at the front and a small eyepiece at the back, their focuses written under them and starlight meeting between."
            : `A curved lens bending three parallel beams of light${p.show > 0 ? " so that they meet at one point" : ""}, over a ruler in centimetres from the lens.`,
    reads: true,
});
