import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";
import { lightFill, gleam, curls, candleOn } from "./apparatus";

export const candle = defineDrawing({
    id: "candle",
    family: "science",
    title: "Candle burning down",
    group: "Structures",
    about: "A candle in a holder beside a ruler in centimetres, a square to each centimetre, with a dashed outline where its top was when it was new. `start` is how tall it was and `burnt` how much has burnt away, so how much is left and how much is gone are both read off the ruler. With `jar` at 1 a glass jar is over it and it has gone out, with a curl of smoke, because burning needs the air. A grown-up lights a candle; the picture is for watching.",
    params: { start: 10, burnt: 3, lit: 1, jar: 0 },
    settings: {
        start: { kind: "whole", min: 6, max: 12 },
        burnt: { kind: "whole", min: 0, max: 11 },
        lit: { kind: "whole", min: 0, max: 1 },
        jar: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "3 cm burnt", params: { start: 10, burnt: 3, lit: 1, jar: 0 } },
        { label: "Nearly gone", params: { start: 8, burnt: 6, lit: 1, jar: 0 } },
        { label: "A jar over it", params: { start: 10, burnt: 2, lit: 1, jar: 1 } },
    ],
    box: (p) => ({ w: 9, h: Math.max(6, Math.min(12, Math.round(p.start))) + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            start = Math.max(6, Math.min(12, Math.round(p.start))),
            burnt = Math.max(0, Math.min(start - 1, Math.round(p.burnt)));
        const base = (start + 3.6) * U,
            cx = 5.4 * U,
            zero = base - 0.5 * U,
            w = 1.3 * U,
            now = zero - (start - burnt) * U;
        // the ruler, one square to a centimetre, numbered every two
        pen.rect(
            g,
            1 * U,
            zero - start * U - 0.4 * U,
            1.3 * U,
            start * U + 0.8 * U,
            "ruler",
            lightFill(c, "glow", "hachure", 7),
            { strokeWidth: 1.6 },
        );
        for (let k = 0; k <= start; k++) {
            const y = zero - k * U;
            pen.line(g, 2.3 * U, y, 2.3 * U - (k % 2 ? 0.35 : 0.6) * U, y, "ruler", {
                strokeWidth: 1.1,
            });
            if (k % 2 === 0) {
                patch(c, 1.45 * U, y - 4, 16, 13);
                num(c, 1.45 * U, y + 4, k, 11);
            }
        }
        soft(c, 1.65 * U, zero + 1.3 * U, "cm", 12);
        if (burnt > 0) {
            c.pen.path(
                g,
                `M${cx - w / 2} ${now}V${zero - start * U}H${cx + w / 2}V${now}`,
                "pencil",
                null,
                { strokeWidth: 1.4, strokeLineDash: [5, 5], stroke: t["ink-soft"] },
            );
            pen.line(g, 2.4 * U, zero - start * U, cx - w / 2 - 4, zero - start * U, "pencil", {
                strokeWidth: 1,
                strokeLineDash: [3, 5],
                stroke: t["ink-soft"],
            });
        }
        pen.line(g, 2.4 * U, now, cx - w / 2 - 4, now, "pencil", {
            strokeWidth: 1,
            strokeLineDash: [3, 5],
            stroke: t["ink-soft"],
        });
        const lit = p.lit > 0 && p.jar <= 0;
        candleOn(
            c,
            cx,
            zero + 0.5 * U,
            (start - burnt) * U,
            lit,
            Math.min(4, Math.ceil(burnt / 2)),
            w,
        );
        if (p.jar > 0) {
            curls(c, cx, now - 0.5 * U, 1, 1.4 * U);
            const jl = cx - 2.2 * U,
                jr = cx + 2.2 * U,
                jt = zero - start * U - 1.6 * U;
            pen.path(
                g,
                `M${jl} ${zero + 0.2 * U}V${jt + 12}Q${jl} ${jt} ${jl + 12} ${jt}H${jr - 12}Q${jr} ${jt} ${jr} ${jt + 12}V${zero + 0.2 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2 },
            );
            gleam(c, jl + 6, jt + 12, zero - 0.4 * U);
        }
        a.top = [cx, now, "right"];
        a.ruler = [1.65 * U, zero - start * U - 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A candle in a holder beside a ruler marked in centimetres${p.jar > 0 ? ", a glass jar over it and smoke curling up" : p.lit > 0 ? ", its wick lit" : ", its wick unlit"}, a dashed line where its top was when new.`,
    reads: true,
});
