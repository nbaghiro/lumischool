import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const paperBoat = defineDrawing<{ stripe: boolean }>({
    id: "paperboat",
    family: "travel",
    title: "Folded paper boat",
    group: "Props",
    about: "A little folded paper boat with a pointed middle, overlapping folded sides and an optional blue stripe along its hull.",
    params: { stripe: true },
    settings: { stripe: { kind: "flag" } },
    takes: [
        { label: "Blue racing stripe", params: { stripe: true } },
        { label: "Plain paper", params: { stripe: false } },
    ],
    box: () => ({ w: 6, h: 4 }),
    draw: ({ pen, g }, p) => {
        const edge = { strokeWidth: 1.4, roughness: 0.35 };
        pen.path(
            g,
            `M${0.5 * U} ${1.7 * U}L${3 * U} ${0.5 * U}L${5.5 * U} ${1.7 * U}L${4.3 * U} ${3.2 * U}H${1.7 * U}Z`,
            "pencil",
            pen.fill("card", "solid"),
            edge,
        );
        pen.path(
            g,
            `M${0.5 * U} ${1.7 * U}L${3 * U} ${2.5 * U}L${5.5 * U} ${1.7 * U}L${4.3 * U} ${3.2 * U}H${1.7 * U}Z`,
            "pencil",
            pen.fill(p.stripe ? "sky" : "card"),
            edge,
        );
        pen.line(g, 3 * U, 0.5 * U, 3 * U, 2.5 * U, "pencil", edge);
        pen.line(g, 1.7 * U, 3.2 * U, 3 * U, 2.5 * U, "pencil", edge);
        return { middle: [3 * U, 2 * U, "up"] };
    },
    describe: (p) =>
        `A folded paper boat with a pointed middle and overlapping sides, ${p.stripe ? "a blue racing stripe along its hull" : "plain paper ready for a river race"}.`,
    motion: { still: "The current carries the boat; its folded paper keeps its shape." },
});
