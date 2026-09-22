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

/** Points given about `o`, turned through `ang` radians. */
const turned =
    (o: Pt, ang: number) =>
    ([x, y]: Pt): Pt => [
        o[0] + x * Math.cos(ang) - y * Math.sin(ang),
        o[1] + x * Math.sin(ang) + y * Math.cos(ang),
    ];

/** The railway's line-side landmarks. */
export const railSignal = defineDrawing({
    id: "railsignal",
    family: "travel",
    title: "Railway signal",
    group: "Props",
    about: "A semaphore signal on a tall post, its red arm level for stop or raised for go, with a lamp that shows red or green through the glass in front of it. Beside it a level crossing barrier striped red and white is up or down.",
    params: { arm: 0, barrier: 1, crossing: 1 },
    settings: {
        arm: { kind: "whole", min: 0, max: 1 },
        barrier: { kind: "whole", min: 0, max: 1 },
        crossing: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Stop, the barrier down", params: { arm: 0, barrier: 1, crossing: 1 } },
        { label: "Go, the barrier up", params: { arm: 1, barrier: 0, crossing: 1 } },
        { label: "The signal on its own, at go", params: { arm: 1, barrier: 0, crossing: 0 } },
    ],
    box: (p) => ({ w: p.crossing > 0 ? 8 : 6, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const go = p.arm > 0;
        const crossing = p.crossing > 0;
        const down = p.barrier > 0;
        const W = (crossing ? 8 : 6) * U;
        const ground = 8.7 * U;
        const sx = 2.1 * U;
        const pivot: Pt = [sx + 0.2 * U, 2.9 * U];
        const grey = pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.7 });
        const white = pen.fill("card");
        const a: RawAnchors = {};
        if (crossing) {
            const bx = 6.75 * U;
            const hub: Pt = [bx, 6.55 * U];
            const length = 3.8 * U;
            const at = turned(hub, down ? Math.PI : -Math.PI / 2);
            pen.rect(
                g,
                bx - 0.6 * U,
                ground - 0.25 * U,
                1.2 * U,
                0.25 * U,
                "pencil",
                grey,
                calm(c, 1.5),
            );
            pen.rect(
                g,
                bx - 0.45 * U,
                6.2 * U,
                0.9 * U,
                ground - 0.25 * U - 6.2 * U,
                "pencil",
                white,
                calm(c, 1.7),
            );
            pen.polygon(
                g,
                [
                    [bx - 0.55 * U, 6.2 * U],
                    [bx, 5.92 * U],
                    [bx + 0.55 * U, 6.2 * U],
                ],
                "pencil",
                grey,
                calm(c, 1.4),
            );
            pen.rect(g, bx - 0.22 * U, 7.35 * U, 0.44 * U, 0.7 * U, "pencil", null, {
                ...calm(c, 1),
                stroke: c.t["ink-soft"],
            });
            pen.polygon(
                g,
                [
                    at([-1 * U, -0.3 * U]),
                    at([-0.45 * U, -0.3 * U]),
                    at([-0.45 * U, 0.3 * U]),
                    at([-1 * U, 0.3 * U]),
                ],
                "pencil",
                grey,
                calm(c, 1.5),
            );
            // six stripes, red at the tip, as a crossing barrier is painted
            for (let k = 0; k < 6; k++) {
                const x0 = (length * k) / 6;
                const x1 = (length * (k + 1)) / 6;
                pen.polygon(
                    g,
                    [at([x0, -0.2 * U]), at([x1, -0.2 * U]), at([x1, 0.2 * U]), at([x0, 0.2 * U])],
                    "ruler",
                    k % 2 ? pen.fill("berry") : white,
                    calm(c, 1.1),
                );
            }
            pen.polygon(
                g,
                [
                    at([-0.45 * U, -0.2 * U]),
                    at([length, -0.2 * U]),
                    at([length, 0.2 * U]),
                    at([-0.45 * U, 0.2 * U]),
                ],
                "ruler",
                null,
                calm(c, 1.7),
            );
            pen.circle(g, hub[0], hub[1], 0.46 * U, "ruler", white, calm(c, 1.4));
            pen.circle(
                g,
                hub[0],
                hub[1],
                0.14 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                calm(c, 0.8),
            );
            const tip = at([length, 0]);
            a.barrier = [tip[0], tip[1] - 0.2 * U, "up"];
        }
        pen.rect(
            g,
            sx - 0.65 * U,
            ground - 0.45 * U,
            1.3 * U,
            0.45 * U,
            "pencil",
            grey,
            calm(c, 1.6),
        );
        pen.polygon(
            g,
            [
                [sx - 0.2 * U, 1.3 * U],
                [sx + 0.2 * U, 1.3 * U],
                [sx + 0.3 * U, ground - 0.45 * U],
                [sx - 0.3 * U, ground - 0.45 * U],
            ],
            "pencil",
            white,
            calm(c, 1.8),
        );
        pen.rect(g, sx - 0.3 * U, 1.06 * U, 0.6 * U, 0.24 * U, "pencil", grey, calm(c, 1.3));
        pen.polygon(
            g,
            [
                [sx - 0.15 * U, 1.06 * U],
                [sx, 0.45 * U],
                [sx + 0.15 * U, 1.06 * U],
            ],
            "pencil",
            pen.fill("ink-soft"),
            calm(c, 1.2),
        );
        // the spectacle turns with the arm, so the glass in front of the fixed lamp is red at stop and green at go
        const red: Pt = [-0.8 * U, 0.6 * U];
        const green: Pt = [(red[0] - red[1]) * Math.SQRT1_2, (red[0] + red[1]) * Math.SQRT1_2];
        const at = turned(pivot, go ? -Math.PI / 4 : 0);
        const lamp: Pt = [pivot[0] + red[0], pivot[1] + red[1]];
        pen.rect(
            g,
            lamp[0] + 0.3 * U,
            lamp[1] - 0.08 * U,
            sx - 0.22 * U - lamp[0] - 0.3 * U,
            0.16 * U,
            "pencil",
            grey,
            calm(c, 1.1),
        );
        pen.rect(
            g,
            lamp[0] - 0.13 * U,
            lamp[1] - 0.62 * U,
            0.26 * U,
            0.2 * U,
            "pencil",
            grey,
            calm(c, 1.2),
        );
        pen.rect(
            g,
            lamp[0] - 0.32 * U,
            lamp[1] - 0.42 * U,
            0.64 * U,
            0.84 * U,
            "pencil",
            grey,
            calm(c, 1.5),
        );
        for (const [glass, lit, colour] of [
            [red, !go, "berry"],
            [green, go, "mint"],
        ] as const) {
            const centre = at(glass);
            pen.line(g, pivot[0], pivot[1], centre[0], centre[1], "ruler", calm(c, 2));
            pen.circle(g, centre[0], centre[1], 0.7 * U, "ruler", grey, calm(c, 1.3));
            pen.circle(
                g,
                centre[0],
                centre[1],
                0.48 * U,
                "ruler",
                lit ? pen.fill(colour) : pen.fill(colour, "hachure", { hachureGap: 3 }),
                calm(c, 1.2),
            );
        }
        for (const ang of [Math.PI * 0.8, Math.PI, Math.PI * 1.2]) {
            pen.line(
                g,
                lamp[0] + Math.cos(ang) * 0.46 * U,
                lamp[1] + Math.sin(ang) * 0.46 * U,
                lamp[0] + Math.cos(ang) * 0.68 * U,
                lamp[1] + Math.sin(ang) * 0.68 * U,
                "ruler",
                calm(c, 1.2),
            );
        }
        const arm: Pt[] = [
            [0.12 * U, -0.3 * U],
            [3.35 * U, -0.27 * U],
            [3.35 * U, 0.27 * U],
            [0.12 * U, 0.3 * U],
        ];
        pen.polygon(g, arm.map(at), "ruler", pen.fill("berry"), calm(c, 1.8));
        pen.polygon(
            g,
            [
                at([2.55 * U, -0.28 * U]),
                at([2.9 * U, -0.275 * U]),
                at([2.9 * U, 0.275 * U]),
                at([2.55 * U, 0.28 * U]),
            ],
            "ruler",
            white,
            calm(c, 1.2),
        );
        pen.circle(g, pivot[0], pivot[1], 0.3 * U, "ruler", pen.fill("ink-soft"), calm(c, 1.2));
        pen.line(g, 0.1 * U, ground, W - 0.1 * U, ground, "pencil", { strokeWidth: 1.8 });
        const tip = at([3.35 * U, 0]);
        a.arm = [tip[0], tip[1], go ? "up" : "right"];
        a.lamp = [lamp[0] - 0.68 * U, lamp[1], "left"];
        a.top = [sx, 0.45 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A semaphore signal on a tall post, its red arm ${p.arm > 0 ? "raised" : "held level"}, with a lamp showing ${p.arm > 0 ? "green" : "red"} through the glass${p.crossing > 0 ? `, and beside it a striped level crossing barrier ${p.barrier > 0 ? "lowered" : "raised"}` : ""}.`,
    motion: { still: "Its arm and its barrier are read as stop or go, so they hold still." },
    reads: true,
});
