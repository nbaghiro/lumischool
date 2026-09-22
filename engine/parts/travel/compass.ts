import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

export const compassRose = defineDrawing({
    id: "compass",
    family: "travel",
    title: "Compass rose",
    group: "Props",
    about: "A compass rose with north, east, south and west, the points between them, and a needle that can be set to any bearing. Turning from one letter to the next is a right angle, which is what makes it useful beside a protractor.",
    params: { needle: 0 },
    settings: { needle: { kind: "whole", min: 0, max: 359 } },
    takes: [
        { label: "Needle north", params: { needle: 0 } },
        { label: "Needle at 135°", params: { needle: 135 } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4 * U,
            cy = 4 * U,
            R = 2.9 * U;
        pen.circle(g, cx, cy, R * 2, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        pen.circle(g, cx, cy, R * 1.5, "ruler", null, { strokeWidth: 1, stroke: c.t["ink-soft"] });
        const point = (ang: number, len: number, wid: number, main: boolean, north: boolean) => {
            const dx = Math.sin(ang),
                dy = -Math.cos(ang),
                nx = -dy,
                ny = dx;
            const tip: Pt = [cx + dx * len, cy + dy * len],
                l: Pt = [cx + nx * wid, cy + ny * wid],
                r: Pt = [cx - nx * wid, cy - ny * wid];
            pen.polygon(
                g,
                [[cx, cy], l, tip],
                "ruler",
                north
                    ? pen.fill("berry")
                    : main
                      ? pen.fill("ink-soft", "hachure", { hachureGap: 3 })
                      : pen.fill("sky"),
                { strokeWidth: 1.2 },
            );
            pen.polygon(g, [[cx, cy], r, tip], "ruler", pen.fill("card"), { strokeWidth: 1.2 });
        };
        for (let k = 0; k < 4; k++)
            point(Math.PI / 4 + (k * Math.PI) / 2, R * 0.72, 7, false, false);
        for (let k = 0; k < 4; k++) point((k * Math.PI) / 2, R * 1.02, 11, true, k === 0);
        const a: RawAnchors = {};
        ["N", "E", "S", "W"].forEach((s, k) => {
            const ang = (k * Math.PI) / 2,
                x = cx + Math.sin(ang) * (R + 0.55 * U),
                y = cy - Math.cos(ang) * (R + 0.55 * U);
            num(c, x, y + 6, s, 17);
            a[s] = [x, y, k === 0 ? "up" : k === 1 ? "right" : k === 2 ? "down" : "left"];
        });
        const t = ((p.needle ?? 0) * Math.PI) / 180,
            dx = Math.sin(t),
            dy = -Math.cos(t);
        pen.line(
            g,
            cx - dx * R * 0.55,
            cy - dy * R * 0.55,
            cx + dx * R * 0.85,
            cy + dy * R * 0.85,
            "ruler",
            { strokeWidth: 3.2, stroke: c.t.tang },
        );
        pen.circle(g, cx, cy, 9, "ruler", pen.fill("glow"), { strokeWidth: 1.2 });
        a.needle = [cx + dx * R * 0.85, cy + dy * R * 0.85, "up"];
        return a;
    },
    describe: () =>
        "A compass rose on a card with the letters N, E, S and W round it, a star of points between them and an orange needle turning about the middle.",
    motion: { still: STILL.instrument },
    reads: true,
});
