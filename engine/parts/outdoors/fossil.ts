import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ring, along } from "../animals/nature";

export const fossil = defineDrawing({
    id: "fossil",
    family: "outdoors",
    title: "Fossil sea reptile",
    group: "Props",
    about: "The skeleton of a long-necked sea reptile set in a slab of rock, from its small head and long neck of bones to its ribs, four paddles and tail. It swam in a sea that is now a cliff. Part of it may still be in the rock, drawn in pencil, so how much has been uncovered can be told as a fraction. With `close` at 1 the slab is cut to the head and the neck, which is the same dig at half the width, for a margin where the whole animal would be drawn too small to see.",
    params: { dug: 1, close: 0 },
    settings: {
        dug: { kind: "number", min: 0, max: 1, step: 0.05 },
        close: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Uncovered", params: { dug: 1, close: 0 } },
        { label: "A third uncovered", params: { dug: 0.33, close: 0 } },
        { label: "Half uncovered", params: { dug: 0.5, close: 0 } },
        { label: "The head end, close", params: { dug: 1, close: 1 } },
    ],
    box: (p) => ({ w: p.close > 0 ? 10 : 22, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            close = p.close > 0,
            end = close ? 8.7 * U : 20.9 * U,
            dug = Math.max(0, Math.min(1, p.dug)),
            reach = (1 + dug * (close ? 8.7 : 20.2)) * U,
            a: RawAnchors = {};
        pen.path(
            g,
            ring(
                close
                    ? [
                          [0.5 * U, 1.4 * U],
                          [5 * U, 0.8 * U],
                          [9 * U, 1.3 * U],
                          [9.1 * U, 5 * U],
                          [8.8 * U, 8.4 * U],
                          [5 * U, 8.7 * U],
                          [0.6 * U, 8.6 * U],
                          [0.3 * U, 5 * U],
                      ]
                    : [
                          [0.5 * U, 1.4 * U],
                          [5 * U, 0.8 * U],
                          [11 * U, 1.2 * U],
                          [17 * U, 0.7 * U],
                          [21.6 * U, 1.3 * U],
                          [21.7 * U, 5 * U],
                          [21.4 * U, 8.3 * U],
                          [15 * U, 8.7 * U],
                          [8 * U, 8.3 * U],
                          [0.6 * U, 8.6 * U],
                          [0.3 * U, 5 * U],
                      ],
            ),
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
            { strokeWidth: 1.8 },
        );
        const scratches: readonly (readonly [number, number, number, number])[] = [
            [3, 7.9, 4.6, 7.2],
            [17.6, 1.2, 18.4, 2.2],
            [9.2, 8.2, 10.4, 7.7],
        ];
        for (const [x0, y0, x1, y1] of scratches.filter(([x]) => x * U < end))
            pen.line(g, x0 * U, y0 * U, x1 * U, y1 * U, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        const bone = (x: number) =>
            x <= reach
                ? { f: pen.fill("card"), o: { strokeWidth: 1.4 } }
                : {
                      f: null,
                      o: { strokeWidth: 1.1, stroke: c.t["ink-soft"], strokeLineDash: [4, 4] },
                  };
        const spineY = (x: number) =>
            4.2 * U + Math.sin((x / U - 2) * 0.34) * 0.45 * U + (x > 10 * U ? 0.2 * U : 0);
        // the head, with its teeth
        const hb = bone(2 * U);
        pen.path(
            g,
            ring([
                [0.9 * U, 4.1 * U],
                [1.6 * U, 3.5 * U],
                [2.8 * U, 3.55 * U],
                [3.3 * U, 4 * U],
                [2.8 * U, 4.55 * U],
                [1.4 * U, 4.6 * U],
            ]),
            "pencil",
            hb.f,
            hb.o,
        );
        pen.circle(g, 2.5 * U, 3.9 * U, 0.42 * U, "pencil", null, hb.o);
        for (let k = 0; k < 5; k++)
            pen.line(g, (1.2 + k * 0.3) * U, 4.4 * U, (1.25 + k * 0.3) * U, 4.7 * U, "ruler", hb.o);
        // the neck and back and tail, a bone at a time
        for (let x = 3.5 * U; x < end; x += x < 9 * U ? 0.46 * U : 0.5 * U) {
            const y = spineY(x),
                s = x < 9 * U ? 0.34 : x < 15 * U ? 0.44 : 0.44 - ((x - 15 * U) / (6 * U)) * 0.3,
                b = bone(x);
            pen.rect(g, x - s * U * 0.5, y - s * U * 0.45, s * U, s * U * 0.9, "pencil", b.f, b.o);
            if (x > 9 * U && x < 15.5 * U)
                pen.line(g, x, y - s * U * 0.45, x + 3, y - s * U * 1.2, "pencil", b.o);
        }
        // the ribs
        for (let k = 0; k < (close ? 0 : 10); k++) {
            const x = (9.6 + k * 0.58) * U,
                y = spineY(x),
                len = (1.3 + Math.sin((k / 9) * Math.PI) * 0.9) * U,
                b = bone(x);
            pen.curve(
                g,
                [
                    [x, y + 0.2 * U],
                    [x - 0.35 * U, y + len * 0.55],
                    [x - 0.1 * U, y + len],
                ],
                "pencil",
                { ...b.o, strokeWidth: (b.o.strokeWidth ?? 1.4) + 0.4 },
            );
        }
        // four paddles, each an arm bone and rows of small finger bones
        const paddles: readonly (readonly [number, number])[] = close
            ? []
            : [
                  [10.2, 2.35],
                  [14.6, 0.95],
              ];
        for (const [x, ang] of paddles)
            for (const off of [0, 0.9]) {
                const x0 = (x + off * (ang > 1.5 ? -0.5 : 0.5)) * U,
                    y0 = spineY(x0) + (1.4 + off * 0.3) * U,
                    b = bone(x0);
                const [ex, ey] = along(x0, y0, 1.3 * U, ang);
                pen.line(g, x0, y0, ex, ey, "pencil", { ...b.o, strokeWidth: 4 });
                for (let r = 0; r < 4; r++)
                    for (let q = -1; q <= 1; q++) {
                        const [bx, by] = along(ex, ey, (0.4 + r * 0.42) * U, ang + q * 0.22);
                        pen.ellipse(g, bx, by, 0.32 * U, 0.2 * U, "pencil", b.f, b.o);
                    }
            }
        a.skull = [2 * U, 3.5 * U, "up"];
        if (!close) a.tail = [20.9 * U, spineY(20.9 * U), "right"];
        return a;
    },
    describe: (p) =>
        p.close > 0
            ? `The head and neck of a fossil sea reptile in a slab of yellow rock, its small toothed skull and its neck bones one after another${p.dug < 1 ? ", partly still in the rock, in dashed pencil" : ", all uncovered"}.`
            : `The skeleton of a long-necked sea reptile in a slab of yellow rock, its small head, long neck, ribs, paddles and tail${p.dug < 1 ? " partly still in the rock, in dashed pencil" : " all uncovered"}.`,
});
