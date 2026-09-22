import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

/** How far down its box a long cake has its icing top and its foot, and the box, in squares. */
export const CAKE_BODY = { top: 3.1, foot: 5.5, box: 6 } as const;

/** How much of the cake a take draws, in squares along it. */
const cakeSpan = (p: { whole: number; from: number; to: number }) => {
    const len = Math.max(1, Number(p.whole) || 16),
        from = clamp(Number(p.from) || 0, 0, len - 0.2);
    return { len, from, to: clamp(Number(p.to) || len, from + 0.2, len) };
};

export const longCake = defineDrawing({
    id: "longcake",
    family: "food",
    title: "Long cake",
    group: "Props",
    about: "A long iced sponge seen from the side, with cream through the middle and candles along the top, drawn from any place along it to any other, so a piece cut from it keeps its own candles and has square cut ends. The amount of cake goes with its length, which is not true of a round cake seen from the side, so shares of it can be judged by length.",
    params: { whole: 16, from: 0, to: 16, candles: 6, lit: false },
    settings: {
        whole: { kind: "whole", min: 1, max: 35 },
        from: { kind: "number", min: 0, max: 35, step: 0.5 },
        to: { kind: "number", min: 0, max: 35, step: 0.5 },
        candles: { kind: "whole", min: 0, max: 24 },
        lit: { kind: "flag" },
    },
    takes: [
        {
            label: "The whole cake, six candles",
            params: { whole: 16, from: 0, to: 16, candles: 6, lit: false },
        },
        {
            label: "A third cut from the left, lit",
            params: { whole: 15, from: 0, to: 5, candles: 6, lit: true },
        },
        {
            label: "A piece from the middle",
            params: { whole: 16, from: 6.5, to: 10, candles: 6, lit: false },
        },
    ],
    box: (p) => {
        const s = cakeSpan(p);
        return { w: Math.ceil(s.to - s.from) + 1, h: CAKE_BODY.box };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            { len, from, to } = cakeSpan(p),
            a: RawAnchors = {};
        const x0 = 0.5 * U,
            x1 = x0 + (to - from) * U,
            top = CAKE_BODY.top * U,
            bottom = CAKE_BODY.foot * U,
            r = 12;
        const leftEnd = from <= 0.001,
            rightEnd = to >= len - 0.001;
        const body = `M${leftEnd ? x0 + r : x0} ${top}H${rightEnd ? x1 - r : x1}${rightEnd ? `Q${x1} ${top} ${x1} ${top + r}` : ""}V${bottom}H${x0}V${leftEnd ? top + r : top}${leftEnd ? `Q${x0} ${top} ${x0 + r} ${top}` : ""}Z`;
        pen.path(
            g,
            body,
            "pencil",
            pen.fill("glow", "solid", { hachureGap: 9, fillWeight: 0.6 }),
            calm(c, 2.2),
        );
        const cream = (top + 0.55 * U + bottom) / 2 + 4;
        pen.line(g, x0 + 3, cream, x1 - 3, cream, "pencil", {
            strokeWidth: 3.2,
            stroke: c.paper ? c.t["ink-soft"] : c.t.card,
            disableMultiStroke: true,
        });
        // The icing drips at whole squares along the whole cake, so a piece keeps the drips it had.
        const pts: string[] = [];
        for (let x = x1; x >= x0 - 0.01; x -= 3) {
            const along = from + (x - x0) / U,
                bump = Math.pow(Math.max(0, Math.sin(Math.PI * (along % 1))), 6);
            pts.push(`L${x.toFixed(1)} ${(top + 0.5 * U + 7 * bump).toFixed(1)}`);
        }
        const icing = `M${leftEnd ? x0 + r : x0} ${top}H${rightEnd ? x1 - r : x1}${rightEnd ? `Q${x1} ${top} ${x1} ${top + r}` : ""}${pts.join("")}${leftEnd ? `L${x0} ${top + r}Q${x0} ${top} ${x0 + r} ${top}` : ""}Z`;
        pen.path(g, icing, "pencil", pen.fill("berry", "solid", { hachureGap: 7 }), calm(c, 1.6));
        const n = whole(p.candles, 0, 24, 0);
        for (let i = 0; i < n; i++) {
            const along = ((i + 0.5) * len) / n;
            if (along < from || along >= to) continue;
            const x = x0 + (along - from) * U;
            pen.rect(
                g,
                x - 4,
                top - 1.5 * U,
                8,
                1.5 * U,
                "ruler",
                pen.fill("sky", "solid", { hachureGap: 4 }),
                calm(c, 1.2),
            );
            if (p.lit)
                pen.path(
                    g,
                    `M${x} ${top - 2.3 * U}Q${x + 6} ${top - 1.85 * U} ${x} ${top - 1.55 * U}Q${x - 6} ${top - 1.85 * U} ${x} ${top - 2.3 * U}Z`,
                    "pencil",
                    pen.fill("glow"),
                    calm(c, 1),
                );
        }
        a.top = [(x0 + x1) / 2, top, "up"];
        a.left = [x0, (top + bottom) / 2, "left"];
        a.right = [x1, (top + bottom) / 2, "right"];
        a.foot = [(x0 + x1) / 2, bottom, "down"];
        return a;
    },
    describe: (p) => {
        const { len, from, to } = cakeSpan(p),
            n = whole(p.candles, 0, 24, 0);
        let shown = 0;
        for (let i = 0; i < n; i++) {
            const along = ((i + 0.5) * len) / n;
            if (along >= from && along < to) shown++;
        }
        return `${from <= 0.001 && to >= len - 0.001 ? "A whole long yellow sponge cake" : "A piece cut from a long yellow sponge cake"} seen from the side, pink icing over its top and cream through its middle${shown > 0 ? `, ${p.lit ? "lit " : ""}blue candles along the top` : ""}.`;
    },
    motion: { still: "A piece's length is the share it is, so it holds still to be compared." },
});
