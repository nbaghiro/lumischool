// The pole a show jump is made of, drawn lying flat with its ends squared off. A game rests it in
// two cups and turns the whole drawing when a hoof knocks it out of them.
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "tang";

export const jumpPole = defineDrawing({
    id: "jumppole",
    family: "sport",
    title: "Jump pole",
    group: "Props",
    about: "A striped pole for a show jump, drawn lying along its box with a squared end at each side. Its stripes are the fence's colour, and a game turns the drawing to lay it on the grass once a hoof has knocked it down.",
    params: { long: 4, tone: "tang", bands: 4 },
    settings: {
        long: { kind: "whole", min: 2, max: 6 },
        tone: { kind: "one of", of: MARKERS },
        bands: { kind: "whole", min: 2, max: 6 },
    },
    takes: [
        { label: "Four squares", params: { long: 4, tone: "tang", bands: 4 } },
        { label: "A wide oxer pole", params: { long: 6, tone: "sky", bands: 5 } },
        { label: "Short and plain", params: { long: 2, tone: "mint", bands: 2 } },
    ],
    box: (p) => ({ w: whole(p.long, 2, 6, 4), h: 1 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const long = whole(p.long, 2, 6, 4);
        const bands = whole(p.bands, 2, 6, 4);
        const tone = toneOf(p.tone);
        const W = long * U;
        const top = 6;
        const bot = 14;
        pen.polygon(
            g,
            [
                [3, top],
                [W - 3, top],
                [W - 3, bot],
                [3, bot],
            ],
            "pencil",
            pen.fill("card"),
            calm(c, 1.7),
        );
        // The bands, evenly along the pole, in the fence's own colour.
        const run = W - 6;
        const width = run / (bands * 2 - 1);
        for (let n = 0; n < bands; n++) {
            const x = 3 + n * 2 * width;
            pen.polygon(
                g,
                [
                    [x, top + 0.6],
                    [x + width, top + 0.6],
                    [x + width, bot - 0.6],
                    [x, bot - 0.6],
                ],
                "ruler",
                pen.fill(tone, "hachure", { hachureGap: 3, fillWeight: 0.8 }),
                { strokeWidth: 0.9 },
            );
        }
        // The squared ends, which are what sits in a cup.
        for (const x of [3, W - 3]) pen.line(g, x, top, x, bot, "ruler", { strokeWidth: 1.4 });
        return {
            left: [3, (top + bot) / 2, "left"],
            right: [W - 3, (top + bot) / 2, "right"],
            centre: [W / 2, (top + bot) / 2, "up"],
        } satisfies RawAnchors;
    },
    describe: (p) => {
        const long = whole(p.long, 2, 6, 4);
        return `A show jumping pole lying along its length, ${long} squares wide, painted in ${MARKER_WORD[toneOf(p.tone)]} and white bands with a squared end at each side.`;
    },
    motion: { still: "A pole rests in its cups until something knocks it, and the game moves it." },
});
