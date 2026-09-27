import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, wide } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const sack = defineDrawing({
    id: "sack",
    family: "outdoors",
    title: "Sack",
    group: "Props",
    about: "A plump cloth sack tied at the neck with string, with what it weighs written on a white tag on its front, for a load a child adds up: a counterweight, a delivery, a pan of a balance.",
    params: { label: "5 kg" },
    settings: { label: { kind: "text", most: 8 } },
    takes: [
        { label: "Five kilograms", params: { label: "5 kg" } },
        { label: "A plain one", params: { label: "" } },
        { label: "In grams", params: { label: "500 g" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = 2 * U,
            h = 2 * U;
        // the body bulges below the neck, which is gathered a fifth of the way down
        pen.path(
            g,
            `M ${w * 0.36} ${h * 0.24} C ${w * 0.06} ${h * 0.34} ${w * 0.02} ${h * 0.95} ${w * 0.2} ${h * 0.97} L ${w * 0.8} ${h * 0.97} C ${w * 0.98} ${h * 0.95} ${w * 0.94} ${h * 0.34} ${w * 0.64} ${h * 0.24} Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5, hachureAngle: 60, fillWeight: 0.6 }),
            calm(c, 1.7),
        );
        pen.path(
            g,
            `M ${w * 0.36} ${h * 0.24} L ${w * 0.3} ${h * 0.05} L ${w * 0.5} ${h * 0.12} L ${w * 0.7} ${h * 0.05} L ${w * 0.64} ${h * 0.24}`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            calm(c, 1.5),
        );
        pen.line(g, w * 0.33, h * 0.24, w * 0.67, h * 0.24, "ruler", calm(c, 2));
        if (p.label) {
            const tag = Math.min(w * 0.86, wide(p.label, 12) + 8);
            pen.rect(g, (w - tag) / 2, h * 0.52, tag, 17, "ruler", pen.fill("card"), calm(c, 1.1));
            num(c, w / 2, h * 0.52 + 13, p.label, 12);
        }
        return {
            top: [w / 2, h * 0.05, "up"],
            bottom: [w / 2, h * 0.97, "down"],
        };
    },
    describe: (p) =>
        p.label
            ? `A plump cloth sack tied at the neck with string, with ${p.label} written on a white tag on its front.`
            : "A plump cloth sack tied at the neck with string, with a blank white tag on its front.",
    motion: {
        still: "A game lifts it, drops it in a basket and lets it hang; on the shelf it holds still so its weight can be read.",
    },
});
