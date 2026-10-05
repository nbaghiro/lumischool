import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * A greenhouse seen from above: a white frame of glazing bars over a pale tint of glass, so the beds
 * under it show through and read as indoors.
 */
export const greenhouse = defineDrawing<{ width: number; height: number }>({
    id: "greenhouse",
    family: "outdoors",
    title: "Greenhouse",
    group: "Structures",
    about: "A greenhouse seen from above: a light frame of glazing bars over a pale tint of glass, with a ridge down the middle, the beds inside showing through.",
    params: { width: 24, height: 10 },
    settings: {
        width: { kind: "number", min: 6, max: 40, step: 1 },
        height: { kind: "number", min: 4, max: 20, step: 1 },
    },
    takes: [
        { label: "A long greenhouse", params: { width: 24, height: 10 } },
        { label: "A small one", params: { width: 8, height: 6 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const m = 0.15 * U,
            w = p.width * U,
            h = p.height * U;
        if (!c.paper)
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: h - 2 * m,
                fill: c.t.sky,
                opacity: 0.12,
            });
        c.pen.rect(c.g, m, m, w - 2 * m, h - 2 * m, "ruler", null, { strokeWidth: 1.6 });
        // the ridge, and the glazing bars running down to the eaves
        c.pen.line(c.g, m, h / 2, w - m, h / 2, "ruler", { strokeWidth: 1.2 });
        for (let x = 2 * U; x < w - U; x += 2 * U)
            c.pen.line(c.g, x, m, x, h - m, "ruler", { stroke: c.t["ink-soft"], strokeWidth: 0.5 });
        return {};
    },
    describe: () =>
        "A greenhouse seen from above, a light frame of glazing bars over pale glass with a ridge along the middle, the beds inside showing through.",
    motion: {
        still: "A greenhouse is the room plants grow in; if it moved, everything in it would seem to slide.",
    },
});
