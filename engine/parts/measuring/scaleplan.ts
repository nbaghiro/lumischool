import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

/** One square of the plan is one square of the page, so a child counting squares on the page counts the plan's. */
const CELL = U;

export const scalePlan = defineDrawing({
    id: "scaleplan",
    family: "measuring",
    title: "Scale drawing",
    group: "Structures",
    about: "A plan drawn from above on its own squares, a room or a garden, with a scale bar under it saying what one square stands for. Its sides can carry their real lengths or a question mark, so a child reads the plan through the scale.",
    params: { plan: 1, l: 8, w: 5, scale: 1, unit: "m", dims: 1, ask: 0 },
    settings: {
        plan: { kind: "one of", of: [1, 2] },
        l: { kind: "whole", min: 5, max: 14 },
        w: { kind: "whole", min: 4, max: 10 },
        scale: { kind: "number", min: 0.1, max: 1000, step: 0.1 },
        unit: { kind: "one of", of: ["m", "cm", "km"] },
        dims: { kind: "one of", of: [0, 1] },
        ask: { kind: "one of", of: [0, 1, 2] },
    },
    takes: [
        {
            label: "A bedroom",
            params: { plan: 1, l: 8, w: 5, scale: 1, unit: "m", dims: 1, ask: 0 },
        },
        {
            label: "A garden, how long",
            params: { plan: 2, l: 10, w: 6, scale: 2, unit: "m", dims: 1, ask: 1 },
        },
        {
            label: "Only the scale",
            params: { plan: 2, l: 7, w: 5, scale: 5, unit: "m", dims: 0, ask: 0 },
        },
    ],
    box: (p) => ({ w: Math.max(Math.max(5, p.l) + 5, 11), h: Math.max(4, p.w) + 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            l = Math.max(5, p.l),
            w = Math.max(4, p.w),
            x0 = 4 * U,
            y0 = U,
            x1 = x0 + l * CELL,
            y1 = y0 + w * CELL,
            at = (x: number, y: number): [number, number] => [x0 + x * CELL, y0 + y * CELL],
            a: RawAnchors = {};
        const floor =
            p.plan === 2 ? pen.fill("mint", "hachure", { hachureGap: 14 }) : pen.fill("card");
        pen.rect(g, x0, y0, l * CELL, w * CELL, "ruler", floor, { strokeWidth: 0 });
        for (let i = 1; i < l; i++)
            pen.line(g, x0 + i * CELL, y0, x0 + i * CELL, y1, "ruler", {
                strokeWidth: 1,
                stroke: c.t.grid,
            });
        for (let j = 1; j < w; j++)
            pen.line(g, x0, y0 + j * CELL, x1, y0 + j * CELL, "ruler", {
                strokeWidth: 1,
                stroke: c.t.grid,
            });
        if (p.plan === 2) {
            // a shed in the far corner, a pond and a path from the gate
            const [sx, sy] = at(l - 3, 0);
            pen.rect(g, sx, sy, 3 * CELL, 2 * CELL, "ruler", pen.fill("tang"), {
                strokeWidth: 1.8,
            });
            const [px, py] = at(1.5, 1.5);
            pen.ellipse(
                g,
                px + CELL / 2,
                py + CELL / 2,
                2.6 * CELL,
                1.8 * CELL,
                "ruler",
                pen.fill("sky"),
                {
                    strokeWidth: 1.4,
                },
            );
            const [gx] = at(l - 2, 0);
            pen.rect(
                g,
                gx,
                y1 - CELL * Math.min(3, w - 2),
                CELL,
                CELL * Math.min(3, w - 2),
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 1.3,
                },
            );
            a.shed = [sx + 1.5 * CELL, sy + CELL, "up"];
            a.pond = [px + CELL / 2, py + CELL / 2, "up"];
        } else {
            // a bed against the top wall, a table, a window in the top wall and a door in the bottom one
            const [bx, by] = at(l - 3, 0);
            pen.rect(g, bx, by, 2 * CELL, 3 * CELL, "ruler", pen.fill("berry"), {
                strokeWidth: 1.8,
            });
            pen.rect(g, bx + 4, by + 3, 2 * CELL - 8, 9, "ruler", pen.fill("card"), {
                strokeWidth: 1.2,
            });
            const [tx, ty] = at(1, w - 3);
            pen.rect(g, tx, ty, 2 * CELL, CELL, "ruler", pen.fill("tang"), { strokeWidth: 1.8 });
            const [wx] = at(1, 0);
            pen.rect(g, wx, y0 - 3, 2 * CELL, 6, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
            const [dx] = at(l - 2, 0);
            pen.path(
                g,
                `M${dx} ${y1}L${dx} ${y1 - CELL}A${CELL} ${CELL} 0 0 1 ${dx + CELL} ${y1}`,
                "ruler",
                null,
                {
                    strokeWidth: 1.3,
                },
            );
            a.bed = [bx + CELL, by + 1.5 * CELL, "up"];
            a.table = [tx + CELL, ty, "up"];
            a.door = [dx + CELL / 2, y1, "down"];
        }
        pen.rect(g, x0, y0, l * CELL, w * CELL, "ruler", null, { strokeWidth: 2.6 });
        const said = (squares: number, which: number) =>
            p.ask === which ? "?" : `${Number((squares * p.scale).toFixed(2))} ${p.unit}`;
        if (p.dims === 1 || p.ask === 1) num(c, (x0 + x1) / 2, y1 + 24, said(l, 1), 16);
        if (p.dims === 1 || p.ask === 2) num(c, x0 - 10, (y0 + y1) / 2 + 6, said(w, 2), 16, "end");
        // a bar of four squares, one square to a block, numbered every two so the numbers never crowd
        const by = y1 + 3 * U;
        for (let k = 0; k < 4; k++)
            pen.rect(g, x0 + k * CELL, by, CELL, 8, "ruler", k % 2 === 0 ? pen.fill("ink") : null, {
                strokeWidth: 1.4,
            });
        soft(c, x0, by + 26, "0", 13);
        soft(c, x0 + 2 * CELL, by + 26, `${Number((2 * p.scale).toFixed(2))}`, 13);
        soft(c, x0 + 4 * CELL, by + 26, `${Number((4 * p.scale).toFixed(2))} ${p.unit}`, 13);
        num(c, x0, by + 52, `1 square = ${Number(p.scale.toFixed(2))} ${p.unit}`, 15, "start");
        a.plan = [(x0 + x1) / 2, (y0 + y1) / 2, "up"];
        a.length = [(x0 + x1) / 2, y1 + 8, "down"];
        a.width = [x0 - 8, (y0 + y1) / 2, "left"];
        a.scale = [x0 + CELL, by + 5, "down"];
        return a;
    },
    describe: (p) =>
        `A plan of ${p.plan === 2 ? "a garden with a shed, a pond and a path" : "a room with a bed, a table, a window and a door"} drawn from above on squares, with a scale bar under it.`,
});
