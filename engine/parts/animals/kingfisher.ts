import { part, type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { eye } from "./nature";

/** A kingfisher, perched or flying, centred on x with its feet (or its belly) at `base`. */
function kingfisherAt<G>(c: Ctx<G>, cx: number, base: number, flying: boolean, s: number): void {
    const { pen, g } = c,
        X = (d: number) => cx + s * d,
        back = pen.fill("sky"),
        breast = pen.fill("tang");
    if (flying) {
        const y = base - 30;
        pen.polygon(
            part(c, "wing", [X(-2), y - 4], { dir: s }).g,
            [
                [X(-4), y - 4],
                [X(-24), y - 30],
                [X(-10), y - 32],
                [X(8), y - 6],
            ],
            "pencil",
            back,
            { strokeWidth: 1.4 },
        );
        pen.ellipse(g, X(0), y, 50, 20, "pencil", breast, { strokeWidth: 1.6 });
        pen.path(
            g,
            `M${X(-24)} ${y - 4}Q${X(0)} ${y - 16} ${X(22)} ${y - 6}L${X(20)} ${y}Q${X(0)} ${y - 6} ${X(-24)} ${y + 2}Z`,
            "pencil",
            back,
            { strokeWidth: 1.2 },
        );
        pen.polygon(
            g,
            [
                [X(-22), y - 2],
                [X(-36), y - 8],
                [X(-34), y + 4],
            ],
            "pencil",
            back,
            { strokeWidth: 1.2 },
        );
        pen.circle(g, X(24), y - 4, 16, "pencil", back, { strokeWidth: 1.4 });
        pen.polygon(
            g,
            [
                [X(30), y - 6],
                [X(52), y - 2],
                [X(30), y - 1],
            ],
            "pencil",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        eye(c, X(26), y - 6, 4);
        return;
    }
    // perched upright on a twig, tail down, the long beak straight out
    pen.line(g, cx - 38, base, cx + 38, base - 4, "pencil", { strokeWidth: 3, stroke: c.t.tang });
    pen.polygon(
        g,
        [
            [X(-6), base - 30],
            [X(-16), base + 8],
            [X(-4), base + 6],
            [X(2), base - 26],
        ],
        "pencil",
        back,
        { strokeWidth: 1.3 },
    );
    pen.ellipse(g, X(0), base - 30, 30, 40, "pencil", breast, { strokeWidth: 1.6 });
    pen.path(
        g,
        `M${X(-14)} ${base - 44}Q${X(-18)} ${base - 22} ${X(-6)} ${base - 10}Q${X(-2)} ${base - 28} ${X(-4)} ${base - 46}Z`,
        "pencil",
        back,
        { strokeWidth: 1.2 },
    );
    pen.circle(g, X(4), base - 56, 26, "pencil", back, { strokeWidth: 1.6 });
    pen.ellipse(g, X(8), base - 50, 12, 8, "pencil", pen.fill("card"), { strokeWidth: 0.9 });
    pen.polygon(
        g,
        [
            [X(14), base - 60],
            [X(44), base - 56],
            [X(14), base - 53],
        ],
        "pencil",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.8 },
    );
    eye(c, X(8), base - 60, 4.5);
    for (const dx of [-3, 4])
        pen.line(g, X(dx), base - 12, X(dx), base - 2, "pencil", {
            strokeWidth: 1.4,
            stroke: c.t.berry,
        });
}

export const kingfisher = defineDrawing({
    id: "kingfisher",
    family: "animals",
    title: "Kingfisher",
    group: "Characters",
    about: "A kingfisher with its bright blue back and orange front and a beak as long as its head, sitting on a twig over the water or flying low and fast along it. The bird a child waits for by a river and sees once.",
    params: { flying: 0, facing: 1 },
    settings: {
        flying: { kind: "whole", min: 0, max: 1 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "On a twig", params: { flying: 0, facing: 1 } },
        { label: "Flying low", params: { flying: 1, facing: -1 } },
    ],
    box: () => ({ w: 5, h: 4 }),
    draw: (c, p) => {
        const s = p.facing < 0 ? -1 : 1,
            flying = p.flying > 0,
            cx = 2.4 * U,
            base = 3.6 * U;
        kingfisherAt(c, flying ? cx - s * 6 : cx, base, flying, s);
        return {
            head: [cx + s * 4, base - 70, "up"],
            beak: [cx + s * 44, base - 56, s > 0 ? "right" : "left"],
        };
    },
    describe: (p) =>
        p.flying > 0
            ? "A kingfisher flying low with its wings up, a bright blue back, an orange front and a beak as long as its head."
            : "A kingfisher perched upright on a twig, with a bright blue back, an orange front and a beak as long as its head.",
    motion: {
        body: { is: "float", lift: 0, dx: 4, deg: 3, pivot: [0.5, 1], period: 6.2, units: true },
        parts: { wing: { is: "flap", deg: 22, burst: 3, period: 3.8 } },
    },
});
