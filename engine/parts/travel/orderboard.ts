import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const wood = <G>(c: Ctx<G>) => c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });

/** The order board's cells, its edges, its height and how far above its feet the sign hangs, in squares. */
export const ORDERBOARD = { each: 3.1, edge: 1.3, h: 11, sign: 4.6 } as const;

export const orderBoardWidth = (count: number): number =>
    Math.ceil(count * ORDERBOARD.each + 2 * ORDERBOARD.edge);

export const orderBoard = defineDrawing({
    id: "orderboard",
    family: "travel",
    title: "Order board",
    group: "Structures",
    about: "A signboard on two tall posts, the kind a yard hangs by its gate, showing the carriages the way the train is to be made up: each one small with its number, in order from the engine, with a title above them. The sign stands high enough to be read over a train. A board with the order ticked is one the train matches.",
    params: { order: ["1", "2", "3"] as string[], title: "Make up the train", done: 0 },
    settings: {
        order: { kind: "words", most: 10 },
        title: { kind: "text", most: 20 },
        done: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Three carriages in order",
            params: { order: ["1", "2", "3"], title: "Make up the train", done: 0 },
        },
        {
            label: "Six, and the train matches",
            params: { order: ["1", "2", "3", "4", "5", "6"], title: "Make up the train", done: 1 },
        },
    ],
    box: (p) => ({ w: orderBoardWidth(Math.max(1, p.order.length)), h: ORDERBOARD.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = Math.max(1, p.order.length),
            w = orderBoardWidth(n) * U,
            top = 0.3 * U,
            bottom = ORDERBOARD.sign * U,
            h = ORDERBOARD.h * U;
        for (const x of [0.9 * U, w - 0.9 * U]) {
            pen.rect(
                g,
                x - 0.22 * U,
                bottom - 0.4 * U,
                0.44 * U,
                h - bottom + 0.4 * U,
                "ruler",
                wood(c),
                calm(c, 1.5),
            );
            pen.ellipse(g, x, h - 0.1 * U, 0.9 * U, 0.2 * U, "ruler", null, {
                strokeWidth: 1.2,
                disableMultiStroke: true,
            });
        }
        pen.path(
            g,
            roundedRect(0.25 * U, top, w - 0.5 * U, bottom - top, 8),
            "ruler",
            pen.fill(p.done ? "mint" : "card"),
            calm(c, 2.2),
        );
        say(c, w / 2, top + 0.95 * U, String(p.title), 15, "middle", c.t["ink-soft"]);
        const y0 = top + 1.45 * U,
            cw = 2.4 * U,
            ch = 1.6 * U,
            x0 = (w - n * ORDERBOARD.each * U) / 2 + (ORDERBOARD.each * U - cw) / 2,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = x0 + i * ORDERBOARD.each * U;
            pen.path(
                g,
                roundedRect(x, y0, cw, ch, 5),
                "ruler",
                pen.fill("sky", "solid"),
                calm(c, 1.6),
            );
            for (const wx of [x + 0.35 * U, x + 1.45 * U])
                pen.rect(
                    g,
                    wx,
                    y0 + 0.3 * U,
                    0.6 * U,
                    0.55 * U,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1),
                );
            for (const wx of [x + 0.55 * U, x + cw - 0.55 * U])
                pen.circle(
                    g,
                    wx,
                    y0 + ch + 0.05 * U,
                    0.32 * U,
                    "ruler",
                    pen.fill("ink-soft"),
                    calm(c, 1),
                );
            num(c, x + cw / 2, y0 + ch + 1.05 * U, String(p.order[i] ?? ""), 18);
            a[`car(${i + 1})`] = [x + cw / 2, y0, "up"];
        }
        if (p.done)
            pen.linear(
                g,
                [
                    [w - 1.45 * U, top + 0.6 * U],
                    [w - 1.15 * U, top + 0.95 * U],
                    [w - 0.7 * U, top + 0.3 * U],
                ],
                "pencil",
                { strokeWidth: 2.8, stroke: c.paper ? c.t.ink : c.t.ok },
            );
        a.board = [w / 2, top, "up"];
        a.feet = [w / 2, h, "down"];
        return a;
    },
    describe: (p) =>
        `A signboard on two tall wooden posts, a title across the top and a row of small blue carriages under it, each numbered below${p.done ? ", and a green tick" : ""}.`,
    motion: { still: "A board is read, and the tick on it is the only thing that changes." },
});
