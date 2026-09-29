import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export type PartsOf =
    "plant" | "fish" | "island" | "river" | "flower" | "skeleton" | "arm" | "gut" | "chest";

type Pt = [number, number];

/** Each diagram has four lettered parts, at fixed places, so a question can ask about any of them. */
const PARTS_BOX: Record<PartsOf, { w: number; h: number }> = {
    plant: { w: 9, h: 12 },
    fish: { w: 13, h: 9 },
    island: { w: 13, h: 10 },
    river: { w: 18, h: 12 },
    flower: { w: 11, h: 12 },
    skeleton: { w: 11, h: 16 },
    arm: { w: 12, h: 10 },
    gut: { w: 10, h: 15 },
    chest: { w: 12, h: 13 },
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
    river: [
        [3.4, 3.2, 1.2, 6.4],
        [12.3, 6.3, 14.4, 5.2],
        [10.5, 6.4, 8.2, 7.8],
        [13.9, 9.9, 11.4, 11.2],
    ],
    flower: [
        [5.5, 3.2, 5.5, 0.9],
        [7.3, 4.1, 10.1, 1.3],
        [1.9, 4.3, 0.9, 9.4],
        [5.9, 7.4, 9.4, 9.8],
    ],
    skeleton: [
        [6.3, 1.0, 9.4, 1.4],
        [4.1, 6.0, 1.1, 8.4],
        [5.5, 8.1, 9.9, 8.4],
        [6.6, 11.4, 9.9, 12.2],
    ],
    arm: [
        [4.3, 4.2, 7.0, 2.2],
        [1.6, 4.8, 0.9, 8.9],
        [2.9, 7.3, 5.2, 9.1],
        [7.2, 6.4, 8.8, 8.9],
    ],
    gut: [
        [5.0, 4.3, 1.4, 3.0],
        [6.8, 6.1, 9.2, 4.6],
        [4.4, 10.9, 3.6, 14.2],
        [7.3, 10.6, 9.2, 11.4],
        [2.6, 5.9, 0.8, 7.2],
        [7.7, 7.9, 9.2, 8.3],
        [6.3, 13.2, 8.3, 14.2],
    ],
    chest: [
        [6.0, 2.4, 9.3, 1.0],
        [3.4, 7.0, 0.9, 5.2],
        [6.5, 8.0, 11.0, 7.4],
        [6.2, 11.4, 9.4, 12.0],
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

/** A smooth line through `pts`, as Catmull-Rom points, `n` to a span. */
function smooth(pts: readonly Pt[], n: number): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)] ?? [0, 0],
            p1 = pts[i] ?? [0, 0],
            p2 = pts[i + 1] ?? [0, 0],
            p3 = pts[Math.min(pts.length - 1, i + 2)] ?? [0, 0];
        for (let k = 0; k < n; k++) {
            const t = k / n,
                t2 = t * t,
                t3 = t2 * t;
            const at = (a: number, b: number, c: number, d: number): number =>
                0.5 *
                (2 * b +
                    (-a + c) * t +
                    (2 * a - 5 * b + 4 * c - d) * t2 +
                    (-a + 3 * b - 3 * c + d) * t3);
            out.push([at(p0[0], p1[0], p2[0], p3[0]), at(p0[1], p1[1], p2[1], p3[1])]);
        }
    }
    const last = pts[pts.length - 1];
    if (last) out.push(last);
    return out;
}

/** A band along `mid` (in squares) as wide as `half` says on each side, from `from` to `to`. */
function band(mid: readonly Pt[], from: number, to: number): Pt[] {
    const line = smooth(mid, 8);
    const left: Pt[] = [],
        right: Pt[] = [];
    line.forEach(([x, y], i) => {
        const [ax, ay] = line[Math.max(0, i - 1)] ?? [x, y],
            [bx, by] = line[Math.min(line.length - 1, i + 1)] ?? [x, y];
        const dx = bx - ax,
            dy = by - ay,
            len = Math.hypot(dx, dy) || 1,
            half = from + ((to - from) * i) / Math.max(1, line.length - 1);
        left.push([(x - (dy / len) * half) * U, (y + (dx / len) * half) * U]);
        right.push([(x + (dy / len) * half) * U, (y - (dx / len) * half) * U]);
    });
    return [...left, ...right.reverse()];
}

