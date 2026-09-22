import { roundedRect } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A count arriving as 0, 2.5 or 200 still has to draw something sane. */
const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * One bun in its paper case. The icing is a white disc inside the bun rather than a cap across the
 * top of it, so a ring of bun is left showing and an iced one is still an iced one in print.
 */
function bun<G>(c: Ctx<G>, x: number, y: number, iced: boolean): void {
    const { pen, g } = c,
        r = U;
    pen.circle(g, x, y, r * 2.3, "pencil", null, { strokeWidth: 1, stroke: c.t["ink-soft"] });
    pen.circle(g, x, y, r * 2, "pencil", pen.fill("glow", "solid", { hachureGap: 6 }), {
        strokeWidth: 1.8,
    });
    if (!iced) return;
    pen.circle(g, x, y, r * 1.5, "doodle", pen.fill("card"), { strokeWidth: 1.5 });
    pen.circle(g, x, y, r * 0.55, "pencil", pen.fill("berry"), { strokeWidth: 1.2 });
}

export const bakingTray = defineDrawing({
    id: "bakingtray",
    family: "food",
    title: "Tray of buns",
    group: "Props",
    about: "Buns on a tray in rows and columns, some of them iced. Equal rows of the same thing is where multiplication starts, and the iced ones put a second count inside the first one.",
    params: { rows: 3, cols: 4, iced: 5 },
    settings: {
        rows: { kind: "whole", min: 1, max: 12 },
        cols: { kind: "whole", min: 1, max: 12 },
        iced: { kind: "whole", min: 0, max: 144 },
    },
    takes: [
        { label: "Three by four, five iced", params: { rows: 3, cols: 4, iced: 5 } },
        { label: "All iced", params: { rows: 2, cols: 6, iced: 12 } },
        { label: "None iced", params: { rows: 3, cols: 3, iced: 0 } },
    ],
    box: (p) => ({
        w: Math.ceil(whole(p.cols, 1, 12) * 2.4) + 3,
        h: Math.ceil(whole(p.rows, 1, 12) * 2.4) + 3,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            rows = whole(p.rows, 1, 12),
            cols = whole(p.cols, 1, 12);
        const boxW = (Math.ceil(cols * 2.4) + 3) * U,
            boxH = (Math.ceil(rows * 2.4) + 3) * U;
        const trayW = (cols * 2.4 + 1.2) * U,
            trayH = (rows * 2.4 + 1.2) * U;
        const tx = (boxW - trayW) / 2,
            ty = (boxH - trayH) / 2,
            iced = whole(p.iced, 0, rows * cols);
        pen.path(g, roundedRect(tx, ty, trayW, trayH, 12), "pencil", pen.fill("card"), {
            strokeWidth: 2.4,
        });
        pen.path(g, roundedRect(tx + 7, ty + 7, trayW - 14, trayH - 14, 9), "pencil", null, {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        const a: RawAnchors = { tray: [boxW / 2, ty, "up"] };
        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                const x = tx + (0.6 + (k + 0.5) * 2.4) * U,
                    y = ty + (0.6 + (r + 0.5) * 2.4) * U;
                bun(c, x, y, r * cols + k < iced);
                a[`bun(${r},${k})`] = [x, y - 1.15 * U, "up"];
            }
        }
        return a;
    },
    describe: (p) => {
        const rows = whole(p.rows, 1, 12),
            cols = whole(p.cols, 1, 12),
            iced = whole(p.iced, 0, rows * cols);
        const icing =
            iced === 0
                ? "none of them iced"
                : iced >= rows * cols
                  ? "every one iced with a cherry on top"
                  : "some of them iced with a cherry on top";
        return `A baking tray seen from above with buns in rows and columns, each in a paper case, ${icing}.`;
    },
});
