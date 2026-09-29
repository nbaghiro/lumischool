import { type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { coordGrid, plane, type Plot } from "./coords";

type Pt = [number, number];

/** The shapes, as corners from the one a lesson places at (x, y); none has a line of symmetry, so a flip shows. */
const SHAPES: Record<number, Pt[]> = {
    1: [
        [0, 0],
        [2, 0],
        [0, 3],
    ],
    2: [
        [0, 0],
        [3, 0],
        [3, 1],
        [1, 1],
        [1, 2],
        [0, 2],
    ],
    3: [
        [0, 0],
        [3, 0],
        [2, 2],
        [0, 2],
    ],
};

const NAMES = "ABCDEF";

interface Moved {
    max: number;
    shape: number;
    x: number;
    y: number;
    move: string;
    dx: number;
    dy: number;
    mirror: string;
    turn: number;
    /** The centre of a rotation. */
    cx: number;
    cy: number;
    image: number;
    names: number;
}

/** Where a point goes: along (dx, dy), across an axis, or round (cx, cy) clockwise by a quarter turn at a time. */
export function imageOf(
    p: Pick<Moved, "move" | "mirror" | "turn" | "dx" | "dy" | "cx" | "cy">,
    [x, y]: Pt,
): Pt {
    if (p.move === "reflect") return p.mirror === "x" ? [x, -y] : [-x, y];
    if (p.move === "rotate") {
        const quarters = ((Math.round(p.turn / 90) % 4) + 4) % 4;
        const [u, v] = [x - p.cx, y - p.cy];
        const by: Pt[] = [
            [u, v],
            [v, -u],
            [-u, -v],
            [-v, u],
        ];
        const [ru, rv] = by[quarters] ?? [u, v];
        return [p.cx + ru, p.cy + rv];
    }
    return [x + p.dx, y + p.dy];
}

const cornersOf = (p: Moved): Pt[] =>
    (SHAPES[p.shape] ?? SHAPES[1] ?? []).map(([cx, cy]): Pt => [p.x + cx, p.y + cy]);

const gridOf = (p: Moved) => {
    const points: Plot[] = cornersOf(p).map(([x, y], i) => ({
        x,
        y,
        label: p.names === 1 ? (NAMES[i] ?? "") : "",
    }));
    return { max: p.max, quadrants: 4, points, join: true };
};

export const moveShape = defineDrawing<Moved>({
    id: "moveshape",
    family: "shapes",
    title: "Moved shape",
    group: "Structures",
    about: "A shape on the four-quadrant coordinate grid and its image after a translation, a reflection in an axis or a rotation clockwise about the origin or, with `cx` and `cy`, about another point of the grid, drawn as a ringed dot. Every corner of a shape on whole coordinates lands on whole coordinates. The image can be left off, so the question is where it lands.",
    params: {
        max: 5,
        shape: 1,
        x: 1,
        y: 1,
        move: "translate",
        dx: -4,
        dy: -3,
        mirror: "y",
        turn: 90,
        cx: 0,
        cy: 0,
        image: 1,
        names: 1,
    },
    settings: {
        max: { kind: "whole", min: 3, max: 8 },
        shape: { kind: "one of", of: [1, 2, 3] },
        x: { kind: "whole", min: -8, max: 8 },
        y: { kind: "whole", min: -8, max: 8 },
        move: { kind: "one of", of: ["translate", "reflect", "rotate"] },
        dx: { kind: "whole", min: -16, max: 16 },
        dy: { kind: "whole", min: -16, max: 16 },
        mirror: { kind: "one of", of: ["y", "x"] },
        turn: { kind: "one of", of: [90, 180, 270] },
        cx: { kind: "whole", min: -8, max: 8 },
        cy: { kind: "whole", min: -8, max: 8 },
        image: { kind: "one of", of: [0, 1] },
        names: { kind: "one of", of: [0, 1] },
    },
    takes: [
        {
            label: "Translated",
            params: {
                max: 5,
                shape: 1,
                x: 1,
                y: 1,
                move: "translate",
                dx: -4,
                dy: -3,
                mirror: "y",
                turn: 90,
                cx: 0,
                cy: 0,
                image: 1,
                names: 1,
            },
        },
        {
            label: "Reflected in the y axis",
            params: {
                max: 5,
                shape: 2,
                x: 1,
                y: 1,
                move: "reflect",
                dx: 0,
                dy: 0,
                mirror: "y",
                turn: 90,
                cx: 0,
                cy: 0,
                image: 1,
                names: 0,
            },
        },
        {
            label: "A quarter turn",
            params: {
                max: 5,
                shape: 3,
                x: 1,
                y: 1,
                move: "rotate",
                dx: 0,
                dy: 0,
                mirror: "y",
                turn: 90,
                cx: 0,
                cy: 0,
                image: 1,
                names: 1,
            },
        },
        {
            label: "Where will it land",
            params: {
                max: 4,
                shape: 1,
                x: 1,
                y: 1,
                move: "reflect",
                dx: 0,
                dy: 0,
                mirror: "x",
                turn: 90,
                cx: 0,
                cy: 0,
                image: 0,
                names: 1,
            },
        },
        {
            label: "A half turn about a point",
            params: {
                max: 5,
                shape: 3,
                x: 1,
                y: 1,
                move: "rotate",
                dx: 0,
                dy: 0,
                mirror: "y",
                turn: 180,
                cx: 0,
                cy: 1,
                image: 1,
                names: 1,
            },
        },
        {
            label: "A quarter turn about a point, to draw",
            params: {
                max: 5,
                shape: 2,
                x: 1,
                y: 1,
                move: "rotate",
                dx: 0,
                dy: 0,
                mirror: "y",
                turn: 90,
                cx: -1,
                cy: 0,
                image: 0,
                names: 1,
            },
        },
    ],
    box: (p) => coordGrid.box(gridOf(p)),
    draw: (c, p) => {
        const a: RawAnchors = coordGrid.draw(c, gridOf(p));
        const { X, Y } = plane(p.max, 4);
        const corners = cornersOf(p);
        const cx = corners.reduce((s, q) => s + q[0], 0) / corners.length,
            cy = corners.reduce((s, q) => s + q[1], 0) / corners.length;
        a.shape = [X(cx), Y(cy), "up"];
        if (p.move === "rotate" && (p.cx !== 0 || p.cy !== 0)) {
            c.pen.circle(c.g, X(p.cx), Y(p.cy), 16, "ruler", null, {
                strokeWidth: 1.8,
                stroke: c.t.pen,
            });
            c.pen.circle(
                c.g,
                X(p.cx),
                Y(p.cy),
                6,
                "ruler",
                { fill: c.t.pen, fillStyle: "solid" },
                {
                    strokeWidth: 1,
                    stroke: c.t.pen,
                },
            );
            a.centre = [X(p.cx), Y(p.cy) + 8, "down"];
        }
        if (p.image === 1) {
            const moved = corners.map((q) => imageOf(p, q));
            c.pen.polygon(
                c.g,
                moved.map(([x, y]): Pt => [X(x), Y(y)]),
                "ruler",
                c.pen.fill("sky", "hachure", { hachureGap: 6 }),
                { strokeWidth: 2, stroke: c.t.pen },
            );
            moved.forEach(([x, y], i) => {
                c.pen.circle(c.g, X(x), Y(y), 10, "ruler", c.pen.fill("sky"), { strokeWidth: 1.4 });
                if (p.names === 1) {
                    patch(c, X(x) + 22, Y(y) - 18, 30, 20);
                    num(c, X(x) + 22, Y(y) - 12, `${NAMES[i] ?? ""}′`, 15);
                }
                a[`image(${i})`] = [X(x), Y(y) - 10, "up"];
            });
            const [ix, iy] = imageOf(p, [cx, cy]);
            a.image = [X(ix), Y(iy), "up"];
        }
        return a;
    },
    describe: (p) =>
        p.move === "rotate" && (p.cx !== 0 || p.cy !== 0)
            ? `A coordinate grid in four quadrants with a shape drawn on it${p.image === 1 ? " and a hatched copy of it" : ""}, its corners marked as dots, and one grid point ringed.`
            : `A coordinate grid in four quadrants with a shape drawn on it${p.image === 1 ? " and a hatched copy of it moved to another place" : " and nothing else drawn"}, its corners marked as dots.`,
    motion: {
        still: "A point is read off the grid by its coordinates, so the grid and both shapes hold still.",
    },
});
