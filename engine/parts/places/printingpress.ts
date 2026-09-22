import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const printingPress = defineDrawing({
    id: "printingpress",
    family: "places",
    title: "Printing press",
    group: "Structures",
    about: "An old iron hand press on four splayed legs: a frame with a heavy screw pressing a flat plate down onto a sheet, a big spoked wheel with a handle at its side, and a bed of metal letters set in rows. Beside it, on a wooden table, is a pile of sheets. Before printing the sheets are blank; after, they carry lines of print and a finished book with a red cover lies on top.",
    params: { printed: 0 },
    settings: { printed: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Sheets still blank", params: { printed: 0 } },
        { label: "Printed into a book", params: { printed: 1 } },
    ],
    box: () => ({ w: 12, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            base = 9.6 * U,
            done = p.printed > 0;
        const iron = pen.fill("ink-soft", "hachure", { hachureGap: 3.6, fillWeight: 0.8 }),
            wood = pen.fill("tang"),
            paper = pen.fill("card");
        const bed = 5.9 * U;
        // the wheel at the press's side, behind the frame
        const wx = 6.35 * U,
            wy = 3.2 * U,
            wr = 1.55 * U;
        pen.circle(g, wx, wy, wr * 2, "pencil", null, calm(c, 2.4));
        pen.circle(g, wx, wy, wr * 2 - 0.3 * U, "pencil", null, calm(c, 1));
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + 0.3;
            pen.line(
                g,
                wx,
                wy,
                wx + Math.cos(ang) * (wr - 0.15 * U),
                wy + Math.sin(ang) * (wr - 0.15 * U),
                "pencil",
                calm(c, 1.4),
            );
        }
        pen.circle(g, wx, wy, 0.45 * U, "pencil", iron, calm(c, 1.3));
        const hx = wx + Math.cos(-0.9) * wr,
            hy = wy + Math.sin(-0.9) * wr;
        pen.line(g, hx, hy, hx + 0.55 * U, hy - 0.45 * U, "pencil", calm(c, 2));
        pen.circle(g, hx + 0.62 * U, hy - 0.52 * U, 0.42 * U, "pencil", wood, calm(c, 1.2));
        pen.line(g, wx, wy, 3.75 * U, wy, "pencil", calm(c, 2.2));
        // the legs, splayed, and the long bed across them
        for (const [top, foot] of [
            [1.0, 0.45],
            [2.1, 2.3],
            [6.1, 5.9],
            [6.9, 7.45],
        ] as const)
            pen.line(
                g,
                top * U,
                bed + 0.5 * U,
                foot * U,
                base,
                "pencil",
                calm(c, top === 2.1 || top === 6.1 ? 1.3 : 1.9),
            );
        pen.line(g, 1.5 * U, 8.2 * U, 6.7 * U, 8.2 * U, "pencil", calm(c, 1.4));
        pen.rect(g, 0.3 * U, bed, 7.1 * U, 0.55 * U, "pencil", iron, calm(c, 1.8));
        // the frame and its heavy screw coming down onto the plate
        for (const x of [1.95, 5.45])
            pen.rect(
                g,
                (x - 0.22) * U,
                1.55 * U,
                0.44 * U,
                bed - 1.55 * U,
                "pencil",
                iron,
                calm(c, 1.7),
            );
        pen.path(
            g,
            `M${1.55 * U} ${1.95 * U}Q${3.7 * U} ${0.45 * U} ${5.85 * U} ${1.95 * U}L${5.85 * U} ${2.35 * U}Q${3.7 * U} ${1.2 * U} ${1.55 * U} ${2.35 * U}Z`,
            "pencil",
            iron,
            calm(c, 1.8),
        );
        pen.rect(g, 3.52 * U, 1.7 * U, 0.36 * U, 2.1 * U, "pencil", pen.fill("card"), calm(c, 1.3));
        for (let y = 1.95; y < 3.7; y += 0.32)
            pen.line(g, 3.52 * U, y * U, 3.88 * U, (y + 0.14) * U, "pencil", { strokeWidth: 0.8 });
        pen.rect(g, 2.35 * U, 3.8 * U, 2.7 * U, 0.42 * U, "pencil", iron, calm(c, 1.7));
        a.plate = [3.7 * U, 3.8 * U, "up"];
        // on the bed: a sheet under the plate, and the forme of metal letters in rows
        pen.polygon(
            g,
            [
                [2.25 * U, bed],
                [5.15 * U, bed],
                [5.05 * U, bed - 0.2 * U],
                [2.35 * U, bed - 0.2 * U],
            ],
            "pencil",
            paper,
            calm(c, 1.2),
        );
        if (done)
            for (let i = 0; i < 4; i++)
                pen.line(
                    g,
                    (2.6 + i * 0.66) * U,
                    bed - 0.1 * U,
                    (3.1 + i * 0.66) * U,
                    bed - 0.1 * U,
                    "ruler",
                    { strokeWidth: 0.8 },
                );
        // the chase of metal letters waiting on the bed, its type in rows, each block with its raised face
        const fx = 0.55 * U,
            fy = bed - 0.95 * U,
            cols = 5,
            rows = 3,
            cell = 0.3 * U;
        pen.polygon(
            g,
            [
                [fx - 0.12 * U, bed],
                [fx + cols * cell + 0.12 * U, bed],
                [fx + cols * cell + 0.3 * U, fy - 0.12 * U],
                [fx + 0.06 * U, fy - 0.12 * U],
            ],
            "pencil",
            wood,
            calm(c, 1.4),
        );
        for (let r = 0; r < rows; r++)
            for (let q = 0; q < cols; q++) {
                const x = fx + 0.06 * U + q * cell + (rows - 1 - r) * 0.06 * U,
                    y = fy + r * cell;
                pen.rect(g, x, y, cell - 3, cell - 3, "ruler", pen.fill("card"), {
                    strokeWidth: 0.8,
                });
                pen.line(g, x + 3, y + (cell - 3) / 2, x + cell - 6, y + (cell - 3) / 2, "ruler", {
                    strokeWidth: 1.2,
                });
            }
        a.letters = [fx + (cols * cell) / 2, fy, "up"];
        // the table beside the press with its pile of sheets, and the book on top once they are printed
        const t0 = 8.1 * U,
            t1 = 11.7 * U,
            tt = 6.55 * U;
        for (const x of [t0 + 0.35 * U, t1 - 0.35 * U])
            pen.rect(g, x - 0.14 * U, tt, 0.28 * U, base - tt, "pencil", wood, calm(c, 1.4));
        pen.rect(g, t0, tt, t1 - t0, 0.36 * U, "pencil", wood, calm(c, 1.7));
        const px0 = t0 + 0.35 * U,
            px1 = t1 - 0.35 * U;
        for (let i = 0; i < 6; i++) {
            const y = tt - (i + 1) * 0.2 * U,
                d = (i % 2 ? 0.06 : -0.05) * U;
            pen.rect(g, px0 + d, y, px1 - px0, 0.2 * U, "pencil", paper, calm(c, 1));
        }
        const pileTop = tt - 1.2 * U;
        pen.polygon(
            g,
            [
                [px0 - 0.1 * U, pileTop],
                [px1 + 0.05 * U, pileTop],
                [px1 - 0.25 * U, pileTop - 0.5 * U],
                [px0 + 0.2 * U, pileTop - 0.5 * U],
            ],
            "pencil",
            paper,
            calm(c, 1.3),
        );
        if (done) {
            for (let i = 0; i < 3; i++)
                pen.line(
                    g,
                    px0 + (0.35 + i * 0.08) * U,
                    pileTop - (0.14 + i * 0.13) * U,
                    px1 - (0.4 + i * 0.08) * U,
                    pileTop - (0.14 + i * 0.13) * U,
                    "ruler",
                    { strokeWidth: 0.7 },
                );
            const bx0 = px0 + 0.45 * U,
                bx1 = px1 - 0.55 * U,
                by = pileTop - 0.28 * U;
            pen.polygon(
                g,
                [
                    [bx0, by],
                    [bx1, by],
                    [bx1 + 0.12 * U, by + 0.26 * U],
                    [bx0 + 0.1 * U, by + 0.26 * U],
                ],
                "pencil",
                paper,
                calm(c, 1),
            );
            pen.polygon(
                g,
                [
                    [bx0 + 0.05 * U, by - 0.62 * U],
                    [bx1 - 0.2 * U, by - 0.62 * U],
                    [bx1, by],
                    [bx0, by],
                ],
                "pencil",
                pen.fill("berry"),
                calm(c, 1.5),
            );
            pen.polygon(
                g,
                [
                    [bx0 + 0.55 * U, by - 0.45 * U],
                    [bx1 - 0.65 * U, by - 0.45 * U],
                    [bx1 - 0.55 * U, by - 0.2 * U],
                    [bx0 + 0.5 * U, by - 0.2 * U],
                ],
                "pencil",
                paper,
                calm(c, 1),
            );
            a.book = [(bx0 + bx1) / 2, by - 0.62 * U, "up"];
        }
        a.pile = [(px0 + px1) / 2, pileTop - 0.5 * U, "up"];
        pen.line(g, 0.2 * U, base, 11.8 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        p.printed > 0
            ? "An iron hand press with a big spoked wheel and a bed of metal letters, and beside it a pile of printed sheets with a red book on top."
            : "An iron hand press with a heavy screw over a flat plate, a big spoked wheel and a bed of metal letters, and beside it a pile of blank sheets.",
    motion: { still: "Its letters are set in rows to be read, so it holds still." },
});
