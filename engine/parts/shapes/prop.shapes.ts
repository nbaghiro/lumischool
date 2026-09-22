import type { Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { shape, type ShapeKind } from "../props";

const COLOURS: readonly Marker[] = ["sky", "mint", "berry", "tang", "glow"];

export const shapesV = defineDrawing({
    id: "prop.shapes",
    family: "shapes",
    title: "Flat shapes",
    group: "Props",
    about: "Pattern and sorting puzzles.",
    params: {
        kinds: ["triangle", "square", "circle", "pentagon", "hexagon", "rectangle"] as ShapeKind[],
    },
    settings: {
        kinds: {
            kind: "words",
            of: ["triangle", "square", "circle", "pentagon", "hexagon", "rectangle"],
            most: 8,
        },
    },
    takes: [
        {
            label: "All six",
            params: { kinds: ["triangle", "square", "circle", "pentagon", "hexagon", "rectangle"] },
        },
        { label: "Three corners up", params: { kinds: ["triangle", "triangle", "triangle"] } },
        { label: "Round and straight", params: { kinds: ["circle", "square"] } },
    ],
    box: (p) => ({ w: Math.ceil(p.kinds.length * 2.5) + 1, h: 3 }),
    draw: (c, p) => {
        p.kinds.forEach((k, i) => shape(c, 32 + i * 50, 30, k, 16, COLOURS[i % COLOURS.length]));
        return { first: [32, 12, "up"] };
    },
    describe: () =>
        "A row of flat shapes drawn with a ruler and filled in the page's colours, spaced evenly along one line of the squared paper.",
});
