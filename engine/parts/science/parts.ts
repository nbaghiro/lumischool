import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export type PartsOf = "plant" | "fish" | "island";

/** Each diagram has four lettered parts, at fixed places, so a question can ask about any of them. */
const PARTS_BOX: Record<PartsOf, { w: number; h: number }> = {
    plant: { w: 9, h: 12 },
    fish: { w: 13, h: 9 },
    island: { w: 13, h: 10 },
};

/** Each part: the point on the drawing, and where its lettered badge sits in clear space. */
const PARTS_AT: Record<PartsOf, [number, number, number, number][]> = {
    plant: [
        [4.5, 1.9, 7.9, 1.2],
        [6.6, 5.3, 8.1, 4.4],
        [4.5, 7.6, 7.9, 7.6],
        [4.7, 10.6, 7.9, 10.6],
    ],
    fish: [
        [6, 1.6, 3, 0.8],
        [11.4, 4.5, 12.1, 7.9],
        [7.6, 4.4, 6.6, 8.2],
        [2.3, 5.1, 0.9, 7.6],
    ],
    island: [
        [4.2, 3.4, 1, 1.2],
        [6.7, 7.4, 11.9, 9],
        [9.9, 4.4, 12, 1.2],
        [3, 8, 1, 9],
    ],
};

function badge<G>(c: Ctx<G>, at: [number, number, number, number], letter: string): void {
    const [px, py, bx, by] = at;
    c.pen.line(c.g, bx * U, by * U, px * U, py * U, "pencil", {
        strokeWidth: 1.2,
        stroke: c.t["ink-soft"],
    });
    c.pen.circle(
        c.g,
        px * U,
        py * U,
        7,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.8 },
    );
    c.pen.circle(c.g, bx * U, by * U, 30, "ruler", c.pen.fill("card"), { strokeWidth: 1.6 });
    say(c, bx * U, by * U + 6, letter, 17);
}

