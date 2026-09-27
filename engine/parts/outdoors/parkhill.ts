import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * How high a hill `w` squares across and `h` high stands `x` squares from its left foot: a smooth
 * mound, flat where it meets the ground. The pups' park builds its slope to this.
 */
export const hillAt = (w: number, h: number, x: number): number =>
    x <= 0 || x >= w ? 0 : (h * (1 - Math.cos((2 * Math.PI * x) / w))) / 2;

const whole = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

export const parkHill = defineDrawing<{ w: number; h: number; snow: number }>({
    id: "parkhill",
    family: "outdoors",
    title: "Grassy hill",
    group: "Structures",
    about: "A smooth grassy mound rising from flat ground, seen from the side, green with grass hatching or white with snow, for rolling a ball down or climbing up.",
    params: { w: 10, h: 3, snow: 0 },
    settings: {
        w: { kind: "whole", min: 4, max: 24 },
        h: { kind: "whole", min: 1, max: 8 },
        snow: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A low green hill", params: { w: 10, h: 3, snow: 0 } },
        { label: "A tall snowy hill", params: { w: 12, h: 5, snow: 1 } },
    ],
    box: (p) => ({ w: whole(p.w, 4, 24), h: whole(p.h, 1, 8) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.w, 4, 24),
            h = whole(p.h, 1, 8),
            snow = p.snow > 0;
        // the top is drawn a little inside the box, so the pencil's wobble stays within it
        const inset = 0.3,
            y = (x: number) => (h - hillAt(w, h, x) * ((h - inset) / h)) * U;
        let top = `M0 ${h * U}`;
        for (let i = 1; i <= 40; i++) top += `L${((w * i) / 40) * U} ${y((w * i) / 40)}`;
        // the fill covers the ground's line under the hill, and only the hill's top is inked
        pen.path(g, `${top}Z`, "pencil", pen.fill("card"), { stroke: "none" });
        pen.path(
            g,
            `${top}Z`,
            "pencil",
            snow
                ? pen.fill("sky", "hachure", { hachureGap: 14, fillWeight: 0.5 })
                : pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        pen.path(g, top, "pencil", null, { strokeWidth: 2.2 });
        if (!snow)
            for (let x = 1; x < w - 0.5; x += 1.8) {
                const t = y(x);
                pen.line(g, x * U, t, x * U - 3, t - 5, "pencil", { strokeWidth: 1.2 });
                pen.line(g, x * U + 4, t, x * U + 6, t - 5, "pencil", { strokeWidth: 1.2 });
            }
        return { top: [(w / 2) * U, y(w / 2), "up"] };
    },
    describe: (p) =>
        p.snow > 0
            ? "A smooth white hill of snow rising from flat ground, seen from the side, with a ruled line over its top and pale blue hatching under it."
            : "A smooth grassy hill rising from flat ground, seen from the side, with a ruled line over its top, green hatching under it and tufts of grass.",
});
