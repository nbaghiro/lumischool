import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The post's box for a height, and where its plate hangs, in squares from the top. */
export const RIVERPOST = { w: 2, plate: { top: 0.15, h: 1.15 } } as const;

export const riverPost = defineDrawing({
    id: "riverpost",
    family: "measuring",
    title: "River post",
    group: "Props",
    about: "A wooden post standing in a river with a plate near its top carrying a distance in metres, the kind that marks a rowing course. Its height is a setting, so the plate can stand clear of a boat going by, and the plate can be blank where only some posts are marked.",
    params: { n: "10", tall: 5 },
    settings: { n: { kind: "text", most: 4 }, tall: { kind: "whole", min: 3, max: 9 } },
    takes: [
        { label: "Ten metres", params: { n: "10", tall: 5 } },
        { label: "A blank plate on a tall post", params: { n: "", tall: 7 } },
    ],
    box: (p) => ({ w: RIVERPOST.w, h: whole(p.tall, 3, 9, 5) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            h = whole(p.tall, 3, 9, 5) * U,
            cx = U,
            top = RIVERPOST.plate.top * U,
            ph = RIVERPOST.plate.h * U;
        pen.rect(
            g,
            cx - 0.24 * U,
            top + ph - 0.1 * U,
            0.48 * U,
            h - top - ph + 0.1 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 }),
            calm(c, 1.6),
        );
        pen.line(g, cx - 0.1 * U, top + ph + 0.4 * U, cx - 0.1 * U, h - 0.4 * U, "ruler", {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
            disableMultiStroke: true,
        });
        const label = String(p.n ?? "");
        pen.path(
            g,
            roundedRect(cx - 0.92 * U, top, 1.84 * U, ph, 4),
            "ruler",
            pen.fill("card"),
            calm(c, 1.8),
        );
        for (const x of [cx - 0.7 * U, cx + 0.7 * U])
            pen.circle(g, x, top + 0.2 * U, 0.1 * U, "ruler", pen.fill("ink-soft"), calm(c, 0.8));
        if (label) {
            patch(c, cx, top + ph / 2, 32, 16);
            num(c, cx, top + ph / 2 + 6, label, 17);
        }
        return { plate: [cx, top, "up"], foot: [cx, h, "down"], water: [cx, h - U, "right"] };
    },
    describe: (p) =>
        `A brown wooden post standing upright seen from the side, a white plate bolted near its top${String(p.n ?? "") ? " with a number on it" : ", left blank"}.`,
    motion: { still: "A post stands in the river bed, and the water moves past it." },
});
