import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const seaSerpent = defineDrawing({
    id: "seaserpent",
    family: "stories",
    title: "Sea serpent in the margin",
    group: "Props",
    about: "A friendly sea serpent doodled in pencil where a map's sea runs off the page, the way an old map fills its empty water: loops of its back rising out of the waves one after another, a curl of tail, and a round smiling head. The loops can be counted.",
    params: { loops: 3, facing: 1 },
    settings: { loops: { kind: "whole", min: 1, max: 4 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Three loops", params: { loops: 3, facing: 1 } },
        { label: "Two loops, facing left", params: { loops: 2, facing: -1 } },
    ],
    box: (p) => ({ w: 4 + Math.max(1, Math.min(4, Math.round(p.loops))) * 2, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(1, Math.min(4, Math.round(p.loops))),
            W = (4 + n * 2) * U,
            s = p.facing < 0 ? -1 : 1;
        const X = (x: number) => (s > 0 ? x : W - x),
            at = ([x, y]: Pt): Pt => [X(x), y],
            sea = 3.1 * U;
        const line = { ...calm(c, 1.6), stroke: c.t["ink-soft"] },
            scales = pen.fill("mint", "hachure", { hachureGap: 5, fillWeight: 0.8 });
        pen.curve(
            g,
            [
                at([0.4 * U, sea]),
                at([0.5 * U, 2.3 * U]),
                at([1.2 * U, 2.1 * U]),
                at([1.4 * U, 2.6 * U]),
                at([1.05 * U, 2.8 * U]),
            ],
            "pencil",
            line,
        );
        for (let i = 0; i < n; i++) {
            const x = 1.6 * U + i * 2 * U,
                top = (1.55 + (i % 2) * 0.2) * U;
            const [x0, y0] = at([x, sea]),
                [x1, y1] = at([x + 0.15 * U, top + 0.5 * U]),
                [xt, yt] = at([x + 0.8 * U, top]),
                [x3, y3] = at([x + 1.45 * U, top + 0.5 * U]),
                [x4, y4] = at([x + 1.6 * U, sea]);
            pen.path(
                g,
                `M${x0} ${y0}C${x1} ${y1} ${xt - s * 0.5 * U} ${yt} ${xt} ${yt}C${xt + s * 0.5 * U} ${yt} ${x3} ${y3} ${x4} ${y4}Z`,
                "pencil",
                scales,
                line,
            );
            for (const k of [0.45, 0.8, 1.15])
                pen.circle(g, X(x + k * U), top + 0.45 * U, 0.16 * U, "pencil", null, {
                    ...line,
                    strokeWidth: 1,
                });
            a[`loop(${i})`] = [xt, yt, "up"];
        }
        const nx = 1.6 * U + n * 2 * U;
        pen.curve(
            g,
            [at([nx, sea]), at([nx + 0.3 * U, 2 * U]), at([nx + 0.9 * U, 1.3 * U])],
            "pencil",
            { ...line, strokeWidth: 1.8 },
        );
        pen.curve(
            g,
            [at([nx + 0.9 * U, sea]), at([nx + 1 * U, 2.2 * U]), at([nx + 1.2 * U, 1.7 * U])],
            "pencil",
            { ...line, strokeWidth: 1.8 },
        );
        pen.ellipse(g, X(nx + 1.25 * U), 1.2 * U, 1.4 * U, 1.1 * U, "pencil", scales, line);
        pen.circle(
            g,
            X(nx + 1.45 * U),
            1 * U,
            0.22 * U,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
        pen.curve(
            g,
            [
                at([nx + 1.4 * U, 1.42 * U]),
                at([nx + 1.62 * U, 1.56 * U]),
                at([nx + 1.86 * U, 1.38 * U]),
            ],
            "pencil",
            { ...line, strokeWidth: 1.2 },
        );
        for (let x = 0.1 * U; x + 0.8 * U <= W - 0.1 * U; x += 0.8 * U) {
            pen.curve(
                g,
                [
                    [x, sea + 0.25 * U],
                    [x + 0.2 * U, sea + 0.07 * U],
                    [x + 0.4 * U, sea + 0.25 * U],
                    [x + 0.6 * U, sea + 0.07 * U],
                    [x + 0.8 * U, sea + 0.25 * U],
                ],
                "pencil",
                line,
            );
        }
        a.head = [X(nx + 1.25 * U), 0.65 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A sea serpent doodled in pencil in the margin of a map, ${Math.round(p.loops) > 1 ? "loops of its back rising out of the waves" : "a loop of its back rising out of the waves"}, a curl of tail and a round smiling head.`,
    motion: { still: "A doodle in a map's margin, drawn once and left as it is." },
});
