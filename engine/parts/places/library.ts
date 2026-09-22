import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { PARTY } from "../stories/pictures";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const library = defineDrawing({
    id: "library",
    family: "places",
    title: "Library",
    group: "Structures",
    about: "A library with steps up to it, a row of columns holding up a triangle of roof, a dome on top and tall doors that can stand open onto shelves of books. The columns can be counted, and so can the steps.",
    params: { columns: 6, open: 0 },
    settings: {
        columns: { kind: "whole", min: 4, max: 8 },
        open: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Doors shut", params: { columns: 6, open: 0 } },
        { label: "Doors open", params: { columns: 8, open: 1 } },
    ],
    box: () => ({ w: 12, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.columns, 4, 8),
            open = p.open > 0,
            W = 12 * U,
            base = 10.8 * U,
            a: RawAnchors = {};
        const stone = pen.fill("card"),
            cx = W / 2,
            pedTop = 3.4 * U,
            beam = 5 * U,
            floor = base - 1.2 * U;
        // the dome behind the pediment
        pen.path(
            g,
            `M${cx - 2.4 * U} ${pedTop + 0.6 * U}A${2.4 * U} ${2.2 * U} 0 0 1 ${cx + 2.4 * U} ${pedTop + 0.6 * U}Z`,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.8 },
        );
        for (const f of [0.4, 0.8])
            pen.arc(g, cx, pedTop + 0.6 * U, 4.8 * U * f, 4.4 * U, Math.PI, Math.PI * 2, "pencil", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        pen.line(g, cx, pedTop - 1.6 * U, cx, pedTop - 2.3 * U, "pencil", { strokeWidth: 1.5 });
        pen.circle(g, cx, pedTop - 2.4 * U, 0.3 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 1,
        });
        pen.polygon(
            g,
            [
                [0.8 * U, beam],
                [cx, pedTop],
                [W - 0.8 * U, beam],
            ],
            "pencil",
            stone,
            { strokeWidth: 2 },
        );
        pen.rect(g, 0.8 * U, beam, W - 1.6 * U, 0.55 * U, "pencil", stone, { strokeWidth: 1.6 });
        // the wall behind the columns, and the doors, open onto shelves or shut
        pen.rect(
            g,
            1.3 * U,
            beam + 0.55 * U,
            W - 2.6 * U,
            floor - beam - 0.55 * U,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 7, fillWeight: 0.4 }),
            { strokeWidth: 1.2 },
        );
        const dw = 1.6 * U,
            dy = floor - 3.1 * U;
        if (open) {
            pen.rect(
                g,
                cx - dw,
                dy,
                dw * 2,
                floor - dy,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.4 },
            );
            for (let k = 1; k < 4; k++)
                pen.line(g, cx - dw, dy + k * 0.78 * U, cx + dw, dy + k * 0.78 * U, "pencil", {
                    strokeWidth: 1.2,
                });
            for (let k = 0; k < 11; k++)
                pen.rect(
                    g,
                    cx - dw + 0.15 * U + k * 0.27 * U,
                    dy + (k % 3) * 0.78 * U + 0.3 * U,
                    0.2 * U,
                    0.46 * U,
                    "ruler",
                    pen.fill(PARTY[k % PARTY.length]),
                    { strokeWidth: 0.6 },
                );
            for (const sd of [-1, 1])
                pen.polygon(
                    g,
                    [
                        [cx + sd * dw, dy],
                        [cx + sd * (dw + 0.7 * U), dy + 0.3 * U],
                        [cx + sd * (dw + 0.7 * U), floor - 0.1 * U],
                        [cx + sd * dw, floor],
                    ],
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1.3 },
                );
        } else {
            pen.rect(g, cx - dw, dy, dw * 2, floor - dy, "pencil", pen.fill("tang"), {
                strokeWidth: 1.5,
            });
            pen.line(g, cx, dy, cx, floor, "pencil", { strokeWidth: 1.2 });
            for (const sd of [-1, 1])
                pen.circle(
                    g,
                    cx + sd * 0.3 * U,
                    dy + 1.6 * U,
                    0.22 * U,
                    "pencil",
                    pen.fill("glow"),
                    { strokeWidth: 0.8 },
                );
        }
        a.door = [cx, dy, "up"];
        for (let i = 0; i < n; i++) {
            const x = 1.5 * U + (i / (n - 1)) * (W - 3 * U);
            if (Math.abs(x - cx) < dw + 0.3 * U) continue;
            pen.rect(
                g,
                x - 0.28 * U,
                beam + 0.55 * U,
                0.56 * U,
                floor - beam - 0.55 * U,
                "pencil",
                stone,
                { strokeWidth: 1.4 },
            );
            for (const dx of [-0.1, 0.1])
                pen.line(g, x + dx * U, beam + 0.7 * U, x + dx * U, floor - 0.2 * U, "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.t["ink-soft"],
                });
            a[`column(${i})`] = [x, floor, "down"];
        }
        for (let k = 0; k < 3; k++)
            pen.rect(
                g,
                (0.6 + k * 0.3) * U,
                floor + k * 0.4 * U,
                W - (1.2 + k * 0.6) * U,
                0.4 * U,
                "pencil",
                stone,
                { strokeWidth: 1.1 },
            );
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 2 });
        a.dome = [cx, pedTop - 2.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A library with steps up to it, a row of columns holding up a triangle of roof, a dome on top and tall doors ${p.open > 0 ? "standing open onto shelves of books" : "shut"}.`,
});
