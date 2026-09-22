import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

type Pt = [number, number];

const within = (n: number | undefined, lo: number, hi: number, dflt: number) =>
    Math.max(lo, Math.min(hi, Math.round(n ?? dflt)));
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** The meadow's way into open country. */
export const stile = defineDrawing({
    id: "stile",
    family: "outdoors",
    title: "Stile",
    group: "Props",
    about: "A wooden stile in a post and rail fence at the edge of a field. Its steps climb to the top rail beside a tall post to hold on to, and the grass goes on past the fence. The steps can be counted.",
    params: { steps: 2 },
    settings: { steps: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "One step", params: { steps: 1 } },
        { label: "Two steps", params: { steps: 2 } },
        { label: "Three steps", params: { steps: 3 } },
    ],
    box: () => ({ w: 6, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = within(p.steps, 1, 3, 2);
        const a: RawAnchors = {};
        // rails this narrow in tang's cross-hatch print as wire mesh, so on paper the wood takes a single hatch
        const wood = pen.fill(
            "tang",
            "solid",
            c.paper ? { fillStyle: "hachure", hachureGap: 4.5 } : {},
        );
        const ground = 4.6 * U;
        const rail = 2.1 * U;
        const low = 3.2 * U;
        const bar = 0.36 * U;
        const post = 4.3 * U;
        for (const x of [0.95, 4.9]) {
            const at = x * U;
            pen.linear(
                g,
                [
                    [at - 5, ground - 10],
                    [at - 1, ground],
                ],
                "pencil",
                calm(c, 1.1),
            );
            pen.linear(
                g,
                [
                    [at, ground - 14],
                    [at + 1, ground],
                ],
                "pencil",
                calm(c, 1.1),
            );
            pen.linear(
                g,
                [
                    [at + 5, ground - 9],
                    [at + 2, ground],
                ],
                "pencil",
                calm(c, 1.1),
            );
        }
        for (const y of [rail, low])
            pen.rect(g, 0.25 * U, y, 5.5 * U, bar, "pencil", wood, calm(c, 1.6));
        for (const x of [0.5 * U, 5.55 * U])
            pen.rect(
                g,
                x - 0.2 * U,
                1.75 * U,
                0.4 * U,
                ground - 1.75 * U,
                "pencil",
                wood,
                calm(c, 1.7),
            );
        // the steps are built against the fence and climb to just under the top rail, the last one at the tall post
        const rise = (ground - rail - 0.2 * U) / (n + 1);
        const run = 0.95 * U;
        const right = post - 0.22 * U;
        const left = right - n * run;
        const side: Pt[] = [[left, ground]];
        for (let k = 1; k <= n; k++)
            side.push(
                [right - (n - k + 1) * run, ground - k * rise],
                [right - (n - k) * run, ground - k * rise],
            );
        side.push([right, ground]);
        pen.polygon(
            g,
            side,
            "pencil",
            pen.fill(
                "tang",
                "hachure",
                c.paper
                    ? { fillStyle: "hachure", hachureGap: 8, hachureAngle: 45 }
                    : { hachureGap: 5, fillWeight: 0.7 },
            ),
            calm(c, 1.6),
        );
        for (let k = 1; k < n; k++)
            pen.line(
                g,
                right - (n - k) * run,
                ground - k * rise + 0.3 * U,
                right - (n - k) * run,
                ground,
                "pencil",
                { ...calm(c, 0.8), stroke: c.t["ink-soft"] },
            );
        for (let k = 1; k <= n; k++) {
            const x = right - (n - k + 1) * run - 0.15 * U;
            const y = ground - k * rise;
            pen.rect(g, x, y, run + 0.15 * U, 0.3 * U, "ruler", wood, calm(c, 1.7));
            a[`step(${k - 1})`] = [x + (run + 0.15 * U) / 2, y, "up"];
        }
        const hand: Pt[] = [
            [post - 0.22 * U, ground],
            [post - 0.22 * U, 0.78 * U],
            [post, 0.5 * U],
            [post + 0.22 * U, 0.78 * U],
            [post + 0.22 * U, ground],
        ];
        pen.polygon(g, hand, "pencil", wood, calm(c, 1.8));
        pen.line(g, post - 0.04 * U, 1.1 * U, post + 0.02 * U, 1.8 * U, "pencil", {
            ...calm(c, 0.8),
            stroke: c.t["ink-soft"],
        });
        pen.line(g, 0.1 * U, ground, 5.9 * U, ground, "pencil", { strokeWidth: 1.8 });
        a.top = [post, 0.5 * U, "up"];
        return a;
    },
    describe: () =>
        "A wooden stile in a post and rail fence at the edge of a field, its steps climbing to the top rail beside a tall post to hold on to.",
    motion: { still: STILL.setting },
});
