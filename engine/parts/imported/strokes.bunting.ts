import { strokesDrawing } from "./hand";

export const bunting = strokesDrawing({
    name: "bunting",
    family: "home",
    title: "Bunting",
    about: "Seven flags on a sagging string, inked with pressure strokes and coloured with a marker. A row of repeating colours is a pattern to continue as well as a decoration. Anchors at both ends and the middle flag. Stroke file with pressure.",
    describe:
        "A string of bunting sagging between two ends, with seven triangular flags hanging from it in repeating colours, inked with pressure strokes.",
    motion: {
        body: { is: "float", lift: 5, dx: 0, deg: 0, period: 6.6, units: true },
        parts: {
            flag: {
                is: "sway",
                of: [
                    [1, 2, 3, 4, 5],
                    [6, 7, 8, 9, 10],
                    [11, 12, 13, 14, 15],
                    [16, 17, 18, 19, 20],
                    [21, 22, 23, 24, 25],
                    [26, 27, 28, 29, 30],
                    [31, 32, 33, 34, 35],
                ],
                paths: true,
                deg: 14,
                range: [-1, 0.3],
                period: 2.6,
                wave: 0.22,
                origin: [0.5, 0],
            },
        },
        react: { kind: "gust" },
    },
});
