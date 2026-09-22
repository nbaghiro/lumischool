import { part, type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { eye } from "./nature";

function gullAt<G>(c: Ctx<G>, cx: number, base: number, flying: boolean): void {
    const { pen, g } = c,
        white = pen.fill("card"),
        grey = pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 });
    if (flying) {
        const y = base - 40;
        for (const s of [-1, 1]) {
            const wing = part(c, "wing", [cx + s * 6, y - 3], { dir: s }).g;
            pen.polygon(
                wing,
                [
                    [cx, y],
                    [cx + s * 22, y - 18],
                    [cx + s * 48, y - 8],
                    [cx + s * 22, y - 8],
                ],
                "pencil",
                grey,
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                wing,
                [
                    [cx + s * 40, y - 10],
                    [cx + s * 48, y - 8],
                    [cx + s * 42, y - 4],
                ],
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 1 },
            );
        }
        pen.ellipse(g, cx, y, 34, 14, "pencil", white, { strokeWidth: 1.6 });
        pen.circle(g, cx + 16, y - 4, 13, "pencil", white, { strokeWidth: 1.4 });
        pen.polygon(
            g,
            [
                [cx + 22, y - 5],
                [cx + 32, y - 3],
                [cx + 22, y],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1 },
        );
        return;
    }
    for (const dx of [-6, 4]) {
        pen.line(g, cx + dx, base - 22, cx + dx, base - 2, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.tang,
        });
        pen.line(g, cx + dx - 5, base - 1, cx + dx + 5, base - 1, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.tang,
        });
    }
    pen.polygon(
        g,
        [
            [cx - 26, base - 38],
            [cx - 46, base - 32],
            [cx - 26, base - 30],
        ],
        "pencil",
        white,
        { strokeWidth: 1.4 },
    );
    pen.ellipse(g, cx - 4, base - 34, 58, 30, "pencil", white, { strokeWidth: 1.9 });
    pen.polygon(
        g,
        [
            [cx - 28, base - 44],
            [cx + 8, base - 42],
            [cx - 2, base - 30],
            [cx - 36, base - 30],
        ],
        "pencil",
        grey,
        { strokeWidth: 1.6 },
    );
    pen.polygon(
        g,
        [
            [cx - 36, base - 30],
            [cx - 28, base - 36],
            [cx - 24, base - 30],
        ],
        "pencil",
        pen.fill("ink-soft"),
        { strokeWidth: 1 },
    );
    pen.circle(g, cx + 18, base - 54, 26, "pencil", white, { strokeWidth: 1.8 });
    pen.polygon(
        g,
        [
            [cx + 29, base - 57],
            [cx + 46, base - 53],
            [cx + 29, base - 50],
        ],
        "pencil",
        pen.fill("glow"),
        { strokeWidth: 1.2 },
    );
    pen.circle(g, cx + 40, base - 52, 4, "ruler", pen.fill("berry"), { strokeWidth: 0.6 });
    eye(c, cx + 22, base - 57, 4.5);
}

export const gull = defineDrawing({
    id: "gull",
    family: "animals",
    title: "Gull",
    group: "Characters",
    about: "A herring gull standing on its pink feet, or flying with its wings out and black tips on them. The bird a harbour has, drawn so the red spot on its beak can be pointed to.",
    params: { flying: 0 },
    settings: { flying: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Standing", params: { flying: 0 } },
        { label: "Flying", params: { flying: 1 } },
    ],
    box: () => ({ w: 6, h: 5 }),
    draw: (c, p) => {
        const cx = 3 * U,
            base = 4.7 * U;
        gullAt(c, cx, base, p.flying > 0);
        return { head: [cx + 18, base - 68, "up"], beak: [cx + 46, base - 53, "right"] };
    },
    describe: (p) =>
        p.flying > 0
            ? "A herring gull flying with its grey wings spread and black tips on them, a white body and a yellow beak with a red spot."
            : "A herring gull standing on pink feet with a white body, grey wings folded on its back and a yellow beak with a red spot.",
    motion: {
        body: { is: "float", lift: 0, dx: 8, deg: 5, pivot: [0.5, 1], period: 6.6, units: true },
        parts: { wing: { is: "flap", deg: 26, period: 2.8, burst: 3 } },
        react: { kind: "hop", by: 26 },
    },
});
