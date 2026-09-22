import { defineDrawing } from "../drawing";
import { coordGrid, type Plot } from "./coords";

// The grid draws a label only when there is one, so an empty mark means an unlabelled point.
const gridParams = (p: {
    max: number;
    quadrants: number;
    px: number;
    py: number;
    mark: string;
}) => {
    const points: Plot[] = [{ x: p.px, y: p.py, label: p.mark }];
    return { max: p.max, quadrants: p.quadrants, join: false, points };
};

export const plotPoint = defineDrawing({
    id: "plotpoint",
    family: "shapes",
    title: "Point on a grid",
    group: "Structures",
    about: "A coordinate grid with one point marked on it, given as two numbers. One unit to two squares, so the point always lands on a crossing of the ruled page.",
    params: { max: 6, quadrants: 1, px: 3, py: 4, mark: "" },
    settings: {
        max: { kind: "whole", min: 1, max: 12 },
        quadrants: { kind: "one of", of: [1, 4] },
        px: { kind: "whole", min: -12, max: 12 },
        py: { kind: "whole", min: -12, max: 12 },
        mark: { kind: "text", most: 4 },
    },
    takes: [
        { label: "One quadrant", params: { max: 6, quadrants: 1, px: 3, py: 4, mark: "" } },
        { label: "Four quadrants", params: { max: 4, quadrants: 4, px: -2, py: 3, mark: "" } },
    ],
    box: (p) => coordGrid.box({ ...gridParams(p) }),
    draw: (c, p) => coordGrid.draw(c, { ...gridParams(p) }),
    describe: (p) =>
        `A coordinate grid ruled in ink with numbered axes, one unit to two squares, and one point marked on it as a dot${p.mark ? " with a label beside it" : ""}.`,
});
