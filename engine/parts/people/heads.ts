import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const headRow = defineDrawing({
    id: "heads",
    family: "people",
    title: "A row of heads",
    group: "Characters",
    about: "Heads seen from behind, for puzzles about how many there are or who is where in the line.",
    params: { count: 7, mark: 0 },
    settings: {
        count: { kind: "whole", min: 1, max: 12 },
        mark: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        { label: "Seven, none marked", params: { count: 7, mark: 0 } },
        { label: "The fourth marked", params: { count: 9, mark: 4 } },
    ],
    box: (p) => ({ w: p.count * 2 + 1, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        for (let i = 0; i < p.count; i++) {
            const x = (i * 2 + 1) * U,
                y = 2.4 * U;
            const chosen = p.mark === i + 1;
            pen.circle(g, x, y, 1.5 * U, "pencil", pen.fill(chosen ? "tang" : "card"), {
                strokeWidth: 1.8,
            });
            pen.circle(g, x - 6, y - 2, 3.5, "pencil", pen.fill("ink"), { strokeWidth: 0.8 });
            pen.circle(g, x + 6, y - 2, 3.5, "pencil", pen.fill("ink"), { strokeWidth: 0.8 });
            pen.arc(g, x, y + 2, 16, 12, 0.2, Math.PI - 0.2, "pencil", { strokeWidth: 1.4 });
            if (chosen) pen.line(g, x - 13, y - 15, x + 13, y - 15, "pencil", { strokeWidth: 2.4 });
            a[`head(${i})`] = [x, y - 1.1 * U, "up"];
        }
        return a;
    },
    describe: () =>
        "A row of simple faces side by side, each a round head with eyes and a mouth, one of them picked out with a ring.",
});
