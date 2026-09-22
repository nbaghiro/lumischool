import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const goalposts = defineDrawing({
    id: "goalposts",
    family: "sport",
    title: "Goal",
    group: "Structures",
    about: "A football goal with its net pulled back behind the posts and the ball on the line if there is one. The goal mouth is a rectangle a question can measure or find the perimeter of.",
    params: { ball: 1 },
    settings: { ball: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Ball on the line", params: { ball: 1 } },
        { label: "Empty goal", params: { ball: 0 } },
    ],
    box: () => ({ w: 14, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 1.4 * U,
            x1 = 12.6 * U,
            top = 1.6 * U,
            base = 7.4 * U,
            back = 0.9 * U;
        for (let x = x0 + back; x <= x1 - back + 1; x += 0.7 * U)
            pen.line(g, x, top - back * 0.6, x, base - back * 0.4, "pencil", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        for (let y = top; y <= base - back; y += 0.7 * U)
            pen.line(g, x0 + back, y - back * 0.4, x1 - back, y - back * 0.4, "pencil", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        pen.line(g, x0, top, x0 + back, top - back * 0.6, "pencil", { strokeWidth: 1.2 });
        pen.line(g, x1, top, x1 - back, top - back * 0.6, "pencil", { strokeWidth: 1.2 });
        for (const x of [x0, x1])
            pen.rect(g, x - 5, top, 10, base - top, "ruler", pen.fill("card"), {
                strokeWidth: 1.8,
            });
        pen.rect(g, x0 - 5, top - 5, x1 - x0 + 10, 10, "ruler", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        pen.line(g, 0.2 * U, base, 13.8 * U, base, "pencil", { strokeWidth: 2.2 });
        const a: RawAnchors = {
            crossbar: [(x0 + x1) / 2, top - 5, "up"],
            left: [x0, base, "down"],
            right: [x1, base, "down"],
        };
        if (p.ball > 0) {
            const bx = 7 * U,
                by = base - 12;
            pen.circle(g, bx, by, 24, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.polygon(
                g,
                [
                    [bx, by - 5],
                    [bx + 5, by - 1],
                    [bx + 3, by + 5],
                    [bx - 3, by + 5],
                    [bx - 5, by - 1],
                ],
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 0.8 },
            );
            a.ball = [bx, by - 12, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A football goal seen from the front, white posts and crossbar with the net pulled back behind them${p.ball > 0 ? ", and a ball on the goal line" : ", with no ball on the line"}.`,
    motion: { still: "A goal stands on its posts." },
});
