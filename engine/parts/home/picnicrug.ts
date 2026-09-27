import { clip, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const picnicRug = defineDrawing<{ w: number; colour: Marker }>({
    id: "picnicrug",
    family: "home",
    title: "Picnic rug",
    group: "Props",
    about: "A checked picnic rug spread on the grass, seen from a little above so its squares show, for a picnic a story or a game ends at. Its width and the colour of its checks are settings.",
    params: { w: 6, colour: "berry" },
    settings: {
        w: { kind: "whole", min: 3, max: 12 },
        colour: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "Six squares wide, pink checks", params: { w: 6, colour: "berry" } },
        { label: "A small blue one", params: { w: 4, colour: "sky" } },
        { label: "A long green one", params: { w: 10, colour: "mint" } },
    ],
    box: (p) => ({ w: whole(p.w, 3, 12, 6), h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w, 3, 12, 6) * U,
            near = 1.75 * U,
            far = 0.7 * U,
            inset = 0.7 * U;
        const outline: [number, number][] = [
            [0.2 * U, near],
            [w - 0.2 * U, near],
            [w - inset, far],
            [inset, far],
        ];
        pen.polygon(g, outline, "pencil", pen.fill("card"), {
            strokeWidth: 1.6,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        const k = clip(c, { kind: "polygon", points: outline });
        const across = Math.round(w / (0.5 * U)),
            rows = 4;
        for (let i = 0; i < across; i += 2)
            for (let j = 0; j < rows; j++) {
                if ((i / 2 + j) % 2) continue;
                const y0 = far + ((near - far) * j) / rows,
                    y1 = far + ((near - far) * (j + 1)) / rows;
                const at = (t: number, y: number) => {
                    const s = (y - far) / (near - far),
                        l = inset + (0.2 * U - inset) * s,
                        r = w - inset + (inset - 0.2 * U) * s;
                    return l + ((r - l) * t) / across;
                };
                k.pen.polygon(
                    k.g,
                    [
                        [at(i, y0), y0],
                        [at(i + 1, y0), y0],
                        [at(i + 1, y1), y1],
                        [at(i, y1), y1],
                    ],
                    "ruler",
                    pen.fill(p.colour),
                    { strokeWidth: 0, stroke: "none", disableMultiStroke: true },
                );
            }
        pen.polygon(g, outline, "ruler", null, { strokeWidth: 1.4, disableMultiStroke: true });
        return { top: [w / 2, (far + near) / 2, "up"], left: [inset, far, "up"] };
    },
    describe: (p) =>
        `A picnic rug spread flat on the grass, seen from a little above, checked in ${MARKER_WORD[p.colour]} and white squares with a plain edge.`,
    motion: {
        still: "A rug lies flat on the ground; if it moved, whatever stands on it would seem to slide.",
    },
});
