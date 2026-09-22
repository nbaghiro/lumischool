import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, nameOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap, soft } from "../lettering";
import { MOTIFS, MOTIF_NAMES, motif } from "./kit";

/** A card with a shape cut out of it, the shape that came out, and what paint through it leaves. */
export const stencil = defineDrawing({
    id: "stencil",
    family: "art",
    title: "Stencil",
    group: "Props",
    about: "A card with a shape cut out and the shape that came out of it. Paint brushed over the card lands only in the hole and makes the shape; paint brushed over the shape lands everywhere else and leaves the shape as paper. The easel's stencils are cut from these same shapes, and one shape on its own asks whether it is geometric or organic.",
    params: { shape: "leaf", show: "both", colour: "blue" },
    settings: {
        shape: { kind: "one of", of: MOTIF_NAMES },
        show: { kind: "one of", of: ["card", "shape", "both", "one"] },
        colour: { kind: "text", most: 24 },
    },
    takes: [
        {
            label: "A leaf: card, shape and prints",
            params: { shape: "leaf", show: "both", colour: "blue" },
        },
        { label: "A star, the card", params: { shape: "star", show: "card", colour: "red" } },
        { label: "One cloud shape", params: { shape: "cloud", show: "one", colour: "sky" } },
    ],
    box: (p) => ({ w: p.show === "both" ? 25 : 8, h: p.show === "one" ? 7 : 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            hex = colourOf(p.colour) ?? panColour("blue"),
            a: RawAnchors = {};
        const card = c.paper
            ? c.pen.fill("card")
            : { fill: "#EFE3C8", fillStyle: "solid" as const };
        const board = (x: number) =>
            pen.path(
                g,
                `M${x + 6} ${10}L${x + 7.4 * U} ${6}L${x + 7.6 * U} ${7.4 * U}L${x + 10} ${7.7 * U}Z`,
                "pencil",
                card,
                { strokeWidth: 1.8 },
            );
        if (p.show === "one") {
            motif(c, p.shape, 4 * U, 3.5 * U, 5.6 * U, {
                fill: paintFill(c, hex, 0.056 * U),
                carve: undefined,
            });
            a.shape = [4 * U, 0.7 * U, "up"];
            return a;
        }
        if (p.show === "card" || p.show === "both") {
            board(0);
            motif(c, p.shape, 3.9 * U, 3.9 * U, 4.6 * U, { fill: c.pen.fill("card") });
            cap(c, 3.9 * U, 8.7 * U, "stencil", 10);
            a.card = [3.9 * U, 0.4 * U, "up"];
        }
        if (p.show === "shape" || p.show === "both") {
            const x = p.show === "both" ? 8.6 * U : 0;
            motif(c, p.shape, x + 3.9 * U, 3.9 * U, 4.6 * U, { fill: card });
            cap(c, x + 3.9 * U, 8.7 * U, "shape", 10);
            a.shape = [x + 3.9 * U, 0.4 * U, "up"];
        }
        if (p.show === "both") {
            // what each leaves: paint through the hole, and paint round the shape
            const x = 17.2 * U;
            pen.rect(g, x, 0.6 * U, 3.6 * U, 3.6 * U, "ruler", c.pen.fill("card"), {
                strokeWidth: 1.2,
            });
            motif(c, p.shape, x + 1.8 * U, 2.4 * U, 2.8 * U, {
                fill: paintFill(c, hex, 0.028 * U),
                outline: c.paper,
            });
            pen.rect(g, x + 4.1 * U, 0.6 * U, 3.6 * U, 3.6 * U, "ruler", paintFill(c, hex), {
                strokeWidth: 1.2,
            });
            motif(c, p.shape, x + 5.9 * U, 2.4 * U, 2.8 * U, {
                fill: c.pen.fill("card"),
                outline: c.paper,
            });
            soft(c, x + 1.8 * U, 5.1 * U, "hole", 11);
            soft(c, x + 5.9 * U, 5.1 * U, "shape", 11);
            a.results = [x + 3.9 * U, 0.6 * U, "up"];
        }
        return a;
    },
    describe: (p) => {
        const shape = MOTIFS[p.shape] ? p.shape : "leaf",
            paint = nameOf(colourOf(p.colour) ?? panColour("blue")).name;
        if (p.show === "one")
            return `A single ${shape} shape on its own, painted ${paint}, cut clean with no card round it and nothing else on the page.`;
        if (p.show === "card")
            return `A card with a ${shape} shape cut out of it, the hole showing the paper behind, named stencil underneath.`;
        if (p.show === "shape")
            return `The ${shape} shape that came out of a stencil card, lying on its own, named shape underneath.`;
        return `A card with a ${shape} cut out, the ${shape} shape that came out beside it, and two small squares showing ${paint} paint through the hole and round the shape.`;
    },
});
