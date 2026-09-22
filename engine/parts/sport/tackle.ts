import { type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

interface TackleParams {
    part: "hook" | "float";
}

export const tackle = defineDrawing<TackleParams>({
    id: "tackle",
    family: "sport",
    title: "Hook and float",
    group: "Props",
    about: "What hangs at the end of a fishing line: a float that sits on the water, red on top and white below, and a hook with a wriggle of bait on it. They are drawn apart, so a line can run from the float down to the hook.",
    params: { part: "hook" },
    settings: { part: { kind: "one of", of: ["hook", "float"] } },
    takes: [
        { label: "The hook", params: { part: "hook" } },
        { label: "The float", params: { part: "float" } },
    ],
    box: () => ({ w: 1, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        if (p.part === "float") {
            pen.line(g, 10, 1, 10, 11, "ruler", { strokeWidth: 1.4, disableMultiStroke: true });
            pen.path(g, "M3 20Q3 9 10 9Q17 9 17 20Z", "ruler", pen.fill("berry"), calm(c, 1.4));
            pen.path(g, "M3 20Q3 31 10 31Q17 31 17 20Z", "ruler", pen.fill("card"), calm(c, 1.4));
            pen.line(g, 10, 31, 10, 39, "ruler", { strokeWidth: 1.2, disableMultiStroke: true });
            return { top: [10, 1, "up"], line: [10, 39, "down"] };
        }
        pen.circle(g, 11, 4, 5, "ruler", null, { strokeWidth: 1.3 });
        pen.path(g, "M11 6.5V27Q11 35 5 33Q1 31 2.5 25", "ruler", null, calm(c, 1.8));
        pen.line(g, 2.5, 25, 5.5, 27.5, "ruler", { strokeWidth: 1.4, disableMultiStroke: true });
        pen.curve(
            g,
            [
                [11, 20],
                [15, 23],
                [9, 26],
                [15, 29],
                [9, 32],
            ],
            "pencil",
            { strokeWidth: 2.6, stroke: c.t.berry, roughness: 0.5 },
        );
        return { eye: [11, 1.5, "up"], bait: [12, 26, "right"] };
    },
    describe: (p) =>
        p.part === "float"
            ? "A fishing float standing upright, red on its top half and white below, with a short stem above it and a length of line hanging under it."
            : "A fishing hook hanging from its eye, a curved steel hook with a barb, and a red wriggle of bait threaded on it.",
});
