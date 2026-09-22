import { type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const fulcrum = defineDrawing({
    id: "fulcrum",
    family: "science",
    title: "Pivot stand",
    group: "Structures",
    about: "A strong stand shaped like a letter A, braced across the middle, with a pin at its top for a plank to turn on and a foot plate on the ground.",
    params: { stone: false },
    settings: { stone: { kind: "flag" } },
    takes: [
        { label: "Painted steel", params: { stone: false } },
        { label: "Stone", params: { stone: true } },
    ],
    box: () => ({ w: 3, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 30,
            apex = 4,
            foot = 112;
        const body = p.stone
            ? pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 })
            : pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.8 });
        pen.path(
            g,
            `M${cx} ${apex}L${cx + 22} ${foot}H${cx + 13}L${cx} ${apex + 30}L${cx - 13} ${foot}H${cx - 22}Z`,
            "ruler",
            body,
            calm(c, 1.8),
        );
        pen.line(g, cx - 15, 78, cx + 15, 78, "ruler", {
            strokeWidth: 2,
            disableMultiStroke: true,
        });
        pen.rect(g, cx - 27, foot, 54, 6, "ruler", pen.fill("card"), calm(c, 1.7));
        pen.circle(g, cx, apex + 2, 8, "ruler", pen.fill("card"), calm(c, 1.4));
        return { pin: [cx, apex + 2, "up"], foot: [cx, foot + 6, "down"] };
    },
    describe: (p) =>
        `A strong ${p.stone ? "grey stone" : "blue steel"} stand shaped like a letter A, braced across its middle, with a round pin at its top and a flat foot plate on the ground.`,
});
