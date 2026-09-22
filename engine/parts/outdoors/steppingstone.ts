import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The stone's box for a width, and where its top stands, in squares; a game lands on the top and floats the box in the water below it. */
export const STONE = { top: 0.55, h: 2 } as const;

export const steppingStone = defineDrawing({
    id: "steppingstone",
    family: "outdoors",
    title: "Stepping stone",
    group: "Props",
    about: "A flat stone standing in a stream, seen from the side with its top just above the water and the number it stands at written on the top. A dark stone is the kind that sinks once it has been stood on, so a child knows which is which before hopping. The number can be left off.",
    params: { n: "5", w: 3, dark: 0 },
    settings: {
        n: { kind: "text", most: 4 },
        w: { kind: "whole", min: 2, max: 6 },
        dark: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The stone at five", params: { n: "5", w: 3, dark: 0 } },
        { label: "A dark stone that will sink", params: { n: "10", w: 3, dark: 1 } },
        { label: "A wide one with no number", params: { n: "", w: 5, dark: 0 } },
        { label: "A narrow one at minus 13", params: { n: "−13", w: 2, dark: 0 } },
    ],
    box: (p) => ({ w: whole(p.w, 2, 6, 3), h: STONE.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w, 2, 6, 3) * U,
            top = STONE.top * U,
            dark = Number(p.dark) > 0,
            wl = top + 0.75 * U;
        const face = dark ? pen.fill("ink-soft", "solid") : pen.fill("card");
        // the stone's body under the water, seen through it faintly, then its top as a low dome the number sits on, with the wet band under its brow
        pen.path(
            g,
            `M${0.25 * U} ${top + 0.55 * U}C${0.05 * U} ${top + 1.1 * U} ${w * 0.2} ${top + 1.5 * U} ${w * 0.45} ${top + 1.45 * U}C${w * 0.75 - 2} ${top + 1.5 * U} ${w - 0.05 * U} ${top + 1.05 * U} ${w - 0.25 * U} ${top + 0.4 * U}Z`,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5, hachureAngle: 30, fillWeight: 0.7 }),
            { strokeWidth: 1.1, stroke: c.t.sky, disableMultiStroke: true },
        );
        pen.path(
            g,
            `M${0.2 * U} ${top + 0.5 * U}Q${0.15 * U} ${top - 0.05 * U} ${w * 0.35} ${top + 0.02 * U}Q${w * 0.65} ${top - 0.12 * U} ${w - 0.2 * U} ${top + 0.35 * U}Q${w - 0.1 * U} ${top + 0.75 * U} ${w * 0.6} ${top + 0.85 * U}Q${w * 0.3} ${top + 0.9 * U} ${0.2 * U} ${top + 0.5 * U}Z`,
            "pencil",
            face,
            calm(c, dark ? 2.2 : 2),
        );
        pen.path(
            g,
            `M${0.35 * U} ${top + 0.62 * U}Q${w * 0.3} ${top + 0.82 * U} ${w * 0.6} ${top + 0.78 * U}Q${w - 0.2 * U} ${top + 0.7 * U} ${w - 0.25 * U} ${top + 0.45 * U}`,
            "ruler",
            null,
            {
                strokeWidth: dark ? 1.2 : 1.6,
                stroke: dark ? c.t.card : c.t["ink-soft"],
                disableMultiStroke: true,
            },
        );
        if (!dark)
            pen.path(
                g,
                `M${0.5 * U} ${top + 0.42 * U}Q${w * 0.5} ${top + 0.22 * U} ${w - 0.5 * U} ${top + 0.5 * U}`,
                "ruler",
                null,
                { strokeWidth: 1, stroke: c.t["ink-soft"], disableMultiStroke: true },
            );
        for (const x of [0.15 * U, w - 0.15 * U]) {
            pen.path(
                g,
                `M${x - 0.25 * U} ${wl}Q${x} ${wl - 0.18 * U} ${x + 0.25 * U} ${wl}`,
                "ruler",
                null,
                { strokeWidth: 1.4, stroke: c.t.sky, disableMultiStroke: true },
            );
        }
        const label = String(p.n ?? "");
        if (label) {
            const size = w >= 3 * U ? 17 : 14;
            patch(c, w / 2, top + 0.45 * U, Math.min(w - 10, 12 + label.length * 10), size);
            num(
                c,
                w / 2,
                top + 0.45 * U + size * 0.36,
                label,
                size,
                "middle",
                dark && !c.paper ? c.t.card : c.t.ink,
            );
        }
        return {
            top: [w / 2, top, "up"],
            left: [0.2 * U, top + 0.5 * U, "left"],
            right: [w - 0.2 * U, top + 0.35 * U, "right"],
            waterline: [w / 2, wl, "down"],
        };
    },
    describe: (p) =>
        `A flat ${Number(p.dark) > 0 ? "dark" : "pale"} stone standing in a stream seen from the side, its top just above the water with ripples at each side${String(p.n ?? "") ? " and a number written on the top" : ""}.`,
    motion: {
        still: "A stone stands in the stream; a game sinks the dark kind, and the water moves round it.",
    },
});
