import { svgDrawing } from "./hand";

export const kite = svgDrawing({
    name: "kite",
    family: "home",
    title: "Kite",
    about: "A diamond kite in four panels with a tail of bows, so the same drawing is also a picture of a half and a quarter. Anchors at the nose, the knot, both spar ends and the end of the tail. Hand-drawn SVG.",
    describe:
        "A diamond kite in four coloured panels crossed by its spars, with a knot at the middle and a long tail of bows below it.",
    motion: {
        body: {
            is: "float",
            lift: 13,
            dx: 8,
            deg: 4,
            pivot: [0.5, 0.31],
            period: 7.4,
            units: true,
        },
        parts: {
            tail: {
                is: "sway",
                of: [[8, 9, 10, 11, 12]],
                paths: true,
                deg: 6,
                range: [-1.6, -0.2],
                period: 4.6,
                origin: [0.5, 0],
            },
        },
        react: { kind: "gust" },
    },
});
