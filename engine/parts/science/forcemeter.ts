import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, soft } from "../lettering";

/** The surfaces a shoe can be dragged over, roughest last, with the word written under each. */
const SURFACES = ["ice", "wood", "carpet", "sandpaper"] as const;

const surfaceOf = (k: number): number => Math.max(0, Math.min(3, Math.round(k)));

/** A strip of floor from x0 to x1 with its top at y, textured as the surface it is. */
function floor<G>(c: Ctx<G>, k: number, x0: number, x1: number, y: number): void {
    const { pen, g } = c,
        h = 0.9 * U,
        soft1 = { strokeWidth: 1, stroke: c.t["ink-soft"] };
    const fill = [
        pen.fill("sky"),
        pen.fill("tang", "hachure", { hachureGap: 6 }),
        pen.fill("berry", "hachure", { hachureGap: 4 }),
        pen.fill("glow", "dots"),
    ][k];
    pen.rect(g, x0, y, x1 - x0, h, "ruler", fill, { strokeWidth: 1.8 });
    if (k === 0)
        for (let x = x0 + 0.8 * U; x < x1 - 0.6 * U; x += 2.4 * U)
            pen.line(g, x, y + 0.3 * U, x + 0.8 * U, y + 0.3 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.card,
            });
    if (k === 2) {
        const pts: [number, number][] = [];
        for (let x = x0, i = 0; x <= x1; x += 0.25 * U, i++)
            pts.push([x, y - (i % 2 ? 0.18 * U : 0)]);
        pen.linear(g, pts, "pencil", soft1);
    }
    if (k === 3)
        for (let x = x0 + 0.3 * U; x < x1; x += 0.45 * U)
            pen.circle(
                g,
                x,
                y - 1.5,
                2.5,
                "ruler",
                { fill: c.t["ink-soft"], fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
}

export const forcemeter = defineDrawing({
    id: "forcemeter",
    family: "science",
    title: "Force meter and a shoe",
    group: "Structures",
    about: "A force meter pulling a shoe along a floor: a clear tube with a spring inside, a scale in newtons along it, and a pointer where the spring has stretched to. The pointer sits at exactly the reading given, so the meter is read the way a ruler is. The floor is ice, wood, carpet or sandpaper, a number 0 to 3, which is what a fair test of friction changes.",
    params: { reading: 3, max: 10, surface: 1, unit: "N" },
    settings: {
        reading: { kind: "number", min: 0, max: 20, step: 0.5 },
        max: { kind: "whole", min: 5, max: 20 },
        surface: { kind: "whole", min: 0, max: 3 },
        unit: { kind: "text", most: 3 },
    },
    takes: [
        { label: "Across wood", params: { reading: 3, max: 10, surface: 1, unit: "N" } },
        { label: "Across ice", params: { reading: 1, max: 10, surface: 0, unit: "N" } },
        { label: "Across sandpaper", params: { reading: 8, max: 10, surface: 3, unit: "N" } },
    ],
    box: () => ({ w: 24, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            k = surfaceOf(p.surface),
            max = Math.max(5, Math.round(p.max));
        const top = 6.2 * U,
            my = 4.6 * U,
            x0 = 4.4 * U,
            L = 8 * U,
            at = (v: number) => x0 + (Math.max(0, Math.min(max, v)) / max) * L;
        floor(c, k, 13 * U, 23.6 * U, top);
        cap(c, 18.3 * U, top + 2.1 * U, SURFACES[k] ?? "wood", 11);
        // the shoe, toe first, the way it is being pulled
        const sx = 16.6 * U;
        pen.path(
            g,
            `M${sx} ${top}V${top - 0.9 * U}Q${sx} ${top - 1.7 * U} ${sx + 1.2 * U} ${top - 1.8 * U}L${sx + 2.6 * U} ${top - 2 * U}` +
                `Q${sx + 3.2 * U} ${top - 3 * U} ${sx + 4.4 * U} ${top - 2.9 * U}L${sx + 5.2 * U} ${top - 2.8 * U}V${top}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.9 },
        );
        pen.rect(g, sx - 0.1 * U, top - 0.45 * U, 5.4 * U, 0.45 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.6,
        });
        for (const dx of [2.9, 3.4, 3.9])
            pen.line(g, sx + dx * U, top - 2.3 * U, sx + (dx + 0.3) * U, top - 1.9 * U, "pencil", {
                strokeWidth: 1.2,
            });
        a.shoe = [sx + 2.6 * U, top - 3 * U, "up"];
        // the meter: its ring for the hand, the tube, the scale, the spring and the pointer
        const tx0 = 3.4 * U,
            tx1 = 13.2 * U,
            th = 1.4 * U;
        pen.circle(g, 2.4 * U, my, 1.3 * U, "ruler", null, { strokeWidth: 2.6 });
        pen.line(g, 3 * U, my, tx0, my, "ruler", { strokeWidth: 2.4 });
        pen.path(g, roundedRect(tx0, my - th / 2, tx1 - tx0, th, 8), "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        const step = max <= 10 ? 2 : 5;
        for (let v = 0; v <= max; v++) {
            const x = at(v),
                major = v % step === 0;
            pen.line(g, x, my - th / 2, x, my - th / 2 + (major ? 0.45 : 0.25) * U, "ruler", {
                strokeWidth: major ? 1.4 : 0.9,
            });
            if (major) {
                num(c, x, my - th / 2 - 0.3 * U, v, 12);
                a[`mark(${v})`] = [x, my - th / 2, "up"];
            }
        }
        const px = at(p.reading),
            coils = 9,
            pts: [number, number][] = [[tx0 + 0.3 * U, my]];
        for (let i = 1; i < coils * 2; i++)
            pts.push([
                tx0 + 0.3 * U + ((px - tx0 - 0.5 * U) * i) / (coils * 2),
                my + (i % 2 ? -0.32 : 0.32) * U,
            ]);
        pts.push([px - 0.2 * U, my]);
        pen.linear(g, pts, "pencil", { strokeWidth: 1.5, stroke: c.t["ink-soft"] });
        pen.line(g, px, my, tx1 + 0.8 * U, my, "ruler", { strokeWidth: 2.2 });
        pen.polygon(
            g,
            [
                [px, my - 0.2 * U],
                [px - 0.3 * U, my + 0.5 * U],
                [px + 0.3 * U, my + 0.5 * U],
            ],
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1.2 },
        );
        a.pointer = [px, my + 0.6 * U, "down"];
        soft(c, tx1 - 0.2 * U, my + th / 2 + 0.7 * U, p.unit, 12, "end");
        // the hook, and the string to the shoe's toe
        pen.arc(g, tx1 + 1.1 * U, my, 0.6 * U, 0.6 * U, Math.PI * 0.6, Math.PI * 2.1, "ruler", {
            strokeWidth: 2,
        });
        pen.line(g, tx1 + 1.4 * U, my, sx, top - 1.1 * U, "pencil", { strokeWidth: 1.4 });
        // the pull, by the hand on the ring
        pen.line(g, 1.2 * U, my, 0.2 * U, my, "ruler", { strokeWidth: 3 });
        pen.polygon(
            g,
            [
                [0.05 * U, my],
                [0.6 * U, my - 0.4 * U],
                [0.6 * U, my + 0.4 * U],
            ],
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        soft(c, 1.3 * U, my + 1.7 * U, "pull", 12);
        return a;
    },
    describe: (p) =>
        `A force meter pulling a shoe along a floor of ${SURFACES[surfaceOf(p.surface)] ?? "wood"}, a clear tube with a spring inside, a scale along it and a pointer at the spring's end.`,
    reads: true,
});
