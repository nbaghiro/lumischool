import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, onCircle, patch, soft } from "../lettering";

export const dialScale = defineDrawing({
    id: "dialscale",
    family: "measuring",
    title: "Dial scales",
    group: "Structures",
    about: "Kitchen scales where the whole dial is one turn of the maximum, so half a turn is half the weight. The needle can land between marks, which is the reading worth asking for.",
    params: { max: 1000, step: 200, value: 450, unit: "g" },
    settings: {
        max: { kind: "whole", min: 100, max: 5000 },
        step: { kind: "whole", min: 10, max: 1000 },
        value: { kind: "whole", min: 0, max: 5000 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        { label: "450 g", params: { max: 1000, step: 200, value: 450, unit: "g" } },
        { label: "Between two marks", params: { max: 1000, step: 100, value: 625, unit: "g" } },
        { label: "Two kilograms", params: { max: 2000, step: 500, value: 1300, unit: "g" } },
        { label: "Nothing on the pan", params: { max: 1000, step: 200, value: 0, unit: "g" } },
    ],
    box: () => ({ w: 12, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 6 * U,
            cy = 7.5 * U,
            R = 4.2 * U;
        pen.path(
            g,
            roundedRect(1.6 * U, 1.2 * U, 8.8 * U, 1.1 * U, 8),
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${cx - 1.2 * U} ${2.3 * U}L${cx - 3.2 * U} ${cy - R - 6}H${cx + 3.2 * U}L${cx + 1.2 * U} ${2.3 * U}Z`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.circle(g, cx, cy, (R + 12) * 2, "ruler", pen.fill("card"), { strokeWidth: 2.6 });
        pen.circle(g, cx, cy, R * 2, "ruler", null, { strokeWidth: 1.4, stroke: c.t["ink-soft"] });
        const a: RawAnchors = { centre: [cx, cy, "right"], pan: [cx, 1.2 * U, "up"] };
        const half = p.step / 2;
        for (let v = 0; v < p.max; v += half) {
            const turn = v / p.max,
                major = v % p.step === 0;
            const [ax, ay] = onCircle(cx, cy, R, turn),
                [bx, by] = onCircle(cx, cy, R - (major ? 16 : 9), turn);
            pen.line(g, ax, ay, bx, by, "ruler", { strokeWidth: major ? 1.6 : 0.9 });
            if (major) {
                const [tx, ty] = onCircle(cx, cy, R - 30, turn);
                patch(c, tx, ty - 4, 34, 17);
                num(c, tx, ty + 5, v, 13);
                a[`mark(${v})`] = [ax, ay, "up"];
            }
        }
        const turn = (p.value % p.max) / p.max,
            [hx, hy] = onCircle(cx, cy, R - 20, turn),
            [tx2, ty2] = onCircle(cx, cy, -16, turn);
        pen.line(g, tx2, ty2, hx, hy, "ruler", { strokeWidth: 3 });
        pen.circle(g, cx, cy, 12, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        soft(c, cx, cy + 1.6 * U, p.unit, 13);
        a.needle = [hx, hy, "up"];
        return a;
    },
    describe: () =>
        "A kitchen dial scale, a round face marked in steps with the unit written and a needle turning about its middle, on a base with a pan on top.",
});