function river<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.polygon(
        g,
        [
            [0.2 * U, 5.4 * U],
            [1.6 * U, 1.4 * U],
            [2.8 * U, 2.6 * U],
            [4.4 * U, 0.6 * U],
            [6.4 * U, 3.4 * U],
            [7.6 * U, 5 * U],
        ],
        "pencil",
        pen.fill("mint", "hachure", { hachureGap: 6 }),
        { strokeWidth: 1.8 },
    );
    const mid: Pt[] = [
        [2.6, 1.6],
        [3.2, 3],
        [4.4, 4.6],
        [6.4, 5.4],
        [8.4, 4.6],
        [10.4, 4.6],
        [11.6, 6.2],
        [10.6, 7.8],
        [11.8, 9.2],
        [14.2, 9.8],
    ];
    pen.polygon(g, band(mid, 0.12, 1.1), "pencil", pen.fill("sky"), { strokeWidth: 1.5 });
    pen.path(
        g,
        `M${13.2 * U} ${11.8 * U}Q${14.2 * U} ${8.6 * U} ${17.8 * U} ${7.4 * U}V${11.8 * U}Z`,
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 5 }),
        { strokeWidth: 1.8 },
    );
    // the spring the river starts from
    pen.circle(g, 2.6 * U, 1.5 * U, 0.6 * U, "pencil", pen.fill("sky"), { strokeWidth: 1.4 });
    // big jagged stones high up, small round ones on the inside of the bend and at the mouth
    for (const [x, y] of [
        [2.4, 3.4],
        [3.9, 3],
        [3.7, 4.6],
    ] as Pt[])
        pen.polygon(
            g,
            [
                [(x - 0.45) * U, (y + 0.3) * U],
                [(x - 0.2) * U, (y - 0.35) * U],
                [(x + 0.4) * U, (y - 0.2) * U],
                [(x + 0.35) * U, (y + 0.35) * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
    for (const [x, y] of [
        [10.4, 6.1],
        [10.7, 6.6],
        [10.3, 6.9],
        [12.4, 9.9],
        [12.9, 10.2],
        [12.6, 10.4],
    ] as Pt[])
        pen.circle(g, x * U, y * U, 5, "pencil", pen.fill("card"), { strokeWidth: 1 });
    // the steep bank the water wears away on the outside of the bend
    for (let i = 0; i < 5; i++) {
        const y = 5.4 + i * 0.4;
        pen.line(g, 12.5 * U, y * U, 12.9 * U, (y + 0.2) * U, "pencil", { strokeWidth: 1.4 });
    }
}

function flower<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.line(g, 5.5 * U, 8.3 * U, 5.5 * U, 11.8 * U, "pencil", { strokeWidth: 2.2 });
    for (const s of [-1, 1]) {
        const x = (d: number): number => (5.5 + s * d) * U;
        pen.path(
            g,
            `M${x(0.5)} ${8.2 * U}C${x(3)} ${7.8 * U} ${x(4.4)} ${5 * U} ${x(3.9)} ${3 * U}` +
                `C${x(2.8)} ${3.6 * U} ${x(1.6)} ${5.6 * U} ${x(0.9)} ${7.6 * U}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.6 },
        );
        pen.path(
            g,
            `M${x(0.3)} ${8.4 * U}Q${x(1.4)} ${8.6 * U} ${x(1.8)} ${8 * U}Q${x(1)} ${8.1 * U} ${x(0.4)} ${7.9 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        pen.curve(
            g,
            [
                [x(0.5), 8 * U],
                [x(1.1), 6 * U],
                [x(1.7), 4.3 * U],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
        pen.ellipse(g, x(1.8), 4.1 * U, 1.1 * U, 0.7 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1.3,
        });
        for (const [dx, dy] of [
            [2.3, 3.5],
            [1.5, 3.4],
            [2.5, 4.4],
        ] as Pt[])
            pen.circle(g, x(dx), dy * U, 5, "pencil", pen.fill("glow"), { strokeWidth: 0.8 });
    }
    pen.line(g, 5.5 * U, 6.5 * U, 5.5 * U, 3.4 * U, "pencil", { strokeWidth: 2 });
    pen.ellipse(g, 5.5 * U, 3.2 * U, 1 * U, 0.5 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.4,
    });
    pen.ellipse(g, 5.5 * U, 7.3 * U, 1.8 * U, 1.7 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.6,
    });
    for (const [x, y] of [
        [5.2, 7],
        [5.8, 7.1],
        [5.5, 7.7],
    ] as Pt[])
        pen.circle(g, x * U, y * U, 6, "pencil", pen.fill("ink-soft"), { strokeWidth: 0.8 });
}

/** A bone from one end to the other, `w` squares thick, with a knob at each end. */
function bone<G>(c: Ctx<G>, from: Pt, to: Pt, w = 0.4): void {
    const { pen, g } = c;
    const dx = to[0] - from[0],
        dy = to[1] - from[1],
        len = Math.hypot(dx, dy) || 1,
        nx = (-dy / len) * (w / 2),
        ny = (dx / len) * (w / 2);
    for (const [x, y] of [from, to])
        for (const s of [-1, 1])
            pen.circle(
                g,
                (x + s * nx * 0.8) * U,
                (y + s * ny * 0.8) * U,
                w * 1.1 * U,
                "pencil",
                pen.fill("card"),
                {
                    strokeWidth: 1.2,
                },
            );
    pen.polygon(
        g,
        [
            [(from[0] + nx) * U, (from[1] + ny) * U],
            [(to[0] + nx) * U, (to[1] + ny) * U],
            [(to[0] - nx) * U, (to[1] - ny) * U],
            [(from[0] - nx) * U, (from[1] - ny) * U],
        ],
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.3 },
    );
}

function skeleton<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    for (const s of [-1, 1]) {
        const x = (d: number): number => 5.5 + s * d;
        bone(c, [x(1.9), 3.9], [x(3.7), 5.2]);
        bone(c, [x(3.7), 5.2], [x(4.8), 6.6], 0.34);
        for (const k of [-1, 0, 1])
            pen.line(g, x(4.9) * U, 6.7 * U, x(5.05 + 0.1 * k) * U, (7.2 + 0.1 * k) * U, "pencil", {
                strokeWidth: 1.4,
            });
        bone(c, [x(0.9), 10], [x(1.1), 12.9], 0.45);
        bone(c, [x(1.1), 12.9], [x(1.2), 15.2], 0.38);
        pen.line(g, x(1.2) * U, 15.4 * U, x(1.9) * U, 15.6 * U, "pencil", { strokeWidth: 2.4 });
        pen.circle(g, x(1.1) * U, 12.9 * U, 0.45 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        bone(c, [5.5, 3.7], [x(1.9), 3.9], 0.28);
    }
    for (let y = 3.2; y <= 9.3; y += 0.5)
        pen.ellipse(g, 5.5 * U, y * U, 0.6 * U, 0.4 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.1,
        });
    for (let i = 0; i < 5; i++) {
        const y = 4.3 + i * 0.6,
            out = 1.9 - i * 0.1;
        for (const s of [-1, 1])
            pen.curve(
                g,
                [
                    [(5.5 + s * 0.3) * U, y * U],
                    [(5.5 + s * out) * U, (y + 0.15) * U],
                    [(5.5 + s * (out - 0.3)) * U, (y + 0.75) * U],
                ],
                "pencil",
                { strokeWidth: 2.4 },
            );
    }
    pen.path(
        g,
        `M${3.8 * U} ${8.9 * U}Q${3.9 * U} ${10.3 * U} ${5.5 * U} ${10.4 * U}Q${7.1 * U} ${10.3 * U} ${7.2 * U} ${8.9 * U}` +
            `Q${6.4 * U} ${9.4 * U} ${5.5 * U} ${9.2 * U}Q${4.6 * U} ${9.4 * U} ${3.8 * U} ${8.9 * U}Z`,
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.5 },
    );
    pen.ellipse(g, 5.5 * U, 1.6 * U, 2.4 * U, 2.6 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.8,
    });
    for (const dx of [-0.5, 0.5])
        pen.ellipse(g, (5.5 + dx) * U, 1.5 * U, 0.55 * U, 0.6 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1.2,
        });
    pen.line(g, 5 * U, 2.5 * U, 6 * U, 2.5 * U, "pencil", { strokeWidth: 1.3 });
    for (const dx of [-0.25, 0, 0.25])
        pen.line(g, (5.5 + dx) * U, 2.35 * U, (5.5 + dx) * U, 2.65 * U, "pencil", {
            strokeWidth: 1,
        });
}

