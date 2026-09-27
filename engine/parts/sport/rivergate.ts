import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, wide } from "../lettering";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const riverGate = defineDrawing({
    id: "rivergate",
    family: "sport",
    title: "River gate",
    group: "Props",
    about: "A gate floating on a river, seen from above: a striped buoy at each end, a line of floats strung between them, and a white board in the middle with a number on it. A canoe passes between the buoys, and the numbers along a river can make a count to follow.",
    params: { n: "5", w: 6 },
    settings: {
        n: { kind: "text", most: 5 },
        w: { kind: "whole", min: 3, max: 12 },
    },
    takes: [
        { label: "Gate 5, six squares across", params: { n: "5", w: 6 } },
        { label: "Gate 0.3, a narrow one", params: { n: "0.3", w: 4 } },
        { label: "A blank gate", params: { n: "", w: 5 } },
    ],
    box: (p) => ({ w: 2, h: whole(p.w, 3, 12, 6) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            h = whole(p.w, 3, 12, 6) * U,
            x = U;
        const o = { strokeWidth: 1.2, disableMultiStroke: true, preserveVertices: true };
        for (let y = 0.9 * U; y < h - 0.9 * U; y += 0.45 * U)
            pen.circle(g, x, y, 0.22 * U, "ruler", pen.fill("card"), { ...o, strokeWidth: 0.9 });
        for (const y of [0.5 * U, h - 0.5 * U]) {
            pen.circle(g, x, y, 0.8 * U, "ruler", pen.fill("berry"), { ...o, strokeWidth: 1.6 });
            pen.line(g, x - 0.38 * U, y, x + 0.38 * U, y, "ruler", {
                ...o,
                strokeWidth: 2.4,
                stroke: c.t.card,
            });
        }
        if (p.n) {
            const board = Math.min(1.9 * U, wide(p.n, 14) + 8);
            pen.rect(g, x - board / 2, h / 2 - 0.5 * U, board, U, "ruler", pen.fill("card"), {
                ...o,
                strokeWidth: 1.4,
            });
            num(c, x, h / 2 + 5, p.n, 14);
        }
        return {
            top: [x, 0.5 * U, "up"],
            bottom: [x, h - 0.5 * U, "down"],
            board: [x, h / 2, "right"],
        };
    },
    describe: (p) =>
        `A gate on a river seen from above: a striped buoy at each end, floats strung between them${p.n ? " and a white board with a number in the middle" : ""}.`,
    motion: {
        still: "A game floats it on the river where a count along the water needs it; on the shelf it holds still so its number can be read.",
    },
});
