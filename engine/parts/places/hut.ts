import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { PARTY, kidPicture } from "../stories/pictures";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const hut = defineDrawing({
    id: "hut",
    family: "places",
    title: "Painter's hut",
    group: "Structures",
    about: "A wooden hut by the water with a sloping roof, a door, a big window and a board on its wall where pictures are pinned, each with a drawing pin at its top. The pictures on the board can be counted as the wall fills.",
    params: { pictures: 6 },
    settings: { pictures: { kind: "whole", min: 0, max: 8 } },
    takes: [
        { label: "Six pictures up", params: { pictures: 6 } },
        { label: "A bare board", params: { pictures: 0 } },
        { label: "A full board", params: { pictures: 8 } },
    ],
    box: () => ({ w: 11, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.pictures, 0, 8),
            W = 11 * U,
            base = 7.8 * U,
            a: RawAnchors = {};
        pen.polygon(
            g,
            [
                [0.8 * U, 2.6 * U],
                [W - 0.8 * U, 1.2 * U],
                [W - 0.8 * U, base],
                [0.8 * U, base],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5, hachureAngle: 90 }),
            { strokeWidth: 2 },
        );
        for (let x = 1.5 * U; x < W - 1 * U; x += 0.9 * U)
            pen.line(
                g,
                x,
                2.6 * U - ((x - 0.8 * U) / (W - 1.6 * U)) * 1.4 * U + 0.2 * U,
                x,
                base - 0.1 * U,
                "pencil",
                { strokeWidth: 0.7, stroke: c.t["ink-soft"] },
            );
        pen.polygon(
            g,
            [
                [0.2 * U, 2.8 * U],
                [W - 0.1 * U, 1 * U],
                [W - 0.1 * U, 0.5 * U],
                [0.2 * U, 2.3 * U],
            ],
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, 1.4 * U, base - 3.6 * U, 1.6 * U, 3.6 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.6,
        });
        pen.circle(g, 2.7 * U, base - 1.8 * U, 0.26 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 0.8,
        });
        a.door = [2.2 * U, base - 3.6 * U, "up"];
        // the board, and the pictures pinned to it in two rows of four
        const bx = 3.7 * U,
            by = 3 * U,
            bw = 6.6 * U,
            bh = 3.8 * U;
        pen.rect(g, bx, by, bw, bh, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        for (let i = 0; i < n; i++) {
            const col = i % 4,
                row = Math.floor(i / 4),
                w = 1.35 * U,
                h = 1.45 * U,
                x = bx + 0.25 * U + col * 1.6 * U,
                y = by + 0.3 * U + row * 1.75 * U;
            pen.rect(g, x, y, w, h, "pencil", pen.fill("card"), { strokeWidth: 1.1 });
            kidPicture(c, i, x, y, w, h);
            pen.circle(g, x + w / 2, y + 0.1 * U, 5, "ruler", pen.fill(PARTY[i % PARTY.length]), {
                strokeWidth: 0.7,
            });
            a[`picture(${i})`] = [x + w / 2, y, "up"];
        }
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        `A wooden hut with a sloping green roof, a blue door and a board on its wall ${within(p.pictures, 0, 8) > 0 ? "with pictures pinned up on it" : "with nothing pinned to it yet"}.`,
});