function arm<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${3.1 * U} ${1.5 * U}C${5 * U} ${2.6 * U} ${5.4 * U} ${5.6 * U} ${3.9 * U} ${7 * U}` +
            `C${3.4 * U} ${5.6 * U} ${3.1 * U} ${3.6 * U} ${3.1 * U} ${1.5 * U}Z`,
        "pencil",
        pen.fill("berry"),
        { strokeWidth: 1.6 },
    );
    pen.path(
        g,
        `M${2.1 * U} ${1.9 * U}C${1 * U} ${3.4 * U} ${1 * U} ${6 * U} ${2 * U} ${7.6 * U}` +
            `C${2.3 * U} ${6 * U} ${2.3 * U} ${3.6 * U} ${2.1 * U} ${1.9 * U}Z`,
        "pencil",
        pen.fill("berry"),
        { strokeWidth: 1.6 },
    );
    bone(c, [2.5, 1.2], [2.8, 7.2], 0.5);
    bone(c, [2.8, 7.4], [9.6, 6.1], 0.36);
    bone(c, [3, 7.9], [9.6, 6.6], 0.3);
    pen.circle(g, 2.5 * U, 1.1 * U, 1 * U, "pencil", pen.fill("card"), { strokeWidth: 1.5 });
    pen.circle(g, 2.85 * U, 7.35 * U, 0.8 * U, "pencil", pen.fill("card"), { strokeWidth: 1.5 });
    pen.ellipse(g, 10.5 * U, 6.2 * U, 1.4 * U, 1.2 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.5,
    });
    for (const [x1, y1, x2, y2] of [
        [3.1, 1.5, 2.8, 1.2],
        [3.9, 7, 3.9, 7.5],
        [2, 7.6, 2.5, 7.8],
    ] as [number, number, number, number][])
        pen.line(g, x1 * U, y1 * U, x2 * U, y2 * U, "pencil", { strokeWidth: 2 });
}

function gut<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${4.3 * U} ${2.9 * U}Q${2 * U} ${3.3 * U} ${1.3 * U} ${4.4 * U}Q${1.4 * U} ${9 * U} ${1.8 * U} ${13.8 * U}` +
            `H${8.2 * U}Q${8.6 * U} ${9 * U} ${8.7 * U} ${4.4 * U}Q${8 * U} ${3.3 * U} ${5.7 * U} ${2.9 * U}`,
        "pencil",
        null,
        { strokeWidth: 1.3, stroke: c.t["ink-soft"] },
    );
    pen.circle(g, 5 * U, 1.6 * U, 2.6 * U, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
    pen.curve(
        g,
        [
            [4.5 * U, 2.1 * U],
            [5 * U, 2.35 * U],
            [5.5 * U, 2.1 * U],
        ],
        "pencil",
        { strokeWidth: 1.4 },
    );
    pen.rect(g, 4.8 * U, 2.6 * U, 0.4 * U, 2.9 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.3,
    });
    // the kidneys sit behind the gut, at the back of the body, so the tube is drawn over them
    for (const kx of [2.4, 7.6])
        pen.ellipse(g, kx * U, 8.0 * U, 1.0 * U, 1.5 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.3,
        });
    pen.path(
        g,
        `M${2.3 * U} ${12.4 * U}V${8.5 * U}Q${2.3 * U} ${8.1 * U} ${2.7 * U} ${8.1 * U}H${7.3 * U}Q${7.7 * U} ${8.1 * U} ${7.7 * U} ${8.5 * U}` +
            `V${12.6 * U}Q${7.4 * U} ${13.5 * U} ${5.6 * U} ${13.5 * U}V${12.9 * U}Q${6.9 * U} ${12.9 * U} ${6.9 * U} ${12.4 * U}` +
            `V${8.9 * U}H${3.1 * U}V${12.4 * U}Z`,
        "pencil",
        pen.fill("tang"),
        { strokeWidth: 1.5 },
    );
    pen.path(
        g,
        `M${3.4 * U} ${9.3 * U}Q${5 * U} ${9 * U} ${6.6 * U} ${9.3 * U}Q${6.8 * U} ${11 * U} ${6.5 * U} ${12.6 * U}` +
            `Q${5 * U} ${12.9 * U} ${3.5 * U} ${12.5 * U}Q${3.2 * U} ${11 * U} ${3.4 * U} ${9.3 * U}Z`,
        "pencil",
        pen.fill("berry"),
        { strokeWidth: 1.4 },
    );
    pen.curve(
        g,
        smooth(
            [
                [3.8, 9.7],
                [6.2, 9.8],
                [6.1, 10.5],
                [3.9, 10.5],
                [3.9, 11.3],
                [6.1, 11.3],
                [6.1, 12],
                [3.9, 12.1],
            ],
            4,
        ).map(([x, y]) => [x * U, y * U]),
        "pencil",
        { strokeWidth: 1.2 },
    );
    pen.path(
        g,
        `M${5 * U} ${5.3 * U}C${6.4 * U} ${4.4 * U} ${8 * U} ${5.2 * U} ${7.5 * U} ${6.8 * U}` +
            `C${7.1 * U} ${8 * U} ${5.4 * U} ${8.2 * U} ${5 * U} ${7.5 * U}C${5.3 * U} ${7 * U} ${5.3 * U} ${6.2 * U} ${5 * U} ${5.6 * U}Z`,
        "pencil",
        pen.fill("berry"),
        { strokeWidth: 1.6 },
    );
    pen.path(
        g,
        `M${1.7 * U} ${5.3 * U}Q${3.2 * U} ${4.6 * U} ${4.7 * U} ${5.2 * U}` +
            `Q${4.5 * U} ${6.5 * U} ${2.9 * U} ${7.2 * U}Q${1.9 * U} ${7.5 * U} ${1.7 * U} ${6.8 * U}Z`,
        "pencil",
        pen.fill("glow"),
        { strokeWidth: 1.5 },
    );
    pen.curve(
        g,
        [
            [5.2 * U, 7.5 * U],
            [4.6 * U, 8.4 * U],
            [3.8 * U, 9.6 * U],
        ],
        "pencil",
        { strokeWidth: 1.6 },
    );
}

