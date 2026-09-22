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

/** Where the buoy's waterline runs down its box, in squares; a game floats it by that. */
export const MOORINGBUOY = { w: 3, h: 3, waterline: 2.05 } as const;

export const mooringBuoy = defineDrawing({
    id: "mooringbuoy",
    family: "travel",
    title: "Mooring buoy",
    group: "Props",
    about: "A round mooring buoy riding on the water, seen from the side: a float painted with a band, a ring on top to tie a boat's rope to, and the metres it is moored at painted on its side. The number can be left off.",
    params: { n: "64" },
    settings: { n: { kind: "text", most: 4 } },
    takes: [
        { label: "Moored at 64 metres", params: { n: "64" } },
        { label: "No number", params: { n: "" } },
    ],
    box: () => ({ w: MOORINGBUOY.w, h: MOORINGBUOY.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            cx = 1.5 * U,
            cy = 1.85 * U,
            d = 2.2 * U,
            wl = MOORINGBUOY.waterline * U;
        pen.circle(g, cx, cy, d, "pencil", pen.fill("glow"), calm(c, 2));
        pen.path(
            g,
            `M${cx - d / 2 + 2} ${cy - 0.15 * U}Q${cx} ${cy + 0.1 * U} ${cx + d / 2 - 2} ${cy - 0.15 * U}Q${cx} ${cy - 0.42 * U} ${cx - d / 2 + 2} ${cy - 0.15 * U}Z`,
            "ruler",
            pen.fill("berry"),
            calm(c, 1.3),
        );
        pen.rect(
            g,
            cx - 0.14 * U,
            cy - d / 2 - 0.25 * U,
            0.28 * U,
            0.3 * U,
            "ruler",
            pen.fill("ink-soft"),
            calm(c, 1.1),
        );
        pen.circle(g, cx, cy - d / 2 - 0.45 * U, 0.42 * U, "ruler", null, {
            strokeWidth: 2,
            disableMultiStroke: true,
        });
        const label = String(p.n ?? "");
        if (label) {
            patch(c, cx, cy + 0.45 * U, 30, 16);
            num(c, cx, cy + 0.45 * U + 6, label, 17);
        }
        for (let x = 0.2 * U; x + 0.65 * U <= 2.85 * U; x += 0.65 * U) {
            pen.curve(
                g,
                [
                    [x, wl],
                    [x + 0.16 * U, wl - 0.13 * U],
                    [x + 0.33 * U, wl],
                    [x + 0.49 * U, wl - 0.13 * U],
                    [x + 0.65 * U, wl],
                ],
                "pencil",
                { ...calm(c, 1.3), stroke: c.t.sky },
            );
        }
        return { ring: [cx, cy - d / 2 - 0.45 * U, "up"], waterline: [cx, wl, "down"] };
    },
    describe: (p) =>
        `A round yellow mooring buoy riding on blue water seen from the side, a pink band round its middle, a ring on top${String(p.n ?? "") ? " and a number painted on its side" : ""}.`,
    motion: {
        still: "A game bobs it on the water; on the shelf it holds still so its number can be read.",
    },
});
