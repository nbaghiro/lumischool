import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, soft } from "../lettering";

/**
 * The shapes a lump of clay is pressed into, each with how many centimetres it sinks through the
 * water in a second: the pointed one parts the water and slips through it, the flat one has to push
 * the most water aside and is slowest. A tube is sixty centimetres deep, so they reach the bottom in
 * two, three, four and ten seconds.
 */
export const SHAPES: Record<string, { name: string; speed: number }> = {
    pointed: { name: "pointed", speed: 30 },
    ball: { name: "ball", speed: 20 },
    cube: { name: "cube", speed: 15 },
    flat: { name: "flat", speed: 6 },
};
/** How deep a tube's water is, in centimetres. */
export const TUBE = 60;
/** Centimetres to a square down the tube. */
const CM = 5;

/** How far down the tube a shape has sunk after a number of seconds, stopping at the bottom. */
export const sunkBy = (shape: string, seconds: number): number =>
    Math.min(TUBE, (SHAPES[shape]?.speed ?? 0) * Math.max(0, seconds));

/** How many seconds a shape takes to reach the bottom of the tube. */
export const secondsDown = (shape: string): number => TUBE / (SHAPES[shape]?.speed ?? 1);

const shapesOf = (list: readonly string[]): string[] => list.filter((s) => s in SHAPES).slice(0, 4);

export const droptube = defineDrawing({
    id: "droptube",
    family: "science",
    title: "Shapes sinking in tubes",
    group: "Structures",
    about: "Two to four tall tubes of water side by side, each with a lump of clay of the same weight pressed into a different shape and let go together at the top, and a scale in centimetres down the side. After `time` seconds each shape has sunk by its own steady speed, from fastest to slowest the pointed one, the ball, the cube and the flat one, because the water pushes back hardest on the shape that has to push most water out of its way. The tubes are sixty centimetres deep, so the shapes reach the bottom in two, three, four and ten seconds. `grams` writes each lump's weight under its tube, and with `show` at 0 the shapes wait at the top under a question mark, for a prediction.",
    params: { shapes: ["pointed", "flat"], time: 1, grams: [20, 20], show: 1 },
    settings: {
        shapes: { kind: "words", most: 4, of: Object.keys(SHAPES) },
        time: { kind: "whole", min: 0, max: 10 },
        grams: { kind: "numbers", min: 0, max: 100, most: 4 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Pointed and flat, after a second",
            params: { shapes: ["pointed", "flat"], time: 1, grams: [20, 20], show: 1 },
        },
        {
            label: "Four shapes after two seconds",
            params: {
                shapes: ["ball", "flat", "pointed", "cube"],
                time: 2,
                grams: [20, 20, 20, 20],
                show: 1,
            },
        },
        {
            label: "Which reaches the bottom first?",
            params: { shapes: ["cube", "ball", "pointed"], time: 0, grams: [20, 20, 20], show: 0 },
        },
    ],
    box: (p) => ({ w: Math.ceil(2.6 + Math.max(2, shapesOf(p.shapes).length) * 3.5), h: 17 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            list = shapesOf(p.shapes),
            show = p.show > 0,
            top = 1.8 * U,
            bottom = top + (TUBE / CM) * U;
        // the scale down the left, from the surface, numbered every ten centimetres
        const sx = 2.2 * U;
        for (let d = 0; d <= TUBE; d += CM) {
            const y = top + (d / CM) * U,
                long = d % 10 === 0;
            pen.line(g, sx - (long ? 0.45 : 0.25) * U, y, sx, y, "ruler", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
            });
            if (long) soft(c, sx - 0.55 * U, y + 4, String(d), 11, "end");
        }
        soft(c, sx - 0.55 * U, top - 0.35 * U, "cm", 11, "end");
        list.forEach((shape, i) => {
            const x = (4.2 + i * 3.5) * U,
                lx = x - 1.1 * U,
                rx = x + 1.1 * U;
            pen.rect(g, lx, top, rx - lx, bottom - top, "ruler", pen.fill("sky", "solid"), {
                strokeWidth: 0,
            });
            pen.path(g, `M${lx} ${top - 0.8 * U}V${bottom}H${rx}V${top - 0.8 * U}`, "ruler", null, {
                strokeWidth: 2.2,
            });
            pen.line(g, lx, top, rx, top, "ruler", { strokeWidth: 1.4 });
            for (let d = 10; d < TUBE; d += 10) {
                const y = top + (d / CM) * U;
                pen.line(g, lx, y, lx + 0.3 * U, y, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
            }
            const down = show ? sunkBy(shape, p.time) : 0,
                cy = top + (down / CM) * U,
                clay = pen.fill("berry"),
                s = { strokeWidth: 1.8 };
            // each shape is drawn with its leading edge at the depth it has reached
            if (shape === "pointed")
                pen.path(
                    g,
                    `M${x} ${cy}Q${x + 0.55 * U} ${cy - 0.5 * U} ${x + 0.35 * U} ${cy - 1.4 * U}H${x - 0.35 * U}Q${x - 0.55 * U} ${cy - 0.5 * U} ${x} ${cy}Z`,
                    "pencil",
                    clay,
                    s,
                );
            else if (shape === "ball") pen.circle(g, x, cy - 0.5 * U, 1 * U, "pencil", clay, s);
            else if (shape === "cube")
                pen.rect(g, x - 0.42 * U, cy - 0.84 * U, 0.84 * U, 0.84 * U, "pencil", clay, s);
            else pen.rect(g, x - 0.9 * U, cy - 0.28 * U, 1.8 * U, 0.28 * U, "pencil", clay, s);
            if (!show) penned(c, x, top + 3.2 * U, "?", 24);
            a[`shape(${i})`] = [x, cy, "right"];
            patch(c, x, bottom + 0.8 * U, 24, 18);
            num(c, x, bottom + 1.05 * U, "ABCD"[i] ?? "?", 16);
            soft(c, x, bottom + 2 * U, SHAPES[shape]?.name ?? shape, 11);
            const gr = p.grams[i];
            if (gr !== undefined) soft(c, x, bottom + 2.8 * U, `${gr} g`, 11);
        });
        if (show && p.time > 0)
            num(
                c,
                0.3 * U,
                0.6 * U,
                `after ${p.time} second${p.time === 1 ? "" : "s"}`,
                12,
                "start",
            );
        a.tubes = [(4.2 + ((list.length - 1) * 3.5) / 2) * U, top - 0.8 * U, "up"];
        return a;
    },
    describe: (p) =>
        `Tubes of water side by side, each with a lump of clay pressed into a different shape${p.show > 0 ? " sinking through it" : " waiting at the top"}, and a scale in centimetres down the side.`,
    reads: true,
});
