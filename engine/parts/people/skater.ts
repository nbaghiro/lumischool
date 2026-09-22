import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { faceAt } from "../speech";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const skater = defineDrawing({
    id: "skater",
    family: "people",
    title: "Skater",
    group: "Characters",
    about: "A child skating on one foot with arms out for balance, a scarf flying behind and the blade of each skate drawn clear. Glides go in a straight line, and a figure of eight is two loops.",
    params: { look: 0, facing: 1 },
    settings: { look: { kind: "whole", min: 0, max: 3 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Gliding right", params: { look: 0, facing: 1 } },
        { label: "Gliding left", params: { look: 1, facing: -1 } },
    ],
    box: () => ({ w: 5, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            look = within(p.look, 0, 3),
            cx = 2.5 * U,
            ice = 5.7 * U,
            u = U;
        const X = (d: number) => cx + s * d,
            shirts: Marker[] = ["berry", "sky", "mint", "tang"];
        const hip = ice - 2 * u,
            shoulder = ice - 3.4 * u,
            headY = ice - 4.3 * u,
            r = 0.85 * u;
        // the leg it glides on, and the one lifted behind
        pen.line(g, X(0.1 * u), hip, X(0.25 * u), ice - 0.35 * u, "pencil", { strokeWidth: 2.6 });
        pen.linear(
            g,
            [
                [X(-0.1 * u), hip],
                [X(-0.9 * u), hip + 0.7 * u],
                [X(-1.6 * u), hip + 0.5 * u],
            ],
            "pencil",
            { strokeWidth: 2.6 },
        );
        for (const [bx, by, lean] of [
            [0.25 * u, ice - 0.3 * u, 0],
            [-1.6 * u, hip + 0.55 * u, -0.25],
        ] as const) {
            pen.rect(
                g,
                X(bx) - 0.3 * u,
                by - 0.35 * u,
                0.6 * u,
                0.4 * u,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.2 },
            );
            pen.line(
                g,
                X(bx) - s * 0.45 * u,
                by + 0.12 * u + lean * u,
                X(bx) + s * 0.5 * u,
                by + 0.12 * u,
                "ruler",
                { strokeWidth: 1.6 },
            );
        }
        pen.path(
            g,
            `M${X(-0.55 * u)} ${shoulder}H${X(0.55 * u)}L${X(0.65 * u)} ${hip}H${X(-0.65 * u)}Z`,
            "pencil",
            pen.fill(shirts[look]),
            { strokeWidth: 1.6 },
        );
        for (const sd of [-1, 1])
            pen.linear(
                g,
                [
                    [X(sd * 0.5 * u), shoulder + 0.2 * u],
                    [X(sd * 1.3 * u), shoulder + 0.35 * u],
                    [X(sd * 2 * u), shoulder + 0.2 * u],
                ],
                "pencil",
                { strokeWidth: 1.8 },
            );
        pen.path(
            g,
            `M${X(-0.4 * u)} ${shoulder - 0.05 * u}Q${X(-1.3 * u)} ${shoulder - 0.4 * u} ${X(-2 * u)} ${shoulder - 0.1 * u}L${X(-1.9 * u)} ${shoulder + 0.25 * u}Q${X(-1.2 * u)} ${shoulder} ${X(-0.3 * u)} ${shoulder + 0.3 * u}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.1 },
        );
        faceAt(c, cx, headY, r, "happy", look);
        pen.path(
            g,
            `M${cx - r} ${headY - 0.2 * r}Q${cx} ${headY - 1.7 * r} ${cx + r} ${headY - 0.2 * r}Z`,
            "pencil",
            pen.fill(shirts[(look + 2) % 4]),
            { strokeWidth: 1.2 },
        );
        pen.circle(g, cx, headY - 1.2 * r, 0.3 * u, "pencil", pen.fill("card"), { strokeWidth: 1 });
        pen.line(g, X(-2 * u), ice, X(1.8 * u), ice, "pencil", { strokeWidth: 1, stroke: c.t.sky });
        const a: RawAnchors = {
            head: [cx, headY - 1.4 * r, "up"],
            skate: [X(0.25 * u), ice, "down"],
        };
        return a;
    },
    describe: () =>
        "A child skating on one foot with arms out for balance, a scarf flying behind and a woolly hat, the blade of each skate drawn clear.",
    motion: {
        body: { is: "float", lift: 2, dx: 14, deg: 3, pivot: [0.5, 1], period: 6.4, units: true },
    },
});
