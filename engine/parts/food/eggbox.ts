import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";

/** A count arriving as 0, 2.5 or 200 still has to draw something sane. */
const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

export const eggBox = defineDrawing({
    id: "eggbox",
    family: "food",
    title: "Box of eggs",
    group: "Props",
    about: "An open box of eggs seen from above, with some cups full and the rest empty. The empty cups carry half of the question, so they are drawn as carefully as the eggs sitting in the others.",
    params: { rows: 2, cols: 6, eggs: 9 },
    settings: {
        rows: { kind: "whole", min: 1, max: 6 },
        cols: { kind: "whole", min: 1, max: 15 },
        eggs: { kind: "whole", min: 0, max: 90 },
    },
    takes: [
        { label: "Nine of twelve", params: { rows: 2, cols: 6, eggs: 9 } },
        { label: "A full box of six", params: { rows: 2, cols: 3, eggs: 6 } },
        { label: "Empty", params: { rows: 2, cols: 6, eggs: 0 } },
        { label: "Ten in a ten box", params: { rows: 2, cols: 5, eggs: 10 } },
    ],
    box: (p) => ({ w: whole(p.cols, 1, 15) * 2 + 3, h: whole(p.rows, 1, 6) * 2 + 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            rows = whole(p.rows, 1, 6),
            cols = whole(p.cols, 1, 15);
        const boxW = (cols * 2 + 3) * U,
            baseW = (cols * 2 + 1) * U,
            baseX = (boxW - baseW) / 2;
        const lidY = 1.1 * U,
            lidH = 2.4 * U,
            baseY = 3.9 * U,
            baseH = (rows * 2 + 1) * U;
        const eggs = whole(p.eggs, 0, rows * cols);
        // The lid is folded back behind the base, which is why it is drawn narrower at the top.
        pen.polygon(
            g,
            [
                [baseX + 0.6 * U, lidY],
                [baseX + baseW - 0.6 * U, lidY],
                [baseX + baseW, lidY + lidH],
                [baseX, lidY + lidH],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        cap(c, boxW / 2, lidY + 1.5 * U, "eggs", 12);
        pen.path(g, roundedRect(baseX, baseY, baseW, baseH, 10), "pencil", pen.fill("card"), {
            strokeWidth: 2.4,
        });
        const a: RawAnchors = { lid: [boxW / 2, lidY, "up"], box: [boxW / 2, baseY, "up"] };
        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                const x = baseX + (1.5 + k * 2) * U,
                    y = baseY + (1.5 + r * 2) * U,
                    i = r * cols + k;
                pen.circle(g, x, y, 1.7 * U, "ruler", null, {
                    strokeWidth: 1.4,
                    stroke: c.t["ink-soft"],
                });
                if (i < eggs)
                    pen.ellipse(
                        g,
                        x,
                        y,
                        1.25 * U,
                        1.55 * U,
                        "pencil",
                        pen.fill("glow", "solid", { hachureGap: 5 }),
                        { strokeWidth: 1.7 },
                    );
                a[`cup(${r},${k})`] = [x, y - 0.85 * U, "up"];
            }
        }
        return a;
    },
    describe: (p) => {
        const rows = whole(p.rows, 1, 6),
            cols = whole(p.cols, 1, 15),
            eggs = whole(p.eggs, 0, rows * cols);
        const cups =
            eggs === 0
                ? "all empty"
                : eggs === rows * cols
                  ? "each holding an egg"
                  : "some holding an egg and the rest empty";
        return `An open box of eggs seen from above, its lid folded back, with a grid of cups ${cups}.`;
    },
});