function chest<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${5.1 * U} ${0.4 * U}V${1.8 * U}Q${2.2 * U} ${2.2 * U} ${1.5 * U} ${3.4 * U}Q${1.4 * U} ${8 * U} ${1.9 * U} ${12.6 * U}` +
            `H${10.1 * U}Q${10.6 * U} ${8 * U} ${10.5 * U} ${3.4 * U}Q${9.8 * U} ${2.2 * U} ${6.9 * U} ${1.8 * U}V${0.4 * U}`,
        "pencil",
        null,
        { strokeWidth: 1.3, stroke: c.t["ink-soft"] },
    );
    for (const s of [-1, 1]) {
        const x = (d: number): number => 6 + s * d;
        pen.path(
            g,
            `M${x(0.8) * U} ${4.4 * U}Q${x(2.8) * U} ${3.6 * U} ${x(3.4) * U} ${5.8 * U}Q${x(3.8) * U} ${8.6 * U} ${x(3.2) * U} ${9.8 * U}` +
                `Q${x(2) * U} ${10.4 * U} ${x(0.7) * U} ${9.6 * U}Q${x(0.5) * U} ${7 * U} ${x(0.8) * U} ${4.4 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.curve(
            g,
            [
                [x(0.2) * U, 4.1 * U],
                [x(0.9) * U, 4.6 * U],
                [x(1.5) * U, 5.4 * U],
            ],
            "pencil",
            { strokeWidth: 2.4 },
        );
    }
    pen.rect(g, 5.65 * U, 0.6 * U, 0.7 * U, 3.6 * U, "pencil", pen.fill("card"), {
        strokeWidth: 1.3,
    });
    for (let y = 1; y <= 3.8; y += 0.55)
        pen.line(g, 5.7 * U, y * U, 6.3 * U, y * U, "pencil", { strokeWidth: 1 });
    pen.rect(g, 5.9 * U, 8.8 * U, 0.55 * U, 3.7 * U, "pencil", pen.fill("berry"), {
        strokeWidth: 1.3,
    });
    pen.path(
        g,
        `M${5.4 * U} ${7.2 * U}C${5.2 * U} ${6.3 * U} ${6.6 * U} ${6 * U} ${7.4 * U} ${6.4 * U}` +
            `C${8.4 * U} ${6.9 * U} ${8.6 * U} ${8.4 * U} ${8 * U} ${9.6 * U}` +
            `C${7.2 * U} ${9.8 * U} ${5.9 * U} ${9.2 * U} ${5.4 * U} ${8.4 * U}C${5.2 * U} ${8 * U} ${5.3 * U} ${7.6 * U} ${5.4 * U} ${7.2 * U}Z`,
        "pencil",
        pen.fill("berry"),
        { strokeWidth: 1.7 },
    );
    pen.curve(
        g,
        [
            [6.7 * U, 6.3 * U],
            [7.1 * U, 7.8 * U],
            [7.8 * U, 9.4 * U],
        ],
        "pencil",
        { strokeWidth: 1.2 },
    );
}

