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

const unit = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0));

const wood = <G>(c: Ctx<G>) => c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });

const steel = <G>(c: Ctx<G>) =>
    c.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 });

/** The lever's knob, its swing either side of upright in radians, the arm's reach when nothing else is asked, and the base under the pivot, in squares. */
export const LEVER = { knob: 2.3, swing: 0.3, reach: 4, base: 1.1 } as const;

/** The lever's box for a reach, and where its pivot is in it, in squares. */
export function leverBox(reach: number): { w: number; h: number; pivot: { x: number; y: number } } {
    const r = Math.max(2, Math.min(9, reach));
    const w = Math.ceil(2 * (Math.sin(LEVER.swing) * r + LEVER.knob / 2) + 0.6),
        h = Math.ceil(r + LEVER.base + LEVER.knob / 2 + 0.3);
    return { w, h, pivot: { x: w / 2, y: h - LEVER.base + 0.2 } };
}

/** The knob's centre for a reach, in squares from the box's top left, at rest or pulled over. */
export function leverKnob(reach: number, pulled: number): { x: number; y: number } {
    const b = leverBox(reach),
        a = -LEVER.swing + unit(pulled) * 2 * LEVER.swing,
        r = Math.max(2, Math.min(9, reach));
    return { x: b.pivot.x + Math.sin(a) * r, y: b.pivot.y - Math.cos(a) * r };
}

interface YardLeverParams {
    pulled: number;
    reach: number;
}

export const yardLever = defineDrawing<YardLeverParams>({
    id: "yardlever",
    family: "travel",
    title: "Yard lever",
    group: "Structures",
    about: "A lever of the kind that works points or a lift in a railway yard, standing on a plate on the ground: a toothed quadrant, a long arm with a round handle a whole hand takes hold of, and a stop at each end of its swing. Pulled, the arm leans the other way. Its reach is a setting, so it can stand tall enough to be seen over a train.",
    params: { pulled: 0, reach: LEVER.reach },
    settings: {
        pulled: { kind: "number", min: 0, max: 1, step: 0.1 },
        reach: { kind: "whole", min: 2, max: 9 },
    },
    takes: [
        { label: "At rest", params: { pulled: 0, reach: 4 } },
        { label: "Pulled", params: { pulled: 1, reach: 4 } },
        { label: "A tall one, to be seen over a train", params: { pulled: 0, reach: 7 } },
    ],
    box: (p) => {
        const b = leverBox(Number(p.reach) || LEVER.reach);
        return { w: b.w, h: b.h };
    },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            reach = Number(p.reach) || LEVER.reach,
            b = leverBox(reach),
            px = b.pivot.x * U,
            py = b.pivot.y * U,
            k = leverKnob(reach, p.pulled);
        const kx = k.x * U,
            ky = k.y * U,
            w = b.w * U,
            h = b.h * U;
        pen.rect(g, 0.4 * U, h - 0.6 * U, w - 0.8 * U, 0.35 * U, "ruler", wood(c), calm(c, 1.6));
        for (const x of [0.7 * U, w - 0.7 * U])
            pen.circle(g, x, h - 0.42 * U, 0.16 * U, "ruler", pen.fill("ink-soft"), calm(c, 0.9));
        // the quadrant the arm swings over, a fan with teeth, standing on the plate
        const r = 1.15 * U,
            from = -LEVER.swing - 0.22,
            to = LEVER.swing + 0.22;
        const arc = `M${px} ${py}L${px + Math.sin(from) * r} ${py - Math.cos(from) * r}A${r} ${r} 0 0 1 ${px + Math.sin(to) * r} ${py - Math.cos(to) * r}Z`;
        pen.path(g, arc, "ruler", steel(c), calm(c, 1.5));
        for (let t = from + 0.12; t < to; t += 0.16) {
            pen.line(
                g,
                px + Math.sin(t) * (r - 4),
                py - Math.cos(t) * (r - 4),
                px + Math.sin(t) * (r + 3),
                py - Math.cos(t) * (r + 3),
                "ruler",
                { strokeWidth: 1.1, disableMultiStroke: true },
            );
        }
        pen.rect(g, px - 0.35 * U, py, 0.7 * U, h - 0.6 * U - py, "ruler", steel(c), calm(c, 1.3));
        pen.line(g, px, py, kx, ky, "ruler", { strokeWidth: 4.5, disableMultiStroke: true });
        pen.line(g, px, py, kx, ky, "ruler", {
            strokeWidth: 1.4,
            stroke: c.t.card,
            disableMultiStroke: true,
        });
        pen.circle(g, px, py, 0.5 * U, "ruler", pen.fill("card"), calm(c, 1.6));
        pen.circle(g, px, py, 0.14 * U, "ruler", pen.fill("ink"), calm(c, 0.9));
        pen.circle(g, kx, ky, LEVER.knob * U, "ruler", pen.fill("berry"), calm(c, 2.2));
        pen.circle(g, kx - 0.32 * U, ky - 0.32 * U, 0.42 * U, "doodle", pen.fill("card"), {
            stroke: "none",
        });
        return { knob: [kx, ky, "up"], pivot: [px, py, "down"], foot: [px, h, "down"] };
    },
    describe: (p) =>
        `A railway yard lever standing on a wooden plate, a toothed steel quadrant at its foot and a long arm with a round red handle, ${unit(p.pulled) > 0.5 ? "pulled over" : "at rest"}.`,
    motion: {
        still: "A game swings it by its setting when it is pulled, and it does nothing by itself.",
    },
});
