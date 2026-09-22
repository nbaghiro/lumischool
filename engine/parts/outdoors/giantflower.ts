import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/** A closed outline drawn smoothly through a ring of points. */
function ring(pts: Pt[]): string {
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        last = pts[pts.length - 1] ?? [0, 0],
        start = mid(last, pts[0] ?? last);
    let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
    pts.forEach((q, i) => {
        const m = mid(q, pts[(i + 1) % pts.length] ?? q);
        d += `Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    });
    return `${d}Z`;
}

/** A big pointed leaf from (x, y) along an angle, with its middle vein. */
function leaf<G>(c: Ctx<G>, x: number, y: number, len: number, wid: number, angle: number): void {
    const ca = Math.cos(angle),
        sa = Math.sin(angle),
        at = (t: number, o: number): Pt => [x + t * ca - o * sa, y + t * sa + o * ca],
        out: Pt[] = [];
    for (let i = 0; i <= 10; i++)
        out.push(at((i / 10) * len, (wid / 2) * Math.sin(Math.PI * Math.pow(i / 10, 0.7))));
    for (let i = 9; i >= 1; i--)
        out.push(at((i / 10) * len, -(wid / 2) * Math.sin(Math.PI * Math.pow(i / 10, 0.7))));
    c.pen.polygon(c.g, out, "pencil", c.pen.fill("mint"), { strokeWidth: 1.7 });
    c.pen.curve(c.g, [at(0.05 * len, 0), at(0.5 * len, wid * 0.04), at(0.9 * len, 0)], "pencil", {
        strokeWidth: 1.1,
    });
    for (const t of [0.3, 0.55, 0.78])
        for (const s of [-1, 1])
            c.pen.line(c.g, ...at(t * len, 0), ...at((t + 0.12) * len, s * wid * 0.3), "pencil", {
                strokeWidth: 0.8,
            });
}

export const giantFlower = defineDrawing({
    id: "giantflower",
    family: "outdoors",
    title: "Giant flower",
    group: "Props",
    about: "An enormous flower on a thick branch between big pointed leaves. Closed, it is a fat pink bud held in green leaves at its base. Open, it has five thick pink petals spotted with yellow, wide round a deep dark middle ringed with yellow.",
    params: { open: 0 },
    settings: { open: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "A closed bud", params: { open: 0 } },
        { label: "Wide open", params: { open: 1 } },
    ],
    box: () => ({ w: 10, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            open = p.open > 0,
            cx = 5 * U,
            a: RawAnchors = {};
        leaf(c, 3.6 * U, 7.4 * U, 3.3 * U, 1.3 * U, Math.PI + 0.35);
        leaf(c, 6.6 * U, 7.2 * U, 3.2 * U, 1.25 * U, -0.3);
        // the branch across the foot, its bark in long strokes
        pen.path(
            g,
            `M${0.2 * U} ${7.7 * U}Q${3 * U} ${7.1 * U} ${5 * U} ${7.35 * U}Q${7.4 * U} ${7.55 * U} ${9.8 * U} ${6.9 * U}L${9.8 * U} ${7.7 * U}Q${7.4 * U} ${8.35 * U} ${5 * U} ${8.25 * U}Q${3 * U} ${8.1 * U} ${0.2 * U} ${8.8 * U}Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4.5, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        for (const [x0, x1, y] of [
            [1.2, 3, 8.05],
            [5.8, 8.1, 7.9],
            [3.6, 4.8, 7.7],
        ] as const)
            pen.line(g, x0 * U, y * U, x1 * U, (y - 0.12) * U, "pencil", { strokeWidth: 1 });
        pen.path(
            g,
            `M${cx - 0.35 * U} ${7.4 * U}Q${cx - 0.3 * U} ${6.6 * U} ${cx - 0.2 * U} ${6 * U}L${cx + 0.25 * U} ${6 * U}Q${cx + 0.35 * U} ${6.6 * U} ${cx + 0.45 * U} ${7.45 * U}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.5 },
        );
        if (!open) {
            const bud: Pt[] = [
                [cx, 1.6 * U],
                [cx + 1.1 * U, 2.6 * U],
                [cx + 1.75 * U, 4.2 * U],
                [cx + 1.4 * U, 5.6 * U],
                [cx, 6.2 * U],
                [cx - 1.4 * U, 5.6 * U],
                [cx - 1.75 * U, 4.2 * U],
                [cx - 1.1 * U, 2.6 * U],
            ];
            pen.path(g, ring(bud), "pencil", pen.fill("berry"), { strokeWidth: 1.8 });
            // the seams where the petals will part, and spots showing between them
            for (const s of [-1, 0.2, 1])
                pen.curve(
                    g,
                    [
                        [cx + s * 0.2 * U, 1.9 * U],
                        [cx + s * 0.95 * U, 3.8 * U],
                        [cx + s * 0.55 * U, 5.8 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.1 },
                );
            for (const [dx, dy] of [
                [-0.9, 3.6],
                [0.55, 3.1],
                [1.05, 4.6],
                [-0.35, 4.9],
                [-1.2, 5.1],
            ] as const)
                pen.circle(g, cx + dx * U, dy * U, 0.3 * U, "pencil", pen.fill("glow"), {
                    strokeWidth: 0.8,
                });
            for (const s of [-1, 1])
                pen.polygon(
                    g,
                    [
                        [cx + s * 0.2 * U, 6.1 * U],
                        [cx + s * 1.9 * U, 5.1 * U],
                        [cx + s * 1.1 * U, 6.2 * U],
                    ],
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1.4 },
                );
            a.flower = [cx, 1.6 * U, "up"];
            return a;
        }
        // open: five thick petals round the middle, the flower turned a little towards us
        const my = 4.3 * U,
            tilt = 0.8;
        for (let k = 0; k < 5; k++) {
            const t = -Math.PI / 2 + (k * Math.PI * 2) / 5,
                dx = Math.cos(t),
                dy = Math.sin(t) * tilt,
                nx = -Math.sin(t),
                ny = Math.cos(t) * tilt;
            const at = (r: number, o: number): Pt => [
                cx + (dx * r + nx * o) * U,
                my + (dy * r + ny * o) * U,
            ];
            pen.path(
                g,
                ring([
                    at(0.6, -0.55),
                    at(1.9, -1.15),
                    at(3.2, -1),
                    at(3.85, 0),
                    at(3.2, 1),
                    at(1.9, 1.15),
                    at(0.6, 0.55),
                ]),
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.8 },
            );
            pen.curve(g, [at(1, 0), at(2.2, 0.08), at(3.2, 0)], "pencil", { strokeWidth: 1 });
            for (const [r, o, d] of [
                [1.7, -0.55, 0.36],
                [2.5, 0.5, 0.42],
                [3.1, -0.35, 0.3],
                [2.1, 0.05, 0.28],
                [1.45, 0.5, 0.26],
            ] as const)
                pen.circle(g, ...at(r, o), d * U, "pencil", pen.fill("glow"), { strokeWidth: 0.8 });
        }
        pen.ellipse(g, cx, my, 2.3 * U, 1.85 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
        pen.ellipse(
            g,
            cx,
            my + 0.05 * U,
            1.5 * U,
            1.15 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5, fillWeight: 0.8 }),
            { strokeWidth: 1.3 },
        );
        for (let k = 0; k < 10; k++) {
            const t = (k / 10) * Math.PI * 2;
            pen.circle(
                g,
                cx + Math.cos(t) * 0.95 * U,
                my + Math.sin(t) * 0.75 * U,
                4,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        }
        a.flower = [cx, my - 3.1 * U, "up"];
        a.middle = [cx, my, "up"];
        return a;
    },
    describe: (p) =>
        `An enormous flower on a thick branch between big pointed leaves, ${p.open > 0 ? "wide open, with five thick pink petals spotted with yellow round a deep dark middle ringed with yellow" : "still a fat pink bud spotted with yellow and held in green leaves at its base"}.`,
    motion: {
        still: "A flower opens once, when its moment comes, and holds still either side of it.",
    },
});