const SEEN: Record<PartsOf, string> = {
    plant: "A plant",
    fish: "A fish",
    island: "An island",
    river: "A river from a spring in the hills to the sea",
    flower: "A flower cut in half",
    skeleton: "A skeleton",
    arm: "An arm bent at the elbow, with its bones and muscles,",
    gut: "A body's food tube, with the liver and the kidneys,",
    chest: "A chest with its windpipe, lungs and heart",
};

const DRAW: Record<PartsOf, <G>(c: Ctx<G>) => void> = {
    plant,
    fish,
    island,
    river,
    flower,
    skeleton,
    arm,
    gut,
    chest,
};

interface PartsDiagramParams {
    of: PartsOf;
}

export const partsDiagram = defineDrawing<PartsDiagramParams>({
    id: "parts",
    family: "science",
    title: "Labelled diagram",
    group: "Structures",
    about: "A drawing with four lettered parts (seven for the gut, with the liver, the kidneys and the rectum), so a question can ask which letter points at a named part: a plant, a fish, an island, a river from its spring to the sea, a flower cut in half, a skeleton, an arm with its two muscles, the tube food passes through, and a chest with the heart and lungs.",
    params: { of: "plant" },
    settings: {
        of: {
            kind: "one of",
            of: ["plant", "fish", "island", "river", "flower", "skeleton", "arm", "gut", "chest"],
        },
    },
    takes: [
        { label: "A plant", params: { of: "plant" } },
        { label: "A fish", params: { of: "fish" } },
        { label: "A river from source to mouth", params: { of: "river" } },
        { label: "A flower cut in half", params: { of: "flower" } },
        { label: "A skeleton", params: { of: "skeleton" } },
        { label: "An arm and its muscles", params: { of: "arm" } },
        { label: "The way food goes", params: { of: "gut" } },
        { label: "The heart and lungs", params: { of: "chest" } },
    ],
    box: (p) => PARTS_BOX[p.of] ?? PARTS_BOX.plant,
    draw: (c, p) => {
        DRAW[p.of](c);
        const a: RawAnchors = {};
        (PARTS_AT[p.of] ?? PARTS_AT.plant).forEach((at, i) => {
            badge(c, at, "ABCDEFG"[i] ?? "?");
            a[`part(${i})`] = [at[2] * U, at[3] * U - 16, "up"];
        });
        return a;
    },
    describe: (p) =>
        `${SEEN[p.of]} drawn with ${p.of === "gut" ? "seven" : "four"} of its parts lettered, a short line from each letter to the part it points at.`,
});
