import { type Ctx } from "../../ink/surface";
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

/** How far down its box the knife has its tip, and the box, in squares. */
export const KNIFE = { tip: 7.6, box: 8 } as const;

export const cakeKnife = defineDrawing({
    id: "cakeknife",
    family: "food",
    title: "Cake knife",
    group: "Props",
    about: "A long cake knife held point down, a wooden handle over a wide steel blade, for a game in which it comes down where the child means the cut to go.",
    params: {},
    settings: {},
    takes: [
        { label: "Point down", params: {} },
        { label: "Another take", params: {} },
    ],
    box: () => ({ w: 2, h: KNIFE.box }),
    draw: (c) => {
        const { pen, g } = c,
            cx = U;
        pen.rect(
            g,
            cx - 7,
            0.4 * U,
            14,
            2.2 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 }),
            calm(c, 1.6),
        );
        pen.rect(g, cx - 9, 2.6 * U, 18, 0.35 * U, "ruler", pen.fill("ink-soft"), calm(c, 1.4));
        pen.path(
            g,
            `M${cx - 8} ${2.95 * U}H${cx + 8}V${6.6 * U}L${cx} ${KNIFE.tip * U}L${cx - 8} ${6.6 * U}Z`,
            "ruler",
            pen.fill("card"),
            calm(c, 1.7),
        );
        pen.line(g, cx + 3.5, 3.3 * U, cx + 3.5, 6.2 * U, "ruler", {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
            disableMultiStroke: true,
        });
        return { tip: [cx, KNIFE.tip * U, "down"], grip: [cx, 1.5 * U, "up"] };
    },
    describe: () =>
        "A long cake knife held point down, a brown wooden handle at the top over a wide steel blade that narrows to its point.",
    motion: { still: "A game brings it down where the cut goes, and it does nothing by itself." },
});
