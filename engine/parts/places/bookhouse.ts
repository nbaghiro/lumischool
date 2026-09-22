import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** The same numbers every time for the same book, so a shelf looks the same on every draw. */
const jitter = (i: number): number => {
    const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
};
const COVERS: Marker[] = ["berry", "sky", "tang", "mint", "glow"];

export const bookHouse = defineDrawing({
    id: "bookhouse",
    family: "places",
    title: "Book house",
    group: "Structures",
    about: "A tall, narrow wooden house with a pointed roof, its front open like a doll's house to show floors of shelves, a ladder leaning against them, and a round window in the gable with a cushioned seat and an open book beneath it. Its shelves can hold only a few books with gaps between them, or be packed full of books in every colour.",
    params: { floors: 3, full: 0 },
    settings: {
        floors: { kind: "whole", min: 2, max: 3 },
        full: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Shelves nearly empty", params: { floors: 3, full: 0 } },
        { label: "Every shelf full", params: { floors: 3, full: 1 } },
        { label: "Two floors, full", params: { floors: 2, full: 1 } },
    ],
    box: () => ({ w: 10, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            W = 10 * U,
            base = 14.6 * U,
            eave = 4.75 * U,
            floors = Math.max(2, Math.min(3, Math.round(p.floors))),
            full = p.full > 0;
        const wood = pen.fill("tang"),
            x0 = 1.25 * U,
            x1 = W - 1.25 * U,
            in0 = x0 + 0.5 * U,
            in1 = x1 - 0.5 * U;
        // the roof, and in its gable the round window with a reading seat under it
        pen.polygon(
            g,
            [
                [0.45 * U, eave + 0.15 * U],
                [W / 2, 0.45 * U],
                [W - 0.45 * U, eave + 0.15 * U],
            ],
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 1.9 },
        );
        pen.polygon(
            g,
            [
                [1.5 * U, eave],
                [W / 2, 1.35 * U],
                [W - 1.5 * U, eave],
            ],
            "pencil",
            pen.fill("card"),
            calm(c, 1.4),
        );
        pen.circle(g, W / 2, 2.95 * U, 1.7 * U, "pencil", wood, calm(c, 1.6));
        pen.circle(
            g,
            W / 2,
            2.95 * U,
            1.25 * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { strokeWidth: 1.3 },
        );
        pen.line(g, W / 2 - 0.62 * U, 2.95 * U, W / 2 + 0.62 * U, 2.95 * U, "ruler", {
            strokeWidth: 1,
        });
        pen.line(g, W / 2, 2.33 * U, W / 2, 3.57 * U, "ruler", { strokeWidth: 1 });
        pen.rect(
            g,
            3.55 * U,
            4.2 * U,
            2.9 * U,
            0.34 * U,
            "pencil",
            pen.fill("berry"),
            calm(c, 1.3),
        );
        pen.polygon(
            g,
            [
                [4.35 * U, 4.22 * U],
                [W / 2, 4.02 * U],
                [5.65 * U, 4.22 * U],
                [W / 2, 4.3 * U],
            ],
            "pencil",
            pen.fill("card"),
            calm(c, 1.1),
        );
        a.window = [W / 2, 2.1 * U, "up"];
        a.seat = [W / 2, 4.2 * U, "up"];
        // the walls either side of the open front, and the back wall inside
        pen.rect(
            g,
            in0,
            eave,
            in1 - in0,
            base - eave,
            "pencil",
            pen.fill("card", "hachure", { hachureGap: 7, fillWeight: 0.5 }),
            { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
        );
        for (const x of [x0, in1])
            pen.rect(g, x, eave, 0.5 * U, base - eave, "pencil", wood, { strokeWidth: 1.8 });
        pen.rect(
            g,
            x0 - 0.15 * U,
            eave - 0.25 * U,
            x1 - x0 + 0.3 * U,
            0.4 * U,
            "pencil",
            wood,
            calm(c, 1.7),
        );
        // each floor two shelves of books, a thick floor between the floors
        const inner = base - 0.35 * U - eave,
            storey = inner / floors;
        let k = 0;
        for (let f = 0; f < floors; f++) {
            const top = eave + 0.15 * U + f * storey,
                floor = top + storey;
            pen.rect(g, in0, floor - 0.28 * U, in1 - in0, 0.28 * U, "pencil", wood, calm(c, 1.5));
            const mid = top + storey / 2;
            pen.rect(g, in0, mid - 0.14 * U, in1 - in0, 0.14 * U, "ruler", wood, {
                strokeWidth: 1.2,
            });
            for (const [shelf, row] of [
                [mid - 0.14 * U, 0],
                [floor - 0.28 * U, 1],
            ] as const) {
                const room = shelf - (row ? mid : top) - 0.12 * U;
                let x = in0 + 0.12 * U;
                while (x < in1 - 0.5 * U) {
                    const n = k++,
                        w = (0.3 + jitter(n) * 0.2) * U,
                        h = Math.min(room, (0.7 + jitter(n + 50) * 0.35) * room);
                    const gap = !full && jitter(n + 99) > 0.34;
                    if (gap) {
                        x += w + 0.1 * U;
                        continue;
                    }
                    const lean = !full && jitter(n + 7) > 0.8 && x + h < in1 - 0.2 * U;
                    const col = pen.fill(COVERS[n % COVERS.length] ?? "sky");
                    if (lean) {
                        pen.polygon(
                            g,
                            [
                                [x, shelf],
                                [x + 0.2 * U, shelf],
                                [x + 0.2 * U + h * 0.45, shelf - h * 0.9],
                                [x + h * 0.45, shelf - h * 0.9 - 0.15 * U],
                            ],
                            "pencil",
                            col,
                            calm(c, 1.2),
                        );
                        x += h * 0.45 + 0.4 * U;
                    } else {
                        pen.rect(g, x, shelf - h, w, h, "pencil", col, calm(c, 1.2));
                        pen.line(
                            g,
                            x + 0.06 * U,
                            shelf - h * 0.72,
                            x + w - 0.06 * U,
                            shelf - h * 0.72,
                            "pencil",
                            { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
                        );
                        x += w + (full ? 0.02 * U : 0.06 * U);
                    }
                }
                a[`shelf(${f * 2 + row})`] = [(in0 + in1) / 2, shelf, "up"];
            }
        }
        // the ladder leaning on the shelves
        const lb = [6.6 * U, base] as const,
            lt = [5.55 * U, eave + 0.9 * U] as const;
        for (const s of [-1, 1])
            pen.line(
                g,
                lb[0] + s * 0.36 * U,
                lb[1],
                lt[0] + s * 0.3 * U,
                lt[1],
                "pencil",
                calm(c, 1.7),
            );
        for (let i = 1; i < 9; i++) {
            const u = i / 9,
                x = lb[0] + (lt[0] - lb[0]) * u,
                y = lb[1] + (lt[1] - lb[1]) * u,
                hw = (0.36 - 0.06 * u) * U;
            pen.line(g, x - hw, y, x + hw, y, "pencil", calm(c, 1.3));
        }
        a.ladder = [lt[0], lt[1], "up"];
        // the step at the front, and the ground
        pen.rect(
            g,
            3.2 * U,
            base - 0.02 * U,
            3.6 * U,
            0.3 * U,
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        pen.line(g, 0.2 * U, base + 0.28 * U, W - 0.2 * U, base + 0.28 * U, "pencil", {
            strokeWidth: 2,
        });
        return a;
    },
    describe: (p) =>
        `A tall narrow wooden house with a pointed roof, its front open to show floors of shelves ${p.full > 0 ? "packed full of books in every colour" : "holding a few books with gaps between them"}, a ladder leaning against them.`,
    motion: { still: "Its books are counted on their shelves, so it holds still." },
});
