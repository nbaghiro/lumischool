import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const ingredientPile = defineDrawing({
    id: "pile",
    family: "food",
    title: "Pile of an ingredient",
    group: "Props",
    about: "A heap of one ingredient on the counter with a scoop beside it and the mass written against it. A heap has nothing to count, so the only way to know how much is there is to read the label.",
    params: { label: "250 g", scoop: true },
    settings: { label: { kind: "text", most: 8 }, scoop: { kind: "flag" } },
    takes: [
        { label: "250 g", params: { label: "250 g", scoop: true } },
        { label: "Half a kilo", params: { label: "500 g", scoop: false } },
        { label: "Unlabelled", params: { label: "", scoop: true } },
    ],
    box: () => ({ w: 12, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 7.4 * U,
            cx = (p.scoop ? 4.2 : 6) * U,
            hw = 3 * U,
            ph = 3.4 * U;
        pen.path(
            g,
            `M${cx - hw} ${base}C${cx - hw * 0.72} ${base - ph * 0.55} ${cx - hw * 0.44} ${base - ph} ${cx - hw * 0.04} ${base - ph}` +
                `C${cx + hw * 0.4} ${base - ph} ${cx + hw * 0.68} ${base - ph * 0.5} ${cx + hw} ${base}Z`,
            "pencil",
            pen.fill("glow", "solid", { hachureGap: 6, fillWeight: 0.7 }),
            { strokeWidth: 2.2 },
        );
        // A few grains, placed from a fixed table rather than at random, so the heap draws the same way
        // every time it is rendered.
        for (const [gx, gy] of [
            [-0.62, -0.2],
            [-0.3, -0.5],
            [0.05, -0.72],
            [0.36, -0.5],
            [0.62, -0.24],
            [-0.44, -0.06],
            [0.2, -0.14],
        ] as const) {
            const x = cx + gx * hw,
                y = base + gy * ph;
            pen.line(g, x - 3, y, x + 3, y - 2, "doodle", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        const a: RawAnchors = { pile: [cx, base - ph, "up"], counter: [cx, base, "down"] };
        if (p.scoop) {
            const sx = 9.1 * U,
                top = 5.4 * U;
            pen.polygon(
                g,
                [
                    [sx - 1 * U, top],
                    [sx + 1 * U, top],
                    [sx + 0.78 * U, base],
                    [sx - 0.78 * U, base],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 2 },
            );
            pen.polygon(
                g,
                [
                    [sx + 0.9 * U, top + 0.1 * U],
                    [sx + 2.05 * U, top - 0.45 * U],
                    [sx + 2.15 * U, top - 0.2 * U],
                    [sx + 1 * U, top + 0.35 * U],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            pen.ellipse(g, sx, top, 2 * U, 0.5 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.8,
            });
            pen.ellipse(
                g,
                sx,
                top + 0.06 * U,
                1.6 * U,
                0.4 * U,
                "pencil",
                pen.fill("glow", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.2 },
            );
            a.scoop = [sx, top - 0.3 * U, "up"];
        }
        pen.line(g, 0.6 * U, base, 11.4 * U, base, "pencil", { strokeWidth: 2.2 });
        pen.arrow(g, [8.4 * U, 3.1 * U], [cx + hw * 0.5, base - ph * 0.55], c.t.pen, 0.1);
        num(c, 9 * U, 2.6 * U, p.label, 18, "middle", c.t.pen);
        a.label = [9 * U, 2.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A heap of one ingredient on a counter, with an arrow pointing at it from above${p.label ? " and the amount written at its tail" : ""}${p.scoop ? ", and a scoop standing beside it" : ""}.`,
});