function plant<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.line(g, 4.5 * U, 3 * U, 4.5 * U, 9.4 * U, "pencil", { strokeWidth: 2.2 });
    for (const [dx, dy] of [
        [1, 5.2],
        [-1, 6.6],
    ] as [number, number][]) {
        pen.path(
            g,
            `M${4.5 * U} ${dy * U} q${dx * 2 * U} ${-0.9 * U} ${dx * 2.6 * U} ${0.2 * U}` +
                ` q${-dx * 1.2 * U} ${1.1 * U} ${-dx * 2.6 * U} ${-0.2 * U}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.5 },
        );
    }
    for (let i = 0; i < 6; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 3;
        pen.ellipse(
            g,
            4.5 * U + 22 * Math.cos(ang),
            2 * U + 22 * Math.sin(ang),
            26,
            20,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.3 },
        );
    }
    pen.circle(g, 4.5 * U, 2 * U, 26, "pencil", pen.fill("glow"), { strokeWidth: 1.4 });
    for (const dx of [-1.6, -0.6, 0.6, 1.6]) {
        pen.curve(
            g,
            [
                [4.5 * U, 9.4 * U],
                [(4.5 + dx * 0.6) * U, 10.2 * U],
                [(4.5 + dx) * U, 11.3 * U],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
    }
}

function fish<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.ellipse(g, 6 * U, 4.5 * U, 7.4 * U, 3.4 * U, "pencil", pen.fill("sky"), {
        strokeWidth: 1.8,
    });
    pen.polygon(
        g,
        [
            [9.6 * U, 4.5 * U],
            [12 * U, 2.8 * U],
            [12 * U, 6.2 * U],
        ],
        "pencil",
        pen.fill("sky"),
        { strokeWidth: 1.6 },
    );
    pen.polygon(
        g,
        [
            [4.6 * U, 3 * U],
            [6 * U, 1.2 * U],
            [7.4 * U, 3 * U],
        ],
        "pencil",
        pen.fill("mint"),
        { strokeWidth: 1.5 },
    );
    pen.polygon(
        g,
        [
            [5 * U, 6 * U],
            [6.4 * U, 7.4 * U],
            [7.4 * U, 5.9 * U],
        ],
        "pencil",
        pen.fill("mint"),
        { strokeWidth: 1.5 },
    );
    pen.circle(g, 3.4 * U, 4 * U, 14, "pencil", pen.fill("card"), { strokeWidth: 1.4 });
    pen.circle(
        g,
        3.4 * U,
        4 * U,
        6,
        "pencil",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.8 },
    );
    pen.curve(
        g,
        [
            [2 * U, 4.8 * U],
            [2.6 * U, 5.2 * U],
            [3.4 * U, 5 * U],
        ],
        "pencil",
        { strokeWidth: 1.4 },
    );
}

function island<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${1.4 * U} ${6 * U} C${1.2 * U} ${3 * U} ${4 * U} ${1.2 * U} ${7 * U} ${1.6 * U}` +
            ` C${10.4 * U} ${2 * U} ${12.2 * U} ${4 * U} ${11.6 * U} ${6.4 * U}` +
            ` C${11 * U} ${8.8 * U} ${7 * U} ${9.6 * U} ${4.4 * U} ${8.8 * U}` +
            ` C${2.4 * U} ${8.2 * U} ${1.6 * U} ${7.6 * U} ${1.4 * U} ${6 * U}Z`,
        "pencil",
        pen.fill("glow"),
        { strokeWidth: 1.8 },
    );
    pen.polygon(
        g,
        [
            [2.2 * U, 5 * U],
            [4.2 * U, 2 * U],
            [6.2 * U, 5 * U],
        ],
        "pencil",
        pen.fill("ink-soft"),
        { strokeWidth: 1.6 },
    );
    pen.curve(
        g,
        [
            [5 * U, 4.6 * U],
            [6.4 * U, 5.8 * U],
            [6.6 * U, 7.4 * U],
            [8.4 * U, 8.7 * U],
        ],
        "pencil",
        { stroke: c.t.sky, strokeWidth: 3 },
    );
    for (const [x, y] of [
        [9.2, 4.4],
        [10.8, 4],
        [10.2, 5.6],
    ] as [number, number][]) {
        pen.line(g, x * U, y * U, x * U, (y - 0.7) * U, "pencil", { strokeWidth: 1.8 });
        pen.circle(g, x * U, (y - 1.1) * U, 26, "pencil", pen.fill("mint"), { strokeWidth: 1.4 });
    }
    // the beach: short strokes along the inside of the south-west shore
    for (let i = 0; i < 6; i++) {
        const x = 2.1 + i * 0.55,
            y = 7 + i * 0.32;
        pen.line(g, x * U, y * U, (x + 0.4) * U, (y - 0.12) * U, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t["ink-soft"],
        });
    }
}

interface PartsDiagramParams {
    of: PartsOf;
}

export const partsDiagram = defineDrawing<PartsDiagramParams>({
    id: "parts",
    family: "science",
    title: "Labelled diagram",
    group: "Structures",
    about: "A drawing with four lettered parts, so a question can ask which letter points at a named part.",
    params: { of: "plant" },
    settings: { of: { kind: "one of", of: ["plant", "fish", "island"] } },
    takes: [
        { label: "A plant", params: { of: "plant" } },
        { label: "A fish", params: { of: "fish" } },
    ],
    box: (p) => PARTS_BOX[p.of] ?? PARTS_BOX.plant,
    draw: (c, p) => {
        if (p.of === "fish") fish(c);
        else if (p.of === "island") island(c);
        else plant(c);
        const a: RawAnchors = {};
        (PARTS_AT[p.of] ?? PARTS_AT.plant).forEach((at, i) => {
            badge(c, at, "ABCD"[i] ?? "?");
            a[`part(${i})`] = [at[2] * U, at[3] * U - 16, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A ${p.of} drawn with four of its parts lettered, a short line from each letter to the part it points at.`,
});
