import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const hall = defineDrawing({
    id: "hall",
    family: "places",
    title: "Hall with rows of windows",
    group: "Structures",
    about: "A hall with a pointed roof, a bell on the top and its windows in even rows above the door. The windows are an array, rows by columns, and they can be lit, so a lit hall at dusk is a times table to count.",
    params: { rows: 2, cols: 4, lit: 0 },
    settings: {
        rows: { kind: "whole", min: 1, max: 3 },
        cols: { kind: "whole", min: 2, max: 6 },
        lit: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Two rows of four", params: { rows: 2, cols: 4, lit: 0 } },
        { label: "Three rows of five, lit", params: { rows: 3, cols: 5, lit: 1 } },
    ],
    box: (p) => ({
        w: Math.max(2, Math.min(6, Math.round(p.cols))) * 2 + 4,
        h: Math.max(1, Math.min(3, Math.round(p.rows))) * 2 + 7,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            cols = Math.max(2, Math.min(6, Math.round(p.cols))),
            rows = Math.max(1, Math.min(3, Math.round(p.rows)));
        const W = (cols * 2 + 4) * U,
            H = (rows * 2 + 7) * U,
            eave = 4 * U,
            base = H - 0.5 * U,
            lit = p.lit > 0,
            a: RawAnchors = {};
        pen.rect(g, 1 * U, eave, W - 2 * U, base - eave, "pencil", pen.fill("card"), {
            strokeWidth: 2,
        });
        pen.polygon(
            g,
            [
                [0.4 * U, eave + 0.1 * U],
                [W / 2, 1.7 * U],
                [W - 0.4 * U, eave + 0.1 * U],
            ],
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 2 },
        );
        // the bell under its little roof on the ridge
        pen.rect(g, W / 2 - 0.45 * U, 0.9 * U, 0.9 * U, 0.95 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        pen.polygon(
            g,
            [
                [W / 2 - 0.65 * U, 0.95 * U],
                [W / 2, 0.25 * U],
                [W / 2 + 0.65 * U, 0.95 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.2 },
        );
        pen.path(
            g,
            `M${W / 2 - 0.25 * U} ${1.6 * U}Q${W / 2 - 0.25 * U} ${1.1 * U} ${W / 2} ${1.1 * U}Q${W / 2 + 0.25 * U} ${1.1 * U} ${W / 2 + 0.25 * U} ${1.6 * U}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1 },
        );
        a.bell = [W / 2, 1.1 * U, "up"];
        for (let r = 0; r < rows; r++)
            for (let k = 0; k < cols; k++) {
                const x = (2.4 + k * 2) * U,
                    y = eave + (0.7 + r * 2) * U;
                pen.rect(
                    g,
                    x,
                    y,
                    1.2 * U,
                    1.3 * U,
                    "ruler",
                    lit ? pen.fill("glow") : pen.fill("sky", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 1.3 },
                );
                pen.line(g, x, y + 0.65 * U, x + 1.2 * U, y + 0.65 * U, "ruler", {
                    strokeWidth: 0.8,
                });
                a[`window(${r * cols + k})`] = [x + 0.6 * U, y, "up"];
            }
        const dy = eave + (0.7 + rows * 2) * U;
        pen.path(
            g,
            `M${W / 2 - 0.7 * U} ${base}L${W / 2 - 0.7 * U} ${dy + 0.6 * U}Q${W / 2} ${dy - 0.1 * U} ${W / 2 + 0.7 * U} ${dy + 0.6 * U}L${W / 2 + 0.7 * U} ${base}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.line(g, 0.2 * U, base, W - 0.2 * U, base, "pencil", { strokeWidth: 2 });
        a.door = [W / 2, dy, "up"];
        return a;
    },
    describe: (p) =>
        `A hall with a pointed red roof and a bell on the top, its windows in even rows above an arched door, ${p.lit > 0 ? "the windows lit yellow" : "the windows dark"}.`,
});
