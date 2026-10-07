import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { wash } from "../outdoors/wash";

export const bowlingLane = defineDrawing({
    id: "bowlinglane",
    family: "sport",
    title: "Bowling lane",
    group: "Structures",
    about: "A narrow timber bowling lane viewed from above, with gutters, board seams, a foul line and aiming arrows.",
    params: { bumpers: true },
    settings: { bumpers: { kind: "flag" } },
    takes: [
        { label: "Raised bumpers", params: { bumpers: true } },
        { label: "Open gutters", params: { bumpers: false } },
    ],
    box: () => ({ w: 14, h: 25 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.rect(g, 0.2 * U, 0.2 * U, 13.6 * U, 24.6 * U, "pencil", pen.fill("paper"), {
            strokeWidth: 1.4,
        });
        pen.rect(g, 1 * U, 0.4 * U, 12 * U, 24.2 * U, "pencil", pen.fill("paper"), {
            strokeWidth: 1,
        });
        wash(c, `M${U} ${0.4 * U}H${13 * U}V${24.6 * U}H${U}Z`, "glow", 0.22, false);
        for (let x = 2; x < 13; x++)
            pen.line(g, x * U, 0.5 * U, x * U, 24.5 * U, "ruler", {
                strokeWidth: 0.35,
                stroke: c.t["ink-soft"],
            });
        for (const x of [0.6, 13.4])
            pen.line(g, x * U, 0.5 * U, x * U, 24.5 * U, "pencil", {
                strokeWidth: p.bumpers ? 4 : 1.2,
                stroke: c.t[p.bumpers ? "sky" : "ink-soft"],
            });
        pen.line(g, U, 22 * U, 13 * U, 22 * U, "ruler", { strokeWidth: 2 });
        for (let x = 3; x <= 11; x += 2) {
            const y = 15 + Math.abs(x - 7) * 0.3;
            pen.line(g, (x - 0.2) * U, (y + 0.4) * U, x * U, y * U, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x * U, y * U, (x + 0.2) * U, (y + 0.4) * U, "pencil", { strokeWidth: 1.2 });
        }
        return { middle: [7 * U, 12.5 * U, "up"], start: [7 * U, 23 * U, "up"] };
    },
    describe: () =>
        "A long wooden bowling lane seen from above, with narrow side gutters, straight board seams, five aiming arrows and a dark foul line.",
    motion: { still: "The lane stays fixed beneath the rolling ball and falling pins." },
});
